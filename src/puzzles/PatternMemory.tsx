// Pattern Memory Puzzle - Primary Puzzle Type
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { DifficultyLevel } from '../types';
import { colors, spacing, typography, borderRadius } from '../theme';

interface PatternMemoryProps {
    difficulty: DifficultyLevel;
    onComplete: (errors: number, timeMs: number) => void;
}

const COLORS = [
    '#F44336', // Red
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FFEB3B', // Yellow
    '#9C27B0', // Purple
    '#FF9800', // Orange
];

const GRID_SIZE = 3; // 3x3 grid

export const PatternMemory: React.FC<PatternMemoryProps> = ({
    difficulty,
    onComplete,
}) => {
    const [phase, setPhase] = useState<'showing' | 'input' | 'feedback'>('showing');
    const [pattern, setPattern] = useState<number[]>([]);
    const [userPattern, setUserPattern] = useState<number[]>([]);
    const [currentShowIndex, setCurrentShowIndex] = useState(-1);
    const [errors, setErrors] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    const startTime = useRef<number>(Date.now());
    const cellAnimations = useRef<Animated.Value[]>(
        Array(GRID_SIZE * GRID_SIZE).fill(null).map(() => new Animated.Value(0))
    ).current;

    // Pattern length based on difficulty
    const getPatternLength = () => {
        switch (difficulty) {
            case 1: return 3;
            case 2: return 4;
            case 3: return 5;
            case 4: return 6;
            default: return 4;
        }
    };

    // Generate random pattern
    useEffect(() => {
        const length = getPatternLength();
        const newPattern: number[] = [];

        for (let i = 0; i < length; i++) {
            let nextCell: number;
            do {
                nextCell = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
            } while (newPattern.length > 0 && newPattern[newPattern.length - 1] === nextCell);
            newPattern.push(nextCell);
        }

        setPattern(newPattern);
        startTime.current = Date.now();
        showPattern(newPattern);
    }, []);

    // Show the pattern sequence
    const showPattern = async (patternToShow: number[]) => {
        setPhase('showing');

        // Initial delay
        await delay(500);

        for (let i = 0; i < patternToShow.length; i++) {
            setCurrentShowIndex(i);

            // Animate the cell
            const cellIndex = patternToShow[i];
            Animated.sequence([
                Animated.timing(cellAnimations[cellIndex], {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false,
                }),
                Animated.timing(cellAnimations[cellIndex], {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                }),
            ]).start();

            await delay(700);
        }

        setCurrentShowIndex(-1);
        setPhase('input');
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Handle cell tap during input phase
    const handleCellPress = (index: number) => {
        if (phase !== 'input') return;

        const nextIndex = userPattern.length;
        const expectedCell = pattern[nextIndex];

        if (index === expectedCell) {
            // Correct!
            const newUserPattern = [...userPattern, index];
            setUserPattern(newUserPattern);

            // Flash green
            Animated.sequence([
                Animated.timing(cellAnimations[index], {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: false,
                }),
                Animated.timing(cellAnimations[index], {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: false,
                }),
            ]).start();

            // Check if pattern complete
            if (newUserPattern.length === pattern.length) {
                setFeedback('correct');
                setPhase('feedback');

                setTimeout(() => {
                    const timeMs = Date.now() - startTime.current;
                    onComplete(errors, timeMs);
                }, 500);
            }
        } else {
            // Wrong!
            setErrors(prev => prev + 1);
            setFeedback('wrong');

            // Flash red and reset
            setTimeout(() => {
                setFeedback(null);
                setUserPattern([]);
                showPattern(pattern);
            }, 1000);
        }
    };

    // Get cell color based on state
    const getCellColor = (index: number) => {
        if (phase === 'showing' && pattern[currentShowIndex] === index) {
            return colors.primary;
        }

        if (phase === 'feedback') {
            if (feedback === 'correct') return colors.success;
            if (feedback === 'wrong') return colors.error;
        }

        if (phase === 'input' && userPattern.includes(index)) {
            const patternIndex = userPattern.indexOf(index);
            return COLORS[patternIndex % COLORS.length];
        }

        return colors.surfaceLight;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pattern Memory</Text>

            <Text style={styles.instruction}>
                {phase === 'showing'
                    ? 'Watch the pattern...'
                    : 'Repeat the pattern!'}
            </Text>

            <View style={styles.progressContainer}>
                {pattern.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            {
                                backgroundColor: userPattern.length > i
                                    ? colors.primary
                                    : colors.surfaceLight,
                            },
                        ]}
                    />
                ))}
            </View>

            <View style={styles.grid}>
                {Array(GRID_SIZE * GRID_SIZE).fill(null).map((_, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.cell,
                            {
                                backgroundColor: cellAnimations[index].interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [colors.surfaceLight, colors.primary],
                                }),
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.cellTouchable}
                            onPress={() => handleCellPress(index)}
                            disabled={phase !== 'input'}
                            activeOpacity={0.7}
                        />
                    </Animated.View>
                ))}
            </View>

            {errors > 0 && (
                <Text style={styles.errorText}>
                    Attempts: {errors + 1}
                </Text>
            )}

            <Text style={styles.difficultyText}>
                Difficulty: {'★'.repeat(difficulty)}{'☆'.repeat(4 - difficulty)}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    title: {
        fontSize: typography.h2,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    instruction: {
        fontSize: typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    progressContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    grid: {
        width: 280,
        height: 280,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    cell: {
        width: 88,
        height: 88,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    cellTouchable: {
        flex: 1,
    },
    errorText: {
        fontSize: typography.caption,
        color: colors.error,
        marginTop: spacing.lg,
    },
    difficultyText: {
        fontSize: typography.caption,
        color: colors.textMuted,
        marginTop: spacing.md,
    },
});

export default PatternMemory;
