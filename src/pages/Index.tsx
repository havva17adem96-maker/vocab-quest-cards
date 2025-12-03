import { useEffect, useState } from "react";
import React from "react";
import { Word } from "@/types/word";
import { FlashCard } from "@/components/FlashCard";
import { AllWordsModal } from "@/components/AllWordsModal";
import {
  updateWordStars,
  createLearningSession,
} from "@/utils/wordParser";
import { useWords } from "@/hooks/useWords";
import { Button } from "@/components/ui/button";
import { List, RotateCcw, Undo, Volume2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const SESSION_STORAGE_KEY = "flashcard-session";

interface HistoryEntry {
  wordId: string;
  previousStars: Word["stars"];
  index: number;
}

const Index = () => {
  const { words: allWords, setWords: setAllWords, loading, error, refetch } = useWords();
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllWords, setShowAllWords] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentWordAudio, setCurrentWordAudio] = useState<string>("");
  const [showWord, setShowWord] = useState(true);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  useEffect(() => {
    if (allWords.length === 0 || sessionInitialized) return;
    
    // Try to load saved session
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const { sessionWords: savedSessionWords, currentIndex: savedIndex } = JSON.parse(savedSession);
        setSessionWords(savedSessionWords);
        setCurrentIndex(savedIndex);
        setSessionComplete(false);
      } catch {
        startNewSession(allWords);
      }
    } else {
      startNewSession(allWords);
    }
    setSessionInitialized(true);
  }, [allWords, sessionInitialized]);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (sessionWords.length > 0 && !sessionComplete) {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ sessionWords, currentIndex })
      );
    } else if (sessionComplete) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [sessionWords, currentIndex, sessionComplete]);

  const startNewSession = (words: Word[]) => {
    const session = createLearningSession(words);
    setSessionWords(session);
    setCurrentIndex(0);
    setSessionComplete(false);
    setHistory([]);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.cancel(); // Cancel any ongoing speech
      speechSynthesis.speak(utterance);
    }
  };

  const handleFlip = () => {
    if (currentIndex >= sessionWords.length) return;
    
    const currentWord = sessionWords[currentIndex];
    
    // If word is not already 1 star, make it 1 star
    if (currentWord.stars !== 1) {
      // Save to history
      setHistory([...history, {
        wordId: currentWord.id,
        previousStars: currentWord.stars,
        index: currentIndex,
      }]);

      // Update to 1 star
      updateWordStars(currentWord.id, 1);
      
      const updatedAllWords = allWords.map((w) =>
        w.id === currentWord.id ? { ...w, stars: 1 as Word["stars"] } : w
      );
      setAllWords(updatedAllWords);
      
      const updatedSessionWords = sessionWords.map((w) =>
        w.id === currentWord.id ? { ...w, stars: 1 as Word["stars"] } : w
      );
      setSessionWords(updatedSessionWords);
    }
  };

  const handleSwipe = (direction: "left" | "right") => {
    if (currentIndex >= sessionWords.length) return;

    const currentWord = sessionWords[currentIndex];
    
    // Save to history before making changes
    setHistory([...history, {
      wordId: currentWord.id,
      previousStars: currentWord.stars,
      index: currentIndex,
    }]);
    
    // If card was flipped (set to 1 star), keep it at 1 star regardless of swipe direction
    const newStars: typeof currentWord.stars = 
      currentWord.stars === 1 
        ? 1
        : (direction === "right" 
          ? (Math.min(currentWord.stars + 1, 5) as typeof currentWord.stars)
          : 1);

    // Update progress
    updateWordStars(currentWord.id, newStars);

    // Update local state
    const updatedAllWords = allWords.map((w) =>
      w.id === currentWord.id ? { ...w, stars: newStars } : w
    );
    setAllWords(updatedAllWords);
    
    const updatedSessionWords = sessionWords.map((w) =>
      w.id === currentWord.id ? { ...w, stars: newStars } : w
    );
    setSessionWords(updatedSessionWords);

    // Show feedback
    toast[direction === "right" ? "success" : "info"](
      direction === "right"
        ? `"${currentWord.english}" → ${newStars} Yıldız! 🌟`
        : `"${currentWord.english}" → 1 Yıldız, tekrar çalışalım 📚`,
      { duration: 2000 }
    );

    // Move to next card
    if (currentIndex + 1 >= sessionWords.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    
    const lastEntry = history[history.length - 1];
    
    // Restore previous stars
    updateWordStars(lastEntry.wordId, lastEntry.previousStars);
    
    const updatedAllWords = allWords.map((w) =>
      w.id === lastEntry.wordId ? { ...w, stars: lastEntry.previousStars } : w
    );
    setAllWords(updatedAllWords);
    
    const updatedSessionWords = sessionWords.map((w) =>
      w.id === lastEntry.wordId ? { ...w, stars: lastEntry.previousStars } : w
    );
    setSessionWords(updatedSessionWords);
    
    // Go back to that card
    setCurrentIndex(lastEntry.index);
    setSessionComplete(false);
    
    // Remove from history
    setHistory(history.slice(0, -1));
    
    toast.info("Geri alındı", { duration: 1500 });
  };

  const handleRestart = () => {
    startNewSession(allWords);
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (allWords.length === 0) return 0;
    
    // Calculate next session size based on current star levels
    let nextSessionSize = 0;
    allWords.forEach((word) => {
      const repeatCount = word.stars === 0 ? 1 : 6 - word.stars;
      nextSessionSize += repeatCount;
    });
    
    const minSize = allWords.length; // All 5 stars
    const maxSize = allWords.length * 5; // All 1 star
    
    // Progress: closer to minSize = higher progress
    const progress = ((maxSize - nextSessionSize) / (maxSize - minSize)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const progressPercentage = calculateProgress();

  const visibleCards = sessionWords.slice(currentIndex, currentIndex + 3);

  // Speak the word when a new card is shown
  React.useEffect(() => {
    if (visibleCards.length > 0 && !sessionComplete) {
      const word = visibleCards[0].english;
      setCurrentWordAudio(word);
      speakWord(word);
    }
  }, [currentIndex, sessionComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex flex-col">
      {/* Progress Bar */}
      <div className="p-4 pb-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Progress value={progressPercentage} className="flex-1" />
            <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlashCards
          </h1>
          <p className="text-sm text-muted-foreground">
            {sessionComplete
              ? "Tur tamamlandı!"
              : `${currentIndex + 1} / ${sessionWords.length}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWord(!showWord)}
            className="gap-2"
          >
            {showWord ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Word
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Word
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={handleUndo}
            disabled={history.length === 0}
          >
            <Undo className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => setShowAllWords(true)}
          >
            <List className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Card Stack */}
      <div className="flex-1 relative max-w-2xl w-full mx-auto">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Kelimeler yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={refetch}>Tekrar Dene</Button>
          </div>
        ) : sessionComplete ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">Tebrikler!</h2>
            <p className="text-muted-foreground mb-6">
              Bu turu tamamladın. Yeni bir tur başlatmak ister misin?
            </p>
            <Button
              size="lg"
              onClick={handleRestart}
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Yeni Tur Başlat
            </Button>
          </div>
        ) : (
          <>
            {visibleCards.length === 0 && !sessionComplete && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <p className="text-muted-foreground text-center">
                  Kelime yükleniyor...
                </p>
              </div>
            )}
            {visibleCards.map((word, index) => (
              <FlashCard
                key={`${word.id}-${currentIndex + index}`}
                word={word}
                style={{
                  zIndex: visibleCards.length - index,
                  transform: `scale(${1 - index * 0.05}) translateY(${index * 10}px)`,
                  opacity: 1 - index * 0.3,
                }}
                onSwipe={index === 0 ? handleSwipe : undefined}
                onFlip={index === 0 ? handleFlip : undefined}
                showWord={showWord}
              />
            ))}
          </>
        )}
      </div>

      {/* Swipe Instructions */}
      {!sessionComplete && visibleCards.length > 0 && (
        <div className="p-8 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-success">
            <div className="text-2xl">→</div>
            <span>Biliyorum</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => currentWordAudio && speakWord(currentWordAudio)}
          >
            <Volume2 className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-warning">
            <span>Bilmiyorum</span>
            <div className="text-2xl">←</div>
          </div>
        </div>
      )}

      {/* All Words Modal */}
      <AllWordsModal
        words={allWords}
        open={showAllWords}
        onOpenChange={setShowAllWords}
      />
    </div>
  );
};

export default Index;
