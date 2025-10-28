// screens/MapScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import {
  getNearbyRestaurants,
  getRestaurantPhotoUrl,
  getPlaceDetails,
  buildMapsPlaceLink,
} from '@/lib/places';
import type { PlaceDetails } from '@/lib/places';
import { Restaurant } from '@/types';
import {
  DollarSign,
  MapPin,
  Navigation,
  Star,
  UtensilsCrossed,
} from 'lucide-react-native';

export const MapScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);

  // filtry: ocena + dieta (lokalnie – 0 dodatkowych requestów)
  const [minRating, setMinRating] = useState<number | null>(null);
  const [dietFilter, setDietFilter] = useState<
    null | 'vegan' | 'vegetarian' | 'gluten_free'
  >(null);

  // cache detali; klucz: place_id
  const [detailsCache, setDetailsCache] = useState<
    Record<string, PlaceDetails>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (user?.lat && user?.lon) {
      fetchRestaurants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.lat, user?.lon]);

  const fetchRestaurants = async () => {
    if (!user?.lat || !user?.lon) return;
    setLoading(true);
    const results = await getNearbyRestaurants(user.lat, user.lon, 10000); // 10km
    setRestaurants(results);
    setLoading(false);
  };

  // lokalny matcher po nazwie, adresie i cuisine_type
  const matchesDiet = (
    r: Restaurant,
    diet: 'vegan' | 'vegetarian' | 'gluten_free'
  ) => {
    const hay = [r.name || '', r.address || '', r.cuisine_type || '']
      .join(' ')
      .toLowerCase();

    if (diet === 'vegan') {
      // polskie i angielskie warianty
      return /vega|wege|wegań|vegan/.test(hay);
    }
    if (diet === 'vegetarian') {
      return /weget|vegetar/.test(hay);
    }
    if (diet === 'gluten_free') {
      return /bez\s*glut|gluten[-\s]?free|bg\b/.test(hay);
    }
    return false;
  };

  // lista widoczna po filtrach
  const visibleRestaurants = useMemo(() => {
    let list = restaurants;

    if (minRating != null) {
      list = list.filter((r) => (r.rating ?? 0) >= minRating);
    }
    if (dietFilter) {
      list = list.filter((r) => matchesDiet(r, dietFilter));
    }

    return list;
  }, [restaurants, minRating, dietFilter]);

  // tap w kartę → pokaż modal; dociągnij detale, jeśli brak w cache
  const openPlaceDetails = async (placeId: string) => {
    setSelectedId(placeId);
    if (detailsCache[placeId]) return; // nic nie robimy, już w cache

    setDetailsLoading(true);
    const details = await getPlaceDetails(placeId);
    setDetailsLoading(false);
    if (details) {
      setDetailsCache((prev) => ({ ...prev, [placeId]: details }));
    }
  };

  const openPlaceInMaps = (placeId: string) => {
    const inCache = detailsCache[placeId];
    const url = inCache?.googleMapsUri || buildMapsPlaceLink(placeId);
    Linking.openURL(url);
  };

  const openCoordsInMaps = (restaurant: Restaurant) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lon}`;
    Linking.openURL(url);
  };

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openPlaceDetails(item.place_id)}
    >
      <Card style={styles.restaurantCard}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.05)', 'rgba(139, 92, 246, 0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardContent}>
          {/* Zdjęcie */}
          {item.photo_reference ? (
            <Image
              source={{ uri: getRestaurantPhotoUrl(item.photo_reference, 600) }}
              style={styles.restaurantImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <UtensilsCrossed size={48} color="rgba(255, 255, 255, 0.3)" />
            </View>
          )}

          {/* Info */}
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={2}>
              {item.name}
            </Text>

            <View style={styles.addressRow}>
              <MapPin size={14} color="#94a3b8" />
              <Text style={styles.address} numberOfLines={1}>
                {item.address}
              </Text>
            </View>

            {/* Szczegóły */}
            <View style={styles.details}>
              {typeof item.rating === 'number' && (
                <View style={styles.detail}>
                  <Star size={16} color="#fbbf24" fill="#fbbf24" />
                  <Text style={styles.detailText}>
                    {item.rating.toFixed(1)}
                  </Text>
                  {item.user_ratings_total > 0 && (
                    <Text style={styles.detailSubtext}>
                      ({item.user_ratings_total})
                    </Text>
                  )}
                </View>
              )}

              {typeof item.price_level === 'number' && (
                <View style={styles.detail}>
                  <DollarSign size={16} color="#10b981" />
                  <Text style={styles.detailText}>
                    {'$'.repeat(Math.max(0, item.price_level))}
                  </Text>
                </View>
              )}

              {typeof item.distance === 'number' && (
                <View style={styles.detail}>
                  <MapPin size={16} color="#3b82f6" />
                  <Text style={styles.detailText}>{item.distance} km</Text>
                </View>
              )}
            </View>

            {/* Przyciski nawigacji */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.navigateButton}
                onPress={() => openPlaceInMaps(item.place_id)}
              >
                <Navigation size={16} color="#fff" />
                <Text style={styles.navigateText}>Profil w Mapach</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navigateButton, { backgroundColor: '#475569' }]}
                onPress={() => openCoordsInMaps(item)}
              >
                <Navigation size={16} color="#fff" />
                <Text style={styles.navigateText}>Nawiguj (GPS)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      {!user?.lat || !user?.lon ? (
        <>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.1)']}
              style={styles.emptyIconGradient}
            >
              <MapPin size={48} color="#ef4444" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Brak lokalizacji</Text>
          <Text style={styles.emptySubtitle}>
            Włącz lokalizację w ustawieniach profilu
          </Text>
        </>
      ) : (
        <>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
              style={styles.emptyIconGradient}
            >
              <UtensilsCrossed size={48} color="#3b82f6" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Brak miejsc</Text>
          <Text style={styles.emptySubtitle}>
            Nie znaleziono restauracji w pobliżu (10km)
          </Text>
        </>
      )}
    </View>
  );

  const selected = selectedId ? detailsCache[selectedId] : null;

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
          <Text style={styles.title}>🍽️ Miejsca w okolicy</Text>
          {visibleRestaurants.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {visibleRestaurants.length}
                {dietFilter
                  ? ` • ${
                      dietFilter === 'vegan'
                        ? 'Wege'
                        : dietFilter === 'vegetarian'
                        ? 'Wegetariańskie'
                        : 'Bez glutenu'
                    }`
                  : ''}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>Restauracje, kawiarnie i puby</Text>

        {/* Filtry ocen */}
        <View style={styles.filtersRow}>
          <FilterChip
            label="Wszystkie"
            active={minRating === null}
            onPress={() => setMinRating(null)}
          />
          <FilterChip
            label="4.0+"
            active={minRating === 4.0}
            onPress={() => setMinRating(4.0)}
          />
          <FilterChip
            label="4.5+"
            active={minRating === 4.5}
            onPress={() => setMinRating(4.5)}
          />
        </View>

        {/* Filtry dietetyczne */}
        <View style={[styles.filtersRow, { marginTop: 6 }]}>
          <FilterChip
            label="Wege"
            active={dietFilter === 'vegan'}
            onPress={() =>
              setDietFilter(dietFilter === 'vegan' ? null : 'vegan')
            }
          />
          <FilterChip
            label="Wegetariańskie"
            active={dietFilter === 'vegetarian'}
            onPress={() =>
              setDietFilter(dietFilter === 'vegetarian' ? null : 'vegetarian')
            }
          />
          <FilterChip
            label="Bez glutenu"
            active={dietFilter === 'gluten_free'}
            onPress={() =>
              setDietFilter(dietFilter === 'gluten_free' ? null : 'gluten_free')
            }
          />
        </View>
      </BlurView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Szukam miejsc w okolicy...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleRestaurants}
          renderItem={renderRestaurant}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal z detalami */}
      <Modal
        visible={!!selectedId}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {detailsLoading && !selected ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Wczytuję szczegóły...</Text>
              </View>
            ) : selected ? (
              <>
                {selected.photo_reference ? (
                  <Image
                    source={{
                      uri: getRestaurantPhotoUrl(selected.photo_reference, 900),
                    }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.modalImage,
                      { alignItems: 'center', justifyContent: 'center' },
                    ]}
                  >
                    <UtensilsCrossed size={48} color="rgba(255,255,255,0.3)" />
                  </View>
                )}

                <Text style={styles.modalTitle}>{selected.name}</Text>

                <View style={[styles.addressRow, { marginTop: 4 }]}>
                  <MapPin size={14} color="#94a3b8" />
                  <Text style={styles.address} numberOfLines={2}>
                    {selected.address}
                  </Text>
                </View>

                <View style={[styles.details, { marginTop: 8 }]}>
                  {typeof selected.rating === 'number' && (
                    <View style={styles.detail}>
                      <Star size={16} color="#fbbf24" fill="#fbbf24" />
                      <Text style={styles.detailText}>
                        {selected.rating.toFixed(1)}
                      </Text>
                      {!!selected.user_ratings_total && (
                        <Text style={styles.detailSubtext}>
                          ({selected.user_ratings_total})
                        </Text>
                      )}
                    </View>
                  )}
                  {!!selected.price_level && (
                    <View style={styles.detail}>
                      <DollarSign size={16} color="#10b981" />
                      <Text style={styles.detailText}>
                        {'$'.repeat(Math.max(0, selected.price_level))}
                      </Text>
                    </View>
                  )}
                </View>

                {!!selected.phone && (
                  <Text style={styles.modalMeta}>📞 {selected.phone}</Text>
                )}
                {!!selected.website && (
                  <Text
                    style={[
                      styles.modalMeta,
                      { textDecorationLine: 'underline' },
                    ]}
                    onPress={() => Linking.openURL(selected.website!)}
                  >
                    🔗 {selected.website}
                  </Text>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#3b82f6' }]}
                    onPress={() => {
                      if (selectedId) openPlaceInMaps(selectedId);
                    }}
                  >
                    <Navigation size={16} color="#fff" />
                    <Text style={styles.modalBtnText}>Otwórz w Mapach</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      { backgroundColor: 'rgba(148,163,184,0.2)' },
                    ]}
                    onPress={() => setSelectedId(null)}
                  >
                    <Text style={[styles.modalBtnText, { color: '#e2e8f0' }]}>
                      Zamknij
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Brak danych</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      { backgroundColor: 'rgba(148,163,184,0.2)' },
                    ]}
                    onPress={() => setSelectedId(null)}
                  >
                    <Text style={[styles.modalBtnText, { color: '#e2e8f0' }]}>
                      Zamknij
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Chip filtra
const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.filterChip, active && styles.filterChipActive]}
  >
    <Star
      size={14}
      color={active ? '#fde68a' : '#94a3b8'}
      {...(active ? { fill: '#fde68a' } : {})}
    />
    <Text
      style={[styles.filterChipText, active && styles.filterChipTextActive]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 14, fontWeight: '600', color: '#60a5fa' },

  // Filtry
  filtersRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.15)',
    borderColor: 'rgba(250, 204, 21, 0.5)',
  },
  filterChipText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  filterChipTextActive: { color: '#fde68a' },

  list: { padding: 16 },
  restaurantCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    padding: 0,
  },
  cardContent: { overflow: 'hidden' },
  restaurantImage: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantInfo: { padding: 16 },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  address: { flex: 1, fontSize: 13, color: '#94a3b8' },
  details: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  detailSubtext: { fontSize: 12, color: '#94a3b8' },

  navigateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
  },
  navigateText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: { marginBottom: 24 },
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#94a3b8' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '85%',
  },
  modalImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.8)',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalMeta: { fontSize: 14, color: '#cbd5e1', marginTop: 6 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
