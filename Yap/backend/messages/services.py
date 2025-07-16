from flask_socketio import emit, join_room, leave_room, disconnect
from flask import request, current_app
from auth.service import verify_token
from users.models import User
from messages.models import Message
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store connected users with more detailed info
connected_users = {}

def handle_connect(socketio, auth):
    """Handle client connection with improved logging and error handling"""
    try:
        logger.info(f"Connection attempt from {request.sid} with auth: {auth}")
        
        if not auth or 'token' not in auth:
            logger.warning(f"No auth token provided for {request.sid}")
            emit('error', {'message': 'Authentication required'})
            disconnect()
            return False
        
        token_data = verify_token(auth['token'])
        if not token_data:
            logger.warning(f"Invalid token for {request.sid}")
            emit('error', {'message': 'Invalid token'})
            disconnect()
            return False
        
        # Get user info
        username = token_data.get('username')
        user = User.get_user_by_username(username)
        if not user:
            logger.warning(f"User not found for username: {username}")
            emit('error', {'message': 'User not found'})
            disconnect()
            return False
        
        user_id = user['_id']
        
        # Store connection with more details
        connected_users[request.sid] = {
            'user_id': user_id,
            'username': username,
            'connected_at': str(datetime.now()),
            'rooms': set()  # Track joined rooms
        }
        
        # Join user to their personal room for notifications
        join_room(f"user_{user_id}")
        connected_users[request.sid]['rooms'].add(f"user_{user_id}")
        
        # Notify user of successful connection
        emit('connection_status', {
            'status': 'connected', 
            'user_id': user_id,
            'username': username
        })
        
        logger.info(f"User {username} ({user_id}) connected successfully with session {request.sid}")
        return True
        
    except Exception as e:
        logger.error(f"Error in handle_connect: {str(e)}")
        emit('error', {'message': 'Connection failed'})
        disconnect()
        return False

def handle_disconnect():
    """Handle client disconnection with cleanup"""
    try:
        if request.sid in connected_users:
            user_info = connected_users[request.sid]
            user_id = user_info['user_id']
            username = user_info.get('username', 'Unknown')
            
            # Leave all rooms
            for room in user_info.get('rooms', set()):
                leave_room(room)
            
            # Remove from connected users
            del connected_users[request.sid]
            
            logger.info(f"User {username} ({user_id}) disconnected from session {request.sid}")
        else:
            logger.info(f"Unknown session {request.sid} disconnected")
            
    except Exception as e:
        logger.error(f"Error in handle_disconnect: {str(e)}")

def handle_join_conversation(socketio, data):
    """Join a conversation room with improved validation"""
    try:
        if request.sid not in connected_users:
            logger.warning(f"Unauthenticated join_conversation attempt from {request.sid}")
            emit('error', {'message': 'Not authenticated'})
            return
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            logger.warning(f"No conversation_id provided in join_conversation from {request.sid}")
            emit('error', {'message': 'Conversation ID required'})
            return
        
        user_id = connected_users[request.sid]['user_id']
        username = connected_users[request.sid]['username']
        
        # Verify user is part of this conversation
        from messages.models import Conversation
        conversation = Conversation.get_conversation(conversation_id)
        
        if not conversation:
            logger.warning(f"Conversation {conversation_id} not found for user {username}")
            emit('error', {'message': 'Conversation not found'})
            return
            
        if user_id not in conversation['participants']:
            logger.warning(f"User {username} denied access to conversation {conversation_id}")
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Join the conversation room
        room_name = f"conversation_{conversation_id}"
        join_room(room_name)
        connected_users[request.sid]['rooms'].add(room_name)
        
        emit('joined_conversation', {'conversation_id': conversation_id})
        
        # Notify others in the room that user joined (optional)
        socketio.emit(
            'user_joined_room',
            {
                'user_id': user_id,
                'username': username,
                'conversation_id': conversation_id
            },
            room=room_name,
            include_self=False
        )
        
        logger.info(f"User {username} joined conversation {conversation_id}")
        
    except Exception as e:
        logger.error(f"Error in handle_join_conversation: {str(e)}")
        emit('error', {'message': 'Failed to join conversation'})

