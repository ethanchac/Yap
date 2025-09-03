import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, Calendar, Plus, MapPin, User } from 'lucide-react-native';

function Sidebar({ activeTab = 'Home' }) {
  const router = useRouter();
  
  const tabs = [
    { name: 'Home', icon: Home, route: '/' },
    { name: 'Events', icon: Calendar, route: '/events' },
    { name: 'Create', icon: Plus, isSpecial: true, route: '/create' },
    { name: 'Waypoint', icon: MapPin, route: '/waypoint' },
    { name: 'Profile', icon: User, route: '/profile' }
  ];

  const isActive = (tabName) => activeTab === tabName;

  const handleTabPress = (tab) => {
    console.log('Navigating to:', tab.route);
    try {
      router.push(tab.route);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: '#121212',
      paddingHorizontal: 16,
      paddingVertical: 8,
      paddingBottom: 34, // Extra padding for iPhone home indicator
      borderTopWidth: 1,
      borderTopColor: '#374151'
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.name);
        
        if (tab.isSpecial) {
          // Create button - special orange styling
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8
              }}
            >
              <View style={{
                backgroundColor: '#f97316',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#f97316',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5
              }}>
                <Icon size={20} color="white" />
              </View>
            </TouchableOpacity>
          );
        }

        // Regular tab
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => handleTabPress(tab)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              backgroundColor: active ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
              borderRadius: 8,
              marginHorizontal: 4,
              borderWidth: active ? 1 : 0,
              borderColor: active ? 'rgba(249, 115, 22, 0.3)' : 'transparent'
            }}
          >
            <Icon 
              size={24} 
              color={active ? '#fb923c' : '#ffffff'} 
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default Sidebar;