export const getCurrentUserIdentifier = () => {
    try {
        const userString = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (userString) {
            const user = JSON.parse(userString);
            const userId = user._id || user.id || user.userId || user.user_id || user.username;
            if (userId) return String(userId);
        }

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const tokenIdentifier = payload.userId || payload.id || payload._id || payload.user_id || payload.sub || payload.username;
                if (tokenIdentifier) return String(tokenIdentifier);
            } catch (e) {}
        }

        const altKeys = ['userId', 'user_id', 'currentUserId', 'authUserId', 'username'];
        for (const key of altKeys) {
            const altId = localStorage.getItem(key);
            if (altId) return String(altId);
        }

        return null;
    } catch {
        return null;
    }
};

export const getProfilePictureUrl = (profilePic) => {
    if (profilePic) {
        if (profilePic.startsWith('http')) {
            return profilePic;
        }
        return `http://localhost:5000/uploads/profile_pictures/${profilePic}`;
    }
    return `http://localhost:5000/static/default/default-avatar.png`;
};

export const fetchUserInfo = async (userId) => {
    try {
        const token = localStorage.getItem('token');
        
        // Try the most likely endpoints based on your Flask structure
        const possibleEndpoints = [
            `http://localhost:5000/users/profile/${userId}`,
            `http://localhost:5000/users/${userId}/profile`,
            `http://localhost:5000/users/${userId}`,
            `http://localhost:5000/api/users/${userId}`
        ];
        
        for (const endpoint of possibleEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    const user = userData.user || userData;
                    
                    return {
                        _id: user._id || user.id || userId,
                        username: user.username || user.name || 'Unknown User',
                        profile_picture: user.profile_picture || user.profilePicture || ''
                    };
                }
            } catch (endpointError) {
                continue;
            }
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
    
    // Return fallback
    return {
        _id: userId,
        username: userId === 'unknown_user' ? 'Unknown User' : (userId.length > 8 ? `User ${userId.slice(-4)}` : userId),
        profile_picture: ''
    };
};