from flask_socketio import emit, join_room, leave_room
from flask import request, current_app
from auth.service import verify_token
from users.models import User
from messages.models import Message, Conversation
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for simple session management
connected_users = {}  # {session_id: user_info}
user_sessions = {}    # {user_id: [session_ids]}
typing_users = {}     # {conversation_id: {user_id: timestamp}}

def get_socketio():
    """Get the SocketIO instance from the current app"""
    try:
        return current_app.extensions['socketio']
    except (KeyError, AttributeError):
        logger.error("SocketIO not found in app extensions")
        return None

def handle_connect(socketio, auth):
    """Handle client connection with simple session management"""
    try:
        logger.info(f"🔌 Connection attempt from {request.sid}")
        
        # Extract auth token
        token = None
        if auth and isinstance(auth, dict):
            token = auth.get('token')
        elif auth and isinstance(auth, str):
            token = auth
        
        # Fallback to query parameters
        if not token:
            token = request.args.get('token')
        
        if not token:
            logger.warning(f"❌ No auth token provided for {request.sid}")
            emit('error', {'message': 'Authentication required'})
            return False
        
        logger.info(f"🔐 Verifying token for {request.sid}")
        
        token_data = verify_token(token)
        if not token_data:
            logger.warning(f"❌ Invalid token for {request.sid}")
            emit('error', {'message': 'Invalid token'})
            return False
        
        # Get username from token
        username = (token_data.get('username') or 
                   token_data.get('user') or 
                   token_data.get('sub') or 
                   token_data.get('name'))
        
        if not username:
            logger.warning(f"❌ No username found in token for {request.sid}")
            emit('error', {'message': 'Invalid user data in token'})
            return False
        
        logger.info(f"👤 Looking up user: {username}")
        
        user = User.get_user_by_username(username)
        if not user:
            logger.warning(f"❌ User not found for username: {username}")
            emit('error', {'message': 'User not found'})
            return False
        
        user_id = user['_id']
        logger.info(f"✅ User found: {user_id} - {username}")
        
        # Store session info in memory
        user_info = {
            'user_id': user_id,
            'username': username,
            'profile_picture': user.get('profile_picture', ''),
            'connected_at': datetime.now().isoformat(),
            'last_active': datetime.now().isoformat()
        }
        
        connected_users[request.sid] = user_info
        
        # Track user sessions
        if user_id not in user_sessions:
            user_sessions[user_id] = []
        user_sessions[user_id].append(request.sid)
        
        # Join user to their personal room for notifications
        join_room(f"user_{user_id}")
        logger.info(f"🏠 User {username} joined personal room: user_{user_id}")
        
        # Notify user of successful connection
        emit('connection_status', {
            'status': 'connected', 
            'user_id': user_id,
            'username': username,
            'session_id': request.sid
        })
        
        logger.info(f"✅ User {username} ({user_id}) connected successfully with session {request.sid}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error in handle_connect: {str(e)}", exc_info=True)
        emit('error', {'message': 'Connection failed due to server error'})
        return False

def handle_disconnect():
    """Handle client disconnection with simple cleanup"""
    try:
        logger.info(f"🔌 Disconnect attempt from {request.sid}")
        
        # Get session info
        user_info = connected_users.get(request.sid)
        
        if user_info:
            user_id = user_info['user_id']
            username = user_info['username']
            
            logger.info(f"🧹 Cleaning up session for user {username} ({user_id})")
            
            # Remove from connected users
            del connected_users[request.sid]
            
            # Remove from user sessions
            if user_id in user_sessions:
                if request.sid in user_sessions[user_id]:
                    user_sessions[user_id].remove(request.sid)
                
                # If no more sessions, remove user entirely
                if not user_sessions[user_id]:
                    del user_sessions[user_id]
            
            # Leave user's personal room
            leave_room(f"user_{user_id}")
            
            logger.info(f"✅ User {username} ({user_id}) disconnected from session {request.sid}")
        else:
            logger.info(f"❓ Unknown session {request.sid} disconnected")
            
    except Exception as e:
        logger.error(f"❌ Error in handle_disconnect: {str(e)}", exc_info=True)

