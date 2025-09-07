import { View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import Sidebar from '../../components/Sidebar';

export default function TabLayout() {
  const pathname = usePathname();
  
  // Map pathname to sidebar tab names
  const getActiveTab = () => {
    switch (pathname) {
      case '/':
      case '/index':
        return 'Home';
      case '/events':
        return 'Events';
      case '/create':
        return 'Create';
      case '/waypoint':
        return 'Waypoint';
      case '/profile':
        return 'Profile';
      default:
        return 'Home';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' } // Hide default tab bar
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="events" options={{ title: 'Events' }} />
        <Tabs.Screen name="create" options={{ title: 'Create' }} />
        <Tabs.Screen name="waypoint" options={{ title: 'Waypoint' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      
      {/* Custom Sidebar at the bottom */}
      <Sidebar activeTab={getActiveTab()} />
    </View>
  );
}