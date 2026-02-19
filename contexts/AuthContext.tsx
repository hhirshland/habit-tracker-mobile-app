import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { EVENTS, captureEvent, identifyUser, resetUser, setUserProperties } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 10000;
const PROFILE_CACHE_KEY = '@cached_profile';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const loadingRef = useRef(loading);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const cacheProfile = async (nextProfile: Profile | null) => {
    try {
      if (nextProfile) {
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(nextProfile));
      } else {
        await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
      }
    } catch (error) {
      console.warn('Error persisting cached profile:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      // Keep previous profile on transient errors; only clear when profile truly doesn't exist.
      if (!error && data) {
        setProfile(data);
        cacheProfile(data).catch(() => {
          // no-op: cacheProfile already logs details
        });
        setUserProperties({
          name: data.full_name,
          has_onboarded: data.has_onboarded,
          created_at: data.created_at,
        });
      } else if (error?.code === 'PGRST116') {
        setProfile(null);
        cacheProfile(null).catch(() => {
          // no-op: cacheProfile already logs details
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessionAndProfile = async () => {
    try {
      const {
        data: { session: latestSession },
      } = await supabase.auth.getSession();

      setSession(latestSession);
      setUser(latestSession?.user ?? null);

      if (latestSession?.user) {
        await fetchProfile(latestSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout: if auth takes too long, stop loading
    const timeout = setTimeout(() => {
      if (mounted && loadingRef.current) {
        console.warn('[Auth] Loading timed out, clearing loading state');
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Avoid global loading flips on token refresh; they remount navigation.
          // Only show blocking loading for true auth transitions.
          if (event === 'SIGNED_IN') {
            setLoading(true);
          }
          identifyUser(session.user.id, {
            email: session.user.email ?? null,
            created_at: session.user.created_at ?? null,
          });
          fetchProfile(session.user.id).catch(() => {
            // no-op: fetchProfile already logs details
          });
        } else {
          captureEvent(EVENTS.USER_SIGNED_OUT);
          resetUser();
          setProfile(null);
          cacheProfile(null).catch(() => {
            // no-op: cacheProfile already logs details
          });
          setLoading(false);
        }
      }
    );

    const hydrateFromCache = async () => {
      try {
        const [
          { data: { session: existingSession } },
          cachedProfileRaw,
        ] = await Promise.all([
          supabase.auth.getSession(),
          AsyncStorage.getItem(PROFILE_CACHE_KEY),
        ]);

        if (!mounted) return;

        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (!existingSession?.user) {
          setProfile(null);
          cacheProfile(null).catch(() => {
            // no-op: cacheProfile already logs details
          });
          setLoading(false);
          return;
        }

        if (!cachedProfileRaw) {
          return;
        }

        const parsedProfile = JSON.parse(cachedProfileRaw) as Profile;

        if (parsedProfile?.user_id === existingSession.user.id) {
          setProfile(parsedProfile);
          setUserProperties({
            name: parsedProfile.full_name,
            has_onboarded: parsedProfile.has_onboarded,
            created_at: parsedProfile.created_at,
          });
          setLoading(false);
          return;
        }

        cacheProfile(null).catch(() => {
          // no-op: cacheProfile already logs details
        });
      } catch (error) {
        if (!mounted) return;
        console.warn('Error hydrating auth from cache:', error);
      }
    };

    hydrateFromCache().catch(() => {
      if (mounted) {
        setLoading(false);
      }
    });

    // Refresh session when app returns to foreground
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextState === 'active') {
          refreshSessionAndProfile().catch(() => {
            // no-op: loading fallback is handled in refreshSessionAndProfile
          });
        }
        appState.current = nextState;
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    resetUser();
    setProfile(null);
    await cacheProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
