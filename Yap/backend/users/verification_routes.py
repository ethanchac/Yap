from flask import Blueprint, request, jsonify, current_app, g
from shared.auth_utils import require_auth
from users.verification_service import generate_6_digit_code, is_valid_tmu_email

verify_bp = Blueprint("verify", __name__)

@verify_bp.route("/verify-email", methods=["POST"])
@require_auth
def send_verification_email():
    data = request.get_json()
    email = data.get("email")

    if not email or not is_valid_tmu_email(email):
        return jsonify({"error": "A valid torontomu.ca email is required"}), 400

    code = generate_6_digit_code()

    users_collection = current_app.config["DB"]["users"]
    users_collection.update_one(
        {"username": g.user["username"]},
        {"$set": {"email": email, "email_verification_code": code}}
    )

    # Simulated email send
    print(f"[DEBUG] Verification code for {email}: {code}")

    return jsonify({"message": "Verification code sent to your email"}), 200


@verify_bp.route("/confirm-code", methods=["POST"])
@require_auth
def confirm_code():
    data = request.get_json()
    code = data.get("code")

    if not code:
        return jsonify({"error": "Verification code is required"}), 400

    users_collection = current_app.config["DB"]["users"]
    user = users_collection.find_one({"username": g.user["username"]})

    if not user or user.get("email_verification_code") != code:
        return jsonify({"error": "Invalid code"}), 401

    users_collection.update_one(
        {"username": g.user["username"]},
        {"$set": {"is_verified": True}, "$unset": {"email_verification_code": ""}}
    )

    return jsonify({"message": "Your TMU email has been verified!"}), 200
