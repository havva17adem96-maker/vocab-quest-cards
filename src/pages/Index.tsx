import { useEffect, useState } from "react";
import { Word } from "@/types/word";
import { FlashCard } from "@/components/FlashCard";
import { AllWordsModal } from "@/components/AllWordsModal";
import {
  parseCSV,
  getWordsWithProgress,
  updateWordStars,
  createLearningSession,
} from "@/utils/wordParser";
import { Button } from "@/components/ui/button";
import { List, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import wordsCSV from "@/data/words.csv?raw";

const Index = () => {
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllWords, setShowAllWords] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    const parsed = parseCSV(wordsCSV);
    const withProgress = getWordsWithProgress(parsed);
    setAllWords(withProgress);
    startNewSession(withProgress);
  }, []);

  const startNewSession = (words: Word[]) => {
    const session = createLearningSession(words);
    setSessionWords(session);
    setCurrentIndex(0);
    setSessionComplete(false);
  };

  const handleSwipe = (direction: "left" | "right") => {
    if (currentIndex >= sessionWords.length) return;

    const currentWord = sessionWords[currentIndex];
    const newStars: typeof currentWord.stars = direction === "right" ? 5 : 1;

    // Update progress
    updateWordStars(currentWord.id, newStars);

    // Update local state
    const updatedAllWords = allWords.map((w) =>
      w.id === currentWord.id ? { ...w, stars: newStars } : w
    );
    setAllWords(updatedAllWords);

    // Show feedback
    toast[direction === "right" ? "success" : "info"](
      direction === "right"
        ? `"${currentWord.english}" → 5 Yıldız! 🌟`
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

  const handleRestart = () => {
    startNewSession(allWords);
  };

  const visibleCards = sessionWords.slice(currentIndex, currentIndex + 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex flex-col">
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
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => setShowAllWords(true)}
        >
          <List className="w-5 h-5" />
        </Button>
      </header>

      {/* Card Stack */}
      <div className="flex-1 relative max-w-2xl w-full mx-auto">
        {sessionComplete ? (
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
