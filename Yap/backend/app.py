from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient, GEOSPHERE
from auth.routes import auth_bp
from registration.routes import registration_bp
from users.routes import users_bp
from verification.routes import verification_bp
from posts.routes import posts_bp
from comments.routes import comments_bp
from messages.routes import messages_bp 
from events.routes import events_bp
from password_reset.routes import password_reset_bp
from feedback.routes import feedback_bp
from activities.routes import activities_bp
from waypoint.routes import waypoint_bp
import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# loading the .env variables
load_dotenv()

# check if it is in test mode (--test)
TEST_MODE = "--test" in sys.argv or os.getenv("FLASK_ENV") == "testing"

# setting up flask
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

# CORS Configuration - Updated for Render deployment
# Add your Vercel domain here once deployed
CORS(app, 
     origins=[
         "http://localhost:5173", 
         "http://127.0.0.1:5173", 
         "http://localhost:3000",
         "https://your-vercel-app.vercel.app",  # Replace with your actual Vercel URL
         os.getenv("FRONTEND_URL", "")  # Add this to your Render environment variables
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Accept", "X-User-ID"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# SOCKETIO CONFIGURATION with proper CORS - Updated for production
socketio = SocketIO(
    app, 
    cors_allowed_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:3000",
        "https://your-vercel-app.vercel.app",  # Replace with your actual Vercel URL
        os.getenv("FRONTEND_URL", "")
    ],
    async_mode='threading',
    ping_timeout=60,
    ping_interval=25,
    transports=['websocket', 'polling'],
    logger=True,
    engineio_logger=True,
    allow_upgrades=True
)

# configuring file upload
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads/profile_pictures'

# create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Enhanced CORS handling for complex requests - Updated for production
@app.after_request
def after_request(response):
    """Enhanced CORS handling"""
    origin = request.headers.get('Origin')
    allowed_origins = [
        'http://localhost:5173', 
        'http://127.0.0.1:5173', 
        'http://localhost:3000',
        'https://your-vercel-app.vercel.app',  # Replace with your actual Vercel URL
        os.getenv("FRONTEND_URL", "")
    ]
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Accept,X-Requested-With,X-User-ID'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

@app.before_request
def handle_options():
    """Handle preflight OPTIONS requests"""
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin')
        allowed_origins = [
            'http://localhost:5173', 
            'http://127.0.0.1:5173', 
            'http://localhost:3000',
            'https://your-vercel-app.vercel.app',  # Replace with your actual Vercel URL
            os.getenv("FRONTEND_URL", "")
        ]
        
        response = jsonify({'status': 'OK'})
        
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS,PATCH'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Accept,X-Requested-With,X-User-ID'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response

# database selection based on test mode
if TEST_MODE:
    mongo_uri = os.getenv("MONGO_TEST_URI")
    db_name = "unithread_test"
    print("🧪 Running in TEST mode - using test database")
else:
    mongo_uri = os.getenv("MONGO_URI")
    db_name = "unithread"
    print("🚀 Running in production mode - using main database")

# MongoDB setup
client = MongoClient(mongo_uri)
db = client[db_name]
app.config["DB"] = db

print(f"📊 Connected to database: {db_name}")

# ===== WAYPOINT INDEXES SETUP =====
def setup_waypoint_indexes():
    """Set up MongoDB indexes for waypoints"""
    try:
        print("🗺️  Setting up waypoint indexes...")
        
        # Create 2dsphere index for geospatial queries
        db.waypoint.create_index([("location", GEOSPHERE)])
        print("  ✅ Geospatial index created")
        
        # Create compound indexes for better performance
        db.waypoint.create_index([
            ("active", 1),
            ("type", 1),
            ("created_at", -1)
        ])
        print("  ✅ Active waypoints index created")
        
        # Index for user's waypoints
        db.waypoint.create_index([
            ("user_id", 1),
            ("created_at", -1)
        ])
        print("  ✅ User waypoints index created")
        
        # Index for expiration cleanup
        db.waypoint.create_index([
            ("expires_at", 1),
            ("active", 1)
        ])
        print("  ✅ Expiration index created")
        
        # TTL index for automatic cleanup of expired waypoints
        db.waypoint.create_index(
            [("expires_at", 1)], 
            expireAfterSeconds=0  # Delete when expires_at time is reached
        )
        print("  ✅ TTL index for expired waypoints created")
        
        print("🗺️  Waypoint indexes setup complete!")
        
    except Exception as e:
        print(f"❌ Error setting up waypoint indexes: {e}")

# Setup waypoint indexes
setup_waypoint_indexes()

# register blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(registration_bp, url_prefix="/users")
app.register_blueprint(users_bp, url_prefix="/users")
app.register_blueprint(verification_bp, url_prefix="/verification")
app.register_blueprint(posts_bp, url_prefix="/posts")
app.register_blueprint(comments_bp, url_prefix="/comments")
app.register_blueprint(messages_bp, url_prefix="/messages") 
app.register_blueprint(events_bp, url_prefix='/events')
app.register_blueprint(password_reset_bp, url_prefix="/password-reset")
app.register_blueprint(feedback_bp, url_prefix="/api") 
app.register_blueprint(activities_bp, url_prefix='/api/activities')  
app.register_blueprint(waypoint_bp, url_prefix='/waypoint')

# ===== SOCKETIO EVENT HANDLERS =====

@socketio.on('connect')
def handle_connect(auth):
    """Handle client connection"""
    logger.info(f"Socket connection attempt from {request.sid} with auth: {auth}")
    try:
        # Import here to avoid circular imports
        from messages.socket_handlers import handle_connect
        result = handle_connect(socketio, auth)
        if result:
            logger.info(f"Socket {request.sid} connected successfully")
        else:
            logger.warning(f"Socket {request.sid} connection failed")
    except ImportError:
        # Fallback if socket_handlers doesn't exist, try services
        try:
            from messages.services import handle_connect
            handle_connect(socketio, auth)
        except ImportError as e:
            logger.error(f"Could not import socket handlers: {e}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"Socket {request.sid} disconnecting")
    try:
        from messages.socket_handlers import handle_disconnect
        handle_disconnect()
    except ImportError:
        try:
            from messages.services import handle_disconnect
            handle_disconnect()
        except ImportError as e:
            logger.error(f"Could not import socket handlers: {e}")

@socketio.on('join_conversation')
def handle_join_conversation(data):
    """Join a conversation room"""
    logger.info(f"Socket {request.sid} joining conversation: {data}")
    try:
        from messages.socket_handlers import handle_join_conversation
        handle_join_conversation(socketio, data)
    except ImportError:
        try:
            from messages.services import handle_join_conversation
            handle_join_conversation(socketio, data)
        except ImportError as e:
            logger.error(f"Could not import socket handlers: {e}")

@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    """Leave a conversation room"""
    logger.info(f"Socket {request.sid} leaving conversation: {data}")
    try:
        from messages.socket_handlers import handle_leave_conversation
        handle_leave_conversation(data)
    except ImportError:
        try:
            from messages.services import handle_leave_conversation
            handle_leave_conversation(data)
        except ImportError as e:
            logger.error(f"Could not import socket handlers: {e}")

@socketio.on('send_message')
def handle_send_message(data):
    """Handle sending a message"""
    logger.info(f"Socket {request.sid} sending message to conversation {data.get('conversation_id')}")
    try:
        from messages.socket_handlers import handle_send_message
        handle_send_message(socketio, data)
    except ImportError:
        try:
            from messages.services import handle_send_message
            handle_send_message(socketio, data)
        except ImportError as e:
            logger.error(f"Could not import socket handlers: {e}")

@socketio.on('typing_start')
def handle_typing_start(data):
    """Handle typing indicator start"""
    try:
        from messages.socket_handlers import handle_typing_start
        handle_typing_start(socketio, data)
    except ImportError:
        try:
            from messages.services import handle_typing_start
            handle_typing_start(socketio, data)
        except ImportError as e:
            logger.error(f"Could not import socket handlers: {e}")

@socketio.on('typing_stop')
def handle_typing_stop(data):
    """Handle typing indicator stop"""
    try:
        from messages.socket_handlers import handle_typing_stop
        handle_typing_stop(socketio, data)
    except ImportError:
        try:
            from messages.services import handle_typing_stop
            handle_typing_stop(socketio, data)
        except ImportError as e:
            logger.error(f"Could not import socket handlers: {e}")

# Add error handler for socket events
@socketio.on_error_default
def default_error_handler(e):
    """Handle socket errors"""
    logger.error(f"Socket error from {request.sid}: {e}")

# route to serve uploaded profile pictures
@app.route('/uploads/profile_pictures/<user_id>/<filename>')
def uploaded_file(user_id, filename):
    """Serve uploaded profile pictures"""
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], user_id, filename)
        if os.path.exists(file_path):
            return send_from_directory(
                os.path.join(app.config['UPLOAD_FOLDER'], user_id), 
                filename
            )
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to serve file"}), 500

# when file size is too big
@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum size is 5MB"}), 413

# Add health check endpoint
@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "database": db_name,
        "mode": "TEST" if TEST_MODE else "PRODUCTION"
    })

if __name__ == "__main__":
    logger.info("🚀 Starting SocketIO server...")
    
    # Get port from environment variable (Render provides this)
    port = int(os.environ.get('PORT', 5000))
    
    logger.info(f"🌐 Server will be accessible at http://0.0.0.0:{port}")
    logger.info(f"🔌 WebSocket endpoint: ws://0.0.0.0:{port}/socket.io/")
    
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(
        app, 
        debug=False,  # Set to False for production
        host='0.0.0.0',  # This allows external connections
        port=port,  # Use the PORT environment variable
        use_reloader=False,  # Disable reloader in production
        log_output=True
    )