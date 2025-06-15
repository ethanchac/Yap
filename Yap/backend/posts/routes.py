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
def get_my_posts_route(current_user):  # RENAMED to avoid conflict
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
def get_user_posts_route(user_id):  # RENAMED to avoid conflict
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

# NEW ROUTES FOR LIKES AND SINGLE POST
@posts_bp.route('/<post_id>/like', methods=['POST'])
@token_required
def like_post(current_user, post_id):
    """Like or unlike a post"""
    try:
        # Check if post exists
        post = Post.get_post_by_id(post_id)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        result = Post.like_post(post_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 500
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error liking post: {e}")
        return jsonify({"error": "Failed to like post"}), 500

@posts_bp.route('/<post_id>/like-status', methods=['GET'])
@token_required
def get_like_status(current_user, post_id):
    """Check if current user has liked a post"""
    try:
        liked = Post.check_user_liked_post(post_id, current_user['_id'])
        return jsonify({"liked": liked}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to check like status"}), 500

@posts_bp.route('/<post_id>', methods=['GET'])
def get_single_post(post_id):
    """Get a single post by ID (for the comments page)"""
    try:
        post = Post.get_post_by_id(post_id)
        
        if not post:
            return jsonify({"error": "Post not found"}), 404
            
        return jsonify({"post": post}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch post"}), 500
    
@posts_bp.route('/liked', methods=['GET'])
@token_required
def get_my_liked_posts_route(current_user):  # RENAMED to avoid conflict
    """Get posts that the current user has liked"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        print(f"Getting liked posts for user: {current_user['_id']}")
        
        # Get liked posts with current user's like status
        liked_posts = Post.get_user_liked_posts_with_like_status(
            user_id=current_user['_id'],
            current_user_id=current_user['_id'],
            limit=limit,
            skip=skip
        )
        
        # Get total count for pagination
        total_liked = Post.get_liked_posts_count(current_user['_id'])
        
        print(f"Returning {len(liked_posts)} liked posts, total: {total_liked}")
        
        return jsonify({
            "posts": liked_posts,
            "page": page,
            "limit": limit,
            "total_liked": total_liked,
            "has_more": (skip + len(liked_posts)) < total_liked
        }), 200
        
    except Exception as e:
        print(f"Error fetching liked posts: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch liked posts"}), 500

@posts_bp.route('/user/<user_id>/liked', methods=['GET'])
@token_required
def get_user_liked_posts_route(current_user, user_id):  # RENAMED to avoid conflict
    """Get posts that a specific user has liked (authenticated route)"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        # Check if user exists
        from users.models import User
        target_user = User.get_user_profile(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        # Get liked posts with current user's like status
        liked_posts = Post.get_user_liked_posts_with_like_status(
            user_id=user_id,
            current_user_id=current_user['_id'],
            limit=limit,
            skip=skip
        )
        
        # Get total count for pagination
        total_liked = Post.get_liked_posts_count(user_id)
        
        return jsonify({
            "posts": liked_posts,
            "user": {
                "_id": target_user["_id"],
                "username": target_user["username"]
            },
            "page": page,
            "limit": limit,
            "total_liked": total_liked,
            "has_more": (skip + len(liked_posts)) < total_liked
        }), 200
        
    except Exception as e:
        print(f"Error fetching user liked posts: {e}")
        return jsonify({"error": "Failed to fetch user liked posts"}), 500

@posts_bp.route('/user/<user_id>/liked/public', methods=['GET'])
def get_user_liked_posts_public_route(user_id):  # RENAMED to avoid conflict
    """Get posts that a specific user has liked (public route - no like status)"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        # Check if user exists
        from users.models import User
        target_user = User.get_user_profile(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        # Get liked posts without current user's like status
        liked_posts = Post.get_user_liked_posts(user_id, limit=limit, skip=skip)
        
        # Get total count for pagination
        total_liked = Post.get_liked_posts_count(user_id)
        
        return jsonify({
            "posts": liked_posts,
            "user": {
                "_id": target_user["_id"],
                "username": target_user["username"]
            },
            "page": page,
            "limit": limit,
            "total_liked": total_liked,
            "has_more": (skip + len(liked_posts)) < total_liked
        }), 200
        
    except Exception as e:
        print(f"Error fetching user liked posts: {e}")
        return jsonify({"error": "Failed to fetch user liked posts"}), 500