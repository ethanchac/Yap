from flask_socketio import emit, join_room, leave_room, disconnect
from flask import request, current_app
from auth.service import verify_token
from users.models import User
from messages.models import Message, Conversation
from messages.redis_service import redis_service
from datetime import datetime
import logging
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_socketio():
    """Get the SocketIO instance from the current app"""
    try:
        return current_app.extensions['socketio']
    except (KeyError, AttributeError):
        logger.error("SocketIO not found in app extensions")
        return None

def handle_connect(socketio, auth):
    """Handle client connection with Redis-based session management"""
    try:
        logger.info(f"🔌 Connection attempt from {request.sid}")
        
        # More flexible auth token extraction
        token = None
        if auth and isinstance(auth, dict):
            token = auth.get('token')
        elif auth and isinstance(auth, str):
            token = auth
        
        # Also try to get token from query parameters as fallback
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
        
        # Get user info - try multiple possible username fields
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
        
        # Check if user already has active sessions and clean up if needed
        existing_sessions = redis_service.get_user_sessions(user_id)
        logger.info(f"👥 User {username} has {len(existing_sessions)} existing sessions")
        
        # Store user session in Redis
        user_data = {
            'username': username,
            'profile_picture': user.get('profile_picture', ''),
            'last_active': datetime.now().isoformat(),
            'session_id': request.sid
        }
        
        success = redis_service.set_user_online(user_id, request.sid, user_data)
        if not success:
            logger.error(f"❌ Failed to set user online in Redis for {user_id}")
            emit('error', {'message': 'Failed to establish session'})
            return False
        
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
        
        # Broadcast to other sessions that user is online (but not to all users)
        socketio_instance = get_socketio()
        if socketio_instance and len(existing_sessions) == 0:  # Only broadcast if this is first session
            socketio_instance.emit(
                'user_status_change',
                {
                    'user_id': user_id,
                    'username': username,
                    'status': 'online',
                    'timestamp': datetime.now().isoformat()
                },
                room=f"user_{user_id}_contacts"  # Only to contacts, not all sessions
            )
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error in handle_connect: {str(e)}", exc_info=True)
        emit('error', {'message': 'Connection failed due to server error'})
        return False

def handle_disconnect():
    """Handle client disconnection with Redis cleanup"""
    try:
        logger.info(f"🔌 Disconnect attempt from {request.sid}")
        
        # Try to get session data
        try:
            session_data = redis_service.get_redis().get(f"session:{request.sid}")
        except:
            session_data = None
        
        if session_data:
            try:
                data = json.loads(session_data)
                user_id = data['user_id']
                username = data.get('username', 'Unknown')
                
                logger.info(f"🧹 Cleaning up session for user {username} ({user_id})")
                
                # Clean up Redis session
                redis_service.set_user_offline(user_id, request.sid)
                
                # Leave user's personal room
                leave_room(f"user_{user_id}")
                
                # Check if user is still online from other sessions
                is_still_online = redis_service.is_user_online(user_id)
                
                if not is_still_online:
                    logger.info(f"📴 User {username} is now completely offline")
                    # Broadcast offline status only to contacts
                    socketio_instance = get_socketio()
                    if socketio_instance:
                        socketio_instance.emit(
                            'user_status_change',
                            {
                                'user_id': user_id,
                                'username': username,
                                'status': 'offline',
                                'timestamp': datetime.now().isoformat()
                            },
                            room=f"user_{user_id}_contacts"
                        )
                else:
                    logger.info(f"📱 User {username} still has other active sessions")
                
                logger.info(f"✅ User {username} ({user_id}) disconnected from session {request.sid}")
            except json.JSONDecodeError:
                logger.warning(f"⚠️ Invalid session data for {request.sid}")
        else:
            logger.info(f"❓ Unknown session {request.sid} disconnected")
            
    except Exception as e:
        logger.error(f"❌ Error in handle_disconnect: {str(e)}", exc_info=True)

def handle_join_conversation(socketio, data):
    """Join a conversation room with Redis tracking"""
    try:
        conversation_id = data.get('conversation_id')
        logger.info(f"🎯 Join conversation attempt from {request.sid}: {conversation_id}")
        
        # Get user from session
        try:
            session_data = redis_service.get_redis().get(f"session:{request.sid}")
        except:
            session_data = None
            
        if not session_data:
            logger.warning(f"❌ No session found for {request.sid}")
            emit('error', {'message': 'Session not found. Please reconnect.'})
            return
        
        if not conversation_id:
            logger.warning(f"❌ No conversation_id provided from {request.sid}")
            emit('error', {'message': 'Conversation ID required'})
            return
        
        try:
            data_parsed = json.loads(session_data)
            user_id = data_parsed['user_id']
            username = data_parsed['username']
        except (json.JSONDecodeError, KeyError):
            logger.warning(f"❌ Invalid session data for {request.sid}")
            emit('error', {'message': 'Invalid session. Please reconnect.'})
            return
        
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
        
        # Track in Redis
        redis_service.add_user_to_conversation(user_id, conversation_id, request.sid)
        
        # Update last seen
        redis_service.update_last_seen(request.sid)
        
        emit('joined_conversation', {'conversation_id': conversation_id})
        
        # Notify others in the room that user joined (optional, can be disabled to reduce noise)
        # socketio_instance = get_socketio()
        # if socketio_instance:
        #     socketio_instance.emit(
        #         'user_joined_room',
        #         {
        #             'user_id': user_id,
        #             'username': username,
        #             'conversation_id': conversation_id,
        #             'timestamp': datetime.now().isoformat()
        #         },
        #         room=room_name,
        #         include_self=False
        #     )
        
        # Mark messages as read when joining
        Message.mark_messages_as_read(conversation_id, user_id)
        
        logger.info(f"✅ User {username} successfully joined conversation {conversation_id}")
        
    except Exception as e:
        logger.error(f"❌ Error in handle_join_conversation: {str(e)}", exc_info=True)
        emit('error', {'message': 'Failed to join conversation'})

