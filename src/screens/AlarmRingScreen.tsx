// Alarm Ring Screen - Active Alarm with Snooze/Dismiss
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Vibration,
    Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alarm, RootStackParamList, DifficultyLevel, AlarmState } from '../types';
import { getAlarmById, saveWakeRecord, generateId, getFlashCards } from '../services/StorageService';
import { cancelActiveAlarm, scheduleSnooze, scheduleAlarm } from '../services/NotificationService';
import { calculateWakefulnessScore } from '../services/ScoringService';
import { Button } from '../components';
import { colors, spacing, typography } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AlarmRing'>;
type RouteProps = RouteProp<RootStackParamList, 'AlarmRing'>;

const VIBRATION_PATTERN = [500, 1000, 500, 1000];

export const AlarmRingScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RouteProps>();
    const { alarmId } = route.params;

    const [alarm, setAlarm] = useState<Alarm | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [alarmState, setAlarmState] = useState<AlarmState>({
        alarmId: alarmId,
        snoozeCount: 0,
        startTime: Date.now(),
        puzzleErrors: 0,
    });
    const [dismissStep, setDismissStep] = useState<'puzzle' | 'heartrate' | 'flashcard' | 'done'>('puzzle');
    const [isProcessing, setIsProcessing] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const puzzleStartTime = useRef<number>(Date.now());
    const puzzleErrors = useRef<number>(0);

    useEffect(() => {
        loadAlarm();
        startVibration();
        startPulseAnimation();

        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            clearInterval(interval);
            Vibration.cancel();
        };
    }, []);

    const loadAlarm = async () => {
        const loadedAlarm = await getAlarmById(alarmId);
        if (loadedAlarm) {
            setAlarm(loadedAlarm);
        }
    };

    const startVibration = () => {
        Vibration.vibrate(VIBRATION_PATTERN, true);
    };

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const getDifficultyForSnooze = (snoozeCount: number): DifficultyLevel => {
        // Each snooze increases difficulty
        if (snoozeCount === 0) return 1; // First snooze: easiest
        if (snoozeCount === 1) return 1; // Easy
        if (snoozeCount === 2) return 2; // Medium
        if (snoozeCount === 3) return 3; // Hard
        return 4; // Expert
    };

    const getDifficultyForDismiss = (snoozeCount: number, alarmDifficulty: DifficultyLevel): DifficultyLevel => {
        // Dismiss is always harder than snooze
        const baseDifficulty = Math.max(2, alarmDifficulty);
        return Math.min(4, baseDifficulty + Math.floor(snoozeCount / 2)) as DifficultyLevel;
    };

    const handleSnooze = async () => {
        if (!alarm || isProcessing) return;
        setIsProcessing(true);

        Vibration.cancel();
        puzzleStartTime.current = Date.now();
        puzzleErrors.current = 0;

        const difficulty = getDifficultyForSnooze(alarmState.snoozeCount);

        // Navigate to puzzle for snooze
        navigation.navigate('Puzzle', {
            difficulty,
            puzzleType: 'pattern',
            onComplete: () => {
                completeSnooze();
            },
        });
    };

    const completeSnooze = async () => {
        if (!alarm) return;

        // Update snooze count
        setAlarmState(prev => ({
            ...prev,
            snoozeCount: prev.snoozeCount + 1,
        }));

        // Schedule snooze notification
        await scheduleSnooze(alarm, alarm.snoozeDuration);

        // Go back to home
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    const handleDismiss = async () => {
        if (!alarm || isProcessing) return;
        setIsProcessing(true);

        Vibration.cancel();
        puzzleStartTime.current = Date.now();
        puzzleErrors.current = 0;

        const difficulty = alarm.puzzleMode === 'auto'
            ? getDifficultyForDismiss(alarmState.snoozeCount, 2)
            : getDifficultyForDismiss(alarmState.snoozeCount, alarm.puzzleDifficulty);

        // Navigate to puzzle for dismiss
        navigation.navigate('Puzzle', {
            difficulty,
            puzzleType: 'pattern',
            onComplete: () => {
                onPuzzleComplete();
            },
        });
    };

    const onPuzzleComplete = async () => {
        if (!alarm) return;

        const puzzleTime = Date.now() - puzzleStartTime.current;

        // Check if heart rate verification is needed
        if (alarm.heartRateEnabled) {
            setDismissStep('heartrate');
            navigation.navigate('HeartRate', {
                onComplete: () => onHeartRateComplete(puzzleTime),
            });
            return;
        }

        // Check if flash memory is needed
        if (alarm.flashMemoryEnabled) {
            const cards = await getFlashCards();
            if (cards.length > 0) {
                setDismissStep('flashcard');
                navigation.navigate('FlashCardQuiz', {
                    onComplete: (correct) => onFlashCardComplete(puzzleTime, correct),
                });
                return;
            }
        }

        // Complete dismiss
        await completeDismiss(puzzleTime, null);
    };

    const onHeartRateComplete = async (puzzleTime: number) => {
        if (!alarm) return;

        // Check if flash memory is needed
        if (alarm.flashMemoryEnabled) {
            const cards = await getFlashCards();
            if (cards.length > 0) {
                setDismissStep('flashcard');
                navigation.navigate('FlashCardQuiz', {
                    onComplete: (correct) => onFlashCardComplete(puzzleTime, correct),
                });
                return;
            }
        }

        await completeDismiss(puzzleTime, null);
    };

    const onFlashCardComplete = async (puzzleTime: number, correct: boolean) => {
        await completeDismiss(puzzleTime, correct);
    };

    const completeDismiss = async (puzzleTimeMs: number, flashMemoryCorrect: boolean | null) => {
        if (!alarm) return;

        // Calculate wake time delta
        const [alarmHours, alarmMinutes] = alarm.time.split(':').map(Number);
        const alarmTime = new Date();
        alarmTime.setHours(alarmHours, alarmMinutes, 0, 0);
        const wakeTimeDelta = Math.round((Date.now() - alarmTime.getTime()) / 60000);

        // Calculate score
        const score = calculateWakefulnessScore(
            puzzleTimeMs,
            puzzleErrors.current,
            alarmState.snoozeCount,
            wakeTimeDelta,
            flashMemoryCorrect
        );

        // Save wake record
        await saveWakeRecord({
            id: generateId(),
            alarmId: alarm.id,
            date: new Date().toISOString(),
            score: score.total,
            snoozeCount: alarmState.snoozeCount,
            puzzleTimeMs,
            puzzleErrors: puzzleErrors.current,
            flashMemoryCorrect,
            wakeTimeDelta,
        });

        // Cancel active notification
        await cancelActiveAlarm(alarm.id);

        // Reschedule for next occurrence
        await scheduleAlarm(alarm);

        // Go back to home
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    if (!alarm) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.loadingText}>Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            <View style={styles.content}>
                {/* Current Time */}
                <Animated.View style={[styles.timeContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
                </Animated.View>

                {/* Alarm Info */}
                <Text style={styles.alarmLabel}>{alarm.label || 'Alarm'}</Text>
                <Text style={styles.alarmTime}>Scheduled for {alarm.time}</Text>

                {/* Snooze Count */}
                {alarmState.snoozeCount > 0 && (
                    <View style={styles.snoozeBadge}>
                        <Text style={styles.snoozeBadgeText}>
                            Snoozed {alarmState.snoozeCount} time{alarmState.snoozeCount > 1 ? 's' : ''}
                        </Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Button
                        title={`Snooze (${alarm.snoozeDuration}m)`}
                        onPress={handleSnooze}
                        variant="secondary"
                        size="large"
                        fullWidth
                        disabled={isProcessing}
                    />

                    <Button
                        title="Dismiss"
                        onPress={handleDismiss}
                        variant="primary"
                        size="large"
                        fullWidth
                        style={{ marginTop: spacing.md }}
                        disabled={isProcessing}
                    />
                </View>

                {/* Hints */}
                <Text style={styles.hintText}>
                    Snooze requires an easy puzzle{'\n'}
                    Dismiss requires a harder puzzle
                    {alarm.heartRateEnabled && '\n+ Heart rate check'}
                    {alarm.flashMemoryEnabled && '\n+ Flash card quiz'}
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    loadingText: {
        fontSize: typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    timeContainer: {
        marginBottom: spacing.lg,
    },
    currentTime: {
        fontSize: 80,
        fontWeight: typography.bold,
        color: colors.primary,
        fontVariant: ['tabular-nums'],
    },
    alarmLabel: {
        fontSize: typography.h2,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    alarmTime: {
        fontSize: typography.body,
        color: colors.textSecondary,
    },
    snoozeBadge: {
        backgroundColor: colors.warning,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        marginTop: spacing.lg,
    },
    snoozeBadgeText: {
        fontSize: typography.caption,
        color: colors.black,
        fontWeight: typography.semibold,
    },
    actions: {
        width: '100%',
        marginTop: spacing.xxl,
    },
    hintText: {
        fontSize: typography.small,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.xl,
        lineHeight: 20,
    },
});

export default AlarmRingScreen;
