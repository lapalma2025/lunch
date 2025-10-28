import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { getCurrentLocation } from '@/lib/location';
import { NearbyUser } from '@/types';
import { MapPin, Clock, Sliders, Users } from 'lucide-react-native';

// Mocki - zastąp rzeczywistym API później
const MOCK_USERS: NearbyUser[] = [
  {
    id: 'mock1',
    name: 'Anna Kowalska',
    bio: 'UX Designer, miłośniczka dobrego jedzenia 🍕',
    interests: ['Design', 'Startup', 'Food'],
    lat: 51.1079,
    lon: 17.0385,
    is_available: true,
    available_until: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 1.2,
    age: 28,
  },
  {
    id: 'mock2',
    name: 'Jan Nowak',
    bio: 'Developer & foodie. Zawsze chętny na lunch!',
    interests: ['Tech', 'AI', 'Coffee'],
    lat: 51.1079,
    lon: 17.0385,
    is_available: true,
    available_until: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 2.5,
    age: 32,
  },
  {
    id: 'mock3',
    name: 'Maria Wiśniewska',
    bio: 'Product Manager, lubię poznawać nowych ludzi',
    interests: ['Product', 'Networking', 'Travel'],
    lat: 51.1079,
    lon: 17.0385,
    is_available: true,
    available_until: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 3.8,
    age: 26,
  },
  {
    id: 'mock4',
    name: 'Piotr Zieliński',
    bio: 'Marketing specialist, kawosz i food blogger',
    interests: ['Marketing', 'Food', 'Photography'],
    lat: 51.1079,
    lon: 17.0385,
    is_available: true,
    available_until: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 4.5,
    age: 35,
  },
  {
    id: 'mock5',
    name: 'Katarzyna Lewandowska',
    bio: 'HR Manager, social butterfly 🦋',
    interests: ['People', 'Culture', 'Food'],
    lat: 51.1079,
    lon: 17.0385,
    is_available: true,
    available_until: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance: 2.1,
    age: 29,
  },
];

