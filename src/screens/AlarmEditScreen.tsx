// Alarm Edit Screen - Create/Edit Alarm
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    { value: 'workdays', label: 'Workdays' },
    { value: 'weekends', label: 'Weekends' },
    { value: 'daily', label: 'Daily' },
    { value: 'custom', label: 'Custom' },
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
    const [selectedHour, setSelectedHour] = useState(7);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [label, setLabel] = useState('');
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [tempLabel, setTempLabel] = useState('');

    // Long press timer refs
    const hourIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const minuteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (alarmId) {
            setIsEditing(true);
            loadAlarm(alarmId);
        }
    }, [alarmId]);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (hourIntervalRef.current) clearInterval(hourIntervalRef.current);
            if (minuteIntervalRef.current) clearInterval(minuteIntervalRef.current);
        };
    }, []);

    const loadAlarm = async (id: string) => {
        const loadedAlarm = await getAlarmById(id);
        if (loadedAlarm) {
            setAlarm(loadedAlarm);
            const [h, m] = loadedAlarm.time.split(':').map(Number);
            setSelectedHour(h);
            setSelectedMinute(m);
            setLabel(loadedAlarm.label);
        }
    };

    const handleSave = async () => {
        const updatedAlarm = {
            ...alarm,
            time: `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`,
            label,
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

    // Time adjustment functions - single step
    const incrementHour = () => setSelectedHour((h) => (h + 1) % 24);
    const decrementHour = () => setSelectedHour((h) => (h - 1 + 24) % 24);
    const incrementMinute = () => setSelectedMinute((m) => (m + 1) % 60);
    const decrementMinute = () => setSelectedMinute((m) => (m - 1 + 60) % 60);

    // Long press handlers - start continuous scrolling only on long press
    const startHourIncrement = () => {
        hourIntervalRef.current = setInterval(incrementHour, 200);
    };
    const startHourDecrement = () => {
        hourIntervalRef.current = setInterval(decrementHour, 200);
    };
    const stopHourChange = () => {
        if (hourIntervalRef.current) {
            clearInterval(hourIntervalRef.current);
            hourIntervalRef.current = null;
        }
    };

    const startMinuteIncrement = () => {
        minuteIntervalRef.current = setInterval(incrementMinute, 150);
    };
    const startMinuteDecrement = () => {
        minuteIntervalRef.current = setInterval(decrementMinute, 150);
    };
    const stopMinuteChange = () => {
        if (minuteIntervalRef.current) {
            clearInterval(minuteIntervalRef.current);
            minuteIntervalRef.current = null;
        }
    };

    // Label Modal
    const LabelModal = () => (
        <Modal
            visible={showLabelModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLabelModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.labelModal}>
                    <Text style={styles.modalTitle}>Alarm Label</Text>
                    <TextInput
                        style={styles.labelInput}
                        placeholder="Enter alarm name..."
                        placeholderTextColor={colors.textMuted}
                        value={tempLabel}
                        onChangeText={setTempLabel}
                        autoFocus
                        maxLength={50}
                    />
                    <View style={styles.modalButtons}>
                        <Button
                            title="Cancel"
                            onPress={() => setShowLabelModal(false)}
                            variant="ghost"
                            size="medium"
                        />
                        <Button
                            title="Save"
                            onPress={() => {
                                setLabel(tempLabel);
                                setShowLabelModal(false);
                            }}
                            variant="primary"
                            size="medium"
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Time Picker - Tap for single step, Long press for continuous */}
                <Card style={styles.timeCard}>
                    <View style={styles.timePickerRow}>
                        {/* Hours */}
                        <View style={styles.timeColumn}>
                            <Pressable
                                style={styles.timeButton}
                                onPress={incrementHour}
                                onLongPress={startHourIncrement}
                                onPressOut={stopHourChange}
                                delayLongPress={400}
                            >
                                <Text style={styles.timeButtonText}>▲</Text>
                            </Pressable>
                            <Text style={styles.timeValue}>
                                {selectedHour.toString().padStart(2, '0')}
                            </Text>
                            <Pressable
                                style={styles.timeButton}
                                onPress={decrementHour}
                                onLongPress={startHourDecrement}
                                onPressOut={stopHourChange}
                                delayLongPress={400}
                            >
                                <Text style={styles.timeButtonText}>▼</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.timeColon}>:</Text>

                        {/* Minutes */}
                        <View style={styles.timeColumn}>
                            <Pressable
                                style={styles.timeButton}
                                onPress={incrementMinute}
                                onLongPress={startMinuteIncrement}
                                onPressOut={stopMinuteChange}
                                delayLongPress={400}
                            >
                                <Text style={styles.timeButtonText}>▲</Text>
                            </Pressable>
                            <Text style={styles.timeValue}>
                                {selectedMinute.toString().padStart(2, '0')}
                            </Text>
                            <Pressable
                                style={styles.timeButton}
                                onPress={decrementMinute}
                                onLongPress={startMinuteDecrement}
                                onPressOut={stopMinuteChange}
                                delayLongPress={400}
                            >
                                <Text style={styles.timeButtonText}>▼</Text>
                            </Pressable>
                        </View>
                    </View>
                    <Text style={styles.timeHint}>Tap: ±1 step | Hold: fast scroll</Text>
                </Card>

                {/* Label - Tap to edit with modal */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Label</Text>
                    <TouchableOpacity
                        style={styles.labelButton}
                        onPress={() => {
                            setTempLabel(label);
                            setShowLabelModal(true);
                        }}
                    >
                        <Text style={label ? styles.labelValue : styles.labelPlaceholder}>
                            {label || 'Tap to add label'}
                        </Text>
                    </TouchableOpacity>
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

                {/* Puzzle Difficulty with Auto toggle */}
                <Card style={styles.section}>
                    <View style={styles.difficultyHeader}>
                        <Text style={styles.sectionTitle}>Puzzle Difficulty</Text>
                        <View style={styles.autoToggle}>
                            <Text style={styles.autoLabel}>Auto</Text>
                            <Toggle
                                value={alarm.puzzleMode === 'auto'}
                                onValueChange={(v) => setAlarm({ ...alarm, puzzleMode: v ? 'auto' : 'manual' })}
                            />
                        </View>
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

                    {alarm.puzzleMode === 'auto' && (
                        <Text style={styles.autoDescription}>
                            Difficulty adjusts based on snooze count
                        </Text>
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

                {/* Alarm Sound */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Alarm Sound</Text>
                    <View style={styles.soundOptions}>
                        {['default', 'alarm1', 'alarm2', 'alarm3', 'alarm4', 'alarm5'].map((sound, index) => (
                            <TouchableOpacity
                                key={sound}
                                style={[
                                    styles.soundButton,
                                    alarm.soundUri === sound && styles.soundButtonActive,
                                ]}
                                onPress={() => setAlarm({ ...alarm, soundUri: sound })}
                            >
                                <Text
                                    style={[
                                        styles.soundButtonText,
                                        alarm.soundUri === sound && styles.soundButtonTextActive,
                                    ]}
                                >
                                    {sound === 'default' ? '🔔 Default' : `🎵 Sound ${index}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Card>

                {/* Optional Features */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Optional Features</Text>

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>Heart Rate Check</Text>
                            <Text style={styles.toggleSubtext}>Verify you're awake</Text>
                        </View>
                        <Toggle
                            value={alarm.heartRateEnabled}
                            onValueChange={(v) => setAlarm({ ...alarm, heartRateEnabled: v })}
                        />
                    </View>

                    <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>Flash Memory Quiz</Text>
                            <Text style={styles.toggleSubtext}>Answer a flash card</Text>
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

            <LabelModal />
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
    timeCard: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    timePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeColumn: {
        alignItems: 'center',
    },
    timeButton: {
        width: 80,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
    },
    timeButtonText: {
        fontSize: 24,
        color: colors.primary,
    },
    timeValue: {
        fontSize: 72,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        fontVariant: ['tabular-nums'],
        marginVertical: spacing.sm,
    },
    timeColon: {
        fontSize: 72,
        fontWeight: typography.bold,
        color: colors.primary,
        marginHorizontal: spacing.md,
    },
    timeHint: {
        fontSize: typography.small,
        color: colors.textMuted,
        marginTop: spacing.sm,
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
    labelButton: {
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },
    labelValue: {
        fontSize: typography.body,
        color: colors.textPrimary,
    },
    labelPlaceholder: {
        fontSize: typography.body,
        color: colors.textMuted,
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
        width: 42,
        height: 42,
        borderRadius: 21,
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
    difficultyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    autoToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    autoLabel: {
        fontSize: typography.caption,
        color: colors.textSecondary,
    },
    autoDescription: {
        fontSize: typography.caption,
        color: colors.textMuted,
        fontStyle: 'italic',
    },
    difficultyOptions: {
        flexDirection: 'row',
        gap: spacing.sm,
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
    toggleInfo: {
        flex: 1,
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
    actions: {
        marginTop: spacing.xl,
    },
    soundOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    soundButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceLight,
    },
    soundButtonActive: {
        backgroundColor: colors.primary,
    },
    soundButtonText: {
        fontSize: typography.caption,
        color: colors.textSecondary,
    },
    soundButtonTextActive: {
        color: colors.black,
        fontWeight: typography.semibold,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    labelModal: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        width: '85%',
        maxWidth: 340,
    },
    modalTitle: {
        fontSize: typography.h3,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },
    labelInput: {
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.body,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
    },
});

export default AlarmEditScreen;
