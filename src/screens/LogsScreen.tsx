import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
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
import { PrinterIcon } from '../components/PrinterIcon';
import { LogCard } from '../components/LogCard';
import { HistoryCard } from '../components/HistoryCard';
import { EmptyState } from '../components/EmptyState';
import { EditMemoModal } from '../components/EditMemoModal';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { printApi } from '../services/api';
import * as history from '../services/historyStore';
import { PrintLog, LocalPrint } from '../types';

interface LogsScreenProps {
  navigation: any;
}

type Tab = 'local' | 'server';

export function LogsScreen({ navigation }: LogsScreenProps) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('local');

  // ── 로컬 기록 상태 ──
  const [localLogs, setLocalLogs] = useState<LocalPrint[]>([]);
  const [editing, setEditing] = useState<LocalPrint | null>(null);
  const [reprinting, setReprinting] = useState(false);

  // ── 서버 로그 상태 ──
  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로컬 기록 변경 구독 — 촬영/인쇄 직후 즉시 반영
  const refreshLocal = useCallback(() => {
    setLocalLogs(history.getAll());
  }, []);

  useEffect(() => {
    refreshLocal();
    const unsub = history.subscribe(refreshLocal);
    return unsub;
  }, [refreshLocal]);

  useFocusEffect(
    useCallback(() => {
      refreshLocal();
    }, [refreshLocal])
  );

  // ── 서버 로그 로딩 ──
  const fetchLogs = async (pageNum: number, append = false) => {
    try {
      setError(null);
      const data = await printApi.getLogs(pageNum, 20);
      setLogs((prev) => (append ? [...prev, ...data.logs] : data.logs));
      setPage(data.page);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || '로그를 불러올 수 없습니다.');
    }
  };

  const loadServer = async () => {
    setLoading(true);
    await fetchLogs(1);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (tab === 'server') await fetchLogs(1);
    else refreshLocal();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (tab !== 'server' || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchLogs(page + 1, true);
    setLoadingMore(false);
  };

  // 서버 탭을 처음 열 때만 로드
  useEffect(() => {
    if (tab === 'server' && logs.length === 0 && !error) loadServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── 로컬 CRUD 액션 ──
  const handleLocalPress = (item: LocalPrint) => {
    navigation.navigate('HistoryDetail', { id: item.id });
  };

  const handleDelete = (item: LocalPrint) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('기록 삭제', '이 인쇄 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          history.remove(item.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleReprint = async (item: LocalPrint) => {
    if (reprinting) return;
    setReprinting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const result = await printApi.printImage(item.imageUri, item.memo || undefined);
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

  const handleLongPress = (item: LocalPrint) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(item.memo || '인쇄 기록', '원하는 작업을 선택하세요.', [
      { text: '재인쇄', onPress: () => handleReprint(item) },
      { text: '메모 수정', onPress: () => setEditing(item) },
      { text: '삭제', style: 'destructive', onPress: () => handleDelete(item) },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleSaveMemo = (memo: string) => {
    if (editing) {
      history.update(editing.id, { memo });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditing(null);
  };

  const handleClearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('전체 삭제', `${localLogs.length}건의 기록을 모두 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '전체 삭제',
        style: 'destructive',
        onPress: () => {
          history.clear();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  // ── 렌더 ──
  const renderSegment = () => (
    <View style={styles.segment}>
      {(['local', 'server'] as Tab[]).map((t) => {
        const active = tab === t;
        return (
          <Pressable
            key={t}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setTab(t);
            }}
          >
            <MaterialCommunityIcons
              name={t === 'local' ? 'image-multiple' : 'cloud-outline'}
              size={16}
              color={active ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[
                typography.buttonSmall,
                { color: active ? colors.primary : colors.textTertiary, marginLeft: 6 },
              ]}
            >
              {t === 'local' ? `내 인쇄${localLogs.length ? ` ${localLogs.length}` : ''}` : '서버 기록'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderLocal = () => (
    <FlatList
      data={localLogs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <HistoryCard
          item={item}
          onPress={handleLocalPress}
          onLongPress={handleLongPress}
          onReprint={handleReprint}
          onDelete={handleDelete}
        />
      )}
      ListHeaderComponent={renderSegment}
      ListEmptyComponent={
        <EmptyState
          icon="camera-plus-outline"
          title="아직 인쇄한 사진이 없어요"
          subtitle="촬영 탭에서 사진을 찍어 인쇄하면 여기에 썸네일과 함께 기록됩니다."
        />
      }
      contentContainerStyle={
        localLogs.length === 0 ? styles.emptyContent : { paddingBottom: spacing.xxxl }
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    />
  );

  const renderServer = () => {
    if (loading) {
      return (
        <>
          {renderSegment()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </>
      );
    }
    if (error) {
      return (
        <>
          {renderSegment()}
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="wifi-off" size={48} color={colors.error} />
            <Text style={[typography.subtitle, { color: colors.error, marginTop: spacing.md }]}>
              연결 오류
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
              ]}
            >
              {error}
            </Text>
            <Pressable style={styles.retryButton} onPress={loadServer}>
              <Text style={[typography.buttonSmall, { color: colors.primary }]}>다시 시도</Text>
            </Pressable>
          </View>
        </>
      );
    }
    return (
      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <LogCard log={item} onPress={(l) => navigation.navigate('LogDetail', { log: l })} />
        )}
        ListHeaderComponent={
          <>
            {renderSegment()}
            {logs.length > 0 ? (
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Text style={[typography.h2, { color: colors.primary }]}>{total}</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>전체</Text>
                </View>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="printer-off"
            title="서버 인쇄 기록이 없습니다"
            subtitle="서버에 기록된 인쇄 작업이 여기에 표시됩니다."
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={
          logs.length === 0 ? styles.emptyContent : { paddingBottom: spacing.xxxl }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />
    );
  };

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={reprinting} variant="printing" message="재인쇄 중..." />
      <EditMemoModal
        visible={!!editing}
        initialValue={editing?.memo || ''}
        onClose={() => setEditing(null)}
        onSave={handleSaveMemo}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <PrinterIcon size={26} color={colors.primary} />
        <Text style={[typography.h2, { color: colors.text, marginLeft: spacing.md, flex: 1 }]}>
          인쇄 기록
        </Text>
        {tab === 'local' && localLogs.length > 0 ? (
          <Pressable style={styles.headerBtn} onPress={handleClearAll} hitSlop={8}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
          </Pressable>
        ) : tab === 'server' ? (
          <Pressable style={styles.headerBtn} onPress={handleRefresh} hitSlop={8}>
            <MaterialCommunityIcons name="refresh" size={22} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {tab === 'local' ? renderLocal() : renderServer()}
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
  },
  segmentItemActive: {
    backgroundColor: colors.primaryGhost,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  emptyContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMore: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
