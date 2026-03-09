import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Replace string below with future Laravel Server IP or Domain later
const SERVER_URL = 'http://192.168.1.100:8000/api'; 

export const syncLocationsToServer = async () => {
  try {
    const queueStr = await AsyncStorage.getItem('location_queue');
    if (!queueStr) return; // No data to sync

    const queue: any[] = JSON.parse(queueStr);
    if (queue.length === 0) return;

    const sessionStr = await AsyncStorage.getItem('user_session');
    if (!sessionStr) return; // Not logged in

    const { empId } = JSON.parse(sessionStr);

    // Send payload to our (future) Laravel Backend
    const response = await axios.post(`${SERVER_URL}/sync-locations`, {
      empId,
      locations: queue,
    });

    if (response.status === 200 || response.status === 201) {
      // If success, clear the local cache
      await AsyncStorage.removeItem('location_queue');
      console.log('Successfully synced', queue.length, 'locations');
    }
  } catch (error) {
    console.error('Failed to sync locations, will retain in cache:', error);
  }
};
