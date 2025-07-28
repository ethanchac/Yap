from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime
import traceback
from activities.models import WhatsOnMind
from auth.service import token_required

activities_bp = Blueprint('activities', __name__)

# ------------------------------------------------------
#                         Would you rather
# --------------------------------------------------------

@activities_bp.route('/wouldyourather', methods=['GET'])
@token_required
def get_would_you_rather(current_user):
    """Get all Would You Rather questions with user's vote status"""
    print("🔍 DEBUG: get_would_you_rather route called")
    print(f"🔍 DEBUG: Current user: {current_user}")
    
    db = current_app.config["DB"]
    
    # Get all questions first
    questions = list(db['would_you_rather'].find().sort("created_at", -1))
    print(f"🔍 DEBUG: Found {len(questions)} questions")
    
    # Get user's votes for these questions using current_user['_id']
    question_ids = [q['_id'] for q in questions]
    user_votes = list(db['wyr_votes'].find({
        'user_id': current_user['_id'],
        'question_id': {'$in': question_ids}
    }))
    
    # Create a mapping of question_id -> user_vote
    vote_mapping = {str(vote['question_id']): vote['option'] for vote in user_votes}
    print(f"🔍 DEBUG: User vote mapping: {vote_mapping}")
    
    # Process each question and add creator info
    for q in questions:
        q['_id'] = str(q['_id'])
        q['user_vote'] = vote_mapping.get(q['_id'])
        
        # Get creator information
        if q.get('created_by'):
            print(f"🔍 DEBUG: Looking up creator with ID: {q['created_by']} (type: {type(q['created_by'])})")
            
            # Try to find user - handle both ObjectId and string cases
            creator = None
            try:
                # First try direct lookup (if it's already ObjectId)
                creator = db['users'].find_one({'_id': q['created_by']})
                if not creator and isinstance(q['created_by'], str):
                    # If not found and it's a string, try converting to ObjectId
                    creator = db['users'].find_one({'_id': ObjectId(q['created_by'])})
            except Exception as e:
                print(f"🔍 DEBUG: Error looking up creator: {e}")
                creator = None
            
            print(f"🔍 DEBUG: Creator found: {creator is not None}")
            if creator:
                # Add creator info to the question
                username = creator.get('username')
                if username:
                    q['creator_name'] = username
                elif creator.get('email'):
                    q['creator_name'] = creator.get('email').split('@')[0]
                else:
                    q['creator_name'] = 'Unknown User'
                q['creator_email'] = creator.get('email')
                print(f"🔍 DEBUG: Added creator info for question {q['_id']}: {q['creator_name']}")
            else:
                q['creator_name'] = 'Unknown User' 
                print(f"🔍 DEBUG: Creator not found for question {q['_id']} with created_by: {q['created_by']}")
        else:
            q['creator_name'] = 'Anonymous'
            print(f"🔍 DEBUG: No created_by field for question {q['_id']}")
        
        print(f"🔍 DEBUG: Question {q['_id']} has user_vote: {q['user_vote']}, creator: {q.get('creator_name')}")
    
    print(f"🔍 DEBUG: Returning {len(questions)} questions with user votes and creator info")
    return jsonify(questions)

