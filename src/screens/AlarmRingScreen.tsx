// Alarm Ring Screen - Full Screen Active Alarm with Snooze/Dismiss
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Vibration,
    Animated,
    StatusBar,
    BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
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
    const [snoozeCount, setSnoozeCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [puzzleCompleted, setPuzzleCompleted] = useState(false);
    const [heartRateCompleted, setHeartRateCompleted] = useState(false);
    const [flashCardCompleted, setFlashCardCompleted] = useState(false);
    const [flashCardCorrect, setFlashCardCorrect] = useState<boolean | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const puzzleStartTime = useRef<number>(Date.now());
    const puzzleErrors = useRef<number>(0);

    // Prevent back button
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => true;
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [])
    );

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

    const stopVibration = () => {
        Vibration.cancel();
    };

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const getDifficultyForSnooze = (): DifficultyLevel => {
        // Snooze puzzles are easier, but get harder with more snoozes
        if (snoozeCount === 0) return 1;
        if (snoozeCount === 1) return 1;
        if (snoozeCount === 2) return 2;
        return Math.min(4, snoozeCount) as DifficultyLevel;
    };

    const getDifficultyForDismiss = (): DifficultyLevel => {
        if (!alarm) return 2;
        // Dismiss is always harder
        const baseDifficulty = alarm.puzzleMode === 'auto' ? 2 : alarm.puzzleDifficulty;
        return Math.min(4, baseDifficulty + Math.floor(snoozeCount / 2)) as DifficultyLevel;
    };

    // Handle Snooze - requires easy puzzle
    const handleSnooze = () => {
        if (!alarm || isProcessing) return;
        setIsProcessing(true);
        stopVibration();
        puzzleStartTime.current = Date.now();
        puzzleErrors.current = 0;

        const difficulty = getDifficultyForSnooze();

        // Navigate to puzzle - on complete, schedule snooze
        navigation.navigate('Puzzle', {
            difficulty,
            puzzleType: 'pattern',
            onComplete: () => {
                // Puzzle completed - now schedule snooze
                completeSnooze();
            },
        });
    };

    const completeSnooze = async () => {
        if (!alarm) return;

        setSnoozeCount(prev => prev + 1);

        // Schedule snooze notification
        await scheduleSnooze(alarm, alarm.snoozeDuration);

        // Navigate back to home
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    // Handle Dismiss - requires harder puzzle + optional HR + optional flash card
    const handleDismiss = () => {
        if (!alarm || isProcessing) return;
        setIsProcessing(true);
        stopVibration();
        puzzleStartTime.current = Date.now();
        puzzleErrors.current = 0;

        const difficulty = getDifficultyForDismiss();

        // Navigate to puzzle first
        navigation.navigate('Puzzle', {
            difficulty,
            puzzleType: 'pattern',
            onComplete: () => {
                // Puzzle completed
                setPuzzleCompleted(true);
                checkNextDismissStep(true, false, null);
            },
        });
    };

    const checkNextDismissStep = async (
        puzzleDone: boolean,
        hrDone: boolean,
        flashDone: boolean | null
    ) => {
        if (!alarm) return;

        // Check if heart rate is needed and not done
        if (alarm.heartRateEnabled && !hrDone) {
            navigation.navigate('HeartRate', {
                onComplete: () => {
                    setHeartRateCompleted(true);
                    checkNextDismissStep(true, true, flashDone);
                },
            });
            return;
        }

        // Check if flash card is needed and not done
        if (alarm.flashMemoryEnabled && flashDone === null) {
            const cards = await getFlashCards();
            if (cards.length > 0) {
                navigation.navigate('FlashCardQuiz', {
                    onComplete: (correct: boolean) => {
                        setFlashCardCompleted(true);
                        setFlashCardCorrect(correct);
                        checkNextDismissStep(true, hrDone, correct);
                    },
                });
                return;
            }
        }

        // All steps completed - finalize dismiss
        await completeDismiss(flashDone);
    };

    const completeDismiss = async (flashMemoryCorrect: boolean | null) => {
        if (!alarm) return;

        const puzzleTimeMs = Date.now() - puzzleStartTime.current;

        // Calculate wake time delta
        const [alarmHours, alarmMinutes] = alarm.time.split(':').map(Number);
        const alarmTime = new Date();
        alarmTime.setHours(alarmHours, alarmMinutes, 0, 0);
        const wakeTimeDelta = Math.round((Date.now() - alarmTime.getTime()) / 60000);

        // Calculate score
        const score = calculateWakefulnessScore(
            puzzleTimeMs,
            puzzleErrors.current,
            snoozeCount,
            wakeTimeDelta,
            flashMemoryCorrect
        );

        // Save wake record
        await saveWakeRecord({
            id: generateId(),
            alarmId: alarm.id,
            date: new Date().toISOString(),
            score: score.total,
            snoozeCount,
            puzzleTimeMs,
            puzzleErrors: puzzleErrors.current,
            flashMemoryCorrect,
            wakeTimeDelta,
        });

        // Cancel active notification
        await cancelActiveAlarm(alarm.id);

        // Reschedule for next occurrence
        await scheduleAlarm(alarm);

        // Navigate to home
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
            <View style={styles.container}>
                <StatusBar hidden />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Background pulse effect */}
            <Animated.View
                style={[
                    styles.pulseBackground,
                    { transform: [{ scale: pulseAnim }] },
                ]}
            />

            <View style={styles.content}>
                {/* Current Time - Large display */}
                <Animated.View style={[styles.timeContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
                </Animated.View>

                {/* Alarm Info */}
                <Text style={styles.alarmLabel}>{alarm.label || 'Wake Up!'}</Text>
                <Text style={styles.alarmSchedule}>Scheduled for {alarm.time}</Text>

                {/* Snooze Count */}
                {snoozeCount > 0 && (
                    <View style={styles.snoozeBadge}>
                        <Text style={styles.snoozeBadgeText}>
                            😴 Snoozed {snoozeCount} time{snoozeCount > 1 ? 's' : ''}
                        </Text>
                    </View>
                )}

                {/* Features enabled */}
                <View style={styles.featuresInfo}>
                    {alarm.heartRateEnabled && (
                        <Text style={styles.featureText}>❤️ Heart rate check required</Text>
                    )}
                    {alarm.flashMemoryEnabled && (
                        <Text style={styles.featureText}>🧠 Flash card quiz required</Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Button
                        title={`😴 Snooze (${alarm.snoozeDuration}min)`}
                        onPress={handleSnooze}
                        variant="secondary"
                        size="large"
                        fullWidth
                        disabled={isProcessing}
                    />

                    <Button
                        title="🌅 Dismiss Alarm"
                        onPress={handleDismiss}
                        variant="primary"
                        size="large"
                        fullWidth
                        style={{ marginTop: spacing.lg }}
                        disabled={isProcessing}
                    />
                </View>

                {/* Hint */}
                <Text style={styles.hintText}>
                    Snooze: Solve easy puzzle{'\n'}
                    Dismiss: Solve harder puzzle
                    {alarm.heartRateEnabled ? ' + HR check' : ''}
                    {alarm.flashMemoryEnabled ? ' + quiz' : ''}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    pulseBackground: {
        position: 'absolute',
        top: -100,
        left: -100,
        right: -100,
        bottom: -100,
        backgroundColor: colors.primary,
        opacity: 0.05,
        borderRadius: 1000,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    loadingText: {
        fontSize: typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    timeContainer: {
        marginBottom: spacing.xl,
    },
    currentTime: {
        fontSize: 96,
        fontWeight: typography.bold,
        color: colors.primary,
        fontVariant: ['tabular-nums'],
        textShadowColor: 'rgba(245, 166, 35, 0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 20,
    },
    alarmLabel: {
        fontSize: typography.h1,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    alarmSchedule: {
        fontSize: typography.body,
        color: colors.textSecondary,
    },
    snoozeBadge: {
        backgroundColor: colors.warning,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 24,
        marginTop: spacing.lg,
    },
    snoozeBadgeText: {
        fontSize: typography.body,
        color: colors.black,
        fontWeight: typography.semibold,
    },
    featuresInfo: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    featureText: {
        fontSize: typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
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
        lineHeight: 22,
    },
});

export default AlarmRingScreen;
