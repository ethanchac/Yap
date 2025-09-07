from flask import Blueprint, request, jsonify, current_app
from verification.services import (
    generate_6_digit_code, 
    is_valid_tmu_email, 
    is_code_expired,
    create_verification_data
)
import bcrypt
from shared.email_sender import send_password_reset_email
from datetime import datetime, timedelta

password_reset_bp = Blueprint("password_reset", __name__)

@password_reset_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not is_valid_tmu_email(email):
        return jsonify({"error": "Must use a torontomu.ca email"}), 400

    users_collection = current_app.config["DB"]["users"]
    user = users_collection.find_one({"email": email})

    if not user:
        # For security, don't reveal if email exists or not
        return jsonify({"message": "If this email is registered, you will receive a password reset code"}), 200

    if not user.get("is_verified"):
        return jsonify({"error": "Please verify your email first before resetting password"}), 400

    # Rate limiting - only allow password reset every 60 seconds
    password_reset_data = user.get("password_reset_data")
    if password_reset_data:
        last_sent = password_reset_data.get("created_at")
        if last_sent and datetime.now() - last_sent < timedelta(seconds=60):
            return jsonify({"error": "Please wait 60 seconds before requesting another reset code"}), 429

    # Generate reset code
    code = generate_6_digit_code()
    reset_data = create_verification_data(code)

    try:
        # Store reset data for all users with this email
        result = users_collection.update_many(
            {"email": email},
            {"$set": {"password_reset_data": reset_data}}
        )
        
        print(f"[INFO] Reset data stored for {result.modified_count} user(s) with email {email}")

        # Send reset email
        email_result = send_password_reset_email(email, code)
        if not email_result:
            print(f"[WARNING] Failed to send password reset email to {email}")
            return jsonify({"error": "Failed to send reset email"}), 500

        return jsonify({"message": "Password reset code sent to your email"}), 200

    except Exception as e:
        print(f"[ERROR] Password reset request failed: {e}")
        return jsonify({"error": "Password reset request failed"}), 500

@password_reset_bp.route("/verify-reset-code", methods=["POST"])
def verify_reset_code():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()

    if not email or not code:
        return jsonify({"error": "Email and code are required"}), 400

    users_collection = current_app.config["DB"]["users"]
    user = users_collection.find_one({"email": email})

    if not user:
        return jsonify({"error": "Invalid email or code"}), 400

    password_reset_data = user.get("password_reset_data")
    if not password_reset_data:
        return jsonify({"error": "No password reset request found"}), 400

    # Check if code is expired
    if is_code_expired(password_reset_data.get("created_at")):
        return jsonify({"error": "Reset code expired. Please request a new one."}), 400

    # Check attempt limit
    if password_reset_data.get("attempts", 0) >= 3:
        return jsonify({"error": "Too many failed attempts. Please request a new code."}), 400

    # Verify code
    if password_reset_data.get("code") != code:
        # Increment attempts for all users with this email
        users_collection.update_many(
            {"email": email},
            {"$inc": {"password_reset_data.attempts": 1}}
        )
        
        remaining_attempts = 3 - (password_reset_data.get("attempts", 0) + 1)
        return jsonify({
            "error": f"Invalid code. {remaining_attempts} attempts remaining."
        }), 400

    # Code is valid - mark as verified for all users with this email
    users_collection.update_many(
        {"email": email},
        {"$set": {"password_reset_data.verified": True}}
    )

    return jsonify({"message": "Code verified successfully. You can now reset your password."}), 200

@password_reset_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    new_password = data.get("new_password", "")

    if not email or not code or not new_password:
        return jsonify({"error": "Email, code, and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    users_collection = current_app.config["DB"]["users"]
    user = users_collection.find_one({"email": email})

    if not user:
        return jsonify({"error": "Invalid email or code"}), 400

    password_reset_data = user.get("password_reset_data")
    if not password_reset_data:
        return jsonify({"error": "No password reset request found"}), 400

    # Check if code is expired
    if is_code_expired(password_reset_data.get("created_at")):
        return jsonify({"error": "Reset code expired. Please request a new one."}), 400

    # Check if code was verified
    if not password_reset_data.get("verified"):
        return jsonify({"error": "Code must be verified first"}), 400

    # Verify code one more time
    if password_reset_data.get("code") != code:
        return jsonify({"error": "Invalid code"}), 400

    try:
        # Hash new password
        hashed_pw = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

        # Update password for all users with this email and remove reset data
        result = users_collection.update_many(
            {"email": email},
            {
                "$set": {
                    "password": hashed_pw,
                    "password_reset_at": datetime.now()
                },
                "$unset": {"password_reset_data": ""}
            }
        )
        
        print(f"[INFO] Password updated for {result.modified_count} user(s) with email {email}")

        return jsonify({"message": "Password reset successfully. You can now log in with your new password."}), 200

    except Exception as e:
        print(f"[ERROR] Password reset failed: {e}")
        return jsonify({"error": "Password reset failed"}), 500

@password_reset_bp.route("/resend-reset-code", methods=["POST"])
def resend_reset_code():
    data = request.get_json()
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    users_collection = current_app.config["DB"]["users"]
    user = users_collection.find_one({"email": email})

    if not user:
        # For security, don't reveal if email exists or not
        return jsonify({"message": "If this email is registered, you will receive a password reset code"}), 200

    # Rate limiting - only allow resend every 60 seconds
    password_reset_data = user.get("password_reset_data")
    if password_reset_data:
        last_sent = password_reset_data.get("created_at")
        if last_sent and datetime.now() - last_sent < timedelta(seconds=60):
            return jsonify({"error": "Please wait 60 seconds before requesting another code"}), 429

    # Generate new reset code
    code = generate_6_digit_code()
    reset_data = create_verification_data(code)

    users_collection.update_many(
        {"email": email},
        {"$set": {"password_reset_data": reset_data}}
    )

    # Send email
    email_result = send_password_reset_email(email, code)
    
    if email_result:
        return jsonify({"message": "New reset code sent"}), 200
    else:
        return jsonify({"error": "Failed to send email"}), 500