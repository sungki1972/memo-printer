import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';
import { StatusBadge } from './StatusBadge';
import { PrintLog } from '../types';

interface LogCardProps {
  log: PrintLog;
  onPress: (log: PrintLog) => void;
}

const TYPE_LABELS: Record<string, string> = {
  image_print: '이미지 인쇄',
  memo_only: '메모 인쇄',
  xprinter: 'XPRINTER',
  xprinter_qr: 'QR+메모',
  xprinter_qr_reprint: '재인쇄',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}

export function LogCard({ log, onPress }: LogCardProps) {
  const typeLabel = TYPE_LABELS[log.print_type] || log.print_type;
  const hasImage = !!log.image_url;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(log)}
    >
      <View style={styles.thumbnailContainer}>
        {hasImage ? (
          <Image source={{ uri: log.image_url! }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <MaterialCommunityIcons
              name={log.print_type === 'memo_only' ? 'text-box-outline' : 'image-outline'}
              size={24}
              color={colors.textTertiary}
            />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[typography.subtitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {typeLabel}
          </Text>
          <StatusBadge status={log.status === 'success' ? 'success' : 'failed'} />
        </View>

        {log.memo ? (
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]} numberOfLines={1}>
            {log.memo}
          </Text>
        ) : log.content ? (
          <Text style={[typography.bodySmall, { color: colors.textSecondary }]} numberOfLines={1}>
            {log.content}
          </Text>
        ) : null}

        <View style={styles.bottomRow}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            {formatDate(log.created_at)}
          </Text>
          {log.print_job_id && (
            <Text style={[typography.mono, { color: colors.textTertiary, fontSize: 10 }]}>
              #{log.print_job_id.slice(-6)}
            </Text>
          )}
        </View>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={colors.textTertiary}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  thumbnailContainer: {
    marginRight: spacing.md,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  thumbnailPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});
