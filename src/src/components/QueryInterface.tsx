import { useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { optimizePrompt, generateTutorialStream } from '../services/api';
import { saveConversation } from '../services/conversations';
import { UserProfile } from '../types/profile';
import { getSupabaseClient } from '../utils/supabase/client';
import logoImg from '../assets/logo.png';
import { LoadingAnimation } from './LoadingAnimation';

interface QueryInterfaceProps {
  userProfile: UserProfile | null;
  onTutorialGenerated: (tutorialData: any) => void;
  isDark: boolean;
}

type ViewState = 'IDLE' | 'LOADING' | 'GENERIC' | 'TUTORIAL' | 'ERROR' | 'GENERATING';

export function QueryInterface({ userProfile, onTutorialGenerated, isDark }: QueryInterfaceProps) {
  const [query, setQuery] = useState('');
  const [viewState, setViewState] = useState<ViewState>('IDLE');
  const [displayMessage, setDisplayMessage] = useState('');
  const [editablePrompt, setEditablePrompt] = useState('');
  const [userQuery, setUserQuery] = useState(''); // Store original user query

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || viewState === 'LOADING') return;

    if (!userProfile) {
      setDisplayMessage('User profile not loaded. Please refresh the page.');
      setViewState('ERROR');
      return;
    }

    const currentQuery = query.trim();
    setUserQuery(currentQuery);
    setQuery('');
    setViewState('LOADING');

    try {
      const result = await optimizePrompt(currentQuery, userProfile);

      switch (result.mode) {
        case 'ERROR':
          setDisplayMessage(result.payload);
          setViewState('ERROR');
          break;

        case 'DISPLAY_MODE':
          // Generic response - just display it
          setDisplayMessage(result.payload);
          setViewState('GENERIC');
          break;

        case 'EDIT_MODE':
          // Tutorial response - show editable textbox with Accept button
          setEditablePrompt(result.payload);
          setViewState('TUTORIAL');
          break;

        default:
          setDisplayMessage('Unexpected response from server');
          setViewState('ERROR');
      }
    } catch (error: any) {
      setDisplayMessage(error.message || 'Failed to connect to backend');
      setViewState('ERROR');
    }
  };

  const handleAccept = async () => {
    setViewState('GENERATING');
    setDisplayMessage('Initializing generation...');

    try {
      if (!userProfile) {
        throw new Error('User profile not available');
      }

      // 1. Authenticate user
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('[QueryInterface] Auth error:', authError);
        throw new Error('Authentication required');
      }

      // 2. Start Streaming Generation
      console.log('[QueryInterface] Starting tutorial generation stream...');
      const stream = await generateTutorialStream(editablePrompt, userProfile);
      
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalTutorialData: any = null;

      console.log('[QueryInterface] Stream connection established. Reading chunks...');

      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          console.log('[QueryInterface] Stream reading completed.');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ""; 

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const update = JSON.parse(line);

            // CASE 1: Status Update
            if (update.type === 'status') {
              console.log('[QueryInterface] Stream Status:', update.message);
              setDisplayMessage(update.message);
            }

            // CASE 2: Final Result
            if (update.type === 'result') {
              console.log('[QueryInterface] Stream Result Received:', update.data ? 'Data present' : 'No data');
              finalTutorialData = update.data;
            }
          } catch (e) {
            console.warn('[QueryInterface] Stream Parse Warning: Failed to parse line:', line, e);
            // Continue processing other lines: do NOT throw here
          }
        }
      }

      if (!finalTutorialData) {
        console.error('[QueryInterface] Stream Error: Completed without result payload');
        throw new Error('Stream completed without returning tutorial data');
      }

      // 3. Save to conversations table
      console.log('[QueryInterface] Saving conversation to Supabase...');
      const savedConversation = await saveConversation(
        { title: userQuery, ...finalTutorialData } as any,
        user.id
      );

      if (savedConversation) {
        console.log('[QueryInterface] Conversation saved successfully:', savedConversation.id);
      } else {
        console.warn('[QueryInterface] Conversation save failed (non-fatal)');
      }

      // 4. Pass data to parent
      console.log('[QueryInterface] Finalizing generation flow');
      onTutorialGenerated({
        title: userQuery,
        tutorialData: finalTutorialData,
        conversationId: savedConversation?.id,
      });

    } catch (error: any) {
      console.error('[QueryInterface] Critical Error in handleAccept:', error);
      setDisplayMessage(error.message || 'Failed to generate tutorial');
      setViewState('ERROR');
    }
  };

  const handleReset = () => {
    setViewState('IDLE');
    setDisplayMessage('');
    setEditablePrompt('');
    setUserQuery('');
  };

  const exampleTopics = [
    'What is machine learning?',
    'Explain REST APIs',
    'Teach me React hooks',
    'Build a login system tutorial',
  ];

  return (
    <div className="h-full flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl">
        {/* Welcome Screen - IDLE State */}
        {viewState === 'IDLE' && (
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 glass-surface px-4 py-2 rounded-full border border-white/10 mb-6">
              <img src={logoImg} alt="Text2Block" className="w-5 h-5" />
              <span className="text-sm text-gray-300">AI-Powered Tutorial Generator</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl mb-6">
              Transform Ideas into
              <br />
              <span className="gradient-text">Rich Tutorials</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12">
              Ask me anything or request a tutorial. I'll either answer directly or help you create comprehensive learning content.
            </p>

            {/* Query Input */}
            <form onSubmit={handleSubmit} className="mb-12">
              <div className="glass-surface p-2 rounded-2xl border border-white/10 glow-blue">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a question or request a tutorial..."
                    className="flex-1 bg-transparent px-6 py-4 text-lg outline-none placeholder-gray-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!query.trim()}
                    className="btn-primary px-8 py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span>Send</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </form>

            {/* Example Topics */}
            <div>
              <p className="text-sm text-gray-400 mb-6">Try These Examples</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exampleTopics.map((example) => (
                  <button
                    key={example}
                    onClick={() => setQuery(example)}
                    className="glass-surface p-6 rounded-xl border border-electric-blue/20 hover:border-electric-blue hover:bg-electric-blue/5 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 group-hover:text-white transition-colors">{example}</span>
                      <ArrowRight size={16} className="text-electric-blue/50 group-hover:text-electric-blue transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading States */}
        <LoadingAnimation 
          isOpen={viewState === 'LOADING'} 
          mode="optimization" 
        />

        <LoadingAnimation 
          isOpen={viewState === 'GENERATING'} 
          mode="generation"
          customStatus={displayMessage}
        />

        {/* Error Display */}
        {viewState === 'ERROR' && (
          <div className="animate-fade-in">
            <div className="glass-surface border border-red-500/30 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl mb-2 text-red-400">Error</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{displayMessage}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="btn-secondary w-full py-3 rounded-xl"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Generic Response Display */}
        {viewState === 'GENERIC' && (
          <div className="animate-fade-in">
            <div className="glass-surface border border-emerald-500/30 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle size={24} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl mb-2 text-emerald-400">Response</h3>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{displayMessage}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="btn-secondary w-full py-3 rounded-xl"
              >
                Ask Another Question
              </button>
            </div>
          </div>
        )}

        {/* Tutorial Edit Mode */}
        {viewState === 'TUTORIAL' && (
          <div className="animate-fade-in">
            <div className="glass-surface border border-purple-500/30 rounded-2xl p-8">
              <div className="mb-6">
                <h3 className="text-2xl mb-2 gradient-text">Optimized Tutorial Prompt</h3>
                <p className="text-gray-400 text-sm">Review and edit the prompt below, then click Accept to generate your tutorial</p>
              </div>

              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className="w-full h-64 bg-black/30 border border-white/10 rounded-xl p-4 text-gray-300 outline-none focus:border-purple-500 transition-colors resize-none mb-6"
                placeholder="Edit the optimized prompt..."
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAccept}
                  className="btn-primary flex-1 py-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  <span>Accept & Generate Tutorial</span>
                </button>
                <button
                  onClick={handleReset}
                  className="btn-secondary px-8 py-4 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}