from flask import Blueprint, request, jsonify, current_app
from eventthreads.models import EventThread
from auth.service import token_required
from datetime import datetime

eventthreads_bp = Blueprint('eventthreads', __name__)

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
    """Create a new post in an event thread"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        if not data.get('content') or not data['content'].strip():
            return jsonify({"error": "Post content is required"}), 400
        
        # Validate content length
        content = data['content'].strip()
        if len(content) > 2000:
            return jsonify({"error": "Post content too long (max 2000 characters)"}), 400
        
        # Optional fields
        post_type = data.get('post_type', 'text')
        media_url = data.get('media_url')
        reply_to = data.get('reply_to')  # For replies to other posts
        
        # Validate post type
        valid_post_types = ['text', 'image', 'link', 'announcement']
        if post_type not in valid_post_types:
            return jsonify({"error": f"Invalid post type. Must be one of: {valid_post_types}"}), 400
        
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
        
        # Create the post
        post = EventThread.create_thread_post(
            event_id=event_id,
            user_id=current_user['_id'],
            username=current_user['username'],
            content=content,
            post_type=post_type,
            media_url=media_url,
            reply_to=reply_to
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

@eventthreads_bp.route('/posts/<post_id>/like', methods=['POST'])
@token_required
def like_thread_post(current_user, post_id):
    """Like or unlike a thread post"""
    try:
        result = EventThread.like_thread_post(post_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 500
        
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
            "is_deleted": False
        })
        
        total_replies = db.event_threads.count_documents({
            "event_id": event_id,
            "is_deleted": False,
            "reply_to": {"$ne": None}
        })
        
        # Get most active users
        active_users_pipeline = [
            {
                "$match": {
                    "event_id": event_id,
                    "is_deleted": False
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
            "created_at": {"$gte": yesterday}
        })
        
        return jsonify({
            "total_posts": total_posts,
            "total_replies": total_replies,
            "posts_last_24h": recent_posts,
            "most_active_users": active_users
        }), 200
        
    except Exception as e:
        print(f"Error getting thread stats: {e}")
        return jsonify({"error": "Failed to get thread statistics"}), 500