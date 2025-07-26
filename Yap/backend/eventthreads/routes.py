from flask import Blueprint, request, jsonify, current_app, send_from_directory
from eventthreads.models import EventThread
from auth.service import token_required
from datetime import datetime
import os
from werkzeug.utils import secure_filename
import uuid

eventthreads_bp = Blueprint('eventthreads', __name__)

# Image upload configuration for event threads
THREAD_ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
THREAD_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def thread_allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in THREAD_ALLOWED_EXTENSIONS

# Route to serve uploaded thread images (without authentication for image loading)
@eventthreads_bp.route('/images/<filename>')
def uploaded_file(filename):
    """Serve uploaded thread images with filename-based access control"""
    try:
        # Basic validation - ensure filename has the expected format
        if '_' not in filename or not filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            return jsonify({"error": "Invalid filename format"}), 400
        
        # Extract event_id from filename (format: eventid_uniqueid.ext)
        event_id = filename.split('_')[0]
        
        # Verify the image exists in a post for this event (additional security)
        db = current_app.config["DB"]
        image_post = db.event_threads.find_one({
            "event_id": event_id,
            "$or": [
                {"media_url": {"$regex": filename}},
                {"media_urls": {"$regex": filename}}
            ],
            "is_deleted": False
        })
        
        if not image_post:
            return jsonify({"error": "Image not found or has been deleted"}), 404
        
        # Serve the file
        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'thread_images')
        file_path = os.path.join(upload_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "Image file not found on server"}), 404
            
        return send_from_directory(upload_dir, filename)
        
    except Exception as e:
        print(f"Error serving image {filename}: {e}")
        return jsonify({"error": "Failed to load image"}), 500

@eventthreads_bp.route('/<event_id>/upload-image', methods=['POST'])
@token_required
def upload_thread_image(current_user, event_id):
    """Upload an image for event thread posts"""
    try:
        # Verify user is attending the event first
        db = current_app.config["DB"]
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": current_user['_id']
        })
        
        if not attendance:
            return jsonify({"error": "You must be attending this event to upload images"}), 403
        
        # Check if the post request has the file part
        if 'image' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['image']
        
        # If user does not select file, browser also submits an empty part without filename
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset file position
        
        if file_size > THREAD_MAX_FILE_SIZE:
            return jsonify({"error": "File too large. Maximum size is 10MB"}), 400
        
        if file and thread_allowed_file(file.filename):
            # Generate unique filename
            filename = secure_filename(file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{event_id}_{uuid.uuid4().hex}.{file_extension}"
            
            # Create upload directory if it doesn't exist
            upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'thread_images')
            os.makedirs(upload_folder, exist_ok=True)
            
            # Save the file
            file_path = os.path.join(upload_folder, unique_filename)
            file.save(file_path)
            
            # Return the URL for accessing the image (through our protected route)
            image_url = f"/eventthreads/images/{unique_filename}"
            
            return jsonify({
                "message": "Image uploaded successfully",
                "imageUrl": image_url,
                "filename": unique_filename
            }), 200
        else:
            return jsonify({"error": "Invalid file type. Allowed types: PNG, JPG, JPEG, GIF, WEBP"}), 400
            
    except Exception as e:
        print(f"Error uploading thread image: {e}")
        return jsonify({"error": "Failed to upload image"}), 500

