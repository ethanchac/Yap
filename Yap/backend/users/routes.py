from flask import Blueprint, request, jsonify, current_app
from users.services import register_user

users_bp = Blueprint("users", __name__)

@users_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    users_collection = current_app.config["DB"]["users"]
    result = register_user(users_collection, username, password)

    if not result["success"]:
        return jsonify({"error": result["error"]}), 409

    return jsonify({"message": result["message"]}), 201
