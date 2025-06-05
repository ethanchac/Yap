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