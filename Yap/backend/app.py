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
from eventthreads.routes import eventthreads_bp
import os
import sys
import logging
import redis

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

# FIXED: Redis Configuration with proper error handling
def setup_redis_connection():
    """Setup Redis connection without crashing the app"""
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    logger.info(f"🔴 Attempting Redis connection to: {redis_url[:30]}...")
    
    try:
        redis_client = redis.from_url(
            redis_url, 
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        # Test the connection
        redis_client.ping()
        logger.info("✅ Redis connection successful!")
        return redis_client
        
    except redis.ConnectionError as e:
        logger.error(f"❌ Redis connection failed: {e}")
        logger.warning("⚠️ App will continue without Redis (messaging features may be limited)")
        return None
        
    except Exception as e:
        logger.error(f"❌ Unexpected Redis error: {e}")
        logger.warning("⚠️ App will continue without Redis")
        return None

# Initialize Redis (won't crash if it fails)
redis_client = setup_redis_connection()

# CORS Configuration - Updated for Railway
CORS(app, 
     origins=[
         "http://localhost:5173", 
         "http://127.0.0.1:5173", 
         "http://localhost:3000",
         "https://your-vercel-app.vercel.app",
         os.getenv("FRONTEND_URL", ""),
         "https://*.railway.app"  # Added Railway domains
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Accept", "X-User-ID"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# FIXED: SOCKETIO CONFIGURATION with conditional Redis
if redis_client:
    # SocketIO with Redis message queue
    logger.info("🔌 Configuring SocketIO with Redis message queue...")
    socketio = SocketIO(
        app, 
        cors_allowed_origins=[
            "http://localhost:5173", 
            "http://127.0.0.1:5173", 
            "http://localhost:3000",
            "https://your-vercel-app.vercel.app",
            os.getenv("FRONTEND_URL", ""),
            "https://*.railway.app"
        ],
        async_mode='threading',
        ping_timeout=60,
        ping_interval=25,
        transports=['websocket', 'polling'],
        logger=True,
        engineio_logger=True,
        allow_upgrades=True,
        message_queue=os.getenv('REDIS_URL')  # Use Redis for scaling
    )
    logger.info("✅ SocketIO configured with Redis message queue")
else:
    # SocketIO without Redis (single server mode)
    logger.warning("⚠️ Configuring SocketIO without Redis (single server mode)")
    socketio = SocketIO(
        app, 
        cors_allowed_origins=[
            "http://localhost:5173", 
            "http://127.0.0.1:5173", 
            "http://localhost:3000",
            "https://your-vercel-app.vercel.app",
            os.getenv("FRONTEND_URL", ""),
            "https://*.railway.app"
        ],
        async_mode='threading',
        ping_timeout=60,
        ping_interval=25,
        transports=['websocket', 'polling'],
        logger=True,
        engineio_logger=True,
        allow_upgrades=True
        # No message_queue - single server mode
    )

# Store Redis client in app config (can be None)
app.config['REDIS'] = redis_client

# configuring file upload
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads/profile_pictures'

# create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Enhanced CORS handling for complex requests
@app.after_request
def after_request(response):
    """Enhanced CORS handling"""
    origin = request.headers.get('Origin')
    allowed_origins = [
        'http://localhost:5173', 
        'http://127.0.0.1:5173', 
        'http://localhost:3000',
        'https://your-vercel-app.vercel.app',
        os.getenv("FRONTEND_URL", ""),
        'https://*.railway.app'
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
            'https://your-vercel-app.vercel.app',
            os.getenv("FRONTEND_URL", ""),
            'https://*.railway.app'
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
app.register_blueprint(eventthreads_bp, url_prefix='/eventthreads')

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
            from Yap.backend.messages.socket_handlers import handle_connect
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
            from Yap.backend.messages.socket_handlers import handle_disconnect
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
            from Yap.backend.messages.socket_handlers import handle_join_conversation
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
            from Yap.backend.messages.socket_handlers import handle_leave_conversation
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
            from Yap.backend.messages.socket_handlers import handle_send_message
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
            from Yap.backend.messages.socket_handlers import handle_typing_start
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
            from Yap.backend.messages.socket_handlers import handle_typing_stop
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

# FIXED: Health check endpoint with better Redis handling
@app.route('/health')
def health_check():
    """Health check endpoint with detailed status"""
    redis_status = "disconnected"
    redis_error = None
    
    try:
        if redis_client:
            redis_client.ping()
            redis_status = "connected"
        else:
            redis_status = "not_initialized"
    except Exception as e:
        redis_status = "error"
        redis_error = str(e)
    
    # Test MongoDB
    db_status = "connected"
    db_error = None
    try:
        db.command('ping')
    except Exception as e:
        db_status = "error"
        db_error = str(e)
    
    overall_status = "healthy"
    if db_status != "connected":
        overall_status = "unhealthy"  # MongoDB is critical
    elif redis_status not in ["connected", "not_initialized"]:
        overall_status = "degraded"  # Redis issues are not fatal
    
    response = {
        "status": overall_status,
        "database": {
            "name": db_name,
            "status": db_status,
            "error": db_error
        },
        "redis": {
            "status": redis_status,
            "error": redis_error,
            "url_configured": bool(os.getenv('REDIS_URL'))
        },
        "environment": {
            "mode": "TEST" if TEST_MODE else "PRODUCTION",
            "port": os.environ.get('PORT', 5000)
        }
    }
    
    return jsonify(response)

# Add debug endpoint
@app.route('/debug')
def debug_info():
    """Debug endpoint to check configuration"""
    return jsonify({
        "redis_url_set": bool(os.getenv('REDIS_URL')),
        "redis_client_initialized": redis_client is not None,
        "environment_vars": {
            "REDIS_URL": "SET" if os.getenv('REDIS_URL') else "NOT_SET",
            "SECRET_KEY": "SET" if os.getenv('SECRET_KEY') else "NOT_SET",
            "MONGO_URI": "SET" if os.getenv('MONGO_URI') else "NOT_SET"
        }
    })

if __name__ == "__main__":
    logger.info("🚀 Starting SocketIO server...")
    
    # Get port from environment variable (Railway provides this)
    port = int(os.environ.get('PORT', 5000))
    
    logger.info(f"🌐 Server will be accessible at http://0.0.0.0:{port}")
    logger.info(f"🔌 WebSocket endpoint: ws://0.0.0.0:{port}/socket.io/")
    
    if redis_client:
        logger.info(f"🔴 Redis: Connected")
    else:
        logger.warning(f"🔴 Redis: Not connected (app will run in single-server mode)")
    
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(
        app, 
        debug=False,  # Set to False for production
        host='0.0.0.0',  # This allows external connections
        port=port,  # Use the PORT environment variable
        use_reloader=False,  # Disable reloader in production
        log_output=True
    )