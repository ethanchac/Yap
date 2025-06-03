from datetime import datetime

def create_user_document(username, hashed_password):
    return {
        "username": username,
        "password": hashed_password,
        "is_verified": False,
        "email": None,
        "email_verification_data": None,
        "created_at": datetime.now()
    }