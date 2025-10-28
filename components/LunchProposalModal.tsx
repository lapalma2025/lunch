import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Button } from '@/components/Button';
import { NearbyUser, Restaurant } from '@/types';
import { getNearbyRestaurants } from '@/lib/places';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  MapPin,
  Clock,
  Star,
  DollarSign,
  Calendar,
  Zap,
  Search,
  Check,
} from 'lucide-react-native';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

interface LunchProposalModalProps {
  visible: boolean;
  onClose: () => void;
  targetUser: NearbyUser | null;
  onSend: (restaurantId: string, time: 'now' | Date) => void;
}

type Suggestion = {
  id: string;
  primary: string;
  secondary?: string;
  queryText: string;
};

export const LunchProposalModal = ({
  visible,
  onClose,
  targetUser,
  onSend,
}: LunchProposalModalProps) => {
  const { user } = useAuth();
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCount, setShowCount] = useState(8);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(
    null
  );
  const [timeOption, setTimeOption] = useState<'now' | 'later'>('now');
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [hourStr, setHourStr] = useState('');
  const [minuteStr, setMinuteStr] = useState('');
  const [customTimeError, setCustomTimeError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Reset i pobieranie restauracji po otwarciu
  useEffect(() => {
    if (!visible || !targetUser) return;

    setAllRestaurants([]);
    setShowCount(8);
    setSelectedRestaurant(null);
    setTimeOption('now');
    setSelectedTime(new Date());
    setHourStr('');
    setMinuteStr('');
    setCustomTimeError(null);
    setSearchQuery('');
    setSuggestions([]);

    if (!user?.lat || !user?.lon) return;

    (async () => {
      setLoading(true);
      try {
        const results = await getNearbyRestaurants(user.lat, user.lon, 5000);
        const sorted = [...results].sort(
          (a, b) => (a.distance ?? 0) - (b.distance ?? 0)
        );
        setAllRestaurants(sorted);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, targetUser]);

  // Infinite scroll
  const visibleRestaurants = useMemo(
    () => allRestaurants.slice(0, showCount),
    [allRestaurants, showCount]
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 48;
    if (
      nearBottom &&
      !loadingMore &&
      !loading &&
      showCount < allRestaurants.length
    ) {
      setLoadingMore(true);
      setTimeout(() => {
        setShowCount((prev) => Math.min(prev + 5, allRestaurants.length));
        setLoadingMore(false);
      }, 800);
    }
  };

  // Generowanie slotów czasu
  const generateTimeOptions = () => {
    const options: Date[] = [];
    const now = new Date();
    const rounded = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(rounded);
    now.setSeconds(0);
    for (let i = 1; i <= 8; i++) {
      const t = new Date(now);
      t.setMinutes(t.getMinutes() + i * 15);
      options.push(t);
    }
    return options;
  };

  const applyCustomTime = () => {
    setCustomTimeError(null);
    const h = Number(hourStr);
    const m = Number(minuteStr);
    if (Number.isNaN(h) || Number.isNaN(m))
      return setCustomTimeError('Podaj liczby');
    if (h < 0 || h > 23) return setCustomTimeError('Godzina 0–23');
    if (m < 0 || m > 59) return setCustomTimeError('Minuty 0–59');
    const custom = new Date();
    custom.setHours(h, m, 0, 0);
    setSelectedTime(custom);
    Keyboard.dismiss();
  };

  // Globalne wyszukiwanie miejsc (autocomplete)
  useEffect(() => {
    if (!visible) return;
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(
          'https://places.googleapis.com/v1/places:searchText',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_API_KEY,
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.location',
            },
            body: JSON.stringify({
              textQuery: searchQuery,
              regionCode: 'PL',
              maxResultCount: 5,
            }),
          }
        );

        const data = await res.json();
        const items: Suggestion[] = (data?.places || []).map((p: any) => ({
          id: p.id,
          primary: p.displayName?.text || 'Miejsce',
          secondary: p.formattedAddress || '',
          queryText: p.displayName?.text || '',
        }));
        setSuggestions(items);
      } catch (e) {
        console.warn('Autocomplete error:', e);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, visible]);

  // Wybór z podpowiedzi
  const pickSuggestion = async (s: Suggestion) => {
    try {
      setSearching(true);
      const resp = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel',
          },
          body: JSON.stringify({
            textQuery: s.primary,
            regionCode: 'PL',
            maxResultCount: 1,
          }),
        }
      );

      const data = await resp.json();
      const p = data?.places?.[0];
      if (p?.id) {
        const r: Restaurant = {
          place_id: p.id,
          name: p.displayName?.text || s.primary,
          address: p.formattedAddress || s.secondary || '',
          rating: p.rating ?? null,
          user_ratings_total: p.userRatingCount ?? 0,
          price_level: p.priceLevel ?? null,
          lat: p.location?.latitude,
          lon: p.location?.longitude,
          distance: 0,
          cuisine_type: 'custom',
          photo_reference: null,
        };
        setAllRestaurants((prev) => [
          r,
          ...prev.filter((x) => x.place_id !== r.place_id),
        ]);
        setSelectedRestaurant(r.place_id);
        setSearchQuery(`${r.name} — ${r.address}`);
        setSuggestions([]);
        Keyboard.dismiss();
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSend = () => {
    if (!selectedRestaurant) return;
    const time = timeOption === 'now' ? 'now' : selectedTime;
    onSend(selectedRestaurant, time);
    onClose();
  };

  if (!targetUser) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={80} tint="dark" style={styles.blurBackground}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>🍽️ Zaproś na lunch</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={26} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>z {targetUser.name}</Text>

            <ScrollView
              style={styles.body}
              onScroll={onScroll}
              scrollEventThrottle={120}
              contentContainerStyle={{ paddingBottom: 140 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Kiedy */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Clock size={20} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>Kiedy?</Text>
                </View>

                {/* Opcje czasu */}
                <View style={styles.timeOptions}>
                  <TouchableOpacity
                    style={[
                      styles.timeOption,
                      timeOption === 'now' && styles.timeOptionActive,
                    ]}
                    onPress={() => setTimeOption('now')}
                  >
                    <Zap
                      size={20}
                      color={timeOption === 'now' ? '#fff' : '#60a5fa'}
                    />
                    <Text
                      style={[
                        styles.timeOptionText,
                        timeOption === 'now' && styles.timeOptionTextActive,
                      ]}
                    >
                      Teraz
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.timeOption,
                      timeOption === 'later' && styles.timeOptionActive,
                    ]}
                    onPress={() => setTimeOption('later')}
                  >
                    <Calendar
                      size={20}
                      color={timeOption === 'later' ? '#fff' : '#60a5fa'}
                    />
                    <Text
                      style={[
                        styles.timeOptionText,
                        timeOption === 'later' && styles.timeOptionTextActive,
                      ]}
                    >
                      Później
                    </Text>
                  </TouchableOpacity>
                </View>

                {timeOption === 'later' && (
                  <>
                    <View style={styles.timeSlots}>
                      {generateTimeOptions().map((time, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.timeSlot,
                            selectedTime.getTime() === time.getTime() &&
                              styles.timeSlotActive,
                          ]}
                          onPress={() => {
                            setHourStr('');
                            setMinuteStr('');
                            setSelectedTime(time);
                          }}
                        >
                          <Text
                            style={[
                              styles.timeSlotText,
                              selectedTime.getTime() === time.getTime() &&
                                styles.timeSlotTextActive,
                            ]}
                          >
                            {time.toLocaleTimeString('pl-PL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.customLabel}>
                      lub wpisz własną godzinę:
                    </Text>
                    <View style={styles.customTimeRow}>
                      <TextInput
                        style={styles.customTimeInput}
                        placeholder="HH"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={hourStr}
                        onChangeText={(t) =>
                          setHourStr(t.replace(/[^\d]/g, ''))
                        }
                      />
                      <Text style={styles.customColon}>:</Text>
                      <TextInput
                        style={styles.customTimeInput}
                        placeholder="MM"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={minuteStr}
                        onChangeText={(t) =>
                          setMinuteStr(t.replace(/[^\d]/g, ''))
                        }
                      />
                      <TouchableOpacity
                        style={styles.applyBtn}
                        onPress={applyCustomTime}
                      >
                        <Check size={16} color="#fff" />
                        <Text style={styles.applyBtnText}>Ustaw</Text>
                      </TouchableOpacity>
                    </View>
                    {customTimeError && (
                      <Text style={styles.errorText}>{customTimeError}</Text>
                    )}
                  </>
                )}
              </View>

              {/* Gdzie */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MapPin size={20} color="#8b5cf6" />
                  <Text style={styles.sectionTitle}>Gdzie?</Text>
                </View>

                {/* Pole wyszukiwania */}
                <View style={styles.searchContainer}>
                  <Search size={18} color="#94a3b8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Wpisz nazwę miejsca (np. Karczma U...)"
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {/* Sugestie */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsBox}>
                    {searching ? (
                      <View style={styles.suggestionRow}>
                        <ActivityIndicator size="small" color="#60a5fa" />
                        <Text style={styles.suggestionText}>Szukam...</Text>
                      </View>
                    ) : (
                      suggestions.map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.suggestionRow}
                          onPress={() => pickSuggestion(s)}
                        >
                          <Text style={styles.suggestionText}>{s.primary}</Text>
                          {s.secondary && (
                            <Text style={styles.suggestionSecondary}>
                              {s.secondary}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}

                {/* Lista miejsc */}
                {loading ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                  </View>
                ) : (
                  <View style={styles.restaurants}>
                    {visibleRestaurants.map((r) => (
                      <TouchableOpacity
                        key={r.place_id}
                        style={[
                          styles.restaurantCard,
                          selectedRestaurant === r.place_id &&
                            styles.restaurantCardActive,
                        ]}
                        onPress={() => setSelectedRestaurant(r.place_id)}
                      >
                        <Text style={styles.restaurantName}>{r.name}</Text>
                        <Text style={styles.restaurantAddress}>
                          {r.address}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {loadingMore && (
                      <View style={styles.loadMore}>
                        <ActivityIndicator size="small" color="#60a5fa" />
                        <Text style={styles.loadMoreText}>
                          Ładowanie kolejnych miejsc...
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Button
                title="Anuluj"
                onPress={onClose}
                variant="outline"
                style={styles.footerButton}
              />
              <Button
                title="Wyślij zaproszenie 🍽️"
                onPress={handleSend}
                disabled={!selectedRestaurant}
                style={[styles.footerButton, styles.sendButton]}
              />
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  blurBackground: { flex: 1 },
  modalContainer: { flex: 1, backgroundColor: '#1e293b', paddingTop: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginHorizontal: 20,
    marginTop: 6,
  },
  closeButton: { padding: 8 },
  body: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 20, marginBottom: 30 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  timeOptions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.3)',
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  timeOptionActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  timeOptionText: { fontSize: 16, fontWeight: '600', color: '#60a5fa' },
  timeOptionTextActive: { color: '#fff' },
  timeSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  timeSlotActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  timeSlotText: { color: '#a78bfa', fontWeight: '600' },
  timeSlotTextActive: { color: '#fff' },
  customLabel: { color: '#cbd5e1', marginTop: 12, marginBottom: 6 },
  customTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customTimeInput: {
    width: 64,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.8)',
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  customColon: { color: '#94a3b8', fontSize: 18, fontWeight: '700' },
  applyBtn: {
    marginLeft: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applyBtnText: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#fca5a5', marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  suggestionsBox: {
    backgroundColor: 'rgba(2,6,23,0.9)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  suggestionText: { color: '#e2e8f0', fontWeight: '600' },
  suggestionSecondary: { color: '#94a3b8', fontSize: 12 },
  restaurants: { gap: 12 },
  restaurantCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  restaurantCardActive: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderColor: '#8b5cf6',
  },
  restaurantName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  restaurantAddress: { color: '#94a3b8', fontSize: 13 },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadMoreText: { color: '#94a3b8', fontSize: 14 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#1e293b',
  },
  footerButton: { flex: 1 },
  sendButton: { flex: 2 },
});
