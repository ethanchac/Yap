from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime

activities_bp = Blueprint('activities', __name__)

@activities_bp.route('/wouldyourather', methods=['GET'])
def get_would_you_rather():
    print("🔍 DEBUG: get_would_you_rather route called")
    db = current_app.config["DB"]
    
    # For now, use a session-based user ID (you can replace this with your auth system later)
    current_user_id = request.headers.get('X-User-ID', 'anonymous_user')
    print(f"🔍 DEBUG: Using user ID: {current_user_id}")
    
    # Get all questions
    questions = list(db['would_you_rather'].find())
    print(f"🔍 DEBUG: Found {len(questions)} questions")
    
    # Get user's votes for these questions
    question_ids = [q['_id'] for q in questions]
    user_votes = list(db['wyr_votes'].find({
        'user_id': current_user_id,
        'question_id': {'$in': question_ids}
    }))
    
    # Create a mapping of question_id -> user_vote
    vote_mapping = {str(vote['question_id']): vote['option'] for vote in user_votes}
    print(f"🔍 DEBUG: User vote mapping: {vote_mapping}")
    
    # Add user vote info to each question
    for q in questions:
        q['_id'] = str(q['_id'])
        q['user_vote'] = vote_mapping.get(q['_id'])  # Will be None if user hasn't voted
        print(f"🔍 DEBUG: Question {q['_id']} has user_vote: {q['user_vote']}")
    
    print(f"🔍 DEBUG: Returning {len(questions)} questions with user votes")
    return jsonify(questions)

@activities_bp.route('/wouldyourather/create', methods=['POST'])
def create_would_you_rather():
    """Create a new Would You Rather question with only two options"""
    
    print("🔍 DEBUG: create_would_you_rather route called")
    try:
        db = current_app.config["DB"]
        current_user_id = request.headers.get('X-User-ID', 'anonymous_user')
        data = request.json
        print(f"🔍 DEBUG: Received data: {data}")
        
        # Validation
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        option_a = data.get('option_a', '').strip()
        option_b = data.get('option_b', '').strip()
        
        print(f"🔍 DEBUG: Option A: {option_a}")
        print(f"🔍 DEBUG: Option B: {option_b}")
        
        # Validate required fields
        if not option_a or not option_b:
            return jsonify({'error': 'Both options are required'}), 400
        
        # Validate lengths
        if len(option_a) < 2 or len(option_b) < 2:
            return jsonify({'error': 'Options must be at least 2 characters long'}), 400
        
        if len(option_a) > 100 or len(option_b) > 100:
            return jsonify({'error': 'Options cannot exceed 100 characters'}), 400
        
        # Create new question document
        new_question = {
            'option_a': option_a,
            'option_b': option_b,
            'votes_a': 0,
            'votes_b': 0,
            'created_at': datetime.utcnow(),
            'created_by': current_user_id
        }
        
        print(f"🔍 DEBUG: Creating question: {new_question}")
        
        # Insert into database
        result = db['would_you_rather'].insert_one(new_question)
        print(f"🔍 DEBUG: Insert result: {result.inserted_id}")
        
        # Get the created document
        created_question = db['would_you_rather'].find_one({'_id': result.inserted_id})
        created_question['_id'] = str(created_question['_id'])
        created_question['user_vote'] = None  # User hasn't voted on their own question yet
        
        print(f"🔍 DEBUG: Created question: {created_question}")
        
        return jsonify(created_question), 201
        
    except Exception as e:
        print(f"❌ Error creating Would You Rather question: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to create question'}), 500

@activities_bp.route('/wouldyourather/vote', methods=['POST'])
def vote_would_you_rather():
    print("🔍 DEBUG: vote_would_you_rather route called")
    db = current_app.config["DB"]
    current_user_id = request.headers.get('X-User-ID', 'anonymous_user')
    data = request.json
    print(f"🔍 DEBUG: Vote data: {data}")
    print(f"🔍 DEBUG: Current user: {current_user_id}")
    
    option = data.get('option')
    question_id = data.get('question_id')
    
    if not question_id:
        return jsonify({'error': 'Missing question_id'}), 400
    
    if option not in ['A', 'B']:
        return jsonify({'error': 'Invalid option'}), 400
    
    try:
        question_obj_id = ObjectId(question_id)
        wyr = db['would_you_rather'].find_one({'_id': question_obj_id})
    except:
        return jsonify({'error': 'Invalid question_id format'}), 400
        
    if not wyr:
        return jsonify({'error': 'No question found'}), 404
    
    # Check if user has already voted on this question
    existing_vote = db['wyr_votes'].find_one({
        'user_id': current_user_id,
        'question_id': question_obj_id
    })
    
    if existing_vote:
        return jsonify({'error': 'You have already voted on this question'}), 400
    
    # Record the vote in the votes collection
    vote_record = {
        'user_id': current_user_id,
        'question_id': question_obj_id,
        'option': option,
        'voted_at': datetime.utcnow()
    }
    db['wyr_votes'].insert_one(vote_record)
    print(f"🔍 DEBUG: Vote recorded: {vote_record}")
    
    # Update vote counts on the question
    if option == 'A':
        db['would_you_rather'].update_one({'_id': question_obj_id}, {'$inc': {'votes_a': 1}})
    else:  # option == 'B'
        db['would_you_rather'].update_one({'_id': question_obj_id}, {'$inc': {'votes_b': 1}})
    
    # Get updated question
    wyr = db['would_you_rather'].find_one({'_id': question_obj_id})
    wyr['_id'] = str(wyr['_id'])
    wyr['user_vote'] = option  # Add the user's vote to the response
    
    print(f"🔍 DEBUG: Updated question with user_vote: {wyr}")
    print(f"🔍 DEBUG: user_vote field specifically: {wyr.get('user_vote')}")
    
    return jsonify(wyr)

@activities_bp.route('/wouldyourather/<question_id>', methods=['DELETE'])
def delete_would_you_rather(question_id):
    """Delete a Would You Rather question"""
    
    print(f"🔍 DEBUG: delete_would_you_rather route called for ID: {question_id}")
    try:
        db = current_app.config["DB"]
        current_user_id = request.headers.get('X-User-ID', 'anonymous_user')
        
        # Validate ObjectId format
        try:
            obj_id = ObjectId(question_id)
        except:
            return jsonify({'error': 'Invalid question ID format'}), 400
        
        # Check if question exists
        question = db['would_you_rather'].find_one({'_id': obj_id})
        if not question:
            return jsonify({'error': 'Question not found'}), 404
        
        # For now, allow anyone to delete (you can add user ownership check later)
        # Check if user is the creator of this question
        # if question.get('created_by') != current_user_id:
        #     return jsonify({'error': 'Not authorized to delete this question'}), 403
        
        # Delete associated votes first
        db['wyr_votes'].delete_many({'question_id': obj_id})
        
        # Delete the question
        result = db['would_you_rather'].delete_one({'_id': obj_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Failed to delete question'}), 500
        
        print(f"🔍 DEBUG: Question {question_id} deleted successfully")
        return jsonify({'message': 'Question deleted successfully'}), 200
        
    except Exception as e:
        print(f"❌ Error deleting Would You Rather question: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete question'}), 500