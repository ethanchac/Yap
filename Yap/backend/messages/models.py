from datetime import datetime
from bson import ObjectId
from flask import current_app
import json

class Conversation:
    @staticmethod
    def create_conversation(participant_ids):
        """Create a new conversation between users"""
        db = current_app.config["DB"]
        
        try:
            # Sort participant IDs to ensure consistent conversation lookup
            participant_ids = sorted(participant_ids)
            
            # Check if conversation already exists
            existing = db.conversations.find_one({
                "participants": participant_ids
            })
            
            if existing:
                existing["_id"] = str(existing["_id"])
                return existing
            
            # Create new conversation
            conversation_doc = {
                "participants": participant_ids,
                "created_at": datetime.now(),
                "last_message_at": datetime.now(),
                "last_message": None
            }
            
            result = db.conversations.insert_one(conversation_doc)
            conversation_doc["_id"] = str(result.inserted_id)
            
            return conversation_doc
            
        except Exception as e:
            print(f"Error creating conversation: {e}")
            return None
    
    @staticmethod
    def get_conversation(conversation_id):
        """Get conversation by ID"""
        db = current_app.config["DB"]
        
        try:
            conversation = db.conversations.find_one({"_id": ObjectId(conversation_id)})
            if conversation:
                conversation["_id"] = str(conversation["_id"])
                return conversation
            return None
            
        except Exception as e:
            print(f"Error getting conversation: {e}")
            return None
    
    @staticmethod
    def get_user_conversations(user_id, limit=20, skip=0):
        """Get all conversations for a user with last message info"""
        db = current_app.config["DB"]
        
        try:
            # Simple approach - get conversations and populate data manually
            conversations = list(db.conversations.find({
                "participants": user_id
            }).sort("last_message_at", -1).skip(skip).limit(limit))
            
            result = []
            
            for conv in conversations:
                # Convert ObjectId to string
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
                            "profile_picture": other_user.get("profile_picture", "")
                        }
                
                # Get last message
                last_message = None
                if conv.get("last_message"):
                    last_msg = db.messages.find_one({"_id": conv["last_message"]})
                    if last_msg:
                        last_message = {
                            "_id": str(last_msg["_id"]),
                            "content": last_msg["content"],
                            "sender_id": last_msg["sender_id"],
                            "created_at": last_msg["created_at"].isoformat() if isinstance(last_msg["created_at"], datetime) else last_msg["created_at"]
                        }
                
                conv["other_participant"] = other_participant
                conv["last_message"] = last_message
                result.append(conv)
            
            return result
            
        except Exception as e:
            print(f"Error getting user conversations: {e}")
            return []

class Message:
    @staticmethod
    def create_message(conversation_id, sender_id, content):
        """Create a new message"""
        db = current_app.config["DB"]
        
        try:
            # Create message document
            message_doc = {
                "conversation_id": ObjectId(conversation_id),
                "sender_id": sender_id,
                "content": content,
                "created_at": datetime.now(),
                "read_by": [sender_id]  # Sender has "read" their own message
            }
            
            result = db.messages.insert_one(message_doc)
            
            # Update conversation's last message timestamp
            db.conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {
                    "$set": {
                        "last_message_at": datetime.now(),
                        "last_message": result.inserted_id
                    }
                }
            )
            
            # Get sender info for the response
            sender = db.users.find_one({"_id": ObjectId(sender_id)})
            if sender:
                sender["_id"] = str(sender["_id"])
            
            # FIXED: Convert datetime to ISO string for JSON serialization
            created_at_iso = message_doc["created_at"].isoformat()
            
            # Prepare message response
            message_response = {
                "_id": str(result.inserted_id),
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "content": content,
                "created_at": created_at_iso,  # FIXED: Use ISO string instead of datetime object
                "sender": {
                    "_id": sender["_id"] if sender else sender_id,
                    "username": sender["username"] if sender else "Unknown",
                    "profile_picture": sender.get("profile_picture", "") if sender else ""
                }
            }
            
            return message_response
            
        except Exception as e:
            print(f"Error creating message: {e}")
            return None
    
    @staticmethod
    def get_conversation_messages(conversation_id, limit=50, skip=0):
        """Get messages for a conversation - SIMPLIFIED VERSION"""
        db = current_app.config["DB"]
        
        try:
            # Simple query without complex aggregation
            messages = list(db.messages.find({
                "conversation_id": ObjectId(conversation_id)
            }).sort("created_at", -1).skip(skip).limit(limit))
            
            result = []
            
            for msg in messages:
                # Get sender info
                sender = db.users.find_one({"_id": ObjectId(msg["sender_id"])})
                
                # FIXED: Convert datetime to ISO string
                created_at_iso = msg["created_at"].isoformat() if isinstance(msg["created_at"], datetime) else msg["created_at"]
                
                message = {
                    "_id": str(msg["_id"]),
                    "conversation_id": str(msg["conversation_id"]),
                    "sender_id": msg["sender_id"],
                    "content": msg["content"],
                    "created_at": created_at_iso,  # FIXED: Use ISO string
                    "read_by": msg.get("read_by", []),
                    "sender": {
                        "_id": str(sender["_id"]) if sender else msg["sender_id"],
                        "username": sender["username"] if sender else "Unknown",
                        "profile_picture": sender.get("profile_picture", "") if sender else ""
                    }
                }
                result.append(message)
            
            # Reverse to get chronological order (oldest first)
            return result[::-1]
            
        except Exception as e:
            print(f"Error getting conversation messages: {e}")
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
            
            return result.modified_count
            
        except Exception as e:
            print(f"Error marking messages as read: {e}")
            return 0