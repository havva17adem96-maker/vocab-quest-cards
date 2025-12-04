import { supabase } from "@/integrations/supabase/client";
import { StarLevel } from "@/types/word";

const SESSION_KEY = "flashcard-supabase-session";

// Get user_id from URL parameters
function getUserIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('user_id');
}

interface SessionState {
  selectedPackage: string | null;
  currentIndex: number;
  sessionWordIds: string[];
}

export async function updateWordStarsInSupabase(
  wordId: string,
  stars: StarLevel
): Promise<void> {
  const userId = getUserIdFromUrl();
  
  let query = supabase
    .from("learned_words")
    .update({ star_rating: stars })
    .eq("id", wordId);

  // Also filter by user_id if provided
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { error } = await query;

  if (error) {
    console.error("Error updating star rating:", error);
  }
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
