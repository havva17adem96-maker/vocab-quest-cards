import { useEffect, useState, useMemo } from "react";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { Word, StarLevel } from "@/types/word";
import { FlashCard } from "@/components/FlashCard";
import { AllWordsModal } from "@/components/AllWordsModal";
import { PackageSelector } from "@/components/PackageSelector";
import {
  updateWordStars,
  createLearningSession,
} from "@/utils/wordParser";
import { useUnlockedWords } from "@/hooks/useUnlockedWords";
import { Button } from "@/components/ui/button";
import { List, RotateCcw, Undo, Volume2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  updateWordStarsInSupabase,
  saveSessionState,
  loadSessionState,
  clearSessionState,
  getUserIdFromUrl,
  loadProgressFromSupabase,
  saveProgressToSupabase,
  clearProgressFromSupabase,
  addKartXP,
} from "@/hooks/useSupabaseProgress";

interface HistoryEntry {
  wordId: string;
  previousStars: Word["stars"];
  index: number;
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user_id");
  const urlPackageId = searchParams.get("package_id");
  
  const [selectedPackage, setSelectedPackage] = useState<string>(() => urlPackageId || "all");
  const { words: unlockedWords, packages: unlockedPackages, loading, error, refetch } = useUnlockedWords(userId);
  
  // Filter packages to show only the URL package (if exists) + "Tümü"
  const filteredPackages = useMemo(() => {
    if (!urlPackageId) return unlockedPackages;
    return unlockedPackages.filter(pkg => pkg.id === urlPackageId);
  }, [unlockedPackages, urlPackageId]);
  
