import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';

export const FeedbackScreen = () => {
  const { matchId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submitFeedback = async () => {
    if (!rating) {
      Alert.alert('Błąd', 'Wybierz ocenę');
      return;
    }

    if (!user || !matchId) return;

    setLoading(true);

    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId as string)
      .maybeSingle();

    if (!matchData) {
      Alert.alert('Błąd', 'Nie znaleziono spotkania');
      setLoading(false);
      return;
    }

    const feedbackField =
      matchData.user_a === user.id ? 'feedback_a' : 'feedback_b';

    const feedback = {
      rating,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('matches')
      .update({
        [feedbackField]: feedback,
        status: 'completed',
      })
      .eq('id', matchId as string);

    setLoading(false);

    if (error) {
      Alert.alert('Błąd', error.message);
    } else {
      Alert.alert('Dziękujemy!', 'Twoja opinia została zapisana', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>Jak minął lunch?</Text>
          <Text style={styles.subtitle}>
            Twoja opinia pomoże nam ulepszyć Lunchly
          </Text>

          <View style={styles.ratingButtons}>
            <TouchableOpacity
              style={[
                styles.ratingButton,
                rating === 'positive' && styles.ratingButtonSelected,
              ]}
              onPress={() => setRating('positive')}
            >
              <ThumbsUp
                size={40}
                color={rating === 'positive' ? '#10b981' : '#94a3b8'}
              />
              <Text
                style={[
                  styles.ratingButtonText,
                  rating === 'positive' && styles.ratingButtonTextSelected,
                ]}
              >
                Świetnie!
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.ratingButton,
                rating === 'negative' && styles.ratingButtonSelected,
              ]}
              onPress={() => setRating('negative')}
            >
              <ThumbsDown
                size={40}
                color={rating === 'negative' ? '#ef4444' : '#94a3b8'}
              />
              <Text
                style={[
                  styles.ratingButtonText,
                  rating === 'negative' && styles.ratingButtonTextSelected,
                ]}
              >
                Nie za dobrze
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Komentarz (opcjonalnie)"
            placeholder="Co moglibyśmy poprawić?"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />

          <Button
            title="Wyślij opinię"
            onPress={submitFeedback}
            loading={loading}
            disabled={!rating}
          />

          <Button
            title="Pomiń"
            onPress={() => router.back()}
            variant="outline"
            style={styles.skipButton}
          />
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
  },
  card: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  ratingButton: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12,
  },
  ratingButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  ratingButtonTextSelected: {
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  skipButton: {
    marginTop: 12,
  },
});