def handle_join_conversation(socketio, data):
    """Join a conversation room"""
    try:
        conversation_id = data.get('conversation_id')
        logger.info(f"🎯 Join conversation attempt from {request.sid}: {conversation_id}")
        
        # Get user from session
        user_info = connected_users.get(request.sid)
        if not user_info:
            logger.warning(f"❌ No session found for {request.sid}")
            emit('error', {'message': 'Session not found. Please reconnect.'})
            return
        
        if not conversation_id:
            logger.warning(f"❌ No conversation_id provided from {request.sid}")
            emit('error', {'message': 'Conversation ID required'})
            return
        
        user_id = user_info['user_id']
        username = user_info['username']
        
        logger.info(f"👤 User {username} attempting to join conversation {conversation_id}")
        
        # Verify user is part of this conversation
        conversation = Conversation.get_conversation(conversation_id)
        
        if not conversation:
            logger.warning(f"❌ Conversation {conversation_id} not found")
            emit('error', {'message': 'Conversation not found'})
            return
            
        if user_id not in conversation['participants']:
            logger.warning(f"❌ User {username} denied access to conversation {conversation_id}")
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Join the conversation room
        room_name = f"conversation_{conversation_id}"
        join_room(room_name)
        logger.info(f"🏠 User {username} joined room {room_name}")
        
        emit('joined_conversation', {'conversation_id': conversation_id})
        
        # Mark messages as read when joining
        Message.mark_messages_as_read(conversation_id, user_id)
        
        logger.info(f"✅ User {username} successfully joined conversation {conversation_id}")
        
    except Exception as e:
        logger.error(f"❌ Error in handle_join_conversation: {str(e)}", exc_info=True)
        emit('error', {'message': 'Failed to join conversation'})

def handle_leave_conversation(data):
    """Leave a conversation room"""
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
        
        logger.info(f"👋 User leaving conversation {conversation_id} from {request.sid}")
        
        # Get user from session
        user_info = connected_users.get(request.sid)
        if user_info:
            username = user_info['username']
            
            # Leave room
            room_name = f"conversation_{conversation_id}"
            leave_room(room_name)
            
            emit('left_conversation', {'conversation_id': conversation_id})
            
            logger.info(f"✅ User {username} left conversation {conversation_id}")
        
    except Exception as e:
        logger.error(f"❌ Error in handle_leave_conversation: {str(e)}", exc_info=True)

def handle_send_message(socketio, data):
    """Handle sending a message with simple broadcasting"""
    try:
        conversation_id = data.get('conversation_id')
        content = data.get('content', '').strip()
        attachment_url = data.get('attachment_url', '').strip()
        attachment_s3_key = data.get('attachment_s3_key', '').strip()
        
        logger.info(f"📨 Send message attempt from {request.sid}: conv={conversation_id}, length={len(content)}, has_attachment={bool(attachment_url)}")
        
        # Get user from session
        user_info = connected_users.get(request.sid)
        if not user_info:
            logger.warning(f"❌ No session found for {request.sid}")
            emit('error', {'message': 'Session not found. Please reconnect.'})
            return
        
        user_id = user_info['user_id']
        username = user_info['username']
        
        # Must have either content or attachment
        if not conversation_id or (not content and not attachment_url):
            logger.warning(f"❌ Invalid message data from {username}")
            emit('error', {'message': 'Conversation ID and content or attachment required'})
            return
        
        # Verify user is part of conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation:
            logger.warning(f"❌ Conversation {conversation_id} not found")
            emit('error', {'message': 'Conversation not found'})
            return
            
        if user_id not in conversation['participants']:
            logger.warning(f"❌ User {username} denied access to conversation {conversation_id}")
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Determine message type
        message_type = "image" if attachment_url else "text"
        
        # Create message
        message = Message.create_message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            message_type=message_type,
            attachment_url=attachment_url,
            attachment_s3_key=attachment_s3_key
        )
        
        if message:
            room_name = f"conversation_{conversation_id}"
            
            logger.info(f"📡 Broadcasting message {message['_id']} to room {room_name}")
            
            # Get SocketIO instance and broadcast
            socketio_instance = get_socketio()
            if socketio_instance:
                # Emit to all users in the conversation room
                socketio_instance.emit(
                    'new_message', 
                    message, 
                    room=room_name
                )
                
                # Send notifications to participants not in the room
                for participant_id in conversation['participants']:
                    if participant_id != user_id:  # Don't notify sender
                        socketio_instance.emit(
                            'new_message_notification',
                            {
                                'message': message,
                                'conversation_id': conversation_id,
                                'sender': {
                                    'username': username,
                                    'user_id': user_id
                                }
                            },
                            room=f"user_{participant_id}"
                        )
            
            # Confirm to sender
            emit('message_sent', {
                'success': True,
                'message_id': message['_id'],
                'timestamp': message['created_at']
            })
            
            # Clear typing status
            if conversation_id in typing_users and user_id in typing_users[conversation_id]:
                del typing_users[conversation_id][user_id]
                if not typing_users[conversation_id]:
                    del typing_users[conversation_id]
            
            logger.info(f"✅ Message sent successfully: {message['_id']} from {username}")
            
        else:
            logger.error(f"❌ Failed to create message for user {username}")
            emit('error', {'message': 'Failed to send message'})
            
    except Exception as e:
        logger.error(f"❌ Error in handle_send_message: {str(e)}", exc_info=True)
        emit('error', {'message': 'Failed to send message'})

