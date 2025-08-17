from flask import Blueprint, request, jsonify, current_app
from auth.service import check_password, generate_token, token_required
import bcrypt

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

@auth_bp.route("/change-password", methods=["POST"])
@token_required
def change_password(current_user):
    """Change password for authenticated user"""
    data = request.get_json()
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    # Validate input
    if not current_password or not new_password or not confirm_password:
        return jsonify({"error": "All password fields are required"}), 400

    if new_password != confirm_password:
        return jsonify({"error": "New passwords do not match"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    # Verify current password
    if not check_password(current_password, current_user["password"]):
        return jsonify({"error": "Current password is incorrect"}), 400

    # Check if new password is different from current
    if check_password(new_password, current_user["password"]):
        return jsonify({"error": "New password must be different from current password"}), 400

    try:
        # Hash new password
        hashed_pw = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

        # Update password in database
        db = current_app.config["DB"]
        users_collection = db["users"]
        
        result = users_collection.update_one(
            {"username": current_user["username"]},
            {
                "$set": {
                    "password": hashed_pw,
                    "password_changed_at": request.json.get("timestamp", "now")
                }
            }
        )

        if result.modified_count == 0:
            return jsonify({"error": "Failed to update password"}), 500

        return jsonify({"message": "Password changed successfully"}), 200

    except Exception as e:
        print(f"[ERROR] Change password failed: {e}")
        return jsonify({"error": "Password change failed. Please try again."}), 500