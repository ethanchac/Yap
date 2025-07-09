from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import uuid
from posts.models import Post
from auth.service import token_required

posts_bp = Blueprint('posts', __name__)

# Image upload configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@posts_bp.route('/upload-image', methods=['POST'])
@token_required
def upload_image(current_user):
    """Upload a single image for posts"""
    try:
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
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": "File too large. Maximum size is 5MB"}), 400
        
        if file and allowed_file(file.filename):
            # Generate unique filename
            filename = secure_filename(file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
            
            # Create upload directory if it doesn't exist
            upload_folder = os.path.join(current_app.static_folder, 'uploads', 'post_images')
            os.makedirs(upload_folder, exist_ok=True)
            
            # Save the file
            file_path = os.path.join(upload_folder, unique_filename)
            file.save(file_path)
            
            # Return the URL for accessing the image
            image_url = f"{request.url_root}static/uploads/post_images/{unique_filename}"
            
            return jsonify({
                "message": "Image uploaded successfully",
                "imageUrl": image_url,
                "filename": unique_filename
            }), 200
        else:
            return jsonify({"error": "Invalid file type. Allowed types: PNG, JPG, JPEG, GIF, WEBP"}), 400
            
    except Exception as e:
        print(f"Error uploading image: {e}")
        return jsonify({"error": "Failed to upload image"}), 500

@posts_bp.route('/create', methods=['POST'])
@token_required
def create_post(current_user):
    """Create a new post with optional images"""
    try:
        data = request.get_json()
        
        # Validate input - either content or images must be provided
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        content = data.get('content', '').strip()
        images = data.get('images', [])
        
        # Validate that at least content or images are provided
        if not content and not images:
            return jsonify({"error": "Content or images are required"}), 400
        
        # Validate content length if provided
        if content:
            max_length = current_app.config.get('MAX_POST_LENGTH', 280)
            if len(content) > max_length:
                return jsonify({"error": f"Content too long (max {max_length} characters)"}), 400
        
        # Validate images array
        if images and not isinstance(images, list):
            return jsonify({"error": "Images must be an array"}), 400
        
        if len(images) > 4:
            return jsonify({"error": "Maximum 4 images per post"}), 400
        
        # Create the post using authenticated user's info
        post = Post.create_post(
            user_id=current_user['_id'],
            username=current_user['username'],
            content=content,
            images=images
        )
        
        return jsonify({
            "message": "Post created successfully",
            "post": post
        }), 201
        
    except Exception as e:
        print(f"Error creating post: {e}")
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
@token_required
def get_my_posts_route(current_user):
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
def get_user_posts_route(user_id):
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
def get_my_liked_posts_route(current_user):
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
def get_user_liked_posts_route(current_user, user_id):
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
def get_user_liked_posts_public_route(user_id):
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