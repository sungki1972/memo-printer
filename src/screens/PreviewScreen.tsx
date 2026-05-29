import React, { useState, useRef } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';
import { PrinterIcon } from '../components/PrinterIcon';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { printApi } from '../services/api';
import * as history from '../services/historyStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PreviewScreenProps {
  route: { params: { imageUri: string } };
  navigation: any;
}

export function PreviewScreen({ route, navigation }: PreviewScreenProps) {
  const insets = useSafeAreaInsets();
  const { imageUri } = route.params;
  const [memo, setMemo] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<'success' | 'error' | null>(null);
  const printingRef = useRef(false);
  const printIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);

  const handlePrint = async () => {
    if (printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    setPrintResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (!printIdRef.current) {
      printIdRef.current = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
    }

    try {
      const result = await printApi.printImage(imageUri, memo || undefined, printIdRef.current);

      if (result.success) {
        const isDup = result.deduplicated;
        setPrintResult('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 촬영 후 로컬 기록 저장 — 썸네일(원본 복사) + 메모 + 작업ID
        if (!savedRef.current) {
          savedRef.current = true;
          try {
            history.add({
              sourceUri: imageUri,
              memo,
              status: 'success',
              jobId: result.job_id || result.print_job_id || null,
              printType: 'image_print',
            });
          } catch (e) {
            console.warn('[Preview] 로컬 기록 저장 실패', e);
          }
        }

        setTimeout(() => {
          Alert.alert(
            isDup ? '이미 인쇄됨' : '인쇄 완료',
            isDup
              ? '이 사진은 이미 인쇄되었습니다.'
              : `프린터로 전송되었습니다.\n작업 ID: ${result.job_id || result.print_job_id || '-'}`,
            [
              { text: '로그 보기', onPress: () => navigation.navigate('MainTabs', { screen: 'Logs' }) },
              { text: '계속 촬영', onPress: () => navigation.goBack() },
            ]
          );
        }, 800);
      } else {
        throw new Error(result.error || '인쇄에 실패했습니다');
      }
    } catch (err: any) {
      setPrintResult('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('인쇄 실패', err.message || '서버와 통신할 수 없습니다.', [
        { text: '재시도', onPress: () => { printingRef.current = false; handlePrint(); } },
        { text: '취소', style: 'cancel' },
      ]);
    } finally {
      setPrinting(false);
      if (printResult !== 'error') printingRef.current = false;
    }
  };

  const handleRetake = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LoadingOverlay visible={printing} variant="printing" message="프린터로 전송 중..." />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={handleRetake}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[typography.h3, { color: colors.text }]}>미리보기</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Preview */}
        <View style={styles.imageCard}>
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>

        {/* Memo Input */}
        <View style={styles.memoCard}>
          <View style={styles.memoHeader}>
            <MaterialCommunityIcons name="note-text-outline" size={20} color={colors.textSecondary} />
            <Text style={[typography.subtitle, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
              메모 (선택사항)
            </Text>
          </View>
          <TextInput
            style={styles.memoInput}
            placeholder="인쇄물에 표시할 메모를 입력하세요..."
            placeholderTextColor={colors.textTertiary}
            value={memo}
            onChangeText={setMemo}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'right' }]}>
            {memo.length}/200
          </Text>
        </View>

        {/* Print Info */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>
            A4 용지에 맞춰서 Epson 프린터로 인쇄됩니다. 이미지는 중앙 정렬, 비율 유지됩니다.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={styles.retakeButton}
          onPress={handleRetake}
        >
          <MaterialCommunityIcons name="camera-retake-outline" size={22} color={colors.text} />
          <Text style={[typography.buttonSmall, { color: colors.text, marginLeft: spacing.sm }]}>
            다시 촬영
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.printButton,
            printResult === 'success' && styles.printButtonSuccess,
            printResult === 'error' && styles.printButtonError,
          ]}
          onPress={handlePrint}
          disabled={printing}
        >
          <PrinterIcon
            size={22}
            color={colors.textInverse}
            variant={printResult === 'success' ? 'success' : printResult === 'error' ? 'error' : 'default'}
          />
          <Text style={[typography.button, { color: colors.textInverse, marginLeft: spacing.sm }]}>
            {printResult === 'success' ? '인쇄 완료!' : '인쇄하기'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  },
  imageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: SCREEN_WIDTH * 0.9,
    borderRadius: radius.lg,
    backgroundColor: '#F0F0F0',
  },
  memoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryGhost,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'android' ? spacing.xl : spacing.xxl,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  printButton: {
    flex: 1,
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
  printButtonSuccess: {
    backgroundColor: colors.success,
  },
  printButtonError: {
    backgroundColor: colors.error,
  },
});
