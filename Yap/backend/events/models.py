from datetime import datetime
from bson import ObjectId
from flask import current_app

class Event:
    @staticmethod
    def create_event(user_id, username, title, description, event_date, event_time, location=None, max_attendees=None):
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
        
        pipeline = [
            {"$match": match_condition},
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
                    "event_datetime": 1,
                    "location": 1,
                    "max_attendees": 1,
                    "created_at": 1,
                    "attendees_count": 1,
                    "likes_count": 1,
                    "comments_count": 1,
                    "is_active": 1,
                    "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                }
            },
            {"$sort": {"event_datetime": 1}},  # Sort by event date (upcoming first)
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        events = list(db.events.aggregate(pipeline))
        return events
    
    @staticmethod
    def get_user_events(user_id, limit=50, skip=0, include_past=False):
        """Get events created by a specific user"""
        db = current_app.config["DB"]
        
        # Base match condition
        match_condition = {"user_id": user_id, "is_active": True}
        
        # Filter out past events if not requested
        if not include_past:
            match_condition["event_datetime"] = {"$gte": datetime.utcnow()}
        
        pipeline = [
            {"$match": match_condition},
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
                    "title": 1,
                    "description": 1,
                    "event_datetime": 1,
                    "location": 1,
                    "max_attendees": 1,
                    "created_at": 1,
                    "attendees_count": 1,
                    "likes_count": 1,
                    "comments_count": 1,
                    "is_active": 1,
                    "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                }
            },
            {"$sort": {"event_datetime": 1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        events = list(db.events.aggregate(pipeline))
        return events
    
    @staticmethod
    def get_event_by_id(event_id):
        """Get a single event by ID with profile picture"""
        db = current_app.config["DB"]
        
        try:
            print(f"Looking for event with ID: {event_id}")
            
            event = None
            
            # First try with ObjectId
            try:
                pipeline = [
                    {"$match": {"_id": ObjectId(event_id)}},
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
                            "event_datetime": 1,
                            "location": 1,
                            "max_attendees": 1,
                            "created_at": 1,
                            "attendees_count": 1,
                            "likes_count": 1,
                            "comments_count": 1,
                            "is_active": 1,
                            "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                        }
                    }
                ]
                
                result = list(db.events.aggregate(pipeline))
                if result:
                    event = result[0]
                    print(f"Found event with ObjectId: {event['_id']}")
                    
            except Exception as e:
                print(f"ObjectId lookup failed: {e}")
            
            # If not found with ObjectId, try with string ID
            if not event:
                try:
                    pipeline = [
                        {"$match": {"_id": event_id}},
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
                                "_id": 1,
                                "user_id": 1,
                                "username": {"$ifNull": ["$user_info.username", "$username"]},
                                "title": 1,
                                "description": 1,
                                "event_datetime": 1,
                                "location": 1,
                                "max_attendees": 1,
                                "created_at": 1,
                                "attendees_count": 1,
                                "likes_count": 1,
                                "comments_count": 1,
                                "is_active": 1,
                                "profile_picture": {"$ifNull": ["$user_info.profile_picture", None]}
                            }
                        }
                    ]
                    
                    result = list(db.events.aggregate(pipeline))
                    if result:
                        event = result[0]
                        print(f"Found event with string ID: {event['_id']}")
                        
                except Exception as e:
                    print(f"String ID lookup failed: {e}")
            
            if event:
                print(f"Successfully found event: {event['title']} - {event['description'][:50]}...")
                return event
            else:
                print(f"Event not found with either ObjectId or string ID: {event_id}")
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
                event = Event.get_event_by_id(event_id)
                if event and event.get("max_attendees") and event["attendees_count"] >= event["max_attendees"]:
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
            pipeline = [
                {"$match": {"event_id": event_id}},
                {"$sort": {"created_at": -1}},
                {"$skip": skip},
                {"$limit": limit},
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
                {"$unwind": "$user_info"},
                {
                    "$project": {
                        "_id": "$user_info._id",
                        "username": "$user_info.username",
                        "profile_picture": "$user_info.profile_picture",
                        "joined_at": "$created_at"
                    }
                }
            ]
            
            attendees = list(db.attendances.aggregate(pipeline))
            return attendees
            
        except Exception as e:
            print(f"Error getting event attendees: {e}")
            return []
    
    @staticmethod
    def get_user_attending_events(user_id, limit=50, skip=0, include_past=False):
        """Get events that a user is attending"""
        db = current_app.config["DB"]
        
        try:
            # Base pipeline for getting user's attendances
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$sort": {"created_at": -1}},
                {"$skip": skip},
                {"$limit": limit},
                {
                    "$addFields": {
                        "event_object_id": {"$toObjectId": "$event_id"}
                    }
                },
                {
                    "$lookup": {
                        "from": "events",
                        "localField": "event_object_id",
                        "foreignField": "_id",
                        "as": "event_details"
                    }
                },
                {"$unwind": "$event_details"},
                # Filter out past events if not requested
                {"$match": {"event_details.is_active": True}},
            ]
            
            # Add past event filter if needed
            if not include_past:
                pipeline.append({
                    "$match": {"event_details.event_datetime": {"$gte": datetime.utcnow()}}
                })
            
            # Add user lookup and final projection
            pipeline.extend([
                {
                    "$lookup": {
                        "from": "users",
                        "let": {"user_id": {"$toObjectId": "$event_details.user_id"}},
                        "pipeline": [
                            {"$match": {"$expr": {"$eq": ["$_id", "$$user_id"]}}}
                        ],
                        "as": "user_info"
                    }
                },
                {"$unwind": "$user_info"},
                {
                    "$project": {
                        "_id": {"$toString": "$event_details._id"},
                        "user_id": "$event_details.user_id",
                        "username": "$user_info.username",
                        "title": "$event_details.title",
                        "description": "$event_details.description",
                        "event_datetime": "$event_details.event_datetime",
                        "location": "$event_details.location",
                        "max_attendees": "$event_details.max_attendees",
                        "created_at": "$event_details.created_at",
                        "attendees_count": "$event_details.attendees_count",
                        "likes_count": "$event_details.likes_count",
                        "comments_count": "$event_details.comments_count",
                        "is_active": "$event_details.is_active",
                        "profile_picture": "$user_info.profile_picture",
                        "joined_at": "$created_at"
                    }
                }
            ])
            
            attending_events = list(db.attendances.aggregate(pipeline))
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
                except ValueError as e:
                    return {"error": f"Invalid date or time format: {e}"}
            
            # Handle other fields
            allowed_fields = ["title", "description", "location", "max_attendees"]
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
        """Cancel an event (only by the creator)"""
        db = current_app.config["DB"]
        
        try:
            # Check if event exists and user is the creator
            event = Event.get_event_by_id(event_id)
            if not event:
                return {"error": "Event not found"}
            
            if event["user_id"] != user_id:
                return {"error": "You can only cancel your own events"}
            
            # Update event to inactive
            try:
                db.events.update_one(
                    {"_id": ObjectId(event_id)},
                    {"$set": {"is_active": False}}
                )
            except:
                db.events.update_one(
                    {"_id": event_id},
                    {"$set": {"is_active": False}}
                )
            
            return {"message": "Event cancelled successfully"}
            
        except Exception as e:
            print(f"Error cancelling event: {e}")
            return {"error": str(e)}