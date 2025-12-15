/**
 * Conversation Service
 * Handles saving and loading tutorial conversations from Supabase
 */

import { getSupabaseClient } from '../utils/supabase/client';

/**
 * Asset reference in tutorial content
 * - type: 'url' for S3/HTTP URLs, 'base64' for inline data
 * - data: The actual URL or base64 string
 */
export interface TutorialAsset {
  type: 'url' | 'base64';
  data: string;
}

/**
 * New tutorial payload format from backend
 * - tutorial_content: Markdown string with <interactive-code> blocks and ![](asset_id) refs
 * - assets: Dictionary mapping asset IDs to their URLs/data
 */
export interface TutorialPayload {
  tutorial_content: string;
  assets: Record<string, TutorialAsset>;
}

/**
 * @deprecated Use TutorialPayload instead - kept for backward compatibility
 */
export interface TutorialData {
  title: string;
  sections: Array<{
    type: 'text' | 'diagram' | 'image';
    content?: string;
    svg?: string;
    url?: string;
  }>;
  metadata?: {
    generated_at?: string;
    estimated_reading_time?: string;
    [key: string]: any;
  };
}

export interface ConversationRecord {
  id: string;
  user_id: string;
  topic: string;
  response_payload: any;
  created_at: string;
}

/**
 * Save a tutorial conversation to Supabase
 * 
 * @param tutorialData - The tutorial JSON from backend
 * @param userId - The authenticated user's ID
 * @returns The created conversation record
 */
export const saveConversation = async (
  tutorialData: TutorialData,
  userId: string
): Promise<ConversationRecord | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('[Conversations] Supabase client not available');
    return null;
  }

  try {
    console.log('[Conversations] Saving tutorial to database...');
    console.log('[Conversations] Tutorial title:', tutorialData.title);

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        topic: tutorialData.title,
        response_payload: tutorialData,
      } as any)
      .select()
      .single() as { data: ConversationRecord | null; error: any };

    if (error) {
      console.error('[Conversations] Error saving:', error);
      throw error;
    }

    console.log('[Conversations] Saved successfully:', data?.id);
    return data as ConversationRecord;
  } catch (error: any) {
    console.error('[Conversations] Failed to save conversation:', error);
    return null;
  }
};

/**
 * Load a specific conversation by ID
 * 
 * @param conversationId - The conversation UUID
 * @param userId - The authenticated user's ID (for security)
 * @returns The conversation record
 */
export const loadConversation = async (
  conversationId: string,
  userId: string
): Promise<ConversationRecord | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('[Conversations] Supabase client not available');
    return null;
  }

  try {
    console.log('[Conversations] Loading conversation:', conversationId);

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[Conversations] Error loading:', error);
      throw error;
    }

    console.log('[Conversations] Loaded successfully');
    return data as ConversationRecord;
  } catch (error: any) {
    console.error('[Conversations] Failed to load conversation:', error);
    return null;
  }
};

/**
 * Load all conversations for a user
 * 
 * @param userId - The authenticated user's ID
 * @returns Array of conversation records
 */
export const loadAllConversations = async (
  userId: string
): Promise<ConversationRecord[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('[Conversations] Supabase client not available');
    return [];
  }

  try {
    console.log('[Conversations] Loading all conversations for user');

    const { data, error } = await supabase
      .from('conversations')
      .select('id, topic, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Conversations] Error loading all:', error);
      throw error;
    }

    console.log('[Conversations] Loaded', data?.length || 0, 'conversations');
    return (data || []) as ConversationRecord[];
  } catch (error: any) {
    console.error('[Conversations] Failed to load conversations:', error);
    return [];
  }
};

/**
 * Delete a conversation
 * 
 * @param conversationId - The conversation UUID
 * @param userId - The authenticated user's ID (for security)
 * @returns Success status
 */
export const deleteConversation = async (
  conversationId: string,
  userId: string
): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('[Conversations] Supabase client not available');
    return false;
  }

  try {
    console.log('[Conversations] Deleting conversation:', conversationId);

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('[Conversations] Error deleting:', error);
      throw error;
    }

    console.log('[Conversations] Deleted successfully');
    return true;
  } catch (error: any) {
    console.error('[Conversations] Failed to delete conversation:', error);
    return false;
  }
};
