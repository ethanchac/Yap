from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId

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

@activities_bp.route('/wouldyourather/vote', methods=['POST'])
def vote_would_you_rather():
    db = current_app.config["DB"]
    data = request.json
    option = data.get('option')
    question_id = data.get('question_id')
    if not question_id:
        return jsonify({'error': 'Missing question_id'}), 400
    wyr = db['would_you_rather'].find_one({'_id': ObjectId(question_id)})
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
    return jsonify(wyr) 