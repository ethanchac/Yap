from datetime import datetime
from bson import ObjectId
from flask import current_app

class Comment:
    @staticmethod
    def create_comment(post_id, user_id, username, content):
        """Create a new comment on a post"""
        db = current_app.config["DB"]
        
        # Create comment document
        comment_doc = {
            "post_id": post_id,
            "user_id": user_id,
            "username": username,
            "content": content,
            "created_at": datetime.utcnow(),
            "likes_count": 0
        }
        
        # Insert comment
        result = db.comments.insert_one(comment_doc)
        
        # Increment comment count on the post
        db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"comments_count": 1}}
        )
        
        # Return the created comment with its ID
        comment_doc["_id"] = str(result.inserted_id)
        return comment_doc
    
    @staticmethod
    def get_post_comments(post_id, limit=50, skip=0):
        """Get all comments for a specific post"""
        db = current_app.config["DB"]
        
        pipeline = [
            {"$match": {"post_id": post_id}},
            {"$sort": {"created_at": 1}},  # Oldest first for comments
            {"$skip": skip},
            {"$limit": limit},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "post_id": 1,
                    "user_id": 1,
                    "username": 1,
                    "content": 1,
                    "created_at": 1,
                    "likes_count": 1
                }
            }
        ]
        
        comments = list(db.comments.aggregate(pipeline))
        return comments
    
    @staticmethod
    def delete_comment(comment_id, user_id):
        """Delete a comment (only by the author)"""
        db = current_app.config["DB"]
        
        try:
            # Find the comment first
            comment = db.comments.find_one({
                "_id": ObjectId(comment_id),
                "user_id": user_id  # Only author can delete
            })
            
            if not comment:
                return False
            
            # Delete the comment
            db.comments.delete_one({"_id": ObjectId(comment_id)})
            
            # Decrement comment count on the post
            db.posts.update_one(
                {"_id": ObjectId(comment["post_id"])},
                {"$inc": {"comments_count": -1}}
            )
            
            return True
        except Exception:
            return False