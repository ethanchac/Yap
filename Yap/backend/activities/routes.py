from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from datetime import datetime
import jwt
import traceback
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

activities_bp = Blueprint('activities', __name__)

def get_current_user_id():
    """Extract real user ID from JWT token"""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        print(f"🔍 DEBUG: Auth header received: {auth_header[:50]}..." if len(auth_header) > 50 else f"🔍 DEBUG: Auth header received: {auth_header}")
        
        if not auth_header.startswith('Bearer '):
            print("🔍 DEBUG: No Bearer token found")
            return None
        
        token = auth_header.replace('Bearer ', '')
        print(f"🔍 DEBUG: Extracted token: {token[:20]}...")
        
        # Use the SAME JWT_SECRET that's used in auth/service.py
        JWT_SECRET = os.getenv("JWT_SECRET")
        print(f"🔍 DEBUG: Using JWT_SECRET from env: {JWT_SECRET[:10]}..." if JWT_SECRET and len(JWT_SECRET) > 10 else f"🔍 DEBUG: JWT_SECRET: {JWT_SECRET}")
        
        if not JWT_SECRET:
            print("🔍 DEBUG: No JWT_SECRET found in environment variables!")
            return None
        
        try:
            decoded_token = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            print(f"🔍 DEBUG: Decoded token payload: {decoded_token}")
        except jwt.ExpiredSignatureError:
            print("🔍 DEBUG: Token expired")
            return None
        except jwt.InvalidTokenError as e:
            print(f"🔍 DEBUG: Invalid token error: {e}")
            return None
        
        # Based on your auth/service.py, the token contains 'user_id'
        user_id = decoded_token.get('user_id')
        
        print(f"🔍 DEBUG: Extracted user_id: {user_id}")
        
        if not user_id:
            print("🔍 DEBUG: No user_id found in token payload")
            print(f"🔍 DEBUG: Available fields in token: {list(decoded_token.keys())}")
            return None
            
        return str(user_id)
        
    except Exception as e:
        print(f"🔍 DEBUG: Exception in get_current_user_id: {e}")
        traceback.print_exc()
        return None

# ------------------------------------------------------

#                         Would you rather

# --------------------------------------------------------

@activities_bp.route('/wouldyourather', methods=['GET'])
def get_would_you_rather():
    print("🔍 DEBUG: get_would_you_rather route called")
    db = current_app.config["DB"]
    
    # Get real user ID from JWT token
    current_user_id = get_current_user_id()
    print(f"🔍 DEBUG: Current user ID: {current_user_id}")
    
    if not current_user_id:
        print("🔍 DEBUG: Authentication failed, returning 401")
        return jsonify({'error': 'Authentication required'}), 401
    
    # Get all questions
    questions = list(db['would_you_rather'].find())
    print(f"🔍 DEBUG: Found {len(questions)} questions")
    
    # Get user's votes for these questions using REAL user ID
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
        q['user_vote'] = vote_mapping.get(q['_id'])
        print(f"🔍 DEBUG: Question {q['_id']} has user_vote: {q['user_vote']}")
    
    print(f"🔍 DEBUG: Returning {len(questions)} questions with user votes")
    return jsonify(questions)

@activities_bp.route('/wouldyourather/create', methods=['POST'])
def create_would_you_rather():
    """Create a new Would You Rather question with only two options"""
    
    print("🔍 DEBUG: create_would_you_rather route called")
    try:
        db = current_app.config["DB"]
        
        # Get real user ID from JWT token
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
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
        traceback.print_exc()
        return jsonify({'error': 'Failed to create question'}), 500

@activities_bp.route('/wouldyourather/vote', methods=['POST'])
def vote_would_you_rather():
    print("🔍 DEBUG: vote_would_you_rather route called")
    db = current_app.config["DB"]
    
    # Get real user ID from JWT token
    current_user_id = get_current_user_id()
    if not current_user_id:
        print("🔍 DEBUG: Authentication failed in vote route")
        return jsonify({'error': 'Authentication required'}), 401
    
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
    
    # Check if user has already voted on this question (using REAL user ID)
    existing_vote = db['wyr_votes'].find_one({
        'user_id': current_user_id,
        'question_id': question_obj_id
    })
    
    if existing_vote:
        print(f"🔍 DEBUG: User {current_user_id} already voted on question {question_id}")
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
        
        # Get real user ID from JWT token
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Validate ObjectId format
        try:
            obj_id = ObjectId(question_id)
        except:
            return jsonify({'error': 'Invalid question ID format'}), 400
        
        # Check if question exists
        question = db['would_you_rather'].find_one({'_id': obj_id})
        if not question:
            return jsonify({'error': 'Question not found'}), 404
        
        # Check if user is the creator of this question (optional - you can remove this check)
        if question.get('created_by') != current_user_id:
            print(f"🔍 DEBUG: User {current_user_id} trying to delete question created by {question.get('created_by')}")
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

