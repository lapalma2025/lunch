import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LogOut, Edit2, Save } from 'lucide-react-native';

export const ProfileScreen = () => {
  const { user, signOut, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState(user?.interests.join(', ') || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Błąd', 'Imię nie może być puste');
      return;
    }

    setLoading(true);

    const interestsArray = interests
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    await updateProfile({
      name: name.trim(),
      bio: bio.trim(),
      interests: interestsArray,
    });

    setLoading(false);
    setEditing(false);
  };

  const handleSignOut = async () => {
    Alert.alert('Wyloguj', 'Czy na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wyloguj',
        style: 'destructive',
        onPress: async () => await signOut(),
      },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Avatar url={user.avatar_url} name={user.name} size={100} />
          </View>

          {!editing ? (
            <>
              <Text style={styles.name}>{user.name}</Text>
              {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

              {user.interests.length > 0 && (
                <View style={styles.interests}>
                  {user.interests.map((interest, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Button
                title="Edytuj profil"
                onPress={() => {
                  setName(user.name);
                  setBio(user.bio);
                  setInterests(user.interests.join(', '));
                  setEditing(true);
                }}
                variant="outline"
                style={styles.editButton}
              />
            </>
          ) : (
            <>
              <Input
                label="Imię"
                value={name}
                onChangeText={setName}
                containerStyle={styles.input}
              />

              <Input
                label="O mnie"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                containerStyle={styles.input}
                style={styles.textArea}
              />

              <Input
                label="Zainteresowania"
                value={interests}
                onChangeText={setInterests}
                containerStyle={styles.input}
                placeholder="np. startup, UX, AI (oddziel przecinkami)"
              />

              <View style={styles.editActions}>
                <Button
                  title="Anuluj"
                  onPress={() => setEditing(false)}
                  variant="outline"
                  style={styles.actionButton}
                />
                <Button
                  title="Zapisz"
                  onPress={handleSave}
                  loading={loading}
                  style={styles.actionButton}
                />
              </View>
            </>
          )}
        </Card>

        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle}>Status</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Dostępność:</Text>
            <Text
              style={[
                styles.statsValue,
                user.is_available && styles.statsValueActive,
              ]}
            >
              {user.is_available ? 'Dostępny' : 'Niedostępny'}
            </Text>
          </View>
          {user.is_available && user.available_until && (
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Do:</Text>
              <Text style={styles.statsValue}>
                {new Date(user.available_until).toLocaleTimeString('pl-PL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  editButton: {
    minWidth: 200,
  },
  input: {
    width: '100%',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  statsValueActive: {
    color: '#10b981',
  },
});
