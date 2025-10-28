import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { calculateDistance, getCurrentLocation } from '@/lib/location';
import { NearbyUser } from '@/types';
import { MapPin, Clock } from 'lucide-react-native';
import { sendLocalNotification } from '@/lib/notifications';

export const HomeScreen = () => {
  const { user, updateProfile } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNearbyUsers = async () => {
    if (!user?.lat || !user?.lon) {
      Alert.alert('Błąd', 'Brak danych lokalizacji');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_available', true)
      .neq('id', user.id);

    if (error) {
      console.error('Error fetching users:', error);
    } else if (data) {
      const usersWithDistance = data
        .filter((u) => u.lat && u.lon)
        .map((u) => ({
          ...u,
          distance: calculateDistance(user.lat!, user.lon!, u.lat, u.lon),
        }))
        .filter((u) => u.distance <= 2)
        .sort((a, b) => a.distance - b.distance);

      setNearbyUsers(usersWithDistance);
    }

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
    if (!user) return;

    const userA = user.id < otherUser.id ? user.id : otherUser.id;
    const userB = user.id < otherUser.id ? otherUser.id : user.id;

    const { error } = await supabase.from('matches').insert({
      user_a: userA,
      user_b: userB,
      proposed_by: user.id,
      status: 'pending',
    });

    if (error) {
      Alert.alert('Błąd', error.message);
    } else {
      Alert.alert('Sukces', `Propozycja wysłana do ${otherUser.name}!`);
      await sendLocalNotification(
        'Propozycja wysłana',
        `Czekamy na odpowiedź od ${otherUser.name}`
      );
    }
  };

  useEffect(() => {
    if (user?.is_available) {
      fetchNearbyUsers();
    }
  }, [user?.is_available]);

  const renderUser = ({ item }: { item: NearbyUser }) => (
    <Card style={styles.userCard}>
      <View style={styles.userHeader}>
        <Avatar url={item.avatar_url} name={item.name} size={60} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <View style={styles.distance}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.distanceText}>{item.distance} km</Text>
          </View>
        </View>
      </View>

      {item.bio && <Text style={styles.bio}>{item.bio}</Text>}

      {item.interests.length > 0 && (
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
        variant="secondary"
        style={styles.proposeButton}
      />
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Osoby w pobliżu</Text>
        <TouchableOpacity
          style={[
            styles.availabilityBadge,
            user?.is_available && styles.availableBadge,
          ]}
          onPress={toggleAvailability}
        >
          <Clock
            size={16}
            color={user?.is_available ? '#10b981' : '#64748b'}
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

      {!user?.is_available ? (
        <View style={styles.emptyState}>
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
        </View>
      ) : nearbyUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Brak osób w pobliżu</Text>
          <Text style={styles.emptySubtitle}>
            W promieniu 2 km nie ma nikogo dostępnego na lunch
          </Text>
        </View>
      ) : (
        <FlatList
          data={nearbyUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
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
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  availableBadge: {
    backgroundColor: '#d1fae5',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  availableText: {
    color: '#10b981',
  },
  list: {
    padding: 16,
  },
  userCard: {
    marginBottom: 16,
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
    color: '#1e293b',
    marginBottom: 4,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#64748b',
  },
  bio: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#dbeafe',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  proposeButton: {
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  enableButton: {
    marginTop: 24,
    minWidth: 200,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
