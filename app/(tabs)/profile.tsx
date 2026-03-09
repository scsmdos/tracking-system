import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export default function ProfileScreen() {
  const [user, setUser] = useState({ name: 'Loading...', role: '', empId: '' });

  useEffect(() => {
    (async () => {
      const sessionStr = await AsyncStorage.getItem('user_session');
      if (sessionStr) {
        setUser(JSON.parse(sessionStr));
      }
    })();
  }, []);

  const handleLogout = async () => {
    // Stop tracking forcefully if running
    const isRegistered = await TaskManager.isTaskRegisteredAsync('BACKGROUND_LOCATION_TASK');
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync('BACKGROUND_LOCATION_TASK');
    }
    await AsyncStorage.removeItem('user_session');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons name="account-circle" size={80} color="#1E40AF" />
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{user.role.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/history')}>
          <View style={styles.menuIconBox}><MaterialCommunityIcons name="history" size={20} color="#1E40AF" /></View>
          <Text style={styles.menuText}>Shift History</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0, marginTop: 10 }]} onPress={handleLogout}>
          <View style={[styles.menuIconBox, { backgroundColor: '#FEF2F2' }]}>
            <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          </View>
          <Text style={[styles.menuText, { color: '#EF4444', fontWeight: '800' }]}>Logout</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>App Version 2.1.0 (PRO)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginVertical: 40,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1E40AF',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  name: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 1,
  },
  empId: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