def handle_leave_conversation(data):
    """Leave a conversation room"""
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
            
        room_name = f"conversation_{conversation_id}"
        leave_room(room_name)
        
        if request.sid in connected_users:
            connected_users[request.sid]['rooms'].discard(room_name)
            
        emit('left_conversation', {'conversation_id': conversation_id})
        logger.info(f"Session {request.sid} left conversation {conversation_id}")
        
    except Exception as e:
        logger.error(f"Error in handle_leave_conversation: {str(e)}")

def handle_send_message(socketio, data):
    """Handle sending a message with comprehensive logging"""
    try:
        if request.sid not in connected_users:
            logger.warning(f"Unauthenticated send_message attempt from {request.sid}")
            emit('error', {'message': 'Not authenticated'})
            return
        
        user_info = connected_users[request.sid]
        user_id = user_info['user_id']
        username = user_info['username']
        conversation_id = data.get('conversation_id')
        content = data.get('content', '').strip()
        
        logger.info(f"Message send attempt: user={username}, conv={conversation_id}, content_length={len(content)}")
        
        if not conversation_id or not content:
            logger.warning(f"Invalid message data from {username}: conv_id={conversation_id}, content={bool(content)}")
            emit('error', {'message': 'Conversation ID and content required'})
            return
        
        # Verify user is part of conversation
        from messages.models import Conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation:
            logger.warning(f"Conversation {conversation_id} not found for message from {username}")
            emit('error', {'message': 'Conversation not found'})
            return
            
        if user_id not in conversation['participants']:
            logger.warning(f"User {username} denied access to send message to conversation {conversation_id}")
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Create message using the Message model
        message = Message.create_message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content
        )
        
        if message:
            room_name = f"conversation_{conversation_id}"
            
            # Emit to all users in the conversation room
            socketio.emit(
                'new_message', 
                message, 
                room=room_name
            )
            
            # Confirm to sender
            emit('message_sent', {
                'success': True,
                'message_id': message['_id'],
                'room': room_name
            })
            
            logger.info(f"Message sent successfully: {message['_id']} from {username} to room {room_name}")
            
            # Debug: Log who's in the room
            room_members = [sid for sid, user_data in connected_users.items() 
                          if room_name in user_data.get('rooms', set())]
            logger.info(f"Room {room_name} has {len(room_members)} members: {room_members}")
            
        else:
            logger.error(f"Failed to create message for user {username}")
            emit('error', {'message': 'Failed to send message'})
            
    except Exception as e:
        logger.error(f"Error in handle_send_message: {str(e)}")
        emit('error', {'message': 'Failed to send message'})

def handle_typing_start(socketio, data):
    """Handle typing indicator start"""
    try:
        if request.sid not in connected_users:
            return
        
        user_id = connected_users[request.sid]['user_id']
        conversation_id = data.get('conversation_id')
        
        if conversation_id:
            room_name = f"conversation_{conversation_id}"
            # Broadcast typing indicator to others in conversation
            socketio.emit(
                'user_typing', 
                {
                    'user_id': user_id,
                    'conversation_id': conversation_id,
                    'typing': True
                },
                room=room_name,
                include_self=False
            )
            
    except Exception as e:
        logger.error(f"Error in handle_typing_start: {str(e)}")

def handle_typing_stop(socketio, data):
    """Handle typing indicator stop"""
    try:
        if request.sid not in connected_users:
            return
        
        user_id = connected_users[request.sid]['user_id']
        conversation_id = data.get('conversation_id')
        
        if conversation_id:
            room_name = f"conversation_{conversation_id}"
            # Broadcast typing stop to others in conversation
            socketio.emit(
                'user_typing', 
                {
                    'user_id': user_id,
                    'conversation_id': conversation_id,
                    'typing': False
                },
                room=room_name,
                include_self=False
            )
            
    except Exception as e:
        logger.error(f"Error in handle_typing_stodadp: {str(e)}")