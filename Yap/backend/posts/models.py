from datetime import datetime
from bson import ObjectId
from flask import current_app

class Post:
    @staticmethod
    def create_post(user_id, username, content):
        """Create a new post in the database"""
        # Get database from Flask app config (your existing pattern)
        db = current_app.config["DB"]
        
        # Create post document
        post_doc = {
            "user_id": user_id,
            "username": username,
            "content": content,
            "created_at": datetime.utcnow(),
            "likes_count": 0,
            "comments_count": 0
        }
        
        # Insert into posts collection
        result = db.posts.insert_one(post_doc)
        
        # Return the created post with its ID
        post_doc["_id"] = str(result.inserted_id)
        return post_doc
    
    @staticmethod
    def get_all_posts(limit=50, skip=0):
        """Get all posts with pagination"""
        db = current_app.config["DB"]
        
        # MongoDB aggregation pipeline
        pipeline = [
            {"$sort": {"created_at": -1}},  # Newest first
            {"$skip": skip},               # For pagination
            {"$limit": limit},             # Limit results
            {
                "$project": {              # Select which fields to return
                    "_id": {"$toString": "$_id"},  # Convert ObjectId to string
                    "user_id": 1,
                    "username": 1,
                    "content": 1,
                    "created_at": 1,
                    "likes_count": 1,
                    "comments_count": 1
                }
            }
        ]
        
        posts = list(db.posts.aggregate(pipeline))
        return posts
    
    @staticmethod
    def get_user_posts(user_id, limit=50, skip=0):
        """Get posts by a specific user"""
        db = current_app.config["DB"]
        
        pipeline = [
            {"$match": {"user_id": user_id}},  # Filter by user
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "user_id": 1,
                    "username": 1,
                    "content": 1,
                    "created_at": 1,
                    "likes_count": 1,
                    "comments_count": 1
                }
            }
        ]
        
        posts = list(db.posts.aggregate(pipeline))
        return posts
    
    @staticmethod
    def get_post_by_id(post_id):
        """Get a single post by ID"""
        db = current_app.config["DB"]
        
        try:
            # Convert string ID back to ObjectId for MongoDB query
            post = db.posts.find_one({"_id": ObjectId(post_id)})
            if post:
                post["_id"] = str(post["_id"])
                return post
            return None
        except Exception:
            return None

    # NEW METHODS FOR LIKES
    @staticmethod
    def like_post(post_id, user_id):
        """Like or unlike a post"""
        db = current_app.config["DB"]
        
        try:
            # Check if user already liked this post
            existing_like = db.likes.find_one({
                "post_id": post_id,
                "user_id": user_id,
                "type": "post"
            })
            
            if existing_like:
                # Unlike - remove like and decrement count
                db.likes.delete_one({"_id": existing_like["_id"]})
                db.posts.update_one(
                    {"_id": ObjectId(post_id)},
                    {"$inc": {"likes_count": -1}}
                )
                return {"liked": False, "message": "Post unliked"}
            else:
                # Like - add like and increment count
                like_doc = {
                    "post_id": post_id,
                    "user_id": user_id,
                    "type": "post",
                    "created_at": datetime.utcnow()
                }
                db.likes.insert_one(like_doc)
                db.posts.update_one(
                    {"_id": ObjectId(post_id)},
                    {"$inc": {"likes_count": 1}}
                )
                return {"liked": True, "message": "Post liked"}
                
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def check_user_liked_post(post_id, user_id):
        """Check if user has liked a specific post"""
        db = current_app.config["DB"]
        
        like = db.likes.find_one({
            "post_id": post_id,
            "user_id": user_id,
            "type": "post"
        })
        
        return like is not None