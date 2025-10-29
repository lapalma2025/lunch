import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { TimePicker } from '@/components/TimePicker';
import {
  LogOut,
  Edit2,
  Camera,
  Clock,
  User,
  Calendar,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export const ProfileScreen = () => {
  const { user, signOut, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState(user?.interests.join(', ') || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Dostępność od-do
  const [availableFrom, setAvailableFrom] = useState(
    user?.available_from ? new Date(user.available_from) : new Date()
  );
  const [availableTo, setAvailableTo] = useState(
    user?.available_to
      ? new Date(user.available_to)
      : new Date(Date.now() + 3600000)
  );
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do galerii');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    setUploadingImage(true);

    try {
      // Konwersja URI na blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Nazwa pliku
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      // Upload do Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Pobierz publiczny URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Zaktualizuj profil
      await updateProfile({
        avatar_url: urlData.publicUrl,
      });

      Alert.alert('Sukces', 'Zdjęcie zostało zaktualizowane!');
    } catch (error: any) {
      Alert.alert('Błąd', error.message || 'Nie udało się przesłać zdjęcia');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Błąd', 'Imię nie może być puste');
      return;
    }

    // Walidacja wieku
    const ageNum = parseInt(age);
    if (age && (isNaN(ageNum) || ageNum < 18 || ageNum > 99)) {
      Alert.alert('Błąd', 'Wiek musi być liczbą między 18 a 99');
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
      age: age ? ageNum : null,
      gender: gender || null,
      available_from: availableFrom.toISOString(),
      available_to: availableTo.toISOString(),
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header z bezpiecznym obszarem */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Avatar z możliwością edycji */}
          <Card style={styles.profileCard}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Avatar url={user.avatar_url} name={user.name} size={100} />
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#8b5cf6']}
                    style={styles.cameraGradient}
                  >
                    <Camera size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              {uploadingImage && (
                <Text style={styles.uploadingText}>Uploading...</Text>
              )}
            </View>

            {!editing ? (
              <>
                <Text style={styles.name}>{user.name}</Text>

                {/* Wiek i płeć */}
                <View style={styles.metaInfo}>
                  {user.age && (
                    <View style={styles.metaBadge}>
                      <Calendar size={14} color="#60a5fa" />
                      <Text style={styles.metaText}>{user.age} lat</Text>
                    </View>
                  )}
                  {user.gender && (
                    <View style={styles.metaBadge}>
                      <User size={14} color="#60a5fa" />
                      <Text style={styles.metaText}>
                        {user.gender === 'male'
                          ? 'Mężczyzna'
                          : user.gender === 'female'
                          ? 'Kobieta'
                          : 'Inne'}
                      </Text>
                    </View>
                  )}
                </View>

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
                    setAge(user.age?.toString() || '');
                    setGender(user.gender || '');
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
                  placeholderTextColor="#64748b"
                />

                {/* Wiek i płeć w jednym rzędzie */}
                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Input
                      label="Wiek"
                      value={age}
                      onChangeText={setAge}
                      keyboardType="number-pad"
                      placeholder="18-99"
                      placeholderTextColor="#64748b"
                    />
                  </View>

                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Płeć</Text>
                    <View style={styles.genderButtons}>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          gender === 'male' && styles.genderButtonActive,
                        ]}
                        onPress={() => setGender('male')}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            gender === 'male' && styles.genderTextActive,
                          ]}
                        >
                          M
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          gender === 'female' && styles.genderButtonActive,
                        ]}
                        onPress={() => setGender('female')}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            gender === 'female' && styles.genderTextActive,
                          ]}
                        >
                          K
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          gender === 'other' && styles.genderButtonActive,
                        ]}
                        onPress={() => setGender('other')}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            gender === 'other' && styles.genderTextActive,
                          ]}
                        >
                          •
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <Input
                  label="O mnie"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  containerStyle={styles.input}
                  style={styles.textArea}
                  placeholderTextColor="#64748b"
                />

                <Input
                  label="Zainteresowania"
                  value={interests}
                  onChangeText={setInterests}
                  containerStyle={styles.input}
                  placeholder="np. startup, UX, AI (oddziel przecinkami)"
                  placeholderTextColor="#64748b"
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

          {/* Dostępność z godzinami */}
          <Card style={styles.availabilityCard}>
            <View style={styles.cardHeader}>
              <Clock size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}>Dostępność</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text
                style={[
                  styles.statusValue,
                  user.is_available && styles.statusValueActive,
                ]}
              >
                {user.is_available ? 'Dostępny' : 'Niedostępny'}
              </Text>
            </View>

            {/* Dostępność od-do */}
            <View style={styles.timeSection}>
              <Text style={styles.timeSectionTitle}>
                Ustaw godziny dostępności:
              </Text>

              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Od:</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowFromPicker(true)}
                >
                  <Text style={styles.timeButtonText}>
                    {availableFrom.toLocaleTimeString('pl-PL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Do:</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowToPicker(true)}
                >
                  <Text style={styles.timeButtonText}>
                    {availableTo.toLocaleTimeString('pl-PL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showFromPicker && (
                <TimePicker
                  visible={showFromPicker}
                  onClose={() => setShowFromPicker(false)}
                  onSelect={(hour, minute) => {
                    const newDate = new Date(availableFrom);
                    newDate.setHours(hour, minute);
                    setAvailableFrom(newDate);
                  }}
                  initialHour={availableFrom.getHours()}
                  initialMinute={availableFrom.getMinutes()}
                  title="Dostępny od"
                />
              )}

              {showToPicker && (
                <TimePicker
                  visible={showToPicker}
                  onClose={() => setShowToPicker(false)}
                  onSelect={(hour, minute) => {
                    const newDate = new Date(availableTo);
                    newDate.setHours(hour, minute);
                    setAvailableTo(newDate);
                  }}
                  initialHour={availableTo.getHours()}
                  initialMinute={availableTo.getMinutes()}
                  title="Dostępny do"
                />
              )}

              <Button
                title="Zapisz godziny"
                onPress={handleSave}
                loading={loading}
                style={styles.saveTimeButton}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Przestrzeń dla nawigacji
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60, // Bezpieczny obszar
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#1e293b',
  },
  cameraGradient: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  metaText: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '500',
  },
  bio: {
    fontSize: 14,
    color: '#94a3b8',
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
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tagText: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '500',
  },
  editButton: {
    minWidth: 200,
  },
  input: {
    width: '100%',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: '#3b82f6',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  genderTextActive: {
    color: '#60a5fa',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  availabilityCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  statusValueActive: {
    color: '#10b981',
  },
  timeSection: {
    gap: 12,
  },
  timeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  timeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    minWidth: 100,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#60a5fa',
  },
  saveTimeButton: {
    marginTop: 8,
  },
});
