import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Calendar, GraduationCap, Sparkles, FileText } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'signup' }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [userIntroduction, setUserIntroduction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialMode === 'signup');
    }
  }, [isOpen, initialMode]);

  const supabase = getSupabaseClient();

  // Validate Supabase client initialization
  if (!supabase) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="glass-surface rounded-2xl p-8 w-full max-w-md border border-white/10">
          <h2 className="text-3xl mb-4">Service Unavailable</h2>
          <p className="text-gray-400">Unable to connect to authentication service. Please try again later.</p>
          <button
            onClick={onClose}
            className="mt-6 w-full bg-electric-blue hover:bg-blue-600 text-white rounded-lg py-3 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate all required fields
      if (!fullName || !dateOfBirth || !educationLevel || !experienceLevel || !userIntroduction) {
        throw new Error('Please fill in all required fields');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9d6d864c/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            fullName,
            dateOfBirth,
            educationLevel,
            experienceLevel,
            userIntroduction,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // If the error is about duplicate profile, try to sign in instead
        if (data.details && data.details.includes('duplicate key')) {
          console.log('Profile already exists, attempting to sign in...');
          const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            throw new Error('Account exists but sign in failed. Please try signing in directly.');
          }

          onSuccess(authData.user);
          return;
        }
        throw new Error(data.error || 'Sign up failed');
      }

      // Auto sign in after sign up
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      onSuccess(authData.user);
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      onSuccess(data.user);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="glass-surface relative w-full max-w-md rounded-2xl p-6 sm:p-8 border border-white/10 my-8 text-left transition-all shadow-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
          >
            <X size={20} />
          </button>

          <h2 className="text-3xl mb-2 font-bold tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400 mb-8">
            {isSignUp
              ? 'Start your learning journey today'
              : 'Sign in to continue learning'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-electric-blue transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
                  />
                </div>

                <div className="relative group">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-electric-blue transition-colors" size={20} />
                  <input
                    type="date"
                    placeholder="Date of Birth"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
                  />
                </div>

                <div className="relative group">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-electric-blue transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="e.g., Master in Computer Science"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
                  />
                </div>

                <div className="relative group">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-electric-blue transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="e.g., 3 years as Product Manager"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
                  />
                </div>

                <div className="relative group">
                  <FileText className="absolute left-3 top-3 text-gray-400 group-focus-within:text-electric-blue transition-colors" size={20} />
                  <textarea
                    placeholder="Tell us about yourself (your interests, goals, background...)"
                    value={userIntroduction}
                    onChange={(e) => setUserIntroduction(e.target.value)}
                    required
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all resize-none"
                  />
                </div>
              </>
            )}

            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-electric-blue transition-colors" size={20} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-electric-blue transition-colors" size={20} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                 <span className="block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                 {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-electric-blue hover:bg-blue-600 text-white rounded-lg py-3.5 font-medium transition-all glow-blue disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button
              onClick={() => {
                setError('');
                setIsSignUp(!isSignUp);
              }}
              className="text-gray-400 hover:text-white transition-colors text-sm hover:underline underline-offset-4"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}