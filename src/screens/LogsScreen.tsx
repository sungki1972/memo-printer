import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';
import { PrinterIcon } from '../components/PrinterIcon';
import { LogCard } from '../components/LogCard';
import { EmptyState } from '../components/EmptyState';
import { printApi } from '../services/api';
import { PrintLog } from '../types';

interface LogsScreenProps {
  navigation: any;
}

export function LogsScreen({ navigation }: LogsScreenProps) {
  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (pageNum: number, append: boolean = false) => {
    try {
      setError(null);
      const data = await printApi.getLogs(pageNum, 20);

      if (append) {
        setLogs(prev => [...prev, ...data.logs]);
      } else {
        setLogs(data.logs);
      }
      setPage(data.page);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || '로그를 불러올 수 없습니다.');
    }
  };

  const initialLoad = async () => {
    setLoading(true);
    await fetchLogs(1);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs(1);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchLogs(page + 1, true);
    setLoadingMore(false);
  };

  useFocusEffect(
    useCallback(() => {
      initialLoad();
    }, [])
  );

  const handleLogPress = (log: PrintLog) => {
    navigation.navigate('LogDetail', { log });
  };

  const renderHeader = () => (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={[typography.h2, { color: colors.primary }]}>{total}</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>전체</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <PrinterIcon size={28} color={colors.primary} />
          <Text style={[typography.h2, { color: colors.text, marginLeft: spacing.md }]}>인쇄 로그</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <PrinterIcon size={28} color={colors.primary} />
        <Text style={[typography.h2, { color: colors.text, marginLeft: spacing.md, flex: 1 }]}>
          인쇄 로그
        </Text>
        <Pressable style={styles.refreshButton} onPress={handleRefresh}>
          <MaterialCommunityIcons name="refresh" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="wifi-off" size={48} color={colors.error} />
          <Text style={[typography.subtitle, { color: colors.error, marginTop: spacing.md }]}>
            연결 오류
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {error}
          </Text>
          <Pressable style={styles.retryButton} onPress={initialLoad}>
            <Text style={[typography.buttonSmall, { color: colors.primary }]}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <LogCard log={item} onPress={handleLogPress} />}
          ListHeaderComponent={logs.length > 0 ? renderHeader : null}
          ListEmptyComponent={
            <EmptyState
              icon="printer-off"
              title="인쇄 기록이 없습니다"
              subtitle="사진을 촬영하고 인쇄하면 여기에 기록됩니다."
            />
          }
          ListFooterComponent={renderFooter}
          contentContainerStyle={logs.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xxl }}
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
      )}
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
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
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
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
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
