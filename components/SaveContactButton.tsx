import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { hasSavedThriveContact, saveThriveContact } from '@/lib/saveContact';

interface Props {
  compact?: boolean;
}

export default function SaveContactButton({ compact }: Props) {
  const colors = useThemeColors();
  const [hidden, setHidden] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hasSavedThriveContact().then((saved) => setHidden(saved));
  }, []);

  if (hidden) return null;

  const handlePress = async () => {
    setSaving(true);
    try {
      const success = await saveThriveContact();
      if (success) {
        setHidden(true);
        Alert.alert('Saved!', 'The Thrive phone number has been added to your contacts.');
      } else {
        Alert.alert(
          'Permission Required',
          'Please allow access to your contacts so we can save the Thrive number.',
        );
      }
    } catch (err) {
      console.error('Save contact error:', err);
      Alert.alert('Error', 'Unable to save contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const styles = compact ? compactStyles(colors) : fullStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.button, saving && { opacity: 0.7 }]}
      onPress={handlePress}
      disabled={saving}
      activeOpacity={0.8}
    >
      {saving ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <>
          <FontAwesome name="address-book" size={compact ? 14 : 16} color={colors.primary} />
          <Text style={styles.text}>Save Thrive to Contacts</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const fullStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: 14,
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      borderStyle: 'dashed',
    },
    text: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: colors.primary,
    },
  });

const compactStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: 10,
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: theme.borderRadius.md,
      borderStyle: 'dashed',
    },
    text: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: colors.primary,
    },
  });
