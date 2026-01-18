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
    TextInput,
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

    // Time adjustment functions
    const incrementHour = () => setSelectedHour((h) => (h + 1) % 24);
    const decrementHour = () => setSelectedHour((h) => (h - 1 + 24) % 24);
    const incrementMinute = () => {
        setSelectedMinute((m) => {
            const newMin = (m + 1) % 60;
            if (newMin === 0) incrementHour();
            return newMin;
        });
    };
    const decrementMinute = () => {
        setSelectedMinute((m) => {
            const newMin = (m - 1 + 60) % 60;
            if (newMin === 59) decrementHour();
            return newMin;
        });
    };
    const incrementMinute5 = () => {
        setSelectedMinute((m) => {
            const newMin = (m + 5) % 60;
            if (newMin < m) incrementHour();
            return newMin;
        });
    };
    const decrementMinute5 = () => {
        setSelectedMinute((m) => {
            const newMin = (m - 5 + 60) % 60;
            if (newMin > m) decrementHour();
            return newMin;
        });
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
                {/* Time Picker with +/- buttons */}
                <Card style={styles.timeCard}>
                    <View style={styles.timePickerRow}>
                        {/* Hours */}
                        <View style={styles.timeColumn}>
                            <TouchableOpacity style={styles.timeButton} onPress={incrementHour}>
                                <Text style={styles.timeButtonText}>▲</Text>
                            </TouchableOpacity>
                            <Text style={styles.timeValue}>
                                {selectedHour.toString().padStart(2, '0')}
                            </Text>
                            <TouchableOpacity style={styles.timeButton} onPress={decrementHour}>
                                <Text style={styles.timeButtonText}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.timeColon}>:</Text>

                        {/* Minutes */}
                        <View style={styles.timeColumn}>
                            <TouchableOpacity style={styles.timeButton} onPress={incrementMinute5}>
                                <Text style={styles.timeButtonText}>▲</Text>
                            </TouchableOpacity>
                            <Text style={styles.timeValue}>
                                {selectedMinute.toString().padStart(2, '0')}
                            </Text>
                            <TouchableOpacity style={styles.timeButton} onPress={decrementMinute5}>
                                <Text style={styles.timeButtonText}>▼</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Fine tune buttons */}
                    <View style={styles.fineTuneRow}>
                        <TouchableOpacity style={styles.fineTuneButton} onPress={decrementMinute}>
                            <Text style={styles.fineTuneText}>-1 min</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.fineTuneButton} onPress={incrementMinute}>
                            <Text style={styles.fineTuneText}>+1 min</Text>
                        </TouchableOpacity>
                    </View>
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
    fineTuneRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    fineTuneButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
    },
    fineTuneText: {
        fontSize: typography.body,
        color: colors.textSecondary,
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
