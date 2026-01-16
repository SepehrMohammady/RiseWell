// Scoring Service - Calculate wakefulness score
import { WakeRecord } from '../types';

interface ScoreComponents {
    puzzleScore: number;      // 0-50
    snoozeScore: number;      // 0-30
    consistencyScore: number; // 0-20
    flashMemoryScore: number; // 0-10
    total: number;            // 0-100 (or 110 with bonus)
}

// Calculate puzzle performance score (0-50)
function calculatePuzzleScore(timeMs: number, errors: number): number {
    // Base score starts at 50
    let score = 50;

    // Time penalty: lose 5 points per 10 seconds over 20 seconds
    const timeSeconds = timeMs / 1000;
    if (timeSeconds > 20) {
        const timePenalty = Math.floor((timeSeconds - 20) / 10) * 5;
        score -= Math.min(timePenalty, 25); // Max 25 point penalty for time
    }

    // Error penalty: 10 points per error
    score -= errors * 10;

    return Math.max(0, score);
}

// Calculate snooze behavior score (0-30)
function calculateSnoozeScore(snoozeCount: number): number {
    switch (snoozeCount) {
        case 0: return 30;
        case 1: return 20;
        case 2: return 10;
        default: return 0;
    }
}

// Calculate consistency bonus (0-20)
function calculateConsistencyScore(wakeTimeDeltaMinutes: number): number {
    const absDelta = Math.abs(wakeTimeDeltaMinutes);

    if (absDelta <= 10) return 20;
    if (absDelta <= 20) return 10;
    return 0;
}

// Calculate flash memory bonus (0-10)
function calculateFlashMemoryScore(correct: boolean | null): number {
    if (correct === null) return 0; // Not enabled
    return correct ? 10 : 0;
}

// Main scoring function
export function calculateWakefulnessScore(
    puzzleTimeMs: number,
    puzzleErrors: number,
    snoozeCount: number,
    wakeTimeDeltaMinutes: number,
    flashMemoryCorrect: boolean | null = null
): ScoreComponents {
    const puzzleScore = calculatePuzzleScore(puzzleTimeMs, puzzleErrors);
    const snoozeScore = calculateSnoozeScore(snoozeCount);
    const consistencyScore = calculateConsistencyScore(wakeTimeDeltaMinutes);
    const flashMemoryScore = calculateFlashMemoryScore(flashMemoryCorrect);

    const total = puzzleScore + snoozeScore + consistencyScore + flashMemoryScore;

    return {
        puzzleScore,
        snoozeScore,
        consistencyScore,
        flashMemoryScore,
        total: Math.min(total, 100), // Cap at 100
    };
}

// Get score grade/rating
export function getScoreGrade(score: number): { grade: string; color: string; message: string } {
    if (score >= 90) {
        return { grade: 'A+', color: '#4CAF50', message: 'Excellent morning!' };
    } else if (score >= 80) {
        return { grade: 'A', color: '#8BC34A', message: 'Great start!' };
    } else if (score >= 70) {
        return { grade: 'B', color: '#CDDC39', message: 'Good effort!' };
    } else if (score >= 60) {
        return { grade: 'C', color: '#FFC107', message: 'Room to improve' };
    } else if (score >= 50) {
        return { grade: 'D', color: '#FF9800', message: 'Try harder tomorrow' };
    } else {
        return { grade: 'F', color: '#F44336', message: 'Sleep quality matters!' };
    }
}

// Calculate average score from records
export function calculateAverageScore(records: WakeRecord[]): number {
    if (records.length === 0) return 0;
    const total = records.reduce((sum, r) => sum + r.score, 0);
    return Math.round(total / records.length);
}

// Get weekly trend
export function getWeeklyTrend(records: WakeRecord[]): 'up' | 'down' | 'stable' {
    if (records.length < 3) return 'stable';

    const sorted = [...records].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvg = calculateAverageScore(firstHalf);
    const secondAvg = calculateAverageScore(secondHalf);

    const diff = secondAvg - firstAvg;

    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
}
