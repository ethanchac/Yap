from flask import Blueprint, request, jsonify, current_app
from auth.service import check_password, generate_token

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    db = current_app.config["DB"]
    users_collection = db["users"]
    pending_registrations = db["pending_registrations"]
    
    user = users_collection.find_one({"username": username})

    if not user:
        # Check if there's a pending registration for this username
        pending_user = pending_registrations.find_one({"username": username})
        if pending_user:
            # If pending registration exists, direct them to complete verification
            return jsonify({
                "error": "Email not verified. Please check your email and verify your account before logging in.", 
                "requires_verification": True,
                "username": username
            }), 403
        else:
            # No user and no pending registration - invalid credentials
            return jsonify({"error": "Invalid credentials"}), 401

    if not check_password(password, user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    # At this point, user exists and password is correct
    # Check if email is verified (this should always be true for users in the users collection now)
    if not user.get("is_verified", False):
        return jsonify({
            "error": "Email not verified. Please check your email and verify your account before logging in.", 
            "requires_verification": True,
            "username": username
        }), 403

    # Only generate token if user is verified
    token = generate_token(user)
    return jsonify({"token": token}), 200