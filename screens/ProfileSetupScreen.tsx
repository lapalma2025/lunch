import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation } from '@/lib/location';

export const ProfileSetupScreen = () => {
  const { session, refreshUser } = useAuth();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Uzupełnij profil</Text>
          <Text style={styles.subtitle}>
            Pomóż innym poznać Cię lepiej
          </Text>

          <View style={styles.form}>
            <Input
              label="Imię *"
              placeholder="Jan"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="O mnie"
              placeholder="Krótko o sobie..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />

            <Input
              label="Zainteresowania"
              placeholder="np. startup, UX, AI (oddziel przecinkami)"
              value={interests}
              onChangeText={setInterests}
            />

            <Text style={styles.info}>
              📍 Twoja lokalizacja zostanie pobrana automatycznie
            </Text>

            <Button
              title="Gotowe"
              onPress={handleComplete}
              loading={loading}
              style={styles.button}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  info: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
});
