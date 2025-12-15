import { useState, useRef, useEffect } from 'react';
import { SidebarRef } from './Sidebar';
import { QueryInterface } from './QueryInterface';
import { ArticleView } from './ArticleView';
import { MainLayout } from './MainLayout';
import { UserProfile } from '../types/profile';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';

interface DashboardProps {
  user: any;
  onSignOut: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Dashboard({ user, onSignOut, isDark, onToggleTheme }: DashboardProps) {
  const [currentScreen, setCurrentScreen] = useState<'main' | 'article'>('main');
  const [article, setArticle] = useState<any>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const sidebarRef = useRef<SidebarRef>(null);
  const supabase = getSupabaseClient();

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      if (!supabase) {
        console.error('Supabase client not initialized');
        setProfileLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error('No access token available');
        setProfileLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9d6d864c/profile`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      console.log('[Dashboard] User profile fetched:', data);

      if (data.user_profile) {
        setUserProfile(data.user_profile);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleGenerateTutorial = (topic: string) => {
    setArticle({
      title: topic,
      query: topic,
    });
    setCurrentConversationId(undefined);
    setCurrentScreen('article');
  };

  const handleSelectConversation = (conversation: any) => {
    setCurrentConversationId(conversation.id);
    setArticle({
      title: conversation.topic,
      query: conversation.topic,
      id: conversation.id,
    });
    setCurrentScreen('article');
  };

  const handleNewTutorial = () => {
    setArticle(null);
    setCurrentConversationId(undefined);
    setCurrentScreen('main');
  };

  const handleConversationCreated = () => {
    // Refresh the sidebar conversations list
    sidebarRef.current?.refreshConversations();
  };

  const handleTutorialGenerated = (tutorialData: any) => {
    console.log('[Dashboard] Tutorial generated:', tutorialData);

    // Navigate to article view with the generated tutorial data
    setArticle({
      title: tutorialData.title,
      query: tutorialData.title,
      tutorialData: tutorialData,
      id: tutorialData.conversationId, // Use the saved conversation ID if available
    });
    setCurrentConversationId(tutorialData.conversationId);
    setCurrentScreen('article');

    // Refresh sidebar to show new conversation
    if (tutorialData.conversationId) {
      sidebarRef.current?.refreshConversations();
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <MainLayout
      user={user}
      isDark={isDark}
      onToggleTheme={onToggleTheme}
      onSignOut={onSignOut}
      onLogoClick={handleNewTutorial}
      currentConversationId={currentConversationId}
      onSelectConversation={handleSelectConversation}
      sidebarRef={sidebarRef as React.RefObject<SidebarRef>}
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={toggleSidebar}
      disableAnimation={currentScreen === 'article'}
      overflowHidden={false}
    >
      {currentScreen === 'main' ? (
        <QueryInterface
          userProfile={userProfile}
          onTutorialGenerated={handleTutorialGenerated}
          isDark={isDark}
        />
      ) : (
        <ArticleView
          article={article}
          onNewTutorial={handleNewTutorial}
          user={user}
          onConversationCreated={handleConversationCreated}
          isDark={isDark}
          onOpenSidebar={toggleSidebar}
        />
      )}
    </MainLayout>
  );
}