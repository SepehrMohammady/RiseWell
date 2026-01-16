// Flash Cards Screen - Manage flash cards
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TextInput,
    Alert,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FlashCard } from '../types';
import { getFlashCards, saveFlashCard, deleteFlashCard, generateId } from '../services/StorageService';
import { Button, Card } from '../components';
import { colors, spacing, typography, borderRadius } from '../theme';

const MAX_CARDS = 3;

export const FlashCardsScreen: React.FC = () => {
    const [cards, setCards] = useState<FlashCard[]>([]);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadCards = useCallback(async () => {
        const loadedCards = await getFlashCards();
        setCards(loadedCards);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadCards();
        }, [loadCards])
    );

    const handleSave = async () => {
        if (!question.trim() || !answer.trim()) {
            Alert.alert('Error', 'Please enter both question and answer');
            return;
        }

        if (cards.length >= MAX_CARDS && !editingId) {
            Alert.alert('Limit Reached', `You can only have ${MAX_CARDS} flash cards. Delete one to add more.`);
            return;
        }

        const card: FlashCard = {
            id: editingId || generateId(),
            question: question.trim(),
            answer: answer.trim(),
            createdAt: new Date().toISOString(),
        };

        await saveFlashCard(card);

        setQuestion('');
        setAnswer('');
        setEditingId(null);
        loadCards();
    };

    const handleEdit = (card: FlashCard) => {
        setQuestion(card.question);
        setAnswer(card.answer);
        setEditingId(card.id);
    };

    const handleDelete = async (id: string) => {
        Alert.alert(
            'Delete Card',
            'Are you sure you want to delete this flash card?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteFlashCard(id);
                        if (editingId === id) {
                            setQuestion('');
                            setAnswer('');
                            setEditingId(null);
                        }
                        loadCards();
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        setQuestion('');
        setAnswer('');
        setEditingId(null);
    };

    const renderCard = ({ item }: { item: FlashCard }) => (
        <Card style={styles.cardItem}>
            <TouchableOpacity
                onPress={() => handleEdit(item)}
                onLongPress={() => handleDelete(item.id)}
                activeOpacity={0.7}
            >
                <Text style={styles.cardQuestion}>{item.question}</Text>
                <Text style={styles.cardAnswer}>{item.answer}</Text>
            </TouchableOpacity>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Flash Memory</Text>
                    <Text style={styles.subtitle}>
                        {cards.length}/{MAX_CARDS} cards • Answer one to dismiss alarm
                    </Text>
                </View>

                {/* Card List */}
                {cards.length > 0 ? (
                    <FlatList
                        data={cards}
                        keyExtractor={item => item.id}
                        renderItem={renderCard}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No flash cards yet</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Create cards to quiz yourself when dismissing alarms
                        </Text>
                    </View>
                )}

                {/* Input Form */}
                <Card style={styles.inputCard}>
                    <Text style={styles.inputLabel}>
                        {editingId ? 'Edit Card' : 'Add New Card'}
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Question (e.g., What is 'hello' in Spanish?)"
                        placeholderTextColor={colors.textMuted}
                        value={question}
                        onChangeText={setQuestion}
                        multiline
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Answer (e.g., Hola)"
                        placeholderTextColor={colors.textMuted}
                        value={answer}
                        onChangeText={setAnswer}
                    />

                    <View style={styles.inputActions}>
                        {editingId && (
                            <Button
                                title="Cancel"
                                onPress={handleCancel}
                                variant="ghost"
                                size="medium"
                            />
                        )}
                        <Button
                            title={editingId ? 'Update' : 'Add Card'}
                            onPress={handleSave}
                            variant="primary"
                            size="medium"
                            disabled={!question.trim() || !answer.trim()}
                        />
                    </View>
                </Card>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        padding: spacing.md,
        paddingBottom: 0,
    },
    title: {
        fontSize: typography.h2,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    listContent: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    cardItem: {
        marginBottom: spacing.sm,
    },
    cardQuestion: {
        fontSize: typography.body,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    cardAnswer: {
        fontSize: typography.caption,
        color: colors.primary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyStateText: {
        fontSize: typography.h3,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
    emptyStateSubtext: {
        fontSize: typography.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    inputCard: {
        margin: spacing.md,
        marginTop: 0,
    },
    inputLabel: {
        fontSize: typography.body,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    input: {
        fontSize: typography.body,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    inputActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
});

export default FlashCardsScreen;
