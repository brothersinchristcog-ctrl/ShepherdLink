import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { COLORS } from '../constants/theme';

interface SplashScreenViewProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

const { width } = Dimensions.get('window');

export const SplashScreenView: React.FC<SplashScreenViewProps> = ({
  onFinish,
  minDurationMs = 2200,
}) => {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.85));
  const [textFadeAnim] = useState(() => new Animated.Value(0));
  const [containerFade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 1. Fade in and scale up the logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Fade in tagline shortly after
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // 3. Smooth fade out transition after minDurationMs
    const timer = setTimeout(() => {
      Animated.timing(containerFade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) {
          onFinish();
        }
      });
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [containerFade, fadeAnim, minDurationMs, onFinish, scaleAnim, textFadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: containerFade }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.contentContainer}>
        {/* Animated Brand Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Animated Brand Tagline & Motto */}
        <Animated.View style={[styles.taglineContainer, { opacity: textFadeAnim }]}>
          <Text style={styles.tagline}>One Fold, One Shepherd</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PASTORS ASSOCIATION NETWORK</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Footer & Progress */}
      <Animated.View style={[styles.footerContainer, { opacity: textFadeAnim }]}>
        <ActivityIndicator size="small" color={COLORS.brandTeal} style={styles.loader} />
        <Text style={styles.footerNote}>Connecting Shepherds • Serving Together</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: Math.min(width * 0.72, 300),
    height: Math.min(width * 0.72, 300),
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.brandNavy,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: COLORS.brandTealSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#B2E5E7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.brandTeal,
    letterSpacing: 1.2,
  },
  footerContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  loader: {
    marginBottom: 12,
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
});
