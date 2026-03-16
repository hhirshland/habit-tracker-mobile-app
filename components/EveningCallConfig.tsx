import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { EVENTS, captureEvent } from '@/lib/analytics';
import type { Profile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import {
  updateEveningCallPreferences,
  triggerEveningCall,
  formatCallTime,
  formatTimezoneShort,
  normalizePhoneNumber,
  formatPhoneDisplay,
  CALL_TIME_OPTIONS,
} from '@/lib/eveningCalls';
import SaveContactButton from '@/components/SaveContactButton';

interface EveningCallConfigProps {
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
}

export default function EveningCallConfig({ user, profile, refreshProfile }: EveningCallConfigProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [eveningCallEnabled, setEveningCallEnabled] = useState(false);
  const [eveningCallTime, setEveningCallTime] = useState('20:00:00');
  const [callTimezone, setCallTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingCall, setSavingCall] = useState(false);
  const [callingNow, setCallingNow] = useState(false);

  const callHasChanges = useMemo(() => {
    if (!profile) return false;
    const normalizedInput = phoneNumber.trim()
      ? normalizePhoneNumber(phoneNumber.trim())
      : null;
    const savedPhone = profile.phone_number || null;
    return (
      normalizedInput !== savedPhone ||
      eveningCallEnabled !== (profile.evening_call_enabled ?? false) ||
      eveningCallTime !== (profile.evening_call_time ?? '20:00:00') ||
      callTimezone !== (profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
    );
  }, [phoneNumber, eveningCallEnabled, eveningCallTime, callTimezone, profile]);

  useEffect(() => {
    if (profile) {
      setPhoneNumber(
        profile.phone_number ? formatPhoneDisplay(profile.phone_number) : '',
      );
      setEveningCallEnabled(profile.evening_call_enabled ?? false);
      setEveningCallTime(profile.evening_call_time ?? '20:00:00');
      setCallTimezone(
        profile.timezone ??
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    }
  }, [profile]);

  const handleSaveCallPreferences = useCallback(async () => {
    if (!user) return;
    const normalized = phoneNumber.trim()
      ? normalizePhoneNumber(phoneNumber.trim())
      : null;

    if (eveningCallEnabled && !phoneNumber.trim()) {
      Alert.alert(
        'Phone Number Required',
        'Please enter your phone number to enable evening calls.',
      );
      return;
    }

    if (phoneNumber.trim() && !normalized) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid US phone number (e.g. 555-123-4567).',
      );
      return;
    }

    setSavingCall(true);
    try {
      await updateEveningCallPreferences(user.id, {
        phone_number: normalized,
        evening_call_enabled: eveningCallEnabled,
        evening_call_time: eveningCallTime,
        timezone: callTimezone,
      });
      await refreshProfile();

      if (eveningCallEnabled && !profile?.evening_call_enabled) {
        captureEvent(EVENTS.EVENING_CALL_ENABLED, {
          call_time: eveningCallTime,
          timezone: callTimezone,
        });
      } else if (!eveningCallEnabled && profile?.evening_call_enabled) {
        captureEvent(EVENTS.EVENING_CALL_DISABLED);
      }

      Alert.alert('Saved', 'Evening check-in preferences updated.');
    } catch (err) {
      console.error('Error saving call preferences:', err);
      Alert.alert('Error', 'Failed to save preferences.');
    } finally {
      setSavingCall(false);
    }
  }, [user, phoneNumber, eveningCallEnabled, eveningCallTime, callTimezone, refreshProfile, profile]);

  const handleCallMeNow = useCallback(async () => {
    if (!user) return;
    if (!profile?.phone_number) {
      Alert.alert(
        'Phone Number Required',
        'Please save a phone number first.',
      );
      return;
    }
    setCallingNow(true);
    captureEvent(EVENTS.EVENING_CALL_TRIGGERED);
    try {
      const result = await triggerEveningCall(user.id);
      if (result.success) {
        Alert.alert('Calling!', 'You should receive a call in a moment.');
      } else {
        Alert.alert('Error', result.error || 'Failed to initiate call.');
      }
    } catch (err) {
      console.error('Error triggering call:', err);
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setCallingNow(false);
    }
  }, [user, profile?.phone_number]);

  const handleToggleEveningCall = useCallback((value: boolean) => {
    setEveningCallEnabled(value);
  }, []);

  return (
    <>
      <View style={[styles.healthCard, styles.eveningCallCard, { marginTop: theme.spacing.sm }]}>
        <View style={styles.eveningCallHeader}>
          <View style={styles.healthCardLeft}>
            <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
              <FontAwesome name="phone" size={18} color={colors.primary} />
            </View>
            <View style={styles.healthInfo}>
              <Text style={styles.healthTitle}>Evening Check-In Call</Text>
              <Text style={styles.healthStatus}>
                Keep yourself accountable with a call from Thrive
              </Text>
            </View>
          </View>
          <Switch
            style={styles.healthCardSwitch}
            value={eveningCallEnabled}
            onValueChange={handleToggleEveningCall}
            trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
            thumbColor="#f4f3f4"
          />
        </View>
        {(eveningCallEnabled || profile?.evening_call_enabled) && (
          <View style={styles.eveningCallConfig}>
            <View style={styles.eveningCallConfigDivider} />
            <Text style={styles.eveningCallDescription}>
              Automatically updates your journal, habits, and todos in the app for you.
            </Text>
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>
            <View style={[styles.field, { marginTop: theme.spacing.md }]}>
              <Text style={styles.label}>Call Time</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerTrigger]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerTriggerText}>
                  {formatCallTime(eveningCallTime)}
                </Text>
                <Text style={styles.pickerTimezone}>
                  {formatTimezoneShort(callTimezone)}
                </Text>
              </TouchableOpacity>
            </View>
            {callHasChanges && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { marginTop: theme.spacing.md },
                  savingCall && styles.buttonDisabled,
                ]}
                onPress={handleSaveCallPreferences}
                disabled={savingCall}
                activeOpacity={0.8}
              >
                {savingCall ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Preferences</Text>
                )}
              </TouchableOpacity>
            )}
            {profile?.phone_number && (
              <TouchableOpacity
                style={[
                  styles.callNowButton,
                  callingNow && styles.buttonDisabled,
                ]}
                onPress={handleCallMeNow}
                disabled={callingNow}
                activeOpacity={0.8}
              >
                {callingNow ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <FontAwesome name="phone" size={16} color={colors.primary} />
                    <Text style={styles.callNowText}>Call Me Now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <SaveContactButton />
          </View>
        )}
      </View>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Call Time</Text>
            <FlatList
              data={CALL_TIME_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.timeOption,
                    item === eveningCallTime && styles.timeOptionSelected,
                  ]}
                  onPress={() => {
                    setEveningCallTime(item);
                    setShowTimePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      item === eveningCallTime &&
                        styles.timeOptionTextSelected,
                    ]}
                  >
                    {formatCallTime(item)}
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowTimePicker(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  healthCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  healthIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthInfo: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  healthTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.textPrimary,
  },
  healthStatus: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  healthCardSwitch: {
    marginLeft: theme.spacing.md,
  },
  eveningCallCard: {
    flexDirection: 'column',
    alignItems: undefined,
  },
  eveningCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eveningCallConfig: {
    paddingTop: 0,
  },
  eveningCallConfigDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: theme.spacing.md,
    marginHorizontal: -theme.spacing.md,
  },
  eveningCallDescription: {
    fontSize: theme.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.textPrimary,
    marginLeft: theme.spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: theme.fontSize.md,
    color: colors.textPrimary,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTriggerText: {
    fontSize: theme.fontSize.md,
    color: colors.textPrimary,
  },
  pickerTimezone: {
    fontSize: theme.fontSize.sm,
    color: colors.textMuted,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadow.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  callNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 14,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  callNowText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  timeOption: {
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  timeOptionSelected: {
    backgroundColor: colors.primaryLightOverlay30,
  },
  timeOptionText: {
    fontSize: theme.fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    color: colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  modalCancel: {
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: theme.fontSize.md,
    color: colors.textMuted,
    fontWeight: theme.fontWeight.medium,
  },
});
