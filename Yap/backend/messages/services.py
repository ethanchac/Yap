from flask_socketio import emit, join_room, leave_room, disconnect
from flask import request, current_app
from auth.service import verify_token
from users.models import User
from messages.models import Message

# Store connected users
connected_users = {}

def handle_connect(socketio, auth):
    """Handle client connection"""
    try:
        if not auth or 'token' not in auth:
            disconnect()
            return
        
        token_data = verify_token(auth['token'])
        if not token_data:
            disconnect()
            return
        
        # Get user info
        username = token_data.get('username')
        user = User.get_user_by_username(username)
        if not user:
            disconnect()
            return
        
        user_id = user['_id']
        
        # Store connection
        connected_users[request.sid] = {
            'user_id': user_id,
            'username': username
        }
        
        # Join user to their personal room for notifications
        join_room(f"user_{user_id}")
        
        # Notify user of successful connection
        emit('connection_status', {'status': 'connected', 'user_id': user_id})
        
    except Exception as e:
        disconnect()

def handle_disconnect():
    """Handle client disconnection"""
    try:
        if request.sid in connected_users:
            user_info = connected_users[request.sid]
            user_id = user_info['user_id']
            
            # Leave personal room
            leave_room(f"user_{user_id}")
            
            # Remove from connected users
            del connected_users[request.sid]
            
    except Exception as e:
        pass

def handle_join_conversation(socketio, data):
    """Join a conversation room"""
    try:
        if request.sid not in connected_users:
            emit('error', {'message': 'Not authenticated'})
            return
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            emit('error', {'message': 'Conversation ID required'})
            return
        
        user_id = connected_users[request.sid]['user_id']
        
        # Verify user is part of this conversation
        from messages.models import Conversation
        conversation = Conversation.get_conversation(conversation_id)
        
        if not conversation or user_id not in conversation['participants']:
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Join the conversation room
        join_room(f"conversation_{conversation_id}")
        emit('joined_conversation', {'conversation_id': conversation_id})
        
    except Exception as e:
        emit('error', {'message': 'Failed to join conversation'})

def handle_leave_conversation(data):
    """Leave a conversation room"""
    try:
        conversation_id = data.get('conversation_id')
        if conversation_id:
            leave_room(f"conversation_{conversation_id}")
            emit('left_conversation', {'conversation_id': conversation_id})
            
    except Exception as e:
        pass

def handle_send_message(socketio, data):
    """Handle sending a message"""
    try:
        if request.sid not in connected_users:
            emit('error', {'message': 'Not authenticated'})
            return
        
        user_id = connected_users[request.sid]['user_id']
        conversation_id = data.get('conversation_id')
        content = data.get('content', '').strip()
        
        if not conversation_id or not content:
            emit('error', {'message': 'Conversation ID and content required'})
            return
        
        # Verify user is part of conversation
        from messages.models import Conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation or user_id not in conversation['participants']:
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Create message using the Message model
        message = Message.create_message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content
        )
        
        if message:
            # Emit to all users in the conversation room
            socketio.emit(
                'new_message', 
                message, 
                room=f"conversation_{conversation_id}"
            )
            
            # Confirm to sender
            emit('message_sent', {
                'success': True,
                'message_id': message['_id']
            })
            
        else:
            emit('error', {'message': 'Failed to send message'})
            
    except Exception as e:
        emit('error', {'message': 'Failed to send message'})

def handle_typing_start(socketio, data):
    """Handle typing indicator start"""
    try:
        if request.sid not in connected_users:
            return
        
        user_id = connected_users[request.sid]['user_id']
        conversation_id = data.get('conversation_id')
        
        if conversation_id:
            # Broadcast typing indicator to others in conversation
            socketio.emit(
                'user_typing', 
                {
                    'user_id': user_id,
                    'conversation_id': conversation_id,
                    'typing': True
                },
                room=f"conversation_{conversation_id}",
                include_self=False
            )
            
    except Exception as e:
        pass

def handle_typing_stop(socketio, data):
    """Handle typing indicator stop"""
    try:
        if request.sid not in connected_users:
            return
        
        user_id = connected_users[request.sid]['user_id']
        conversation_id = data.get('conversation_id')
        
        if conversation_id:
            # Broadcast typing stop to others in conversation
            socketio.emit(
                'user_typing', 
                {
                    'user_id': user_id,
                    'conversation_id': conversation_id,
                    'typing': False
                },
                room=f"conversation_{conversation_id}",
                include_self=False
            )
            
    except Exception as e:
        pass