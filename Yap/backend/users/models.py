from datetime import datetime
from bson import ObjectId
from flask import current_app
import re

def create_user_document(username, hashed_password):
    return {
        "username": username,
        "password": hashed_password,
        "is_verified": False,
        "email": None,
        "email_verification_data": None,
        "created_at": datetime.now()
    }

class User:
    @staticmethod
    def search_users(query, limit=20, skip=0):
        """Search users by username"""
        db = current_app.config["DB"]
        
        # Create case-insensitive regex pattern
        pattern = re.compile(f".*{re.escape(query)}.*", re.IGNORECASE)
        
        pipeline = [
            {
                "$match": {
                    "username": {"$regex": pattern}
                }
            },
            {"$skip": skip},
            {"$limit": limit},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "username": 1,
                    "email": 1,
                    "created_at": 1,
                    # Don't include password or sensitive data
                }
            }
        ]
        
        users = list(db.users.aggregate(pipeline))
        return users
    
    @staticmethod
    def get_user_profile(user_id):
        """Get user profile with stats"""
        db = current_app.config["DB"]
        
        try:
            # Get user basic info
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            # Count posts by this user
            posts_count = db.posts.count_documents({"user_id": user_id})
            
            # Count followers and following
            followers_count = db.follows.count_documents({"following_id": user_id})
            following_count = db.follows.count_documents({"follower_id": user_id})
            
            # Prepare profile data
            profile = {
                "_id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "created_at": user["created_at"],
                "posts_count": posts_count,
                "followers_count": followers_count,
                "following_count": following_count
            }
            
            return profile
            
        except Exception as e:
            print(f"Error getting user profile: {e}")
            return None
    
    @staticmethod
    def get_user_by_username(username):
        """Get user by username"""
        db = current_app.config["DB"]
        
        user = db.users.find_one({"username": username})
        if user:
            user["_id"] = str(user["_id"])
            return user
        return None

class Follow:
    @staticmethod
    def follow_user(follower_id, following_id):
        """Follow or unfollow a user"""
        db = current_app.config["DB"]
        
        # make sure you cant follow yourself
        if follower_id == following_id:
            return {"error": "Cannot follow yourself"}
        
        try:
            # check if already following
            existing_follow = db.follows.find_one({
                "follower_id": follower_id,
                "following_id": following_id
            })
            
            if existing_follow:
                # Unfollow - remove follow relationship
                db.follows.delete_one({"_id": existing_follow["_id"]})
                return {"following": False, "message": "Unfollowed user"}
            else:
                # Follow - create follow relationship
                follow_doc = {
                    "follower_id": follower_id,
                    "following_id": following_id,
                    "created_at": datetime.utcnow()
                }
                db.follows.insert_one(follow_doc)
                return {"following": True, "message": "Following user"}
                
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def check_following_status(follower_id, following_id):
        """Check if user is following another user"""
        db = current_app.config["DB"]
        
        follow = db.follows.find_one({
            "follower_id": follower_id,
            "following_id": following_id
        })
        
        return follow is not None
    
    @staticmethod
    def get_user_followers(user_id, limit=50, skip=0):
        """Get list of users who follow this user"""
        db = current_app.config["DB"]
        
        pipeline = [
            {"$match": {"following_id": user_id}},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "follower_id",
                    "foreignField": "_id",
                    "as": "follower_info"
                }
            },
            {"$unwind": "$follower_info"},
            {
                "$project": {
                    "_id": {"$toString": "$follower_info._id"},
                    "username": "$follower_info.username",
                    "followed_at": "$created_at"
                }
            }
        ]
        
        followers = list(db.follows.aggregate(pipeline))
        return followers
    
    @staticmethod
    def get_user_following(user_id, limit=50, skip=0):
        """Get list of users this user is following"""
        db = current_app.config["DB"]
        
        pipeline = [
            {"$match": {"follower_id": user_id}},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "following_id",
                    "foreignField": "_id",
                    "as": "following_info"
                }
            },
            {"$unwind": "$following_info"},
            {
                "$project": {
                    "_id": {"$toString": "$following_info._id"},
                    "username": "$following_info.username",
                    "followed_at": "$created_at"
                }
            }
        ]
        
        following = list(db.follows.aggregate(pipeline))
        return following