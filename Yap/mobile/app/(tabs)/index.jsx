import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import PostItem from '../../components/posts/PostItem';
import { API_BASE_URL, testApiConnectivity } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [feedType, setFeedType] = useState('recent'); // 'recent' or 'following'

  // Get current user info
  useEffect(() => {
    getUserData();
  }, []);

  const getUserData = async () => {
    try {
      // Try to get from SecureStore first
      const sessionUser = await SecureStore.getItemAsync('currentUser');
      if (sessionUser) {
        try {
          const userData = JSON.parse(sessionUser);
          setCurrentUser(userData);
          console.log('Home - currentUser loaded:', userData);
          return;
        } catch (e) {
          console.error('Error parsing session user:', e);
        }
      }

      // Fallback to token decoding
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          await SecureStore.setItemAsync('currentUser', JSON.stringify(payload));
          setCurrentUser(payload);
          console.log('Home - currentUser decoded from token:', payload);
        } catch (e) {
          console.error('Error decoding token:', e);
        }
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    }
  };

  const fetchPosts = async (pageNum = 1, reset = false, feedTypeOverride = null) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentFeedType = feedTypeOverride || feedType;
      let url = `${API_BASE_URL}/posts/feed?page=${pageNum}&limit=20`;
      
      // For following feed, add filter parameter and include auth token
      if (currentFeedType === 'following') {
        url = `${API_BASE_URL}/posts/following-feed?page=${pageNum}&limit=20`;
      }
      
      console.log('🔗 Fetching from URL:', url);
      console.log('🔗 Current API_BASE_URL:', API_BASE_URL);
      console.log('🔗 Feed type:', currentFeedType);
      
      const headers = {};
      
      if (currentFeedType === 'following') {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        console.log('🔑 Token found for following feed');
      }
      
      console.log('📤 Request method: GET');
      console.log('📤 Request headers:', headers);
      
      const response = await fetch(url, { 
        method: 'GET',
        headers 
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('❌ Expected JSON but got:', contentType);
        console.error('❌ Response text:', textResponse.substring(0, 500));
        throw new Error(`Server returned ${contentType} instead of JSON`);
      }
      
      const data = await response.json();
      console.log('📊 Response data:', data);

      if (response.ok) {
        if (reset) {
          setPosts(data.posts || []);
        } else {
          setPosts(prevPosts => [...prevPosts, ...(data.posts || [])]);
        }
        
        // check if there are more posts to load
        setHasMore((data.posts || []).length === 20);
        setError('');
      } else {
        setError(data.error || `Server error: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Error fetching posts:', err);
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Test API connectivity first
    const initializeApp = async () => {
      console.log('🏠 Home component initializing...');
      console.log('🔗 API_BASE_URL:', API_BASE_URL);
      
      // Test connectivity
      const isConnected = await testApiConnectivity();
      console.log('🔗 API connectivity test result:', isConnected);
      
      if (!isConnected) {
        setError('Cannot connect to server. Please check your backend is running.');
        setLoading(false);
        return;
      }
      
      // If connected, fetch posts
      fetchPosts(1, true);
    };
    
    initializeApp();
  }, []);

  // Handle feed type changes
  const handleFeedTypeChange = (newFeedType) => {
    setFeedType(newFeedType);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, true, newFeedType);
  };

  const loadMorePosts = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, false);
  };

  const refreshPosts = () => {
    setRefreshing(true);
    setPage(1);
    fetchPosts(1, true);
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts(prevPosts => prevPosts.filter(post => post._id !== deletedPostId));
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    const paddingToBottom = 20;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  if (loading && posts.length === 0) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#121212'
      }}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={{ 
          marginTop: 16, 
          color: '#9ca3af',
          fontFamily: 'System'
        }}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* Header */}
      <View style={{
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#121212',
        borderBottomWidth: 0
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 12,
          fontFamily: 'System'
        }}>
          Home Feed
        </Text>
        
        {/* Feed Type Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity
            onPress={() => handleFeedTypeChange('recent')}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: feedType === 'recent' ? '#f97316' : 'transparent'
            }}
          >
            <Text style={{
              color: feedType === 'recent' ? 'white' : '#9ca3af',
              fontWeight: feedType === 'recent' ? 'bold' : 'normal',
              fontFamily: 'System'
            }}>
              Recent
            </Text>
          </TouchableOpacity>
          
          <Text style={{ color: '#6b7280' }}>|</Text>
          
          <TouchableOpacity
            onPress={() => handleFeedTypeChange('following')}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: feedType === 'following' ? '#f97316' : 'transparent'
            }}
          >
            <Text style={{
              color: feedType === 'following' ? 'white' : '#9ca3af',
              fontWeight: feedType === 'following' ? 'bold' : 'normal',
              fontFamily: 'System'
            }}>
              Following
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={refreshPosts}
            style={{
              marginLeft: 'auto',
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: '#f97316',
              borderRadius: 8
            }}
          >
            <Text style={{ 
              color: 'white', 
              fontWeight: 'bold',
              fontFamily: 'System'
            }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#121212' }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshPosts}
            colors={['#f97316']}
            tintColor="#f97316"
          />
        }
        onScroll={({ nativeEvent }) => {
          if (isCloseToBottom(nativeEvent)) {
            loadMorePosts();
          }
        }}
        scrollEventThrottle={400}
      >
        {error ? (
          <View style={{
            backgroundColor: '#7f1d1d',
            borderColor: '#991b1b',
            borderWidth: 1,
            borderRadius: 8,
            padding: 16,
            marginBottom: 16
          }}>
            <Text style={{ 
              color: '#fca5a5',
              fontFamily: 'System'
            }}>{error}</Text>
          </View>
        ) : null}

        {posts.length === 0 ? (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center', 
            paddingVertical: 48 
          }}>
            <Text style={{ 
              color: '#9ca3af',
              fontFamily: 'System'
            }}>No posts yet. Be the first to create one!</Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostItem 
              key={post._id} 
              post={post} 
              onPostDeleted={handlePostDeleted}
            />
          ))
        )}

        {hasMore && !loadingMore && (
          <TouchableOpacity 
            onPress={loadMorePosts}
            style={{
              marginTop: 16,
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: '#f97316',
              borderRadius: 8,
              alignItems: 'center'
            }}
          >
            <Text style={{ 
              color: 'white', 
              fontWeight: 'bold',
              fontFamily: 'System'
            }}>Load More Posts</Text>
          </TouchableOpacity>
        )}

        {loadingMore && (
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <ActivityIndicator size="small" color="#f97316" />
            <Text style={{ 
              color: '#9ca3af', 
              marginTop: 8,
              fontFamily: 'System'
            }}>Loading more posts...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}