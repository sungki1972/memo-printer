import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, radius, spacing } from '../theme/typography';

interface StatusBadgeProps {
  status: 'success' | 'failed' | 'printing';
  size?: 'small' | 'medium';
}

const STATUS_CONFIG = {
  success: {
    label: '완료',
    icon: 'check-circle' as const,
    bg: colors.successLight,
    fg: colors.success,
  },
  failed: {
    label: '실패',
    icon: 'alert-circle' as const,
    bg: colors.errorLight,
    fg: colors.error,
  },
  printing: {
    label: '인쇄 중',
    icon: 'printer' as const,
    bg: colors.primaryLight,
    fg: colors.primary,
  },
};

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.badgeSmall]}>
      <MaterialCommunityIcons
        name={config.icon}
        size={isSmall ? 12 : 16}
        color={config.fg}
      />
      <Text style={[
        isSmall ? typography.caption : typography.bodySmall,
        { color: config.fg, marginLeft: spacing.xs },
      ]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