def handle_typing_start(socketio, data):
    """Handle typing indicator start"""
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
            
        # Get user from session
        user_info = connected_users.get(request.sid)
        if not user_info:
            return
        
        user_id = user_info['user_id']
        username = user_info['username']
        
        # Track typing status
        if conversation_id not in typing_users:
            typing_users[conversation_id] = {}
        typing_users[conversation_id][user_id] = datetime.now()
        
        # Broadcast typing indicator
        room_name = f"conversation_{conversation_id}"
        socketio_instance = get_socketio()
        if socketio_instance:
            socketio_instance.emit(
                'user_typing', 
                {
                    'user_id': user_id,
                    'username': username,
                    'conversation_id': conversation_id,
                    'typing': True,
                    'timestamp': datetime.now().isoformat()
                },
                room=room_name,
                include_self=False
            )
        
    except Exception as e:
        logger.error(f"❌ Error in handle_typing_start: {str(e)}", exc_info=True)

def handle_typing_stop(socketio, data):
    """Handle typing indicator stop"""
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
            
        # Get user from session
        user_info = connected_users.get(request.sid)
        if not user_info:
            return
        
        user_id = user_info['user_id']
        username = user_info['username']
        
        # Clear typing status
        if conversation_id in typing_users and user_id in typing_users[conversation_id]:
            del typing_users[conversation_id][user_id]
            if not typing_users[conversation_id]:
                del typing_users[conversation_id]
        
        # Broadcast typing stop
        room_name = f"conversation_{conversation_id}"
        socketio_instance = get_socketio()
        if socketio_instance:
            socketio_instance.emit(
                'user_typing', 
                {
                    'user_id': user_id,
                    'username': username,
                    'conversation_id': conversation_id,
                    'typing': False,
                    'timestamp': datetime.now().isoformat()
                },
                room=room_name,
                include_self=False
            )
        
    except Exception as e:
        logger.error(f"❌ Error in handle_typing_stop: {str(e)}", exc_info=True)

# Utility functions for session management

def get_user_info_by_session(session_id):
    """Get user info by session ID"""
    return connected_users.get(session_id)

def get_user_sessions_by_id(user_id):
    """Get all sessions for a user ID"""
    return user_sessions.get(user_id, [])

def is_user_online(user_id):
    """Check if user is online (has active sessions)"""
    return user_id in user_sessions and len(user_sessions[user_id]) > 0

def get_online_users_in_conversation(conversation_id):
    """Get list of online users in a conversation"""
    try:
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation:
            return []
        
        online_users = []
        for participant_id in conversation['participants']:
            if is_user_online(participant_id):
                # Get user info from any of their sessions
                sessions = get_user_sessions_by_id(participant_id)
                if sessions:
                    user_info = connected_users.get(sessions[0])
                    if user_info:
                        online_users.append({
                            'user_id': participant_id,
                            'username': user_info['username'],
                            'profile_picture': user_info.get('profile_picture', ''),
                            'online': True
                        })
        
        return online_users
        
    except Exception as e:
        logger.error(f"Error getting online users for conversation {conversation_id}: {e}")
        return []

