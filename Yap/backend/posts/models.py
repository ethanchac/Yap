from datetime import datetime
from bson import ObjectId
from flask import current_app

class Post:
    @staticmethod
    def create_post(user_id, username, content, images=None):
        """Create a new post with optional images"""

        db = current_app.config["DB"]
        
        # Create the format of the post
        post_doc = {
            "user_id": user_id,
            "username": username,
            "content": content,
            "images": images or [],  # Store image URLs
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
        """Get all posts with pagination, profile pictures, and images"""
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
                    "images": {"$ifNull": ["$images", []]},  # Include images array
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
    def get_user_posts(user_id, limit=50, skip=0):
        """Get posts by a specific user with profile picture and images"""
        db = current_app.config["DB"]
        
        pipeline = [
            {"$match": {"user_id": user_id}},
            # Convert string user_id to ObjectId for lookup
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
                    "images": {"$ifNull": ["$images", []]},  # Include images array
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
        """Get a single post by ID with profile picture and images"""
        db = current_app.config["DB"]
        
        try:
            print(f"Looking for post with ID: {post_id}")
            
            # Try both ObjectId and string formats
            post = None
            
            # First try with ObjectId
            try:
                pipeline = [
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
                            "images": {"$ifNull": ["$images", []]},  # Include images array
                            "created_at": 1,
                            "likes_count": 1,
                            "comments_count": 1,
                            "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                        }
                    }
                ]
                
                result = list(db.posts.aggregate(pipeline))
                if result:
                    post = result[0]
                    print(f"Found post with ObjectId: {post['_id']}")
                    
            except Exception as e:
                print(f"ObjectId lookup failed: {e}")
            
            # If not found with ObjectId, try with string ID
            if not post:
                try:
                    pipeline = [
                        {"$match": {"_id": post_id}},  # Try string ID
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
                                "_id": 1,  # Keep as string if it's stored as string
                                "user_id": 1,
                                "username": {"$ifNull": ["$user_info.username", "$username"]},
                                "content": 1,
                                "images": {"$ifNull": ["$images", []]},  # Include images array
                                "created_at": 1,
                                "likes_count": 1,
                                "comments_count": 1,
                                "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                            }
                        }
                    ]
                    
                    result = list(db.posts.aggregate(pipeline))
                    if result:
                        post = result[0]
                        print(f"Found post with string ID: {post['_id']}")
                        
                except Exception as e:
                    print(f"String ID lookup failed: {e}")
            
            if post:
                print(f"Successfully found post: {post['username']} - {post['content'][:50]}...")
                return post
            else:
                print(f"Post not found with either ObjectId or string ID: {post_id}")
                return None
                
        except Exception as e:
            print(f"Error getting post by ID: {e}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    def like_post(post_id, user_id):
        """Like or unlike a post"""
        db = current_app.config["DB"]
        
        try:
            print(f"Attempting to like/unlike post {post_id} by user {user_id}")
            
            # Check if user already liked this post
            existing_like = db.likes.find_one({
                "post_id": post_id,
                "user_id": user_id,
                "type": "post"
            })
            
            print(f"Existing like found: {existing_like is not None}")
            
            if existing_like:
                # Unlike - remove like and decrement count
                db.likes.delete_one({"_id": existing_like["_id"]})
                
                # Update post like count - try both ObjectId and string
                try:
                    db.posts.update_one(
                        {"_id": ObjectId(post_id)},
                        {"$inc": {"likes_count": -1}}
                    )
                except:
                    db.posts.update_one(
                        {"_id": post_id},
                        {"$inc": {"likes_count": -1}}
                    )
                    
                print("Post unliked successfully")
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
                
                # Update post like count - try both ObjectId and string
                try:
                    db.posts.update_one(
                        {"_id": ObjectId(post_id)},
                        {"$inc": {"likes_count": 1}}
                    )
                except:
                    db.posts.update_one(
                        {"_id": post_id},
                        {"$inc": {"likes_count": 1}}
                    )
                    
                print("Post liked successfully")
                return {"liked": True, "message": "Post liked"}
                
        except Exception as e:
            print(f"Error in like_post: {e}")
            import traceback
            traceback.print_exc()
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
        """Get all posts that a user has liked with profile pictures and images"""
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
                        "images": {"$ifNull": ["$post_details.images", []]},  # Include images
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
        """Get user's liked posts with like status, profile pictures, and images"""
        db = current_app.config["DB"]
        
        try:
            # Get liked posts with profile pictures and images
            pipeline = [
                # Match likes by this user for posts
                {
                    "$match": {
                        "user_id": user_id,
                        "type": "post"
                    }
                },
                # Sort by when they liked it (most recent first)
                {"$sort": {"created_at": -1}},
                # Pagination
                {"$skip": skip},
                {"$limit": limit},
                # Convert post_id string to ObjectId for lookup
                {
                    "$addFields": {
                        "post_object_id": {"$toObjectId": "$post_id"}
                    }
                },
                # Join with posts collection to get full post details
                {
                    "$lookup": {
                        "from": "posts",
                        "localField": "post_object_id",
                        "foreignField": "_id",
                        "as": "post_details"
                    }
                },
                # Unwind the post details (should be only one match)
                {"$unwind": "$post_details"},
                # Join with users collection to get profile pictures
                {
                    "$lookup": {
                        "from": "users",
                        "let": {"user_id": {"$toObjectId": "$post_details.user_id"}},
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
                # Project the final structure
                {
                    "$project": {
                        "_id": {"$toString": "$post_details._id"},
                        "user_id": "$post_details.user_id",
                        "username": {"$ifNull": ["$user_info.username", "$post_details.username"]},
                        "content": "$post_details.content",
                        "images": {"$ifNull": ["$post_details.images", []]},  # Include images
                        "created_at": "$post_details.created_at",
                        "likes_count": "$post_details.likes_count",
                        "comments_count": "$post_details.comments_count",
                        "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]},
                        "liked_at": "$created_at"  # When the user liked this post
                    }
                }
            ]
            
            liked_posts = list(db.likes.aggregate(pipeline))
            
            print(f"Found {len(liked_posts)} liked posts for user {user_id}")
            
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
            import traceback
            traceback.print_exc()
            return []
    @staticmethod
    def delete_post(post_id, user_id):
        """Delete a post if the user owns it"""
        db = current_app.config["DB"]
        
        try:
            # First, get the post to verify ownership
            post = Post.get_post_by_id(post_id)
            if not post:
                return {"error": "Post not found"}
            
            # Check if the user owns this post
            if post["user_id"] != user_id:
                return {"error": "You can only delete your own posts"}
            
            # Delete all likes associated with this post
            db.likes.delete_many({
                "post_id": post_id,
                "type": "post"
            })
            
            # Delete all comments associated with this post (if you have comments)
            # db.comments.delete_many({"post_id": post_id})
            
            # Delete the post itself - try both ObjectId and string formats
            deleted = False
            try:
                result = db.posts.delete_one({"_id": ObjectId(post_id)})
                if result.deleted_count > 0:
                    deleted = True
            except:
                result = db.posts.delete_one({"_id": post_id})
                if result.deleted_count > 0:
                    deleted = True
            
            if deleted:
                return {"success": True, "message": "Post deleted successfully"}
            else:
                return {"error": "Failed to delete post"}
                
        except Exception as e:
            print(f"Error deleting post: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}