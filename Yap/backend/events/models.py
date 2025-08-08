from datetime import datetime
from bson import ObjectId
from flask import current_app

class Event:
    @staticmethod
    def create_event(user_id, username, title, description, event_date, event_time, location=None, location_title=None, max_attendees=None):
        """Create a new event"""
        db = current_app.config["DB"]
        
        # Parse event_date and event_time into a datetime object
        try:
            # Combine date and time strings into datetime
            event_datetime_str = f"{event_date} {event_time}"
            event_datetime = datetime.strptime(event_datetime_str, "%Y-%m-%d %H:%M")
        except ValueError as e:
            raise ValueError(f"Invalid date or time format: {e}")
        
        # Create the event document
        event_doc = {
            "user_id": user_id,
            "username": username,
            "title": title,
            "description": description,
            "event_datetime": event_datetime,
            "location": location,
            "location_title": location_title,  # Add the new field
            "max_attendees": max_attendees,
            "created_at": datetime.utcnow(),
            "attendees_count": 0,
            "likes_count": 0,
            "comments_count": 0,
            "is_active": True  # Events can be cancelled
        }
        
        # Insert into events collection
        result = db.events.insert_one(event_doc)
        
        # Return the created event with its ID
        event_doc["_id"] = str(result.inserted_id)
        return event_doc
    
    @staticmethod
    def get_all_events(limit=50, skip=0, include_past=False):
        """Get all events with pagination and profile pictures"""
        db = current_app.config["DB"]
        
        # Base match condition
        match_condition = {"is_active": True}
        
        # Filter out past events if not requested
        if not include_past:
            match_condition["event_datetime"] = {"$gte": datetime.utcnow()}
        
        try:
            # First try the aggregation pipeline approach
            pipeline = [
                {"$match": match_condition},
                {
                    "$addFields": {
                        "user_object_id": {
                            "$cond": {
                                "if": {"$type": ["$user_id", "objectId"]},
                                "then": "$user_id",
                                "else": {"$toObjectId": "$user_id"}
                            }
                        }
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
                    "$addFields": {
                        "user_info": {"$arrayElemAt": ["$user_info", 0]}
                    }
                },
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "user_id": {"$toString": "$user_id"},
                        "username": {"$ifNull": ["$user_info.username", "$username"]},
                        "title": 1,
                        "description": 1,
                        "event_datetime": 1,
                        "location": 1,
                        "max_attendees": 1,
                        "created_at": 1,
                        "attendees_count": {"$ifNull": ["$attendees_count", 0]},
                        "likes_count": {"$ifNull": ["$likes_count", 0]},
                        "comments_count": {"$ifNull": ["$comments_count", 0]},
                        "is_active": 1,
                        "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                    }
                },
                {"$sort": {"event_datetime": 1}},  # Sort by event date (upcoming first)
                {"$skip": skip},
                {"$limit": limit}
            ]
            
            events = list(db.events.aggregate(pipeline))
            
            # If aggregation returns no results, fall back to simple find
            if not events:
                print("Aggregation returned no results, trying simple find...")
                cursor = db.events.find(match_condition).sort("event_datetime", 1).skip(skip).limit(limit)
                events = []
                for event in cursor:
                    event["_id"] = str(event["_id"])
                    event["user_id"] = str(event["user_id"]) if event.get("user_id") else None
                    event["attendees_count"] = event.get("attendees_count", 0)
                    event["likes_count"] = event.get("likes_count", 0)
                    event["comments_count"] = event.get("comments_count", 0)
                    events.append(event)
            
            print(f"Found {len(events)} events")
            return events
            
        except Exception as e:
            print(f"Error in aggregation pipeline: {e}")
            # Fallback to simple query
            try:
                cursor = db.events.find(match_condition).sort("event_datetime", 1).skip(skip).limit(limit)
                events = []
                for event in cursor:
                    event["_id"] = str(event["_id"])
                    event["user_id"] = str(event["user_id"]) if event.get("user_id") else None
                    event["attendees_count"] = event.get("attendees_count", 0)
                    event["likes_count"] = event.get("likes_count", 0)
                    event["comments_count"] = event.get("comments_count", 0)
                    events.append(event)
                
                print(f"Fallback query found {len(events)} events")
                return events
            except Exception as fallback_error:
                print(f"Fallback query also failed: {fallback_error}")
                return []
    
    @staticmethod
    def get_user_events(user_id, limit=50, skip=0, include_past=False):
        """Get events created by a specific user"""
        db = current_app.config["DB"]
        
        # Base match condition
        match_condition = {"user_id": user_id, "is_active": True}
        
        # Filter out past events if not requested
        if not include_past:
            match_condition["event_datetime"] = {"$gte": datetime.utcnow()}
        
        try:
            cursor = db.events.find(match_condition).sort("event_datetime", 1).skip(skip).limit(limit)
            events = []
            for event in cursor:
                event["_id"] = str(event["_id"])
                event["user_id"] = str(event["user_id"]) if event.get("user_id") else None
                event["attendees_count"] = event.get("attendees_count", 0)
                event["likes_count"] = event.get("likes_count", 0)
                event["comments_count"] = event.get("comments_count", 0)
                events.append(event)
            
            return events
        except Exception as e:
            print(f"Error getting user events: {e}")
            return []
    
    @staticmethod
    def get_event_by_id(event_id):
        """Get a single event by ID with profile picture"""
        db = current_app.config["DB"]
        
        try:
            print(f"Looking for event with ID: {event_id}")
            
            event = None
            
            # First try with ObjectId
            try:
                event = db.events.find_one({"_id": ObjectId(event_id)})
                if event:
                    print(f"Found event with ObjectId")
            except Exception as e:
                print(f"ObjectId lookup failed: {e}")
            
            # If not found with ObjectId, try with string ID
            if not event:
                try:
                    event = db.events.find_one({"_id": event_id})
                    if event:
                        print(f"Found event with string ID")
                except Exception as e:
                    print(f"String ID lookup failed: {e}")
            
            if event:
                # Convert IDs to strings and ensure required fields exist
                event["_id"] = str(event["_id"])
                event["user_id"] = str(event["user_id"]) if event.get("user_id") else None
                event["attendees_count"] = event.get("attendees_count", 0)
                event["likes_count"] = event.get("likes_count", 0)
                event["comments_count"] = event.get("comments_count", 0)
                
                print(f"Successfully found event: {event['title']}")
                return event
            else:
                print(f"Event not found: {event_id}")
                return None
                
        except Exception as e:
            print(f"Error getting event by ID: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def like_event(event_id, user_id):
        """Like or unlike an event"""
        db = current_app.config["DB"]
        
        try:
            print(f"Attempting to like/unlike event {event_id} by user {user_id}")
            
            # Check if user already liked this event
            existing_like = db.likes.find_one({
                "post_id": event_id,  # Using post_id field for consistency
                "user_id": user_id,
                "type": "event"
            })
            
            print(f"Existing like found: {existing_like is not None}")
            
            if existing_like:
                # Unlike - remove like and decrement count
                db.likes.delete_one({"_id": existing_like["_id"]})
                
                # Update event like count
                try:
                    db.events.update_one(
                        {"_id": ObjectId(event_id)},
                        {"$inc": {"likes_count": -1}}
                    )
                except:
                    db.events.update_one(
                        {"_id": event_id},
                        {"$inc": {"likes_count": -1}}
                    )
                    
                print("Event unliked successfully")
                return {"liked": False, "message": "Event unliked"}
            else:
                # Like - add like and increment count
                like_doc = {
                    "post_id": event_id,  # Using post_id field for consistency
                    "user_id": user_id,
                    "type": "event",
                    "created_at": datetime.utcnow()
                }
                db.likes.insert_one(like_doc)
                
                # Update event like count
                try:
                    db.events.update_one(
                        {"_id": ObjectId(event_id)},
                        {"$inc": {"likes_count": 1}}
                    )
                except:
                    db.events.update_one(
                        {"_id": event_id},
                        {"$inc": {"likes_count": 1}}
                    )
                    
                print("Event liked successfully")
                return {"liked": True, "message": "Event liked"}
                
        except Exception as e:
            print(f"Error in like_event: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}
    
    @staticmethod
    def check_user_liked_event(event_id, user_id):
        """Check if user has liked a specific event"""
        db = current_app.config["DB"]
        
        like = db.likes.find_one({
            "post_id": event_id,  # Using post_id field for consistency
            "user_id": user_id,
            "type": "event"
        })
        
        return like is not None
    
    @staticmethod
    def attend_event(event_id, user_id):
        """Attend or unattend an event"""
        db = current_app.config["DB"]
        
        try:
            print(f"Attempting to attend/unattend event {event_id} by user {user_id}")
            
            # Get the event to check if it's past
            event = Event.get_event_by_id(event_id)
            if not event:
                return {"error": "Event not found"}
            
            # Check if event is active
            if not event.get('is_active', True):
                return {"error": "Event has been cancelled"}
            
            # Check if event is in the past
            if Event.is_event_past(event.get('event_datetime')):
                return {"error": "Cannot join past events"}
            
            # Check if user already attending this event
            existing_attendance = db.attendances.find_one({
                "event_id": event_id,
                "user_id": user_id
            })
            
            if existing_attendance:
                # Unattend - remove attendance and decrement count
                db.attendances.delete_one({"_id": existing_attendance["_id"]})
                
                # Update event attendance count
                try:
                    db.events.update_one(
                        {"_id": ObjectId(event_id)},
                        {"$inc": {"attendees_count": -1}}
                    )
                except:
                    db.events.update_one(
                        {"_id": event_id},
                        {"$inc": {"attendees_count": -1}}
                    )
                    
                print("Event unattended successfully")
                return {"attending": False, "message": "No longer attending event"}
            else:
                # Check if event has max attendees limit
                if event.get("max_attendees") and event["attendees_count"] >= event["max_attendees"]:
                    return {"error": "Event is full"}
                
                # Attend - add attendance and increment count
                attendance_doc = {
                    "event_id": event_id,
                    "user_id": user_id,
                    "created_at": datetime.utcnow()
                }
                db.attendances.insert_one(attendance_doc)
                
                # Update event attendance count
                try:
                    db.events.update_one(
                        {"_id": ObjectId(event_id)},
                        {"$inc": {"attendees_count": 1}}
                    )
                except:
                    db.events.update_one(
                        {"_id": event_id},
                        {"$inc": {"attendees_count": 1}}
                    )
                    
                print("Event attended successfully")
                return {"attending": True, "message": "Now attending event"}
                
        except Exception as e:
            print(f"Error in attend_event: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}
    
    @staticmethod
    def is_event_past(event_datetime):
        """Check if an event is in the past"""
        if not event_datetime:
            return False
        
        # Handle both datetime objects and string formats
        if isinstance(event_datetime, str):
            try:
                event_datetime = datetime.strptime(event_datetime, "%Y-%m-%dT%H:%M:%S.%fZ")
            except ValueError:
                try:
                    event_datetime = datetime.strptime(event_datetime, "%Y-%m-%d %H:%M")
                except ValueError:
                    return False
        
        return event_datetime <= datetime.utcnow()
    
    @staticmethod
    def check_user_attending_event(event_id, user_id):
        """Check if user is attending a specific event"""
        db = current_app.config["DB"]
        
        attendance = db.attendances.find_one({
            "event_id": event_id,
            "user_id": user_id
        })
        
        return attendance is not None
    
    @staticmethod
    def get_event_attendees(event_id, limit=50, skip=0):
        """Get list of users attending an event"""
        db = current_app.config["DB"]
        
        try:
            cursor = db.attendances.find({"event_id": event_id}).sort("created_at", -1).skip(skip).limit(limit)
            attendees = []
            
            for attendance in cursor:
                # Get user info
                try:
                    user = db.users.find_one({"_id": ObjectId(attendance["user_id"])})
                    if user:
                        attendees.append({
                            "_id": str(user["_id"]),
                            "username": user.get("username", "Unknown"),
                            "profile_picture": user.get("profile_picture"),
                            "joined_at": attendance["created_at"]
                        })
                except:
                    continue
            
            return attendees
            
        except Exception as e:
            print(f"Error getting event attendees: {e}")
            return []
    
    @staticmethod
    def get_user_attending_events(user_id, limit=50, skip=0, include_past=False):
        """Get events that a user is attending"""
        db = current_app.config["DB"]
        
        try:
            # Get user's attendances
            cursor = db.attendances.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit)
            attending_events = []
            
            for attendance in cursor:
                # Get event details
                event = Event.get_event_by_id(attendance["event_id"])
                if event and event.get("is_active", True):
                    # Filter past events if not requested
                    if not include_past and event.get("event_datetime"):
                        if event["event_datetime"] <= datetime.utcnow():
                            continue
                    
                    event["joined_at"] = attendance["created_at"]
                    attending_events.append(event)
            
            return attending_events
            
        except Exception as e:
            print(f"Error getting user attending events: {e}")
            return []
    
    @staticmethod
    def update_event(event_id, user_id, **kwargs):
        """Update an event (only by the creator)"""
        db = current_app.config["DB"]
        
        try:
            # Check if event exists and user is the creator
            event = Event.get_event_by_id(event_id)
            if not event:
                return {"error": "Event not found"}
            
            if event["user_id"] != user_id:
                return {"error": "You can only update your own events"}
            
            # Build update document
            update_doc = {}
            
            # Handle datetime update
            if "event_date" in kwargs and "event_time" in kwargs:
                try:
                    event_datetime_str = f"{kwargs['event_date']} {kwargs['event_time']}"
                    event_datetime = datetime.strptime(event_datetime_str, "%Y-%m-%d %H:%M")
                    update_doc["event_datetime"] = event_datetime
                    # Remove the individual date/time fields since we store as datetime
                    kwargs.pop('event_date', None)
                    kwargs.pop('event_time', None)
                except ValueError as e:
                    return {"error": f"Invalid date or time format: {e}"}
            elif "event_datetime" in kwargs:
                # If event_datetime is provided directly
                update_doc["event_datetime"] = kwargs.pop('event_datetime')
            
            # Handle other fields
            allowed_fields = ["title", "description", "location", "location_title", "latitude", "longitude", "max_attendees"]
            for field in allowed_fields:
                if field in kwargs:
                    update_doc[field] = kwargs[field]
            
            if not update_doc:
                return {"error": "No valid fields to update"}
            
            # Update the event
            try:
                db.events.update_one(
                    {"_id": ObjectId(event_id)},
                    {"$set": update_doc}
                )
            except:
                db.events.update_one(
                    {"_id": event_id},
                    {"$set": update_doc}
                )
            
            return {"message": "Event updated successfully"}
            
        except Exception as e:
            print(f"Error updating event: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def cancel_event(event_id, user_id):
        """Cancel an event and completely remove it from database along with thread posts"""
        db = current_app.config["DB"]
        
        try:
            # Check if event exists and user is the creator
            event = Event.get_event_by_id(event_id)
            if not event:
                return {"error": "Event not found"}
            
            if event["user_id"] != user_id:
                return {"error": "You can only cancel your own events"}
            
            # Get all post IDs for this event before deletion
            post_ids = []
            posts_cursor = db.event_threads.find({"event_id": event_id}, {"_id": 1})
            for post in posts_cursor:
                post_ids.append(str(post["_id"]))
            
            # Delete all thread likes for these posts first
            likes_deleted = 0
            if post_ids:
                likes_result = db.thread_likes.delete_many({"post_id": {"$in": post_ids}})
                likes_deleted = likes_result.deleted_count
                print(f"Deleted {likes_deleted} thread likes for event {event_id}")
            
            # Delete all thread posts for this event
            posts_result = db.event_threads.delete_many({"event_id": event_id})
            posts_deleted = posts_result.deleted_count
            print(f"Deleted {posts_deleted} thread posts for event {event_id}")
            
            # Delete all attendances for this event
            attendances_result = db.attendances.delete_many({"event_id": event_id})
            attendances_deleted = attendances_result.deleted_count
            print(f"Deleted {attendances_deleted} attendances for event {event_id}")
            
            # Delete all event likes
            event_likes_result = db.likes.delete_many({"post_id": event_id, "type": "event"})
            event_likes_deleted = event_likes_result.deleted_count
            print(f"Deleted {event_likes_deleted} event likes for event {event_id}")
            
            # Finally, DELETE the event itself from the database
            try:
                event_result = db.events.delete_one({"_id": ObjectId(event_id)})
            except:
                event_result = db.events.delete_one({"_id": event_id})
            
            event_deleted = event_result.deleted_count
            print(f"Deleted event {event_id} from database")
            
            return {
                "message": "Event and all associated data permanently deleted from database",
                "deleted_counts": {
                    "event": event_deleted,
                    "posts": posts_deleted,
                    "thread_likes": likes_deleted,
                    "attendances": attendances_deleted,
                    "event_likes": event_likes_deleted
                }
            }
            
        except Exception as e:
            print(f"Error deleting event: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}