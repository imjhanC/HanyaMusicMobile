import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const SplashScreen = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const letterSpacing = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Initial fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(letterSpacing, {
          toValue: 0,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
      // Glow pulse effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
    ]).start(() => {
      // Fade out after animations complete
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    });
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.gradientCircle} />
      
      {/* Animated glow effect */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      >
        <View style={styles.glow} />
      </Animated.View>

      {/* Main text */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.textWrapper}>
          <Text style={styles.hanyaText}>Hanya</Text>
          <Text style={styles.musicText}>Music</Text>
        </View>
        
        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          Your music, your way
        </Animated.Text>
      </Animated.View>

      {/* Decorative elements */}
      <Animated.View
        style={[
          styles.musicNote1,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { rotate: '15deg' },
            ],
          },
        ]}
      >
        <Text style={styles.noteIcon}>♪</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.musicNote2,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { rotate: '-15deg' },
            ],
          },
        ]}
      >
        <Text style={styles.noteIcon}>♫</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientCircle: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#1DB954',
    opacity: 0.05,
  },
  glowContainer: {
    position: 'absolute',
  },
  glow: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#1DB954',
    opacity: 0.15,
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 20,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hanyaText: {
    fontSize: 56,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
  },
  musicText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#1DB954',
    letterSpacing: 2,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  musicNote1: {
    position: 'absolute',
    top: '30%',
    left: '15%',
  },
  musicNote2: {
    position: 'absolute',
    bottom: '30%',
    right: '15%',
  },
  noteIcon: {
    fontSize: 48,
    color: '#1DB954',
    opacity: 0.3,
  },
});

export default SplashScreen;