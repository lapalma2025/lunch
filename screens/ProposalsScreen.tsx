import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import {
  Clock,
  MapPin,
  Check,
  X,
  Calendar,
  UtensilsCrossed,
} from 'lucide-react-native';

interface Proposal {
  id: string;
  user_a: string;
  user_b: string;
  proposed_by: string;
  status: 'pending' | 'accepted' | 'declined';
  proposed_restaurant_id: string;
  proposed_time: string;
  restaurant_name?: string;
  restaurant_address?: string;
  other_user_name?: string;
  other_user_avatar?: string;
  created_at: string;
}

export const ProposalsScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    fetchProposals();
  }, [activeTab]);

  const fetchProposals = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('matches')
        .select(
          `
          *,
          user_a_profile:users!matches_user_a_fkey(name, avatar_url),
          user_b_profile:users!matches_user_b_fkey(name, avatar_url)
        `
        )
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter i mapuj proposals
      const filtered = (data || [])
        .filter((match) => {
          if (activeTab === 'received') {
            return match.proposed_by !== user.id;
          } else {
            return match.proposed_by === user.id;
          }
        })
        .map((match) => {
          const isUserA = match.user_a === user.id;
          const otherUser = isUserA
            ? match.user_b_profile
            : match.user_a_profile;

          return {
            ...match,
            other_user_name: otherUser?.name || 'Nieznany',
            other_user_avatar: otherUser?.avatar_url || null,
          };
        });

      setProposals(filtered);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProposals();
    setRefreshing(false);
  };

  const handleAccept = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'accepted' })
        .eq('id', proposalId);

      if (error) throw error;

      Alert.alert(
        'Zaakceptowano! 🎉',
        'Możesz teraz zobaczyć szczegóły spotkania w zakładce Wiadomości.',
        [{ text: 'OK', onPress: () => fetchProposals() }]
      );
    } catch (error) {
      console.error('Error accepting proposal:', error);
      Alert.alert('Błąd', 'Nie udało się zaakceptować propozycji');
    }
  };

  const handleDecline = async (proposalId: string) => {
    Alert.alert(
      'Odrzuć propozycję?',
      'Czy na pewno chcesz odrzucić tę propozycję?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Odrzuć',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('matches')
                .update({ status: 'declined' })
                .eq('id', proposalId);

              if (error) throw error;
              fetchProposals();
            } catch (error) {
              console.error('Error declining proposal:', error);
              Alert.alert('Błąd', 'Nie udało się odrzucić propozycji');
            }
          },
        },
      ]
    );
  };

  const handleCancel = async (proposalId: string) => {
    Alert.alert(
      'Anuluj propozycję?',
      'Czy na pewno chcesz anulować tę propozycję?',
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('matches')
                .delete()
                .eq('id', proposalId);

              if (error) throw error;
              fetchProposals();
            } catch (error) {
              console.error('Error canceling proposal:', error);
              Alert.alert('Błąd', 'Nie udało się anulować propozycji');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = time.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 5) return 'Za chwilę';
    if (diffMins < 60) return `Za ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Za ${diffHours}h`;

    return time.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderProposal = ({ item }: { item: Proposal }) => {
    const isReceived = activeTab === 'received';

    return (
      <Card style={styles.proposalCard}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.05)', 'rgba(139, 92, 246, 0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Header z użytkownikiem */}
        <View style={styles.proposalHeader}>
          <Avatar
            url={item.other_user_avatar}
            name={item.other_user_name}
            size={50}
          />
          <View style={styles.proposalUserInfo}>
            <Text style={styles.proposalUserName}>{item.other_user_name}</Text>
            <Text style={styles.proposalSubtext}>
              {isReceived ? 'zaprasza Cię na lunch' : 'czeka na odpowiedź'}
            </Text>
          </View>
        </View>

        {/* Szczegóły */}
        <View style={styles.proposalDetails}>
          {/* Czas */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Clock size={16} color="#3b82f6" />
            </View>
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Kiedy</Text>
              <Text style={styles.detailValue}>
                {formatTime(item.proposed_time)}
              </Text>
            </View>
          </View>

          {/* Miejsce */}
          {item.restaurant_name && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <UtensilsCrossed size={16} color="#8b5cf6" />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Gdzie</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.restaurant_name}
                </Text>
                {item.restaurant_address && (
                  <Text style={styles.detailAddress} numberOfLines={1}>
                    {item.restaurant_address}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Akcje */}
        {isReceived ? (
          <View style={styles.actions}>
            <Button
              title="Odrzuć"
              onPress={() => handleDecline(item.id)}
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title="Akceptuj 🎉"
              onPress={() => handleAccept(item.id)}
              style={[styles.actionButton, styles.acceptButton]}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <Button
              title="Anuluj"
              onPress={() => handleCancel(item.id)}
              variant="outline"
              style={styles.singleActionButton}
            />
          </View>
        )}
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
          style={styles.emptyIconGradient}
        >
          <UtensilsCrossed size={48} color="#3b82f6" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'received' ? 'Brak zaproszeń' : 'Nie wysłano zaproszeń'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'received'
          ? 'Kiedy ktoś zaprosi Cię na lunch, zobaczysz to tutaj'
          : 'Wyślij komuś propozycję lunchu!'}
      </Text>
    </View>
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
        <Text style={styles.title}>🍽️ Zaproszenia</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && styles.tabActive]}
            onPress={() => setActiveTab('received')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'received' && styles.tabTextActive,
              ]}
            >
              Otrzymane
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
            onPress={() => setActiveTab('sent')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'sent' && styles.tabTextActive,
              ]}
            >
              Wysłane
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={proposals}
          renderItem={renderProposal}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
          ]}
          ListEmptyComponent={renderEmpty}
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60a5fa',
  },
  tabTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  proposalCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  proposalUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  proposalUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  proposalSubtext: {
    fontSize: 13,
    color: '#94a3b8',
  },
  proposalDetails: {
    gap: 12,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  detailAddress: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 2,
  },
  singleActionButton: {
    flex: 1,
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
