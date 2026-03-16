import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
import { getLinkedIdentities, isAppleAuthAvailable } from '@/lib/socialAuth';
import { useIdentityStatements } from '@/hooks/useIdentityQuery';
import { useHabits } from '@/hooks/useHabitsQuery';
import type { ThemePreference } from '@/lib/userSettings';
import ProfileDeleteModal from '@/components/ProfileDeleteModal';
import EveningCallConfig from '@/components/EveningCallConfig';
import { hapticSuccess, hapticSelection, hapticWarning, hapticError } from '@/lib/haptics';
import { captureError } from '@/lib/sentry';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, profile, signOut, deleteAccount, refreshProfile, linkAppleIdentity, linkGoogleIdentity } = useAuth();
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
  const { data: identityStatements = [], isLoading: identityLoading } = useIdentityStatements();
  const { data: habits = [], isLoading: habitsLoading } = useHabits();
  const top3TodosEnabled = settings.top3_todos_enabled;
  const journalEnabled = settings.journal_enabled;
  const preference = settings.theme_preference;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  const fetchLinkedProviders = useCallback(async () => {
    try {
      const identities = await getLinkedIdentities();
      setLinkedProviders(identities.map((i) => i.provider));
    } catch {
      // fail silently
    }
  }, []);

  useEffect(() => {
    if (user) fetchLinkedProviders();
  }, [user, fetchLinkedProviders]);

  const handleLinkProvider = useCallback(async (provider: 'apple' | 'google') => {
    setLinkingProvider(provider);
    try {
      const fn = provider === 'apple' ? linkAppleIdentity : linkGoogleIdentity;
      const { error } = await fn();
      if (error) {
        Alert.alert('Linking Failed', error.message);
      } else {
        await fetchLinkedProviders();
        const name = provider === 'apple' ? 'Apple' : 'Google';
        Alert.alert('Connected', `Your ${name} account has been linked successfully.`);
      }
    } catch (err: any) {
      Alert.alert('Linking Failed', err.message ?? 'Something went wrong.');
    } finally {
      setLinkingProvider(null);
    }
  }, [linkAppleIdentity, linkGoogleIdentity, fetchLinkedProviders]);

  const profileHasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      fullName.trim() !== (profile.full_name || '') ||
      avatarUrl !== profile.avatar_url
    );
  }, [fullName, avatarUrl, profile]);

  const handleConnectHealth = async () => {
    setConnecting(true);
    try {
      await connect();
      hapticSuccess();
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
      captureError(error, { tag: 'profile.save' });
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
      captureError(error, { tag: 'profile.uploadImage' });
      Alert.alert('Error', 'Failed to upload image. You can save your profile and try again later.');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    hapticWarning();
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const handleAppearanceChange = async (nextPreference: ThemePreference) => {
    if (nextPreference === preference || updatingAppearance) return;
    hapticSelection();
    setUpdatingAppearance(true);
    try {
      await setThemePreference(nextPreference);
      captureEvent(EVENTS.PROFILE_UPDATED);
    } catch (error) {
      console.error('Error updating appearance:', error);
      captureError(error, { tag: 'profile.appearance' });
      Alert.alert('Error', 'Failed to update appearance setting.');
    } finally {
      setUpdatingAppearance(false);
    }
  };

  const handleToggleTop3Todos = async () => {
    hapticSelection();
    const nextEnabled = !top3TodosEnabled;
    await updateSettings({ top3_todos_enabled: nextEnabled });
    captureEvent(EVENTS.TOP3_TODOS_TOGGLED, { enabled: nextEnabled });
  };

  const handleToggleJournal = async () => {
    hapticSelection();
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
              <Image source={avatarUrl} style={styles.avatar} />
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

        {/* My Identity */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionLabel}>Identity</Text>
          <TouchableOpacity
            style={styles.healthCard}
            onPress={() => router.push('/identity-setup')}
            activeOpacity={0.7}
          >
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
                <FontAwesome name="star" size={18} color={colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>My Identity</Text>
                <Text style={styles.healthStatus}>
                  {identityLoading
                    ? 'Loading…'
                    : identityStatements.length > 0
                      ? `${identityStatements.length} active identit${identityStatements.length === 1 ? 'y' : 'ies'}`
                      : 'Set up your identity'}
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.healthCard}
            onPress={() => router.push('/manage-habits')}
            activeOpacity={0.7}
          >
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
                <FontAwesome name="list-ul" size={18} color={colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>My Habits</Text>
                <Text style={styles.healthStatus}>
                  {habitsLoading
                    ? 'Loading…'
                    : habits.length > 0
                      ? `${habits.length} active habit${habits.length === 1 ? '' : 's'}`
                      : 'Set up your habits'}
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
          </TouchableOpacity>
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
                <Text style={styles.healthTitle}>Daily Intentions</Text>
                <Text style={styles.healthStatus}>
                  Start each day with purpose
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
                  8am intentions and 8pm habits check-in
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
          <EveningCallConfig user={user} profile={profile} refreshProfile={refreshProfile} />
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
                  { backgroundColor: colors.primaryLightOverlay30 },
                ]}>
                  <FontAwesome
                    name="heartbeat"
                    size={18}
                    color={colors.primary}
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

        <View style={styles.divider} />

        {/* Subscription */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionLabel}>Subscription</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, {
                backgroundColor: colors.primaryLightOverlay30,
              }]}>
                <FontAwesome
                  name="diamond"
                  size={18}
                  color={colors.primary}
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

        {/* Connected Accounts */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionLabel}>Login Methods</Text>

          <View style={styles.healthCard}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
                <FontAwesome name="envelope" size={16} color={colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Email</Text>
                <Text style={styles.healthStatus}>{user?.email ?? 'Not set'}</Text>
              </View>
            </View>
            <View style={styles.connectedBadge}>
              <FontAwesome name="check-circle" size={16} color={colors.success} />
            </View>
          </View>

          {isAppleAuthAvailable() && (
            <View style={[styles.healthCard, { marginTop: theme.spacing.sm }]}>
              <View style={styles.healthCardLeft}>
                <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
                  <FontAwesome name="apple" size={18} color={colors.primary} />
                </View>
                <View style={styles.healthInfo}>
                  <Text style={styles.healthTitle}>Apple</Text>
                  <Text style={styles.healthStatus}>
                    {linkedProviders.includes('apple') ? 'Connected' : 'Not connected'}
                  </Text>
                </View>
              </View>
              {linkedProviders.includes('apple') ? (
                <View style={styles.connectedBadge}>
                  <FontAwesome name="check-circle" size={16} color={colors.success} />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.connectButton, linkingProvider === 'apple' && { opacity: 0.6 }]}
                  onPress={() => handleLinkProvider('apple')}
                  disabled={!!linkingProvider}
                  activeOpacity={0.8}
                >
                  {linkingProvider === 'apple' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.connectButtonText}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[styles.healthCard, { marginTop: theme.spacing.sm }]}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: colors.primaryLightOverlay30 }]}>
                <FontAwesome name="google" size={16} color={colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Google</Text>
                <Text style={styles.healthStatus}>
                  {linkedProviders.includes('google') ? 'Connected' : 'Not connected'}
                </Text>
              </View>
            </View>
            {linkedProviders.includes('google') ? (
              <View style={styles.connectedBadge}>
                <FontAwesome name="check-circle" size={16} color={colors.success} />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.connectButton, linkingProvider === 'google' && { opacity: 0.6 }]}
                onPress={() => handleLinkProvider('google')}
                disabled={!!linkingProvider}
                activeOpacity={0.8}
              >
                {linkingProvider === 'google' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.connectButtonText}>Connect</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
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
          onPress={() => {
            hapticError();
            setShowDeleteModal(true);
          }}
          activeOpacity={0.8}
        >
          <FontAwesome name="trash" size={16} color={colors.textMuted} />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>

        <ProfileDeleteModal
          visible={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onDelete={deleteAccount}
        />
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
    gap: theme.spacing.sm,
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
});
