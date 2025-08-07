from flask import Blueprint, request, jsonify, current_app
from waypoint.models import Waypoint
from auth.service import token_required
from datetime import datetime, timedelta

waypoint_bp = Blueprint('waypoint', __name__)

@waypoint_bp.route('/create', methods=['POST'])
@token_required
def create_waypoint(current_user):
    """Create a new waypoint"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        required_fields = ['title', 'description', 'type', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"{field} is required"}), 400
        
        # Validate coordinates
        try:
            latitude = float(data['latitude'])
            longitude = float(data['longitude'])
            
            # Basic coordinate validation (rough world bounds)
            if not (-90 <= latitude <= 90):
                return jsonify({"error": "Invalid latitude"}), 400
            if not (-180 <= longitude <= 180):
                return jsonify({"error": "Invalid longitude"}), 400
                
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid coordinates"}), 400
        
        # Validate waypoint type
        valid_types = ['food', 'study', 'group', 'event', 'social', 'other']
        if data['type'] not in valid_types:
            return jsonify({"error": f"Invalid type. Must be one of: {', '.join(valid_types)}"}), 400
        
        # Validate text lengths
        if len(data['title']) > 100:
            return jsonify({"error": "Title too long (max 100 characters)"}), 400
        if len(data['description']) > 500:
            return jsonify({"error": "Description too long (max 500 characters)"}), 400
        
        # Handle optional expiration - changed from 72 hours max to 168 hours (1 week) max
        expires_at = None
        if 'expires_in_hours' in data:
            try:
                hours = int(data['expires_in_hours'])
                if 1 <= hours <= 168:  # Max 1 week (168 hours)
                    expires_at = datetime.utcnow() + timedelta(hours=hours)
            except (ValueError, TypeError):
                pass
        else:
            # Default expiration: 1 week from now
            expires_at = datetime.utcnow() + timedelta(weeks=1)
        
        # Create waypoint
        waypoint = Waypoint.create_waypoint(
            user_id=current_user['_id'],
            username=current_user['username'],
            title=data['title'].strip(),
            description=data['description'].strip(),
            waypoint_type=data['type'],
            latitude=latitude,
            longitude=longitude,
            expires_at=expires_at
        )
        
        return jsonify({
            "success": True,
            "message": "Waypoint created successfully",
            "waypoint": waypoint
        }), 201
        
    except Exception as e:
        print(f"Error creating waypoint: {e}")
        return jsonify({"error": "Failed to create waypoint"}), 500

@waypoint_bp.route('/nearby', methods=['GET'])
def get_nearby_waypoints():
    """Get waypoints near a location - PUBLIC route"""
    try:
        # Get query parameters
        lat = request.args.get('lat')
        lng = request.args.get('lng')
        
        if not lat or not lng:
            return jsonify({"error": "Latitude and longitude are required"}), 400
        
        try:
            latitude = float(lat)
            longitude = float(lng)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid coordinates"}), 400
        
        # Optional parameters
        radius = float(request.args.get('radius', 5))  # Default 5km
        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100
        skip = int(request.args.get('skip', 0))
        
        # Validate radius
        if not (0.1 <= radius <= 50):  # Max 50km radius
            return jsonify({"error": "Radius must be between 0.1 and 50 km"}), 400
        
        waypoints = Waypoint.get_waypoints_in_area(
            center_lat=latitude,
            center_lng=longitude,
            radius_km=radius,
            limit=limit,
            skip=skip
        )
        
        return jsonify({
            "waypoints": waypoints,
            "center": {"latitude": latitude, "longitude": longitude},
            "radius_km": radius,
            "count": len(waypoints)
        }), 200
        
    except Exception as e:
        print(f"Error getting nearby waypoints: {e}")
        return jsonify({"error": "Failed to get waypoints"}), 500

@waypoint_bp.route('/<waypoint_id>', methods=['GET'])
def get_waypoint(waypoint_id):
    """Get a single waypoint - PUBLIC route"""
    try:
        waypoint = Waypoint.get_waypoint_by_id(waypoint_id)
        
        if not waypoint:
            return jsonify({"error": "Waypoint not found"}), 404
        
        # Increment view count
        Waypoint.increment_view(waypoint_id)
        
        return jsonify({
            "success": True,
            "waypoint": waypoint
        }), 200
        
    except Exception as e:
        print(f"Error getting waypoint: {e}")
        return jsonify({"error": "Failed to get waypoint"}), 500

@waypoint_bp.route('/<waypoint_id>/join', methods=['POST'])
@token_required
def join_waypoint(current_user, waypoint_id):
    """Join or leave a waypoint"""
    try:
        result = Waypoint.join_waypoint(waypoint_id, current_user['_id'])
        
        if "error" in result:
            status_code = 404 if "not found" in result["error"].lower() else 400
            return jsonify({"error": result["error"]}), status_code
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error joining waypoint: {e}")
        return jsonify({"error": "Failed to join waypoint"}), 500

@waypoint_bp.route('/<waypoint_id>/like', methods=['POST'])
@token_required
def like_waypoint(current_user, waypoint_id):
    """Like or unlike a waypoint"""
    try:
        result = Waypoint.like_waypoint(waypoint_id, current_user['_id'])
        
        if "error" in result:
            status_code = 404 if "not found" in result["error"].lower() else 400
            return jsonify({"error": result["error"]}), status_code
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error liking waypoint: {e}")
        return jsonify({"error": "Failed to like waypoint"}), 500

@waypoint_bp.route('/<waypoint_id>', methods=['DELETE'])
@token_required
def delete_waypoint(current_user, waypoint_id):
    """Delete a waypoint"""
    try:
        result = Waypoint.delete_waypoint(waypoint_id, current_user['_id'])
        
        if "error" in result:
            status_code = 404 if "not found" in result["error"].lower() else 403
            return jsonify({"error": result["error"]}), status_code
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error deleting waypoint: {e}")
        return jsonify({"error": "Failed to delete waypoint"}), 500

@waypoint_bp.route('/user/<user_id>', methods=['GET'])
def get_user_waypoints(user_id):
    """Get waypoints created by a user - PUBLIC route"""
    try:
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 50)
        skip = (page - 1) * limit
        
        waypoints = Waypoint.get_user_waypoints(user_id, limit=limit, skip=skip)
        
        return jsonify({
            "waypoints": waypoints,
            "user_id": user_id,
            "page": page,
            "limit": limit,
            "count": len(waypoints)
        }), 200
        
    except Exception as e:
        print(f"Error getting user waypoints: {e}")
        return jsonify({"error": "Failed to get user waypoints"}), 500

@waypoint_bp.route('/my-waypoints', methods=['GET'])
@token_required
def get_my_waypoints(current_user):
    """Get current user's waypoints"""
    try:
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 50)
        skip = (page - 1) * limit
        
        waypoints = Waypoint.get_user_waypoints(
            current_user['_id'], 
            limit=limit, 
            skip=skip
        )
        
        return jsonify({
            "waypoints": waypoints,
            "page": page,
            "limit": limit,
            "count": len(waypoints)
        }), 200
        
    except Exception as e:
        print(f"Error getting my waypoints: {e}")
        return jsonify({"error": "Failed to get your waypoints"}), 500

