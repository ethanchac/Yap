from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

class DatabaseConfig:

    def __init__(self):
        self.mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        self.db_name = os.getenv('DB_NAME', 'social_media_db')
        self.client = None
        self.db = None
    
    def connect(self):
        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client[self.db_name]

            self.client.admin.command('ping')
            print(f"connected to mongo data base : {self.db_name}")

            return self.db
        except Exception as e:
            print(f" failed to connect to mongodb: {str(e)}")
            raise e
    def create_indexes(self):
        try:
            self.db.users.create_index("username", unique=True)
            self.db.posts.create_index([("created_at", -1)])  # For timeline sorting
            self.db.posts.create_index("author_id")
            self.db.posts.create_index([("author_id", 1), ("created_at", -1)])  # Compound index
            
            # Hashtag and mention indexes for search
            self.db.posts.create_index("hashtags")
            self.db.posts.create_index("mentions")
            
            # Like and repost indexes
            self.db.posts.create_index("likes")
            self.db.posts.create_index("reposts")
            
            print("Database indexes created successfully")
        except Exception as e:
            print(f"⚠️  Warning: Could not create indexes: {str(e)}")
    
    def close_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            print("✅ Database connection closed")

# Global database instance
db_config = DatabaseConfig()