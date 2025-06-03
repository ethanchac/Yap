import bcrypt
from users.models import create_user_document

def hash_password(plain_password: str) -> str:
    hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')

def username_exists(users_collection, username: str) -> bool:
    return users_collection.find_one({"username": username}) is not None

def register_user(users_collection, username: str, password: str) -> dict:
    if username_exists(users_collection, username):
        return {"success": False, "error": "Username already exists"}

    hashed_pw = hash_password(password)
    user_doc = create_user_document(username, hashed_pw)
    users_collection.insert_one(user_doc)

    return {"success": True, "message": "User registered"}