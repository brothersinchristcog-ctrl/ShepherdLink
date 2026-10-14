import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
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
  minDurationMs = 3800,
}) => {
  // Logo entrance: slides smoothly from top to bottom (-80 -> 0) + fades in (0 -> 1)
  const [logoFadeAnim] = useState(() => new Animated.Value(0));
  const [logoTranslateY] = useState(() => new Animated.Value(-80));
  const [logoScaleAnim] = useState(() => new Animated.Value(0.92));

  // Tagline & Powered By entrance: fades in shortly after logo settles
  const [taglineFadeAnim] = useState(() => new Animated.Value(0));
  const [taglineTranslateY] = useState(() => new Animated.Value(15));

  // Whole splash screen fade out transition
  const [containerFade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 1. Logo comes from top to bottom with a smooth spring and settles firmly in place
    Animated.parallel([
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Tagline & Footer enter smoothly shortly after the logo settles
    Animated.parallel([
      Animated.timing(taglineFadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.spring(taglineTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 45,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Keep the branded splash screen visible for minDurationMs before fading out smoothly
    const timer = setTimeout(() => {
      Animated.timing(containerFade, {
        toValue: 0,
        duration: 500,
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

      {/* Top placeholder to help center the logo vertically */}
      <View style={styles.topSpacer} />

      {/* Center Brand Logo & Tagline */}
      <View style={styles.contentContainer}>
        {/* Animated Brand Logo (Glides top to bottom, then stays crisp and steady) */}
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

        {/* Tagline */}
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

      {/* Powered by Covenant Synergy Pvt Ltd */}
      <Animated.View
        style={[
          styles.poweredByContainer,
          {
            opacity: taglineFadeAnim,
          },
        ]}
      >
        <Text style={styles.poweredByLabel}>POWERED BY</Text>
        <Text style={styles.poweredByBrand}>Covenant Synergy Pvt Ltd</Text>
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
    paddingVertical: 24,
  },
  topSpacer: {
    height: 40,
  },
  contentContainer: {
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
    marginTop: -10, // Snugly right under the ShepherdLink wordmark
  },
  tagline: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.brandNavy,
    letterSpacing: 0.5,
  },
  poweredByContainer: {
    alignItems: 'center',
    paddingBottom: 16,
    gap: 3,
  },
  poweredByLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.6,
  },
  poweredByBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandNavy,
    letterSpacing: 0.4,
  },
});
