import { supabase } from "@/integrations/supabase/client";
import { StarLevel } from "@/types/word";

const SESSION_KEY = "flashcard-supabase-session";

// Get user_id from URL parameters
export function getUserIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('user_id');
}

interface SessionState {
  selectedPackage: string | null;
  currentIndex: number;
  sessionWordIds: string[];
}

interface SupabaseProgress {
  user_id: string;
  current_position: number;
  current_round_words: string[];
  selected_package: string | null;
}

export async function updateWordStarsInSupabase(
  wordId: string,
  stars: StarLevel,
  userId?: string | null
): Promise<void> {
  const uid = userId || getUserIdFromUrl();
  
  if (!uid) {
    console.error("No user_id available for updating star rating");
    return;
  }

  const { error } = await supabase
    .from("user_word_progress")
    .upsert({
      user_id: uid,
      word_id: wordId,
      star_rating: stars,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,word_id' });

  if (error) {
    console.error("Error updating star rating:", error);
  }
}

export async function loadProgressFromSupabase(userId: string): Promise<SessionState | null> {
  const { data, error } = await supabase
    .from("flashcard_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading progress:", error);
    return null;
  }

  if (data) {
    return {
      selectedPackage: data.selected_package,
      currentIndex: data.current_position,
      sessionWordIds: data.current_round_words || [],
    };
  }
  return null;
}

export async function saveProgressToSupabase(
  userId: string,
  state: SessionState
): Promise<void> {
  const { data: existing } = await supabase
    .from("flashcard_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("flashcard_progress")
      .update({
        current_position: state.currentIndex,
        current_round_words: state.sessionWordIds,
        selected_package: state.selectedPackage,
      })
      .eq("user_id", userId);
  } else {
    await supabase
      .from("flashcard_progress")
      .insert({
        user_id: userId,
        current_position: state.currentIndex,
        current_round_words: state.sessionWordIds,
        selected_package: state.selectedPackage,
      });
  }
}

export async function clearProgressFromSupabase(userId: string): Promise<void> {
  await supabase
    .from("flashcard_progress")
    .delete()
    .eq("user_id", userId);
}

export function saveSessionState(state: SessionState): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

export function loadSessionState(): SessionState | null {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function clearSessionState(): void {
  localStorage.removeItem(SESSION_KEY);
}
