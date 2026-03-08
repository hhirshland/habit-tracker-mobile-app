import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme, ThemeColors } from '@/lib/theme';
import { useThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { HEALTH_METRIC_DISPLAY_NAMES } from '@/lib/health';
import { supabase } from '@/lib/supabase';
import { useNotificationsSetting } from '@/hooks/useNotificationsSetting';
import { useSubscription } from '@/hooks/useSubscription';
import {
  fetchOfferings,
  getOfferingPackage,
  purchasePackage,
  hasProEntitlement,
} from '@/lib/revenueCat';
import { EVENTS, captureEvent } from '@/lib/analytics';
import type { ThemePreference } from '@/lib/userSettings';
import {
  updateEveningCallPreferences,
  triggerEveningCall,
  formatCallTime,
  formatTimezoneShort,
  normalizePhoneNumber,
  formatPhoneDisplay,
  CALL_TIME_OPTIONS,
} from '@/lib/eveningCalls';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, profile, signOut, deleteAccount, refreshProfile } = useAuth();
  const { isAvailable: healthAvailable, isAuthorized: healthAuthorized, authFailed, missingMetrics, connect, requestMorePermissions } = useHealth();
  const { settings, setThemePreference, updateSettings } = useUserSettings();
  const { enabled: notificationsEnabled, toggle: toggleNotifications } = useNotificationsSetting();
  const {
    isActive: subActive,
    isTrialing: subTrialing,
    expirationDate: subExpiration,
    productId: subProductId,
    hasDiscountAccess,
    refetch: refetchSubscription,
  } = useSubscription();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [updatingAppearance, setUpdatingAppearance] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const top3TodosEnabled = settings.top3_todos_enabled;
  const journalEnabled = settings.journal_enabled;
  const preference = settings.theme_preference;

  // Evening Check-In state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [eveningCallEnabled, setEveningCallEnabled] = useState(false);
  const [eveningCallTime, setEveningCallTime] = useState('20:00:00');
  const [callTimezone, setCallTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingCall, setSavingCall] = useState(false);
  const [callingNow, setCallingNow] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const profileHasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      fullName.trim() !== (profile.full_name || '') ||
      avatarUrl !== profile.avatar_url
    );
  }, [fullName, avatarUrl, profile]);

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
    if (value && !phoneNumber.trim()) {
      Alert.alert(
        'Phone Number Required',
        'Please enter your phone number before enabling evening calls.',
      );
      return;
    }
    setEveningCallEnabled(value);
  }, [phoneNumber]);

  const handleConnectHealth = async () => {
    setConnecting(true);
    try {
      await connect();
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Fetch the file as a blob and upload
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType || `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setAvatarUrl(urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. You can save your profile and try again later.');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    try {
      captureEvent(EVENTS.ACCOUNT_DELETED);
      await deleteAccount();
    } catch (err) {
      console.error('Error deleting account:', err);
      Alert.alert('Error', 'Failed to delete your account. Please try again.');
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  }, [deleteConfirmText, deleteAccount]);

  const handleAppearanceChange = async (nextPreference: ThemePreference) => {
    if (nextPreference === preference || updatingAppearance) return;
    setUpdatingAppearance(true);
    try {
      await setThemePreference(nextPreference);
      captureEvent(EVENTS.PROFILE_UPDATED);
    } catch (error) {
      console.error('Error updating appearance:', error);
      Alert.alert('Error', 'Failed to update appearance setting.');
    } finally {
      setUpdatingAppearance(false);
    }
  };

  const handleToggleTop3Todos = async () => {
    const nextEnabled = !top3TodosEnabled;
    await updateSettings({ top3_todos_enabled: nextEnabled });
    captureEvent(EVENTS.TOP3_TODOS_TOGGLED, { enabled: nextEnabled });
  };

  const handleToggleJournal = async () => {
    const nextEnabled = !journalEnabled;
    await updateSettings({ journal_enabled: nextEnabled });
    captureEvent(EVENTS.JOURNAL_TOGGLED, { enabled: nextEnabled });
  };

  const isMonthly = subActive && !hasDiscountAccess &&
    subProductId?.includes('month') &&
    !(subProductId?.includes('annual') || subProductId?.includes('year'));

  const handleUpgradeToYearly = async () => {
    setUpgrading(true);
    try {
      const offering = await fetchOfferings();
      const yearlyPkg = getOfferingPackage(offering, 'yearly');
      if (!yearlyPkg) {
        Alert.alert('Unavailable', 'Yearly plan is not available right now. Please try again later.');
        return;
      }
      const customerInfo = await purchasePackage(yearlyPkg);
      if (hasProEntitlement(customerInfo)) {
        captureEvent(EVENTS.SUBSCRIPTION_STARTED, {
          plan_type: 'yearly',
          is_trial: false,
          upgrade_from: 'monthly',
        });
        await refetchSubscription();
        Alert.alert('Upgraded!', 'You\'ve been upgraded to the yearly plan.');
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'userCancelled' in err && err.userCancelled) return;
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Upgrade Failed', message);
    } finally {
      setUpgrading(false);
    }
  };

  const getInitials = () => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials()}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome name="camera" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={styles.readOnlyText}>{user?.email}</Text>
            </View>
          </View>

          {profileHasChanges && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Features */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionLabel}>Features</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
                <FontAwesome name="list-ol" size={18} color={colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Top 3 Todos</Text>
                <Text style={styles.healthStatus}>
                  Set your top 3 priorities each day
                </Text>
              </View>
            </View>
            <Switch
              style={styles.healthCardSwitch}
              value={top3TodosEnabled}
              onValueChange={handleToggleTop3Todos}
              trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
              thumbColor="#f4f3f4"
            />
          </View>
          <View style={[styles.healthCard, { marginTop: theme.spacing.sm }]}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
                <FontAwesome name="book" size={18} color={colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Daily Journal</Text>
                <Text style={styles.healthStatus}>
                  Reflect on wins, tensions & gratitude
                </Text>
              </View>
            </View>
            <Switch
              style={styles.healthCardSwitch}
              value={journalEnabled}
              onValueChange={handleToggleJournal}
              trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
              thumbColor="#f4f3f4"
            />
          </View>
          <View style={[styles.healthCard, { marginTop: theme.spacing.sm }]}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
                <FontAwesome name="bell" size={18} color={colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Daily Reminders</Text>
                <Text style={styles.healthStatus}>
                  8am Top 3 todos and 8pm habits check-in
                </Text>
              </View>
            </View>
            <Switch
              style={styles.healthCardSwitch}
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.borderLight, true: colors.primaryLight }}
              thumbColor="#f4f3f4"
            />
          </View>
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
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.appearanceSection}>
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.appearanceCard}>
            {([
              { key: 'system', label: 'System' },
              { key: 'light', label: 'Light' },
              { key: 'dark', label: 'Dark' },
            ] as const).map((option) => {
              const isSelected = preference === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.appearanceOption,
                    isSelected && styles.appearanceOptionSelected,
                    updatingAppearance && styles.buttonDisabled,
                  ]}
                  onPress={() => handleAppearanceChange(option.key)}
                  disabled={updatingAppearance}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.appearanceOptionText,
                      isSelected && styles.appearanceOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Apple Health Connection */}
        {healthAvailable && (
          <View style={styles.healthSection}>
            <Text style={styles.sectionLabel}>Integrations</Text>
            <View style={styles.healthCard}>
              <View style={styles.healthCardLeft}>
                <View style={[
                  styles.healthIconContainer,
                  { backgroundColor: healthAuthorized ? colors.successLight : colors.borderLight },
                ]}>
                  <FontAwesome
                    name="heartbeat"
                    size={18}
                    color={healthAuthorized ? colors.success : colors.textMuted}
                  />
                </View>
                <View style={styles.healthInfo}>
                  <Text style={styles.healthTitle}>Apple Health</Text>
                  <Text style={styles.healthStatus}>
                    {healthAuthorized ? 'Connected' : 'Not connected'}
                  </Text>
                </View>
              </View>
              {healthAuthorized ? (
                <View style={styles.connectedBadge}>
                  <FontAwesome name="check-circle" size={16} color={colors.success} />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.connectButton, connecting && { opacity: 0.6 }]}
                  onPress={handleConnectHealth}
                  activeOpacity={0.8}
                  disabled={connecting}
                >
                  {connecting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.connectButtonText}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            {authFailed && !healthAuthorized && (
              <View style={styles.authFailedBox}>
                <Text style={styles.authFailedText}>
                  Unable to access Health data. Please open{' '}
                  <Text style={{ fontWeight: '700' }}>Settings → Health → Thrive</Text> and enable
                  the data types you'd like to share, then tap Connect again.
                </Text>
              </View>
            )}
            {healthAuthorized && missingMetrics.length > 0 && (
              <View style={styles.missingPermissionsCard}>
                <View style={styles.missingPermissionsHeader}>
                  <FontAwesome name="exclamation-circle" size={14} color="#E65100" />
                  <Text style={styles.missingPermissionsTitle}>
                    {missingMetrics.length} metric{missingMetrics.length > 1 ? 's' : ''} unavailable
                  </Text>
                </View>
                <Text style={styles.missingPermissionsBody}>
                  {missingMetrics.map((k) => HEALTH_METRIC_DISPLAY_NAMES[k] ?? k).join(', ')}
                </Text>
                <TouchableOpacity
                  style={[styles.grantAccessButton, connecting && { opacity: 0.6 }]}
                  activeOpacity={0.8}
                  disabled={connecting}
                  onPress={async () => {
                    setConnecting(true);
                    try {
                      await requestMorePermissions();
                    } finally {
                      setConnecting(false);
                    }
                  }}
                >
                  {connecting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.grantAccessButtonText}>Grant Access</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Time Picker Modal */}
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

        <View style={styles.divider} />

        {/* Subscription */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionLabel}>Subscription</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, {
                backgroundColor: subActive ? colors.successLight : colors.warningBackground,
              }]}>
                <FontAwesome
                  name="diamond"
                  size={18}
                  color={subActive ? colors.success : colors.warning}
                />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>
                  {hasDiscountAccess
                    ? 'Free Access'
                    : subProductId?.includes('annual') || subProductId?.includes('year')
                      ? 'Thrive Pro — Yearly'
                      : subProductId?.includes('month')
                        ? 'Thrive Pro — Monthly'
                        : subActive
                          ? 'Thrive Pro'
                          : 'No Active Plan'}
                </Text>
                <Text style={styles.healthStatus}>
                  {subTrialing
                    ? `Trial${subExpiration ? ` · Ends ${new Date(subExpiration).toLocaleDateString()}` : ''}`
                    : subActive
                      ? subExpiration
                        ? `Active · Renews ${new Date(subExpiration).toLocaleDateString()}`
                        : 'Active'
                      : 'Inactive'}
                </Text>
              </View>
            </View>
            {subActive ? (
              <View style={styles.connectedBadge}>
                <FontAwesome name="check-circle" size={16} color={colors.success} />
              </View>
            ) : null}
          </View>
          {isMonthly && (
            <TouchableOpacity
              style={[styles.upgradeButton, upgrading && styles.buttonDisabled]}
              onPress={handleUpgradeToYearly}
              disabled={upgrading}
              activeOpacity={0.8}
            >
              {upgrading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.upgradeButtonText}>Upgrade to Yearly — Save 36%</Text>
              )}
            </TouchableOpacity>
          )}
          {subActive && !hasDiscountAccess && (
            <TouchableOpacity
              style={[styles.manageSubButton, { marginTop: isMonthly ? 0 : theme.spacing.sm }]}
              onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
              activeOpacity={0.8}
            >
              <Text style={styles.manageSubText}>Manage Subscription</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <FontAwesome name="sign-out" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setShowDeleteModal(true)}
          activeOpacity={0.8}
        >
          <FontAwesome name="trash" size={16} color={colors.textMuted} />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

        {/* Delete Account Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!deleting) {
              setShowDeleteModal(false);
              setDeleteConfirmText('');
            }
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              if (!deleting) {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }
            }}
          >
            <View
              style={styles.deleteModalContent}
              onStartShouldSetResponder={() => true}
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
                onPress={handleDeleteAccount}
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
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: colors.textPrimary,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.borderLight,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: '#fff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  form: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
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
  readOnlyInput: {
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: theme.fontSize.md,
    color: colors.textSecondary,
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.xl,
  },
  scrollContent: {
    paddingBottom: theme.spacing.tabBarClearance,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: theme.borderRadius.md,
  },
  signOutText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: colors.danger,
  },
  // Apple Health section
  healthSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
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
  connectedBadge: {
    paddingHorizontal: theme.spacing.sm,
  },
  connectButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  authFailedBox: {
    backgroundColor: colors.warningBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  authFailedText: {
    fontSize: theme.fontSize.sm,
    color: colors.warningText,
    lineHeight: 20,
  },
  missingPermissionsCard: {
    backgroundColor: colors.warningBackground,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  missingPermissionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  missingPermissionsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: colors.warningText,
  },
  missingPermissionsBody: {
    fontSize: theme.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  grantAccessButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  grantAccessButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  appearanceSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  appearanceCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  appearanceOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  appearanceOptionSelected: {
    backgroundColor: colors.primaryLightOverlay30,
  },
  appearanceOptionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: colors.textSecondary,
  },
  appearanceOptionTextSelected: {
    color: colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadow.md,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  manageSubButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  manageSubText: {
    fontSize: theme.fontSize.sm,
    color: colors.textMuted,
  },
  // Evening Check-In
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
  // Time Picker Modal
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
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  deleteAccountText: {
    fontSize: theme.fontSize.sm,
    color: colors.textMuted,
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '88%',
    maxWidth: 400,
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