# Optional: Add a test route to check JWT decoding
@activities_bp.route('/test-auth', methods=['GET'])
def test_auth():
    """Test route to check if JWT authentication is working"""
    current_user_id = get_current_user_id()
    
    if current_user_id:
        return jsonify({
            'authenticated': True,
            'user_id': current_user_id,
            'message': 'JWT authentication working!'
        })
    else:
        return jsonify({
            'authenticated': False,
            'message': 'JWT authentication failed'
        }), 401
    

# ------------------------------------------------------

#                         Whats on your mind

# --------------------------------------------------------

@activities_bp.route('/whatsonmind', methods=['GET'])
def get_whats_on_mind():
    """Get all 'What's on Your Mind' posts"""
    print("🔍 DEBUG: get_whats_on_mind route called")
    db = current_app.config["DB"]
    
    # Get real user ID from JWT token
    current_user_id = get_current_user_id()
    print(f"🔍 DEBUG: Current user ID: {current_user_id}")
    
    if not current_user_id:
        print("🔍 DEBUG: Authentication failed, returning 401")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Get all posts, sorted by creation date (newest first)
        posts = list(db['whats_on_mind'].find().sort('created_at', -1))
        print(f"🔍 DEBUG: Found {len(posts)} posts")
        
        # Convert ObjectId to string for JSON serialization
        for post in posts:
            post['_id'] = str(post['_id'])
            # Add a flag to identify if this post belongs to current user
            post['is_own_post'] = post.get('created_by') == current_user_id
        
        print(f"🔍 DEBUG: Returning {len(posts)} posts")
        return jsonify(posts)
        
    except Exception as e:
        print(f"❌ Error fetching posts: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch posts'}), 500

@activities_bp.route('/whatsonmind/create', methods=['POST'])
def create_whats_on_mind():
    """Create a new 'What's on Your Mind' post"""
    print("🔍 DEBUG: create_whats_on_mind route called")
    
    try:
        db = current_app.config["DB"]
        
        # Get real user ID from JWT token
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
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
        
        # Create new post document
        new_post = {
            'content': content,
            'created_at': datetime.utcnow(),
            'created_by': current_user_id
        }
        
        print(f"🔍 DEBUG: Creating post: {new_post}")
        
        # Insert into database
        result = db['whats_on_mind'].insert_one(new_post)
        print(f"🔍 DEBUG: Insert result: {result.inserted_id}")
        
        # Get the created document
        created_post = db['whats_on_mind'].find_one({'_id': result.inserted_id})
        created_post['_id'] = str(created_post['_id'])
        created_post['is_own_post'] = True  # User just created this post
        
        print(f"🔍 DEBUG: Created post: {created_post}")
        
        return jsonify(created_post), 201
        
    except Exception as e:
        print(f"❌ Error creating post: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to create post'}), 500

@activities_bp.route('/whatsonmind/<post_id>', methods=['DELETE'])
def delete_whats_on_mind(post_id):
    """Delete a 'What's on Your Mind' post"""
    print(f"🔍 DEBUG: delete_whats_on_mind route called for ID: {post_id}")
    
    try:
        db = current_app.config["DB"]
        
        # Get real user ID from JWT token
        current_user_id = get_current_user_id()
        if not current_user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Validate ObjectId format
        try:
            obj_id = ObjectId(post_id)
        except:
            return jsonify({'error': 'Invalid post ID format'}), 400
        
        # Check if post exists
        post = db['whats_on_mind'].find_one({'_id': obj_id})
        if not post:
            return jsonify({'error': 'Post not found'}), 404
        
        # Check if user is the creator of this post
        if post.get('created_by') != current_user_id:
            print(f"🔍 DEBUG: User {current_user_id} trying to delete post created by {post.get('created_by')}")
            return jsonify({'error': 'Not authorized to delete this post'}), 403
        
        # Delete the post
        result = db['whats_on_mind'].delete_one({'_id': obj_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Failed to delete post'}), 500
        
        print(f"🔍 DEBUG: Post {post_id} deleted successfully")
        return jsonify({'message': 'Post deleted successfully'}), 200
        
    except Exception as e:
        print(f"❌ Error deleting post: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete post'}), 500