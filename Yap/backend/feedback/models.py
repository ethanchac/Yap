from pymongo import MongoClient
from datetime import datetime
import os
from bson import ObjectId
from flask import current_app

def create_feedback(feedback_data):
    """Create a new feedback entry"""
    try:
        # Use the same database access pattern as your other models
        db = current_app.config["DB"]
        
        feedback = {
            'type': feedback_data.get('type'),
            'rating': feedback_data.get('rating'),
            'subject': feedback_data.get('subject'),
            'message': feedback_data.get('message'),
            'email': feedback_data.get('email'),
            'user_id': feedback_data.get('user_id'),
            'created_at': datetime.utcnow(),
            'status': 'open'  # open, in_progress, resolved
        }
        
        result = db.feedback.insert_one(feedback)
        return str(result.inserted_id)
        
    except Exception as e:
        print(f"[ERROR] Error creating feedback: {str(e)}")
        raise e

def get_feedback_by_id(feedback_id):
    """Get a specific feedback entry by ID"""
    try:
        feedback = db.feedback.find_one({'_id': ObjectId(feedback_id)})
        if feedback:
            feedback['_id'] = str(feedback['_id'])
        return feedback
    except Exception as e:
        print(f"Error getting feedback by ID: {str(e)}")
        return None

def get_all_feedback():
    """Get all feedback entries (admin only)"""
    feedback_list = list(db.feedback.find().sort('created_at', -1))
    for feedback in feedback_list:
        feedback['_id'] = str(feedback['_id'])
    return feedback_list

def get_user_feedback(user_id):
    """Get feedback entries for a specific user"""
    feedback_list = list(db.feedback.find({'user_id': user_id}).sort('created_at', -1))
    for feedback in feedback_list:
        feedback['_id'] = str(feedback['_id'])
    return feedback_list

def update_feedback_status(feedback_id, status):
    """Update feedback status (admin only)"""
    result = db.feedback.update_one(
        {'_id': ObjectId(feedback_id)},
        {'$set': {'status': status, 'updated_at': datetime.utcnow()}}
    )
    return result.modified_count > 0