def handle_leave_conversation(data):
    """Leave a conversation room with Redis cleanup"""
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
        
        logger.info(f"👋 User leaving conversation {conversation_id} from {request.sid}")
        
        # Get user from session
        try:
            session_data = redis_service.get_redis().get(f"session:{request.sid}")
        except:
            session_data = None
            
        if session_data:
            try:
                data_parsed = json.loads(session_data)
                user_id = data_parsed['user_id']
                username = data_parsed['username']
                
                # Leave room
                room_name = f"conversation_{conversation_id}"
                leave_room(room_name)
                
                # Clean up Redis tracking
                redis_service.remove_user_from_conversation(user_id, conversation_id, request.sid)
                
                emit('left_conversation', {'conversation_id': conversation_id})
                
                logger.info(f"✅ User {username} left conversation {conversation_id}")
            except (json.JSONDecodeError, KeyError):
                logger.warning(f"⚠️ Invalid session data while leaving conversation")
        
    except Exception as e:
        logger.error(f"❌ Error in handle_leave_conversation: {str(e)}", exc_info=True)

def handle_send_message(socketio, data):
    """Handle sending a message with Redis broadcasting"""
    try:
        conversation_id = data.get('conversation_id')
        content = data.get('content', '').strip()
        
        logger.info(f"📨 Send message attempt from {request.sid}: conv={conversation_id}, length={len(content)}")
        
        # Get user from session
        try:
            session_data = redis_service.get_redis().get(f"session:{request.sid}")
        except:
            session_data = None
            
        if not session_data:
            logger.warning(f"❌ No session found for {request.sid}")
            emit('error', {'message': 'Session not found. Please reconnect.'})
            return
        
        try:
            data_parsed = json.loads(session_data)
            user_id = data_parsed['user_id']
            username = data_parsed['username']
        except (json.JSONDecodeError, KeyError):
            logger.warning(f"❌ Invalid session data for {request.sid}")
            emit('error', {'message': 'Invalid session. Please reconnect.'})
            return
        
        if not conversation_id or not content:
            logger.warning(f"❌ Invalid message data from {username}")
            emit('error', {'message': 'Conversation ID and content required'})
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
        
        # Create message
        message = Message.create_message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content
        )
        
        if message:
            room_name = f"conversation_{conversation_id}"
            
            logger.info(f"📡 Broadcasting message {message['_id']} to room {room_name}")
            
            # Get SocketIO instance
            socketio_instance = get_socketio()
            if socketio_instance:
                # Emit to all users in the conversation room
                socketio_instance.emit(
                    'new_message', 
                    message, 
                    room=room_name
                )
                
                # Also emit to users' personal rooms for notifications (if they're not in the conversation room)
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
            
            # Update last seen
            redis_service.update_last_seen(request.sid)
            
            # Clear typing status
            redis_service.set_typing_status(user_id, conversation_id, False)
            
            logger.info(f"✅ Message sent successfully: {message['_id']} from {username}")
            
        else:
            logger.error(f"❌ Failed to create message for user {username}")
            emit('error', {'message': 'Failed to send message'})
            
    except Exception as e:
        logger.error(f"❌ Error in handle_send_message: {str(e)}", exc_info=True)
        emit('error', {'message': 'Failed to send message'})

def handle_typing_start(socketio, data):
    """Handle typing indicator start with Redis"""
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
            
        # Get user from session
        try:
            session_data = redis_service.get_redis().get(f"session:{request.sid}")
        except:
            return
            
        if not session_data:
            return
        
        try:
            data_parsed = json.loads(session_data)
            user_id = data_parsed['user_id']
            username = data_parsed['username']
        except (json.JSONDecodeError, KeyError):
            return
        
        # Set typing status in Redis
        redis_service.set_typing_status(user_id, conversation_id, True, ttl=10)
        
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
        
        # Update last seen
        redis_service.update_last_seen(request.sid)
        
    except Exception as e:
        logger.error(f"❌ Error in handle_typing_start: {str(e)}", exc_info=True)

def handle_typing_stop(socketio, data):
    """Handle typing indicator stop with Redis"""
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
            
        # Get user from session
        try:
            session_data = redis_service.get_redis().get(f"session:{request.sid}")
        except:
            return
            
        if not session_data:
            return
        
        try:
            data_parsed = json.loads(session_data)
            user_id = data_parsed['user_id']
            username = data_parsed['username']
        except (json.JSONDecodeError, KeyError):
            return
        
        # Clear typing status in Redis
        redis_service.set_typing_status(user_id, conversation_id, False)
        
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

# Additional utility functions for debugging

def get_session_info(session_id):
    """Get session information for debugging"""
    try:
        session_data = redis_service.get_redis().get(f"session:{session_id}")
        if session_data:
            return json.loads(session_data)
    except:
        pass
    return None

def cleanup_stale_sessions():
    """Clean up stale sessions - can be called periodically"""
    try:
        redis_service.cleanup_expired_sessions()
        logger.info("✅ Cleaned up stale sessions")
    except Exception as e:
        logger.error(f"❌ Error cleaning up sessions: {e}")

def get_active_users_count():
    """Get count of active users for monitoring"""
    try:
        redis_client = redis_service.get_redis()
        online_keys = redis_client.keys("user_online:*")
        return len(online_keys)
    except:
        return 0