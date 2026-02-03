// Alarm Ring Screen - Full Screen Active Alarm with Snooze/Dismiss
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Alarm, RootStackParamList, DifficultyLevel } from '../types';
import { getAlarmById, saveWakeRecord, generateId, getFlashCards } from '../services/StorageService';
import { cancelActiveAlarm, scheduleSnooze, scheduleAlarm } from '../services/NotificationService';
import { calculateWakefulnessScore } from '../services/ScoringService';
import { playSound, stopSound } from '../services/AudioService';
import { Button } from '../components';
import { colors, spacing, typography } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AlarmRing'>;
type RouteProps = RouteProp<RootStackParamList, 'AlarmRing'>;

const VIBRATION_PATTERN = [500, 1000, 500, 1000];

type DismissState = 'initial' | 'puzzle_done' | 'hr_done' | 'flash_done' | 'complete';

export const AlarmRingScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RouteProps>();
    const { alarmId, action } = route.params;

    const [alarm, setAlarm] = useState<Alarm | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [snoozeCount, setSnoozeCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [dismissState, setDismissState] = useState<DismissState>('initial');
    const [flashCardCorrect, setFlashCardCorrect] = useState<boolean | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const puzzleStartTime = useRef<number>(Date.now());
    const puzzleErrors = useRef<number>(0);
    const audioStarted = useRef(false);

    // Prevent back button
    useFocusEffect(
        useCallback(() => {
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
            stopSound();
        };
    }, []);

    // Start audio when alarm is loaded
    useEffect(() => {
        if (alarm && !audioStarted.current) {
            audioStarted.current = true;
            // Play the selected alarm sound on loop
            playSound(alarm.soundUri, true).catch(err => {
                console.log('Audio playback error:', err);
            });
        }
    }, [alarm]);

    // Handle immediate action from notification
    useEffect(() => {
        if (alarm && action && !isProcessing) {
            if (action === 'snooze') {
                handleSnooze();
            } else if (action === 'dismiss') {
                handleDismiss();
            }
        }
    }, [alarm, action]);

    // Handle state transitions after returning from other screens
    useEffect(() => {
        if (dismissState === 'puzzle_done' && alarm) {
            handleAfterPuzzle();
        } else if (dismissState === 'hr_done' && alarm) {
            handleAfterHeartRate();
        } else if (dismissState === 'flash_done' && alarm) {
            completeDismiss();
        }
    }, [dismissState, alarm]);

    const loadAlarm = async () => {
        const loadedAlarm = await getAlarmById(alarmId);
        if (loadedAlarm) {
            setAlarm(loadedAlarm);
        }
    };

    const startVibration = () => {
        Vibration.vibrate(VIBRATION_PATTERN, true);
    };

    const stopAlarmFeedback = () => {
        Vibration.cancel();
        stopSound();
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
        if (snoozeCount === 0) return 1;
        if (snoozeCount === 1) return 1;
        if (snoozeCount === 2) return 2;
        return Math.min(4, snoozeCount) as DifficultyLevel;
    };

    const getDifficultyForDismiss = (): DifficultyLevel => {
        if (!alarm) return 2;
        const baseDifficulty = alarm.puzzleMode === 'auto' ? 2 : alarm.puzzleDifficulty;
        return Math.min(4, baseDifficulty + Math.floor(snoozeCount / 2)) as DifficultyLevel;
    };

    // Handle Snooze - requires easy puzzle
    const handleSnooze = () => {
        if (!alarm || isProcessing) return;
        setIsProcessing(true);
        stopAlarmFeedback();
        puzzleStartTime.current = Date.now();
        puzzleErrors.current = 0;

        const difficulty = getDifficultyForSnooze();

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

        setSnoozeCount(prev => prev + 1);
        await scheduleSnooze(alarm, alarm.snoozeDuration);
        await cancelActiveAlarm(alarm.id);

        // Reset processing state before navigation
        setIsProcessing(false);

        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    // Handle Dismiss - optional puzzle + optional HR + optional flash card
    const handleDismiss = () => {
        if (!alarm || isProcessing) return;
        setIsProcessing(true);
        stopAlarmFeedback();
        puzzleStartTime.current = Date.now();
        puzzleErrors.current = 0;

        // Check if puzzle is enabled
        if (alarm.puzzleEnabled) {
            const difficulty = getDifficultyForDismiss();
            navigation.navigate('Puzzle', {
                difficulty,
                puzzleType: 'pattern',
                onComplete: () => {
                    setDismissState('puzzle_done');
                },
            });
        } else {
            // Skip puzzle, go directly to next challenge or complete
            setDismissState('puzzle_done');
        }
    };

    const handleAfterPuzzle = async () => {
        if (!alarm) return;

        // Check if heart rate is needed
        if (alarm.heartRateEnabled) {
            navigation.navigate('HeartRate', {
                onComplete: () => {
                    setDismissState('hr_done');
                },
            });
        } else {
            // Skip to flash card or complete
            handleAfterHeartRate();
        }
    };

    const handleAfterHeartRate = async () => {
        if (!alarm) return;

        // Check if flash card is needed
        if (alarm.flashMemoryEnabled) {
            const cards = await getFlashCards();
            if (cards.length > 0) {
                navigation.navigate('FlashCardQuiz', {
                    onComplete: (correct: boolean) => {
                        setFlashCardCorrect(correct);
                        setDismissState('flash_done');
                    },
                });
                return;
            }
        }

        // No flash card needed or no cards available - complete immediately
        setDismissState('complete');
        completeDismiss();
    };

    const completeDismiss = async () => {
        if (!alarm) return;

        const puzzleTimeMs = Date.now() - puzzleStartTime.current;

        const [alarmHours, alarmMinutes] = alarm.time.split(':').map(Number);
        const alarmTime = new Date();
        alarmTime.setHours(alarmHours, alarmMinutes, 0, 0);
        const wakeTimeDelta = Math.round((Date.now() - alarmTime.getTime()) / 60000);

        const score = calculateWakefulnessScore(
            puzzleTimeMs,
            puzzleErrors.current,
            snoozeCount,
            wakeTimeDelta,
            flashCardCorrect
        );

        await saveWakeRecord({
            id: generateId(),
            alarmId: alarm.id,
            date: new Date().toISOString(),
            score: score.total,
            snoozeCount,
            puzzleTimeMs,
            puzzleErrors: puzzleErrors.current,
            flashMemoryCorrect: flashCardCorrect,
            wakeTimeDelta,
        });

        await cancelActiveAlarm(alarm.id);
        await scheduleAlarm(alarm);

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

            <Animated.View
                style={[
                    styles.pulseBackground,
                    { transform: [{ scale: pulseAnim }] },
                ]}
            />

            <View style={styles.content}>
                <Animated.View style={[styles.timeContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
                </Animated.View>

                <Text style={styles.alarmLabel}>{alarm.label || 'Wake Up!'}</Text>
                <Text style={styles.alarmSchedule}>Alarm: {alarm.time}</Text>

                {snoozeCount > 0 && (
                    <View style={styles.snoozeBadge}>
                        <Text style={styles.snoozeBadgeText}>
                            😴 Snoozed {snoozeCount}x
                        </Text>
                    </View>
                )}

                <View style={styles.featuresInfo}>
                    {alarm.heartRateEnabled && (
                        <Text style={styles.featureText}>❤️ Heart rate check required</Text>
                    )}
                    {alarm.flashMemoryEnabled && (
                        <Text style={styles.featureText}>🧠 Flash card quiz required</Text>
                    )}
                </View>

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

                <Text style={styles.hintText}>
                    Both options require solving a puzzle
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
        marginTop: 100,
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
    },
});

export default AlarmRingScreen;
