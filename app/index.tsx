import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { AuthScreen } from '@/screens/AuthScreen';
import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';

export default function Index() {
  const { session, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session && user) {
      router.replace('/(tabs)');
    }
  }, [loading, session, user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (session && !user) {
    return <ProfileSetupScreen />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
