import { ReactNode } from 'react';
import { Sidebar, SidebarRef } from './Sidebar';
import { SmartNavbar } from './SmartNavbar';
import { ThreeBackground } from './ThreeBackground';

interface MainLayoutProps {
  user: any;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onSignIn?: () => void;
  onLogoClick?: () => void;
  currentConversationId?: string;
  onSelectConversation?: (conversation: any) => void;
  sidebarRef?: React.RefObject<SidebarRef>;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  disableAnimation?: boolean;
  overflowHidden?: boolean;
  children: ReactNode;
}

export function MainLayout({
  user,
  isDark,
  onToggleTheme,
  onSignOut,
  onSignIn,
  onLogoClick,
  currentConversationId,
  onSelectConversation,
  sidebarRef,
  isSidebarOpen,
  onToggleSidebar,
  disableAnimation,
  overflowHidden,
  children,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Fixed Sidebar - Left (250px width) */}
      <div className={`
        hidden lg:block
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-[250px]' : 'w-0'}
        ${disableAnimation ? 'transition-none' : ''}
      `}>
        <Sidebar
          user={user}
          onSelectConversation={onSelectConversation || (() => { })}
          onSignOut={onSignOut}
          currentConversationId={currentConversationId}
          isOpen={isSidebarOpen}
          onToggle={onToggleSidebar}
          ref={sidebarRef}
        />
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sidebar
          user={user}
          onSelectConversation={onSelectConversation || (() => { })}
          onSignOut={onSignOut}
          currentConversationId={currentConversationId}
          isOpen={isSidebarOpen}
          onToggle={onToggleSidebar}
          ref={sidebarRef}
        />
      </div>

      {/* Main Content Area - Right (Remaining Width) */}
      <div className="flex-1 relative overflow-hidden">
        {!disableAnimation && <ThreeBackground isDark={isDark} />}

        {/* Static background for article view */}
        {disableAnimation && (
          <div className={`fixed inset-0 -z-10 transition-colors duration-300 ${isDark ? 'bg-void' : 'bg-white'
            }`} />
        )}

        {/* Navbar - Fixed/Absolute Overlay */}
        <div className="absolute top-0 left-0 right-0 z-50">
          <SmartNavbar
            user={user}
            isDark={isDark}
            onToggleTheme={onToggleTheme}
            onSignOut={onSignOut}
            onSignIn={onSignIn}
            onLogoClick={onLogoClick}
            isSidebarOpen={isSidebarOpen}
          />
        </div>

        {/* Main Content - Scrollable underneath navbar */}
        <div className={`relative h-full w-full ${overflowHidden ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {/* Add top padding to account for fixed navbar, but allow scrolling behind it */}
          <div className="min-h-full flex flex-col pt-16">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}