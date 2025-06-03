from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
from users.routes import users_bp
from authentication.routes import auth_bp
import os

# Load environment variables
load_dotenv()

# Flask setup
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

# MongoDB setup
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["unithread"]  # This must match the DB name in your URI
app.config["DB"] = db
app.register_blueprint(users_bp, url_prefix="/users")
app.register_blueprint(auth_bp, url_prefix="/auth")

posts_collection = db["posts"]

# Routes
@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"message": "pong"})

@app.route("/submit-post", methods=["POST"])
def submit_post():
    data = request.get_json()

    # Validate
    username = data.get("username")
    content = data.get("content")

    if not username or not content:
        return jsonify({"error": "username and content required"}), 400

    # Save to DB
    post = {"username": username, "content": content}
    result = posts_collection.insert_one(post)

    return jsonify({
        "message": "Post submitted",
        "post_id": str(result.inserted_id)
    }), 201

if __name__ == "__main__":
    app.run(debug=True)
