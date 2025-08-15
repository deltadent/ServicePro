
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'worker';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isWorker: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile({ ...data, role: data.role as 'admin' | 'worker' });
    } catch (err: any) {
      console.error('Failed to fetch profile:', err.message);
      setProfile(null);
      setError('Could not load profile');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setError(error.message);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            await fetchProfile(initialSession.user.id);
          }
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        console.log('Auth event:', event, session?.user?.email);
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setError(null);

          if (session?.user && initialized) {
            // Only fetch profile if we're already initialized to avoid duplicate calls
            setTimeout(() => {
              if (mounted) {
                fetchProfile(session.user.id);
              }
            }, 0);
          } else if (!session?.user) {
            setProfile(null);
          }
        }
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, initialized]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (signInError) throw signInError;
      if (!signInData.user) throw new Error("Sign in failed");

      // Check if the user is active
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', signInData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData.is_active) {
        await supabase.auth.signOut();
        const inactiveError = new Error("Your account is inactive. Please contact an administrator.");
        setError(inactiveError.message);
        return { error: inactiveError };
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData = {}) => {
    setError(null);
    
    try {
      const redirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: userData
        }
      });
      
      return { error };
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      setError(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
    isWorker: profile?.role === 'worker',
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
