// Statistics Screen - Wakefulness score history
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { WakeRecord } from '../types';
import { getRecentWakeRecords } from '../services/StorageService';
import { getScoreGrade, calculateAverageScore, getWeeklyTrend } from '../services/ScoringService';
import { Card } from '../components';
import { colors, spacing, typography, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2;
const CHART_HEIGHT = 150;

export const StatisticsScreen: React.FC = () => {
    const [records, setRecords] = useState<WakeRecord[]>([]);
    const [weeklyRecords, setWeeklyRecords] = useState<WakeRecord[]>([]);

    const loadRecords = useCallback(async () => {
        const weekly = await getRecentWakeRecords(7);
        const all = await getRecentWakeRecords(30);
        setWeeklyRecords(weekly);
        setRecords(all);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadRecords();
        }, [loadRecords])
    );

    const averageScore = calculateAverageScore(weeklyRecords);
    const trend = getWeeklyTrend(weeklyRecords);
    const grade = getScoreGrade(averageScore);

    const getTrendIcon = () => {
        switch (trend) {
            case 'up': return '📈';
            case 'down': return '📉';
            default: return '➡️';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const renderChart = () => {
        if (weeklyRecords.length === 0) return null;

        const sortedRecords = [...weeklyRecords].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const maxScore = 100;
        const barWidth = Math.min(40, (CHART_WIDTH - sortedRecords.length * 8) / sortedRecords.length);

        return (
            <View style={styles.chartContainer}>
                <View style={styles.chartBars}>
                    {sortedRecords.map((record, index) => {
                        const barHeight = (record.score / maxScore) * CHART_HEIGHT;
                        const barGrade = getScoreGrade(record.score);

                        return (
                            <View key={record.id} style={styles.barContainer}>
                                <Text style={styles.barScore}>{record.score}</Text>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            width: barWidth,
                                            height: barHeight,
                                            backgroundColor: barGrade.color,
                                        },
                                    ]}
                                />
                                <Text style={styles.barLabel}>
                                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderRecordItem = (record: WakeRecord) => {
        const recordGrade = getScoreGrade(record.score);

        return (
            <Card key={record.id} style={styles.recordItem}>
                <View style={styles.recordHeader}>
                    <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                    <View style={[styles.scoreBadge, { backgroundColor: recordGrade.color }]}>
                        <Text style={styles.scoreBadgeText}>{record.score}</Text>
                    </View>
                </View>
                <View style={styles.recordDetails}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Snoozes</Text>
                        <Text style={styles.detailValue}>{record.snoozeCount}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Puzzle</Text>
                        <Text style={styles.detailValue}>{Math.round(record.puzzleTimeMs / 1000)}s</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Errors</Text>
                        <Text style={styles.detailValue}>{record.puzzleErrors}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Delta</Text>
                        <Text style={[
                            styles.detailValue,
                            record.wakeTimeDelta > 0 ? styles.deltaLate : styles.deltaEarly
                        ]}>
                            {record.wakeTimeDelta > 0 ? '+' : ''}{record.wakeTimeDelta}m
                        </Text>
                    </View>
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Summary */}
                <Card style={styles.summaryCard}>
                    <View style={styles.summaryMain}>
                        <View style={styles.scoreCircle}>
                            <Text style={[styles.scoreValue, { color: grade.color }]}>
                                {averageScore}
                            </Text>
                            <Text style={styles.scoreLabel}>avg</Text>
                        </View>
                        <View style={styles.summaryDetails}>
                            <Text style={[styles.gradeText, { color: grade.color }]}>
                                {grade.grade}
                            </Text>
                            <Text style={styles.gradeMessage}>{grade.message}</Text>
                            <Text style={styles.trendText}>
                                {getTrendIcon()} {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Weekly Chart */}
                <Text style={styles.sectionTitle}>This Week</Text>
                {weeklyRecords.length > 0 ? (
                    <Card style={styles.chartCard}>
                        {renderChart()}
                    </Card>
                ) : (
                    <Card style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No data this week yet</Text>
                    </Card>
                )}

                {/* Recent Records */}
                <Text style={styles.sectionTitle}>Recent Wake-ups</Text>
                {records.length > 0 ? (
                    records
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map(renderRecordItem)
                ) : (
                    <Card style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No wake-up records yet</Text>
                        <Text style={styles.emptySubtext}>
                            Start using RiseWell to track your wakefulness
                        </Text>
                    </Card>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    summaryCard: {
        marginBottom: spacing.lg,
    },
    summaryMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.lg,
    },
    scoreValue: {
        fontSize: 36,
        fontWeight: typography.bold,
    },
    scoreLabel: {
        fontSize: typography.small,
        color: colors.textMuted,
    },
    summaryDetails: {
        flex: 1,
    },
    gradeText: {
        fontSize: 48,
        fontWeight: typography.bold,
    },
    gradeMessage: {
        fontSize: typography.body,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    trendText: {
        fontSize: typography.caption,
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.body,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    chartCard: {
        paddingVertical: spacing.lg,
    },
    chartContainer: {
        height: CHART_HEIGHT + 60,
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: CHART_HEIGHT + 40,
        paddingBottom: 20,
    },
    barContainer: {
        alignItems: 'center',
    },
    bar: {
        borderRadius: borderRadius.sm,
        minHeight: 4,
    },
    barScore: {
        fontSize: typography.small,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    barLabel: {
        fontSize: typography.small,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    recordItem: {
        marginBottom: spacing.sm,
    },
    recordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    recordDate: {
        fontSize: typography.body,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
    scoreBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    scoreBadgeText: {
        fontSize: typography.body,
        fontWeight: typography.bold,
        color: colors.black,
    },
    recordDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: typography.small,
        color: colors.textMuted,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: typography.caption,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },
    deltaLate: {
        color: colors.error,
    },
    deltaEarly: {
        color: colors.success,
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyText: {
        fontSize: typography.body,
        color: colors.textSecondary,
    },
    emptySubtext: {
        fontSize: typography.caption,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
});

export default StatisticsScreen;
