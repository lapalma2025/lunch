import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { supabase } from '@/lib/supabase';
import { Match, User } from '@/types';
import { MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface MatchWithUser extends Match {
  otherUser?: User;
}

export const MessagesScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
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
      .eq('status', 'accepted')
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

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}` as any)}
      >
        <Card style={styles.matchCard}>
          <View style={styles.matchContent}>
            <Avatar
              url={item.otherUser.avatar_url}
              name={item.otherUser.name}
              size={56}
            />
            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>{item.otherUser.name}</Text>
              <Text style={styles.matchStatus}>Kliknij, aby czatować</Text>
            </View>
            <MessageCircle size={24} color="#3b82f6" />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Wiadomości</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wiadomości</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Brak wiadomości</Text>
          <Text style={styles.emptySubtitle}>
            Zaproponuj lunch komuś w pobliżu, aby rozpocząć rozmowę
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
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
  matchCard: {
    marginBottom: 12,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  matchStatus: {
    fontSize: 14,
    color: '#64748b',
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
    marginTop: 16,
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
