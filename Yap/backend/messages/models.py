from datetime import datetime
import pytz
from bson import ObjectId
from flask import current_app
import logging

logger = logging.getLogger(__name__)

# Define Eastern Time timezone with automatic DST handling
EASTERN_TZ = pytz.timezone('US/Eastern')

def get_eastern_now():
    """Get current time in Eastern timezone (automatically handles DST)"""
    utc_now = datetime.now(pytz.UTC)
    et_now = utc_now.astimezone(EASTERN_TZ)
    return et_now

def format_eastern_timestamp(dt):
    """Format datetime as ISO string in Eastern timezone"""
    if dt is None:
        return None
        
    if isinstance(dt, datetime):
        # If no timezone info, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)
        
        # Convert to Eastern time
        eastern_dt = dt.astimezone(EASTERN_TZ)
        iso_string = eastern_dt.isoformat()
        return iso_string
    
    return dt

class Message:
    @staticmethod
    def create_message(conversation_id, sender_id, content):
        """Create a new message with Eastern Time timestamp"""
        db = current_app.config["DB"]
        
        try:
            # Get current Eastern Time
            et_now = get_eastern_now()
            
            # Create message document
            message_doc = {
                "conversation_id": ObjectId(conversation_id),
                "sender_id": sender_id,
                "content": content,
                "created_at": et_now,
                "read_by": [sender_id],
                "message_type": "text",
                "edited": False,
                "edited_at": None
            }
            
            result = db.messages.insert_one(message_doc)
            message_id = str(result.inserted_id)
            
            # Update conversation's last message timestamp
            db.conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {
                    "$set": {
                        "last_message_at": et_now,
                        "last_message": result.inserted_id
                    }
                }
            )
            
            # Get sender info for the response
            sender = db.users.find_one({"_id": ObjectId(sender_id)})
            if sender:
                sender["_id"] = str(sender["_id"])
            
            # Return Eastern Time timestamp in ISO format
            created_at_iso = et_now.isoformat()
            
            # Prepare message response
            message_response = {
                "_id": message_id,
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "content": content,
                "created_at": created_at_iso,
                "message_type": "text",
                "edited": False,
                "read_by": [sender_id],
                "sender": {
                    "_id": sender["_id"] if sender else sender_id,
                    "username": sender["username"] if sender else "Unknown",
                    "profile_picture": sender.get("profile_picture", "") if sender else ""
                }
            }
            
            logger.info(f"Message created: {message_id} in conversation {conversation_id}")
            return message_response
            
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            return None
    
    @staticmethod
    def get_conversation_messages(conversation_id, limit=50, skip=0):
        """Get messages for a conversation"""
        db = current_app.config["DB"]
        
        try:
            messages = list(db.messages.find({
                "conversation_id": ObjectId(conversation_id)
            }).sort("created_at", -1).skip(skip).limit(limit))
            
            result = []
            
            for msg in messages:
                # Get sender info
                sender = db.users.find_one({"_id": ObjectId(msg["sender_id"])})
                
                # Format timestamp
                stored_time = msg["created_at"]
                if isinstance(stored_time, datetime):
                    if stored_time.tzinfo is None:
                        stored_time = stored_time.replace(tzinfo=pytz.UTC)
                    eastern_time = stored_time.astimezone(EASTERN_TZ)
                    created_at_iso = eastern_time.isoformat()
                else:
                    created_at_iso = stored_time
                
                message = {
                    "_id": str(msg["_id"]),
                    "conversation_id": str(msg["conversation_id"]),
                    "sender_id": msg["sender_id"],
                    "content": msg["content"],
                    "created_at": created_at_iso,
                    "message_type": msg.get("message_type", "text"),
                    "edited": msg.get("edited", False),
                    "edited_at": format_eastern_timestamp(msg.get("edited_at")),
                    "read_by": msg.get("read_by", []),
                    "sender": {
                        "_id": str(sender["_id"]) if sender else msg["sender_id"],
                        "username": sender["username"] if sender else "Unknown",
                        "profile_picture": sender.get("profile_picture", "") if sender else ""
                    }
                }
                result.append(message)
            
            # Return in chronological order (oldest first)
            return result[::-1]
            
        except Exception as e:
            logger.error(f"Error getting messages: {e}")
            return []
    
    @staticmethod
    def mark_messages_as_read(conversation_id, user_id):
        """Mark all messages in a conversation as read by user"""
        db = current_app.config["DB"]
        
        try:
            result = db.messages.update_many(
                {
                    "conversation_id": ObjectId(conversation_id),
                    "read_by": {"$ne": user_id}
                },
                {
                    "$addToSet": {"read_by": user_id}
                }
            )
            
            logger.info(f"Marked {result.modified_count} messages as read for user {user_id}")
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Error marking messages as read: {e}")
            return 0

    @staticmethod
    def get_unread_message_count(user_id):
        """Get total unread message count for user"""
        db = current_app.config["DB"]
        
        try:
            # Get user's conversations
            user_conversations = db.conversations.find({"participants": user_id})
            total_unread = 0
            
            for conv in user_conversations:
                unread_count = db.messages.count_documents({
                    "conversation_id": conv["_id"],
                    "sender_id": {"$ne": user_id},
                    "read_by": {"$ne": user_id}
                })
                total_unread += unread_count
            
            return total_unread
            
        except Exception as e:
            logger.error(f"Error getting unread count: {e}")
            return 0

    @staticmethod
    def edit_message(message_id, new_content, user_id):
        """Edit a message (if sender)"""
        db = current_app.config["DB"]
        
        try:
            # Verify user is the sender
            message = db.messages.find_one({
                "_id": ObjectId(message_id),
                "sender_id": user_id
            })
            
            if not message:
                return None
            
            et_now = get_eastern_now()
            
            # Update message
            result = db.messages.update_one(
                {"_id": ObjectId(message_id)},
                {
                    "$set": {
                        "content": new_content,
                        "edited": True,
                        "edited_at": et_now
                    }
                }
            )
            
            if result.modified_count > 0:
                return {
                    "message_id": message_id,
                    "new_content": new_content,
                    "edited_at": et_now.isoformat()
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error editing message: {e}")
            return None

class Conversation:
    @staticmethod
    def get_conversation(conversation_id):
        """Get conversation by ID"""
        db = current_app.config["DB"]
        
        try:
            conversation = db.conversations.find_one({"_id": ObjectId(conversation_id)})
            if conversation:
                conversation["_id"] = str(conversation["_id"])
                conversation["created_at"] = format_eastern_timestamp(conversation.get("created_at"))
                conversation["last_message_at"] = format_eastern_timestamp(conversation.get("last_message_at"))
                return conversation
            return None
            
        except Exception as e:
            logger.error(f"Error getting conversation: {e}")
            return None

    @staticmethod
    def create_conversation(participant_ids):
        """Create a new conversation with Eastern Time timestamps"""
        db = current_app.config["DB"]
        
        try:
            participant_ids = sorted(participant_ids)
            
            existing = db.conversations.find_one({
                "participants": participant_ids
            })
            
            if existing:
                existing["_id"] = str(existing["_id"])
                existing["created_at"] = format_eastern_timestamp(existing.get("created_at"))
                existing["last_message_at"] = format_eastern_timestamp(existing.get("last_message_at"))
                return existing
            
            # Use Eastern Time for consistency
            et_now = get_eastern_now()
            
            conversation_doc = {
                "participants": participant_ids,
                "created_at": et_now,
                "last_message_at": et_now,
                "last_message": None,
                "conversation_type": "direct",
                "active": True
            }
            
            result = db.conversations.insert_one(conversation_doc)
            conversation_doc["_id"] = str(result.inserted_id)
            conversation_doc["created_at"] = et_now.isoformat()
            conversation_doc["last_message_at"] = et_now.isoformat()
            
            logger.info(f"Created new conversation: {conversation_doc['_id']}")
            return conversation_doc
            
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            return None
    
    @staticmethod
    def get_user_conversations(user_id, limit=20, skip=0):
        """Get conversations for user"""
        db = current_app.config["DB"]
        
        try:
            conversations = list(db.conversations.find({
                "participants": user_id,
                "active": {"$ne": False}
            }).sort("last_message_at", -1).skip(skip).limit(limit))
            
            result = []
            
            for conv in conversations:
                conv["_id"] = str(conv["_id"])
                
                # Get other participant
                other_participant_id = None
                for participant in conv["participants"]:
                    if participant != user_id:
                        other_participant_id = participant
                        break
                
                # Get other participant user info
                other_participant = None
                if other_participant_id:
                    other_user = db.users.find_one({"_id": ObjectId(other_participant_id)})
                    
                    if other_user:
                        other_participant = {
                            "_id": str(other_user["_id"]),
                            "username": other_user["username"],
                            "profile_picture": other_user.get("profile_picture", ""),
                            "online": False  # Simple offline status since no Redis
                        }
                
                # Get last message
                last_message = None
                if conv.get("last_message"):
                    last_msg = db.messages.find_one({"_id": conv["last_message"]})
                    if last_msg:
                        stored_time = last_msg["created_at"]
                        if isinstance(stored_time, datetime):
                            if stored_time.tzinfo is None:
                                stored_time = stored_time.replace(tzinfo=pytz.UTC)
                            eastern_time = stored_time.astimezone(EASTERN_TZ)
                            created_at_iso = eastern_time.isoformat()
                        else:
                            created_at_iso = stored_time
                            
                        last_message = {
                            "_id": str(last_msg["_id"]),
                            "content": last_msg["content"],
                            "sender_id": last_msg["sender_id"],
                            "created_at": created_at_iso,
                            "message_type": last_msg.get("message_type", "text")
                        }
                
                # Get unread count for this conversation
                unread_count = db.messages.count_documents({
                    "conversation_id": ObjectId(conv["_id"]),
                    "sender_id": {"$ne": user_id},
                    "read_by": {"$ne": user_id}
                })
                
                # Format timestamps
                conv["last_message_at"] = format_eastern_timestamp(conv.get("last_message_at"))
                conv["created_at"] = format_eastern_timestamp(conv.get("created_at"))
                
                conv["other_participant"] = other_participant
                conv["last_message"] = last_message
                conv["unread_count"] = unread_count
                result.append(conv)
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting user conversations: {e}")
            return []