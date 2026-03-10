import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/Api';

export const LOCATION_TASK_NAME = 'background-location-task';

// Define background task at the very top level
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (!session) return;
      
      const user = JSON.parse(session);
      const batteryLevel = await Battery.getBatteryLevelAsync();
      
      const cache = locations.map((l: any) => ({
        lat: l.coords.latitude,
        lng: l.coords.longitude,
        ts: l.timestamp,
        speed: l.coords.speed,
        accuracy: l.coords.accuracy,
        battery: Math.round(batteryLevel * 100)
      }));
      
      await fetch(`${API_URL}/sync-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username: user.username, locations: cache, status: 'ONLINE' })
      });
    } catch (err) {
      console.error('Background fetch/sync error:', err);
    }
  }
});
