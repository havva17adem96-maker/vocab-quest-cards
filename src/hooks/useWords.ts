import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Word, StarLevel } from '@/types/word';
import { loadProgress, getWordsWithProgress } from '@/utils/wordParser';

interface LearnedWord {
  id: number;
  word_id: string;
  english: string;
  turkish: string;
  level: string;
  created_at: string;
}

export function useWords() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from('learned_words')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      const parsedWords: Word[] = (data as LearnedWord[]).map((item) => ({
        id: item.word_id || item.id.toString(),
        english: item.english,
        turkish: item.turkish,
        level: item.level || 'A1',
        stars: 0 as StarLevel,
      }));

      const withProgress = getWordsWithProgress(parsedWords);
      setWords(withProgress);
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
  }, []);

  return { words, setWords, loading, error, refetch: fetchWords };
}
