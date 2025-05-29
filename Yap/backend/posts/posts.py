from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from posts.post_model import Post
from authentication.user_model import User
from shared.validators import PostValidator, CommonValidator, ValidationError
import logging

posts_bp = Blueprint('posts', __name__)
logger = logging.getLogger(__name__)

@posts_bp.route('/create', methods=['POST'])
@jwt_required()
def create_post():
    """Create a new post or thread"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        # Check if it's a thread or single post
        is_thread = data.get('is_thread', False)
        
        if is_thread:
            # Validate thread data
            thread_posts = data.get('posts', [])
            try:
                validated_posts = PostValidator.validate_thread_content(thread_posts)
                post_contents = [post['content'] for post in validated_posts]
            except ValidationError as e:
                return jsonify({'error': str(e)}), 400
            
            # Create thread
            post_model = Post(current_app.db)
            posts, error = post_model.create_post(
                current_user_id, 
                None, 
                is_thread=True, 
                thread_posts=post_contents
            )
            
            if error:
                return jsonify({'error': error}), 400
            
            return jsonify({
                'message': 'Thread created successfully',
                'type': 'thread',
                'posts': posts
            }), 201
        
        else:
            # Validate single post
            content = data.get('content', '')
            try:
                content = PostValidator.validate_content(content)
            except ValidationError as e:
                return jsonify({'error': str(e)}), 400
            
            # Create single post
            post_model = Post(current_app.db)
            post, error = post_model.create_post(current_user_id, content)
            
            if error:
                return jsonify({'error': error}), 400
            
            return jsonify({
                'message': 'Post created successfully',
                'type': 'post',
                'post': post
            }), 201
            
    except Exception as e:
        logger.error(f"Create post error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@posts_bp.route('/<post_id>', methods=['GET'])
def get_post(post_id):
    """Get a specific post"""
    try:
        # Validate post ID
        try:
            CommonValidator.validate_object_id(post_id, "Post ID")
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        post_model = Post(current_app.db)
        post = post_model.get_post_by_id(post_id)
        
        if not post:
            return jsonify({'error': 'Post not found'}), 404
        
        # If it's part of a thread, get the full thread
        if post['is_thread'] and post['thread_id']:
            thread_posts = post_model.get_thread_posts(post['thread_id'])
            return jsonify({
                'type': 'thread',
                'posts': thread_posts
            }), 200
        
        return jsonify({
            'type': 'post',
            'post': post
        }), 200
        
    except Exception as e:
        logger.error(f"Get post error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@posts_bp.route('/timeline', methods=['GET'])
@jwt_required()
def get_timeline():
    """Get user's timeline (posts from followed users)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Validate pagination
        try:
            CommonValidator.validate_pagination(page, per_page)
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        # Get user's following list
        user_model = User(current_app.db)
        user = user_model.get_user_by_id(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get following list from database
        user_doc = current_app.db.users.find_one({"_id": user_model.collection.find_one({"_id": user_model.collection.find_one({"username": user['username']})['_id']})['_id']})
        following_list = [str(uid) for uid in user_doc.get('following', [])]
        
        # Get timeline posts
        post_model = Post(current_app.db)
        posts, error = post_model.get_timeline_posts(current_user_id, following_list, page, per_page)
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'posts': posts,
            'pagination': {
                'page': page,
                'per_page': per_page
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get timeline error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@posts_bp.route('/<post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    """Like a post"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate post ID
        try:
            CommonValidator.validate_object_id(post_id, "Post ID")
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        post_model = Post(current_app.db)
        success, error = post_model.like_post(post_id, current_user_id)
        
        if error:
            return jsonify({'error': error}), 400
        
        if not success:
            return jsonify({'error': 'Post already liked or not found'}), 400
        
        return jsonify({'message': 'Post liked successfully'}), 200
        
    except Exception as e:
        logger.error(f"Like post error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@posts_bp.route('/<post_id>/unlike', methods=['POST'])
@jwt_required()
def unlike_post(post_id):
    """Unlike a post"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate post ID
        try:
            CommonValidator.validate_object_id(post_id, "Post ID")
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        post_model = Post(current_app.db)
        success, error = post_model.unlike_post(post_id, current_user_id)
        
        if error:
            return jsonify({'error': error}), 400
        
        if not success:
            return jsonify({'error': 'Post not liked or not found'}), 400
        
        return jsonify({'message': 'Post unliked successfully'}), 200
        
    except Exception as e:
        logger.error(f"Unlike post error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@posts_bp.route('/<post_id>/repost', methods=['POST'])
@jwt_required()
def repost_post(post_id):
    """Repost a post"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate post ID
        try:
            CommonValidator.validate_object_id(post_id, "Post ID")
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        post_model = Post(current_app.db)
        repost, error = post_model.repost(post_id, current_user_id)
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': 'Post reposted successfully',
            'repost': repost
        }), 201
        
    except Exception as e:
        logger.error(f"Repost error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@posts_bp.route('/<post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    """Delete a post"""
    try:
        current_user_id = get_jwt_identity()
        
        # Validate post ID
        try:
            CommonValidator.validate_object_id(post_id, "Post ID")
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        post_model = Post(current_app.db)
        success, error = post_model.delete_post(post_id, current_user_id)
        
        if error:
            return jsonify({'error': error}), 400
        
        if not success:
            return jsonify({'error': 'Post not found or unauthorized'}), 404
        
        return jsonify({'message': 'Post deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Delete post error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@posts_bp.route('/user/<username>', methods=['GET'])
def get_user_posts(username):
    """Get posts by a specific user"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Validate pagination
        try:
            CommonValidator.validate_pagination(page, per_page)
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        # Get user by username
        user_model = User(current_app.db)
        user = user_model.get_user_by_username(username)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's posts
        post_model = Post(current_app.db)
        posts, pagination = post_model.get_user_posts(user['id'], page, per_page)
        
        return jsonify({
            'user': user,
            'posts': posts,
            'pagination': pagination
        }), 200
        
    except Exception as e:
        logger.error(f"Get user posts error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@posts_bp.route('/search', methods=['GET'])
def search_posts():
    """Search posts by hashtags or content"""
    try:
        query = request.args.get('q', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        # Validate pagination
        try:
            CommonValidator.validate_pagination(page, per_page)
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        skip = (page - 1) * per_page
        
        # Search in content and hashtags
        search_filter = {
            "is_deleted": False,
            "$or": [
                {"content": {"$regex": query, "$options": "i"}},
                {"hashtags": {"$in": [query.lower().replace("#", "")]}}
            ]
        }
        
        posts = current_app.db.posts.find(search_filter).sort("created_at", -1).skip(skip).limit(per_page)
        total = current_app.db.posts.count_documents(search_filter)
        
        post_model = Post(current_app.db)
        serialized_posts = [post_model._serialize_post(post) for post in posts]
        
        return jsonify({
            'posts': serialized_posts,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Search posts error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500