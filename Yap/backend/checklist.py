#!/usr/bin/env python3
import os

def create_organized_structure():
    """Create organized backend directory structure"""
    
    print("🏗️  Setting up organized backend structure...")
    print()
    
    # Define the organized structure
    directories = [
        'authentication',
        'users', 
        'posts',
        'shared',
        'config',
        'middleware',
        'database'
    ]
    
    # Create directories
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✓ Created: {directory}/")
    
    # Create __init__.py files
    init_files = [
        'authentication/__init__.py',
        'users/__init__.py',
        'posts/__init__.py', 
        'shared/__init__.py',
        'config/__init__.py',
        'middleware/__init__.py',
        'database/__init__.py'
    ]
    
    for file_path in init_files:
        with open(file_path, 'w') as f:
            f.write('# This file makes Python treat the directory as a package\n')
        print(f"✓ Created: {file_path}")
    
    print()
    print("📁 Your organized backend structure:")
    print("├── 📁 authentication/         # All auth-related code")
    print("│   ├── auth.py  /             # Login, signup, JWT routes")
    print("│   ├── user_model.py /         # User database model")
    print("│   └── __init__.py")
    print("├── 📁 users/                 # User profile & social features")
    print("│   ├── users.py              # Profile, follow/unfollow routes")
    print("│   ├── user_service.py       # User business logic")
    print("│   └── __init__.py")
    print("├── 📁 posts/                 # Posts/threads functionality")
    print("│   ├── posts.py         /     # Create, read, delete posts")
    print("│   ├── post_model.py     /    # Post database model")
    print("│   └── __init__.py")
    print("├── 📁 shared/                # Shared utilities")
    print("│   ├── helpers.py    /        # Common utility functions")
    print("│   ├── validators.py         # Input validation")
    print("│   └── __init__.py")
    print("├── 📁 config/                # Configuration")
    print("│   ├── database.py  /         # Database configuration")
    print("│   └── __init__.py")
    print("├── 📁 middleware/            # Custom middleware")
    print("│   └── __init__.py")
    print("├── 📄 app.py                 # Main Flask application")
    print("├── 📄 requirements.txt       # Dependencies")
    print("└── 📄 .env                   # Environment variables")
    
    print()
    print("✨ Benefits of this structure:")
    print("• 🔐 Authentication code is isolated and easy to find")
    print("• 👥 User-related features are grouped together")
    print("• 📝 Post functionality is self-contained")
    print("• 🔧 Shared utilities are reusable across modules")
    print("• 📈 Easy to scale - add new features in their own folders")
    print("• 🧪 Each module can be tested independently")
    
    print()
    print("🚀 Next steps:")
    print("1. Copy the files into their respective folders")
    print("2. Install dependencies: pip install -r requirements.txt") 
    print("3. Create .env file")
    print("4. Run: python app.py")

if __name__ == "__main__":
    create_organized_structure()