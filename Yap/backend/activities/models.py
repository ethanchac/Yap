from datetime import datetime
from bson import ObjectId
from flask import current_app

class WouldYouRather:
    def __init__(self, option_a, option_b, votes_a=0, votes_b=0):
        self.option_a = option_a
        self.option_b = option_b
        self.votes_a = votes_a
        self.votes_b = votes_b

    def to_dict(self):
        return {
            'option_a': self.option_a,
            'option_b': self.option_b,
            'votes_a': self.votes_a,
            'votes_b': self.votes_b
        }
    
class WhatsOnMind:
    @staticmethod
    def create_post(user_id, username, content):
        """Create a new 'What's on Your Mind' post"""
        db = current_app.config["DB"]
        
        post_doc = {
            "user_id": user_id,
            "username": username,
            "content": content,
            "created_at": datetime.utcnow(),
            "created_by": user_id
        }
        
        # Insert into whats_on_mind collection
        result = db.whats_on_mind.insert_one(post_doc)
        
        # Return the created post with its ID
        post_doc["_id"] = str(result.inserted_id)
        return post_doc
    
    @staticmethod
    def get_all_posts(limit=50, skip=0):
        """Get all posts with user profile data using aggregation"""
        db = current_app.config["DB"]
        
        pipeline = [
            # Convert string user_id to ObjectId for lookup
            {
                "$addFields": {
                    "user_object_id": {"$toObjectId": "$created_by"}
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_object_id",
                    "foreignField": "_id",
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
                    "content": 1,
                    "created_at": 1,
                    "created_by": {"$toString": "$created_by"},
                    "username": {"$ifNull": ["$user_info.username", "$username"]},
                    "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                }
            },
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        posts = list(db.whats_on_mind.aggregate(pipeline))
        return posts
    
    @staticmethod
    def get_post_by_id(post_id):
        """Get a single post by ID"""
        db = current_app.config["DB"]
        
        try:
            pipeline = [
                {"$match": {"_id": ObjectId(post_id)}},
                {
                    "$addFields": {
                        "user_object_id": {"$toObjectId": "$created_by"}
                    }
                },
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "user_object_id",
                        "foreignField": "_id",
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
                        "content": 1,
                        "created_at": 1,
                        "created_by": {"$toString": "$created_by"},
                        "username": {"$ifNull": ["$user_info.username", "$username"]},
                        "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                    }
                }
            ]
            
            result = list(db.whats_on_mind.aggregate(pipeline))
            return result[0] if result else None
            
        except Exception as e:
            print(f"Error getting post by ID: {e}")
            return None
    
    @staticmethod
    def delete_post(post_id, user_id):
        """Delete a post if the user owns it"""
        db = current_app.config["DB"]
        
        try:
            # First, get the post to verify ownership
            post = WhatsOnMind.get_post_by_id(post_id)
            if not post:
                return {"error": "Post not found"}
            
            # Check if the user owns this post
            if post["created_by"] != user_id:
                return {"error": "You can only delete your own posts"}
            
            # Delete the post
            result = db.whats_on_mind.delete_one({"_id": ObjectId(post_id)})
            
            if result.deleted_count > 0:
                return {"success": True, "message": "Post deleted successfully"}
            else:
                return {"error": "Failed to delete post"}
                
        except Exception as e:
            print(f"Error deleting post: {e}")
            return {"error": str(e)}