@eventthreads_bp.route('/<event_id>/info', methods=['GET'])
@token_required
def get_thread_info(current_user, event_id):
    """Get basic information about an event thread"""
    try:
        result = EventThread.get_thread_info(event_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 403
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error getting thread info: {e}")
        return jsonify({"error": "Failed to get thread information"}), 500

@eventthreads_bp.route('/<event_id>/posts', methods=['GET'])
@token_required
def get_thread_posts(current_user, event_id):
    """Get posts from an event thread"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = int(request.args.get('sort_order', -1))  # -1 for desc, 1 for asc
        skip = (page - 1) * limit
        
        posts = EventThread.get_thread_posts(
            event_id=event_id,
            user_id=current_user['_id'],
            limit=limit,
            skip=skip,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if isinstance(posts, dict) and "error" in posts:
            return jsonify(posts), 403
        
        return jsonify({
            "posts": posts,
            "page": page,
            "limit": limit,
            "sort_by": sort_by,
            "sort_order": sort_order
        }), 200
        
    except Exception as e:
        print(f"Error getting thread posts: {e}")
        return jsonify({"error": "Failed to get thread posts"}), 500

@eventthreads_bp.route('/<event_id>/posts', methods=['POST'])
@token_required
def create_thread_post(current_user, event_id):
    """Create a new post in an event thread - Updated to handle multiple image uploads"""
    try:
        # Handle both form data (with files) and JSON data
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Form data with potential file upload
            content = request.form.get('content', '').strip()
            post_type = request.form.get('post_type', 'text')
            reply_to = request.form.get('reply_to')
            
            # Get multiple image files - support multiple files with same name or different names
            image_files = []
            
            # Method 1: Multiple files with same input name (image[])
            if 'image' in request.files:
                files = request.files.getlist('image')
                for file in files:
                    if file and file.filename:
                        image_files.append(file)
            
            # Method 2: Multiple files with different input names (image0, image1, etc.)
            for key in request.files:
                if key.startswith('image') and key != 'image':
                    file = request.files[key]
                    if file and file.filename:
                        image_files.append(file)
            
        else:
            # JSON data (backwards compatibility)
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            content = data.get('content', '').strip()
            post_type = data.get('post_type', 'text')
            reply_to = data.get('reply_to')
            image_files = []
        
        # Validate content for non-image posts
        if post_type != 'image' and not content and not image_files:
            return jsonify({"error": "Post content or image is required"}), 400
        
        # Validate content length
        if content and len(content) > 2000:
            return jsonify({"error": "Post content too long (max 2000 characters)"}), 400
        
        # Validate post type - don't allow manual creation of notification posts
        valid_post_types = ['text', 'image', 'link', 'announcement']
        if post_type not in valid_post_types:
            return jsonify({"error": f"Invalid post type. Must be one of: {valid_post_types}"}), 400
        
        # Validate number of images
        if len(image_files) > 4:
            return jsonify({"error": "Maximum 4 images allowed per post"}), 400
        
        # If it's a reply, validate the parent post exists
        if reply_to:
            db = current_app.config["DB"]
            try:
                from bson import ObjectId
                parent_post = db.event_threads.find_one({"_id": ObjectId(reply_to)})
            except:
                parent_post = db.event_threads.find_one({"_id": reply_to})
            
            if not parent_post:
                return jsonify({"error": "Parent post not found"}), 404
            
            if parent_post["event_id"] != event_id:
                return jsonify({"error": "Parent post is not from this event thread"}), 400
        
        # Validate image files if provided
        if image_files:
            for i, image_file in enumerate(image_files):
                # Check file size before processing
                image_file.seek(0, os.SEEK_END)
                file_size = image_file.tell()
                image_file.seek(0)
                
                if file_size > THREAD_MAX_FILE_SIZE:
                    return jsonify({"error": f"Image {i+1} is too large. Maximum size is 10MB per image."}), 400
                
                # Check file extension
                if not thread_allowed_file(image_file.filename):
                    return jsonify({"error": f"Invalid image type for image {i+1}. Only PNG, JPG, JPEG, GIF, and WEBP are allowed."}), 400
            
            # Set post type to image if files are provided
            post_type = 'image'
        
        # Create the post
        post = EventThread.create_thread_post(
            event_id=event_id,
            user_id=current_user['_id'],
            username=current_user['username'],
            content=content,
            post_type=post_type,
            media_url=None,  # Will be set by the model if images are uploaded
            reply_to=reply_to,
            image_files=image_files if image_files else None
        )
        
        return jsonify({
            "success": True,
            "message": "Post created successfully",
            "post": post
        }), 201
        
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 403
    except Exception as e:
        print(f"Error creating thread post: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to create post"}), 500

@eventthreads_bp.route('/<event_id>/join-notification', methods=['POST'])
@token_required
def create_join_notification_manually(current_user, event_id):
    """Manually create a join notification (for testing or admin purposes)"""
    try:
        data = request.get_json() or {}
        
        # Allow override of user for admin purposes, otherwise use current user
        target_user_id = data.get('user_id', current_user['_id'])
        target_username = data.get('username', current_user['username'])
        
        # Verify the target user is actually attending
        db = current_app.config["DB"]
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": target_user_id
        })
        
        if not attendance:
            return jsonify({"error": "User must be attending the event"}), 400
        
        # Create the join notification
        notification = EventThread.create_join_notification(
            event_id=event_id,
            user_id=target_user_id,
            username=target_username
        )
        
        if notification:
            return jsonify({
                "success": True,
                "message": "Join notification created",
                "notification": notification
            }), 201
        else:
            return jsonify({"error": "Failed to create join notification"}), 500
            
    except Exception as e:
        print(f"Error creating join notification: {e}")
        return jsonify({"error": "Failed to create join notification"}), 500

@eventthreads_bp.route('/posts/<post_id>/like', methods=['POST'])
@token_required
def like_thread_post(current_user, post_id):
    """Like or unlike a thread post"""
    try:
        result = EventThread.like_thread_post(post_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400 if "Cannot like" in result["error"] else 500
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error liking thread post: {e}")
        return jsonify({"error": "Failed to like post"}), 500

@eventthreads_bp.route('/posts/<post_id>/replies', methods=['GET'])
@token_required
def get_post_replies(current_user, post_id):
    """Get replies to a specific thread post"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        skip = (page - 1) * limit
        
        replies = EventThread.get_post_replies(
            post_id=post_id,
            user_id=current_user['_id'],
            limit=limit,
            skip=skip
        )
        
        return jsonify({
            "replies": replies,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        print(f"Error getting post replies: {e}")
        return jsonify({"error": "Failed to get post replies"}), 500

@eventthreads_bp.route('/posts/<post_id>', methods=['PUT'])
@token_required
def update_thread_post(current_user, post_id):
    """Update a thread post (only by the author)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        if not data.get('content') or not data['content'].strip():
            return jsonify({"error": "Post content is required"}), 400
        
        content = data['content'].strip()
        if len(content) > 2000:
            return jsonify({"error": "Post content too long (max 2000 characters)"}), 400
        
        result = EventThread.update_thread_post(post_id, current_user['_id'], content)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error updating thread post: {e}")
        return jsonify({"error": "Failed to update post"}), 500

@eventthreads_bp.route('/posts/<post_id>', methods=['DELETE'])
@token_required
def delete_thread_post(current_user, post_id):
    """Delete a thread post (only by the author)"""
    try:
        result = EventThread.delete_thread_post(post_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error deleting thread post: {e}")
        return jsonify({"error": "Failed to delete post"}), 500

@eventthreads_bp.route('/<event_id>/attendees', methods=['GET'])
@token_required
def get_thread_attendees(current_user, event_id):
    """Get list of attendees who can participate in the thread"""
    try:
        # Verify user is attending the event
        db = current_app.config["DB"]
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": current_user['_id']
        })
        
        if not attendance:
            return jsonify({"error": "You must be attending the event to view thread participants"}), 403
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        skip = (page - 1) * limit
        
        # Get all attendees with their user info
        pipeline = [
            {"$match": {"event_id": event_id}},
            {
                "$lookup": {
                    "from": "users",
                    "let": {"user_id": {"$toObjectId": "$user_id"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$user_id"]}}}
                    ],
                    "as": "user_info"
                }
            },
            {"$unwind": "$user_info"},
            {
                "$project": {
                    "_id": "$user_info._id",
                    "username": "$user_info.username",
                    "full_name": "$user_info.full_name",
                    "profile_picture": "$user_info.profile_picture",
                    "joined_at": "$created_at"
                }
            },
            {"$sort": {"joined_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        attendees = list(db.attendances.aggregate(pipeline))
        
        # Convert ObjectIds to strings
        for attendee in attendees:
            attendee["_id"] = str(attendee["_id"])
        
        # Get total count
        total_attendees = db.attendances.count_documents({"event_id": event_id})
        
        return jsonify({
            "attendees": attendees,
            "page": page,
            "limit": limit,
            "total_attendees": total_attendees
        }), 200
        
    except Exception as e:
        print(f"Error getting thread attendees: {e}")
        return jsonify({"error": "Failed to get thread attendees"}), 500

@eventthreads_bp.route('/<event_id>/debug', methods=['GET'])
@token_required
def debug_thread(current_user, event_id):
    """Debug route to check thread posts in database"""
    try:
        db = current_app.config["DB"]
        
        # Check attendance
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": current_user['_id']
        })
        
        if not attendance:
            return jsonify({"error": "You must be attending this event to debug its thread"}), 403
        
        # Get all posts for this event (including deleted)
        all_posts = list(db.event_threads.find({"event_id": event_id}))
        
        # Convert ObjectIds to strings for JSON serialization
        for post in all_posts:
            post["_id"] = str(post["_id"])
            if "user_id" in post:
                post["user_id"] = str(post["user_id"])
        
        # Get collection stats
        total_posts = db.event_threads.count_documents({"event_id": event_id})
        active_posts = db.event_threads.count_documents({"event_id": event_id, "is_deleted": False})
        deleted_posts = db.event_threads.count_documents({"event_id": event_id, "is_deleted": True})
        join_notifications = db.event_threads.count_documents({"event_id": event_id, "post_type": "join_notification"})
        
        # Get collections list
        collections = db.list_collection_names()
        
        return jsonify({
            "event_id": event_id,
            "user_id": current_user['_id'],
            "attendance_found": attendance is not None,
            "collections": collections,
            "stats": {
                "total_posts": total_posts,
                "active_posts": active_posts,
                "deleted_posts": deleted_posts,
                "join_notifications": join_notifications
            },
            "all_posts": all_posts[:10],  # Limit to first 10 posts
            "event_threads_collection_exists": "event_threads" in collections
        }), 200
        
    except Exception as e:
        print(f"Error in debug route: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@eventthreads_bp.route('/<event_id>/stats', methods=['GET'])
@token_required
def get_thread_stats(current_user, event_id):
    """Get statistics about the event thread"""
    try:
        # Verify user is attending the event
        db = current_app.config["DB"]
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": current_user['_id']
        })
        
        if not attendance:
            return jsonify({"error": "You must be attending the event to view thread stats"}), 403
        
        # Get various statistics
        total_posts = db.event_threads.count_documents({
            "event_id": event_id,
            "is_deleted": False,
            "post_type": {"$ne": "join_notification"}  # Exclude join notifications from regular post count
        })
        
        total_replies = db.event_threads.count_documents({
            "event_id": event_id,
            "is_deleted": False,
            "reply_to": {"$ne": None}
        })
        
        join_notifications = db.event_threads.count_documents({
            "event_id": event_id,
            "post_type": "join_notification"
        })
        
        # Get most active users
        active_users_pipeline = [
            {
                "$match": {
                    "event_id": event_id,
                    "is_deleted": False,
                    "post_type": {"$ne": "join_notification"}  # Exclude join notifications
                }
            },
            {
                "$group": {
                    "_id": "$user_id",
                    "post_count": {"$sum": 1},
                    "username": {"$first": "$username"}
                }
            },
            {"$sort": {"post_count": -1}},
            {"$limit": 5}
        ]
        
        active_users = list(db.event_threads.aggregate(active_users_pipeline))
        
        # Get posts in last 24 hours
        from datetime import timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_posts = db.event_threads.count_documents({
            "event_id": event_id,
            "is_deleted": False,
            "created_at": {"$gte": yesterday},
            "post_type": {"$ne": "join_notification"}
        })
        
        return jsonify({
            "total_posts": total_posts,
            "total_replies": total_replies,
            "join_notifications": join_notifications,
            "posts_last_24h": recent_posts,
            "most_active_users": active_users
        }), 200
        
    except Exception as e:
        print(f"Error getting thread stats: {e}")
        return jsonify({"error": "Failed to get thread statistics"}), 500