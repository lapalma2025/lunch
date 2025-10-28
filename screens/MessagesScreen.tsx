import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { supabase } from '@/lib/supabase';
import { Match, User } from '@/types';
import { MessageCircle, Inbox } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface MatchWithUser extends Match {
  otherUser?: User;
}

export const MessagesScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<MatchWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;

    setLoading(true);

    const { data: matchesData, error } = await supabase
      .from('matches')
      .select('*')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .in('status', ['pending', 'accepted'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
      return;
    }

    if (matchesData) {
      const matchesWithUsers = await Promise.all(
        matchesData.map(async (match) => {
          const otherUserId =
            match.user_a === user.id ? match.user_b : match.user_a;

          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', otherUserId)
            .maybeSingle();

          return {
            ...match,
            otherUser: userData,
          };
        })
      );

      setMatches(matchesWithUsers);
    }

    setLoading(false);
  };

  const renderMatch = ({ item }: { item: MatchWithUser }) => {
    if (!item.otherUser) return null;

    const isPending = item.status === 'pending';
    const isProposedByMe = item.proposed_by === user?.id;

    return (
      <TouchableOpacity onPress={() => router.push(`/chat/${item.id}` as any)}>
        <Card style={styles.matchCard}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.05)', 'rgba(139, 92, 246, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.matchContent}>
            <Avatar
              url={item.otherUser.avatar_url}
              name={item.otherUser.name}
              size={56}
            />
            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>{item.otherUser.name}</Text>
              <Text style={styles.matchStatus}>
                {isPending
                  ? isProposedByMe
                    ? 'Oczekuje na odpowiedź...'
                    : 'Zaproszenie do lunchu!'
                  : 'Kliknij, aby czatować'}
              </Text>
            </View>
            <MessageCircle size={24} color="#3b82f6" />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
          style={styles.emptyIconGradient}
        >
          <Inbox size={48} color="#3b82f6" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>Brak wiadomości</Text>
      <Text style={styles.emptySubtitle}>
        Zaproponuj lunch komuś w pobliżu, aby rozpocząć rozmowę
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header z bezpiecznym obszarem */}
      <BlurView
        intensity={80}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.title}>💬 Wiadomości</Text>
      </BlurView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Ładowanie wiadomości...</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 80 },
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
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
  },
  list: {
    padding: 16,
  },
  matchCard: {
    marginBottom: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  matchStatus: {
    fontSize: 14,
    color: '#94a3b8',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
