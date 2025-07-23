from datetime import datetime
from bson import ObjectId
from flask import current_app

class EventThread:
    @staticmethod
    def create_thread_post(event_id, user_id, username, content, post_type='text', media_url=None, reply_to=None):
        """Create a new post in an event thread"""
        db = current_app.config["DB"]
        
        # Verify user is attending the event
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": user_id
        })
        
        if not attendance:
            raise ValueError("You must be attending the event to post in its thread")
        
        # Verify event exists and is active
        try:
            event = db.events.find_one({"_id": ObjectId(event_id), "is_active": True})
        except:
            event = db.events.find_one({"_id": event_id, "is_active": True})
        
        if not event:
            raise ValueError("Event not found or is no longer active")
        
        # Create the thread post document
        thread_post = {
            "event_id": event_id,
            "user_id": user_id,
            "username": username,
            "content": content,
            "post_type": post_type,  # 'text', 'image', 'link', etc.
            "media_url": media_url,
            "reply_to": reply_to,  # For nested replies
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "replies_count": 0,
            "is_deleted": False
        }
        
        # Insert the post
        result = db.event_threads.insert_one(thread_post)
        
        # If this is a reply, increment the parent post's reply count
        if reply_to:
            try:
                db.event_threads.update_one(
                    {"_id": ObjectId(reply_to)},
                    {"$inc": {"replies_count": 1}}
                )
            except:
                db.event_threads.update_one(
                    {"_id": reply_to},
                    {"$inc": {"replies_count": 1}}
                )
        
        # Return the created post with its ID
        thread_post["_id"] = str(result.inserted_id)
        return thread_post
    
    @staticmethod
    def get_thread_posts(event_id, user_id, limit=50, skip=0, sort_by="created_at", sort_order=-1):
        """Get posts from an event thread (only for attendees)"""
        db = current_app.config["DB"]
        
        # Verify user is attending the event
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": user_id
        })
        
        if not attendance:
            return {"error": "You must be attending the event to view its thread"}
        
        try:
            # Create aggregation pipeline to get posts with user info and like status
            pipeline = [
                {
                    "$match": {
                        "event_id": event_id,
                        "is_deleted": False,
                        "reply_to": None  # Only get top-level posts, not replies
                    }
                },
                {
                    "$addFields": {
                        "user_object_id": {
                            "$cond": {
                                "if": {"$type": ["$user_id", "objectId"]},
                                "then": "$user_id",
                                "else": {"$toObjectId": "$user_id"}
                            }
                        }
                    }
                },
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "user_object_id",
                        "foreignField": "_id",
                        "as": "user_info"
                    }
                },
                {
                    "$lookup": {
                        "from": "thread_likes",
                        "let": {"post_id": {"$toString": "$_id"}},
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$and": [
                                            {"$eq": ["$post_id", "$$post_id"]},
                                            {"$eq": ["$user_id", user_id]}
                                        ]
                                    }
                                }
                            }
                        ],
                        "as": "user_like"
                    }
                },
                {
                    "$addFields": {
                        "user_info": {"$arrayElemAt": ["$user_info", 0]},
                        "is_liked_by_user": {"$gt": [{"$size": "$user_like"}, 0]}
                    }
                },
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "event_id": 1,
                        "user_id": {"$toString": "$user_id"},
                        "username": {"$ifNull": ["$user_info.username", "$username"]},
                        "content": 1,
                        "post_type": 1,
                        "media_url": 1,
                        "created_at": 1,
                        "updated_at": 1,
                        "likes_count": {"$ifNull": ["$likes_count", 0]},
                        "replies_count": {"$ifNull": ["$replies_count", 0]},
                        "is_liked_by_user": 1,
                        "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]},
                        "user_full_name": {"$ifNull": ["$user_info.full_name", None]}
                    }
                },
                {"$sort": {sort_by: sort_order}},
                {"$skip": skip},
                {"$limit": limit}
            ]
            
            posts = list(db.event_threads.aggregate(pipeline))
            
            # Get replies for each post
            for post in posts:
                replies = EventThread.get_post_replies(post["_id"], user_id, limit=10)
                post["replies"] = replies
            
            return posts
            
        except Exception as e:
            print(f"Error getting thread posts: {e}")
            return []
    
    @staticmethod
    def get_post_replies(post_id, user_id, limit=10, skip=0):
        """Get replies to a specific post"""
        db = current_app.config["DB"]
        
        try:
            pipeline = [
                {
                    "$match": {
                        "reply_to": post_id,
                        "is_deleted": False
                    }
                },
                {
                    "$addFields": {
                        "user_object_id": {
                            "$cond": {
                                "if": {"$type": ["$user_id", "objectId"]},
                                "then": "$user_id",
                                "else": {"$toObjectId": "$user_id"}
                            }
                        }
                    }
                },
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "user_object_id",
                        "foreignField": "_id",
                        "as": "user_info"
                    }
                },
                {
                    "$lookup": {
                        "from": "thread_likes",
                        "let": {"post_id": {"$toString": "$_id"}},
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$and": [
                                            {"$eq": ["$post_id", "$$post_id"]},
                                            {"$eq": ["$user_id", user_id]}
                                        ]
                                    }
                                }
                            }
                        ],
                        "as": "user_like"
                    }
                },
                {
                    "$addFields": {
                        "user_info": {"$arrayElemAt": ["$user_info", 0]},
                        "is_liked_by_user": {"$gt": [{"$size": "$user_like"}, 0]}
                    }
                },
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "event_id": 1,
                        "user_id": {"$toString": "$user_id"},
                        "username": {"$ifNull": ["$user_info.username", "$username"]},
                        "content": 1,
                        "post_type": 1,
                        "media_url": 1,
                        "reply_to": 1,
                        "created_at": 1,
                        "updated_at": 1,
                        "likes_count": {"$ifNull": ["$likes_count", 0]},
                        "is_liked_by_user": 1,
                        "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]},
                        "user_full_name": {"$ifNull": ["$user_info.full_name", None]}
                    }
                },
                {"$sort": {"created_at": 1}},  # Replies in chronological order
                {"$skip": skip},
                {"$limit": limit}
            ]
            
            replies = list(db.event_threads.aggregate(pipeline))
            return replies
            
        except Exception as e:
            print(f"Error getting post replies: {e}")
            return []
    
    @staticmethod
    def like_thread_post(post_id, user_id):
        """Like or unlike a thread post"""
        db = current_app.config["DB"]
        
        try:
            # Check if user already liked this post
            existing_like = db.thread_likes.find_one({
                "post_id": post_id,
                "user_id": user_id
            })
            
            if existing_like:
                # Unlike - remove like and decrement count
                db.thread_likes.delete_one({"_id": existing_like["_id"]})
                
                # Update post like count
                try:
                    db.event_threads.update_one(
                        {"_id": ObjectId(post_id)},
                        {"$inc": {"likes_count": -1}}
                    )
                except:
                    db.event_threads.update_one(
                        {"_id": post_id},
                        {"$inc": {"likes_count": -1}}
                    )
                
                return {"liked": False, "message": "Post unliked"}
            else:
                # Like - add like and increment count
                like_doc = {
                    "post_id": post_id,
                    "user_id": user_id,
                    "created_at": datetime.utcnow()
                }
                db.thread_likes.insert_one(like_doc)
                
                # Update post like count
                try:
                    db.event_threads.update_one(
                        {"_id": ObjectId(post_id)},
                        {"$inc": {"likes_count": 1}}
                    )
                except:
                    db.event_threads.update_one(
                        {"_id": post_id},
                        {"$inc": {"likes_count": 1}}
                    )
                
                return {"liked": True, "message": "Post liked"}
                
        except Exception as e:
            print(f"Error in like_thread_post: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def delete_thread_post(post_id, user_id):
        """Delete a thread post (only by the author)"""
        db = current_app.config["DB"]
        
        try:
            # Get the post
            try:
                post = db.event_threads.find_one({"_id": ObjectId(post_id)})
            except:
                post = db.event_threads.find_one({"_id": post_id})
            
            if not post:
                return {"error": "Post not found"}
            
            # Check if user is the author
            if post["user_id"] != user_id:
                return {"error": "You can only delete your own posts"}
            
            # Mark as deleted instead of actually deleting
            try:
                db.event_threads.update_one(
                    {"_id": ObjectId(post_id)},
                    {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
                )
            except:
                db.event_threads.update_one(
                    {"_id": post_id},
                    {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
                )
            
            # If this post has a parent, decrement its reply count
            if post.get("reply_to"):
                try:
                    db.event_threads.update_one(
                        {"_id": ObjectId(post["reply_to"])},
                        {"$inc": {"replies_count": -1}}
                    )
                except:
                    db.event_threads.update_one(
                        {"_id": post["reply_to"]},
                        {"$inc": {"replies_count": -1}}
                    )
            
            return {"message": "Post deleted successfully"}
            
        except Exception as e:
            print(f"Error deleting thread post: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def get_thread_info(event_id, user_id):
        """Get basic info about the event thread"""
        db = current_app.config["DB"]
        
        # Verify user is attending the event
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": user_id
        })
        
        if not attendance:
            return {"error": "You must be attending the event to view its thread"}
        
        try:
            # Get event info
            try:
                event = db.events.find_one({"_id": ObjectId(event_id)})
            except:
                event = db.events.find_one({"_id": event_id})
            
            if not event:
                return {"error": "Event not found"}
            
            # Get thread stats
            total_posts = db.event_threads.count_documents({
                "event_id": event_id,
                "is_deleted": False
            })
            
            # Get total attendees
            total_attendees = db.attendances.count_documents({"event_id": event_id})
            
            # Get recent active users in thread
            recent_posters_pipeline = [
                {
                    "$match": {
                        "event_id": event_id,
                        "is_deleted": False,
                        "created_at": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}
                    }
                },
                {"$group": {"_id": "$user_id"}},
                {"$count": "active_users"}
            ]
            
            active_users_result = list(db.event_threads.aggregate(recent_posters_pipeline))
            active_users = active_users_result[0]["active_users"] if active_users_result else 0
            
            return {
                "event": {
                    "_id": str(event["_id"]),
                    "title": event["title"],
                    "description": event["description"],
                    "event_datetime": event["event_datetime"],
                    "location": event.get("location"),
                    "host_username": event["username"]
                },
                "thread_stats": {
                    "total_posts": total_posts,
                    "total_attendees": total_attendees,
                    "active_users_today": active_users
                }
            }
            
        except Exception as e:
            print(f"Error getting thread info: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def update_thread_post(post_id, user_id, content):
        """Update a thread post (only by the author)"""
        db = current_app.config["DB"]
        
        try:
            # Get the post
            try:
                post = db.event_threads.find_one({"_id": ObjectId(post_id)})
            except:
                post = db.event_threads.find_one({"_id": post_id})
            
            if not post:
                return {"error": "Post not found"}
            
            # Check if user is the author
            if post["user_id"] != user_id:
                return {"error": "You can only edit your own posts"}
            
            # Check if post is deleted
            if post.get("is_deleted", False):
                return {"error": "Cannot edit deleted posts"}
            
            # Update the post
            try:
                db.event_threads.update_one(
                    {"_id": ObjectId(post_id)},
                    {
                        "$set": {
                            "content": content,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            except:
                db.event_threads.update_one(
                    {"_id": post_id},
                    {
                        "$set": {
                            "content": content,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            
            return {"message": "Post updated successfully"}
            
        except Exception as e:
            print(f"Error updating thread post: {e}")
            return {"error": str(e)}