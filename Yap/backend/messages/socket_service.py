# messages/socket_service.py
from flask import current_app
from flask_socketio import SocketIO, emit
from messages.redis_service import redis_service
from users.models import User
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)

class SocketService:
    """Service for managing socket operations and broadcasting"""
    
    def __init__(self):
        self.socketio = None
    
    def get_socketio(self):
        """Get SocketIO instance from current app"""
        try:
            # Get the socketio instance from the app context
            return current_app.extensions.get('socketio')
        except (RuntimeError, AttributeError):
            logger.warning("SocketIO not available in current context")
            return None
    
    def broadcast_message_to_conversation(self, conversation_id, message_data):
        """Broadcast a new message to all users in a conversation"""
        try:
            socketio = self.get_socketio()
            if not socketio:
                logger.warning("SocketIO not available for broadcasting")
                return False
            
            room_name = f"conversation_{conversation_id}"
            
            # Emit to conversation room
            socketio.emit(
                'new_message',
                message_data,
                room=room_name
            )
            
            # Also send notifications to participants who aren't in the room
            self._send_message_notifications(conversation_id, message_data)
            
            logger.info(f"Broadcasted message {message_data.get('_id')} to conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error broadcasting message: {e}")
            return False
    
    def broadcast_typing_status(self, conversation_id, user_id, is_typing, username=None):
        """Broadcast typing status to conversation participants"""
        try:
            socketio = self.get_socketio()
            if not socketio:
                return False
            
            # Get username if not provided
            if not username:
                user = User.get_user_profile(user_id)
                username = user.get('username', 'Unknown') if user else 'Unknown'
            
            room_name = f"conversation_{conversation_id}"
            
            socketio.emit(
                'user_typing',
                {
                    'user_id': user_id,
                    'username': username,
                    'conversation_id': conversation_id,
                    'typing': is_typing,
                    'timestamp': datetime.now().isoformat()
                },
                room=room_name
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error broadcasting typing status: {e}")
            return False
    
    def broadcast_message_edit(self, conversation_id, edit_data):
        """Broadcast message edit to conversation participants"""
        try:
            socketio = self.get_socketio()
            if not socketio:
                return False
            
            room_name = f"conversation_{conversation_id}"
            
            socketio.emit(
                'message_edited',
                edit_data,
                room=room_name
            )
            
            logger.info(f"Broadcasted message edit for message {edit_data.get('message_id')}")
            return True
            
        except Exception as e:
            logger.error(f"Error broadcasting message edit: {e}")
            return False
    
    def broadcast_user_status_change(self, user_id, status, username=None):
        """Broadcast user online/offline status change"""
        try:
            socketio = self.get_socketio()
            if not socketio:
                return False
            
            # Get username if not provided
            if not username:
                user = User.get_user_profile(user_id)
                username = user.get('username', 'Unknown') if user else 'Unknown'
            
            # Broadcast to user's contacts/friends
            # This would require implementing a friends system
            socketio.emit(
                'user_status_change',
                {
                    'user_id': user_id,
                    'username': username,
                    'status': status,
                    'timestamp': datetime.now().isoformat()
                },
                room=f"user_{user_id}_contacts"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error broadcasting user status change: {e}")
            return False
    
    def broadcast_conversation_update(self, conversation_id, update_data):
        """Broadcast conversation updates (like new participants, name changes, etc.)"""
        try:
            socketio = self.get_socketio()
            if not socketio:
                return False
            
            room_name = f"conversation_{conversation_id}"
            
            socketio.emit(
                'conversation_updated',
                {
                    'conversation_id': conversation_id,
                    'update_data': update_data,
                    'timestamp': datetime.now().isoformat()
                },
                room=room_name
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error broadcasting conversation update: {e}")
            return False
    
    def notify_user(self, user_id, notification_type, data):
        """Send a notification to a specific user"""
        try:
            socketio = self.get_socketio()
            if not socketio:
                return False
            
            socketio.emit(
                'notification',
                {
                    'type': notification_type,
                    'data': data,
                    'timestamp': datetime.now().isoformat()
                },
                room=f"user_{user_id}"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending notification to user {user_id}: {e}")
            return False
    
    def _send_message_notifications(self, conversation_id, message_data):
        """Send push notifications to users not currently in the conversation room"""
        try:
            from messages.models import Conversation
            
            conversation = Conversation.get_conversation(conversation_id)
            if not conversation:
                return
            
            sender_id = message_data.get('sender_id')
            
            # Get participants who are online but not in the conversation room
            for participant_id in conversation['participants']:
                if participant_id == sender_id:
                    continue  # Don't notify sender
                
                # Check if user is online
                if redis_service.is_user_online(participant_id):
                    # Check if user is in conversation room
                    conv_sessions = redis_service.get_conversation_sessions(conversation_id)
                    user_sessions = redis_service.get_user_sessions(participant_id)
                    
                    user_session_ids = [session.get('session_id') for session in user_sessions if session.get('session_id')]
                    user_in_room = bool(set(user_session_ids).intersection(set(conv_sessions)))
                    
                    if not user_in_room:
                        # Send notification to user's personal room
                        self.notify_user(
                            participant_id,
                            'new_message',
                            {
                                'message': message_data,
                                'conversation_id': conversation_id,
                                'sender': message_data.get('sender', {})
                            }
                        )
            
        except Exception as e:
            logger.error(f"Error sending message notifications: {e}")
    
    def get_conversation_online_users(self, conversation_id):
        """Get list of online users in a conversation"""
        try:
            from messages.models import Conversation
            
            conversation = Conversation.get_conversation(conversation_id)
            if not conversation:
                return []
            
            online_users = []
            
            for participant_id in conversation['participants']:
                if redis_service.is_user_online(participant_id):
                    user = User.get_user_profile(participant_id)
                    if user:
                        # Get user's sessions to check last activity
                        sessions = redis_service.get_user_sessions(participant_id)
                        last_seen = None
                        if sessions:
                            last_seen = max(session.get('last_seen', '') for session in sessions)
                        
                        online_users.append({
                            'user_id': participant_id,
                            'username': user['username'],
                            'profile_picture': user.get('profile_picture', ''),
                            'online': True,
                            'last_seen': last_seen
                        })
            
            return online_users
            
        except Exception as e:
            logger.error(f"Error getting online users for conversation {conversation_id}: {e}")
            return []
    
    def emit_to_user_sessions(self, user_id, event, data):
        """Emit an event to all of a user's active sessions"""
        try:
            socketio = self.get_socketio()
            if not socketio:
                return False
            
            sessions = redis_service.get_user_sessions(user_id)
            
            for session in sessions:
                session_id = session.get('session_id')
                if session_id:
                    socketio.emit(event, data, room=session_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error emitting to user sessions: {e}")
            return False
    
    def cleanup_disconnected_sessions(self):
        """Clean up sessions that are no longer connected (utility function)"""
        try:
            # This could be run periodically to clean up stale sessions
            # For now, we rely on Redis TTL for automatic cleanup
            redis_service.cleanup_expired_sessions()
            
        except Exception as e:
            logger.error(f"Error cleaning up sessions: {e}")
    
    def get_conversation_stats(self, conversation_id):
        """Get real-time stats for a conversation"""
        try:
            participants = redis_service.get_conversation_participants(conversation_id)
            online_participants = []
            
            for participant_id in participants:
                if redis_service.is_user_online(participant_id):
                    online_participants.append(participant_id)
            
            typing_users = redis_service.get_typing_users(conversation_id)
            
            return {
                'conversation_id': conversation_id,
                'total_participants': len(participants),
                'online_participants': len(online_participants),
                'online_participant_ids': online_participants,
                'typing_users': typing_users,
                'active_sessions': len(redis_service.get_conversation_sessions(conversation_id))
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation stats: {e}")
            return {}

# Create global instance
socket_service = SocketService()

# Convenience functions for easy imports
def broadcast_message_to_conversation(conversation_id, message_data):
    """Convenience function to broadcast message"""
    return socket_service.broadcast_message_to_conversation(conversation_id, message_data)

def broadcast_typing_status(conversation_id, user_id, is_typing, username=None):
    """Convenience function to broadcast typing status"""
    return socket_service.broadcast_typing_status(conversation_id, user_id, is_typing, username)

def broadcast_message_edit_to_conversation(conversation_id, edit_data):
    """Convenience function to broadcast message edit"""
    return socket_service.broadcast_message_edit(conversation_id, edit_data)

def notify_user(user_id, notification_type, data):
    """Convenience function to notify user"""
    return socket_service.notify_user(user_id, notification_type, data)

def broadcast_user_status_change(user_id, status, username=None):
    """Convenience function to broadcast user status change"""
    return socket_service.broadcast_user_status_change(user_id, status, username)