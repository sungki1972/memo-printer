import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';
import { StatusBadge } from './StatusBadge';
import { LocalPrint } from '../types';
import { formatRelative } from '../utils/time';

interface HistoryCardProps {
  item: LocalPrint;
  onPress: (item: LocalPrint) => void;
  onLongPress: (item: LocalPrint) => void;
  onReprint: (item: LocalPrint) => void;
  onDelete: (item: LocalPrint) => void;
}

export function HistoryCard({
  item,
  onPress,
  onLongPress,
  onReprint,
  onDelete,
}: HistoryCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={300}
    >
      <Image
        source={{ uri: item.imageUri }}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[typography.subtitle, { color: colors.text, flex: 1 }]}
            numberOfLines={1}
          >
            {item.memo ? item.memo : '메모 없음'}
          </Text>
          <StatusBadge status={item.status === 'success' ? 'success' : 'failed'} />
        </View>

        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
          {formatRelative(item.createdAt)}
          {item.jobId ? `  ·  #${String(item.jobId).slice(-6)}` : ''}
        </Text>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => onReprint(item)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="printer" size={16} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, marginLeft: 4 }]}>
              재인쇄
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => onDelete(item)}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
            <Text style={[typography.caption, { color: colors.error, marginLeft: 4 }]}>
              삭제
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: colors.surfacePressed,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  actionBtnPressed: {
    opacity: 0.6,
  },
});
