import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FileText, Menu, X, Trash2, LayoutDashboard, FolderOpen, BarChart3, BookOpen } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  user: any;
  onSelectConversation: (conversation: any) => void;
  onSignOut: () => void;
  currentConversationId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface Conversation {
  id: string;
  topic: string;
  created_at: string;
}

export interface SidebarRef {
  refreshConversations: () => void;
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ user, onSelectConversation, onSignOut, currentConversationId, isOpen, onToggle }, ref) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userName, setUserName] = useState('User');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    loadConversations();
    loadUserProfile();
  }, [user]);

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refreshConversations: loadConversations
  }));

  const loadUserProfile = async () => {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9d6d864c/profile`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.fullName) {
          setUserName(data.fullName);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadConversations = async () => {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9d6d864c/conversations`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    setDeletingId(conversationId);

    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-9d6d864c/conversations/${conversationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        // Refresh the conversations list
        await loadConversations();

        // If this was the current conversation, navigate back
        if (currentConversationId === conversationId) {
          window.location.reload();
        }
      } else {
        console.error('Failed to delete conversation');
        alert('Failed to delete conversation. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Toggle Button - Fixed position, only show when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-20 left-4 z-50 glass-surface p-3 rounded-lg border border-white/10 hover:border-electric-blue transition-all hover:glow-blue"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          glass-surface h-screen border-r border-white/10 flex flex-col
          fixed lg:relative z-40
          w-[250px]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header - with close button inside */}
        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg md:text-xl">History</h2>
          <button
            onClick={onToggle}
            className="glass-surface p-2 rounded-lg border border-white/10 hover:border-electric-blue transition-all hover:glow-blue"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">
              No tutorials yet.
              <br />
              Start creating!
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => {
                  onSelectConversation(conversation);
                  // Close sidebar on mobile after selection
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                className={`w-full text-left p-3 rounded-lg transition-all hover:bg-white/5 ${currentConversationId === conversation.id
                  ? 'bg-white/10 border border-white/20'
                  : 'border border-transparent'
                  }`}
              >
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-electric-blue mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{conversation.topic}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(conversation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {deletingId === conversation.id ? (
                    <div className="animate-spin">
                      <Trash2 size={16} className="text-red-500" />
                    </div>
                  ) : (
                    <Trash2 size={16} className="text-red-500 cursor-pointer" onClick={(e) => handleDeleteConversation(e, conversation.id)} />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Bottom Navigation Links - Removed User Profile */}
        <div className="p-3 md:p-4 border-t border-white/10 space-y-1">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <BookOpen size={16} />
            <span>Documentation</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-60">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <text x="8" y="11" textAnchor="middle" fill="currentColor" fontSize="10">?</text>
            </svg>
            <span>Help</span>
          </a>
        </div>
      </div>
    </>
  );
});