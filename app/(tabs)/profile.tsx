import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { theme } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';
import { ThemePreference, useThemePreference } from '@/contexts/ThemeContext';
import { HEALTH_METRIC_DISPLAY_NAMES } from '@/lib/health';
import { supabase } from '@/lib/supabase';
import { useTop3TodosSetting } from '@/hooks/useTop3TodosSetting';
import { useJournalSetting } from '@/hooks/useJournalSetting';
import { EVENTS, captureEvent } from '@/lib/analytics';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isAvailable: healthAvailable, isAuthorized: healthAuthorized, authFailed, missingMetrics, connect, requestMorePermissions } = useHealth();
  const { preference, setPreference } = useThemePreference();
  const { enabled: top3TodosEnabled, toggle: toggleTop3Todos } = useTop3TodosSetting();
  const { enabled: journalEnabled, toggle: toggleJournal } = useJournalSetting();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [updatingAppearance, setUpdatingAppearance] = useState(false);

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

  const handleAppearanceChange = async (nextPreference: ThemePreference) => {
    if (nextPreference === preference || updatingAppearance) return;
    setUpdatingAppearance(true);
    try {
      await setPreference(nextPreference);
      captureEvent(EVENTS.PROFILE_UPDATED);
    } catch (error) {
      console.error('Error updating appearance:', error);
      Alert.alert('Error', 'Failed to update appearance setting.');
    } finally {
      setUpdatingAppearance(false);
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
              placeholderTextColor={theme.colors.textMuted}
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
        </View>

        <View style={styles.divider} />

        {/* Features */}
        <View style={styles.healthSection}>
          <Text style={styles.sectionLabel}>Features</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: theme.colors.primaryLightOverlay30 }]}>
                <FontAwesome name="list-ol" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Top 3 Todos</Text>
                <Text style={styles.healthStatus}>
                  Set your top 3 priorities each day
                </Text>
              </View>
            </View>
            <Switch
              value={top3TodosEnabled}
              onValueChange={toggleTop3Todos}
              trackColor={{ false: theme.colors.borderLight, true: theme.colors.primaryLight }}
              thumbColor={top3TodosEnabled ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
          <View style={[styles.healthCard, { marginTop: theme.spacing.sm }]}>
            <View style={styles.healthCardLeft}>
              <View style={[styles.healthIconContainer, { backgroundColor: theme.colors.primaryLightOverlay30 }]}>
                <FontAwesome name="book" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Daily Journal</Text>
                <Text style={styles.healthStatus}>
                  Reflect on wins, tensions & gratitude
                </Text>
              </View>
            </View>
            <Switch
              value={journalEnabled}
              onValueChange={toggleJournal}
              trackColor={{ false: theme.colors.borderLight, true: theme.colors.primaryLight }}
              thumbColor={journalEnabled ? theme.colors.primary : '#f4f3f4'}
            />
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
                  { backgroundColor: healthAuthorized ? theme.colors.successLight : theme.colors.borderLight },
                ]}>
                  <FontAwesome
                    name="heartbeat"
                    size={18}
                    color={healthAuthorized ? theme.colors.success : theme.colors.textMuted}
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
                  <FontAwesome name="check-circle" size={16} color={theme.colors.success} />
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

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <FontAwesome name="sign-out" size={18} color={theme.colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.borderLight,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primaryLight,
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
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
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
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  readOnlyInput: {
    backgroundColor: theme.colors.borderLight,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.border,
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
    borderColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
  },
  signOutText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.danger,
  },
  // Apple Health section
  healthSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    gap: 2,
  },
  healthTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  healthStatus: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  connectedBadge: {
    paddingHorizontal: theme.spacing.sm,
  },
  connectButton: {
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.warningBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  authFailedText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warningText,
    lineHeight: 20,
  },
  missingPermissionsCard: {
    backgroundColor: theme.colors.warningBackground,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
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
    color: theme.colors.warningText,
  },
  missingPermissionsBody: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  grantAccessButton: {
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.primaryLightOverlay30,
  },
  appearanceOptionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  appearanceOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
});
