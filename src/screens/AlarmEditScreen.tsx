// Alarm Edit Screen - Create/Edit Alarm
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alarm, RootStackParamList, ScheduleType, DifficultyLevel } from '../types';
import { getAlarmById, saveAlarm, generateId, deleteAlarm } from '../services/StorageService';
import { scheduleAlarm, cancelAlarm } from '../services/NotificationService';
import { Button, Card, Toggle } from '../components';
import { colors, spacing, typography, borderRadius } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AlarmEdit'>;
type RouteProps = RouteProp<RootStackParamList, 'AlarmEdit'>;

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string }[] = [
    { value: 'workdays', label: 'Workdays (Mon-Fri)' },
    { value: 'weekends', label: 'Weekends (Sat-Sun)' },
    { value: 'daily', label: 'Every Day' },
    { value: 'custom', label: 'Custom Days' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SNOOZE_OPTIONS = [5, 10, 15, 20, 30];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
    { value: 1, label: 'Easy' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'Hard' },
    { value: 4, label: 'Expert' },
];

const createDefaultAlarm = (): Alarm => ({
    id: generateId(),
    time: '07:00',
    enabled: true,
    schedule: 'workdays',
    customDays: [],
    soundUri: 'default',
    snoozeDuration: 10,
    puzzleMode: 'auto',
    puzzleDifficulty: 2,
    heartRateEnabled: false,
    flashMemoryEnabled: false,
    label: '',
});

export const AlarmEditScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RouteProps>();
    const { alarmId } = route.params || {};

    const [alarm, setAlarm] = useState<Alarm>(createDefaultAlarm());
    const [isEditing, setIsEditing] = useState(false);
    const [hours, setHours] = useState('07');
    const [minutes, setMinutes] = useState('00');

    useEffect(() => {
        if (alarmId) {
            setIsEditing(true);
            loadAlarm(alarmId);
        }
    }, [alarmId]);

    const loadAlarm = async (id: string) => {
        const loadedAlarm = await getAlarmById(id);
        if (loadedAlarm) {
            setAlarm(loadedAlarm);
            const [h, m] = loadedAlarm.time.split(':');
            setHours(h);
            setMinutes(m);
        }
    };

    const handleSave = async () => {
        const updatedAlarm = {
            ...alarm,
            time: `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`,
        };

        await saveAlarm(updatedAlarm);

        if (updatedAlarm.enabled) {
            await scheduleAlarm(updatedAlarm);
        }

        navigation.goBack();
    };

    const handleDelete = async () => {
        Alert.alert(
            'Delete Alarm',
            'Are you sure you want to delete this alarm?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await cancelAlarm(alarm.id);
                        await deleteAlarm(alarm.id);
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const toggleCustomDay = (dayIndex: number) => {
        const newDays = alarm.customDays.includes(dayIndex)
            ? alarm.customDays.filter(d => d !== dayIndex)
            : [...alarm.customDays, dayIndex].sort();
        setAlarm({ ...alarm, customDays: newDays });
    };

    const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
        const numValue = value.replace(/[^0-9]/g, '');
        if (type === 'hours') {
            const clamped = Math.min(23, Math.max(0, parseInt(numValue) || 0));
            setHours(clamped.toString().padStart(2, '0'));
        } else {
            const clamped = Math.min(59, Math.max(0, parseInt(numValue) || 0));
            setMinutes(clamped.toString().padStart(2, '0'));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Time Picker */}
                <Card style={styles.timePickerCard}>
                    <View style={styles.timePicker}>
                        <TextInput
                            style={styles.timeInput}
                            value={hours}
                            onChangeText={(v) => handleTimeChange('hours', v)}
                            keyboardType="number-pad"
                            maxLength={2}
                            selectTextOnFocus
                        />
                        <Text style={styles.timeColon}>:</Text>
                        <TextInput
                            style={styles.timeInput}
                            value={minutes}
                            onChangeText={(v) => handleTimeChange('minutes', v)}
                            keyboardType="number-pad"
                            maxLength={2}
                            selectTextOnFocus
                        />
                    </View>
                </Card>

                {/* Label */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Label</Text>
                    <TextInput
                        style={styles.labelInput}
                        placeholder="Alarm label (optional)"
                        placeholderTextColor={colors.textMuted}
                        value={alarm.label}
                        onChangeText={(label) => setAlarm({ ...alarm, label })}
                    />
                </Card>

                {/* Schedule */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Schedule</Text>
                    <View style={styles.optionsGrid}>
                        {SCHEDULE_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionButton,
                                    alarm.schedule === option.value && styles.optionButtonActive,
                                ]}
                                onPress={() => setAlarm({ ...alarm, schedule: option.value })}
                            >
                                <Text
                                    style={[
                                        styles.optionButtonText,
                                        alarm.schedule === option.value && styles.optionButtonTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {alarm.schedule === 'custom' && (
                        <View style={styles.customDays}>
                            {DAYS.map((day, index) => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayButton,
                                        alarm.customDays.includes(index) && styles.dayButtonActive,
                                    ]}
                                    onPress={() => toggleCustomDay(index)}
                                >
                                    <Text
                                        style={[
                                            styles.dayButtonText,
                                            alarm.customDays.includes(index) && styles.dayButtonTextActive,
                                        ]}
                                    >
                                        {day}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Card>

                {/* Snooze Duration */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Snooze Duration</Text>
                    <View style={styles.snoozeOptions}>
                        {SNOOZE_OPTIONS.map((duration) => (
                            <TouchableOpacity
                                key={duration}
                                style={[
                                    styles.snoozeButton,
                                    alarm.snoozeDuration === duration && styles.snoozeButtonActive,
                                ]}
                                onPress={() => setAlarm({ ...alarm, snoozeDuration: duration })}
                            >
                                <Text
                                    style={[
                                        styles.snoozeButtonText,
                                        alarm.snoozeDuration === duration && styles.snoozeButtonTextActive,
                                    ]}
                                >
                                    {duration}m
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Card>

                {/* Puzzle Settings */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Puzzle Mode</Text>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Auto difficulty</Text>
                        <Toggle
                            value={alarm.puzzleMode === 'auto'}
                            onValueChange={(v) => setAlarm({ ...alarm, puzzleMode: v ? 'auto' : 'manual' })}
                        />
                    </View>

                    {alarm.puzzleMode === 'manual' && (
                        <View style={styles.difficultyOptions}>
                            {DIFFICULTY_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.difficultyButton,
                                        alarm.puzzleDifficulty === option.value && styles.difficultyButtonActive,
                                    ]}
                                    onPress={() => setAlarm({ ...alarm, puzzleDifficulty: option.value })}
                                >
                                    <Text
                                        style={[
                                            styles.difficultyButtonText,
                                            alarm.puzzleDifficulty === option.value && styles.difficultyButtonTextActive,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Card>

                {/* Optional Features */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Optional Features</Text>

                    <View style={styles.toggleRow}>
                        <View>
                            <Text style={styles.toggleLabel}>Heart Rate Check</Text>
                            <Text style={styles.toggleSubtext}>Verify you're awake with camera</Text>
                        </View>
                        <Toggle
                            value={alarm.heartRateEnabled}
                            onValueChange={(v) => setAlarm({ ...alarm, heartRateEnabled: v })}
                        />
                    </View>

                    <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
                        <View>
                            <Text style={styles.toggleLabel}>Flash Memory Quiz</Text>
                            <Text style={styles.toggleSubtext}>Answer a flash card to dismiss</Text>
                        </View>
                        <Toggle
                            value={alarm.flashMemoryEnabled}
                            onValueChange={(v) => setAlarm({ ...alarm, flashMemoryEnabled: v })}
                        />
                    </View>
                </Card>

                {/* Actions */}
                <View style={styles.actions}>
                    <Button
                        title="Save Alarm"
                        onPress={handleSave}
                        variant="primary"
                        size="large"
                        fullWidth
                    />

                    {isEditing && (
                        <Button
                            title="Delete Alarm"
                            onPress={handleDelete}
                            variant="ghost"
                            size="medium"
                            style={{ marginTop: spacing.md }}
                        />
                    )}
                </View>
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
    timePickerCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    timePicker: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeInput: {
        fontSize: 64,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        textAlign: 'center',
        width: 100,
        fontVariant: ['tabular-nums'],
    },
    timeColon: {
        fontSize: 64,
        fontWeight: typography.bold,
        color: colors.primary,
        marginHorizontal: spacing.sm,
    },
    section: {
        marginTop: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.body,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    labelInput: {
        fontSize: typography.body,
        color: colors.textPrimary,
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    optionButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceLight,
    },
    optionButtonActive: {
        backgroundColor: colors.primary,
    },
    optionButtonText: {
        fontSize: typography.caption,
        color: colors.textSecondary,
    },
    optionButtonTextActive: {
        color: colors.black,
        fontWeight: typography.semibold,
    },
    customDays: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayButtonActive: {
        backgroundColor: colors.primary,
    },
    dayButtonText: {
        fontSize: typography.small,
        color: colors.textSecondary,
    },
    dayButtonTextActive: {
        color: colors.black,
        fontWeight: typography.semibold,
    },
    snoozeOptions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    snoozeButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
    },
    snoozeButtonActive: {
        backgroundColor: colors.primary,
    },
    snoozeButtonText: {
        fontSize: typography.caption,
        color: colors.textSecondary,
    },
    snoozeButtonTextActive: {
        color: colors.black,
        fontWeight: typography.semibold,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleLabel: {
        fontSize: typography.body,
        color: colors.textPrimary,
    },
    toggleSubtext: {
        fontSize: typography.small,
        color: colors.textMuted,
        marginTop: 2,
    },
    difficultyOptions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    difficultyButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
    },
    difficultyButtonActive: {
        backgroundColor: colors.primary,
    },
    difficultyButtonText: {
        fontSize: typography.caption,
        color: colors.textSecondary,
    },
    difficultyButtonTextActive: {
        color: colors.black,
        fontWeight: typography.semibold,
    },
    actions: {
        marginTop: spacing.xl,
    },
});

export default AlarmEditScreen;