def get_typing_users_in_conversation(conversation_id):
    """Get list of users currently typing in a conversation"""
    try:
        if conversation_id not in typing_users:
            return []
        
        # Clean up old typing statuses (older than 15 seconds)
        current_time = datetime.now()
        expired_users = []
        
        for user_id, timestamp in typing_users[conversation_id].items():
            if (current_time - timestamp).total_seconds() > 15:
                expired_users.append(user_id)
        
        # Remove expired typing statuses
        for user_id in expired_users:
            del typing_users[conversation_id][user_id]
        
        # Clean up empty conversation
        if not typing_users[conversation_id]:
            del typing_users[conversation_id]
            return []
        
        # Return current typing users with their info
        typing_list = []
        for user_id in typing_users[conversation_id].keys():
            sessions = get_user_sessions_by_id(user_id)
            if sessions:
                user_info = connected_users.get(sessions[0])
                if user_info:
                    typing_list.append({
                        'user_id': user_id,
                        'username': user_info['username']
                    })
        
        return typing_list
        
    except Exception as e:
        logger.error(f"Error getting typing users for conversation {conversation_id}: {e}")
        return []

def broadcast_to_user(user_id, event, data):
    """Broadcast an event to all sessions of a specific user"""
    try:
        socketio_instance = get_socketio()
        if not socketio_instance:
            return False
        
        socketio_instance.emit(event, data, room=f"user_{user_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error broadcasting to user {user_id}: {e}")
        return False

def broadcast_to_conversation(conversation_id, event, data, exclude_user=None):
    """Broadcast an event to all users in a conversation"""
    try:
        socketio_instance = get_socketio()
        if not socketio_instance:
            return False
        
        room_name = f"conversation_{conversation_id}"
        
        if exclude_user:
            # Get conversation participants
            conversation = Conversation.get_conversation(conversation_id)
            if conversation:
                for participant_id in conversation['participants']:
                    if participant_id != exclude_user:
                        socketio_instance.emit(event, data, room=f"user_{participant_id}")
        else:
            socketio_instance.emit(event, data, room=room_name)
        
        return True
        
    except Exception as e:
        logger.error(f"Error broadcasting to conversation {conversation_id}: {e}")
        return False

def cleanup_expired_typing():
    """Clean up expired typing indicators - can be called periodically"""
    try:
        current_time = datetime.now()
        conversations_to_remove = []
        
        for conversation_id, users in typing_users.items():
            expired_users = []
            
            for user_id, timestamp in users.items():
                if (current_time - timestamp).total_seconds() > 15:
                    expired_users.append(user_id)
            
            # Remove expired users
            for user_id in expired_users:
                del typing_users[conversation_id][user_id]
                
                # Broadcast typing stop for expired user
                sessions = get_user_sessions_by_id(user_id)
                if sessions:
                    user_info = connected_users.get(sessions[0])
                    if user_info:
                        broadcast_to_conversation(
                            conversation_id,
                            'user_typing',
                            {
                                'user_id': user_id,
                                'username': user_info['username'],
                                'conversation_id': conversation_id,
                                'typing': False,
                                'timestamp': current_time.isoformat()
                            },
                            exclude_user=user_id
                        )
            
            # Mark empty conversations for removal
            if not typing_users[conversation_id]:
                conversations_to_remove.append(conversation_id)
        
        # Remove empty conversations
        for conversation_id in conversations_to_remove:
            del typing_users[conversation_id]
        
        logger.info(f"Cleaned up typing indicators for {len(conversations_to_remove)} conversations")
        
    except Exception as e:
        logger.error(f"Error cleaning up typing indicators: {e}")

def get_server_stats():
    """Get server statistics for monitoring"""
    try:
        return {
            'connected_sessions': len(connected_users),
            'unique_users_online': len(user_sessions),
            'active_conversations_with_typing': len(typing_users),
            'total_typing_users': sum(len(users) for users in typing_users.values())
        }
    except Exception as e:
        logger.error(f"Error getting server stats: {e}")
        return {}