import { Moon, Sun, User as UserIcon, ChevronDown } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { useState, useEffect, useRef } from 'react';
import { HowItWorksDropdown } from './HowItWorksDropdown';
import { SettingsModal } from './SettingsModal';

interface SmartNavbarProps {
  user: any;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignIn?: () => void;
  onSignUp?: () => void;
  onSignOut?: () => void;
  onLogoClick?: () => void;
  isSidebarOpen?: boolean;
}

export function SmartNavbar({
  user,
  isDark,
  onToggleTheme,
  onSignIn,
  onSignUp,
  onSignOut,
  onLogoClick,
  isSidebarOpen = true,
}: SmartNavbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (howItWorksRef.current && !howItWorksRef.current.contains(event.target as Node)) {
        setShowHowItWorks(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoClick = () => {
    if (user && onLogoClick) {
      // Logged in: Navigate to dashboard main screen
      onLogoClick();
    }
    // Guest: Do nothing (already on landing page)
  };

  return (
    <>
      <nav className="h-16 w-full backdrop-blur-xl bg-background/5 border-b border-white/5 px-6 transition-all duration-300">
        <div className="h-full flex items-center justify-between">
          {/* Left - Logo with Smart Logic */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={logoImg} alt="Text2Block" className="w-6 h-6" />
            <span className="text-xl">Text2Block</span>
          </button>

          {/* Right - Actions Grouped */}
          <div className="flex items-center gap-4">
            {/* How it Works - with dropdown */}
            <div className="relative" ref={howItWorksRef}>
              <button
                onClick={() => setShowHowItWorks(!showHowItWorks)}
                className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5"
              >
                How it Works
              </button>
              <HowItWorksDropdown
                isOpen={showHowItWorks}
                onClose={() => setShowHowItWorks(false)}
              />
            </div>

            {/* Theme Toggle - Minimal Outline Style */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun size={20} className="text-gray-400" strokeWidth={1.5} />
              ) : (
                <Moon size={20} className="text-gray-400" strokeWidth={1.5} />
              )}
            </button>

            {/* Auth State Switch */}
            {user ? (
              /* Condition B: Logged In - User Avatar with Dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-electric-blue/20 border border-electric-blue/30 flex items-center justify-center">
                    <UserIcon size={16} className="text-electric-blue" />
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 glass-surface rounded-lg border border-white/10 py-2 z-50 shadow-xl">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm truncate text-white">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowSettings(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onSignOut?.();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Condition A: Guest - Sign In + Get Started */
              <div className="flex items-center gap-3">
                <button
                  onClick={onSignIn}
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5"
                >
                  Sign In
                </button>
                <button
                  onClick={onSignUp || onSignIn}
                  className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
                >
                  Get Started
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-80">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Settings Modal - Rendered outside nav but controlled here */}
      {user && (
        <SettingsModal
          isOpen={showSettings}
          onOpenChange={setShowSettings}
          user={user}
          isDark={isDark}
        />
      )}
    </>
  );
}