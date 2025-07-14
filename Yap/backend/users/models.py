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
        "full_name": "",
        "bio": "",
        "profile_picture": "",
        "website": "",
        "location": "",
        "program" : "",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
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
                    "profile_picture": 1, 
                    "full_name": 1,   
                    "is_verified": 1  
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

    @staticmethod
    def get_enhanced_user_profile(user_id, current_user_id=None):
        """Enhanced version of get_user_profile with additional profile fields and follow status"""
        db = current_app.config["DB"]
        
        try:
            # Get user basic info with new profile fields
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            # Count posts by this user
            posts_count = db.posts.count_documents({"user_id": user_id})
            
            # Count followers and following
            followers_count = db.follows.count_documents({"following_id": user_id})
            following_count = db.follows.count_documents({"follower_id": user_id})
            
            # Check if current user is following this user
            is_following = False
            if current_user_id and current_user_id != user_id:
                is_following = Follow.check_following_status(current_user_id, user_id)
            
            # Enhanced profile data with new fields including program
            profile = {
                "_id": str(user["_id"]),
                "username": user["username"],
                "email": user.get("email"),
                "full_name": user.get("full_name", ""),
                "bio": user.get("bio", ""),
                "profile_picture": user.get("profile_picture", ""),
                "website": user.get("website", ""),
                "location": user.get("location", ""),
                "program": user.get("program", ""),  # NEW: Add program field
                "is_verified": user.get("is_verified", False),
                "created_at": user["created_at"],
                "updated_at": user.get("updated_at"),
                "posts_count": posts_count,
                "followers_count": followers_count,
                "following_count": following_count,
                "is_following": is_following,
                "is_own_profile": str(current_user_id) == str(user_id) if current_user_id else False
            }
            
            return profile
            
        except Exception as e:
            print(f"Error getting enhanced user profile: {e}")
            return None

    @staticmethod
    def get_profile_with_recent_posts(user_id, current_user_id=None, posts_limit=6):
        """Get user profile with their recent posts"""
        try:
            # Get enhanced profile
            profile = User.get_enhanced_user_profile(user_id, current_user_id)
            if not profile:
                return None
            
            # Get recent posts (using your existing method)
            from posts.models import Post
            recent_posts = Post.get_user_posts(user_id, limit=posts_limit)
            
            # Add recent posts to profile
            profile['recent_posts'] = recent_posts
            
            return profile
            
        except Exception as e:
            print(f"Error getting profile with posts: {e}")
            return None

    @staticmethod
    def update_user_profile(user_id, profile_data):
        """Update user profile information"""
        db = current_app.config["DB"]
        
        try:
            # Define allowed fields for profile update - ADD 'program' here
            allowed_fields = ['full_name', 'bio', 'profile_picture', 'website', 'location', 'program']
            
            # Build update document with only allowed fields
            update_doc = {}
            for field in allowed_fields:
                if field in profile_data:
                    update_doc[field] = profile_data[field]
            
            if not update_doc:
                return {"error": "No valid fields to update"}
            
            # Add updated timestamp
            update_doc['updated_at'] = datetime.now()
            
            # Update user document
            result = db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_doc}
            )
            
            if result.modified_count > 0:
                # Return updated user profile
                updated_user = User.get_enhanced_user_profile(user_id, user_id)
                return {"success": True, "profile": updated_user}
            else:
                return {"error": "Failed to update profile"}
                
        except Exception as e:
            print(f"Error updating profile: {e}")
            return {"error": str(e)}
        
    @staticmethod
    def get_enhanced_user_profile_with_likes(user_id, current_user_id=None):
        """Enhanced user profile that includes liked posts count"""
        db = current_app.config["DB"]
        
        try:
            # Get user basic info with new profile fields
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            # Count posts by this user
            posts_count = db.posts.count_documents({"user_id": user_id})
            
            # Count followers and following
            followers_count = db.follows.count_documents({"following_id": user_id})
            following_count = db.follows.count_documents({"follower_id": user_id})
            
            # Count liked posts by this user
            liked_posts_count = db.likes.count_documents({
                "user_id": user_id,
                "type": "post"
            })
            
            # Check if current user is following this user
            is_following = False
            if current_user_id and current_user_id != user_id:
                is_following = Follow.check_following_status(current_user_id, user_id)
            
            # Enhanced profile data with liked posts count and program
            profile = {
                "_id": str(user["_id"]),
                "username": user["username"],
                "email": user.get("email"),
                "full_name": user.get("full_name", ""),
                "bio": user.get("bio", ""),
                "profile_picture": user.get("profile_picture", ""),
                "website": user.get("website", ""),
                "location": user.get("location", ""),
                "program": user.get("program", ""),  # NEW: Add program field
                "is_verified": user.get("is_verified", False),
                "created_at": user["created_at"],
                "updated_at": user.get("updated_at"),
                "posts_count": posts_count,
                "followers_count": followers_count,
                "following_count": following_count,
                "liked_posts_count": liked_posts_count,
                "is_following": is_following,
                "is_own_profile": str(current_user_id) == str(user_id) if current_user_id else False
            }
            
            return profile
            
        except Exception as e:
            print(f"Error getting enhanced user profile with likes: {e}")
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
    
    @staticmethod
    def get_mutual_followers(user_id, limit=50):
        """Get mutual followers (friends) for a user - SIMPLIFIED VERSION"""
        db = current_app.config["DB"]
        
        try:
            # Step 1: Get all users that the target user follows
            users_i_follow = db.follows.find({"follower_id": user_id})
            following_ids = [follow["following_id"] for follow in users_i_follow]
            
            if not following_ids:
                return []
            
            # Step 2: Find which of those users also follow the target user back
            mutual_friends = []
            for following_id in following_ids:
                # Check if this user also follows me back
                follows_me_back = db.follows.find_one({
                    "follower_id": following_id,
                    "following_id": user_id
                })
                
                if follows_me_back:
                    # Get user info
                    user_info = db.users.find_one({"_id": ObjectId(following_id)})
                    if user_info:
                        # Get the original follow date
                        original_follow = db.follows.find_one({
                            "follower_id": user_id,
                            "following_id": following_id
                        })
                        
                        friend_data = {
                            "_id": str(user_info["_id"]),
                            "username": user_info["username"],
                            "full_name": user_info.get("full_name", ""),
                            "profile_picture": user_info.get("profile_picture", ""),
                            "is_verified": user_info.get("is_verified", False),
                            "followed_at": original_follow["created_at"] if original_follow else None
                        }
                        mutual_friends.append(friend_data)
            
            # Sort by most recent follow relationship
            mutual_friends.sort(key=lambda x: x.get("followed_at") or datetime.min, reverse=True)
            
            # Limit results
            return mutual_friends[:limit]
            
        except Exception as e:
            print(f"Error getting mutual followers: {e}")
            import traceback
            traceback.print_exc()
            return []