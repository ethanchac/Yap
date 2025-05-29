from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from users.user_service import UserService
from shared.validators import CommonValidator, ValidationError
import logging

users_bp = Blueprint('users', __name__)
logger = logging.getLogger(__name__)

@users_bp.route('/profile/<username>', methods=['GET'])
def get_user_profile(username):
    """Get user profile by username"""
    try:
        user_service = UserService(current_app.db)
        
        # Get current user ID if authenticated (optional)
        current_user_id = None
        try:
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
        except:
            pass  # Not authenticated, continue without current user context
        
        user, error = user_service.get_user_profile(username, current_user_id)
        
        if error:
            return jsonify({'error': error}), 404
        
        return jsonify({'user': user}), 200
        
    except Exception as e:
        logger.error(f"Get user profile error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user's profile"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
        
        user_service = UserService(current_app.db)
        user, error = user_service.update_profile(current_user_id, data)
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/follow/<username>', methods=['POST'])
@jwt_required()
def follow_user(username):
    """Follow a user"""
    try:
        current_user_id = get_jwt_identity()
        
        user_service = UserService(current_app.db)
        success, error = user_service.follow_user(current_user_id, username)
        
        if error:
            return jsonify({'error': error}), 400
        
        if not success:
            return jsonify({'error': 'Unable to follow user'}), 400
        
        return jsonify({'message': f'Successfully followed @{username}'}), 200
        
    except Exception as e:
        logger.error(f"Follow user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/unfollow/<username>', methods=['POST'])
@jwt_required()
def unfollow_user(username):
    """Unfollow a user"""
    try:
        current_user_id = get_jwt_identity()
        
        user_service = UserService(current_app.db)
        success, error = user_service.unfollow_user(current_user_id, username)
        
        if error:
            return jsonify({'error': error}), 400
        
        if not success:
            return jsonify({'error': 'Unable to unfollow user'}), 400
        
        return jsonify({'message': f'Successfully unfollowed @{username}'}), 200
        
    except Exception as e:
        logger.error(f"Unfollow user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/<username>/followers', methods=['GET'])
def get_user_followers(username):
    """Get user's followers"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Validate pagination
        try:
            CommonValidator.validate_pagination(page, per_page)
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        # Get user by username first
        user_service = UserService(current_app.db)
        user, error = user_service.get_user_profile(username)
        
        if error:
            return jsonify({'error': error}), 404
        
        # Get followers
        followers, pagination = user_service.get_followers(user['id'], page, per_page)
        
        if 'error' in pagination:
            return jsonify({'error': pagination['error']}), 400
        
        return jsonify({
            'user': user,
            'followers': followers,
            'pagination': pagination
        }), 200
        
    except Exception as e:
        logger.error(f"Get followers error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/<username>/following', methods=['GET'])
def get_user_following(username):
    """Get users that this user is following"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Validate pagination
        try:
            CommonValidator.validate_pagination(page, per_page)
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        # Get user by username first
        user_service = UserService(current_app.db)
        user, error = user_service.get_user_profile(username)
        
        if error:
            return jsonify({'error': error}), 404
        
        # Get following
        following, pagination = user_service.get_following(user['id'], page, per_page)
        
        if 'error' in pagination:
            return jsonify({'error': pagination['error']}), 400
        
        return jsonify({
            'user': user,
            'following': following,
            'pagination': pagination
        }), 200
        
    except Exception as e:
        logger.error(f"Get following error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/search', methods=['GET'])
def search_users():
    """Search users by username or full name"""
    try:
        query = request.args.get('q', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        if len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        # Validate pagination
        try:
            CommonValidator.validate_pagination(page, per_page)
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        user_service = UserService(current_app.db)
        users, pagination = user_service.search_users(query, page, per_page)
        
        if 'error' in pagination:
            return jsonify({'error': pagination['error']}), 400
        
        return jsonify({
            'query': query,
            'users': users,
            'pagination': pagination
        }), 200
        
    except Exception as e:
        logger.error(f"Search users error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/suggestions', methods=['GET'])
@jwt_required()
def get_suggested_users():
    """Get suggested users to follow"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        # Validate limit
        if limit < 1 or limit > 50:
            limit = 10
        
        user_service = UserService(current_app.db)
        suggested_users, error = user_service.get_suggested_users(current_user_id, limit)
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'suggested_users': suggested_users,
            'count': len(suggested_users)
        }), 200
        
    except Exception as e:
        logger.error(f"Get suggested users error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/<username>/stats', methods=['GET'])
def get_user_stats(username):
    """Get detailed user statistics"""
    try:
        # Get user by username first
        user_service = UserService(current_app.db)
        user, error = user_service.get_user_profile(username)
        
        if error:
            return jsonify({'error': error}), 404
        
        # Get detailed stats
        user_with_stats, error = user_service.get_user_stats(user['id'])
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({'user_stats': user_with_stats}), 200
        
    except Exception as e:
        logger.error(f"Get user stats error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_current_user():
    """Verify current user and return profile"""
    try:
        current_user_id = get_jwt_identity()
        
        user_service = UserService(current_app.db)
        user = user_service.user_model.get_user_by_id(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'valid': True,
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Verify user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user's profile"""
    try:
        current_user_id = get_jwt_identity()
        
        user_service = UserService(current_app.db)
        user = user_service.user_model.get_user_by_id(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user}), 200
        
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@users_bp.route('/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Deactivate user account (soft delete)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Deactivate account
        result = current_app.db.users.update_one(
            {"_id": current_app.db.users.find_one({"_id": current_app.db.users.find_one({"username": current_app.db.users.find_one({"_id": ObjectId(current_user_id)})['username']})['_id']})['_id']},
            {"$set": {"is_active": False}}
        )
        
        if result.modified_count > 0:
            return jsonify({'message': 'Account deactivated successfully'}), 200
        else:
            return jsonify({'error': 'User not found'}), 404
        
    except Exception as e:
        logger.error(f"Delete account error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500