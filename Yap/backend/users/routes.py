from flask import Blueprint, request, jsonify, current_app, send_from_directory
from users.models import User, Follow
from posts.models import Post
from auth.service import token_required
import os
import uuid
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

@users_bp.route('/me', methods=['GET'])
@token_required
def get_my_profile(current_user):
    """Get current user's own enhanced profile"""
    try:
        include_posts = request.args.get('include_posts', 'false').lower() == 'true'
        posts_limit = int(request.args.get('posts_limit', 6))
        
        # Use the enhanced version that includes liked posts count
        profile = User.get_enhanced_user_profile_with_likes(
            current_user['_id'], 
            current_user['_id']
        )
        
        # Add recent posts if requested
        if include_posts and profile:
            from posts.models import Post
            recent_posts = Post.get_user_posts(current_user['_id'], limit=posts_limit)
            profile['recent_posts'] = recent_posts
        
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        return jsonify({
            "success": True,
            "profile": profile
        }), 200
        
    except Exception as e:
        print(f"Error fetching own profile: {e}")
        return jsonify({"error": "Failed to fetch profile"}), 500

@users_bp.route('/me', methods=['PUT'])
@token_required
def update_my_profile(current_user):
    """Update current user's profile"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate data
        validation_error = _validate_profile_data(data)
        if validation_error:
            return jsonify({"error": validation_error}), 400
        
        result = User.update_user_profile(current_user['_id'], data)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "profile": result["profile"]
        }), 200
        
    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

@users_bp.route('/me/picture', methods=['PUT'])
@token_required
def update_my_profile_picture(current_user):
    """Update current user's profile picture"""
    try:
        data = request.get_json()
        picture_url = data.get('profile_picture') if data else None
        
        if not picture_url:
            return jsonify({"error": "Profile picture URL required"}), 400
        
        # Basic URL validation
        if not picture_url.startswith(('http://', 'https://')):
            return jsonify({"error": "Invalid URL format"}), 400
        
        result = User.update_user_profile(
            current_user['_id'], 
            {"profile_picture": picture_url}
        )
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify({
            "success": True,
            "message": "Profile picture updated successfully",
            "profile": result["profile"]
        }), 200
        
    except Exception as e:
        print(f"Error updating profile picture: {e}")
        return jsonify({"error": "Failed to update profile picture"}), 500

@users_bp.route('/profile/<user_id>/enhanced', methods=['GET'])
@token_required
def get_enhanced_user_profile_route(current_user, user_id):
    """Get enhanced user profile (authenticated - shows follow status)"""
    try:
        include_posts = request.args.get('include_posts', 'false').lower() == 'true'
        posts_limit = int(request.args.get('posts_limit', 6))
        
        if include_posts:
            profile = User.get_profile_with_recent_posts(
                user_id, 
                current_user['_id'],
                posts_limit
            )
        else:
            profile = User.get_enhanced_user_profile(user_id, current_user['_id'])
        
        if not profile:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "success": True,
            "profile": profile
        }), 200
        
    except Exception as e:
        print(f"Error fetching enhanced profile: {e}")
        return jsonify({"error": "Failed to fetch user profile"}), 500

