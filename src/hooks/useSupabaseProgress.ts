import { supabase } from "@/integrations/supabase/client";
import { StarLevel } from "@/types/word";

const SESSION_KEY = "flashcard-supabase-session";

interface SessionState {
  selectedPackage: string | null;
  currentIndex: number;
  sessionWordIds: string[];
}

export async function updateWordStarsInSupabase(
  wordId: string,
  stars: StarLevel
): Promise<void> {
  const { error } = await supabase
    .from("learned_words")
    .update({ star_rating: stars })
    .eq("id", wordId);

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
