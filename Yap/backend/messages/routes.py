import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import uuid
from auth.service import token_required
from messages.models import Conversation, Message
from users.models import User
import boto3
from botocore.exceptions import ClientError

messages_bp = Blueprint('messages', __name__)

# Image upload configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def get_s3_client():
    """Get S3 client"""
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'ca-central-1')
    )

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@messages_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    """Get all conversations for current user"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        conversations = Conversation.get_user_conversations(
            current_user['_id'], 
            limit=limit, 
            skip=skip
        )
        
        return jsonify({
            "success": True,
            "conversations": conversations,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        print(f"Error fetching conversations: {e}")
        return jsonify({"error": "Failed to fetch conversations"}), 500

@messages_bp.route('/upload-attachment', methods=['POST'])
@token_required
def upload_message_attachment(current_user):
    """Upload image attachment to S3 private bucket for messages"""
    try:
        # Check if the post request has the file part
        if 'image' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": "File too large. Maximum size is 5MB"}), 400
        
        if file and allowed_file(file.filename):
            # Generate unique filename
            filename = secure_filename(file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"message_{current_user['_id']}_{uuid.uuid4().hex}.{file_extension}"
            
            # Get S3 configuration from app config
            s3_config = current_app.config.get("S3_CONFIG", {})
            private_bucket = s3_config.get('private_bucket')
            
            if not private_bucket:
                return jsonify({"error": "S3 configuration not found"}), 500
            
            # Upload to S3 PRIVATE bucket
            try:
                s3_client = get_s3_client()
                s3_key = f"message_attachments/{unique_filename}"
                
                s3_client.upload_fileobj(
                    file,
                    private_bucket,
                    s3_key,
                    ExtraArgs={
                        'ContentType': file.content_type or f'image/{file_extension}',
                        'CacheControl': 'max-age=31536000',  # Cache for 1 year
                        'Metadata': {
                            'user_id': current_user['_id'],
                            'upload_type': 'message_attachment'
                        }
                    }
                )
                
                # Generate presigned URL for immediate access (valid for 1 hour)
                presigned_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': private_bucket, 'Key': s3_key},
                    ExpiresIn=3600  # 1 hour
                )
                
                return jsonify({
                    "message": "Attachment uploaded successfully",
                    "imageUrl": presigned_url,
                    "filename": unique_filename,
                    "s3_key": s3_key,
                    "s3_bucket": private_bucket
                }), 200
                
            except ClientError as e:
                print(f"S3 upload error: {e}")
                return jsonify({"error": "Failed to upload to cloud storage"}), 500
        else:
            return jsonify({"error": "Invalid file type. Allowed types: PNG, JPG, JPEG, GIF, WEBP"}), 400
            
    except Exception as e:
        print(f"Error uploading attachment: {e}")
        return jsonify({"error": "Failed to upload attachment"}), 500

@messages_bp.route('/attachment/<path:s3_key>', methods=['GET'])
@token_required
def get_message_attachment(current_user, s3_key):
    """Get secure URL for message attachment from private S3 bucket"""
    try:
        # Get S3 configuration
        s3_config = current_app.config.get("S3_CONFIG", {})
        private_bucket = s3_config.get('private_bucket')
        
        if not private_bucket:
            return jsonify({"error": "S3 configuration not found"}), 500
        
        # Generate pre-signed URL for secure access (valid for 1 hour)
        s3_client = get_s3_client()
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': private_bucket, 'Key': s3_key},
            ExpiresIn=3600  # 1 hour
        )
        
        return jsonify({
            "success": True,
            "presigned_url": presigned_url,
            "expires_in": 3600
        }), 200
        
    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        return jsonify({"error": "Failed to generate secure URL"}), 500
    except Exception as e:
        print(f"Error getting attachment: {e}")
        return jsonify({"error": "Failed to get attachment"}), 500

@messages_bp.route('/conversations', methods=['POST'])
@token_required
def start_conversation(current_user):
    """Start a new conversation with another user"""
    try:
        data = request.get_json()
        other_user_id = data.get('user_id')
        
        if not other_user_id:
            return jsonify({"error": "User ID required"}), 400
        
        if other_user_id == current_user['_id']:
            return jsonify({"error": "Cannot start conversation with yourself"}), 400
        
        # Check if other user exists
        other_user = User.get_user_profile(other_user_id)
        if not other_user:
            return jsonify({"error": "User not found"}), 404
        
        # Create or get existing conversation
        conversation = Conversation.create_conversation([current_user['_id'], other_user_id])
        
        if not conversation:
            return jsonify({"error": "Failed to create conversation"}), 500
        
        return jsonify({
            "success": True,
            "conversation": conversation
        }), 200
        
    except Exception as e:
        print(f"Error starting conversation: {e}")
        return jsonify({"error": "Failed to start conversation"}), 500

@messages_bp.route('/conversations/<conversation_id>', methods=['GET'])
@token_required
def get_conversation_details(current_user, conversation_id):
    """Get conversation details with participant info"""
    try:
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation or current_user['_id'] not in conversation['participants']:
            return jsonify({"error": "Access denied"}), 403
        
        # Get other participant info
        other_participant_id = None
        for participant in conversation['participants']:
            if participant != current_user['_id']:
                other_participant_id = participant
                break
        
        other_participant = None
        if other_participant_id:
            other_participant = User.get_user_profile(other_participant_id)
        
        conversation['other_participant'] = other_participant
        
        return jsonify({
            "success": True,
            "conversation": conversation
        }), 200
        
    except Exception as e:
        print(f"Error fetching conversation details: {e}")
        return jsonify({"error": "Failed to fetch conversation details"}), 500

@messages_bp.route('/conversations/<conversation_id>/messages', methods=['GET'])
@token_required
def get_messages(current_user, conversation_id):
    """Get messages from a conversation"""
    try:
        # Verify user is part of conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation or current_user['_id'] not in conversation['participants']:
            return jsonify({"error": "Access denied"}), 403
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        skip = (page - 1) * limit
        
        messages = Message.get_conversation_messages(
            conversation_id, 
            limit=limit, 
            skip=skip
        )
        
        # Mark messages as read
        Message.mark_messages_as_read(conversation_id, current_user['_id'])
        
        return jsonify({
            "success": True,
            "messages": messages,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        print(f"Error fetching messages: {e}")
        return jsonify({"error": "Failed to fetch messages"}), 500

@messages_bp.route('/conversations/<conversation_id>/messages', methods=['POST'])
@token_required
def send_message_http(current_user, conversation_id):
    """Send a message via HTTP (fallback for non-WebSocket clients)"""
    try:
        # Verify user is part of conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation or current_user['_id'] not in conversation['participants']:
            return jsonify({"error": "Access denied"}), 403
        
        data = request.get_json()
        content = data.get('content', '').strip()
        attachment_url = data.get('attachment_url', '').strip()
        attachment_s3_key = data.get('attachment_s3_key', '').strip()
        
        # Must have either content or attachment
        if not content and not attachment_url:
            return jsonify({"error": "Message content or attachment required"}), 400
        
        # Validate attachment URL if provided (ensure it's from our private S3 bucket)
        if attachment_url:
            s3_config = current_app.config.get("S3_CONFIG", {})
            private_bucket = s3_config.get('private_bucket')
            
            if not attachment_url.startswith(f"https://{private_bucket}.s3."):
                return jsonify({"error": "Invalid attachment URL"}), 400
        
        message_type = "image" if attachment_url else "text"
        
        message = Message.create_message(
            conversation_id=conversation_id,
            sender_id=current_user['_id'],
            content=content,
            message_type=message_type,
            attachment_url=attachment_url,
            attachment_s3_key=attachment_s3_key
        )
        
        if not message:
            return jsonify({"error": "Failed to send message"}), 500
        
        # Try to broadcast via SocketIO if available
        try:
            socketio = current_app.extensions.get('socketio')
            if socketio:
                room_name = f"conversation_{conversation_id}"
                socketio.emit('new_message', message, room=room_name)
                
                # Send notifications to participants
                for participant_id in conversation['participants']:
                    if participant_id != current_user['_id']:
                        socketio.emit(
                            'new_message_notification',
                            {
                                'message': message,
                                'conversation_id': conversation_id,
                                'sender': {
                                    'username': current_user.get('username', 'Unknown'),
                                    'user_id': current_user['_id']
                                }
                            },
                            room=f"user_{participant_id}"
                        )
        except Exception as socket_error:
            print(f"SocketIO broadcast failed: {socket_error}")
            # Continue without real-time broadcasting
        
        return jsonify({
            "success": True,
            "message": message
        }), 201
        
    except Exception as e:
        print(f"Error sending message: {e}")
        return jsonify({"error": "Failed to send message"}), 500

@messages_bp.route('/conversations/<conversation_id>/messages/<message_id>', methods=['PUT'])
@token_required
def edit_message(current_user, conversation_id, message_id):
    """Edit a message"""
    try:
        # Verify user is part of conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation or current_user['_id'] not in conversation['participants']:
            return jsonify({"error": "Access denied"}), 403
        
        data = request.get_json()
        new_content = data.get('content', '').strip()
        
        if not new_content:
            return jsonify({"error": "Message content required"}), 400
        
        result = Message.edit_message(message_id, new_content, current_user['_id'])
        
        if not result:
            return jsonify({"error": "Failed to edit message or not authorized"}), 403
        
        # Try to broadcast edit via SocketIO if available
        try:
            socketio = current_app.extensions.get('socketio')
            if socketio:
                room_name = f"conversation_{conversation_id}"
                socketio.emit('message_edited', {
                    'message_id': message_id,
                    'conversation_id': conversation_id,
                    'new_content': new_content,
                    'edited_at': result['edited_at']
                }, room=room_name)
        except Exception as socket_error:
            print(f"SocketIO broadcast failed: {socket_error}")
        
        return jsonify({
            "success": True,
            "edit_result": result
        }), 200
        
    except Exception as e:
        print(f"Error editing message: {e}")
        return jsonify({"error": "Failed to edit message"}), 500

@messages_bp.route('/conversations/<conversation_id>/mark-read', methods=['POST'])
@token_required
def mark_conversation_read(current_user, conversation_id):
    """Mark all messages in a conversation as read"""
    try:
        # Verify user is part of conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation or current_user['_id'] not in conversation['participants']:
            return jsonify({"error": "Access denied"}), 403
        
        count = Message.mark_messages_as_read(conversation_id, current_user['_id'])
        
        return jsonify({
            "success": True,
            "marked_read": count
        }), 200
        
    except Exception as e:
        print(f"Error marking messages as read: {e}")
        return jsonify({"error": "Failed to mark messages as read"}), 500

@messages_bp.route('/unread-count', methods=['GET'])
@token_required
def get_unread_count(current_user):
    """Get total unread message count for current user"""
    try:
        count = Message.get_unread_message_count(current_user['_id'])
        
        return jsonify({
            "success": True,
            "unread_count": count
        }), 200
        
    except Exception as e:
        print(f"Error getting unread count: {e}")
        return jsonify({"error": "Failed to get unread count"}), 500

# Optional: Polling endpoint for real-time-like updates without WebSocket
@messages_bp.route('/conversations/<conversation_id>/poll', methods=['GET'])
@token_required
def poll_conversation_updates(current_user, conversation_id):
    """Poll for new messages and updates in a conversation"""
    try:
        # Verify user is part of conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation or current_user['_id'] not in conversation['participants']:
            return jsonify({"error": "Access denied"}), 403
        
        # Get timestamp from query params for polling
        since_timestamp = request.args.get('since')
        
        # This would need additional logic to get messages since timestamp
        # For now, just return recent messages
        messages = Message.get_conversation_messages(conversation_id, limit=10)
        
        # Get conversation update timestamp
        conversation_updated = conversation.get('last_message_at')
        
        return jsonify({
            "success": True,
            "messages": messages,
            "conversation_updated": conversation_updated,
            "server_time": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"Error polling conversation: {e}")
        return jsonify({"error": "Failed to poll conversation"}), 500