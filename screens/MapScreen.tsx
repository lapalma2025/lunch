import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { getNearbyRestaurants } from '@/lib/places';
import { Restaurant } from '@/types';
import { MapPin, Star, DollarSign, Navigation } from 'lucide-react-native';

export const MapScreen = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.lat && user?.lon) {
      fetchRestaurants();
    }
  }, [user?.lat, user?.lon]);

  const fetchRestaurants = async () => {
    if (!user?.lat || !user?.lon) return;

    setLoading(true);
    const results = await getNearbyRestaurants(user.lat, user.lon);
    setRestaurants(results);
    setLoading(false);
  };

  const openInMaps = (restaurant: Restaurant) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lon}`;
    Linking.openURL(url);
  };

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <Card style={styles.restaurantCard}>
      <View style={styles.restaurantHeader}>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{item.name}</Text>
          <View style={styles.addressRow}>
            <MapPin size={14} color="#64748b" />
            <Text style={styles.address}>{item.address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        {item.rating && (
          <View style={styles.detail}>
            <Star size={16} color="#fbbf24" />
            <Text style={styles.detailText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}

        {item.price_level && (
          <View style={styles.detail}>
            <DollarSign size={16} color="#10b981" />
            <Text style={styles.detailText}>
              {'$'.repeat(item.price_level)}
            </Text>
          </View>
        )}

        {item.distance && (
          <View style={styles.detail}>
            <MapPin size={16} color="#3b82f6" />
            <Text style={styles.detailText}>{item.distance} km</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.navigateButton}
        onPress={() => openInMaps(item)}
      >
        <Navigation size={16} color="#3b82f6" />
        <Text style={styles.navigateText}>Nawiguj</Text>
      </TouchableOpacity>
    </Card>
  );

  if (!user?.lat || !user?.lon) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Brak lokalizacji</Text>
          <Text style={styles.emptySubtitle}>
            Włącz lokalizację w ustawieniach profilu
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restauracje w okolicy</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : restaurants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Brak restauracji</Text>
          <Text style={styles.emptySubtitle}>
            Nie znaleziono restauracji w pobliżu
          </Text>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          renderItem={renderRestaurant}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={styles.list}
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
  list: {
    padding: 16,
  },
  restaurantCard: {
    marginBottom: 16,
  },
  restaurantHeader: {
    marginBottom: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  address: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  navigateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
