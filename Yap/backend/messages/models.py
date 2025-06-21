from datetime import datetime
from bson import ObjectId
from flask import current_app

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
            pipeline = [
                {
                    "$match": {
                        "participants": user_id
                    }
                },
                {
                    "$lookup": {
                        "from": "messages",
                        "localField": "_id",
                        "foreignField": "conversation_id",
                        "as": "messages",
                        "pipeline": [
                            {"$sort": {"created_at": -1}},
                            {"$limit": 1}
                        ]
                    }
                },
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "participants",
                        "foreignField": "_id",
                        "as": "participant_users"
                    }
                },
                {
                    "$addFields": {
                        "last_message": {"$arrayElemAt": ["$messages", 0]},
                        "other_participant": {
                            "$arrayElemAt": [
                                {
                                    "$filter": {
                                        "input": "$participant_users",
                                        "cond": {"$ne": [{"$toString": "$$this._id"}, user_id]}
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "participants": 1,
                        "created_at": 1,
                        "last_message_at": "$last_message.created_at",
                        "last_message": {
                            "_id": {"$toString": "$last_message._id"},
                            "content": "$last_message.content",
                            "sender_id": "$last_message.sender_id",
                            "created_at": "$last_message.created_at"
                        },
                        "other_participant": {
                            "_id": {"$toString": "$other_participant._id"},
                            "username": "$other_participant.username",
                            "profile_picture": "$other_participant.profile_picture"
                        }
                    }
                },
                {"$sort": {"last_message_at": -1}},
                {"$skip": skip},
                {"$limit": limit}
            ]
            
            conversations = list(db.conversations.aggregate(pipeline))
            return conversations
            
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
            
            # Prepare message response
            message_response = {
                "_id": str(result.inserted_id),
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "content": content,
                "created_at": message_doc["created_at"],
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
        """Get messages for a conversation"""
        db = current_app.config["DB"]
        
        try:
            pipeline = [
                {
                    "$match": {
                        "conversation_id": ObjectId(conversation_id)
                    }
                },
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "sender_id",
                        "foreignField": "_id",
                        "as": "sender_info"
                    }
                },
                {
                    "$addFields": {
                        "sender": {"$arrayElemAt": ["$sender_info", 0]}
                    }
                },
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "conversation_id": {"$toString": "$conversation_id"},
                        "sender_id": 1,
                        "content": 1,
                        "created_at": 1,
                        "read_by": 1,
                        "sender": {
                            "_id": {"$toString": "$sender._id"},
                            "username": "$sender.username",
                            "profile_picture": "$sender.profile_picture"
                        }
                    }
                },
                {"$sort": {"created_at": -1}},
                {"$skip": skip},
                {"$limit": limit}
            ]
            
            messages = list(db.messages.aggregate(pipeline))
            return messages[::-1]  # Reverse to get chronological order
            
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