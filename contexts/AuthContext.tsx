import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ProfileRepo } from '@/lib/profileRepo';
import { NotificationService } from '@/services/notifications';
import type { UserProfile } from '@/types/database';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  university?: string;
  profile?: UserProfile;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setGuestMode: (isGuest: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Initialize auth state and listen for changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserWithProfile(session.user);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          loadUserWithProfile(session.user);
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load user with profile data
  const loadUserWithProfile = async (supabaseUser: User) => {
    const authUser = mapSupabaseUser(supabaseUser);
    setUser(authUser);

    // Initialize push notifications for authenticated user
    try {
      await NotificationService.initializePushNotifications(supabaseUser.id);
    } catch (error) {
      console.warn('Failed to initialize push notifications:', error);
    }

    // Load profile data
    try {
      const { data: profile } = await ProfileRepo.getProfile(supabaseUser.id);
      setUserProfile(profile);
      
      // Update auth user with profile data
      if (profile) {
        setUser(prev => prev ? {
          ...prev,
          displayName: profile.full_name || profile.username || prev.displayName,
          university: profile.university || prev.university,
          profile
        } : null);
      }
    } catch (error) {
      console.warn('Failed to load user profile:', error);
    }
  };

  // Map Supabase user to our AuthUser format
  const mapSupabaseUser = (supabaseUser: User): AuthUser => ({
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    displayName: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0] || 'User',
    university: supabaseUser.user_metadata?.university || 'University of Florida',
  });

  // Format auth error messages
  const formatAuthError = (error: AuthError): string => {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'User already registered':
        return 'An account with this email already exists. Please sign in instead.';
      case 'Email not confirmed':
        return 'Please check your email and confirm your account before signing in.';
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long.';
      case 'Unable to validate email address: invalid format':
        return 'Please enter a valid email address.';
      case 'Signup is disabled':
        return 'Account creation is currently disabled. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  };

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { error: formatAuthError(error) };
      }

      setIsGuest(false);
      return {};
    } catch (error) {
      return { error: 'Network error. Please check your connection and try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, displayName: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            university: 'University of Florida',
          },
        },
      });

      if (error) {
        return { error: formatAuthError(error) };
      }

      setIsGuest(false);
      return {};
    } catch (error) {
      return { error: 'Network error. Please check your connection and try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Clean up notification listeners
      NotificationService.removeNotificationListeners();
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsGuest(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setGuestMode = (guest: boolean) => {
    setIsGuest(guest);
    if (guest) {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isGuest,
      login,
      signup,
      logout,
      setGuestMode,
    }}>
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