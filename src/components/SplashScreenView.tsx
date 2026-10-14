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
  minDurationMs = 2400,
}) => {
  // Logo animations: slide from top to bottom (-60 -> 0) + fade in + subtle scale
  const [logoFadeAnim] = useState(() => new Animated.Value(0));
  const [logoTranslateY] = useState(() => new Animated.Value(-60));
  const [logoScaleAnim] = useState(() => new Animated.Value(0.9));

  // Tagline animations: slide up slightly (12 -> 0) + fade in shortly after logo arrives
  const [taglineFadeAnim] = useState(() => new Animated.Value(0));
  const [taglineTranslateY] = useState(() => new Animated.Value(12));

  // Footer and container fade out
  const [footerFadeAnim] = useState(() => new Animated.Value(0));
  const [containerFade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 1. Logo comes from top to bottom with spring and fade in
    Animated.parallel([
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoTranslateY, {
        toValue: 0,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Tagline enters right after the logo lands (delay: 400ms)
    Animated.parallel([
      Animated.timing(taglineFadeAnim, {
        toValue: 1,
        duration: 550,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.spring(taglineTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 50,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(footerFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Smooth container fade out transition after minDurationMs
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
  }, [
    containerFade,
    footerFadeAnim,
    logoFadeAnim,
    logoScaleAnim,
    logoTranslateY,
    minDurationMs,
    onFinish,
    taglineFadeAnim,
    taglineTranslateY,
  ]);

  return (
    <Animated.View style={[styles.container, { opacity: containerFade }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.contentContainer}>
        {/* Animated Brand Logo (Slides top to bottom) */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoFadeAnim,
              transform: [
                { translateY: logoTranslateY },
                { scale: logoScaleAnim },
              ],
            },
          ]}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Animated Tagline (Moved closer up to the logo) */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineFadeAnim,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <Text style={styles.tagline}>One Fold, One Shepherd</Text>
        </Animated.View>
      </View>

      {/* Bottom Footer & Progress */}
      <Animated.View style={[styles.footerContainer, { opacity: footerFadeAnim }]}>
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
    marginTop: -10, // Moved up tightly under the ShepherdLink wordmark
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.brandNavy,
    letterSpacing: 0.5,
  },
  footerContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  loader: {
    marginBottom: 10,
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
});