export const HomeScreen = () => {
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filtry
  const [maxDistance, setMaxDistance] = useState(5);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(65);
  const [showFilters, setShowFilters] = useState(false);

  const fetchNearbyUsers = async () => {
    if (!user?.is_available) {
      setNearbyUsers([]);
      return;
    }

    setLoading(true);

    // Symuluj opóźnienie
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Filtruj mocki
    const filtered = MOCK_USERS.filter(
      (u) => u.distance <= maxDistance && u.age >= minAge && u.age <= maxAge
    );

    setNearbyUsers(filtered);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNearbyUsers();
    setRefreshing(false);
  };

  const toggleAvailability = async () => {
    const newAvailability = !user?.is_available;
    const availableUntil = newAvailability
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : null;

    const location = newAvailability ? await getCurrentLocation() : null;

    await updateProfile({
      is_available: newAvailability,
      available_until: availableUntil,
      lat: location?.latitude || user?.lat || null,
      lon: location?.longitude || user?.lon || null,
    });

    if (newAvailability) {
      fetchNearbyUsers();
    } else {
      setNearbyUsers([]);
    }
  };

  const proposeLunch = async (otherUser: NearbyUser) => {
    Alert.alert(
      'Propozycja wysłana!',
      `${otherUser.name} otrzyma powiadomienie o Twojej propozycji lunchu.`,
      [{ text: 'OK' }]
    );
  };

  useEffect(() => {
    fetchNearbyUsers();
  }, [user?.is_available, maxDistance, minAge, maxAge]);

  const renderUser = ({ item }: { item: NearbyUser }) => (
    <Card style={styles.userCard}>
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.05)', 'rgba(139, 92, 246, 0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.userHeader}>
        <Avatar url={item.avatar_url} name={item.name} size={60} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.age && <Text style={styles.userAge}>{item.age} lat</Text>}
          <View style={styles.distance}>
            <MapPin size={14} color="#94a3b8" />
            <Text style={styles.distanceText}>{item.distance} km</Text>
          </View>
        </View>
      </View>

      {item.bio && <Text style={styles.bio}>{item.bio}</Text>}

      {item.interests && item.interests.length > 0 && (
        <View style={styles.interests}>
          {item.interests.map((interest, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{interest}</Text>
            </View>
          ))}
        </View>
      )}

      <Button
        title="Zaproponuj lunch 🍽️"
        onPress={() => proposeLunch(item)}
        style={styles.proposeButton}
      />
    </Card>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <BlurView
        intensity={80}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>👥 Osoby w pobliżu</Text>
          <TouchableOpacity
            style={[
              styles.availabilityBadge,
              user?.is_available && styles.availableBadge,
            ]}
            onPress={toggleAvailability}
          >
            <Clock
              size={16}
              color={user?.is_available ? '#10b981' : '#94a3b8'}
            />
            <Text
              style={[
                styles.availabilityText,
                user?.is_available && styles.availableText,
              ]}
            >
              {user?.is_available ? 'Dostępny' : 'Niedostępny'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toggle Filters */}
        {user?.is_available && (
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Sliders size={18} color="#60a5fa" />
            <Text style={styles.filterToggleText}>Filtry</Text>
          </TouchableOpacity>
        )}
      </BlurView>

      {/* Filtry */}
      {user?.is_available && showFilters && (
        <BlurView intensity={40} tint="dark" style={styles.filtersCard}>
          {/* Odległość */}
          <View style={styles.filterSection}>
            <View style={styles.filterHeader}>
              <MapPin size={20} color="#3b82f6" />
              <Text style={styles.filterTitle}>Odległość</Text>
            </View>
            <Text style={styles.filterValue}>{maxDistance} km</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={maxDistance}
              onValueChange={setMaxDistance}
              minimumTrackTintColor="#3b82f6"
              maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
              thumbTintColor="#3b82f6"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1 km</Text>
              <Text style={styles.sliderLabel}>10 km</Text>
            </View>
          </View>

          {/* Wiek */}
          <View style={styles.filterSection}>
            <View style={styles.filterHeader}>
              <Users size={20} color="#8b5cf6" />
              <Text style={styles.filterTitle}>Wiek</Text>
            </View>
            <Text style={styles.filterValue}>
              {minAge} - {maxAge} lat
            </Text>
            <View style={styles.ageSliders}>
              <View style={styles.ageSlider}>
                <Text style={styles.ageLabel}>Min: {minAge}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={18}
                  maximumValue={maxAge - 1}
                  step={1}
                  value={minAge}
                  onValueChange={setMinAge}
                  minimumTrackTintColor="#8b5cf6"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                  thumbTintColor="#8b5cf6"
                />
              </View>
              <View style={styles.ageSlider}>
                <Text style={styles.ageLabel}>Max: {maxAge}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={minAge + 1}
                  maximumValue={80}
                  step={1}
                  value={maxAge}
                  onValueChange={setMaxAge}
                  minimumTrackTintColor="#8b5cf6"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                  thumbTintColor="#8b5cf6"
                />
              </View>
            </View>
          </View>
        </BlurView>
      )}

      {/* Content */}
      {!user?.is_available ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.1)']}
              style={styles.emptyIconGradient}
            >
              <Clock size={48} color="#ef4444" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Nie jesteś dostępny</Text>
          <Text style={styles.emptySubtitle}>
            Włącz dostępność, aby zobaczyć osoby w pobliżu
          </Text>
          <Button
            title="Włącz dostępność"
            onPress={toggleAvailability}
            style={styles.enableButton}
          />
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Szukam ludzi w okolicy...</Text>
        </View>
      ) : nearbyUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
              style={styles.emptyIconGradient}
            >
              <Users size={48} color="#3b82f6" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Brak osób w pobliżu</Text>
          <Text style={styles.emptySubtitle}>
            Spróbuj zwiększyć zasięg lub zmienić filtry
          </Text>
        </View>
      ) : (
        <FlatList
          data={nearbyUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  availableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  availableText: {
    color: '#10b981',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60a5fa',
  },
  filtersCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 24,
  },
  filterSection: {
    gap: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  filterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  ageSliders: {
    gap: 16,
  },
  ageSlider: {
    gap: 8,
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a78bfa',
  },
  list: {
    padding: 16,
  },
  userCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  userAge: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  bio: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 12,
    lineHeight: 20,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '500',
  },
  proposeButton: {
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  enableButton: {
    minWidth: 200,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