  // Convert unlocked words to Word type with stars
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllWords, setShowAllWords] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentWordAudio, setCurrentWordAudio] = useState<string>("");
  const [showWord, setShowWord] = useState(true);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // Convert unlocked words to Word format
  useEffect(() => {
    if (unlockedWords.length > 0) {
      const words: Word[] = unlockedWords.map((w) => ({
        id: w.id,
        english: w.english,
        turkish: w.turkish,
        level: w.frequency_group,
        stars: 0 as StarLevel,
        packageId: w.package_id,
        packageName: w.package_name,
      }));
      setAllWords(words);
    }
  }, [unlockedWords]);

  // Filter words by selected package (already filtered by edge function, but keep for consistency)
  const filteredWords = useMemo(() => {
    return allWords;
  }, [allWords]);

  // Load saved session on mount
  useEffect(() => {
    if (allWords.length === 0 || sessionInitialized) return;

    const loadSavedSession = async () => {
      // Try loading from Supabase first if userId exists
      let savedState = userId ? await loadProgressFromSupabase(userId) : null;
      
      // Fall back to localStorage if no Supabase data
      if (!savedState) {
        savedState = loadSessionState();
      }

      if (savedState) {
        setSelectedPackage(savedState.selectedPackage);
        
        // Rebuild session words from saved IDs
        const wordsMap = new Map(allWords.map((w) => [w.id, w]));
        const rebuiltSession = savedState.sessionWordIds
          .map((id) => wordsMap.get(id))
          .filter((w): w is Word => w !== undefined);

        if (rebuiltSession.length > 0 && savedState.currentIndex < rebuiltSession.length) {
          setSessionWords(rebuiltSession);
          setCurrentIndex(savedState.currentIndex);
          setSessionComplete(false);
          setSessionInitialized(true);
          return;
        }
      }

      // Clear old localStorage data and start fresh
      localStorage.removeItem("flashcard-progress");
      clearSessionState();
      startNewSession(allWords);
      setSessionInitialized(true);
    };

    loadSavedSession();
  }, [allWords, sessionInitialized, userId]);

  // Save session state whenever it changes
  useEffect(() => {
    const state = {
      selectedPackage,
      currentIndex,
      sessionWordIds: sessionWords.map((w) => w.id),
    };

    if (sessionWords.length > 0 && !sessionComplete && sessionInitialized) {
      saveSessionState(state);
      // Also save to Supabase if userId exists
      if (userId) {
        saveProgressToSupabase(userId, state);
      }
    } else if (sessionComplete) {
      clearSessionState();
      if (userId) {
        clearProgressFromSupabase(userId);
      }
    }
  }, [sessionWords, currentIndex, sessionComplete, selectedPackage, sessionInitialized, userId]);

  const startNewSession = (words: Word[]) => {
    if (words.length === 0) {
      toast.error("Bu pakette kelime yok");
      return;
    }
    const session = createLearningSession(words);
    setSessionWords(session);
    setCurrentIndex(0);
    setSessionComplete(false);
    setHistory([]);
    clearSessionState();
  };

  const handlePackageChange = (packageId: string) => {
    setSelectedPackage(packageId);
    refetch(packageId === "all" ? undefined : packageId);
  };

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };

  const handleFlip = async () => {
    if (currentIndex >= sessionWords.length) return;
    
    const currentWord = sessionWords[currentIndex];
    
    if (currentWord.stars !== 1) {
      setHistory([...history, {
        wordId: currentWord.id,
        previousStars: currentWord.stars,
        index: currentIndex,
      }]);

      updateWordStars(currentWord.id, 1);
      await updateWordStarsInSupabase(currentWord.id, 1, userId);
      
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

  const handleSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= sessionWords.length) return;

    const currentWord = sessionWords[currentIndex];
    
    setHistory([...history, {
      wordId: currentWord.id,
      previousStars: currentWord.stars,
      index: currentIndex,
    }]);
    
    const newStars: typeof currentWord.stars = 
      direction === "right" 
        ? (Math.min(currentWord.stars + 1, 5) as typeof currentWord.stars)
        : 1;

    // Update progress locally and in Supabase
    updateWordStars(currentWord.id, newStars);
    await updateWordStarsInSupabase(currentWord.id, newStars, userId);

    // Add XP on right swipe (correct answer)
    if (direction === "right") {
      await addKartXP(10, userId);
    }

    const updatedAllWords = allWords.map((w) =>
      w.id === currentWord.id ? { ...w, stars: newStars } : w
    );
    setAllWords(updatedAllWords);
    
    const updatedSessionWords = sessionWords.map((w) =>
      w.id === currentWord.id ? { ...w, stars: newStars } : w
    );
    setSessionWords(updatedSessionWords);

    toast[direction === "right" ? "success" : "info"](
      direction === "right"
        ? `"${currentWord.english}" → ${newStars} Yıldız! 🌟`
        : `"${currentWord.english}" → 1 Yıldız, tekrar çalışalım 📚`,
      { duration: 2000 }
    );

    if (currentIndex + 1 >= sessionWords.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    
    const lastEntry = history[history.length - 1];
    
    updateWordStars(lastEntry.wordId, lastEntry.previousStars);
    await updateWordStarsInSupabase(lastEntry.wordId, lastEntry.previousStars, userId);
    
    const updatedAllWords = allWords.map((w) =>
      w.id === lastEntry.wordId ? { ...w, stars: lastEntry.previousStars } : w
    );
    setAllWords(updatedAllWords);
    
    const updatedSessionWords = sessionWords.map((w) =>
      w.id === lastEntry.wordId ? { ...w, stars: lastEntry.previousStars } : w
    );
    setSessionWords(updatedSessionWords);
    
    setCurrentIndex(lastEntry.index);
    setSessionComplete(false);
    setHistory(history.slice(0, -1));
    
    toast.info("Geri alındı", { duration: 1500 });
  };

  const handleRestart = () => {
    startNewSession(allWords);
  };

  const calculateProgress = () => {
    if (filteredWords.length === 0) return 0;
    
    let nextSessionSize = 0;
    filteredWords.forEach((word) => {
      const repeatCount = word.stars === 0 ? 1 : 6 - word.stars;
      nextSessionSize += repeatCount;
    });
    
    const minSize = filteredWords.length;
    const maxSize = filteredWords.length * 5;
    
    const progress = ((maxSize - nextSessionSize) / (maxSize - minSize)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const progressPercentage = calculateProgress();
  const visibleCards = sessionWords.slice(currentIndex, currentIndex + 3);

  React.useEffect(() => {
    if (visibleCards.length > 0 && !sessionComplete) {
      const word = visibleCards[0].english;
      setCurrentWordAudio(word);
      speakWord(word);
    }
  }, [currentIndex, sessionComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex flex-col">
      {/* Package Selector */}
      <div className="p-4 pb-2">
        <div className="max-w-2xl mx-auto">
          <PackageSelector
            unlockedPackages={filteredPackages}
            selectedPackage={selectedPackage}
            onSelect={handlePackageChange}
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 pb-0 pt-2">
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
            <Button onClick={() => refetch()}>Tekrar Dene</Button>
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
        words={filteredWords}
        open={showAllWords}
        onOpenChange={setShowAllWords}
        selectedPackage={selectedPackage}
      />
    </div>
  );
};

export default Index;
