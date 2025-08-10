from datetime import datetime
from bson import ObjectId
from flask import current_app
import os
from werkzeug.utils import secure_filename
import uuid
import boto3
from botocore.exceptions import ClientError

def get_s3_client():
    """Get S3 client with proper configuration"""
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'ca-central-1')
    )

def get_s3_bucket_config():
    """Get appropriate S3 bucket based on environment - consistent with posts"""
    flask_env = os.getenv('FLASK_ENV', 'production')
    
    if flask_env == 'development' or flask_env == 'testing':
        return {
            'public_bucket': os.getenv('AWS_S3_PUBLIC_BUCKET_TEST', 'yapptmu-test'),
            'private_bucket': os.getenv('AWS_S3_PRIVATE_BUCKET_TEST', 'yapptmu-test-private')
        }
    else:
        return {
            'public_bucket': os.getenv('AWS_S3_PUBLIC_BUCKET', 'yapptmu'),
            'private_bucket': os.getenv('AWS_S3_PRIVATE_BUCKET', 'yapptmu-private')
        }

def generate_presigned_url(s3_key, bucket_name, expires_in_hours=2):
    """Generate a pre-signed URL for private S3 object"""
    try:
        s3_client = get_s3_client()
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': s3_key},
            ExpiresIn=expires_in_hours * 3600  # Convert hours to seconds
        )
        return presigned_url
    except ClientError as e:
        print(f"Error generating presigned URL for {s3_key}: {e}")
        return None

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
        
        # Create the join notification document
        join_notification = {
            "event_id": event_id,
            "user_id": user_id,
            "username": username,
            "content": f"{username} joined the event",
            "post_type": "join_notification",
            "s3_keys": [],  # No images for notifications
            "reply_to": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "replies_count": 0,
            "is_deleted": False
        }
        
        try:
            result = db.event_threads.insert_one(join_notification)
            join_notification["_id"] = str(result.inserted_id)
            return join_notification
        except Exception as e:
            print(f"ERROR inserting join notification: {e}")
            return None

    @staticmethod
    def create_leave_notification(event_id, user_id, username):
        """Create a leave notification post when someone leaves an event"""
        db = current_app.config["DB"]
        
        # Similar to join notification
        leave_notification = {
            "event_id": event_id,
            "user_id": user_id,
            "username": username,
            "content": f"{username} left the event",
            "post_type": "leave_notification",
            "s3_keys": [],
            "reply_to": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "replies_count": 0,
            "is_deleted": False
        }
        
        try:
            result = db.event_threads.insert_one(leave_notification)
            leave_notification["_id"] = str(result.inserted_id)
            return leave_notification
        except Exception as e:
            print(f"ERROR inserting leave notification: {e}")
            return None

    @staticmethod
    def upload_thread_image_to_s3(file, event_id, user_id):
        """Upload thread image to S3 private bucket"""
        try:
            if not file or file.filename == '':
                return None
            
            # Validate file type
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
            unique_filename = f"thread_{event_id}_{user_id}_{uuid.uuid4().hex}.{file_extension}"
            
            # Get S3 configuration from app config (consistent with posts)
            s3_config = current_app.config.get("S3_CONFIG", {})
            private_bucket = s3_config.get('private_bucket')
            
            if not private_bucket:
                raise ValueError("S3 private bucket configuration not found")
            
            # Upload to S3 PRIVATE bucket
            try:
                s3_client = get_s3_client()
                s3_key = f"event_threads/{event_id}/{unique_filename}"
                
                s3_client.upload_fileobj(
                    file,
                    private_bucket,
                    s3_key,
                    ExtraArgs={
                        # NO 'ACL': 'public-read' - this keeps it private!
                        'ContentType': file.content_type or f'image/{file_extension}',
                        'CacheControl': 'max-age=3600',  # Cache for 1 hour only
                        'Metadata': {
                            'event_id': event_id,
                            'user_id': user_id,
                            'upload_type': 'event_thread_image',
                            'upload_time': datetime.utcnow().isoformat()
                        }
                    }
                )
                
                print(f"Successfully uploaded to S3: {s3_key}")
                return s3_key  # Return S3 key instead of filename
                
            except ClientError as e:
                print(f"S3 upload error: {e}")
                raise ValueError("Failed to upload to cloud storage")
            
        except Exception as e:
            print(f"Error uploading thread image: {e}")
            raise e

    @staticmethod
    def create_thread_post(event_id, user_id, username, content, post_type='text', media_url=None, reply_to=None, image_files=None):
        """Create a new post in an event thread with S3 private images"""
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
        
        # Verify event exists and is active
        try:
            event = db.events.find_one({"_id": ObjectId(event_id), "is_active": True})
        except:
            event = db.events.find_one({"_id": event_id, "is_active": True})
        
        if not event:
            print(f"Event {event_id} not found or not active")
            raise ValueError("Event not found or is no longer active")
        
        # Handle multiple image uploads if provided
        uploaded_s3_keys = []
        
        if image_files and len(image_files) > 0:
            if len(image_files) > 4:
                raise ValueError("Maximum 4 images allowed per post")
            
            try:
                for image_file in image_files:
                    if image_file and image_file.filename:  # Skip empty files
                        s3_key = EventThread.upload_thread_image_to_s3(image_file, event_id, user_id)
                        if s3_key:
                            uploaded_s3_keys.append(s3_key)
                
                print(f"Successfully uploaded {len(uploaded_s3_keys)} images to S3: {uploaded_s3_keys}")
                
                if uploaded_s3_keys:
                    if post_type == 'text':  # Auto-detect image post type
                        post_type = 'image'
                        
            except Exception as e:
                # Clean up any uploaded S3 objects on error
                s3_config = current_app.config.get("S3_CONFIG", {})
                private_bucket = s3_config.get('private_bucket')
                
                if private_bucket:
                    s3_client = get_s3_client()
                    for s3_key in uploaded_s3_keys:
                        try:
                            s3_client.delete_object(Bucket=private_bucket, Key=s3_key)
                            print(f"Cleaned up S3 object after error: {s3_key}")
                        except Exception as cleanup_error:
                            print(f"Error cleaning up S3 object {s3_key}: {cleanup_error}")
                
                print(f"Error uploading images: {e}")
                raise ValueError(f"Failed to upload images: {str(e)}")
        
        # For image posts, content can be optional (just caption)
        if post_type == 'image' and not content:
            content = ""  # Allow empty content for image-only posts
        elif post_type != 'image' and (not content or not content.strip()):
            raise ValueError("Post content is required for non-image posts")
        
        # Create the thread post document with S3 keys
        thread_post = {
            "event_id": event_id,
            "user_id": user_id,
            "username": username,
            "content": content or "",
            "post_type": post_type,
            "s3_keys": uploaded_s3_keys,  # Store S3 keys instead of URLs
            "reply_to": reply_to,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "replies_count": 0,
            "is_deleted": False
        }
        
        try:
            result = db.event_threads.insert_one(thread_post)
            print(f"Post inserted successfully with ID: {result.inserted_id}")
                
        except Exception as e:
            print(f"ERROR inserting post: {e}")
            # If database insertion fails, clean up S3 objects
            s3_config = current_app.config.get("S3_CONFIG", {})
            private_bucket = s3_config.get('private_bucket')
            
            if private_bucket:
                s3_client = get_s3_client()
                for s3_key in uploaded_s3_keys:
                    try:
                        s3_client.delete_object(Bucket=private_bucket, Key=s3_key)
                        print(f"Cleaned up S3 object after DB error: {s3_key}")
                    except Exception as cleanup_error:
                        print(f"Error cleaning up S3 object: {cleanup_error}")
            raise e
        
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
        
        # Return the created post with its ID and secure URLs
        thread_post["_id"] = str(result.inserted_id)
        
        # Generate secure URLs for immediate frontend use
        if uploaded_s3_keys:
            s3_config = current_app.config.get("S3_CONFIG", {})
            private_bucket = s3_config.get('private_bucket')
            
            if private_bucket:
                secure_urls = []
                for s3_key in uploaded_s3_keys:
                    secure_url = generate_presigned_url(s3_key, private_bucket, expires_in_hours=2)
                    if secure_url:
                        secure_urls.append(secure_url)
                thread_post["secure_image_urls"] = secure_urls
            else:
                thread_post["secure_image_urls"] = []
        else:
            thread_post["secure_image_urls"] = []
        
        return thread_post

    @staticmethod
    def get_thread_posts_with_secure_urls(event_id, user_id, limit=50, skip=0, sort_by="created_at", sort_order=-1):
        """Get posts from an event thread with secure pre-signed URLs"""
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
            s3_config = current_app.config.get("S3_CONFIG", {})
            private_bucket = s3_config.get('private_bucket')
            
            for post in posts_cursor:
                # Convert to expected format
                formatted_post = {
                    "_id": str(post["_id"]),
                    "event_id": post["event_id"],
                    "user_id": str(post["user_id"]) if post.get("user_id") else None,
                    "username": post.get("username", "Unknown User"),
                    "content": post["content"],
                    "post_type": post.get("post_type", "text"),
                    "created_at": post["created_at"],
                    "updated_at": post.get("updated_at", post["created_at"]),
                    "likes_count": post.get("likes_count", 0),
                    "replies_count": post.get("replies_count", 0),
                    "is_liked_by_user": False,
                    "profile_picture": None,
                    "user_full_name": None,
                    "replies": [],
                    "secure_image_urls": []  # Will contain pre-signed URLs
                }
                
                # Generate secure URLs for images
                if post.get("s3_keys") and private_bucket:
                    for s3_key in post["s3_keys"]:
                        secure_url = generate_presigned_url(s3_key, private_bucket, expires_in_hours=2)
                        if secure_url:
                            formatted_post["secure_image_urls"].append(secure_url)
                
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
                    
                    # Get replies for this post (with secure URLs)
                    try:
                        replies = EventThread.get_post_replies_with_secure_urls(formatted_post["_id"], user_id, limit=10)
                        formatted_post["replies"] = replies if isinstance(replies, list) else []
                    except Exception as e:
                        print(f"Error getting replies: {e}")
                        formatted_post["replies"] = []
                
                # Get user info
                try:
                    from bson import ObjectId
                    try:
                        user_object_id = ObjectId(formatted_post["user_id"])
                        user_info = db.users.find_one({"_id": user_object_id})
                    except:
                        user_info = db.users.find_one({"_id": formatted_post["user_id"]})
                    
                    if user_info:
                        formatted_post["username"] = user_info.get("username", formatted_post["username"])
                        formatted_post["profile_picture"] = user_info.get("profile_picture")
                        formatted_post["user_full_name"] = user_info.get("full_name")
                except Exception as e:
                    print(f"Error getting user info: {e}")
                
                posts.append(formatted_post)
            
            print(f"Successfully retrieved {len(posts)} posts with secure URLs")
            return posts
            
        except Exception as e:
            print(f"Error getting thread posts: {e}")
            import traceback
            traceback.print_exc()
            return []

    @staticmethod
    def get_post_replies_with_secure_urls(post_id, user_id, limit=10, skip=0):
        """Get replies to a specific post with secure URLs"""
        db = current_app.config["DB"]
        
        try:
            replies_cursor = db.event_threads.find({
                "reply_to": post_id,
                "is_deleted": False
            }).sort("created_at", 1).skip(skip).limit(limit)
            
            replies = []
            s3_config = current_app.config.get("S3_CONFIG", {})
            private_bucket = s3_config.get('private_bucket')
            
            for reply in replies_cursor:
                # Convert ObjectId to string
                reply["_id"] = str(reply["_id"])
                reply["user_id"] = str(reply["user_id"]) if reply.get("user_id") else None
                
                # Set default values
                reply["likes_count"] = reply.get("likes_count", 0)
                reply["is_liked_by_user"] = False
                reply["profile_picture"] = None
                reply["user_full_name"] = None
                reply["secure_image_urls"] = []
                
                # Generate secure URLs for reply images
                if reply.get("s3_keys") and private_bucket:
                    for s3_key in reply["s3_keys"]:
                        secure_url = generate_presigned_url(s3_key, private_bucket, expires_in_hours=2)
                        if secure_url:
                            reply["secure_image_urls"].append(secure_url)
                
                # Check if user liked this reply
                try:
                    user_like = db.thread_likes.find_one({
                        "post_id": reply["_id"],
                        "user_id": user_id
                    })
                    reply["is_liked_by_user"] = user_like is not None
                except Exception as like_error:
                    print(f"Error checking reply like status: {like_error}")
                
                # Get user info
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
        """Delete a thread post and its S3 images"""
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
            
            # Mark as deleted in database first
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
            
            # Clean up S3 images if they exist
            if post.get("s3_keys"):
                s3_config = current_app.config.get("S3_CONFIG", {})
                private_bucket = s3_config.get('private_bucket')
                
                if private_bucket:
                    try:
                        s3_client = get_s3_client()
                        
                        for s3_key in post["s3_keys"]:
                            try:
                                s3_client.delete_object(Bucket=private_bucket, Key=s3_key)
                                print(f"Deleted S3 object: {s3_key}")
                            except Exception as e:
                                print(f"Error deleting S3 object {s3_key}: {e}")
                                # Don't fail the entire operation if S3 cleanup fails
                                
                    except Exception as e:
                        print(f"Error during S3 cleanup: {e}")
                        # Don't fail the operation since the post is already deleted from DB
            
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
                    "total_attendees": total_attendees
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