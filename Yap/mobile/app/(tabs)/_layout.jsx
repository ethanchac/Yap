import { View } from 'react-native';
import { Tabs } from 'expo-router';
import Sidebar from '../../components/Sidebar';

export default function TabLayout() {

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' } // Hide default tab bar
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      
      {/* Custom Sidebar at the bottom */}
      <Sidebar activeTab="Home" />
    </View>
  );
}