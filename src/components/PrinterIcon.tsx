import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface PrinterIconProps {
  size?: number;
  color?: string;
  animated?: boolean;
  variant?: 'default' | 'success' | 'error' | 'printing';
}

export function PrinterIcon({
  size = 24,
  color,
  animated = false,
  variant = 'default',
}: PrinterIconProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    if (variant === 'printing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      const slide = Animated.loop(
        Animated.sequence([
          Animated.timing(slideAnim, {
            toValue: size * 0.15,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      slide.start();
      return () => { pulse.stop(); slide.stop(); };
    }
  }, [animated, variant]);

  const iconName = variant === 'success'
    ? 'printer-check'
    : variant === 'error'
    ? 'printer-alert'
    : 'printer';

  const iconColor = color || (
    variant === 'success' ? colors.success
    : variant === 'error' ? colors.error
    : variant === 'printing' ? colors.primary
    : colors.text
  );

  if (animated && variant === 'printing') {
    return (
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />
        </Animated.View>
        <Animated.View
          style={[
            styles.paper,
            {
              width: size * 0.5,
              height: size * 0.3,
              bottom: -size * 0.1,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        />
      </View>
    );
  }

  return <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  paper: {
    position: 'absolute',
    backgroundColor: colors.primaryLight,
    borderRadius: 2,
  },
});
