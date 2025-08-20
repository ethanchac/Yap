from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import uuid
from posts.models import Post
from auth.service import token_required
import boto3
import os
import uuid
from botocore.exceptions import ClientError

posts_bp = Blueprint('posts', __name__)

# Image upload configuration
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def get_s3_client():
    """Get S3 client"""
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'ca-central-1')
    )

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@posts_bp.route('/upload-image', methods=['POST'])
@token_required
def upload_image(current_user):
    """Upload image to S3 public bucket for posts"""
    try:
        # Check if the post request has the file part
        if 'image' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": "File too large. Maximum size is 5MB"}), 400
        
        if file and allowed_file(file.filename):
            # Generate unique filename
            filename = secure_filename(file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"post_{current_user['_id']}_{uuid.uuid4().hex}.{file_extension}"
            
            # Get S3 configuration from app config
            s3_config = current_app.config.get("S3_CONFIG", {})
            public_bucket = s3_config.get('public_bucket')
            
            if not public_bucket:
                return jsonify({"error": "S3 configuration not found"}), 500
            
            # Upload to S3 PUBLIC bucket
            try:
                s3_client = get_s3_client()
                s3_key = f"post_images/{unique_filename}"
                
                s3_client.upload_fileobj(
                    file,
                    public_bucket,
                    s3_key,
                    ExtraArgs={
                        'ACL': 'public-read',  # Make post images public
                        'ContentType': file.content_type or f'image/{file_extension}',
                        'CacheControl': 'max-age=31536000',  # Cache for 1 year
                        'Metadata': {
                            'user_id': current_user['_id'],
                            'upload_type': 'post_image'
                        }
                    }
                )
                
                # Generate public URL
                region = os.getenv('AWS_REGION', 'ca-central-1')
                image_url = f"https://{public_bucket}.s3.{region}.amazonaws.com/{s3_key}"
                
                return jsonify({
                    "message": "Image uploaded successfully",
                    "imageUrl": image_url,
                    "filename": unique_filename,
                    "s3_key": s3_key
                }), 200
                
            except ClientError as e:
                print(f"S3 upload error: {e}")
                return jsonify({"error": "Failed to upload to cloud storage"}), 500
        else:
            return jsonify({"error": "Invalid file type. Allowed types: PNG, JPG, JPEG, GIF, WEBP"}), 400
            
    except Exception as e:
        print(f"Error uploading image: {e}")
        return jsonify({"error": "Failed to upload image"}), 500

@posts_bp.route('/create', methods=['POST'])
@token_required
def create_post(current_user):
    """Create a new post with S3 images"""
    try:
        data = request.get_json()
        
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
        
        # Validate that all image URLs are from our S3 bucket (security check)
        s3_config = current_app.config.get("S3_CONFIG", {})
        public_bucket = s3_config.get('public_bucket')
        
        for image_url in images:
            if not image_url.startswith(f"https://{public_bucket}.s3."):
                return jsonify({"error": "Invalid image URL"}), 400
        
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

@posts_bp.route('/following-feed', methods=['GET'])
@token_required
def get_following_feed(current_user):
    """Get posts from users that the current user follows"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        posts = Post.get_following_posts(current_user['_id'], limit=limit, skip=skip)
        
        return jsonify({
            "posts": posts,
            "page": page,
            "limit": limit,
            "total_posts": len(posts)
        }), 200
        
    except Exception as e:
        print(f"Error fetching following feed: {e}")
        return jsonify({"error": "Failed to fetch following posts"}), 500

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
    
@posts_bp.route('/<post_id>', methods=['DELETE'])
@token_required
def delete_post_route(current_user, post_id):
    """Delete a post and its S3 images"""
    try:
        # Get the post first to check ownership and get image URLs
        post = Post.get_post_by_id(post_id)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Check ownership
        if post["user_id"] != current_user['_id']:
            return jsonify({"error": "You can only delete your own posts"}), 403
        
        # Delete from database first
        result = Post.delete_post(post_id, current_user['_id'])
        
        if "error" in result:
            status_code = 404 if "not found" in result["error"].lower() else 403
            return jsonify({"error": result["error"]}), status_code
        
        # If database deletion successful, clean up S3 images
        if result.get("success") and post.get("images"):
            s3_config = current_app.config.get("S3_CONFIG", {})
            public_bucket = s3_config.get('public_bucket')
            
            if public_bucket:
                try:
                    s3_client = get_s3_client()
                    
                    for image_url in post["images"]:
                        # Extract S3 key from URL
                        if f"https://{public_bucket}.s3." in image_url:
                            # Extract the S3 key (everything after the domain)
                            s3_key = image_url.split('/')[-2] + '/' + image_url.split('/')[-1]  # post_images/filename.jpg
                            
                            try:
                                s3_client.delete_object(Bucket=public_bucket, Key=s3_key)
                                print(f"Deleted S3 object: {s3_key}")
                            except ClientError as e:
                                print(f"Error deleting S3 object {s3_key}: {e}")
                                # Don't fail the entire operation if S3 cleanup fails
                                
                except Exception as e:
                    print(f"Error during S3 cleanup: {e}")
                    # Don't fail the operation since the post is already deleted from DB
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in delete post route: {e}")
        return jsonify({"error": "Failed to delete post"}), 500