from flask import Blueprint, request, jsonify, g
from .models import create_feedback, get_user_feedback, get_all_feedback, update_feedback_status
from shared.auth_utils import require_auth

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/feedback', methods=['POST'])
@require_auth
def submit_feedback():
    """Submit new feedback"""
    try:
        data = request.get_json()
        
        # Get user ID from Flask global context
        user_id = g.user.get('user_id')
        
        # Validate required fields
        if not data.get('subject') or not data.get('message'):
            return jsonify({'error': 'Subject and message are required'}), 400
        
        # Validate feedback type
        valid_types = ['general', 'bug', 'feature']
        if data.get('type') not in valid_types:
            return jsonify({'error': 'Invalid feedback type'}), 400
        
        # Validate rating
        rating = data.get('rating', 0)
        if rating < 0 or rating > 5:
            return jsonify({'error': 'Rating must be between 0 and 5'}), 400
        
        feedback_data = {
            'type': data.get('type'),
            'rating': rating,
            'subject': data.get('subject'),
            'message': data.get('message'),
            'email': data.get('email', ''),
            'user_id': user_id
        }
        
        feedback_id = create_feedback(feedback_data)
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback_id': feedback_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@feedback_bp.route('/feedback/user', methods=['GET'])
@require_auth
def get_user_feedback_route():
    """Get feedback for the current user"""
    try:
        # Get user ID from Flask global context
        user_id = g.user.get('user_id')
        
        feedback_list = get_user_feedback(user_id)
        
        return jsonify({
            'feedback': feedback_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@feedback_bp.route('/feedback/all', methods=['GET'])
@require_auth
def get_all_feedback_route():
    """Get all feedback (admin only - for future implementation)"""
    try:
        # TODO: Add admin check
        feedback_list = get_all_feedback()
        
        return jsonify({
            'feedback': feedback_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@feedback_bp.route('/feedback/<feedback_id>/status', methods=['PUT'])
@require_auth
def update_feedback_status_route(feedback_id):
    """Update feedback status (admin only - for future implementation)"""
    try:
        # TODO: Add admin check
        data = request.get_json()
        status = data.get('status')
        
        valid_statuses = ['open', 'in_progress', 'resolved']
        if status not in valid_statuses:
            return jsonify({'error': 'Invalid status'}), 400
        
        updated = update_feedback_status(feedback_id, status)
        
        if updated:
            return jsonify({'message': 'Feedback status updated successfully'}), 200
        else:
            return jsonify({'error': 'Feedback not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
