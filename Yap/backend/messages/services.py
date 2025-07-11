# messages/services.py - Debug version with detailed logging

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
        print(f"🔌 Connection attempt from {request.sid}")
        
        if not auth or 'token' not in auth:
            print("❌ Connection rejected: No token provided")
            disconnect()
            return
        
        token_data = verify_token(auth['token'])
        if not token_data:
            print("❌ Connection rejected: Invalid token")
            disconnect()
            return
        
        # Get user info
        username = token_data.get('username')
        user = User.get_user_by_username(username)
        if not user:
            print("❌ Connection rejected: User not found")
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
        
        print(f"✅ User {username} ({user_id}) connected with session {request.sid}")
        print(f"📊 Total connected users: {len(connected_users)}")
        
        # Notify user of successful connection
        emit('connection_status', {'status': 'connected', 'user_id': user_id})
        
    except Exception as e:
        print(f"❌ Error in connect handler: {e}")
        disconnect()

def handle_disconnect():
    """Handle client disconnection"""
    try:
        if request.sid in connected_users:
            user_info = connected_users[request.sid]
            user_id = user_info['user_id']
            username = user_info['username']
            
            # Leave personal room
            leave_room(f"user_{user_id}")
            
            # Remove from connected users
            del connected_users[request.sid]
            
            print(f"❌ User {username} ({user_id}) disconnected")
            print(f"📊 Total connected users: {len(connected_users)}")
            
    except Exception as e:
        print(f"❌ Error in disconnect handler: {e}")

def handle_join_conversation(socketio, data):
    """Join a conversation room"""
    try:
        print(f"🚪 Join conversation request from {request.sid}")
        
        if request.sid not in connected_users:
            print("❌ User not authenticated")
            emit('error', {'message': 'Not authenticated'})
            return
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            print("❌ No conversation ID provided")
            emit('error', {'message': 'Conversation ID required'})
            return
        
        user_id = connected_users[request.sid]['user_id']
        
        # Verify user is part of this conversation
        from messages.models import Conversation
        conversation = Conversation.get_conversation(conversation_id)
        
        if not conversation or user_id not in conversation['participants']:
            print(f"❌ User {user_id} denied access to conversation {conversation_id}")
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Join the conversation room
        join_room(f"conversation_{conversation_id}")
        
        print(f"✅ User {user_id} joined conversation {conversation_id}")
        emit('joined_conversation', {'conversation_id': conversation_id})
        
    except Exception as e:
        print(f"❌ Error joining conversation: {e}")
        emit('error', {'message': 'Failed to join conversation'})

def handle_leave_conversation(data):
    """Leave a conversation room"""
    try:
        conversation_id = data.get('conversation_id')
        if conversation_id:
            leave_room(f"conversation_{conversation_id}")
            print(f"🚪 User left conversation {conversation_id}")
            emit('left_conversation', {'conversation_id': conversation_id})
            
    except Exception as e:
        print(f"❌ Error leaving conversation: {e}")

def handle_send_message(socketio, data):
    """Handle sending a message"""
    try:
        print(f"📨 Message send request from {request.sid}")
        print(f"📨 Message data: {data}")
        
        if request.sid not in connected_users:
            print("❌ User not authenticated for message send")
            emit('error', {'message': 'Not authenticated'})
            return
        
        user_id = connected_users[request.sid]['user_id']
        username = connected_users[request.sid]['username']
        conversation_id = data.get('conversation_id')
        content = data.get('content', '').strip()
        
        print(f"📨 User {username} sending message to conversation {conversation_id}")
        print(f"📨 Message content: '{content}'")
        
        if not conversation_id or not content:
            print("❌ Missing conversation ID or content")
            emit('error', {'message': 'Conversation ID and content required'})
            return
        
        # Verify user is part of conversation
        from messages.models import Conversation
        conversation = Conversation.get_conversation(conversation_id)
        if not conversation or user_id not in conversation['participants']:
            print(f"❌ User {user_id} not authorized for conversation {conversation_id}")
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Create message using the Message model
        message = Message.create_message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content
        )
        
        if message:
            print(f"✅ Message created successfully: {message['_id']}")
            print(f"📡 Broadcasting to room: conversation_{conversation_id}")
            
            # Get room members for debugging
            room_name = f"conversation_{conversation_id}"
            
            # Emit to all users in the conversation room
            socketio.emit(
                'new_message', 
                message, 
                room=room_name
            )
            
            print(f"📡 Message broadcasted to conversation room")
            
            # Also emit to sender to confirm receipt
            emit('message_sent', {
                'success': True,
                'message_id': message['_id']
            })
            
        else:
            print("❌ Failed to create message in database")
            emit('error', {'message': 'Failed to send message'})
            
    except Exception as e:
        print(f"❌ Error sending message: {e}")
        import traceback
        traceback.print_exc()
        emit('error', {'message': 'Failed to send message'})

def handle_typing_start(socketio, data):
    """Handle typing indicator start"""
    try:
        if request.sid not in connected_users:
            return
        
        user_id = connected_users[request.sid]['user_id']
        username = connected_users[request.sid]['username']
        conversation_id = data.get('conversation_id')
        
        print(f"⌨️ {username} started typing in conversation {conversation_id}")
        
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
        print(f"❌ Error in typing start: {e}")

def handle_typing_stop(socketio, data):
    """Handle typing indicator stop"""
    try:
        if request.sid not in connected_users:
            return
        
        user_id = connected_users[request.sid]['user_id']
        username = connected_users[request.sid]['username']
        conversation_id = data.get('conversation_id')
        
        print(f"⌨️ {username} stopped typing in conversation {conversation_id}")
        
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
        print(f"❌ Error in typing stop: {e}")

# Debug function to check room membership
def debug_room_info(socketio, room_name):
    """Debug function to check who's in a room"""
    try:
        # This is a simplified check - actual implementation may vary
        print(f"🔍 Checking room: {room_name}")
        print(f"🔍 Connected users: {list(connected_users.keys())}")
    except Exception as e:
        print(f"❌ Error checking room info: {e}")