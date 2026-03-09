import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { API_URL } from '../../constants/Api';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const sessionStr = await AsyncStorage.getItem('user_session');
    if (sessionStr) {
      const userData = JSON.parse(sessionStr);
      setUser(userData);
      fetchSessions(userData.id);
    }
  };

  const fetchSessions = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/employee-sessions/${userId}`);
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (user) fetchSessions(user.id);
  };

  const renderItem = ({ item }: any) => {
    const date = new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const startTime = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.sessionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateBox}>
             <MaterialCommunityIcons name="calendar-range" size={20} color="#1E40AF" />
             <Text style={styles.dateText}>{date}</Text>
          </View>
          <View style={styles.statusPill}>
             <Text style={styles.statusText}>COMPLETED</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
             <Text style={styles.detailLabel}>SHIFT DURATION</Text>
             <Text style={styles.detailValue}>{startTime} - {endTime}</Text>
          </View>
          <View style={styles.detailItem}>
             <Text style={styles.detailLabel}>AVG SPEED</Text>
             <Text style={styles.detailValue}>{parseFloat(item.avg_speed).toFixed(1)} km/h</Text>
          </View>
        </View>

        <View style={[styles.detailsRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }]}>
          <View style={styles.detailItem}>
             <Text style={styles.detailLabel}>GPS POINTS</Text>
             <Text style={styles.detailValue}>{item.points} captured</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewMapBtn}
            onPress={() => router.push({ pathname: '/(tabs)', params: { date: item.date } })}
          >
             <Text style={styles.viewMapText}>VIEW ROUTE</Text>
             <MaterialCommunityIcons name="map-marker-path" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>Fetching shift logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Shift History</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clock-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No shift records found yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#FFF' },
  backBtn: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14, color: '#64748B', fontWeight: '600' },
  listContent: { padding: 16 },
  sessionCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  statusPill: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '900', color: '#10B981' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#334155' },
  viewMapBtn: { backgroundColor: '#1E40AF', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  viewMapText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#94A3B8', fontWeight: '600' },
});
