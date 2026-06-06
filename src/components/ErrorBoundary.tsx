import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

/**
 * 앱 전역 에러 경계.
 *
 * 릴리스 빌드에서는 JS 렌더 에러가 그대로 하드 크래시("앱이 다운")로 보이고
 * logcat 없이는 원인을 알 수 없다. 이 경계는 그 에러를 잡아 화면에 메시지·스택을
 * 그대로 표시해, 기기를 PC에 연결하지 않고도 원인을 읽어낼 수 있게 한다.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ info: info?.componentStack ?? null });
    // 콘솔에도 남겨 adb logcat으로도 확인 가능
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>⚠️ 화면 오류가 발생했습니다</Text>
        <Text style={styles.label}>메시지</Text>
        <Text selectable style={styles.message}>
          {error.name}: {error.message}
        </Text>
        {!!error.stack && (
          <>
            <Text style={styles.label}>스택</Text>
            <Text selectable style={styles.stack}>
              {error.stack}
            </Text>
          </>
        )}
        {!!info && (
          <>
            <Text style={styles.label}>컴포넌트 트리</Text>
            <Text selectable style={styles.stack}>
              {info}
            </Text>
          </>
        )}
        <Pressable style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>다시 시도</Text>
        </Pressable>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { padding: 24, paddingTop: 64 },
  title: { color: '#ff6b6b', fontSize: 18, fontWeight: '700', marginBottom: 20 },
  label: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  message: { color: '#ffd93d', fontSize: 14, fontFamily: 'monospace' },
  stack: { color: '#ccc', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  button: {
    marginTop: 28,
    backgroundColor: '#4dabf7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
