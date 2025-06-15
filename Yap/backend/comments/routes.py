from flask import Blueprint, request, jsonify, current_app
from comments.models import Comment
from posts.models import Post
from auth.service import token_required
from bson import ObjectId

comments_bp = Blueprint('comments', __name__)

@comments_bp.route('/create', methods=['POST'])
@token_required
def create_comment(current_user):
    """create a new comment on a post"""
    try:
        data = request.get_json()
        #print(data)
        # Validate input
        if not data or not data.get('content') or not data.get('post_id'):
            return jsonify({"error": "Content and post_id are required"}), 400
        
        content = data.get('content').strip()
        post_id = data.get('post_id')
        
        if len(content) == 0:
            return jsonify({"error": "Content cannot be empty"}), 400
        
        max_length = current_app.config.get('MAX_COMMENT_LENGTH', 500)
        if len(content) > max_length:
            return jsonify({"error": f"Comment too long (max {max_length} characters)"}), 400
        
        # check if post exists
        post = Post.get_post_by_id(post_id)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        
        # create the comment
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
    """Get all comments for a specific post with profile pictures"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        db = current_app.config["DB"]
        
        # Get post with profile picture
        post_pipeline = [
            {"$match": {"_id": ObjectId(post_id)}},
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
            {
                "$unwind": {
                    "path": "$user_info",
                    "preserveNullAndEmptyArrays": True
                }
            },
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "user_id": 1,
                    "username": {"$ifNull": ["$user_info.username", "$username"]},
                    "content": 1,
                    "created_at": 1,
                    "likes_count": 1,
                    "comments_count": 1,
                    "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                }
            }
        ]
        
        post_result = list(db.posts.aggregate(post_pipeline))
        if not post_result:
            return jsonify({"error": "Post not found"}), 404
        
        post = post_result[0]
        
        # Get comments with profile pictures
        comments_pipeline = [
            {"$match": {"post_id": post_id}},
            {"$sort": {"created_at": 1}},
            {"$skip": skip},
            {"$limit": limit},
            # Convert user_id string to ObjectId for lookup
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
            {
                "$unwind": {
                    "path": "$user_info",
                    "preserveNullAndEmptyArrays": True
                }
            },
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "post_id": 1,
                    "user_id": 1,
                    "username": {"$ifNull": ["$user_info.username", "$username"]},
                    "content": 1,
                    "created_at": 1,
                    "likes_count": 1,
                    "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                }
            }
        ]
        
        comments = list(db.comments.aggregate(comments_pipeline))
        
        print(f"Found {len(comments)} comments with profile pictures")
        for comment in comments[:2]:  # Log first 2 comments
            print(f"  Comment by {comment['username']}: profile_picture = {comment.get('profile_picture')}")
        
        return jsonify({
            "post": post,
            "comments": comments,
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        print(f"Error fetching comments with profiles: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch comments"}), 500

@comments_bp.route('/<comment_id>', methods=['DELETE'])
@token_required
def delete_comment(current_user, comment_id):
    """delete a comment (only by the owner)"""
    try:
        success = Comment.delete_comment(comment_id, current_user['_id'])
        
        if success:
            return jsonify({"message": "Comment deleted successfully"}), 200
        else:
            return jsonify({"error": "Comment not found or unauthorized"}), 404
            
    except Exception as e:
        return jsonify({"error": "Failed to delete comment"}), 500
    
@comments_bp.route('/debug/database/<post_id>', methods=['GET'])
def debug_database(post_id):
    """Debug route to see what's actually in the database"""
    db = current_app.config["DB"]
    
    # Get some sample posts to see the format
    sample_posts = list(db.posts.find().limit(3))
    
    # Convert ObjectIds to strings for JSON serialization
    for post in sample_posts:
        post["_id"] = str(post["_id"])
    
    # Try to find the specific post we're looking for
    target_post_objectid = None
    target_post_string = None
    
    try:
        target_post_objectid = db.posts.find_one({"_id": ObjectId(post_id)})
        if target_post_objectid:
            target_post_objectid["_id"] = str(target_post_objectid["_id"])
    except:
        pass
    
    try:
        target_post_string = db.posts.find_one({"_id": post_id})
        if target_post_string:
            target_post_string["_id"] = str(target_post_string["_id"])
    except:
        pass
    
    # Check comments collection too
    sample_comments = list(db.comments.find().limit(3))
    for comment in sample_comments:
        comment["_id"] = str(comment["_id"])
    
    return jsonify({
        "searched_post_id": post_id,
        "post_id_type": str(type(post_id)),
        "sample_posts": sample_posts,
        "target_post_with_objectid": target_post_objectid,
        "target_post_with_string": target_post_string,
        "sample_comments": sample_comments,
        "posts_count": db.posts.count_documents({}),
        "comments_count": db.comments.count_documents({})
    })