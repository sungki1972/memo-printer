import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';
import { PrinterIcon } from './PrinterIcon';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  variant?: 'loading' | 'printing';
}

export function LoadingOverlay({ visible, message, variant = 'loading' }: LoadingOverlayProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {variant === 'printing' ? (
            <PrinterIcon size={48} animated variant="printing" />
          ) : (
            <ActivityIndicator size="large" color={colors.primary} />
          )}
          <Text style={[typography.subtitle, { color: colors.text, marginTop: spacing.lg }]}>
            {message || (variant === 'printing' ? '인쇄 중...' : '로딩 중...')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
});
