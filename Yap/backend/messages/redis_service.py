# messages/redis_service.py
import json
import time
from datetime import datetime, timedelta
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class RedisService:
    """Redis service for managing user sessions, presence, and real-time messaging"""
    
    def __init__(self):
        self.redis = None
    
    def get_redis(self):
        """Get Redis client from Flask app context"""
        if not self.redis:
            self.redis = current_app.config.get('REDIS')
        return self.redis
    
    def _safe_delete_key(self, key):
        """Safely delete a Redis key, handling type conflicts"""
        try:
            redis_client = self.get_redis()
            redis_client.delete(key)
        except Exception as e:
            logger.warning(f"Could not delete key {key}: {e}")
    
    # ===== USER PRESENCE MANAGEMENT =====
    
    def set_user_online(self, user_id, session_id, user_data=None):
        """Mark user as online and store session info"""
        try:
            redis_client = self.get_redis()
            
            # Store user session with 30-minute expiration
            session_key = f"session:{session_id}"
            session_data = {
                'user_id': user_id,
                'connected_at': datetime.now().isoformat(),
                'last_seen': datetime.now().isoformat(),
                **(user_data or {})
            }
            
            # Clear any existing key first to avoid type conflicts
            self._safe_delete_key(session_key)
            
            redis_client.setex(
                session_key, 
                1800,  # 30 minutes
                json.dumps(session_data)
            )
            
            # Add session to user's active sessions set
            user_sessions_key = f"user_sessions:{user_id}"
            redis_client.sadd(user_sessions_key, session_id)
            redis_client.expire(user_sessions_key, 1800)
            
            # Mark user as online
            redis_client.setex(f"user_online:{user_id}", 1800, "1")
            
            logger.info(f"User {user_id} marked online with session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error setting user online: {e}")
            return False
    
    def set_user_offline(self, user_id, session_id):
        """Mark user as offline and clean up session"""
        try:
            redis_client = self.get_redis()
            
            # Remove session
            redis_client.delete(f"session:{session_id}")
            
            # Remove from user's active sessions
            user_sessions_key = f"user_sessions:{user_id}"
            redis_client.srem(user_sessions_key, session_id)
            
            # Check if user has any other active sessions
            active_sessions = redis_client.smembers(user_sessions_key)
            if not active_sessions:
                # No active sessions, mark user offline
                redis_client.delete(f"user_online:{user_id}")
                redis_client.delete(user_sessions_key)
                logger.info(f"User {user_id} marked offline")
            else:
                logger.info(f"User {user_id} still has {len(active_sessions)} active sessions")
            
            return True
            
        except Exception as e:
            logger.error(f"Error setting user offline: {e}")
            return False
    
    def is_user_online(self, user_id):
        """Check if user is currently online"""
        try:
            redis_client = self.get_redis()
            return redis_client.exists(f"user_online:{user_id}")
        except Exception as e:
            logger.error(f"Error checking user online status: {e}")
            return False
    
    def get_user_sessions(self, user_id):
        """Get all active sessions for a user"""
        try:
            redis_client = self.get_redis()
            session_ids = redis_client.smembers(f"user_sessions:{user_id}")
            
            sessions = []
            for session_id in session_ids:
                session_data = redis_client.get(f"session:{session_id}")
                if session_data:
                    try:
                        sessions.append(json.loads(session_data))
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON in session {session_id}")
                        # Clean up invalid session
                        redis_client.delete(f"session:{session_id}")
                        redis_client.srem(f"user_sessions:{user_id}", session_id)
            
            return sessions
        except Exception as e:
            logger.error(f"Error getting user sessions: {e}")
            return []
    
    def update_last_seen(self, session_id):
        """Update last seen timestamp for a session"""
        try:
            redis_client = self.get_redis()
            session_data = redis_client.get(f"session:{session_id}")
            
            if session_data:
                try:
                    data = json.loads(session_data)
                    data['last_seen'] = datetime.now().isoformat()
                    redis_client.setex(f"session:{session_id}", 1800, json.dumps(data))
                    
                    # Extend user online status
                    user_id = data['user_id']
                    redis_client.expire(f"user_online:{user_id}", 1800)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in session {session_id}")
                    # Clean up invalid session
                    redis_client.delete(f"session:{session_id}")
                
        except Exception as e:
            logger.error(f"Error updating last seen: {e}")
    
    # ===== CONVERSATION MANAGEMENT =====
    
    def add_user_to_conversation(self, user_id, conversation_id, session_id):
        """Add user to a conversation room"""
        try:
            redis_client = self.get_redis()
            
            # Add user to conversation participants
            conv_key = f"conversation:{conversation_id}:participants"
            redis_client.sadd(conv_key, user_id)
            redis_client.expire(conv_key, 3600)  # 1 hour
            
            # Add session to conversation sessions
            conv_sessions_key = f"conversation:{conversation_id}:sessions"
            redis_client.sadd(conv_sessions_key, session_id)
            redis_client.expire(conv_sessions_key, 3600)
            
            # Track user's active conversations
            user_convs_key = f"user_conversations:{user_id}"
            redis_client.sadd(user_convs_key, conversation_id)
            redis_client.expire(user_convs_key, 3600)
            
            logger.info(f"User {user_id} added to conversation {conversation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding user to conversation: {e}")
            return False
    
    def remove_user_from_conversation(self, user_id, conversation_id, session_id):
        """Remove user from a conversation room"""
        try:
            redis_client = self.get_redis()
            
            # Remove session from conversation
            conv_sessions_key = f"conversation:{conversation_id}:sessions"
            redis_client.srem(conv_sessions_key, session_id)
            
            # Check if user has other sessions in this conversation
            user_sessions = redis_client.smembers(f"user_sessions:{user_id}")
            user_sessions_in_conv = redis_client.smembers(conv_sessions_key)
            
            user_still_in_conv = bool(user_sessions.intersection(user_sessions_in_conv))
            
            if not user_still_in_conv:
                # Remove user from conversation participants
                redis_client.srem(f"conversation:{conversation_id}:participants", user_id)
                redis_client.srem(f"user_conversations:{user_id}", conversation_id)
                logger.info(f"User {user_id} removed from conversation {conversation_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error removing user from conversation: {e}")
            return False
    
    def get_conversation_participants(self, conversation_id):
        """Get all active participants in a conversation"""
        try:
            redis_client = self.get_redis()
            return list(redis_client.smembers(f"conversation:{conversation_id}:participants"))
        except Exception as e:
            logger.error(f"Error getting conversation participants: {e}")
            return []
    
    def get_conversation_sessions(self, conversation_id):
        """Get all active sessions in a conversation"""
        try:
            redis_client = self.get_redis()
            return list(redis_client.smembers(f"conversation:{conversation_id}:sessions"))
        except Exception as e:
            logger.error(f"Error getting conversation sessions: {e}")
            return []
    
    # ===== MESSAGE CACHING =====
    
    def cache_message(self, message_data, ttl=3600):
        """Cache a message for quick retrieval"""
        try:
            redis_client = self.get_redis()
            message_id = message_data.get('_id')
            
            if message_id:
                key = f"message:{message_id}"
                # Clear any existing key first to avoid type conflicts
                self._safe_delete_key(key)
                redis_client.setex(key, ttl, json.dumps(message_data))
                return True
                
        except Exception as e:
            logger.error(f"Error caching message: {e}")
            return False
    
    def get_cached_message(self, message_id):
        """Get a cached message"""
        try:
            redis_client = self.get_redis()
            message_data = redis_client.get(f"message:{message_id}")
            
            if message_data:
                try:
                    return json.loads(message_data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON in cached message {message_id}")
                    # Clean up invalid cache
                    redis_client.delete(f"message:{message_id}")
                    return None
                
        except Exception as e:
            logger.error(f"Error getting cached message: {e}")
            return None
    
    # ===== TYPING INDICATORS =====
    
    def set_typing_status(self, user_id, conversation_id, is_typing=True, ttl=10):
        """Set typing status for a user in a conversation"""
        try:
            redis_client = self.get_redis()
            key = f"typing:{conversation_id}:{user_id}"
            
            if is_typing:
                redis_client.setex(key, ttl, "1")
            else:
                redis_client.delete(key)
                
            return True
            
        except Exception as e:
            logger.error(f"Error setting typing status: {e}")
            return False
    
    def get_typing_users(self, conversation_id):
        """Get list of users currently typing in a conversation"""
        try:
            redis_client = self.get_redis()
            pattern = f"typing:{conversation_id}:*"
            typing_keys = redis_client.keys(pattern)
            
            typing_users = []
            for key in typing_keys:
                # Extract user_id from key
                parts = key.split(':')
                if len(parts) >= 3:
                    user_id = parts[-1]
                    typing_users.append(user_id)
            
            return typing_users
            
        except Exception as e:
            logger.error(f"Error getting typing users: {e}")
            return []
    
    # ===== CLEANUP UTILITIES =====
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions and related data"""
        try:
            redis_client = self.get_redis()
            
            # Get all session keys
            session_keys = redis_client.keys("session:*")
            
            for key in session_keys:
                # Check if key exists (TTL might have expired it)
                if not redis_client.exists(key):
                    continue
                    
                try:
                    session_data = redis_client.get(key)
                    if session_data:
                        data = json.loads(session_data)
                        user_id = data.get('user_id')
                        session_id = key.split(':')[1]
                        
                        # Check if session is still valid
                        connected_at = data.get('connected_at')
                        if connected_at:
                            connected_time = datetime.fromisoformat(connected_at.replace('Z', '+00:00'))
                            if datetime.now() - connected_time > timedelta(hours=1):
                                # Session too old, clean up
                                self.set_user_offline(user_id, session_id)
                except (json.JSONDecodeError, KeyError, ValueError):
                    # Invalid session data, delete it
                    redis_client.delete(key)
            
            logger.info("Session cleanup completed")
            return True
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            return False
    
    def reset_redis_data(self):
        """Reset all Redis data (use with caution)"""
        try:
            redis_client = self.get_redis()
            redis_client.flushdb()
            logger.info("Redis data reset completed")
            return True
        except Exception as e:
            logger.error(f"Error resetting Redis data: {e}")
            return False

# Create global instance
redis_service = RedisService()