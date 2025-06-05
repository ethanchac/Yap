import jwt
import os
import bcrypt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET")


def generate_token(user: dict) -> str:
    payload = {
        "username": user["username"],
        "is_verified": user["is_verified"],
        "exp": datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def check_password(plain_pw: str, hashed_pw: str) -> bool:
    return bcrypt.checkpw(plain_pw.encode("utf-8"), hashed_pw.encode("utf-8"))
