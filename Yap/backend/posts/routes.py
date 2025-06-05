from flask import Blueprint, request, jsonify, current_app
from posts.models import Post
from auth.service import token_required

posts_bp = Blueprint('posts', __name__)

@posts_bp.route('/create', methods=['POST'])
@token_required  # This decorator protects the route
def create_post(current_user):  # current_user is passed by the decorator
    """Create a new post"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not data.get('content'):
            return jsonify({"error": "Content is required"}), 400
        
        content = data.get('content').strip()
        
        # Validate content length
        if len(content) == 0:
            return jsonify({"error": "Content cannot be empty"}), 400
        
        max_length = current_app.config.get('MAX_POST_LENGTH', 280)
        if len(content) > max_length:
            return jsonify({"error": f"Content too long (max {max_length} characters)"}), 400
        
        # Create the post using authenticated user's info
        post = Post.create_post(
            user_id=current_user['_id'],
            username=current_user['username'],
            content=content
        )
        
        return jsonify({
            "message": "Post created successfully",
            "post": post
        }), 201
        
    except Exception as e:
        print(f"Error creating post: {e}")  # For debugging
        return jsonify({"error": "Failed to create post"}), 500

@posts_bp.route('/feed', methods=['GET'])
def get_feed():
    """Get all posts for the main feed - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        posts = Post.get_all_posts(limit=limit, skip=skip)
        
        return jsonify({
            "posts": posts,
            "page": page,
            "limit": limit,
            "total_posts": len(posts)
        }), 200
        
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return jsonify({"error": "Failed to fetch posts"}), 500

@posts_bp.route('/my-posts', methods=['GET'])
@token_required  # Protected route - only show current user's posts
def get_my_posts(current_user):
    """Get posts by the authenticated user"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        posts = Post.get_user_posts(current_user['_id'], limit=limit, skip=skip)
        
        return jsonify({
            "posts": posts,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch your posts"}), 500

@posts_bp.route('/user/<user_id>', methods=['GET'])
def get_user_posts(user_id):
    """Get posts by a specific user - PUBLIC route"""
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