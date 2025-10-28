import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation } from '@/lib/location';
import { User, MapPin, Heart, Sparkles } from 'lucide-react-native';

export const ProfileSetupScreen = () => {
  const { session, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!name.trim()) {
      Alert.alert('Błąd', 'Podaj swoje imię');
      return;
    }

    setLoading(true);

    const location = await getCurrentLocation();

    const interestsArray = interests
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const { error } = await supabase.from('users').insert({
      id: session?.user.id,
      name: name.trim(),
      bio: bio.trim(),
      interests: interestsArray,
      lat: location?.latitude || null,
      lon: location?.longitude || null,
      is_available: false,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Błąd', error.message);
    } else {
      await refreshUser();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <User size={32} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Uzupełnij profil</Text>
          <Text style={styles.subtitle}>Pomóż innym poznać Cię lepiej</Text>
        </View>

        {/* Informacje */}
        <BlurView intensity={20} tint="dark" style={styles.infoCard}>
          <View style={styles.infoContent}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MapPin size={18} color="#3b82f6" />
              </View>
              <Text style={styles.infoText}>
                Twoja lokalizacja pomoże znaleźć ludzi w okolicy
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Heart size={18} color="#ec4899" />
              </View>
              <Text style={styles.infoText}>
                Zainteresowania pomogą w dopasowaniu
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Sparkles size={18} color="#10b981" />
              </View>
              <Text style={styles.infoText}>
                Bio to Twoja wizytówka - bądź kreatywny!
              </Text>
            </View>
          </View>
        </BlurView>

        {/* Formularz */}
        <BlurView intensity={30} tint="dark" style={styles.formCard}>
          <View style={styles.form}>
            <Input
              label="Imię *"
              placeholder="Jan"
              value={name}
              onChangeText={setName}
              editable={!loading}
              placeholderTextColor="#64748b"
            />

            <Input
              label="O mnie"
              placeholder="Krótko o sobie..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              style={styles.textArea}
              editable={!loading}
              placeholderTextColor="#64748b"
            />

            <Input
              label="Zainteresowania"
              placeholder="np. startup, UX, AI (oddziel przecinkami)"
              value={interests}
              onChangeText={setInterests}
              editable={!loading}
              placeholderTextColor="#64748b"
            />

            <View style={styles.locationInfo}>
              <MapPin size={16} color="#3b82f6" />
              <Text style={styles.locationText}>
                Twoja lokalizacja zostanie pobrana automatycznie
              </Text>
            </View>

            <Button
              title="Gotowe 🚀"
              onPress={handleComplete}
              loading={loading}
              style={styles.button}
            />
          </View>
        </BlurView>

        <Text style={styles.footer}>
          Możesz to później zmienić w ustawieniach profilu
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  form: {
    gap: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: '#60a5fa',
  },
  button: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
  },
  footer: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
