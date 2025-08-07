from datetime import datetime
from bson import ObjectId
from flask import current_app

class Waypoint:
    @staticmethod
    def create_waypoint(user_id, username, title, description, waypoint_type, latitude, longitude, expires_at=None):
        """Create a new waypoint"""
        db = current_app.config["DB"]
        
        waypoint_doc = {
            "user_id": user_id,
            "username": username,
            "title": title,
            "description": description,
            "type": waypoint_type,  # 'food', 'study', 'group', etc.
            "location": {
                "type": "Point",
                "coordinates": [longitude, latitude]  # GeoJSON format [lng, lat]
            },
            "latitude": latitude,   # For easier queries
            "longitude": longitude,
            "active": True,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,  # Optional expiration
            "interactions": {
                "likes": 0,
                "joins": 0,
                "views": 0,
                "bookmarks": 0  # Add bookmarks count
            },
            "joined_users": [],  # List of user IDs who joined
            "liked_users": [],   # List of user IDs who liked
            "bookmarked_users": []  # Add list of user IDs who bookmarked
        }
        
        result = db.waypoint.insert_one(waypoint_doc)
        waypoint_doc["_id"] = str(result.inserted_id)
        
        return waypoint_doc
    
    @staticmethod
    def cleanup_expired_waypoints():
        """Remove expired waypoints and past event waypoints from the database"""
        db = current_app.config["DB"]
        
        try:
            deleted_count = 0
            
            # 1. Delete waypoints that have explicit expiration dates that have passed
            result1 = db.waypoint.delete_many({
                "expires_at": {"$lt": datetime.utcnow()}
            })
            deleted_count += result1.deleted_count
            
            # 2. Delete event waypoints that are past their event time
            # Look for event waypoints with event info in title/description
            event_waypoints = db.waypoint.find({
                "$or": [
                    {"type": "event"},
                    {"title": {"$regex": "^📅", "$options": "i"}},
                    {"description": {"$regex": "Event on", "$options": "i"}}
                ]
            })
            
            for waypoint in event_waypoints:
                # Try to extract event datetime from description
                description = waypoint.get("description", "")
                
                # Look for patterns like "Event on 2024-12-15 at 14:30"
                import re
                date_time_pattern = r"Event on (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})"
                match = re.search(date_time_pattern, description)
                
                if match:
                    try:
                        event_date = match.group(1)
                        event_time = match.group(2)
                        event_datetime_str = f"{event_date} {event_time}"
                        event_datetime = datetime.strptime(event_datetime_str, "%Y-%m-%d %H:%M")
                        
                        # If event is in the past, delete the waypoint
                        if event_datetime <= datetime.utcnow():
                            result2 = db.waypoint.delete_one({"_id": waypoint["_id"]})
                            if result2.deleted_count > 0:
                                deleted_count += 1
                                print(f"Deleted past event waypoint: {waypoint.get('title', 'Unknown')}")
                    except ValueError as e:
                        print(f"Error parsing event datetime for waypoint {waypoint.get('_id')}: {e}")
                        continue
            
            if deleted_count > 0:
                print(f"Cleaned up {deleted_count} expired/past event waypoints")
            
            return deleted_count
        except Exception as e:
            print(f"Error cleaning up expired waypoints: {e}")
            return 0
    
    @staticmethod
    def get_waypoints_in_area(center_lat, center_lng, radius_km=5, limit=50, skip=0):
        """Get waypoints within a certain radius of a point, excluding expired and past event waypoints"""
        db = current_app.config["DB"]
        
        try:
            # First, cleanup expired and past event waypoints
            Waypoint.cleanup_expired_waypoints()
            
            # Create geospatial query
            pipeline = [
                {
                    "$geoNear": {
                        "near": {
                            "type": "Point",
                            "coordinates": [center_lng, center_lat]
                        },
                        "distanceField": "distance",
                        "maxDistance": radius_km * 1000,  # Convert km to meters
                        "spherical": True,
                        "query": {"active": True}  # Only active waypoints
                    }
                },
                {
                    "$match": {
                        # Filter out expired waypoints
                        "$or": [
                            {"expires_at": None},
                            {"expires_at": {"$gt": datetime.utcnow()}}
                        ]
                    }
                },
                # Join with users to get profile info
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
                        "title": 1,
                        "description": 1,
                        "type": 1,
                        "latitude": 1,
                        "longitude": 1,
                        "created_at": 1,
                        "expires_at": 1,
                        "interactions": 1,
                        "distance": 1,  # Distance in meters
                        "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]},
                        "is_verified": {"$ifNull": ["$user_info.is_verified", False]},
                        "joined_users": 1,
                        "liked_users": 1,
                        "bookmarked_users": 1  # Include bookmarked users for status checking
                    }
                },
                {"$sort": {"distance": 1, "created_at": -1}},
                {"$skip": skip},
                {"$limit": limit}
            ]
            
            waypoints = list(db.waypoint.aggregate(pipeline))
            
            # Convert distance to km and add time ago
            for waypoint in waypoints:
                waypoint["distance_km"] = round(waypoint["distance"] / 1000, 2)
                waypoint["time_ago"] = Waypoint._calculate_time_ago(waypoint["created_at"])
            
            return waypoints
            
        except Exception as e:
            print(f"Error getting waypoints in area: {e}")
            return []
    
    @staticmethod
    def get_waypoint_by_id(waypoint_id):
        """Get a single waypoint by ID"""
        db = current_app.config["DB"]
        
        try:
            pipeline = [
                {"$match": {"_id": ObjectId(waypoint_id)}},
                # Join with users to get profile info
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
                        "title": 1,
                        "description": 1,
                        "type": 1,
                        "latitude": 1,
                        "longitude": 1,
                        "created_at": 1,
                        "expires_at": 1,
                        "interactions": 1,
                        "joined_users": 1,
                        "liked_users": 1,
                        "bookmarked_users": 1,  # Include bookmarked users
                        "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]},
                        "is_verified": {"$ifNull": ["$user_info.is_verified", False]}
                    }
                }
            ]
            
            result = list(db.waypoint.aggregate(pipeline))
            if result:
                waypoint = result[0]
                waypoint["time_ago"] = Waypoint._calculate_time_ago(waypoint["created_at"])
                return waypoint
            
            return None
            
        except Exception as e:
            print(f"Error getting waypoint by ID: {e}")
            return None
    
    @staticmethod
    def join_waypoint(waypoint_id, user_id):
        """Join or leave a waypoint"""
        db = current_app.config["DB"]
        
        try:
            waypoint = db.waypoint.find_one({"_id": ObjectId(waypoint_id)})
            if not waypoint:
                return {"error": "Waypoint not found"}
            
            joined_users = waypoint.get("joined_users", [])
            
            if user_id in joined_users:
                # Leave waypoint
                db.waypoint.update_one(
                    {"_id": ObjectId(waypoint_id)},
                    {
                        "$pull": {"joined_users": user_id},
                        "$inc": {"interactions.joins": -1}
                    }
                )
                return {"joined": False, "message": "Left waypoint"}
            else:
                # Join waypoint
                db.waypoint.update_one(
                    {"_id": ObjectId(waypoint_id)},
                    {
                        "$addToSet": {"joined_users": user_id},
                        "$inc": {"interactions.joins": 1}
                    }
                )
                return {"joined": True, "message": "Joined waypoint"}
                
        except Exception as e:
            print(f"Error joining waypoint: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def like_waypoint(waypoint_id, user_id):
        """Like or unlike a waypoint"""
        db = current_app.config["DB"]
        
        try:
            waypoint = db.waypoint.find_one({"_id": ObjectId(waypoint_id)})
            if not waypoint:
                return {"error": "Waypoint not found"}
            
            liked_users = waypoint.get("liked_users", [])
            
            if user_id in liked_users:
                # Unlike waypoint
                db.waypoint.update_one(
                    {"_id": ObjectId(waypoint_id)},
                    {
                        "$pull": {"liked_users": user_id},
                        "$inc": {"interactions.likes": -1}
                    }
                )
                return {"liked": False, "message": "Unliked waypoint"}
            else:
                # Like waypoint
                db.waypoint.update_one(
                    {"_id": ObjectId(waypoint_id)},
                    {
                        "$addToSet": {"liked_users": user_id},
                        "$inc": {"interactions.likes": 1}
                    }
                )
                return {"liked": True, "message": "Liked waypoint"}
                
        except Exception as e:
            print(f"Error liking waypoint: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def bookmark_waypoint(waypoint_id, user_id):
        """Bookmark or unbookmark a waypoint"""
        db = current_app.config["DB"]
        
        try:
            waypoint = db.waypoint.find_one({"_id": ObjectId(waypoint_id)})
            if not waypoint:
                return {"error": "Waypoint not found"}
            
            bookmarked_users = waypoint.get("bookmarked_users", [])
            
            if user_id in bookmarked_users:
                # Unbookmark waypoint
                db.waypoint.update_one(
                    {"_id": ObjectId(waypoint_id)},
                    {
                        "$pull": {"bookmarked_users": user_id},
                        "$inc": {"interactions.bookmarks": -1}
                    }
                )
                return {"bookmarked": False, "message": "Removed bookmark"}
            else:
                # Bookmark waypoint
                db.waypoint.update_one(
                    {"_id": ObjectId(waypoint_id)},
                    {
                        "$addToSet": {"bookmarked_users": user_id},
                        "$inc": {"interactions.bookmarks": 1}
                    }
                )
                return {"bookmarked": True, "message": "Bookmarked waypoint"}
                
        except Exception as e:
            print(f"Error bookmarking waypoint: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def delete_waypoint(waypoint_id, user_id):
        """Delete a waypoint (only by owner)"""
        db = current_app.config["DB"]
        
        try:
            waypoint = db.waypoint.find_one({"_id": ObjectId(waypoint_id)})
            if not waypoint:
                return {"error": "Waypoint not found"}
            
            if waypoint["user_id"] != user_id:
                return {"error": "You can only delete your own waypoints"}
            
            result = db.waypoint.delete_one({"_id": ObjectId(waypoint_id)})
            
            if result.deleted_count > 0:
                return {"success": True, "message": "Waypoint deleted"}
            else:
                return {"error": "Failed to delete waypoint"}
                
        except Exception as e:
            print(f"Error deleting waypoint: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def get_user_waypoints(user_id, limit=50, skip=0):
        """Get waypoints created by a specific user"""
        db = current_app.config["DB"]
        
        try:
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$sort": {"created_at": -1}},
                {"$skip": skip},
                {"$limit": limit},
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "title": 1,
                        "description": 1,
                        "type": 1,
                        "latitude": 1,
                        "longitude": 1,
                        "created_at": 1,
                        "expires_at": 1,
                        "interactions": 1,
                        "active": 1
                    }
                }
            ]
            
            waypoints = list(db.waypoint.aggregate(pipeline))
            
            # Add time ago
            for waypoint in waypoints:
                waypoint["time_ago"] = Waypoint._calculate_time_ago(waypoint["created_at"])
            
            return waypoints
            
        except Exception as e:
            print(f"Error getting user waypoints: {e}")
            return []
    
    @staticmethod
    def get_user_bookmarked_waypoints(user_id, limit=50, skip=0):
        """Get waypoints bookmarked by a specific user"""
        db = current_app.config["DB"]
        
        try:
            # First cleanup expired waypoints
            Waypoint.cleanup_expired_waypoints()
            
            pipeline = [
                {"$match": {"bookmarked_users": user_id, "active": True}},
                {
                    "$match": {
                        # Filter out expired waypoints
                        "$or": [
                            {"expires_at": None},
                            {"expires_at": {"$gt": datetime.utcnow()}}
                        ]
                    }
                },
                {"$sort": {"created_at": -1}},
                {"$skip": skip},
                {"$limit": limit},
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "title": 1,
                        "description": 1,
                        "type": 1,
                        "latitude": 1,
                        "longitude": 1,
                        "created_at": 1,
                        "expires_at": 1,
                        "interactions": 1,
                        "username": 1
                    }
                }
            ]
            
            waypoints = list(db.waypoint.aggregate(pipeline))
            
            # Add time ago
            for waypoint in waypoints:
                waypoint["time_ago"] = Waypoint._calculate_time_ago(waypoint["created_at"])
            
            return waypoints
            
        except Exception as e:
            print(f"Error getting user bookmarked waypoints: {e}")
            return []
    
    @staticmethod
    def increment_view(waypoint_id):
        """Increment view count for a waypoint"""
        db = current_app.config["DB"]
        
        try:
            db.waypoint.update_one(
                {"_id": ObjectId(waypoint_id)},
                {"$inc": {"interactions.views": 1}}
            )
        except Exception as e:
            print(f"Error incrementing view: {e}")
    
    @staticmethod
    def _calculate_time_ago(created_at):
        """Calculate human-readable time ago"""
        now = datetime.utcnow()
        diff = now - created_at
        
        if diff.days > 0:
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hours ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "just now"