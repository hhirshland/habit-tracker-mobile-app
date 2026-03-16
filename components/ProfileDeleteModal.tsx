import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { hapticError } from '@/lib/haptics';

interface ProfileDeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

export default function ProfileDeleteModal({ visible, onClose, onDelete }: ProfileDeleteModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    try {
      captureEvent(EVENTS.ACCOUNT_DELETED);
      await onDelete();
    } catch (err) {
      console.error('Error deleting account:', err);
      hapticError();
      Alert.alert('Error', 'Failed to delete your account. Please try again.');
      setDeleting(false);
      onClose();
      setDeleteConfirmText('');
    }
  }, [deleteConfirmText, onDelete, onClose]);

  const handleClose = useCallback(() => {
    if (!deleting) {
      onClose();
      setDeleteConfirmText('');
    }
  }, [deleting, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View
          style={styles.deleteModalContent}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.deleteWarningIcon}>
              <FontAwesome name="exclamation-triangle" size={32} color={colors.danger} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Your Account?</Text>
            <Text style={styles.deleteModalWarning}>
              This action is permanent and cannot be undone. All of your data will be
              immediately and irreversibly deleted, including:
            </Text>
            <View style={styles.deleteDataList}>
              <Text style={styles.deleteDataItem}>• All habits and completion history</Text>
              <Text style={styles.deleteDataItem}>• Goals and progress entries</Text>
              <Text style={styles.deleteDataItem}>• Journal entries and weekly recaps</Text>
              <Text style={styles.deleteDataItem}>• Todos, settings, and profile info</Text>
            </View>
            <Text style={styles.deleteModalWarning}>
              You will not be able to recover your data or sign back in with this account.
            </Text>
            <View style={[styles.field, { marginTop: theme.spacing.md }]}>
              <Text style={styles.deleteConfirmLabel}>
                Type <Text style={{ fontWeight: '800' }}>DELETE</Text> to confirm
              </Text>
              <TextInput
                style={styles.deleteConfirmInput}
                placeholder="DELETE"
                placeholderTextColor={colors.textMuted}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!deleting}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.deleteConfirmButton,
                deleteConfirmText.trim().toUpperCase() !== 'DELETE' && styles.deleteConfirmButtonDisabled,
                deleting && styles.buttonDisabled,
              ]}
              onPress={handleDelete}
              disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || deleting}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteConfirmButtonText}>Permanently Delete Account</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteCancelButton}
              onPress={handleClose}
              disabled={deleting}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '88%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  deleteWarningIcon: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  deleteModalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  deleteModalWarning: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  deleteDataList: {
    backgroundColor: colors.borderLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  deleteDataItem: {
    fontSize: theme.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  field: {
    gap: theme.spacing.xs,
  },
  deleteConfirmLabel: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  deleteConfirmInput: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: theme.fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: theme.fontWeight.bold,
  },
  deleteConfirmButton: {
    backgroundColor: colors.danger,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  deleteConfirmButtonDisabled: {
    opacity: 0.4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  deleteCancelButton: {
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.xs,
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: theme.fontSize.md,
    color: colors.textMuted,
    fontWeight: theme.fontWeight.medium,
  },
});
