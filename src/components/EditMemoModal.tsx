import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, spacing, radius } from '../theme/typography';

interface EditMemoModalProps {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (memo: string) => void;
}

export function EditMemoModal({
  visible,
  initialValue,
  onClose,
  onSave,
}: EditMemoModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <MaterialCommunityIcons
                name="note-edit-outline"
                size={22}
                color={colors.primary}
              />
              <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.sm }]}>
                메모 수정
              </Text>
            </View>

            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder="메모를 입력하세요..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={200}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'right' }]}>
              {value.length}/200
            </Text>

            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                <Text style={[typography.button, { color: colors.textSecondary }]}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.saveBtn]}
                onPress={() => onSave(value)}
              >
                <Text style={[typography.button, { color: colors.textInverse }]}>저장</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  kav: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'android' ? spacing.xl : spacing.xxl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 96,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
});