@users_bp.route('/profile/username/<username>/enhanced', methods=['GET'])
@token_required
def get_enhanced_profile_by_username(current_user, username):
    """Get enhanced user profile by username (authenticated)"""
    try:
        user = User.get_user_by_username(username)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        include_posts = request.args.get('include_posts', 'false').lower() == 'true'
        posts_limit = int(request.args.get('posts_limit', 6))
        
        if include_posts:
            profile = User.get_profile_with_recent_posts(
                user["_id"], 
                current_user['_id'],
                posts_limit
            )
        else:
            profile = User.get_enhanced_user_profile(user["_id"], current_user['_id'])
        
        return jsonify({
            "success": True,
            "profile": profile
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch user profile"}), 500

# Helper function for validation
def _validate_profile_data(profile_data):
    """Validate profile update data"""
    validation_rules = {
        'full_name': {'max_length': 100},
        'bio': {'max_length': 500},
        'website': {'max_length': 200},
        'location': {'max_length': 100},
        'profile_picture': {'max_length': 500}
    }
    
    for field, value in profile_data.items():
        if field in validation_rules:
            rules = validation_rules[field]
            
            # Check max length
            if value and len(str(value)) > rules.get('max_length', float('inf')):
                return f"{field} exceeds maximum length of {rules['max_length']} characters"
            
            # URL validation for website and profile_picture
            if field in ['website', 'profile_picture'] and value:
                if not value.startswith(('http://', 'https://')):
                    return f"{field} must be a valid URL starting with http:// or https://"
    
    return None

@users_bp.route('/me/picture/upload', methods=['POST', 'OPTIONS'])
def upload_profile_picture():
    """Upload profile picture file"""
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        # Manual token verification
        from auth.service import verify_token
        
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        token_data = verify_token(token)
        if not token_data:
            return jsonify({'error': 'Token is invalid'}), 401
        
        # Get full user data by username since token only has username
        username = token_data.get('username')
        if not username:
            return jsonify({'error': 'Invalid token data'}), 401
        
        # Look up user by username to get _id
        current_user = User.get_user_by_username(username)
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        print(f"Found user: {current_user.get('_id')} ({username})")
        
        # Check if file is in request
        if 'profile_picture' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['profile_picture']
        
        # Check if file was selected
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WebP"}), 400
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Create user-specific directory
        user_upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], current_user['_id'])
        os.makedirs(user_upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(user_upload_dir, unique_filename)
        file.save(file_path)
        
        # Create URL for the uploaded file
        picture_url = f"http://localhost:5000/uploads/profile_pictures/{current_user['_id']}/{unique_filename}"
        
        # Update user profile with new picture URL
        result = User.update_user_profile(
            current_user['_id'], 
            {"profile_picture": picture_url}
        )
        
        if "error" in result:
            # Clean up uploaded file if database update fails
            try:
                os.remove(file_path)
            except:
                pass
            return jsonify({"error": result["error"]}), 400
        
        return jsonify({
            "success": True,
            "message": "Profile picture uploaded successfully",
            "profile": result["profile"]
        }), 200
        
    except Exception as e:
        print(f"Error uploading profile picture: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to upload profile picture"}), 500
    
@users_bp.route('/<user_id>/liked-posts', methods=['GET'])
@token_required
def get_user_liked_posts_from_users(current_user, user_id):
    """Get posts that a user has liked (from users endpoint)"""
    try:
        from posts.models import Post
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        # Check if user exists
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

@users_bp.route('/me/liked-posts', methods=['GET'])
@token_required
def get_my_liked_posts_from_users(current_user):
    """Get current user's liked posts (from users endpoint)"""
    try:
        from posts.models import Post
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        # Get liked posts with current user's like status
        liked_posts = Post.get_user_liked_posts_with_like_status(
            user_id=current_user['_id'],
            current_user_id=current_user['_id'],
            limit=limit,
            skip=skip
        )
        
        # Get total count for pagination
        total_liked = Post.get_liked_posts_count(current_user['_id'])
        
        return jsonify({
            "posts": liked_posts,
            "page": page,
            "limit": limit,
            "total_liked": total_liked,
            "has_more": (skip + len(liked_posts)) < total_liked
        }), 200
        
    except Exception as e:
        print(f"Error fetching my liked posts: {e}")
        return jsonify({"error": "Failed to fetch liked posts"}), 500
    
@users_bp.route('/uploads/profile_pictures/<user_id>/<filename>')
def serve_profile_picture(user_id, filename):
    """Serve uploaded profile pictures"""
    try:
        upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], user_id)
        return send_from_directory(upload_dir, filename)
    except Exception as e:
        print(f"Error serving profile picture: {e}")
        # Return default avatar if file not found
        default_dir = os.path.join(current_app.root_path, 'static', 'default')
        return send_from_directory(default_dir, 'default-avatar.png')
