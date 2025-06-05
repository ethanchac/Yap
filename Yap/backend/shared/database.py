from pymongo import MongoClient
import os
from flask import current_app

# Global variable to store our database connection
_db = None
_client = None

def init_database(app):
    """Initialize database connection with Flask app"""
    global _client, _db
    
    # Get MongoDB connection string from environment variables
    # This is a security best practice - never hardcode credentials!
    mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
    database_name = os.getenv('DATABASE_NAME', 'tmu_social_app')
    
    try:
        # Create MongoDB client
        _client = MongoClient(mongo_uri)
        
        # Test the connection
        _client.admin.command('ping')
        print(f"✅ Connected to MongoDB successfully!")
        
        # Get the specific database
        _db = _client[database_name]
        print(f"✅ Using database: {database_name}")
        
        # Store in Flask app context for easy access
        app.config['DATABASE'] = _db
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise e

def get_db():
    """Get database instance"""
    global _db
    if _db is None:
        raise Exception("Database not initialized. Call init_database() first!")
    return _db

def close_database():
    """Close database connection"""
    global _client
    if _client:
        _client.close()
        print("📪 Database connection closed")