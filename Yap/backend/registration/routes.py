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

def cleanup_expired_registrations():
    """Clean up expired pending registrations"""
    try:
        db = current_app.config["DB"]
        pending_registrations = db["pending_registrations"]
        
        # Remove all registrations that have expired
        result = pending_registrations.delete_many({
            "expires_at": {"$lt": datetime.now()}
        })
        
        if result.deleted_count > 0:
            print(f"[CLEANUP] Removed {result.deleted_count} expired pending registrations")
            
    except Exception as e:
        print(f"[ERROR] Failed to cleanup expired registrations: {e}")

@registration_bp.route("/register", methods=["POST"])
def register():
    # Clean up expired registrations first
    cleanup_expired_registrations()
    
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

    db = current_app.config["DB"]
    users_collection = db["users"]
    pending_registrations = db["pending_registrations"]
    
    # Check if username exists in actual users (not pending)
    if users_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 409

    # UNCOMMENT THIS PART ONCE EVERYTHING IS FINISHED (REMOVES MAKING MULTI ACCOUNTS WITH SAME EMAIL)
    #if users_collection.find_one({"email": email}):
        #return jsonify({"error": "Email already registered"}), 409

    # Remove any existing pending registration for this username/email
    pending_registrations.delete_many({"$or": [{"username": username}, {"email": email}]})

    # Create pending registration instead of actual user
    hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    code = generate_6_digit_code()
    verification_data = create_verification_data(code)

    pending_registration = {
        "username": username,
        "password": hashed_pw,
        "email": email,
        "verification_data": verification_data,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24)  # Pending registrations expire after 24 hours
    }
    
    try:
        # Store in pending registrations collection
        pending_registrations.insert_one(pending_registration)
        
        # Send verification email
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

    db = current_app.config["DB"]
    users_collection = db["users"]
    pending_registrations = db["pending_registrations"]

    # Look for pending registration instead of actual user
    pending_user = pending_registrations.find_one({"username": username})

    if not pending_user:
        return jsonify({"error": "Registration not found or expired"}), 404

    # Check if registration has expired
    if datetime.now() > pending_user.get("expires_at", datetime.now()):
        # Clean up expired registration
        pending_registrations.delete_one({"username": username})
        return jsonify({"error": "Registration expired. Please register again."}), 400

    verification_data = pending_user.get("verification_data")
    if not verification_data:
        return jsonify({"error": "No verification code found"}), 400

    # Debug info
    print(f"[DEBUG] User: {username}")
    print(f"[DEBUG] Submitted code: {code}")
    print(f"[DEBUG] Stored code: {verification_data.get('code')}")
    print(f"[DEBUG] Code created at: {verification_data.get('created_at')}")
    print(f"[DEBUG] Current time: {datetime.now()}")

    # Check if code is expired
    if is_code_expired(verification_data.get("created_at")):
        return jsonify({"error": "Verification code expired. Please request a new one."}), 400

    # Check attempt limit
    if verification_data.get("attempts", 0) >= 3:
        return jsonify({"error": "Too many failed attempts. Please request a new code."}), 400

    # Verify code
    if verification_data.get("code") != code:
        # Increment attempts
        pending_registrations.update_one(
            {"username": username},
            {"$inc": {"verification_data.attempts": 1}}
        )
        
        remaining_attempts = 3 - (verification_data.get("attempts", 0) + 1)
        return jsonify({
            "error": f"Invalid code. {remaining_attempts} attempts remaining."
        }), 400

    # Success - Create actual user account
    try:
        user_doc = create_user_document(pending_user["username"], pending_user["password"])
        user_doc["email"] = pending_user["email"]
        user_doc["is_verified"] = True
        user_doc["verified_at"] = datetime.now()
        
        # Insert the verified user into users collection
        users_collection.insert_one(user_doc)
        
        # Remove from pending registrations
        pending_registrations.delete_one({"username": username})
        
        return jsonify({"message": "Email verified successfully! You can now log in."}), 200
        
    except Exception as e:
        print(f"[ERROR] Failed to create user after verification: {e}")
        return jsonify({"error": "Failed to complete registration"}), 500

@registration_bp.route("/resend-verification", methods=["POST"])
def resend_code():
    data = request.get_json()
    username = data.get("username", "").strip()

    if not username:
        return jsonify({"error": "Username required"}), 400

    db = current_app.config["DB"]
    pending_registrations = db["pending_registrations"]
    
    pending_user = pending_registrations.find_one({"username": username})

    if not pending_user:
        return jsonify({"error": "Registration not found or expired"}), 404

    # Check if registration has expired
    if datetime.now() > pending_user.get("expires_at", datetime.now()):
        # Clean up expired registration
        pending_registrations.delete_one({"username": username})
        return jsonify({"error": "Registration expired. Please register again."}), 400

    # Rate limiting - only allow resend every 60 seconds
    verification_data = pending_user.get("verification_data")
    if verification_data:
        last_sent = verification_data.get("created_at")
        if last_sent and datetime.now() - last_sent < timedelta(seconds=60):
            return jsonify({"error": "Please wait 60 seconds before requesting a new code"}), 429

    # Generate new code
    code = generate_6_digit_code()
    new_verification_data = create_verification_data(code)

    pending_registrations.update_one(
        {"username": username},
        {"$set": {"verification_data": new_verification_data}}
    )

    # Send email
    email = pending_user.get("email")
    email_result = send_verification_email(email, code)
    
    if email_result:
        return jsonify({"message": "New verification code sent"}), 200
    else:
        return jsonify({"error": "Failed to send email"}), 500

@registration_bp.route("/cancel-registration", methods=["POST"])
def cancel_registration():
    """Allow users to manually cancel their pending registration"""
    data = request.get_json()
    username = data.get("username", "").strip()

    if not username:
        return jsonify({"error": "Username required"}), 400

    db = current_app.config["DB"]
    pending_registrations = db["pending_registrations"]
    
    # Remove pending registration if it exists
    result = pending_registrations.delete_one({"username": username})
    
    if result.deleted_count > 0:
        return jsonify({"message": "Registration cancelled successfully"}), 200
    else:
        return jsonify({"message": "No pending registration found"}), 200

# Initialize database indexes when the module is imported
def init_pending_registrations_indexes():
    """Initialize database indexes for pending registrations collection"""
    try:
        db = current_app.config["DB"]
        pending_registrations = db["pending_registrations"]
        
        # Create indexes for better performance
        pending_registrations.create_index("username", unique=True)
        pending_registrations.create_index("email")
        pending_registrations.create_index("expires_at")
        
        print("[INIT] Created indexes for pending_registrations collection")
        
    except Exception as e:
        print(f"[WARNING] Failed to create indexes: {e}")

# Call this when the app starts up (you might want to call this from app.py instead)
try:
    init_pending_registrations_indexes()
except:
    pass  # Ignore if current_app is not available during import