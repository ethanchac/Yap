from flask import Blueprint, request, jsonify, current_app
from users.models import User, Follow
from posts.models import Post
from auth.service import token_required

users_bp = Blueprint('users', __name__)

@users_bp.route('/search', methods=['GET'])
def search_users():
    """Search users by username - PUBLIC route"""
    try:
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({"error": "Search query is required"}), 400
        
        if len(query) < 2:
            return jsonify({"error": "Search query must be at least 2 characters"}), 400
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        users = User.search_users(query, limit=limit, skip=skip)
        
        return jsonify({
            "users": users,
            "query": query,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        print(f"Error searching users: {e}")
        return jsonify({"error": "Failed to search users"}), 500

@users_bp.route('/profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """Get user profile with stats - PUBLIC route"""
    try:
        profile = User.get_user_profile(user_id)
        
        if not profile:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({"profile": profile}), 200
        
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return jsonify({"error": "Failed to fetch user profile"}), 500

@users_bp.route('/profile/username/<username>', methods=['GET'])
def get_user_profile_by_username(username):
    """Get user profile by username - PUBLIC route"""
    try:
        user = User.get_user_by_username(username)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        profile = User.get_user_profile(user["_id"])
        
        return jsonify({"profile": profile}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch user profile"}), 500

@users_bp.route('/<user_id>/follow', methods=['POST'])
@token_required
def follow_user(current_user, user_id):
    """Follow or unfollow a user"""
    try:
        # Check if target user exists
        target_user = User.get_user_profile(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        result = Follow.follow_user(current_user['_id'], user_id)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error following user: {e}")
        return jsonify({"error": "Failed to follow user"}), 500

@users_bp.route('/<user_id>/follow-status', methods=['GET'])
@token_required
def get_follow_status(current_user, user_id):
    """Check if current user is following another user"""
    try:
        following = Follow.check_following_status(current_user['_id'], user_id)
        return jsonify({"following": following}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to check follow status"}), 500

@users_bp.route('/<user_id>/followers', methods=['GET'])
def get_user_followers(user_id):
    """Get list of user's followers - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        followers = Follow.get_user_followers(user_id, limit=limit, skip=skip)
        
        return jsonify({
            "followers": followers,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch followers"}), 500

@users_bp.route('/<user_id>/following', methods=['GET'])
def get_user_following(user_id):
    """Get list of users this user is following - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        following = Follow.get_user_following(user_id, limit=limit, skip=skip)
        
        return jsonify({
            "following": following,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch following"}), 500

@users_bp.route('/<user_id>/posts', methods=['GET'])
def get_user_posts_public(user_id):
    """Get posts by a specific user - PUBLIC route (for profile page)"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        posts = Post.get_user_posts(user_id, limit=limit, skip=skip)
        
        return jsonify({
            "posts": posts,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch user posts"}), 500