@activities_bp.route('/wouldyourather/create', methods=['POST'])
@token_required
def create_would_you_rather(current_user):
    """Create a new Would You Rather question with only two options"""
    
    print("🔍 DEBUG: create_would_you_rather route called")
    print(f"🔍 DEBUG: Current user: {current_user}")
    
    try:
        db = current_app.config["DB"]
        
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
        
        # Create new question document using authenticated user's info
        new_question = {
            'option_a': option_a,
            'option_b': option_b,
            'votes_a': 0,
            'votes_b': 0,
            'created_at': datetime.utcnow(),
            'created_by': current_user['_id']
        }
        
        print(f"🔍 DEBUG: Creating question: {new_question}")
        
        # Insert into database
        result = db['would_you_rather'].insert_one(new_question)
        print(f"🔍 DEBUG: Insert result: {result.inserted_id}")
        
        # Get the created document
        created_question = db['would_you_rather'].find_one({'_id': result.inserted_id})
        created_question['_id'] = str(created_question['_id'])
        created_question['user_vote'] = None  # User hasn't voted on their own question yet
        
        # Add creator info to the newly created question
        username = current_user.get('username') or current_user.get('name')
        if username:
            created_question['creator_name'] = username
        elif current_user.get('email'):
            created_question['creator_name'] = current_user.get('email').split('@')[0]
        else:
            created_question['creator_name'] = 'Unknown User'
        created_question['creator_email'] = current_user.get('email')
        
        print(f"🔍 DEBUG: Created question with creator info: {created_question}")
        
        return jsonify(created_question), 201
        
    except Exception as e:
        print(f"❌ Error creating Would You Rather question: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to create question'}), 500

@activities_bp.route('/wouldyourather/vote', methods=['POST'])
@token_required
def vote_would_you_rather(current_user):
    """Vote on a Would You Rather question"""
    print("🔍 DEBUG: vote_would_you_rather route called")
    print(f"🔍 DEBUG: Current user: {current_user}")
    
    db = current_app.config["DB"]
    
    data = request.json
    print(f"🔍 DEBUG: Vote data: {data}")
    
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
        'user_id': current_user['_id'],
        'question_id': question_obj_id
    })
    
    if existing_vote:
        print(f"🔍 DEBUG: User {current_user['_id']} already voted on question {question_id}")
        return jsonify({'error': 'You have already voted on this question'}), 400
    
    # Record the vote in the votes collection
    vote_record = {
        'user_id': current_user['_id'],
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
@token_required
def delete_would_you_rather(current_user, question_id):
    """Delete a Would You Rather question"""
    
    print(f"🔍 DEBUG: delete_would_you_rather route called for ID: {question_id}")
    print(f"🔍 DEBUG: Current user: {current_user}")
    
    try:
        db = current_app.config["DB"]
        
        # Validate ObjectId format
        try:
            obj_id = ObjectId(question_id)
        except:
            return jsonify({'error': 'Invalid question ID format'}), 400
        
        # Check if question exists
        question = db['would_you_rather'].find_one({'_id': obj_id})
        if not question:
            return jsonify({'error': 'Question not found'}), 404
        
        # Check if user is the creator of this question
        if question.get('created_by') != current_user['_id']:
            print(f"🔍 DEBUG: User {current_user['_id']} trying to delete question created by {question.get('created_by')}")
            return jsonify({'error': 'Not authorized to delete this question'}), 403
        
        # Delete associated votes first
        votes_deleted = db['wyr_votes'].delete_many({'question_id': obj_id})
        print(f"🔍 DEBUG: Deleted {votes_deleted.deleted_count} votes")
        
        # Delete the question
        result = db['would_you_rather'].delete_one({'_id': obj_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Failed to delete question'}), 500
        
        print(f"🔍 DEBUG: Question {question_id} deleted successfully")
        return jsonify({'message': 'Question deleted successfully'}), 200
        
    except Exception as e:
        print(f"❌ Error deleting Would You Rather question: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete question'}), 500

# ------------------------------------------------------

#                         Whats on your mind

# --------------------------------------------------------

@activities_bp.route('/whatsonmind', methods=['GET'])
@token_required
def get_whats_on_mind(current_user):
    """Get all 'What's on Your Mind' posts with user profile data"""
    print("🔍 DEBUG: get_whats_on_mind route called")
    print(f"🔍 DEBUG: Current user: {current_user}")
    
    try:
        # Get all posts with user profile data
        posts = WhatsOnMind.get_all_posts()
        print(f"🔍 DEBUG: Found {len(posts)} posts with user data")
        
        # Add user flags
        for post in posts:
            post['is_own_post'] = post.get('created_by') == current_user['_id']
        
        print(f"🔍 DEBUG: Returning {len(posts)} posts with user profile data")
        return jsonify(posts)
        
    except Exception as e:
        print(f"❌ Error fetching posts: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch posts'}), 500

@activities_bp.route('/whatsonmind/create', methods=['POST'])
@token_required
def create_whats_on_mind(current_user):
    """Create a new 'What's on Your Mind' post"""
    print("🔍 DEBUG: create_whats_on_mind route called")
    print(f"🔍 DEBUG: Current user: {current_user}")
    
    try:
        data = request.json
        print(f"🔍 DEBUG: Received data: {data}")
        
        # Validation
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        content = data.get('content', '').strip()
        print(f"🔍 DEBUG: Content: {content}")
        
        # Validate required fields
        if not content:
            return jsonify({'error': 'Content is required'}), 400
        
        # Validate length
        if len(content) < 1:
            return jsonify({'error': 'Content must be at least 1 character long'}), 400
        
        if len(content) > 500:
            return jsonify({'error': 'Content cannot exceed 500 characters'}), 400
        
        # Create new post using the model with authenticated user's info
        created_post = WhatsOnMind.create_post(
            user_id=current_user['_id'],
            username=current_user['username'],
            content=content
        )
        
        # Add user flags and profile data
        created_post['is_own_post'] = True
        created_post['profile_picture'] = current_user.get('profile_picture')
        
        print(f"🔍 DEBUG: Created post: {created_post}")
        
        return jsonify(created_post), 201
        
    except Exception as e:
        print(f"❌ Error creating post: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to create post'}), 500

@activities_bp.route('/whatsonmind/<post_id>', methods=['DELETE'])
@token_required
def delete_whats_on_mind(current_user, post_id):
    """Delete a 'What's on Your Mind' post"""
    print(f"🔍 DEBUG: delete_whats_on_mind route called for ID: {post_id}")
    print(f"🔍 DEBUG: Current user: {current_user}")
    
    try:
        # Use the model to delete the post
        result = WhatsOnMind.delete_post(post_id, current_user['_id'])
        
        if "error" in result:
            status_code = 404 if "not found" in result["error"].lower() else 403
            return jsonify({"error": result["error"]}), status_code
        
        print(f"🔍 DEBUG: Post {post_id} deleted successfully")
        return jsonify(result), 200
        
    except Exception as e:
        print(f"❌ Error deleting post: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete post'}), 500
# Optional: Add a test route to check authentication
@activities_bp.route('/test-auth', methods=['GET'])
@token_required
def test_auth(current_user):
    """Test route to check if authentication is working"""
    return jsonify({
        'authenticated': True,
        'user': {
            'id': current_user['_id'],
            'username': current_user['username']
        },
        'message': 'Authentication working!'
    })