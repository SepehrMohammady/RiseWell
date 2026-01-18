// Alarm Edit Screen - Create/Edit Alarm
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    Platform,
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

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

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
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [label, setLabel] = useState('');

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

    // Time picker wheel component
    const TimePickerWheel = () => (
        <Modal
            visible={showTimePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTimePicker(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.timePickerModal}>
                    <Text style={styles.timePickerTitle}>Set Time</Text>

                    <View style={styles.wheelContainer}>
                        {/* Hours wheel */}
                        <View style={styles.wheelColumn}>
                            <Text style={styles.wheelLabel}>Hour</Text>
                            <ScrollView
                                style={styles.wheel}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={52}
                                decelerationRate="fast"
                            >
                                <View style={{ height: 52 }} />
                                {HOURS.map((hour, index) => (
                                    <TouchableOpacity
                                        key={hour}
                                        style={[
                                            styles.wheelItem,
                                            selectedHour === index && styles.wheelItemSelected,
                                        ]}
                                        onPress={() => setSelectedHour(index)}
                                    >
                                        <Text
                                            style={[
                                                styles.wheelItemText,
                                                selectedHour === index && styles.wheelItemTextSelected,
                                            ]}
                                        >
                                            {hour}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 52 }} />
                            </ScrollView>
                        </View>

                        <Text style={styles.wheelColon}>:</Text>

                        {/* Minutes wheel */}
                        <View style={styles.wheelColumn}>
                            <Text style={styles.wheelLabel}>Minute</Text>
                            <ScrollView
                                style={styles.wheel}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={52}
                                decelerationRate="fast"
                            >
                                <View style={{ height: 52 }} />
                                {MINUTES.map((minute, index) => (
                                    <TouchableOpacity
                                        key={minute}
                                        style={[
                                            styles.wheelItem,
                                            selectedMinute === index && styles.wheelItemSelected,
                                        ]}
                                        onPress={() => setSelectedMinute(index)}
                                    >
                                        <Text
                                            style={[
                                                styles.wheelItemText,
                                                selectedMinute === index && styles.wheelItemTextSelected,
                                            ]}
                                        >
                                            {minute}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 52 }} />
                            </ScrollView>
                        </View>
                    </View>

                    <View style={styles.timePickerButtons}>
                        <Button
                            title="Cancel"
                            onPress={() => setShowTimePicker(false)}
                            variant="ghost"
                            size="medium"
                        />
                        <Button
                            title="OK"
                            onPress={() => setShowTimePicker(false)}
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
                {/* Time Display - Tap to open picker */}
                <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                    <Card style={styles.timePickerCard}>
                        <Text style={styles.timeDisplay}>
                            {selectedHour.toString().padStart(2, '0')}
                            <Text style={styles.timeColon}>:</Text>
                            {selectedMinute.toString().padStart(2, '0')}
                        </Text>
                        <Text style={styles.tapToEdit}>Tap to change time</Text>
                    </Card>
                </TouchableOpacity>

                {/* Label */}
                <Card style={styles.section}>
                    <Text style={styles.sectionTitle}>Label</Text>
                    <TouchableOpacity
                        style={styles.labelButton}
                        onPress={() => {
                            // For Android, we'll show a simple alert. In production, use a modal with TextInput.
                            Alert.alert(
                                'Alarm Label',
                                'Feature: Use time picker to set alarm time. Label editing is simplified for this version.',
                                [{ text: 'OK' }]
                            );
                        }}
                    >
                        <Text style={label ? styles.labelValue : styles.labelPlaceholder}>
                            {label || 'Add label (optional)'}
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
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>Heart Rate Check</Text>
                            <Text style={styles.toggleSubtext}>Verify you're awake with camera</Text>
                        </View>
                        <Toggle
                            value={alarm.heartRateEnabled}
                            onValueChange={(v) => setAlarm({ ...alarm, heartRateEnabled: v })}
                        />
                    </View>

                    <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
                        <View style={styles.toggleInfo}>
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

            <TimePickerWheel />
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
    timeDisplay: {
        fontSize: 72,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    timeColon: {
        color: colors.primary,
    },
    tapToEdit: {
        fontSize: typography.caption,
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timePickerModal: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        width: '85%',
        maxWidth: 340,
    },
    timePickerTitle: {
        fontSize: typography.h3,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    wheelContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    wheelColumn: {
        alignItems: 'center',
    },
    wheelLabel: {
        fontSize: typography.small,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    wheel: {
        height: 156,
        width: 80,
    },
    wheelItem: {
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    wheelItemSelected: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
    },
    wheelItemText: {
        fontSize: 28,
        color: colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    wheelItemTextSelected: {
        color: colors.black,
        fontWeight: typography.bold,
    },
    wheelColon: {
        fontSize: 48,
        color: colors.primary,
        marginHorizontal: spacing.md,
        fontWeight: typography.bold,
    },
    timePickerButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
});

export default AlarmEditScreen;
