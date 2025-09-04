import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions
} from 'react-native';
import CreatePost from './CreatePost';
import CreateEvent from './CreateEvent';

const { width, height } = Dimensions.get('window');

function Create() {
  const [activeTab, setActiveTab] = useState('post');
  const [isFormFocused, setIsFormFocused] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#121212' 
    }}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      {/* Header */}
      <View style={{
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#121212'
      }}>
        <Text style={{
          fontSize: 32,
          fontWeight: 'bold',
          marginBottom: 8,
          textAlign: 'center',
          fontFamily: 'System'
        }}>
          <Text style={{ color: '#f97316' }}>Create </Text>
          <Text style={{ color: '#ffffff' }}>
            {activeTab === 'post' ? 'Post' : 'Event'}
          </Text>
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#9ca3af',
          textAlign: 'center',
          fontFamily: 'System'
        }}>
          {activeTab === 'post' 
            ? 'Share your thoughts with the community' 
            : 'Plan something amazing for everyone'
          }
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingBottom: 100 // Account for bottom tab bar
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Background Elements */}
        <View style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 200,
          height: 200,
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          borderRadius: 100,
          opacity: 0.5
        }} />
        <View style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 200,
          height: 200,
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          borderRadius: 100,
          opacity: 0.3
        }} />

        {/* Tab Navigation */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 16,
          padding: 4,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}>
          <TouchableOpacity
            onPress={() => handleTabChange('post')}
            style={{
              flex: 1,
              paddingVertical: 16,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor: activeTab === 'post' ? '#f97316' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              transform: activeTab === 'post' ? [{ scale: 1.02 }] : [{ scale: 1 }]
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 8 }}>📝</Text>
            <Text style={{
              color: activeTab === 'post' ? 'white' : '#ffffff',
              fontSize: 18,
              fontWeight: activeTab === 'post' ? 'bold' : '600',
              fontFamily: 'System'
            }}>
              Post
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleTabChange('event')}
            style={{
              flex: 1,
              paddingVertical: 16,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor: activeTab === 'event' ? '#f97316' : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              transform: activeTab === 'event' ? [{ scale: 1.02 }] : [{ scale: 1 }]
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 8 }}>🎉</Text>
            <Text style={{
              color: activeTab === 'event' ? 'white' : '#ffffff',
              fontSize: 18,
              fontWeight: activeTab === 'event' ? 'bold' : '600',
              fontFamily: 'System'
            }}>
              Event
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Container with Glass Effect */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          transform: isFormFocused ? [{ scale: 1.02 }] : [{ scale: 1 }]
        }}>
          {/* Content with smooth transition */}
          {activeTab === 'post' ? (
            <CreatePost onFocusChange={setIsFormFocused} />
          ) : (
            <CreateEvent onFocusChange={setIsFormFocused} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default Create;