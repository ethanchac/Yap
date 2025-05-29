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
    try:
        data = request.get_json()

        if not data.get('username') or not data.get('password'):
            return jsonify({'error' : 'username and password required'}), 400
        
        username = data['username'].strip()
        password = data['password']

        user_model = User(current_app.db)

        user, error = user_model.authenticate_user(username, password)

        if error:
            return jsonify({'error' : error}), 401
        
        access_token = create_access_token(identity=user['id'])
        refresh_token = create_refresh_token(identity=user['id'])

        logger.info(f"User logged in {user['username']}")

        return jsonify({
            'message': 'Login successful',
            'user': user,
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
    except Exception as e:
        logger.error(f"Login error : {str(e)}")
        return jsonify({'error' : 'Internal server error'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user_id = get_jwt_identity()

        user_model = User(current_app.db)
        user = user_model.get_user_by_id(current_user_id)

        if not user:
            return jsonify({'error' : 'User not found'}), 404
        
        access_token = create_access_token(identity=current_user_id)

        return jsonify({
            'access_token' : access_token,
            'user' : user
        }), 200
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return jsonify({'error' : 'internal server error'}), 500
    
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_id = get_jwt_identity()

        user_model = User(current_app.db)
        user = user_model.get_user_by_id(current_user_id)
        if not user:
            return jsonify({'errpr' : 'user not found'}), 404
        return jsonify({'user' : user}), 200
    except Exception as e:
        logger.error(f"Get current user error : {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
    
@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout endpoint (for token blacklisting if implemented)"""
    try:
        # In a production app, you might want to blacklist the token
        # For now, we'll just return a success message
        # The client should remove the token from storage
        
        jti = get_jwt()['jti']  # JWT ID for blacklisting
        current_user_id = get_jwt_identity()
        
        logger.info(f"User logged out: {current_user_id}")
        
        return jsonify({'message': 'Successfully logged out'}), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/verify-token', methods=['POST'])
@jwt_required()
def verify_token():
    """Verify if token is valid"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user still exists
        user_model = User(current_app.db)
        user = user_model.get_user_by_id(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found', 'valid': False}), 404
        
        return jsonify({
            'valid': True,
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Invalid token', 'valid': False}), 401
    
