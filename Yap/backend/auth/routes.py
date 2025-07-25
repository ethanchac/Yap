from flask import Blueprint, request, jsonify, current_app
from auth.service import check_password, generate_token #methods you can use from auth.service

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    users_collection = current_app.config["DB"]["users"]
    user = users_collection.find_one({"username": username})

    if not user or not check_password(password, user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(user)
    return jsonify({"token": token}), 200
