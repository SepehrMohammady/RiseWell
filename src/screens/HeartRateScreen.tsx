// Heart Rate Screen - PPG-based heart rate verification
// Note: This is a simplified placeholder. Full PPG implementation requires native camera processing.
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Animated,
    BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { Button } from '../components';
import { colors, spacing, typography, borderRadius } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'HeartRate'>;

// Simulated heart rate range for demo
const MIN_HR = 60;
const MAX_HR = 100;

export const HeartRateScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { onComplete } = route.params;

    const [phase, setPhase] = useState<'instruction' | 'measuring' | 'result'>('instruction');
    const [progress, setProgress] = useState(0);
    const [heartRate, setHeartRate] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Prevent back button
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => true;
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [])
    );

    useEffect(() => {
        if (phase === 'measuring') {
            startMeasurement();
            startPulseAnimation();
        }
    }, [phase]);

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const startMeasurement = () => {
        // Simulate measurement progress
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 2;
            setProgress(currentProgress);

            if (currentProgress >= 100) {
                clearInterval(interval);
                // Generate a "realistic" heart rate
                const hr = Math.floor(Math.random() * (MAX_HR - MIN_HR) + MIN_HR);
                setHeartRate(hr);
                setPhase('result');
            }
        }, 100);
    };

    const handleStartMeasurement = () => {
        setPhase('measuring');
    };

    const handleComplete = () => {
        // Call onComplete which will update state in AlarmRingScreen
        // Don't navigate - AlarmRingScreen will handle next step
        onComplete();
    };

    const renderInstruction = () => (
        <View style={styles.content}>
            <Text style={styles.title}>Heart Rate Check</Text>
            <Text style={styles.subtitle}>
                Verify you're awake by measuring your heart rate
            </Text>

            <View style={styles.instructionContainer}>
                <Animated.View style={[styles.heartIcon, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={styles.heartEmoji}>❤️</Text>
                </Animated.View>

                <View style={styles.instructionSteps}>
                    <Text style={styles.instructionText}>1. Find a well-lit area</Text>
                    <Text style={styles.instructionText}>2. Place your finger on the back camera</Text>
                    <Text style={styles.instructionText}>3. Cover the lens completely</Text>
                    <Text style={styles.instructionText}>4. Hold still for 5 seconds</Text>
                </View>
            </View>

            <Button
                title="Start Measurement"
                onPress={handleStartMeasurement}
                variant="primary"
                size="large"
                fullWidth
            />
        </View>
    );

    const renderMeasuring = () => (
        <View style={styles.content}>
            <Text style={styles.title}>Measuring...</Text>
            <Text style={styles.subtitle}>
                Keep your finger on the camera
            </Text>

            <View style={styles.measureContainer}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={styles.heartEmoji}>❤️</Text>
                </Animated.View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{progress}%</Text>
                </View>
            </View>
        </View>
    );

    const renderResult = () => {
        const isNormal = heartRate >= 60 && heartRate <= 100;

        return (
            <View style={styles.content}>
                <Text style={styles.title}>Measurement Complete</Text>

                <View style={styles.resultContainer}>
                    <Animated.View style={[styles.resultCircle, { transform: [{ scale: pulseAnim }] }]}>
                        <Text style={styles.heartRateValue}>{heartRate}</Text>
                        <Text style={styles.heartRateUnit}>BPM</Text>
                    </Animated.View>

                    <Text style={[styles.resultText, { color: isNormal ? colors.success : colors.warning }]}>
                        {isNormal ? '✓ Normal resting heart rate' : '⚠ Elevated heart rate'}
                    </Text>

                    <Text style={styles.resultSubtext}>
                        You're awake! Great job.
                    </Text>
                </View>

                <Button
                    title="Continue"
                    onPress={handleComplete}
                    variant="primary"
                    size="large"
                    fullWidth
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {phase === 'instruction' && renderInstruction()}
            {phase === 'measuring' && renderMeasuring()}
            {phase === 'result' && renderResult()}
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
        padding: spacing.lg,
        justifyContent: 'center',
    },
    title: {
        fontSize: typography.h2,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    instructionContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    heartIcon: {
        marginBottom: spacing.xl,
    },
    heartEmoji: {
        fontSize: 80,
    },
    instructionSteps: {
        gap: spacing.md,
    },
    instructionText: {
        fontSize: typography.body,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    measureContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    pulseCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: colors.surfaceLight,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    progressText: {
        fontSize: typography.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    resultContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    resultCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    heartRateValue: {
        fontSize: 48,
        fontWeight: typography.bold,
        color: colors.black,
    },
    heartRateUnit: {
        fontSize: typography.body,
        color: colors.black,
        opacity: 0.7,
    },
    resultText: {
        fontSize: typography.body,
        fontWeight: typography.semibold,
        marginBottom: spacing.sm,
    },
    resultSubtext: {
        fontSize: typography.caption,
        color: colors.textSecondary,
    },
});

export default HeartRateScreen;
