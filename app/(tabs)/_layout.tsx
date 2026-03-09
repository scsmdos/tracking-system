import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, Image, Text, TouchableOpacity, Platform } from 'react-native';

// Import the logo
import logo from '../../assets/images/logo.png';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarButton: () => null, // This effectively hides the tab buttons
        tabBarStyle: { display: 'none' }, // Completely hide the tab bar
        headerStyle: {
          backgroundColor: '#ffffff',
          height: Platform.OS === 'ios' ? 110 : 90,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        },
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Image source={logo} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerTitleText}>TMS SECURE</Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <MaterialCommunityIcons name="account-circle" size={32} color="#1E40AF" />
          </TouchableOpacity>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          headerTitleAlign: 'left',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerTitle: 'Profile Settings',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity 
              style={{ marginLeft: 16 }}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons name="chevron-left" size={32} color="#1E40AF" />
            </TouchableOpacity>
          ),
          headerRight: () => null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          headerTitle: 'Shift History',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity 
              style={{ marginLeft: 16 }}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons name="chevron-left" size={32} color="#1E40AF" />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Platform.OS === 'ios' ? 4 : 4,
  },
  headerLogo: {
    width: 35,
    height: 35,
    marginRight: 10,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  profileButton: {
    marginRight: 16,
    padding: 4,
  },
});
