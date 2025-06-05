import random
from datetime import datetime, timedelta

def generate_6_digit_code():
    return str(random.randint(100000, 999999))

def is_valid_tmu_email(email: str) -> bool:
    if not email:
        return False
    return email.lower().strip().endswith("@torontomu.ca")

def is_code_expired(created_at, expiry_minutes=10):
    """Check if verification code has expired"""
    if not created_at:
        return True
    
    expiry_time = created_at + timedelta(minutes=expiry_minutes)
    return datetime.now() > expiry_time

def create_verification_data(code):
    """Create verification data with timestamp"""
    return {
        "code": code,
        "created_at": datetime.now(),
        "attempts": 0
    }