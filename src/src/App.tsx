import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { getSupabaseClient } from './utils/supabase/client';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    checkSession();
    
    // Handle auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[App] Auth State Change: ${event}`, session?.user?.email);
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [isDark]);

  const checkSession = async () => {
    if (!supabase) {
      console.warn('[App] Supabase client not available, skipping session check');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[App] Session restored for user:', session.user.email);
        setUser(session.user);
      } else {
        console.log('[App] No active session found');
      }
    } catch (error) {
      console.error('[App] Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (authUser: any) => {
    setUser(authUser);
    setShowAuthModal(false);
  };

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      console.log('[App] User signed out');
      setUser(null);
    } catch (error) {
      console.error('[App] Error during sign out:', error);
    }
  };

  const handleToggleTheme = () => {
    setIsDark(!isDark);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Dashboard user={user} onSignOut={handleSignOut} isDark={isDark} onToggleTheme={handleToggleTheme} />;
  }

  return (
    <>
      <LandingPage
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </>
  );
}