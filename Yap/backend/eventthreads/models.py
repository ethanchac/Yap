from datetime import datetime
from bson import ObjectId
from flask import current_app
import os
from werkzeug.utils import secure_filename
import uuid

class EventThread:
    @staticmethod
    def create_join_notification(event_id, user_id, username):
        """Create a join notification post when someone joins an event"""
        db = current_app.config["DB"]
        
        print(f"Creating join notification: event_id={event_id}, user_id={user_id}, username={username}")
        
        # Verify event exists and is active
        try:
            event = db.events.find_one({"_id": ObjectId(event_id), "is_active": True})
        except:
            event = db.events.find_one({"_id": event_id, "is_active": True})
        
        if not event:
            print(f"Event {event_id} not found or not active")
            return None
        
        print(f"Event verified: {event['title']}")
        
        # Create the join notification document
        join_notification = {
            "event_id": event_id,
            "user_id": user_id,
            "username": username,
            "content": f"{username} joined the event",
            "post_type": "join_notification",  # Special type for join notifications
            "media_url": None,
            "media_urls": [],
            "reply_to": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "replies_count": 0,
            "is_deleted": False
        }
        
        print(f"Join notification document created: {join_notification}")
        
        # Insert the notification
        try:
            result = db.event_threads.insert_one(join_notification)
            print(f"Join notification inserted successfully with ID: {result.inserted_id}")
            
            # Return the created notification with its ID
            join_notification["_id"] = str(result.inserted_id)
            print(f"Returning join notification: {join_notification['_id']}")
            return join_notification
            
        except Exception as e:
            print(f"ERROR inserting join notification: {e}")
            return None

    @staticmethod
    def create_leave_notification(event_id, user_id, username):
        """Create a leave notification post when someone leaves an event"""
        db = current_app.config["DB"]
        
        print(f"Creating leave notification: event_id={event_id}, user_id={user_id}, username={username}")
        
        # Verify event exists and is active
        try:
            event = db.events.find_one({"_id": ObjectId(event_id), "is_active": True})
        except:
            event = db.events.find_one({"_id": event_id, "is_active": True})
        
        if not event:
            print(f"Event {event_id} not found or not active")
            return None
        
        print(f"Event verified: {event['title']}")
        
        # Create the leave notification document
        leave_notification = {
            "event_id": event_id,
            "user_id": user_id,
            "username": username,
            "content": f"{username} left the event",
            "post_type": "leave_notification",  # Special type for leave notifications
            "media_url": None,
            "media_urls": [],
            "reply_to": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "replies_count": 0,
            "is_deleted": False
        }
        
        print(f"Leave notification document created: {leave_notification}")
        
        # Insert the notification
        try:
            result = db.event_threads.insert_one(leave_notification)
            print(f"Leave notification inserted successfully with ID: {result.inserted_id}")
            
            # Return the created notification with its ID
            leave_notification["_id"] = str(result.inserted_id)
            print(f"Returning leave notification: {leave_notification['_id']}")
            return leave_notification
            
        except Exception as e:
            print(f"ERROR inserting leave notification: {e}")
            return None

    @staticmethod
    def upload_thread_image(file, event_id):
        """Upload and save thread image with event-specific naming"""
        try:
            if not file or file.filename == '':
                return None
            
            # Check file extension
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
            if not ('.' in file.filename and 
                    file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                raise ValueError("Invalid file type. Only PNG, JPG, JPEG, GIF, and WEBP are allowed.")
            
            # Check file size (max 10MB)
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > 10 * 1024 * 1024:  # 10MB
                raise ValueError("File too large. Maximum size is 10MB.")
            
            # Generate unique filename with event prefix
            filename = secure_filename(file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{event_id}_{uuid.uuid4().hex}.{file_extension}"
            
            # Create upload directory if it doesn't exist
            upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'thread_images')
            os.makedirs(upload_dir, exist_ok=True)
            
            # Save file
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)
            
            return unique_filename
            
        except Exception as e:
            print(f"Error uploading thread image: {e}")
            raise e

    @staticmethod
    def create_thread_post(event_id, user_id, username, content, post_type='text', media_url=None, reply_to=None, image_files=None):
        """Create a new post in an event thread - Updated to handle multiple image uploads"""
        db = current_app.config["DB"]
        
        print(f"Creating thread post: event_id={event_id}, user_id={user_id}, content='{content[:50] if content else 'No content'}...', post_type={post_type}")
        
        # Verify user is attending the event
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": user_id
        })
        
        if not attendance:
            print(f"User {user_id} is not attending event {event_id}")
            raise ValueError("You must be attending the event to post in its thread")
        
        print(f"User attendance verified")
        
        # Verify event exists and is active
        try:
            event = db.events.find_one({"_id": ObjectId(event_id), "is_active": True})
        except:
            event = db.events.find_one({"_id": event_id, "is_active": True})
        
        if not event:
            print(f"Event {event_id} not found or not active")
            raise ValueError("Event not found or is no longer active")
        
        print(f"Event verified: {event['title']}")
        
        # Handle multiple image uploads if provided
        uploaded_images = []
        media_urls = []
        
        if image_files and len(image_files) > 0:
            # Limit to 4 images maximum
            if len(image_files) > 4:
                raise ValueError("Maximum 4 images allowed per post")
            
            try:
                for image_file in image_files:
                    if image_file and image_file.filename:  # Skip empty files
                        uploaded_filename = EventThread.upload_thread_image(image_file, event_id)
                        if uploaded_filename:
                            uploaded_images.append(uploaded_filename)
                            media_urls.append(f"/eventthreads/images/{uploaded_filename}")
                
                print(f"Successfully uploaded {len(uploaded_images)} images: {uploaded_images}")
                
                if uploaded_images:
                    if post_type == 'text':  # Auto-detect image post type
                        post_type = 'image'
                    # For backward compatibility, set media_url to first image
                    if not media_url and media_urls:
                        media_url = media_urls[0]
                        
            except Exception as e:
                # Clean up any uploaded images if there's an error
                for uploaded_file in uploaded_images:
                    try:
                        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'thread_images')
                        file_path = os.path.join(upload_dir, uploaded_file)
                        if os.path.exists(file_path):
                            os.remove(file_path)
                    except Exception as cleanup_error:
                        print(f"Error cleaning up uploaded image {uploaded_file}: {cleanup_error}")
                
                print(f"Error uploading images: {e}")
                raise ValueError(f"Failed to upload images: {str(e)}")
        
        # For image posts, content can be optional (just caption)
        if post_type == 'image' and not content:
            content = ""  # Allow empty content for image-only posts
        elif post_type != 'image' and (not content or not content.strip()):
            raise ValueError("Post content is required for non-image posts")
        
        # Create the thread post document
        thread_post = {
            "event_id": event_id,
            "user_id": user_id,
            "username": username,
            "content": content or "",
            "post_type": post_type,  # 'text', 'image', 'link', 'join_notification', etc.
            "media_url": media_url,  # First image URL for backward compatibility
            "media_urls": media_urls,  # Array of all image URLs
            "reply_to": reply_to,  # For nested replies
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "replies_count": 0,
            "is_deleted": False
        }
        
        print(f"Thread post document created: {thread_post}")
        
        # Insert the post
        try:
            result = db.event_threads.insert_one(thread_post)
            print(f"Post inserted successfully with ID: {result.inserted_id}")
            
            # Verify the post was actually saved
            saved_post = db.event_threads.find_one({"_id": result.inserted_id})
            if saved_post:
                print(f"Post verification successful: {saved_post['_id']}")
            else:
                print("ERROR: Post was not found after insertion!")
                
        except Exception as e:
            print(f"ERROR inserting post: {e}")
            # If database insertion fails and we uploaded images, clean them up
            for uploaded_file in uploaded_images:
                try:
                    upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'thread_images')
                    file_path = os.path.join(upload_dir, uploaded_file)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        print(f"Cleaned up uploaded image after DB error: {uploaded_file}")
                except Exception as cleanup_error:
                    print(f"Error cleaning up uploaded image: {cleanup_error}")
            raise e
        
        # If this is a reply, increment the parent post's reply count
        if reply_to:
            try:
                db.event_threads.update_one(
                    {"_id": ObjectId(reply_to)},
                    {"$inc": {"replies_count": 1}}
                )
                print(f"Updated reply count for parent post {reply_to}")
            except:
                db.event_threads.update_one(
                    {"_id": reply_to},
                    {"$inc": {"replies_count": 1}}
                )
                print(f"Updated reply count for parent post {reply_to} (string ID)")
        
        # Return the created post with its ID
        thread_post["_id"] = str(result.inserted_id)
        print(f"Returning thread post: {thread_post['_id']}")
        return thread_post
    
    @staticmethod
    def get_thread_posts(event_id, user_id, limit=50, skip=0, sort_by="created_at", sort_order=-1):
        """Get posts from an event thread (only for attendees) - FIXED VERSION"""
        db = current_app.config["DB"]
        
        print(f"Getting thread posts: event_id={event_id}, user_id={user_id}")
        
        # Verify user is attending the event
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": user_id
        })
        
        if not attendance:
            print(f"User {user_id} is not attending event {event_id}")
            return {"error": "You must be attending the event to view its thread"}
        
        try:
            # Get all posts including join notifications
            posts_cursor = db.event_threads.find({
                "event_id": event_id,
                "is_deleted": False,
                "reply_to": None  # Only top-level posts
            }).sort(sort_by, sort_order).skip(skip).limit(limit)
            
            posts = []
            for post in posts_cursor:
                # Convert to expected format
                formatted_post = {
                    "_id": str(post["_id"]),
                    "event_id": post["event_id"],
                    "user_id": str(post["user_id"]) if post.get("user_id") else None,
                    "username": post.get("username", "Unknown User"),
                    "content": post["content"],
                    "post_type": post.get("post_type", "text"),
                    "media_url": post.get("media_url"),
                    "media_urls": post.get("media_urls", []),  # Include multiple images
                    "created_at": post["created_at"],
                    "updated_at": post.get("updated_at", post["created_at"]),
                    "likes_count": post.get("likes_count", 0),
                    "replies_count": post.get("replies_count", 0),
                    "is_liked_by_user": False,
                    "profile_picture": None,
                    "user_full_name": None,
                    "replies": []
                }
                
                # For join notifications, don't check likes or allow replies
                if post.get("post_type") not in ["join_notification", "leave_notification"]:
                    # Check if user liked this post
                    try:
                        user_like = db.thread_likes.find_one({
                            "post_id": formatted_post["_id"],
                            "user_id": user_id
                        })
                        formatted_post["is_liked_by_user"] = user_like is not None
                    except Exception as e:
                        print(f"Error checking like status: {e}")
                    
                    # Get replies for this post
                    try:
                        replies = EventThread.get_post_replies(formatted_post["_id"], user_id, limit=10)
                        formatted_post["replies"] = replies if isinstance(replies, list) else []
                    except Exception as e:
                        print(f"Error getting replies: {e}")
                        formatted_post["replies"] = []
                
                # Get user info - try both ObjectId and string
                try:
                    from bson import ObjectId
                    # Try with ObjectId first
                    try:
                        user_object_id = ObjectId(formatted_post["user_id"])
                        user_info = db.users.find_one({"_id": user_object_id})
                    except:
                        # If ObjectId fails, try with string
                        user_info = db.users.find_one({"_id": formatted_post["user_id"]})
                    
                    if user_info:
                        formatted_post["username"] = user_info.get("username", formatted_post["username"])
                        formatted_post["profile_picture"] = user_info.get("profile_picture")
                        formatted_post["user_full_name"] = user_info.get("full_name")
                except Exception as e:
                    print(f"Error getting user info: {e}")
                
                posts.append(formatted_post)
            
            print(f"Successfully retrieved {len(posts)} posts")
            return posts
            
        except Exception as e:
            print(f"Error getting thread posts: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    def get_post_replies(post_id, user_id, limit=10, skip=0):
        """Get replies to a specific post"""
        db = current_app.config["DB"]
        
        try:
            # Use simple find instead of complex aggregation
            replies_cursor = db.event_threads.find({
                "reply_to": post_id,
                "is_deleted": False
            }).sort("created_at", 1).skip(skip).limit(limit)
            
            replies = []
            for reply in replies_cursor:
                # Convert ObjectId to string
                reply["_id"] = str(reply["_id"])
                reply["user_id"] = str(reply["user_id"]) if reply.get("user_id") else None
                
                # Set default values
                reply["likes_count"] = reply.get("likes_count", 0)
                reply["is_liked_by_user"] = False
                reply["profile_picture"] = None
                reply["user_full_name"] = None
                reply["media_urls"] = reply.get("media_urls", [])  # Include multiple images for replies too
                
                # Check if user liked this reply
                try:
                    user_like = db.thread_likes.find_one({
                        "post_id": reply["_id"],
                        "user_id": user_id
                    })
                    reply["is_liked_by_user"] = user_like is not None
                except Exception as like_error:
                    print(f"Error checking reply like status: {like_error}")
                
                # Try to get user info
                try:
                    if reply["user_id"]:
                        from bson import ObjectId
                        user_info = db.users.find_one({"_id": ObjectId(reply["user_id"])})
                        if user_info:
                            reply["profile_picture"] = user_info.get("profile_picture")
                            reply["user_full_name"] = user_info.get("full_name")
                            reply["username"] = user_info.get("username", reply.get("username"))
                except Exception as user_error:
                    print(f"Error getting reply user info: {user_error}")
                
                replies.append(reply)
            
            return replies
            
        except Exception as e:
            print(f"Error getting post replies: {e}")
            return []
    
    @staticmethod
    def like_thread_post(post_id, user_id):
        """Like or unlike a thread post"""
        db = current_app.config["DB"]
        
        try:
            # Check if this is a join notification (can't be liked)
            try:
                post = db.event_threads.find_one({"_id": ObjectId(post_id)})
            except:
                post = db.event_threads.find_one({"_id": post_id})
            
            if not post:
                return {"error": "Post not found"}
            
            if post.get("post_type") in ["join_notification", "leave_notification"]:
                return {"error": "Cannot like notifications"}
            
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
        """Delete a thread post (only by the author) - Updated to handle multiple image cleanup"""
        db = current_app.config["DB"]
        
        try:
            # Get the post
            try:
                post = db.event_threads.find_one({"_id": ObjectId(post_id)})
            except:
                post = db.event_threads.find_one({"_id": post_id})
            
            if not post:
                return {"error": "Post not found"}
            
            # Don't allow deletion of join notifications
            if post.get("post_type") in ["join_notification", "leave_notification"]:
                return {"error": "Cannot delete notifications"}
            
            # Check if user is the author
            if post["user_id"] != user_id:
                return {"error": "You can only delete your own posts"}
            
            # Clean up image files if they exist
            if post.get("post_type") == "image":
                # Clean up multiple images
                media_urls = post.get("media_urls", [])
                if media_urls:
                    for media_url in media_urls:
                        try:
                            if media_url.startswith("/eventthreads/images/"):
                                filename = media_url.split("/")[-1]
                                upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'thread_images')
                                file_path = os.path.join(upload_dir, filename)
                                if os.path.exists(file_path):
                                    os.remove(file_path)
                                    print(f"Deleted image file: {filename}")
                        except Exception as e:
                            print(f"Error deleting image file: {e}")
                
                # Also clean up single image for backward compatibility
                if post.get("media_url"):
                    try:
                        if post["media_url"].startswith("/eventthreads/images/"):
                            filename = post["media_url"].split("/")[-1]
                            upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'thread_images')
                            file_path = os.path.join(upload_dir, filename)
                            if os.path.exists(file_path):
                                os.remove(file_path)
                                print(f"Deleted image file: {filename}")
                    except Exception as e:
                        print(f"Error deleting image file: {e}")
            
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
            
            # Don't allow editing of notifications
            if post.get("post_type") in ["join_notification", "leave_notification"]:
                return {"error": "Cannot edit notifications"}
            
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