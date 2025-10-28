import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { AuthScreen } from '@/screens/AuthScreen';
import { ProfileSetupScreen } from '@/screens/ProfileSetupScreen';

export default function Index() {
  const { session, user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    console.log(
      'Index - session:',
      !!session,
      'user:',
      !!user,
      'inAuthGroup:',
      inAuthGroup
    );

    if (!session) {
      // Nie zalogowany - zostań na index (AuthScreen)
      if (inAuthGroup) {
        console.log('Redirecting to / from tabs');
        router.replace('/');
      }
    } else if (session && user) {
      // Zalogowany i ma profil - idź do tabs
      if (!inAuthGroup) {
        console.log('Redirecting to tabs');
        router.replace('/(tabs)');
      }
    }
    // Jeśli session ale nie ma user - zostanie na ProfileSetupScreen
  }, [loading, session, user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={StyleSheet.absoluteFill}
        />
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

  // Fallback - powinno przekierować do tabs
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={StyleSheet.absoluteFill}
      />
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
