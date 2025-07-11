from flask import Blueprint, request, jsonify, current_app
from events.models import Event
from auth.service import token_required
from datetime import datetime

events_bp = Blueprint('events', __name__)

@events_bp.route('/create', methods=['POST'])
@token_required
def create_event(current_user):
    """Create a new event"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'event_date', 'event_time']
        for field in required_fields:
            if not data or not data.get(field):
                return jsonify({"error": f"{field.replace('_', ' ').title()} is required"}), 400
        
        # Validate and clean data
        title = data.get('title').strip()
        description = data.get('description').strip()
        event_date = data.get('event_date').strip()
        event_time = data.get('event_time').strip()
        location = data.get('location', '').strip() if data.get('location') else None
        max_attendees = data.get('max_attendees')
        
        # Validate content length
        if len(title) == 0:
            return jsonify({"error": "Title cannot be empty"}), 400
        if len(description) == 0:
            return jsonify({"error": "Description cannot be empty"}), 400
        
        # Validate title and description length
        if len(title) > 100:
            return jsonify({"error": "Title too long (max 100 characters)"}), 400
        if len(description) > 500:
            return jsonify({"error": "Description too long (max 500 characters)"}), 400
        
        # Validate max_attendees if provided
        if max_attendees is not None:
            try:
                max_attendees = int(max_attendees)
                if max_attendees < 1:
                    return jsonify({"error": "Max attendees must be at least 1"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Max attendees must be a valid number"}), 400
        
        # Validate event date and time format
        try:
            # Check if the event is in the future
            event_datetime_str = f"{event_date} {event_time}"
            event_datetime = datetime.strptime(event_datetime_str, "%Y-%m-%d %H:%M")
            if event_datetime <= datetime.utcnow():
                return jsonify({"error": "Event must be scheduled for a future date and time"}), 400
        except ValueError:
            return jsonify({"error": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time"}), 400
        
        # Create the event
        event = Event.create_event(
            user_id=current_user['_id'],
            username=current_user['username'],
            title=title,
            description=description,
            event_date=event_date,
            event_time=event_time,
            location=location,
            max_attendees=max_attendees
        )
        
        return jsonify({
            "message": "Event created successfully",
            "event": event
        }), 201
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error creating event: {e}")
        return jsonify({"error": "Failed to create event"}), 500

@events_bp.route('/feed', methods=['GET'])
def get_events_feed():
    """Get all upcoming events for the main feed - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        include_past = request.args.get('include_past', 'false').lower() == 'true'
        skip = (page - 1) * limit
        
        events = Event.get_all_events(limit=limit, skip=skip, include_past=include_past)
        
        return jsonify({
            "events": events,
            "page": page,
            "limit": limit,
            "total_events": len(events),
            "include_past": include_past
        }), 200
        
    except Exception as e:
        print(f"Error fetching events feed: {e}")
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
        
        # Check if event is in the future
        event_datetime = event.get('event_datetime')
        if event_datetime and event_datetime <= datetime.utcnow():
            return jsonify({"error": "Cannot attend past events"}), 400
        
        result = Event.attend_event(event_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 500
        
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
    """Cancel an event (only by the creator)"""
    try:
        result = Event.cancel_event(event_id, current_user['_id'])
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
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
        
        attending_friends = list(db.attendances.aggregate(attending_friends_pipeline))
        
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