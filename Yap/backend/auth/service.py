import jwt
import os
import bcrypt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from flask import request, jsonify, current_app
from functools import wraps

load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET")


def generate_token(user: dict) -> str:
    payload = {
        "user_id": str(user["_id"]),
        "username": user["username"],
        "is_verified": user["is_verified"],
        "exp": datetime.utcnow() + timedelta(days=1) #token expires in 1 day
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256") #encode the jwt token

def check_password(plain_pw: str, hashed_pw: str) -> bool:
    return bcrypt.checkpw(plain_pw.encode("utf-8"), hashed_pw.encode("utf-8"))


def verify_token(token: str) -> dict:
    """Verify JWT token and return user payload"""
    try:
        # decoding the token
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return {"error": "Token has expired"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid tokedn"}

def get_current_user_from_token(token: str) -> dict:
    """Get full user info from database using token"""
    payload = verify_token(token)
    
    if "error" in payload:
        return payload
    
    # Get user from database to ensure they still exist and get latest info
    users_collection = current_app.config["DB"]["users"]
    user = users_collection.find_one({"username": payload["username"]})
    
    if not user:
        return {"error": "User not found"}
    
    # Convert ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])
    return user

def token_required(f):
    """Decorator to require valid JWT token for route access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header:
            try:
                # Expected format: "Bearer <token>"
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"error": "Invalid token format. Use 'Bearer <token>'"}), 401
        
        if not token:
            return jsonify({"error": "Authentication token required"}), 401
        
        # Verify token and get user
        current_user = get_current_user_from_token(token)
        
        if "error" in current_user:
            return jsonify({"error": current_user["error"]}), 401
        
        # Pass current_user to the protected route
        return f(current_user, *args, **kwargs)
    
    return decorated_function