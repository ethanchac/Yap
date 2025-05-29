from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jet_identity, get_jwt
from authentication.user_model import User
import logging

auth_bp = Blueprint('auth', __name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()

        required_fields = ['username', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            return jsonify({
                'error': f'Missing required fields : {", ".join(missing_fields)}'
            }), 400
        
        username = data['username'].strip()
        password = data['password']
        full_name = data.get('full_name', '').strip()

        user_model = User(current_app.db)

        user, error = user_model.create_user(username, password, full_name)

        if error:
            return jsonify({'error' : error}), 400
        access_token = create_access_token(identity=user['id'])
        refresh_token = create_refresh_token(identity=user['id'])

        logger.info(f"New user registered: {username}")

        return jsonify({
            'message' : 'User created successfully',
            'user': user,
            'access_token' : access_token,
            'refresh_token' : refresh_token
        }), 201
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
    
@auth_bp.route('/login', methods=['POST'])
def login():