from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
from auth.routes import auth_bp
from registration.routes import registration_bp
from users.routes import users_bp
from verification.routes import verification_bp
from posts.routes import posts_bp
from comments.routes import comments_bp
import os
import sys

# loading the .env variables
load_dotenv()

# check if it is in test mode (--test)
TEST_MODE = "--test" in sys.argv or os.getenv("FLASK_ENV") == "testing"

# setting up flask
app = Flask(__name__)

# configuring file upload
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads/profile_pictures'

# create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# CORS configuration
CORS(app, 
     origins=["http://localhost:5173"], 
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

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

# register blueprints (keep adding based on new routes added)
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(registration_bp, url_prefix="/users")
app.register_blueprint(users_bp, url_prefix="/profile")
app.register_blueprint(verification_bp, url_prefix="/verification")
app.register_blueprint(posts_bp, url_prefix="/posts")
app.register_blueprint(comments_bp, url_prefix="/comments")

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
        print(f"Error serving file: {e}")
        return jsonify({"error": "Failed to serve file"}), 500


# when file size is too big
@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum size is 5MB"}), 413

if __name__ == "__main__":
    app.run(debug=True)