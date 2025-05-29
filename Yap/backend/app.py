from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from datetime import timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    
    # Initialize extensions
    CORS(app, origins=["http://localhost:3000"])  # Allow React dev server
    jwt = JWTManager(app)
    
    # MongoDB connection
    client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
    app.db = client[os.getenv('DB_NAME', 'social_media_db')]
    
    # Create indexes for better performance
    app.db.users.create_index("username", unique=True)
    app.db.posts.create_index([("created_at", -1)])  # For timeline sorting
    app.db.posts.create_index("author_id")
    
    # Register blueprints
    from authentication.auth import auth_bp
    from posts.posts import posts_bp
    from users.users import users_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(posts_bp, url_prefix='/api/posts')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'message': 'Token has expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'message': 'Invalid token'}, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'message': 'Authorization token is required'}, 401
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)