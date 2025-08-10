from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import uuid
from events.models import Event
from eventthreads.models import EventThread
from auth.service import token_required
from datetime import datetime, timedelta
from waypoint.models import Waypoint
import boto3
from botocore.exceptions import ClientError

events_bp = Blueprint('events', __name__)

def get_s3_client():
    """Get S3 client"""
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'ca-central-1')
    )

def allowed_file(filename):
    """Check if file extension is allowed"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@events_bp.route('/create', methods=['POST'])
@token_required
def create_event_with_waypoint(current_user):
    """Create a new event and optionally add it to the waypoint map"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        required_fields = ['title', 'description', 'event_date', 'event_time']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"{field} is required"}), 400
        
        # Validate date format
        try:
            event_datetime_str = f"{data['event_date']} {data['event_time']}"
            event_datetime = datetime.strptime(event_datetime_str, "%Y-%m-%d %H:%M")
            if event_datetime <= datetime.utcnow():
                return jsonify({"error": "Event must be scheduled for a future date and time"}), 400
        except ValueError:
            return jsonify({"error": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time"}), 400
        
        # Validate image URL if provided (ensure it's from our S3 bucket)
        image_url = data.get('image')
        if image_url:
            s3_config = current_app.config.get("S3_CONFIG", {})
            public_bucket = s3_config.get('public_bucket')
            
            if not image_url.startswith(f"https://{public_bucket}.s3."):
                return jsonify({"error": "Invalid image URL"}), 400
        
        # Create the event using the Event model
        try:
            event_doc = Event.create_event(
                user_id=current_user['_id'],
                username=current_user['username'],
                title=data['title'],
                description=data['description'],
                event_date=data['event_date'],
                event_time=data['event_time'],
                location=data.get('location'),
                location_title=data.get('location_title'),
                image=image_url,  # S3 URL
                max_attendees=data.get('max_attendees')
            )
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        
        # If event has location coordinates, create a waypoint
        waypoint_created = False
        if data.get('latitude') and data.get('longitude'):
            try:
                # Calculate waypoint expiration (2 hours after event ends)
                expires_at = event_datetime + timedelta(hours=2)
                
                # Create enhanced waypoint description with structured format for easy parsing
                waypoint_description = f"Event on {data['event_date']} at {data['event_time']}\n\n{data['description']}"
                
                # Create waypoint with event prefix
                waypoint = Waypoint.create_waypoint(
                    user_id=current_user['_id'],
                    username=current_user['username'],
                    title=f"📅 {data['title']}",
                    description=waypoint_description,
                    waypoint_type='event',
                    latitude=float(data['latitude']),
                    longitude=float(data['longitude']),
                    expires_at=expires_at  # Waypoint will auto-expire 2 hours after event
                )
                
                waypoint_created = True
                print(f"✅ Created waypoint for event: {waypoint['_id']}, expires at: {expires_at}")
                
            except Exception as waypoint_error:
                print(f"⚠️ Failed to create waypoint for event: {waypoint_error}")
                # Don't fail the entire request if waypoint creation fails
        
        return jsonify({
            "success": True,
            "message": "Event created successfully" + (" and added to campus map!" if waypoint_created else "!"),
            "event": event_doc,
            "waypoint_created": waypoint_created
        }), 201
        
    except Exception as e:
        print(f"Error creating event: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to create event"}), 500

@events_bp.route('/feed', methods=['GET'])
def get_events_feed():
    """Get all upcoming events for the main feed - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        include_past = request.args.get('include_past', 'false').lower() == 'true'
        skip = (page - 1) * limit
        
        print(f"Fetching events feed: page={page}, limit={limit}, include_past={include_past}, skip={skip}")
        
        events = Event.get_all_events(limit=limit, skip=skip, include_past=include_past)
        
        print(f"Retrieved {len(events)} events from database")
        
        # Debug: Check database directly
        db = current_app.config["DB"]
        total_events_in_db = db.events.count_documents({})
        active_events_in_db = db.events.count_documents({"is_active": True})
        future_events_in_db = db.events.count_documents({
            "is_active": True,
            "event_datetime": {"$gte": datetime.utcnow()}
        }) if not include_past else active_events_in_db
        
        print(f"Database stats: total={total_events_in_db}, active={active_events_in_db}, future={future_events_in_db}")
        
        return jsonify({
            "events": events,
            "page": page,
            "limit": limit,
            "total_events": len(events),
            "include_past": include_past,
            "debug_info": {
                "total_in_db": total_events_in_db,
                "active_in_db": active_events_in_db,
                "future_in_db": future_events_in_db
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching events feed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch events"}), 500

@events_bp.route('/my-events', methods=['GET'])
@token_required
def get_my_events(current_user):
    """Get events created by the authenticated user"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        include_past = request.args.get('include_past', 'false').lower() == 'true'
        skip = (page - 1) * limit
        
        events = Event.get_user_events(current_user['_id'], limit=limit, skip=skip, include_past=include_past)
        
        return jsonify({
            "events": events,
            "page": page,
            "limit": limit,
            "include_past": include_past
        }), 200
        
    except Exception as e:
        print(f"Error fetching my events: {e}")
        return jsonify({"error": "Failed to fetch your events"}), 500

@events_bp.route('/user/<user_id>', methods=['GET'])
def get_user_events_route(user_id):
    """Get events created by a specific user - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        include_past = request.args.get('include_past', 'false').lower() == 'true'
        skip = (page - 1) * limit
        
        events = Event.get_user_events(user_id, limit=limit, skip=skip, include_past=include_past)
        
        return jsonify({
            "events": events,
            "page": page,
            "limit": limit,
            "include_past": include_past
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch user events"}), 500

@events_bp.route('/<event_id>', methods=['GET'])
def get_single_event(event_id):
    """Get a single event by ID"""
    try:
        event = Event.get_event_by_id(event_id)
        
        if not event:
            return jsonify({"error": "Event not found"}), 404
            
        return jsonify({"event": event}), 200
        
    except Exception as e:
        print(f"Error fetching single event: {e}")
        return jsonify({"error": "Failed to fetch event"}), 500

@events_bp.route('/<event_id>/like', methods=['POST'])
@token_required
def like_event(current_user, event_id):
    """Like or unlike an event"""
    try:
        # Check if event exists
        event = Event.get_event_by_id(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        
        result = Event.like_event(event_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 500
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error liking event: {e}")
        return jsonify({"error": "Failed to like event"}), 500

@events_bp.route('/<event_id>/like-status', methods=['GET'])
@token_required
def get_like_status(current_user, event_id):
    """Check if current user has liked an event"""
    try:
        liked = Event.check_user_liked_event(event_id, current_user['_id'])
        return jsonify({"liked": liked}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to check like status"}), 500

@events_bp.route('/<event_id>/attend', methods=['POST'])
@token_required
def attend_event(current_user, event_id):
    """Attend or unattend an event"""
    try:
        # Check if event exists
        event = Event.get_event_by_id(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        
        # Check if event is active
        if not event.get('is_active', True):
            return jsonify({"error": "Event has been cancelled"}), 400
        
        # Enhanced past event check using the new is_event_past method
        if Event.is_event_past(event.get('event_datetime')):
            return jsonify({"error": "Cannot join past events"}), 400
        
        # Call the attend_event method
        result = Event.attend_event(event_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        # Handle notifications based on whether user joined or left
        if result.get("attending") == True:  # User just joined
            try:
                print(f"User {current_user['username']} joined event {event_id}, creating join notification...")
                
                join_notification = EventThread.create_join_notification(
                    event_id=event_id,
                    user_id=current_user['_id'],
                    username=current_user['username']
                )
                
                if join_notification:
                    print(f"✅ Join notification created successfully: {join_notification['_id']}")
                    result["join_notification_created"] = True
                else:
                    print("❌ Failed to create join notification")
                    result["join_notification_created"] = False
                    
            except Exception as e:
                print(f"❌ Error creating join notification: {e}")
                import traceback
                traceback.print_exc()
                result["join_notification_created"] = False
                
        elif result.get("attending") == False:  # User just left
            try:
                print(f"User {current_user['username']} left event {event_id}, creating leave notification...")
                
                leave_notification = EventThread.create_leave_notification(
                    event_id=event_id,
                    user_id=current_user['_id'],
                    username=current_user['username']
                )
                
                if leave_notification:
                    print(f"✅ Leave notification created successfully: {leave_notification['_id']}")
                    result["leave_notification_created"] = True
                else:
                    print("❌ Failed to create leave notification")
                    result["leave_notification_created"] = False
                    
            except Exception as e:
                print(f"❌ Error creating leave notification: {e}")
                import traceback
                traceback.print_exc()
                result["leave_notification_created"] = False
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error attending event: {e}")
        return jsonify({"error": "Failed to attend event"}), 500

@events_bp.route('/<event_id>/attend-status', methods=['GET'])
@token_required
def get_attend_status(current_user, event_id):
    """Check if current user is attending an event"""
    try:
        attending = Event.check_user_attending_event(event_id, current_user['_id'])
        return jsonify({"attending": attending}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to check attendance status"}), 500

@events_bp.route('/<event_id>/attendees', methods=['GET'])
def get_event_attendees(event_id):
    """Get list of users attending an event - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        skip = (page - 1) * limit
        
        attendees = Event.get_event_attendees(event_id, limit=limit, skip=skip)
        
        return jsonify({
            "attendees": attendees,
            "page": page,
            "limit": limit,
            "total_attendees": len(attendees)
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch attendees"}), 500

@events_bp.route('/attending', methods=['GET'])
@token_required
def get_my_attending_events(current_user):
    """Get events that the current user is attending"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        include_past = request.args.get('include_past', 'false').lower() == 'true'
        skip = (page - 1) * limit
        
        attending_events = Event.get_user_attending_events(
            current_user['_id'], 
            limit=limit, 
            skip=skip, 
            include_past=include_past
        )
        
        return jsonify({
            "events": attending_events,
            "page": page,
            "limit": limit,
            "include_past": include_past
        }), 200
        
    except Exception as e:
        print(f"Error fetching attending events: {e}")
        return jsonify({"error": "Failed to fetch attending events"}), 500

@events_bp.route('/user/<user_id>/attending', methods=['GET'])
def get_user_attending_events_route(user_id):
    """Get events that a specific user is attending - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        include_past = request.args.get('include_past', 'false').lower() == 'true'
        skip = (page - 1) * limit
        
        # Check if user exists
        from users.models import User
        target_user = User.get_user_profile(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        attending_events = Event.get_user_attending_events(
            user_id, 
            limit=limit, 
            skip=skip, 
            include_past=include_past
        )
        
        return jsonify({
            "events": attending_events,
            "user": {
                "_id": target_user["_id"],
                "username": target_user["username"]
            },
            "page": page,
            "limit": limit,
            "include_past": include_past
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch user attending events"}), 500

@events_bp.route('/<event_id>/update', methods=['PUT'])
@token_required
def update_event(current_user, event_id):
    """Update an event (only by the creator)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate data if provided
        update_fields = {}
        
        if 'title' in data:
            title = data['title'].strip()
            if len(title) == 0:
                return jsonify({"error": "Title cannot be empty"}), 400
            if len(title) > 100:
                return jsonify({"error": "Title too long (max 100 characters)"}), 400
            update_fields['title'] = title
        
        if 'description' in data:
            description = data['description'].strip()
            if len(description) == 0:
                return jsonify({"error": "Description cannot be empty"}), 400
            if len(description) > 500:
                return jsonify({"error": "Description too long (max 500 characters)"}), 400
            update_fields['description'] = description
        
        if 'location' in data:
            location = data['location'].strip() if data['location'] else None
            update_fields['location'] = location
        
        # Handle location_title field
        if 'location_title' in data:
            location_title = data['location_title'].strip() if data['location_title'] else None
            if location_title and len(location_title) > 100:
                return jsonify({"error": "Location title too long (max 100 characters)"}), 400
            update_fields['location_title'] = location_title
        
        # Handle latitude and longitude for location updates
        if 'latitude' in data:
            update_fields['latitude'] = data['latitude']
        
        if 'longitude' in data:
            update_fields['longitude'] = data['longitude']
        
        # Handle image update with S3 validation
        if 'image' in data:
            image_url = data['image']
            if image_url:
                s3_config = current_app.config.get("S3_CONFIG", {})
                public_bucket = s3_config.get('public_bucket')
                
                if not image_url.startswith(f"https://{public_bucket}.s3."):
                    return jsonify({"error": "Invalid image URL"}), 400
            update_fields['image'] = image_url
        
        if 'max_attendees' in data:
            max_attendees = data['max_attendees']
            if max_attendees is not None:
                try:
                    max_attendees = int(max_attendees)
                    if max_attendees < 1:
                        return jsonify({"error": "Max attendees must be at least 1"}), 400
                except (ValueError, TypeError):
                    return jsonify({"error": "Max attendees must be a valid number"}), 400
            update_fields['max_attendees'] = max_attendees
        
        if 'event_date' in data and 'event_time' in data:
            try:
                event_datetime_str = f"{data['event_date']} {data['event_time']}"
                event_datetime = datetime.strptime(event_datetime_str, "%Y-%m-%d %H:%M")
                if event_datetime <= datetime.utcnow():
                    return jsonify({"error": "Event must be scheduled for a future date and time"}), 400
                update_fields['event_date'] = data['event_date']
                update_fields['event_time'] = data['event_time']
                update_fields['event_datetime'] = event_datetime
            except ValueError:
                return jsonify({"error": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time"}), 400
        
        result = Event.update_event(event_id, current_user['_id'], **update_fields)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error updating event: {e}")
        return jsonify({"error": "Failed to update event"}), 500

@events_bp.route('/<event_id>/cancel', methods=['POST'])
@token_required
def cancel_event(current_user, event_id):
    """Cancel an event and clean up S3 images"""
    try:
        # Get the event first to check ownership and get image URL
        event = Event.get_event_by_id(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404
        
        # Check ownership
        if event["user_id"] != current_user['_id']:
            return jsonify({"error": "You can only cancel your own events"}), 403
        
        # Delete from database first
        result = Event.cancel_event(event_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        # If database deletion successful, clean up S3 image
        if result.get("message") and event.get("image"):
            s3_config = current_app.config.get("S3_CONFIG", {})
            public_bucket = s3_config.get('public_bucket')
            
            if public_bucket and event["image"].startswith(f"https://{public_bucket}.s3."):
                try:
                    s3_client = get_s3_client()
                    
                    # Extract S3 key from URL
                    # URL format: https://bucket.s3.region.amazonaws.com/event_images/filename.jpg
                    s3_key = '/'.join(event["image"].split('/')[-2:])  # event_images/filename.jpg
                    
                    try:
                        s3_client.delete_object(Bucket=public_bucket, Key=s3_key)
                        print(f"Deleted S3 object: {s3_key}")
                    except ClientError as e:
                        print(f"Error deleting S3 object {s3_key}: {e}")
                        # Don't fail the entire operation if S3 cleanup fails
                        
                except Exception as e:
                    print(f"Error during S3 cleanup: {e}")
                    # Don't fail the operation since the event is already deleted from DB
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error cancelling event: {e}")
        return jsonify({"error": "Failed to cancel event"}), 500

@events_bp.route('/<event_id>/details', methods=['GET'])
@token_required
def get_event_details(current_user, event_id):
    """Get detailed event information including user's interaction status"""
    try:
        # Get the basic event info
        event = Event.get_event_by_id(event_id)
        
        if not event:
            return jsonify({"error": "Event not found"}), 404
        
        # Check if user is attending
        is_attending = Event.check_user_attending_event(event_id, current_user['_id'])
        
        # Check if user has liked the event
        is_liked = Event.check_user_liked_event(event_id, current_user['_id'])
        
        # Get attending friends (users the current user follows who are attending)
        db = current_app.config["DB"]
        
        # Get current user's following list
        following_pipeline = [
            {"$match": {"follower_id": current_user['_id']}},
            {"$project": {"following_id": 1}}
        ]
        following = list(db.follows.aggregate(following_pipeline))
        following_ids = [f["following_id"] for f in following]
        
        # Get attendees who are in the following list
        attending_friends = []
        if following_ids:
            attending_friends_pipeline = [
                {"$match": {"event_id": event_id, "user_id": {"$in": following_ids}}},
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
                        "full_name": "$user_info.full_name",
                        "profile_picture": "$user_info.profile_picture"
                    }
                }
            ]
            
            try:
                attending_friends = list(db.attendances.aggregate(attending_friends_pipeline))
            except Exception as e:
                print(f"Error getting attending friends: {e}")
                attending_friends = []
        
        # Get total attendees count
        total_attendees = db.attendances.count_documents({"event_id": event_id})
        
        return jsonify({
            "event": event,
            "is_attending": is_attending,
            "is_liked": is_liked,
            "attending_friends": attending_friends,
            "total_attendees": total_attendees
        }), 200
        
    except Exception as e:
        print(f"Error fetching event details: {e}")
        return jsonify({"error": "Failed to fetch event details"}), 500

# Debug route to check database content
@events_bp.route('/debug/database', methods=['GET'])
def debug_database():
    """Debug route to check what's in the database"""
    try:
        db = current_app.config["DB"]
        
        # Get all events
        all_events = list(db.events.find({}))
        
        # Convert ObjectIds to strings for JSON serialization
        for event in all_events:
            event["_id"] = str(event["_id"])
            if "user_id" in event:
                event["user_id"] = str(event["user_id"])
        
        # Get counts
        total_count = len(all_events)
        active_count = len([e for e in all_events if e.get("is_active", True)])
        future_count = len([e for e in all_events if e.get("is_active", True) and e.get("event_datetime") and e["event_datetime"] >= datetime.utcnow()])
        
        return jsonify({
            "total_events": total_count,
            "active_events": active_count,
            "future_events": future_count,
            "events": all_events[:5],  # First 5 events as sample
            "collections": db.list_collection_names()
        }), 200
        
    except Exception as e:
        print(f"Error in debug route: {e}")
        return jsonify({"error": str(e)}), 500

@events_bp.route('/upload-image', methods=['POST'])
@token_required
def upload_event_image(current_user):
    """Upload a single image for events to S3 public bucket"""
    try:
        # Check if the post request has the file part
        if 'image' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": "File too large. Maximum size is 5MB"}), 400
        
        if file and allowed_file(file.filename):
            # Generate unique filename
            filename = secure_filename(file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"event_{current_user['_id']}_{uuid.uuid4().hex}.{file_extension}"
            
            # Get S3 configuration from app config
            s3_config = current_app.config.get("S3_CONFIG", {})
            public_bucket = s3_config.get('public_bucket')
            
            if not public_bucket:
                return jsonify({"error": "S3 configuration not found"}), 500
            
            # Upload to S3 PUBLIC bucket (events are public)
            try:
                s3_client = get_s3_client()
                s3_key = f"event_images/{unique_filename}"
                
                s3_client.upload_fileobj(
                    file,
                    public_bucket,
                    s3_key,
                    ExtraArgs={
                        'ACL': 'public-read',  # Make event images public
                        'ContentType': file.content_type or f'image/{file_extension}',
                        'CacheControl': 'max-age=31536000',  # Cache for 1 year
                        'Metadata': {
                            'user_id': current_user['_id'],
                            'upload_type': 'event_image'
                        }
                    }
                )
                
                # Generate public URL
                region = os.getenv('AWS_REGION', 'ca-central-1')
                image_url = f"https://{public_bucket}.s3.{region}.amazonaws.com/{s3_key}"
                
                return jsonify({
                    "message": "Image uploaded successfully",
                    "imageUrl": image_url,
                    "filename": unique_filename,
                    "s3_key": s3_key
                }), 200
                
            except ClientError as e:
                print(f"S3 upload error: {e}")
                return jsonify({"error": "Failed to upload to cloud storage"}), 500
        else:
            return jsonify({"error": "Invalid file type. Allowed types: PNG, JPG, JPEG, GIF, WEBP"}), 400
            
    except Exception as e:
        print(f"Error uploading event image: {e}")
        return jsonify({"error": "Failed to upload image"}), 500