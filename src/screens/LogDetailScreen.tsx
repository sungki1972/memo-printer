import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';
import { StatusBadge } from '../components/StatusBadge';
import { PrinterIcon } from '../components/PrinterIcon';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { printApi } from '../services/api';
import { PrintLog } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LogDetailScreenProps {
  route: { params: { log: PrintLog } };
  navigation: any;
}

const TYPE_LABELS: Record<string, string> = {
  image_print: '이미지 인쇄',
  memo_only: '메모 인쇄',
  xprinter: 'XPRINTER 메모',
  xprinter_qr: 'QR + 메모',
  xprinter_qr_reprint: '재인쇄',
};

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as any} size={18} color={colors.textTertiary} />
      <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm, width: 80 }]}>
        {label}
      </Text>
      <Text style={[typography.bodySmall, { color: colors.text, flex: 1 }]} selectable>
        {value}
      </Text>
    </View>
  );
}

export function LogDetailScreen({ route, navigation }: LogDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { log } = route.params;
  const [reprinting, setReprinting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasImage = !!log.image_url && !imageError;
  const typeLabel = TYPE_LABELS[log.print_type] || log.print_type;

  const handleReprint = async () => {
    Alert.alert('재인쇄', '이 작업을 다시 인쇄하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '재인쇄',
        onPress: async () => {
          setReprinting(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

          try {
            const result = await printApi.reprint(log.id);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('재인쇄 완료', '프린터로 전송되었습니다.');
            } else {
              throw new Error(result.error || '재인쇄 실패');
            }
          } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('재인쇄 실패', err.message);
          } finally {
            setReprinting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={reprinting} variant="printing" message="재인쇄 중..." />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[typography.h3, { color: colors.text }]}>인쇄 상세</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Image Section */}
        {log.image_url && (
          <View style={styles.imageCard}>
            {!imageError ? (
              <Image
                source={{ uri: log.image_url }}
                style={styles.image}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="image-broken-variant" size={48} color={colors.textTertiary} />
                <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: spacing.sm }]}>
                  이미지를 불러올 수 없습니다
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Status & Type */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <Text style={[typography.h3, { color: colors.text }]}>{typeLabel}</Text>
              <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: 2 }]}>
                {formatDateFull(log.created_at)}
              </Text>
            </View>
            <StatusBadge status={log.status === 'success' ? 'success' : 'failed'} size="medium" />
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.md }]}>
            상세 정보
          </Text>

          {log.print_job_id && (
            <InfoRow icon="identifier" label="작업 ID" value={log.print_job_id} />
          )}

          {log.memo && (
            <InfoRow icon="note-text" label="메모" value={log.memo} />
          )}

          {log.content && (
            <InfoRow icon="text" label="내용" value={log.content} />
          )}

          {log.qr_url && (
            <InfoRow icon="qrcode" label="QR URL" value={log.qr_url} />
          )}

          {log.phone && (
            <InfoRow icon="phone" label="전화번호" value={log.phone} />
          )}

          {log.error_message && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
              <Text style={[typography.bodySmall, { color: colors.error, marginLeft: spacing.sm, flex: 1 }]}>
                {log.error_message}
              </Text>
            </View>
          )}
        </View>

        {/* Image URL for review */}
        {log.image_url && (
          <View style={styles.card}>
            <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.sm }]}>
              이미지 URL
            </Text>
            <Text style={[typography.mono, { color: colors.primary }]} selectable numberOfLines={3}>
              {log.image_url}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action — reprint only available for logs with qr_url */}
      {log.qr_url ? (
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable style={styles.reprintButton} onPress={handleReprint} disabled={reprinting}>
            <PrinterIcon size={22} color={colors.textInverse} />
            <Text style={[typography.button, { color: colors.textInverse, marginLeft: spacing.sm }]}>
              재인쇄
            </Text>
          </Pressable>
        </View>
      ) : log.print_type === 'image_print' ? (
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[styles.reprintButton, { backgroundColor: colors.textTertiary }]}>
            <MaterialCommunityIcons name="printer-off" size={22} color={colors.textInverse} />
            <Text style={[typography.button, { color: colors.textInverse, marginLeft: spacing.sm }]}>
              이미지 인쇄는 재인쇄 불가
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  imageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: SCREEN_WIDTH * 0.85,
    backgroundColor: '#F5F5F5',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  bottomActions: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'android' ? spacing.xl : spacing.xxl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reprintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
