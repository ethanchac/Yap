from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime

activities_bp = Blueprint('activities', __name__)

@activities_bp.route('/wouldyourather', methods=['GET'])
def get_would_you_rather():
    print("🔍 DEBUG: get_would_you_rather route called")
    db = current_app.config["DB"]
    print(f"🔍 DEBUG: Database object: {db}")
    print(f"🔍 DEBUG: Database name: {db.name}")
    
    # Check if collection exists
    collections = db.list_collection_names()
    print(f"🔍 DEBUG: Available collections: {collections}")
    
    questions = list(db['would_you_rather'].find())
    print(f"🔍 DEBUG: Found {len(questions)} questions")
    
    for q in questions:
        q['_id'] = str(q['_id'])
    
    print(f"🔍 DEBUG: Returning {len(questions)} questions")
    return jsonify(questions)

@activities_bp.route('/wouldyourather/create', methods=['POST', 'OPTIONS'])
def create_would_you_rather():
    """Create a new Would You Rather question"""
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    print("🔍 DEBUG: create_would_you_rather route called")
    try:
        db = current_app.config["DB"]
        data = request.json
        print(f"🔍 DEBUG: Received data: {data}")
        
        # Validation
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        question = data.get('question', '').strip()
        option_a = data.get('option_a', '').strip()
        option_b = data.get('option_b', '').strip()
        
        print(f"🔍 DEBUG: Question: {question}")
        print(f"🔍 DEBUG: Option A: {option_a}")
        print(f"🔍 DEBUG: Option B: {option_b}")
        
        # Validate required fields
        if not question or not option_a or not option_b:
            return jsonify({'error': 'Question and both options are required'}), 400
        
        # Validate lengths
        if len(question) < 10:
            return jsonify({'error': 'Question must be at least 10 characters long'}), 400
        
        if len(option_a) < 2 or len(option_b) < 2:
            return jsonify({'error': 'Options must be at least 2 characters long'}), 400
        
        if len(question) > 200:
            return jsonify({'error': 'Question cannot exceed 200 characters'}), 400
        
        if len(option_a) > 100 or len(option_b) > 100:
            return jsonify({'error': 'Options cannot exceed 100 characters'}), 400
        
        # Create new question document
        new_question = {
            'question': question,
            'option_a': option_a,
            'option_b': option_b,
            'votes_a': 0,
            'votes_b': 0,
            'created_at': datetime.utcnow(),
            'created_by': 'anonymous'  # You can add user authentication later
        }
        
        print(f"🔍 DEBUG: Creating question: {new_question}")
        
        # Insert into database
        result = db['would_you_rather'].insert_one(new_question)
        print(f"🔍 DEBUG: Insert result: {result.inserted_id}")
        
        # Get the created document
        created_question = db['would_you_rather'].find_one({'_id': result.inserted_id})
        created_question['_id'] = str(created_question['_id'])
        
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
    data = request.json
    print(f"🔍 DEBUG: Vote data: {data}")
    
    option = data.get('option')
    question_id = data.get('question_id')
    
    if not question_id:
        return jsonify({'error': 'Missing question_id'}), 400
    
    try:
        wyr = db['would_you_rather'].find_one({'_id': ObjectId(question_id)})
    except:
        return jsonify({'error': 'Invalid question_id format'}), 400
        
    if not wyr:
        return jsonify({'error': 'No question found'}), 404
    
    if option == 'A':
        db['would_you_rather'].update_one({'_id': wyr['_id']}, {'$inc': {'votes_a': 1}})
    elif option == 'B':
        db['would_you_rather'].update_one({'_id': wyr['_id']}, {'$inc': {'votes_b': 1}})
    else:
        return jsonify({'error': 'Invalid option'}), 400
    
    wyr = db['would_you_rather'].find_one({'_id': wyr['_id']})
    wyr['_id'] = str(wyr['_id'])
    
    print(f"🔍 DEBUG: Updated question: {wyr}")
    return jsonify(wyr)