@waypoint_bp.route('/campus/tmu', methods=['GET'])
def get_tmu_waypoints():
    """Get waypoints specifically around TMU campus"""
    try:
        # TMU coordinates
        TMU_LAT = 43.6577
        TMU_LNG = -79.3788
        
        # Get parameters
        radius = float(request.args.get('radius', 2))  # Default 2km around campus
        limit = min(int(request.args.get('limit', 50)), 100)
        skip = int(request.args.get('skip', 0))
        
        # Clean up expired waypoints before fetching (this will remove past event waypoints)
        cleanup_count = Waypoint.cleanup_expired_waypoints()
        if cleanup_count > 0:
            print(f"Cleaned up {cleanup_count} expired/past waypoints before fetching TMU waypoints")
        
        waypoints = Waypoint.get_waypoints_in_area(
            center_lat=TMU_LAT,
            center_lng=TMU_LNG,
            radius_km=radius,
            limit=limit,
            skip=skip
        )
        
        # If user is authenticated, we already have liked_users and bookmarked_users
        # The frontend will use these arrays to determine user interaction status
        
        return jsonify({
            "waypoints": waypoints,
            "campus": "TMU",
            "center": {"latitude": TMU_LAT, "longitude": TMU_LNG},
            "radius_km": radius,
            "count": len(waypoints),
            "cleanup_performed": cleanup_count > 0,
            "expired_removed": cleanup_count
        }), 200
        
    except Exception as e:
        print(f"Error getting TMU waypoints: {e}")
        return jsonify({"error": "Failed to get campus waypoints"}), 500

@waypoint_bp.route('/types', methods=['GET'])
def get_waypoint_types():
    """Get available waypoint types"""
    types = [
        {
            "id": "food",
            "name": "Food & Events",
            "icon": "🍕",
            "color": "#f59e0b",
            "description": "Free food, parties, campus events"
        },
        {
            "id": "study",
            "name": "Study Spots",
            "icon": "📚", 
            "color": "#3b82f6",
            "description": "Quiet study areas, library spots"
        },
        {
            "id": "group",
            "name": "Study Groups",
            "icon": "👥",
            "color": "#10b981", 
            "description": "Group study sessions, project meetings"
        },
        {
            "id": "social",
            "name": "Social",
            "icon": "🎉",
            "color": "#8b5cf6",
            "description": "Casual hangouts, social gatherings"
        },
        {
            "id": "event",
            "name": "Events",
            "icon": "📅",
            "color": "#ef4444",
            "description": "Campus events, club meetings"
        },
        {
            "id": "other",
            "name": "Other",
            "icon": "📍",
            "color": "#6b7280",
            "description": "Everything else"
        }
    ]
    
    return jsonify({
        "types": types
    }), 200

@waypoint_bp.route('/<waypoint_id>/bookmark', methods=['POST'])
@token_required
def bookmark_waypoint(current_user, waypoint_id):
    """Bookmark or unbookmark a waypoint"""
    try:
        result = Waypoint.bookmark_waypoint(waypoint_id, current_user['_id'])
        
        if "error" in result:
            status_code = 404 if "not found" in result["error"].lower() else 400
            return jsonify({"error": result["error"]}), status_code
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error bookmarking waypoint: {e}")
        return jsonify({"error": "Failed to bookmark waypoint"}), 500
    
@waypoint_bp.route('/my-bookmarks', methods=['GET'])
@token_required
def get_my_bookmarked_waypoints(current_user):
    """Get current user's bookmarked waypoints"""
    try:
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 50)
        skip = (page - 1) * limit
        
        waypoints = Waypoint.get_user_bookmarked_waypoints(
            current_user['_id'], 
            limit=limit, 
            skip=skip
        )
        
        return jsonify({
            "waypoints": waypoints,
            "page": page,
            "limit": limit,
            "count": len(waypoints)
        }), 200
        
    except Exception as e:
        print(f"Error getting bookmarked waypoints: {e}")
        return jsonify({"error": "Failed to get bookmarked waypoints"}), 500