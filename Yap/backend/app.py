from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO
from dotenv import load_dotenv
from pymongo import MongoClient
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
import os
import sys

# loading the .env variables
load_dotenv()

# check if it is in test mode (--test)
TEST_MODE = "--test" in sys.argv or os.getenv("FLASK_ENV") == "testing"

# setting up flask
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

# SOCKETIO CONFIGURATION
socketio = SocketIO(
    app, 
    cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    async_mode='threading',
    ping_timeout=60,
    ping_interval=25,
    transports=['websocket', 'polling']
)

# configuring file upload
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads/profile_pictures'

# create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Manual CORS handling
@app.after_request
def after_request(response):
    """Handle CORS manually"""
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Accept'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@app.before_request
def handle_options():
    """Handle preflight OPTIONS requests"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
        response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Accept'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

# database selection based on test mode
if TEST_MODE:
    mongo_uri = os.getenv("MONGO_TEST_URI")
    db_name = "unithread_test"
    print("🧪 Running in TEST mode - using test database")
else:
    mongo_uri = os.getenv("MONGO_URI")
    db_name = "unithread"
    print("🚀 Running in DEV mode - using main database")

# MongoDB setup
client = MongoClient(mongo_uri)
db = client[db_name]
app.config["DB"] = db

print(f"📊 Connected to database: {db_name}")

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

# ===== SOCKETIO EVENT HANDLERS =====

@socketio.on('connect')
def handle_connect(auth):
    """Handle client connection"""
    from messages.services import handle_connect
    handle_connect(socketio, auth)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    from messages.services import handle_disconnect
    handle_disconnect()

@socketio.on('join_conversation')
def handle_join_conversation(data):
    """Join a conversation room"""
    from messages.services import handle_join_conversation
    handle_join_conversation(socketio, data)

@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    """Leave a conversation room"""
    from messages.services import handle_leave_conversation
    handle_leave_conversation(data)

@socketio.on('send_message')
def handle_send_message(data):
    """Handle sending a message"""
    from messages.services import handle_send_message
    handle_send_message(socketio, data)

@socketio.on('typing_start')
def handle_typing_start(data):
    """Handle typing indicator start"""
    from messages.services import handle_typing_start
    handle_typing_start(socketio, data)

@socketio.on('typing_stop')
def handle_typing_stop(data):
    """Handle typing indicator stop"""
    from messages.services import handle_typing_stop
    handle_typing_stop(socketio, data)

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

if __name__ == "__main__":
    # Use socketio.run instead of app.run for WebSocket support
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)