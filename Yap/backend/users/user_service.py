from authentication.user_model import User
from bson import ObjectId

class UserService:
    """Business logic for user operations"""
    
    def __init__(self, db):
        self.db = db
        self.user_model = User(db)
    
    def get_user_profile(self, username, current_user_id=None):
        """Get user profile with relationship status"""
        user = self.user_model.get_user_by_username(username)
        if not user:
            return None, "User not found"
        
        # Add relationship status if current user is provided
        if current_user_id:
            user['relationship_status'] = self._get_relationship_status(
                current_user_id, user['id']
            )
        
        return user, None
    
    def update_profile(self, user_id, update_data):
        """Update user profile with validation"""
        from shared.validators import UserValidator, ValidationError
        
        try:
            # Validate update data
            validated_data = {}
            
            if 'full_name' in update_data:
                validated_data['full_name'] = UserValidator.validate_full_name(
                    update_data['full_name']
                )
            
            if 'bio' in update_data:
                validated_data['bio'] = UserValidator.validate_bio(
                    update_data['bio']
                )
            
            if 'profile_image' in update_data:
                validated_data['profile_image'] = update_data['profile_image']
            
            if not validated_data:
                return None, "No valid fields to update"
            
            return self.user_model.update_user_profile(user_id, validated_data)
            
        except ValidationError as e:
            return None, str(e)
        except Exception as e:
            return None, f"Error updating profile: {str(e)}"
    
    def follow_user(self, follower_id, username_to_follow):
        """Follow a user by username"""
        # Get the user to follow
        user_to_follow = self.user_model.get_user_by_username(username_to_follow)
        if not user_to_follow:
            return False, "User not found"
        
        following_id = user_to_follow['id']
        
        # Check if already following
        if self._is_following(follower_id, following_id):
            return False, "Already following this user"
        
        return self.user_model.follow_user(follower_id, following_id)
    
    def unfollow_user(self, follower_id, username_to_unfollow):
        """Unfollow a user by username"""
        # Get the user to unfollow
        user_to_unfollow = self.user_model.get_user_by_username(username_to_unfollow)
        if not user_to_unfollow:
            return False, "User not found"
        
        following_id = user_to_unfollow['id']
        
        # Check if actually following
        if not self._is_following(follower_id, following_id):
            return False, "Not following this user"
        
        return self.user_model.unfollow_user(follower_id, following_id)
    
    def get_followers(self, user_id, page=1, per_page=20):
        """Get user's followers with pagination"""
        try:
            skip = (page - 1) * per_page
            
            # Get user document to access followers array
            user_doc = self.db.users.find_one({"_id": ObjectId(user_id)})
            if not user_doc:
                return [], {"error": "User not found"}
            
            follower_ids = user_doc.get('followers', [])
            total_followers = len(follower_ids)
            
            # Paginate follower IDs
            paginated_ids = follower_ids[skip:skip + per_page]
            
            # Get follower user documents
            followers = []
            for follower_id in paginated_ids:
                follower = self.user_model.get_user_by_id(str(follower_id))
                if follower:
                    followers.append(follower)
            
            pagination = {
                "page": page,
                "per_page": per_page,
                "total": total_followers,
                "total_pages": (total_followers + per_page - 1) // per_page,
                "has_next": page * per_page < total_followers,
                "has_prev": page > 1
            }
            
            return followers, pagination
            
        except Exception as e:
            return [], {"error": str(e)}
    
    def get_following(self, user_id, page=1, per_page=20):
        """Get users that this user is following with pagination"""
        try:
            skip = (page - 1) * per_page
            
            # Get user document to access following array
            user_doc = self.db.users.find_one({"_id": ObjectId(user_id)})
            if not user_doc:
                return [], {"error": "User not found"}
            
            following_ids = user_doc.get('following', [])
            total_following = len(following_ids)
            
            # Paginate following IDs
            paginated_ids = following_ids[skip:skip + per_page]
            
            # Get following user documents
            following = []
            for following_id in paginated_ids:
                user = self.user_model.get_user_by_id(str(following_id))
                if user:
                    following.append(user)
            
            pagination = {
                "page": page,
                "per_page": per_page,
                "total": total_following,
                "total_pages": (total_following + per_page - 1) // per_page,
                "has_next": page * per_page < total_following,
                "has_prev": page > 1
            }
            
            return following, pagination
            
        except Exception as e:
            return [], {"error": str(e)}
    
    def search_users(self, query, page=1, per_page=20):
        """Search users by username or full name"""
        try:
            skip = (page - 1) * per_page
            
            # Create search filter
            search_filter = {
                "is_active": True,
                "$or": [
                    {"username": {"$regex": query, "$options": "i"}},
                    {"full_name": {"$regex": query, "$options": "i"}}
                ]
            }
            
            # Get total count
            total = self.db.users.count_documents(search_filter)
            
            # Get paginated results
            users_cursor = self.db.users.find(search_filter).skip(skip).limit(per_page)
            
            users = []
            for user_doc in users_cursor:
                user = self.user_model._serialize_user(user_doc)
                users.append(user)
            
            pagination = {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (total + per_page - 1) // per_page,
                "has_next": page * per_page < total,
                "has_prev": page > 1
            }
            
            return users, pagination
            
        except Exception as e:
            return [], {"error": str(e)}
    
    def get_suggested_users(self, user_id, limit=10):
        """Get suggested users to follow (users not currently followed)"""
        try:
            # Get current user's following list
            user_doc = self.db.users.find_one({"_id": ObjectId(user_id)})
            if not user_doc:
                return [], "User not found"
            
            following_ids = user_doc.get('following', [])
            following_ids.append(ObjectId(user_id))  # Don't suggest self
            
            # Find users not in following list, ordered by followers count
            suggested_users_cursor = self.db.users.find({
                "_id": {"$nin": following_ids},
                "is_active": True
            }).sort("followers_count", -1).limit(limit)
            
            suggested_users = []
            for user_doc in suggested_users_cursor:
                user = self.user_model._serialize_user(user_doc)
                suggested_users.append(user)
            
            return suggested_users, None
            
        except Exception as e:
            return [], str(e)
    
    def get_user_stats(self, user_id):
        """Get detailed user statistics"""
        try:
            user = self.user_model.get_user_by_id(user_id)
            if not user:
                return None, "User not found"
            
            # Get additional stats from posts
            posts_stats = self.db.posts.aggregate([
                {"$match": {"author_id": ObjectId(user_id), "is_deleted": False}},
                {"$group": {
                    "_id": None,
                    "total_likes": {"$sum": "$likes_count"},
                    "total_reposts": {"$sum": "$reposts_count"},
                    "total_replies": {"$sum": "$replies_count"}
                }}
            ])
            
            stats_result = list(posts_stats)
            if stats_result:
                stats = stats_result[0]
                user['total_likes_received'] = stats.get('total_likes', 0)
                user['total_reposts_received'] = stats.get('total_reposts', 0)
                user['total_replies_received'] = stats.get('total_replies', 0)
            else:
                user['total_likes_received'] = 0
                user['total_reposts_received'] = 0
                user['total_replies_received'] = 0
            
            return user, None
            
        except Exception as e:
            return None, str(e)
    
    def _is_following(self, follower_id, following_id):
        """Check if follower is following the user"""
        try:
            user_doc = self.db.users.find_one({
                "_id": ObjectId(follower_id),
                "following": ObjectId(following_id)
            })
            return user_doc is not None
        except Exception:
            return False
    
    def _get_relationship_status(self, current_user_id, target_user_id):
        """Get relationship status between current user and target user"""
        if current_user_id == target_user_id:
            return "self"
        
        is_following = self._is_following(current_user_id, target_user_id)
        is_followed_by = self._is_following(target_user_id, current_user_id)
        
        if is_following and is_followed_by:
            return "mutual"
        elif is_following:
            return "following"
        elif is_followed_by:
            return "followed_by"
        else:
            return "none"