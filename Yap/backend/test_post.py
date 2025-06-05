import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000"

# Replace these with your actual credentials
TEST_USERNAME = "ethan"  # ← Change this
TEST_PASSWORD = "pixelgamer123"  # ← Change this

def test_posts_api():
    """Test the posts API functionality"""
    
    print("🧪 Starting Posts API Test...")
    print("=" * 50)
    
    # Wait a moment for server to be ready
    time.sleep(1)
    
    try:
        # Step 1: Login
        print("🔐 Step 1: Testing login...")
        login_data = {
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        }
        
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if login_response.status_code != 200:
            print(f"❌ Login failed!")
            print(f"Status: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
        
        token = login_response.json().get("token")
        print(f"✅ Login successful! Token received.")
        
        # Step 2: Create a test post
        print("\n📝 Step 2: Creating test post...")
        headers = {"Authorization": f"Bearer {token}"}
        post_data = {
            "content": "🧪 This is a test post! Testing the API functionality."
        }
        
        create_response = requests.post(f"{BASE_URL}/posts/create", 
                                      json=post_data, 
                                      headers=headers)
        
        if create_response.status_code != 201:
            print(f"❌ Post creation failed!")
            print(f"Status: {create_response.status_code}")
            print(f"Response: {create_response.text}")
            return False
        
        post_result = create_response.json()
        post_id = post_result.get("post", {}).get("_id")
        print(f"✅ Post created successfully!")
        print(f"Post ID: {post_id}")
        print(f"Content: {post_result.get('post', {}).get('content')}")
        
        # Step 3: Get the feed
        print("\n📖 Step 3: Retrieving feed...")
        feed_response = requests.get(f"{BASE_URL}/posts/feed")
        
        if feed_response.status_code != 200:
            print(f"❌ Feed retrieval failed!")
            print(f"Status: {feed_response.status_code}")
            print(f"Response: {feed_response.text}")
            return False
        
        feed_data = feed_response.json()
        posts = feed_data.get("posts", [])
        print(f"✅ Feed retrieved successfully!")
        print(f"Total posts found: {len(posts)}")
        
        if posts:
            latest_post = posts[0]
            print(f"Latest post: '{latest_post['content']}' by {latest_post['username']}")
        
        # Step 4: Get user's posts
        print("\n👤 Step 4: Getting my posts...")
        my_posts_response = requests.get(f"{BASE_URL}/posts/my-posts", headers=headers)
        
        if my_posts_response.status_code == 200:
            my_posts = my_posts_response.json().get("posts", [])
            print(f"✅ Found {len(my_posts)} of your posts")
        else:
            print(f"⚠️  My posts endpoint might not be working: {my_posts_response.status_code}")
        
        print("\n" + "=" * 50)
        print("🎉 All tests completed successfully!")
        print("💡 Your posts API is working correctly!")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error!")
        print("🔧 Make sure your Flask server is running:")
        print("   FLASK_ENV=testing python app.py")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("Posts API Tester")
    print("Make sure to:")
    print("1. Update TEST_USERNAME and TEST_PASSWORD in this file")
    print("2. Run 'FLASK_ENV=testing python app.py' in another terminal")
    print("3. Then run this script")
    print("")
    
    test_posts_api()