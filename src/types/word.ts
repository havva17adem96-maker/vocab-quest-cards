export type StarLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface Word {
  id: string;
  english: string;
  turkish: string;
  level: string;
  stars: StarLevel;
}

export interface WordProgress {
  [wordId: string]: StarLevel;
}
