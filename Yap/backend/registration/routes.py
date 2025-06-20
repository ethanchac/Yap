from flask import Blueprint, request, jsonify, current_app
from users.models import create_user_document
from verification.services import (
    generate_6_digit_code, 
    is_valid_tmu_email, 
    is_code_expired,
    create_verification_data
)
import bcrypt
from shared.email_sender import send_verification_email
from datetime import datetime, timedelta

registration_bp = Blueprint("registration", __name__)

@registration_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    email = data.get("email", "").strip().lower()

    # Validation
    if not username or not password or not email:
        return jsonify({"error": "All fields required"}), 400

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if not is_valid_tmu_email(email):
        return jsonify({"error": "Must use a torontomu.ca email"}), 400

    #the users in database
    users_collection = current_app.config["DB"]["users"]
    
    # check if username exists
    if users_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 409

    # UNCOMMENT THIS PART ONCE EVERYTHING IS FINISHED (REMOVES MAKING MULTI ACCOUNTS WITH SAME EMAIL)
    # if users_collection.find_one({"email": email}):
    #     return jsonify({"error": "Email already registered"}), 409

    # create the user with verification data
    hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    code = generate_6_digit_code()
    verification_data = create_verification_data(code)

    user_doc = create_user_document(username, hashed_pw)
    user_doc["email"] = email
    user_doc["email_verification_data"] = verification_data
    
    try:
        #add to the users
        users_collection.insert_one(user_doc)
        
        # send the verification email
        email_result = send_verification_email(email, code)
        if not email_result:
            print(f"[WARNING] Failed to send email to {email}")
        
        return jsonify({
            "message": "Verification code sent to your TMU email",
            "username": username
        }), 201
        
    except Exception as e:
        print(f"[ERROR] Registration failed: {e}")
        return jsonify({"error": "Registration failed"}), 500

@registration_bp.route("/confirm-code", methods=["POST"])
def confirm_code():
    data = request.get_json()
    username = data.get("username", "").strip()
    code = data.get("code", "").strip()

    if not username or not code:
        return jsonify({"error": "Username and code required"}), 400

    users_collection = current_app.config["DB"]["users"]
    #see if there exists user --> true or false
    user = users_collection.find_one({"username": username})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("is_verified"):
        return jsonify({"error": "Email already verified"}), 400

    verification_data = user.get("email_verification_data")
    if not verification_data:
        return jsonify({"error": "No verification code found"}), 400

    # Debug info
    print(f"[DEBUG] User: {username}")
    print(f"[DEBUG] Submitted code: {code}")
    print(f"[DEBUG] Stored code: {verification_data.get('code')}")
    print(f"[DEBUG] Code created at: {verification_data.get('created_at')}")
    print(f"[DEBUG] Current time: {datetime.now()}")

    # Check if code expired
    if is_code_expired(verification_data.get("created_at")):
        return jsonify({"error": "Verification code expired. Please request a new one."}), 400

    # Check attempt limit
    if verification_data.get("attempts", 0) >= 3:
        return jsonify({"error": "Too many failed attempts. Please request a new code."}), 400

    # Verify code
    if verification_data.get("code") != code:
        # Increment attempts
        users_collection.update_one(
            {"username": username},
            {"$inc": {"email_verification_data.attempts": 1}}
        )
        
        remaining_attempts = 3 - (verification_data.get("attempts", 0) + 1)
        return jsonify({
            "error": f"Invalid code. {remaining_attempts} attempts remaining."
        }), 400

    # Success - verify user
    users_collection.update_one(
        {"username": username},
        {
            "$set": {"is_verified": True, "verified_at": datetime.now()},
            "$unset": {"email_verification_data": ""}
        }
    )

    return jsonify({"message": "Email verified successfully! You can now log in."}), 200

@registration_bp.route("/resend-verification", methods=["POST"])
def resend_code():
    data = request.get_json()
    username = data.get("username", "").strip()

    if not username:
        return jsonify({"error": "Username required"}), 400

    users_collection = current_app.config["DB"]["users"]
    user = users_collection.find_one({"username": username})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.get("is_verified"):
        return jsonify({"error": "Email already verified"}), 400

    # Rate limiting - only allow resend every 60 seconds
    verification_data = user.get("email_verification_data")
    if verification_data:
        last_sent = verification_data.get("created_at")
        if last_sent and datetime.now() - last_sent < timedelta(seconds=60):
            return jsonify({"error": "Please wait 60 seconds before requesting a new code"}), 429

    # Generate new code
    code = generate_6_digit_code()
    new_verification_data = create_verification_data(code)

    users_collection.update_one(
        {"username": username},
        {"$set": {"email_verification_data": new_verification_data}}
    )

    # Send email
    email = user.get("email")
    email_result = send_verification_email(email, code)
    
    if email_result:
        return jsonify({"message": "New verification code sent"}), 200
    else:
        return jsonify({"error": "Failed to send email"}), 500