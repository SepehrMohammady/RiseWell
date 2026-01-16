// Flash Card Quiz Screen - Answer flash cards to dismiss alarm
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { FlashCard, RootStackParamList } from '../types';
import { getFlashCards } from '../services/StorageService';
import { Button, Card } from '../components';
import { colors, spacing, typography, borderRadius } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'FlashCardQuiz'>;

export const FlashCardQuizScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { onComplete } = route.params;

    const [cards, setCards] = useState<FlashCard[]>([]);
    const [currentCard, setCurrentCard] = useState<FlashCard | null>(null);
    const [usedCardIds, setUsedCardIds] = useState<string[]>([]);
    const [userAnswer, setUserAnswer] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    // Prevent back button
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => true;
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [])
    );

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        const loadedCards = await getFlashCards();
        setCards(loadedCards);
        if (loadedCards.length > 0) {
            selectRandomCard(loadedCards, []);
        }
    };

    const selectRandomCard = (availableCards: FlashCard[], excludeIds: string[]) => {
        const available = availableCards.filter(c => !excludeIds.includes(c.id));

        if (available.length === 0) {
            // All cards used, reset
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            setCurrentCard(availableCards[randomIndex]);
            setUsedCardIds([availableCards[randomIndex].id]);
        } else {
            const randomIndex = Math.floor(Math.random() * available.length);
            setCurrentCard(available[randomIndex]);
        }

        setUserAnswer('');
        setShowCorrectAnswer(false);
        setIsCorrect(null);
    };

    const normalizeAnswer = (answer: string): string => {
        return answer.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    };

    const handleSubmit = () => {
        if (!currentCard || !userAnswer.trim()) return;

        const normalizedUser = normalizeAnswer(userAnswer);
        const normalizedCorrect = normalizeAnswer(currentCard.answer);

        if (normalizedUser === normalizedCorrect) {
            // Correct!
            setIsCorrect(true);
            setTimeout(() => {
                onComplete(attempts === 0); // First try = true
                navigation.goBack();
            }, 1000);
        } else {
            // Wrong
            setAttempts(prev => prev + 1);
            setShowCorrectAnswer(true);
            setIsCorrect(false);
        }
    };

    const handleTryAnother = () => {
        const newUsedIds = [...usedCardIds, currentCard?.id || ''];
        setUsedCardIds(newUsedIds);
        selectRandomCard(cards, newUsedIds);
        setAttempts(0);
    };

    if (!currentCard) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Flash Memory Quiz</Text>
                <Text style={styles.subtitle}>Answer correctly to dismiss the alarm</Text>

                <Card style={styles.questionCard}>
                    <Text style={styles.questionLabel}>Question:</Text>
                    <Text style={styles.questionText}>{currentCard.question}</Text>
                </Card>

                <View style={styles.answerSection}>
                    <TextInput
                        style={[
                            styles.answerInput,
                            isCorrect === true && styles.answerInputCorrect,
                            isCorrect === false && styles.answerInputWrong,
                        ]}
                        placeholder="Type your answer..."
                        placeholderTextColor={colors.textMuted}
                        value={userAnswer}
                        onChangeText={setUserAnswer}
                        onSubmitEditing={handleSubmit}
                        autoFocus
                        editable={!showCorrectAnswer}
                    />

                    {!showCorrectAnswer ? (
                        <Button
                            title="Check Answer"
                            onPress={handleSubmit}
                            variant="primary"
                            size="large"
                            fullWidth
                            disabled={!userAnswer.trim()}
                        />
                    ) : (
                        <View style={styles.wrongAnswerSection}>
                            <Card style={styles.correctAnswerCard} variant="outlined">
                                <Text style={styles.correctAnswerLabel}>Correct answer:</Text>
                                <Text style={styles.correctAnswerText}>{currentCard.answer}</Text>
                            </Card>

                            <Button
                                title="Try Another Card"
                                onPress={handleTryAnother}
                                variant="primary"
                                size="large"
                                fullWidth
                            />
                        </View>
                    )}
                </View>

                {isCorrect === true && (
                    <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackCorrect}>✓ Correct!</Text>
                    </View>
                )}
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
        padding: spacing.lg,
    },
    loadingText: {
        fontSize: typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    title: {
        fontSize: typography.h2,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xs,
        marginBottom: spacing.xl,
    },
    questionCard: {
        marginBottom: spacing.xl,
    },
    questionLabel: {
        fontSize: typography.small,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    questionText: {
        fontSize: typography.h3,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
    answerSection: {
        gap: spacing.md,
    },
    answerInput: {
        fontSize: typography.h3,
        color: colors.textPrimary,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        textAlign: 'center',
        borderWidth: 2,
        borderColor: colors.surfaceLight,
    },
    answerInputCorrect: {
        borderColor: colors.success,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    answerInputWrong: {
        borderColor: colors.error,
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
    },
    wrongAnswerSection: {
        gap: spacing.md,
    },
    correctAnswerCard: {
        borderColor: colors.success,
    },
    correctAnswerLabel: {
        fontSize: typography.small,
        color: colors.success,
        marginBottom: spacing.xs,
    },
    correctAnswerText: {
        fontSize: typography.h3,
        fontWeight: typography.semibold,
        color: colors.success,
    },
    feedbackContainer: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    feedbackCorrect: {
        fontSize: typography.h2,
        fontWeight: typography.bold,
        color: colors.success,
    },
});

export default FlashCardQuizScreen;
