import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Play, Square, Navigation, Clock, Gauge, Layers, Info } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Api';
import { LOCATION_TASK_NAME } from '../../utils/backgroundTasks';
const { width, height } = Dimensions.get('window');

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number | null;
}


export default function DashboardScreen() {
  const [location, setLocation] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [history, setHistory] = useState<LocationPoint[]>([]);
  const [stays, setStays] = useState<any[]>([]);
  const [mapType, setMapType] = useState<any>('standard');
  const [showTraffic, setShowTraffic] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(0);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadUserSession();
    checkTrackingStatus();
    requestPermissions();
    getBatteryInfo();

    const batterySub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryLevel(Math.round(batteryLevel * 100));
    });

    // Fetch history when user session is loaded
    return () => batterySub.remove();
  }, []);

  const { date } = useLocalSearchParams<{ date?: string }>();

  useEffect(() => {
    if (currentUser) {
      fetchHistoryByDate(date || new Date().toISOString().split('T')[0]);
    }
  }, [currentUser, date]);

  const fetchHistoryByDate = async (targetDate: string) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_URL}/employee-history/${currentUser.id}?date=${targetDate}`);
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const points = data.map((l: any) => ({
          latitude: parseFloat(l.latitude),
          longitude: parseFloat(l.longitude),
          timestamp: l.timestamp,
          speed: l.speed
        }));
        setHistory(points);
        detectStays(points);

        // Center map on last location
        const last = points[points.length - 1];
        setLocation(last);
      } else {
        setHistory([]);
        setStays([]);
      }
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  const getBatteryInfo = async () => {
    const level = await Battery.getBatteryLevelAsync();
    setBatteryLevel(Math.round(level * 100));
  };

  const loadUserSession = async () => {
    const session = await AsyncStorage.getItem('user_session');
    if (session) setCurrentUser(JSON.parse(session));
  };

  const checkTrackingStatus = async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    setIsTracking(started);
  };

  const [permissionError, setPermissionError] = useState('');
  const [isCalibrating, setIsCalibrating] = useState(true);

  const requestPermissions = async () => {
    setIsCalibrating(true);
    setPermissionError('');
    try {
      const { status: foreground } = await Location.requestForegroundPermissionsAsync();
      if (foreground !== 'granted') {
        setPermissionError('Foreground location permission is REQUIRED to track your duty.');
        setIsCalibrating(false);
        return;
      }

      await Location.requestBackgroundPermissionsAsync();
      
      // Wait max 10 seconds for initial location to prevent getting stuck
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]) as Location.LocationObject;

      setLocation(loc.coords);
      setHistory([{
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: Date.now()
      }]);
      setIsCalibrating(false);

    } catch (e: any) {
      console.warn("GPS Lock Error:", e);
      if (e.message === 'timeout') {
         setPermissionError('GPS calibration timed out. Please ensure you have a clear view of the sky.');
      } else {
         setPermissionError('Failed to get GPS lock. Please turn on Location services.');
      }
      // Fallback location to allow map to render
      setLocation({ latitude: 20.5937, longitude: 78.9629, speed: 0 } as any); 
      setIsCalibrating(false);
    }
  };

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        setIsTracking(false);
        if (currentUser) {
          fetch(`${API_URL}/sync-locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, locations: [], status: 'OFFLINE' })
          }).catch(() => {});
        }
        Alert.alert("Duty Ended", "Your status is now OFFLINE.");
      } else {
        // Must request background permissions immediately before starting
        const { status: background } = await Location.requestBackgroundPermissionsAsync();
        if (background !== 'granted') {
           Alert.alert("Permission Required", "Background location 'Allow all the time' is required for tracking.");
           return;
        }

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced, // Use Balanced instead of BestForNavigation to avoid crashes
          timeInterval: 5000, 
          distanceInterval: 10,  
          foregroundService: {
            notificationTitle: "TMS Secure Tracking Active",
            notificationBody: "Monitoring location for fleet security",
            notificationColor: "#1E40AF"
          }
        });
        setIsTracking(true);
        if (currentUser) {
          fetch(`${API_URL}/sync-locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, locations: [], status: 'ONLINE' })
          }).catch(() => {});
        }
        fetchHistoryByDate(new Date().toISOString().split('T')[0]); 
        Alert.alert("Shift Started", "Your status is now ONLINE.");
      }
    } catch (err: any) {
      console.warn("Toggle tracking error:", err);
      Alert.alert("Error", "Failed to start tracking. Please ensure location permissions are fully granted.");
    }
  };

  useEffect(() => {
    let watchSubscription: any;
    if (isTracking) {
      Location.watchPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 2
      }, (loc) => {
        setLocation(loc.coords);
        setHistory(prev => {
          const updated = [...prev, {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp
          }];
          detectStays(updated);
          return updated;
        });
      }).then(sub => { watchSubscription = sub; });
    }
    return () => {
      if (watchSubscription) watchSubscription.remove();
    };
  }, [isTracking]);

  const detectStays = (points: LocationPoint[]) => {
    if (points.length < 2) return;
    const detected: any[] = [];
    let stayStart = points[0];

    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const dist = getDistance(stayStart.latitude, stayStart.longitude, current.latitude, current.longitude);
      const timeDiff = (current.timestamp - stayStart.timestamp) / 60000;

      if (dist > 0.02) {
        if (timeDiff >= 2) {
          detected.push({ lat: stayStart.latitude, lng: stayStart.longitude, duration: Math.round(timeDiff) });
        }
        stayStart = current;
      }
    }
    setStays(detected);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  if (isCalibrating) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#1E40AF" />
      <Text style={styles.loadingText}>Calibrating GPS...</Text>
    </View>
  );

  if (permissionError || !location) return (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons name="map-marker-off" size={60} color="#DC2626" />
      <Text style={styles.errorTitle}>Location Required</Text>
      <Text style={styles.errorDesc}>{permissionError || "Unable to determine your location."}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={requestPermissions}>
        <Text style={styles.retryBtnText}>Retry GPS Calibration</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Wrapped MapView in a basic View to catch layout-level issues */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          mapType={mapType}
          showsTraffic={showTraffic}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Polyline coordinates={history} strokeColor="#1E40AF" strokeWidth={5} lineDashPattern={[0]} />
          {stays.map((s, i) => (
            <Circle key={i} center={{ latitude: s.lat, longitude: s.lng }} radius={20} fillColor="rgba(239, 68, 68, 0.4)" strokeColor="#EF4444" />
          ))}
          <Marker coordinate={location}>
            <View style={styles.markerContainer}><View style={styles.markerInner} /></View>
          </Marker>
        </MapView>
      </View>

      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}>
          <Layers size={20} color="#1E40AF" />
          <Text style={styles.controlText}>{mapType === 'standard' ? 'SAT' : 'MAP'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setShowTraffic(!showTraffic)}>
          <Info size={20} color={showTraffic ? "#10B981" : "#1E40AF"} />
          <Text style={styles.controlText}>TRAFFIC</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.overlay}>
        <View style={styles.dashboardCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.statusDot, { backgroundColor: isTracking ? '#10B981' : '#94A3B8' }]} />
              <Text style={styles.statusText}>{isTracking ? 'TRACKING LIVE' : 'OFFLINE'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="battery-charging" size={14} color="#64748B" />
              <Text style={styles.timeText}>{batteryLevel}%</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Gauge size={18} color="#64748B" />
              <View>
                <Text style={styles.statLabel}>SPEED</Text>
                <Text style={styles.statValue}>{parseFloat(location.speed || 0).toFixed(1)} <Text style={{ fontSize: 10 }}>km/h</Text></Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <Clock size={18} color="#64748B" />
              <View>
                <Text style={styles.statLabel}>STOPS</Text>
                <Text style={styles.statValue}>{stays.length}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, isTracking ? styles.stopButton : styles.startButton]}
            onPress={toggleTracking}
            activeOpacity={0.9}
          >
            {isTracking ? <Square size={20} color="#FFF" /> : <Play size={20} color="#FFF" />}
            <Text style={styles.actionButtonText}>{isTracking ? 'END DUTY CYCLE' : 'INITIALIZE SHIFT'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B', fontWeight: '700' },
  mapContainer: { flex: 1, overflow: 'hidden' },
  map: { width, height },
  mapControls: { position: 'absolute', top: 60, right: 16, gap: 12 },
  controlBtn: { width: 50, height: 60, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  controlText: { fontSize: 8, fontWeight: '800', color: '#64748B', marginTop: 4 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  dashboardCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
  timeText: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#64748B' },
  actionButton: { height: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  startButton: { backgroundColor: '#1E40AF' },
  stopButton: { backgroundColor: '#DC2626' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  markerContainer: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(30, 64, 175, 0.2)', alignItems: 'center', justifyContent: 'center' },
  markerInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1E40AF', borderWidth: 2, borderColor: '#FFF' },
  errorContainer: { flex: 1, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  errorDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  retryBtn: { backgroundColor: '#1E40AF', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, elevation: 2, shadowColor: '#1E40AF', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  retryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
