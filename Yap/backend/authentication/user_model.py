from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from datetime import datetime
import re

class User:
    def __init__(self, db):
        self.collection = db.users
    
    def create_user(self, username, password, full_name=None):
        """Create a new user"""
        # Validate input
        if not self._validate_username(username):
            return None, "Username must be 3-20 characters, alphanumeric and underscores only"
        
        if len(password) < 6:
            return None, "Password must be at least 6 characters long"
        
        # Check if user already exists
        if self.collection.find_one({"username": username}):
            return None, "Username already exists"
        
        # Create user document
        user_doc = {
            "username": username,
            "password_hash": generate_password_hash(password),
            "full_name": full_name or username,
            "bio": "",
            "profile_image": None,
            "followers": [],
            "following": [],
            "followers_count": 0,
            "following_count": 0,
            "posts_count": 0,
            "created_at": datetime.utcnow(),
            "is_verified": False,
            "is_active": True
        }
        
        try:
            result = self.collection.insert_one(user_doc)
            user_doc['_id'] = result.inserted_id
            return self._serialize_user(user_doc), None
        except Exception as e:
            return None, f"Error creating user: {str(e)}"
    
    def authenticate_user(self, username, password):
        """Authenticate user with username and password"""
        # Find user by username
        user = self.collection.find_one({
            "username": username,
            "is_active": True
        })
        
        if not user:
            return None, "User not found"
        
        if not check_password_hash(user['password_hash'], password):
            return None, "Invalid password"
        
        return self._serialize_user(user), None
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        try:
            user = self.collection.find_one({"_id": ObjectId(user_id), "is_active": True})
            if user:
                return self._serialize_user(user)
            return None
        except Exception:
            return None
    
    def get_user_by_username(self, username):
        """Get user by username"""
        user = self.collection.find_one({"username": username, "is_active": True})
        if user:
            return self._serialize_user(user)
        return None
    
    def update_user_profile(self, user_id, update_data):
        """Update user profile"""
        allowed_fields = ['full_name', 'bio', 'profile_image']
        update_doc = {}
        
        for field in allowed_fields:
            if field in update_data:
                update_doc[field] = update_data[field]
        
        if not update_doc:
            return None, "No valid fields to update"
        
        update_doc['updated_at'] = datetime.utcnow()
        
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_doc}
            )
            
            if result.modified_count:
                return self.get_user_by_id(user_id), None
            return None, "User not found or no changes made"
        except Exception as e:
            return None, f"Error updating profile: {str(e)}"
    
    def follow_user(self, follower_id, following_id):
        """Follow a user"""
        if follower_id == following_id:
            return False, "Cannot follow yourself"
        
        try:
            # Add to follower's following list
            follower_result = self.collection.update_one(
                {
                    "_id": ObjectId(follower_id),
                    "following": {"$ne": ObjectId(following_id)}
                },
                {
                    "$push": {"following": ObjectId(following_id)},
                    "$inc": {"following_count": 1}
                }
            )
            
            # Add to following user's followers list
            following_result = self.collection.update_one(
                {
                    "_id": ObjectId(following_id),
                    "followers": {"$ne": ObjectId(follower_id)}
                },
                {
                    "$push": {"followers": ObjectId(follower_id)},
                    "$inc": {"followers_count": 1}
                }
            )
            
            return follower_result.modified_count > 0, None
        except Exception as e:
            return False, f"Error following user: {str(e)}"
    
    def unfollow_user(self, follower_id, following_id):
        """Unfollow a user"""
        try:
            # Remove from follower's following list
            follower_result = self.collection.update_one(
                {"_id": ObjectId(follower_id)},
                {
                    "$pull": {"following": ObjectId(following_id)},
                    "$inc": {"following_count": -1}
                }
            )
            
            # Remove from following user's followers list
            following_result = self.collection.update_one(
                {"_id": ObjectId(following_id)},
                {
                    "$pull": {"followers": ObjectId(follower_id)},
                    "$inc": {"followers_count": -1}
                }
            )
            
            return follower_result.modified_count > 0, None
        except Exception as e:
            return False, f"Error unfollowing user: {str(e)}"
    
    def _serialize_user(self, user):
        """Convert user document to serializable format"""
        return {
            "id": str(user['_id']),
            "username": user['username'],
            "full_name": user['full_name'],
            "bio": user['bio'],
            "profile_image": user['profile_image'],
            "followers_count": user['followers_count'],
            "following_count": user['following_count'],
            "posts_count": user['posts_count'],
            "created_at": user['created_at'].isoformat(),
            "is_verified": user['is_verified']
        }
    
    def _validate_username(self, username):
        """Validate username format"""
        if len(username) < 3 or len(username) > 20:
            return False
        pattern = r'^[a-zA-Z0-9_]+'
        return re.match(pattern, username) is not None