// RiseWell Type Definitions

export type ScheduleType = 'workdays' | 'weekends' | 'daily' | 'custom';
export type DifficultyLevel = 1 | 2 | 3 | 4;
export type PuzzleType = 'pattern' | 'logic' | 'math';

export interface Alarm {
  id: string;
  time: string; // HH:mm format
  enabled: boolean;
  schedule: ScheduleType;
  customDays: number[]; // 0 = Sunday, 6 = Saturday
  soundUri: string;
  snoozeDuration: number; // in minutes
  puzzleMode: 'auto' | 'manual';
  puzzleDifficulty: DifficultyLevel;
  heartRateEnabled: boolean;
  flashMemoryEnabled: boolean;
  label: string;
}

export interface FlashCard {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface WakeRecord {
  id: string;
  alarmId: string;
  date: string;
  score: number;
  snoozeCount: number;
  puzzleTimeMs: number;
  puzzleErrors: number;
  flashMemoryCorrect: boolean | null;
  wakeTimeDelta: number; // in minutes, positive = late, negative = early
}

export interface AlarmState {
  alarmId: string;
  snoozeCount: number;
  startTime: number;
  puzzleErrors: number;
}

export type RootStackParamList = {
  Home: undefined;
  AlarmEdit: { alarmId?: string };
  AlarmRing: { alarmId: string; action?: 'dismiss' | 'snooze' };
  Puzzle: {
    difficulty: DifficultyLevel;
    puzzleType: PuzzleType;
    onComplete: () => void;
  };
  HeartRate: { onComplete: () => void };
  FlashCards: undefined;
  FlashCardQuiz: { onComplete: (correct: boolean) => void };
  Statistics: undefined;
};
