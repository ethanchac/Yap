from flask import Blueprint, request, jsonify, current_app
from comments.models import Comment
from posts.models import Post
from auth.service import token_required

comments_bp = Blueprint('comments', __name__)

@comments_bp.route('/create', methods=['POST'])
@token_required
def create_comment(current_user):
    """Create a new comment on a post"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not data.get('content') or not data.get('post_id'):
            return jsonify({"error": "Content and post_id are required"}), 400
        
        content = data.get('content').strip()
        post_id = data.get('post_id')
        
        # Validate content length
        if len(content) == 0:
            return jsonify({"error": "Content cannot be empty"}), 400
        
        max_length = current_app.config.get('MAX_COMMENT_LENGTH', 500)
        if len(content) > max_length:
            return jsonify({"error": f"Comment too long (max {max_length} characters)"}), 400
        
        # Check if post exists
        post = Post.get_post_by_id(post_id)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # Create the comment
        comment = Comment.create_comment(
            post_id=post_id,
            user_id=current_user['_id'],
            username=current_user['username'],
            content=content
        )
        
        return jsonify({
            "message": "Comment created successfully",
            "comment": comment
        }), 201
        
    except Exception as e:
        print(f"Error creating comment: {e}")
        return jsonify({"error": "Failed to create comment"}), 500

@comments_bp.route('/post/<post_id>', methods=['GET'])
def get_post_comments(post_id):
    """Get all comments for a specific post"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        # Check if post exists
        post = Post.get_post_by_id(post_id)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        comments = Comment.get_post_comments(post_id, limit=limit, skip=skip)
        
        return jsonify({
            "post": post,
            "comments": comments,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        print(f"Error fetching comments: {e}")
        return jsonify({"error": "Failed to fetch comments"}), 500

@comments_bp.route('/<comment_id>', methods=['DELETE'])
@token_required
def delete_comment(current_user, comment_id):
    """Delete a comment (only by the author)"""
    try:
        success = Comment.delete_comment(comment_id, current_user['_id'])
        
        if success:
            return jsonify({"message": "Comment deleted successfully"}), 200
        else:
            return jsonify({"error": "Comment not found or unauthorized"}), 404
            
    except Exception as e:
        return jsonify({"error": "Failed to delete comment"}), 500