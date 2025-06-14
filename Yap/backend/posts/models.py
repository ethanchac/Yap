from datetime import datetime
from bson import ObjectId
from flask import current_app

class Post:
    @staticmethod
    def create_post(user_id, username, content):
        """adding the new post to database"""

        db = current_app.config["DB"]
        
        # created the format of the post
        post_doc = {
            "user_id": user_id,
            "username": username,
            "content": content,
            "created_at": datetime.utcnow(),
            "likes_count": 0,
            "comments_count": 0
        }
        
        # insert into posts collection
        result = db.posts.insert_one(post_doc)
        
        # return the created post with its ID
        post_doc["_id"] = str(result.inserted_id)
        return post_doc
    
    @staticmethod
    def get_all_posts(limit=50, skip=0):
        """Get all posts with pagination and profile pictures"""
        db = current_app.config["DB"]
        
        pipeline = [
            # Convert string user_id to ObjectId for lookup
            {
                "$addFields": {
                    "user_object_id": {"$toObjectId": "$user_id"}
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
                    "preserveNullAndEmptyArrays": True  # Keep posts even if user lookup fails
                }
            },
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "user_id": 1,
                    "username": {"$ifNull": ["$user_info.username", "$username"]},  # Fallback to original username
                    "content": 1,
                    "created_at": 1,
                    "likes_count": 1,
                    "comments_count": 1,
                    "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                }
            },
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        posts = list(db.posts.aggregate(pipeline))
        return posts
    
    @staticmethod
    def get_post_by_id(post_id):
        """Get a single post by ID with profile picture"""
        db = current_app.config["DB"]
        
        try:
            pipeline = [
                {"$match": {"_id": ObjectId(post_id)}},
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "user_id",
                        "foreignField": "_id",
                        "as": "user_info"
                    }
                },
                {
                    "$unwind": "$user_info"
                },
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "user_id": 1,
                        "username": "$user_info.username",  # Get from user_info
                        "content": 1,
                        "created_at": 1,
                        "likes_count": 1,
                        "comments_count": 1,
                        "profile_picture": "$user_info.profile_picture"  # Add profile picture
                    }
                }
            ]
            
            result = list(db.posts.aggregate(pipeline))
            return result[0] if result else None
            
        except Exception as e:
            print(f"Error getting post by ID: {e}")
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
    @staticmethod
    def get_user_liked_posts(user_id, limit=50, skip=0):
        """Get all posts that a user has liked with profile pictures"""
        db = current_app.config["DB"]
        
        try:
            pipeline = [
                {
                    "$match": {
                        "user_id": user_id,
                        "type": "post"
                    }
                },
                {"$sort": {"created_at": -1}},
                {"$skip": skip},
                {"$limit": limit},
                {
                    "$addFields": {
                        "post_object_id": {"$toObjectId": "$post_id"}
                    }
                },
                {
                    "$lookup": {
                        "from": "posts",
                        "localField": "post_object_id",
                        "foreignField": "_id",
                        "as": "post_details"
                    }
                },
                {"$unwind": "$post_details"},
                # Add lookup for user info to get profile picture
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "post_details.user_id",
                        "foreignField": "_id",
                        "as": "user_info"
                    }
                },
                {"$unwind": "$user_info"},
                {
                    "$project": {
                        "_id": {"$toString": "$post_details._id"},
                        "user_id": "$post_details.user_id",
                        "username": "$user_info.username",  # Get from user_info
                        "content": "$post_details.content",
                        "created_at": "$post_details.created_at",
                        "likes_count": "$post_details.likes_count",
                        "comments_count": "$post_details.comments_count",
                        "profile_picture": "$user_info.profile_picture",  # Add profile picture
                        "liked_at": "$created_at"
                    }
                }
            ]
            
            liked_posts = list(db.likes.aggregate(pipeline))
            return liked_posts
            
        except Exception as e:
            print(f"Error getting user liked posts: {e}")
        return []
    
    @staticmethod
    def get_liked_posts_count(user_id):
        """Get total count of posts a user has liked"""
        db = current_app.config["DB"]
        
        try:
            count = db.likes.count_documents({
                "user_id": user_id,
                "type": "post"
            })
            return count
        except Exception as e:
            print(f"Error getting liked posts count: {e}")
            return 0

    @staticmethod
    def get_user_liked_posts_with_like_status(user_id, current_user_id=None, limit=50, skip=0):
        """Get user's liked posts with like status for current user"""
        db = current_app.config["DB"]
        
        try:
            # Get the basic liked posts
            liked_posts = Post.get_user_liked_posts(user_id, limit, skip)
            
            # If there's a current user, add their like status for each post
            if current_user_id and liked_posts:
                post_ids = [post["_id"] for post in liked_posts]
                
                # Get current user's likes for these posts
                user_likes = db.likes.find({
                    "user_id": current_user_id,
                    "post_id": {"$in": post_ids},
                    "type": "post"
                })
                
                # Create a set of post IDs the current user has liked
                current_user_liked_posts = {like["post_id"] for like in user_likes}
                
                # Add like status to each post
                for post in liked_posts:
                    post["is_liked_by_current_user"] = post["_id"] in current_user_liked_posts
            
            return liked_posts
            
        except Exception as e:
            print(f"Error getting liked posts with status: {e}")
            return []