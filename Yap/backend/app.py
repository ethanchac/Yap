from flask import Flask, request, jsonify
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

# Load environment variables
load_dotenv()

# Check if we're in test mode (you can pass --test argument)
TEST_MODE = "--test" in sys.argv or os.getenv("FLASK_ENV") == "testing"

# Flask setup
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

# Database selection based on test mode
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

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(registration_bp, url_prefix="/users")
app.register_blueprint(users_bp, url_prefix="/profile")
app.register_blueprint(verification_bp, url_prefix="/verification")
app.register_blueprint(posts_bp, url_prefix="/posts")
app.register_blueprint(comments_bp, url_prefix="/comments")

if __name__ == "__main__":
    app.run(debug=True)