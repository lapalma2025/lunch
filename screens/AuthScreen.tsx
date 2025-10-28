import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Keyboard,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Users, MapPin, MessageCircle, Sparkles } from 'lucide-react-native';

// Animated icons component
const FloatingIcons = () => {
  const [anims] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    anims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + index * 500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2000 + index * 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const getStyle = (index: number) => ({
    transform: [
      {
        translateY: anims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -20],
        }),
      },
    ],
    opacity: anims[index].interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.2, 0.6, 0.2],
    }),
  });

  return (
    <>
      <Animated.View style={[styles.floatingIcon, styles.icon1, getStyle(0)]}>
        <Users size={40} color="rgba(59, 130, 246, 0.4)" />
      </Animated.View>
      <Animated.View style={[styles.floatingIcon, styles.icon2, getStyle(1)]}>
        <MapPin size={35} color="rgba(168, 85, 247, 0.4)" />
      </Animated.View>
      <Animated.View style={[styles.floatingIcon, styles.icon3, getStyle(2)]}>
        <MessageCircle size={30} color="rgba(236, 72, 153, 0.4)" />
      </Animated.View>
    </>
  );
};

export const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Błąd', 'Wypełnij wszystkie pola');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Błąd', 'Hasło musi mieć minimum 6 znaków');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert('Błąd logowania', error.message);
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        Alert.alert('Błąd rejestracji', error.message);
      } else {
        Alert.alert(
          'Sukces! 🎉',
          'Konto zostało utworzone. Teraz możesz się zalogować.',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsLogin(true);
                setPassword('');
              },
            },
          ]
        );
      }
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={StyleSheet.absoluteFill}
      />

      <FloatingIcons />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo i tytuł */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6', '#ec4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Text style={styles.logoEmoji}>🍽️</Text>
            </LinearGradient>
          </View>
          <Text style={styles.title}>Lunchly</Text>
          <Text style={styles.subtitle}>
            Znajdź towarzysza obiadu w pobliżu
          </Text>
        </View>

        {/* Opis aplikacji */}
        <BlurView intensity={20} tint="dark" style={styles.infoCard}>
          <View style={styles.infoContent}>
            <View style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <MapPin size={18} color="#3b82f6" />
              </View>
              <Text style={styles.featureText}>
                Znajdź ludzi w okolicy gotowych na lunch
              </Text>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <MessageCircle size={18} color="#8b5cf6" />
              </View>
              <Text style={styles.featureText}>
                Czatuj i umawiaj się bezpośrednio
              </Text>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Sparkles size={18} color="#ec4899" />
              </View>
              <Text style={styles.featureText}>
                Poznawaj nowe osoby przy posiłku
              </Text>
            </View>
          </View>
        </BlurView>

        {/* Formularz logowania */}
        <BlurView intensity={30} tint="dark" style={styles.formCard}>
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {isLogin ? 'Zaloguj się' : 'Utwórz konto'}
            </Text>

            <Input
              label="Email"
              placeholder="twoj@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#64748b"
              editable={!loading}
            />

            <Input
              label="Hasło"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#64748b"
              editable={!loading}
            />

            <Button
              title={isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
              onPress={handleAuth}
              loading={loading}
              style={styles.button}
            />

            <Button
              title={
                isLogin
                  ? 'Nie masz konta? Zarejestruj się'
                  : 'Masz już konto? Zaloguj się'
              }
              onPress={() => {
                setIsLogin(!isLogin);
                setPassword('');
              }}
              variant="outline"
              disabled={loading}
              style={styles.switchButton}
            />
          </View>
        </BlurView>

        <Text style={styles.footer}>
          Dołącz do społeczności i nie jedz sam! 🚀
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoContent: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  form: {
    gap: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
  },
  switchButton: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  footer: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  floatingIcon: {
    position: 'absolute',
    zIndex: -1,
    pointerEvents: 'none',
  },
  icon1: {
    top: 120,
    left: 30,
  },
  icon2: {
    top: 250,
    right: 40,
  },
  icon3: {
    bottom: 200,
    left: 50,
  },
});
