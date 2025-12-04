import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Word, StarLevel } from '@/types/word';
import { loadProgress } from '@/utils/wordParser';

interface LearnedWord {
  id: string;
  english: string;
  turkish: string;
  frequency_group: string;
  star_rating: number;
  is_flipped: boolean;
  added_at: string;
  package_id: string | null;
  package_name: string | null;
}

// Get user_id from URL parameters
function getUserIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('user_id');
}

export function useWords() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = getUserIdFromUrl();

  const fetchWords = async () => {
    try {
      let query = supabase
        .from('learned_words')
        .select('*')
        .order('added_at', { ascending: true });

      // Filter by user_id if provided in URL
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Get local progress to merge with Supabase data
      const localProgress = loadProgress();

      const parsedWords: Word[] = (data as LearnedWord[]).map((item) => {
        // Use local progress if available, otherwise use star_rating from DB
        const localStars = localProgress[item.id];
        const stars = localStars !== undefined ? localStars : (item.star_rating as StarLevel);
        
        return {
          id: item.id,
          english: item.english.trim(),
          turkish: item.turkish.trim(),
          level: item.frequency_group || '1k',
          stars: Math.min(5, Math.max(0, stars)) as StarLevel,
          packageId: item.package_id,
          packageName: item.package_name,
        };
      });

      setWords(parsedWords);
      setError(null);
    } catch (err) {
      console.error('Error fetching words:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch words');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();

    // Set up real-time subscription
    const channel = supabase
      .channel('learned_words_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learned_words',
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchWords(); // Refetch all words on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { words, setWords, loading, error, refetch: fetchWords };
}
