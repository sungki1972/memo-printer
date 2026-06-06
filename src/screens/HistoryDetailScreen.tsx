import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';
import { StatusBadge } from '../components/StatusBadge';
import { PrinterIcon } from '../components/PrinterIcon';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { EditMemoModal } from '../components/EditMemoModal';
import { printApi } from '../services/api';
import * as history from '../services/historyStore';
import { LocalPrint } from '../types';
import { formatFull } from '../utils/time';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  route: { params: { id: string } };
  navigation: any;
}

export function HistoryDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { id } = route.params;
  const [record, setRecord] = useState<LocalPrint | undefined>(() => history.getById(id));
  const [reprinting, setReprinting] = useState(false);
  const [editing, setEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const r = history.getById(id);
      if (!r) {
        navigation.goBack();
        return;
      }
      setRecord(r);
    }, [id, navigation])
  );

  if (!record) return <View style={styles.container} />;

  const handleReprint = async () => {
    if (reprinting) return;
    setReprinting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const result = await printApi.printImage(record.imageUri, record.memo || undefined);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('재인쇄 완료', '프린터로 전송되었습니다.');
      } else {
        throw new Error(result.error || '재인쇄 실패');
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('재인쇄 실패', err.message || '서버와 통신할 수 없습니다.');
    } finally {
      setReprinting(false);
    }
  };

  const handleSaveMemo = (memo: string) => {
    const updated = history.update(record.id, { memo });
    if (updated) setRecord(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('기록 삭제', '이 인쇄 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          history.remove(record.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={reprinting} variant="printing" message="재인쇄 중..." />
      <EditMemoModal
        visible={editing}
        initialValue={record.memo}
        onClose={() => setEditing(false)}
        onSave={handleSaveMemo}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[typography.h3, { color: colors.text }]}>인쇄 상세</Text>
        <Pressable style={styles.iconBtn} onPress={handleDelete} hitSlop={8}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Image */}
        <View style={styles.imageCard}>
          <Image
            source={{ uri: record.imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Status & date */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h3, { color: colors.text }]}>이미지 인쇄</Text>
              <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: 2 }]}>
                {formatFull(record.createdAt)}
              </Text>
            </View>
            <StatusBadge status={record.status === 'success' ? 'success' : 'failed'} size="medium" />
          </View>
        </View>

        {/* Memo (editable) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[typography.subtitle, { color: colors.text }]}>메모</Text>
            <Pressable style={styles.editBtn} onPress={() => setEditing(true)} hitSlop={8}>
              <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, marginLeft: 4 }]}>수정</Text>
            </Pressable>
          </View>
          <Text
            style={[
              typography.body,
              { color: record.memo ? colors.text : colors.textTertiary, marginTop: spacing.sm },
            ]}
          >
            {record.memo || '메모 없음 — 수정을 눌러 추가하세요.'}
          </Text>
        </View>

        {/* Job info */}
        {record.jobId && (
          <View style={styles.card}>
            <Text style={[typography.subtitle, { color: colors.text, marginBottom: spacing.sm }]}>
              작업 ID
            </Text>
            <Text style={[typography.mono, { color: colors.primary }]} selectable>
              {record.jobId}
            </Text>
          </View>
        )}

        {record.error && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
            <Text style={[typography.bodySmall, { color: colors.error, marginLeft: spacing.sm, flex: 1 }]}>
              {record.error}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom action — reprint */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable style={styles.reprintButton} onPress={handleReprint} disabled={reprinting}>
          <PrinterIcon size={22} color={colors.textInverse} />
          <Text style={[typography.button, { color: colors.textInverse, marginLeft: spacing.sm }]}>
            재인쇄
          </Text>
        </Pressable>
      </View>
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
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flex: 1 },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryGhost,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  bottomActions: {
    padding: spacing.lg,
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
