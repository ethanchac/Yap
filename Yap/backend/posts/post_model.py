from bson import ObjectId
from datetime import datetime
import re

class Post:
    def __init__(self, db):
        self.collection = db.posts
        self.users_collection = db.users
    
    def create_post(self, author_id, content, is_thread=False, thread_posts=None):
        """Create a new post or thread"""
        try:
            if is_thread and thread_posts:
                return self._create_thread(author_id, thread_posts)
            else:
                return self._create_single_post(author_id, content)
        except Exception as e:
            return None, f"Error creating post: {str(e)}"
    
    def _create_single_post(self, author_id, content):
        """Create a single post"""
        # Extract hashtags and mentions
        hashtags = self._extract_hashtags(content)
        mentions = self._extract_mentions(content)
        
        post_doc = {
            "author_id": ObjectId(author_id),
            "content": content.strip(),
            "hashtags": hashtags,
            "mentions": mentions,
            "likes": [],
            "likes_count": 0,
            "reposts": [],
            "reposts_count": 0,
            "replies": [],
            "replies_count": 0,
            "is_thread": False,
            "thread_id": None,
            "thread_position": None,
            "parent_post_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_deleted": False
        }
        
        result = self.collection.insert_one(post_doc)
        post_doc['_id'] = result.inserted_id
        
        # Update user's post count
        self.users_collection.update_one(
            {"_id": ObjectId(author_id)},
            {"$inc": {"posts_count": 1}}
        )
        
        return self._serialize_post(post_doc), None
    
    def _create_thread(self, author_id, thread_posts):
        """Create a thread of posts"""
        thread_id = ObjectId()
        created_posts = []
        
        for i, post_content in enumerate(thread_posts):
            hashtags = self._extract_hashtags(post_content)
            mentions = self._extract_mentions(post_content)
            
            post_doc = {
                "author_id": ObjectId(author_id),
                "content": post_content.strip(),
                "hashtags": hashtags,
                "mentions": mentions,
                "likes": [],
                "likes_count": 0,
                "reposts": [],
                "reposts_count": 0,
                "replies": [],
                "replies_count": 0,
                "is_thread": True,
                "thread_id": thread_id,
                "thread_position": i,
                "parent_post_id": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_deleted": False
            }
            
            result = self.collection.insert_one(post_doc)
            post_doc['_id'] = result.inserted_id
            created_posts.append(self._serialize_post(post_doc))
        
        # Update user's post count (count thread as one post)
        self.users_collection.update_one(
            {"_id": ObjectId(author_id)},
            {"$inc": {"posts_count": 1}}
        )
        
        return created_posts, None
    
    def get_post_by_id(self, post_id):
        """Get a post by ID"""
        try:
            post = self.collection.find_one({
                "_id": ObjectId(post_id),
                "is_deleted": False
            })
            
            if post:
                return self._serialize_post(post)
            return None
        except Exception:
            return None
    
    def get_thread_posts(self, thread_id):
        """Get all posts in a thread"""
        try:
            posts = self.collection.find({
                "thread_id": ObjectId(thread_id),
                "is_deleted": False
            }).sort("thread_position", 1)
            
            return [self._serialize_post(post) for post in posts]
        except Exception:
            return []
    
    def get_user_posts(self, user_id, page=1, per_page=20):
        """Get posts by a specific user"""
        try:
            skip = (page - 1) * per_page
            
            # Get posts (including thread starters only)
            posts = self.collection.find({
                "author_id": ObjectId(user_id),
                "is_deleted": False,
                "$or": [
                    {"is_thread": False},
                    {"is_thread": True, "thread_position": 0}
                ]
            }).sort("created_at", -1).skip(skip).limit(per_page)
            
            serialized_posts = []
            for post in posts:
                if post.get('is_thread') and post.get('thread_position') == 0:
                    # Get all thread posts
                    thread_posts = self.get_thread_posts(post['thread_id'])
                    serialized_posts.append({
                        "type": "thread",
                        "posts": thread_posts
                    })
                else:
                    serialized_posts.append({
                        "type": "post",
                        "post": self._serialize_post(post)
                    })
            
            # Get total count
            total = self.collection.count_documents({
                "author_id": ObjectId(user_id),
                "is_deleted": False,
                "$or": [
                    {"is_thread": False},
                    {"is_thread": True, "thread_position": 0}
                ]
            })
            
            return serialized_posts, {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (total + per_page - 1) // per_page
            }
        except Exception as e:
            return [], {"error": str(e)}
    
    def get_timeline_posts(self, user_id, following_list, page=1, per_page=20):
        """Get timeline posts for a user"""
        try:
            skip = (page - 1) * per_page
            
            # Include user's own posts and posts from followed users
            author_ids = [ObjectId(user_id)] + [ObjectId(uid) for uid in following_list]
            
            posts = self.collection.find({
                "author_id": {"$in": author_ids},
                "is_deleted": False,
                "$or": [
                    {"is_thread": False},
                    {"is_thread": True, "thread_position": 0}
                ]
            }).sort("created_at", -1).skip(skip).limit(per_page)
            
            serialized_posts = []
            for post in posts:
                if post.get('is_thread') and post.get('thread_position') == 0:
                    thread_posts = self.get_thread_posts(post['thread_id'])
                    serialized_posts.append({
                        "type": "thread",
                        "posts": thread_posts
                    })
                else:
                    serialized_posts.append({
                        "type": "post",
                        "post": self._serialize_post(post)
                    })
            
            return serialized_posts, None
        except Exception as e:
            return [], str(e)
    
    def like_post(self, post_id, user_id):
        """Like a post"""
        try:
            result = self.collection.update_one(
                {
                    "_id": ObjectId(post_id),
                    "likes": {"$ne": ObjectId(user_id)}
                },
                {
                    "$push": {"likes": ObjectId(user_id)},
                    "$inc": {"likes_count": 1}
                }
            )
            return result.modified_count > 0, None
        except Exception as e:
            return False, str(e)
    
    def unlike_post(self, post_id, user_id):
        """Unlike a post"""
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(post_id)},
                {
                    "$pull": {"likes": ObjectId(user_id)},
                    "$inc": {"likes_count": -1}
                }
            )
            return result.modified_count > 0, None
        except Exception as e:
            return False, str(e)
    
    def repost(self, post_id, user_id):
        """Repost a post"""
        try:
            # Check if already reposted
            existing_repost = self.collection.find_one({
                "author_id": ObjectId(user_id),
                "parent_post_id": ObjectId(post_id),
                "is_deleted": False
            })
            
            if existing_repost:
                return None, "Already reposted"
            
            # Get original post
            original_post = self.get_post_by_id(post_id)
            if not original_post:
                return None, "Original post not found"
            
            # Create repost
            repost_doc = {
                "author_id": ObjectId(user_id),
                "content": "",
                "hashtags": [],
                "mentions": [],
                "likes": [],
                "likes_count": 0,
                "reposts": [],
                "reposts_count": 0,
                "replies": [],
                "replies_count": 0,
                "is_thread": False,
                "thread_id": None,
                "thread_position": None,
                "parent_post_id": ObjectId(post_id),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_deleted": False
            }
            
            result = self.collection.insert_one(repost_doc)
            
            # Update original post's repost count
            self.collection.update_one(
                {"_id": ObjectId(post_id)},
                {
                    "$push": {"reposts": ObjectId(user_id)},
                    "$inc": {"reposts_count": 1}
                }
            )
            
            # Update user's post count
            self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": {"posts_count": 1}}
            )
            
            repost_doc['_id'] = result.inserted_id
            return self._serialize_post(repost_doc), None
            
        except Exception as e:
            return None, str(e)
    
    def delete_post(self, post_id, user_id):
        """Delete a post (soft delete)"""
        try:
            result = self.collection.update_one(
                {
                    "_id": ObjectId(post_id),
                    "author_id": ObjectId(user_id)
                },
                {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                # Update user's post count
                self.users_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$inc": {"posts_count": -1}}
                )
                return True, None
            
            return False, "Post not found or unauthorized"
        except Exception as e:
            return False, str(e)
    
    def _extract_hashtags(self, text):
        """Extract hashtags from text"""
        hashtag_pattern = r'#([a-zA-Z0-9_]+)'
        hashtags = re.findall(hashtag_pattern, text)
        return list(set([tag.lower() for tag in hashtags]))
    
    def _extract_mentions(self, text):
        """Extract mentions from text"""
        mention_pattern = r'@([a-zA-Z0-9_]+)'
        mentions = re.findall(mention_pattern, text)
        return list(set(mentions))
    
    def _serialize_post(self, post):
        """Convert post document to serializable format"""
        return {
            "id": str(post['_id']),
            "author_id": str(post['author_id']),
            "content": post['content'],
            "hashtags": post['hashtags'],
            "mentions": post['mentions'],
            "likes_count": post['likes_count'],
            "reposts_count": post['reposts_count'],
            "replies_count": post['replies_count'],
            "is_thread": post['is_thread'],
            "thread_id": str(post['thread_id']) if post['thread_id'] else None,
            "thread_position": post['thread_position'],
            "parent_post_id": str(post['parent_post_id']) if post['parent_post_id'] else None,
            "created_at": post['created_at'].isoformat(),
            "updated_at": post['updated_at'].isoformat()
        }