// Home Screen - Alarm List
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Image,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm, RootStackParamList } from '../types';
import { getAlarms, deleteAlarm, saveAlarm } from '../services/StorageService';
import { scheduleAlarm, cancelAlarm, initializeNotifications } from '../services/NotificationService';
import { Card, Toggle } from '../components';
import { colors, spacing, typography, borderRadius } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const SCHEDULE_LABELS: Record<string, string> = {
    workdays: 'Mon - Fri',
    weekends: 'Sat - Sun',
    daily: 'Every day',
    custom: 'Custom',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERMISSIONS_REQUESTED_KEY = '@risewell_permissions_requested';

export const HomeScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const permissionsChecked = useRef(false);

    // Request permissions only once on first launch
    useEffect(() => {
        if (!permissionsChecked.current) {
            permissionsChecked.current = true;
            requestPermissionsOnce();
        }
    }, []);

    const requestPermissionsOnce = async () => {
        try {
            // Check if we already requested permissions
            const alreadyRequested = await AsyncStorage.getItem(PERMISSIONS_REQUESTED_KEY);

            if (alreadyRequested === 'true') {
                // Already requested - just initialize channels
                await initializeNotifications();
                return;
            }

            // First time - request notification permission
            const settings = await notifee.requestPermission();

            if (settings.authorizationStatus < 1) {
                Alert.alert(
                    'Notifications Required',
                    'RiseWell needs notification permissions to wake you up with alarms. Please enable notifications in Settings.',
                    [{ text: 'OK' }]
                );
            }

            // Mark as requested so we don't ask again
            await AsyncStorage.setItem(PERMISSIONS_REQUESTED_KEY, 'true');

            // Initialize notification channels
            await initializeNotifications();
        } catch (error) {
            console.error('Permission request error:', error);
        }
    };

    const loadAlarms = useCallback(async () => {
        const loadedAlarms = await getAlarms();
        setAlarms(loadedAlarms.sort((a, b) => a.time.localeCompare(b.time)));
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadAlarms();
        }, [loadAlarms])
    );

    const handleToggleAlarm = async (alarm: Alarm) => {
        const updatedAlarm = { ...alarm, enabled: !alarm.enabled };
        await saveAlarm(updatedAlarm);

        if (updatedAlarm.enabled) {
            await scheduleAlarm(updatedAlarm);
        } else {
            await cancelAlarm(alarm.id);
        }

        loadAlarms();
    };

    const handleDeleteAlarm = async (id: string) => {
        Alert.alert(
            'Delete Alarm',
            'Are you sure you want to delete this alarm?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await cancelAlarm(id);
                        await deleteAlarm(id);
                        loadAlarms();
                    },
                },
            ]
        );
    };

    const getScheduleText = (alarm: Alarm) => {
        if (alarm.schedule === 'custom' && alarm.customDays.length > 0) {
            return alarm.customDays.map(d => DAY_LABELS[d]).join(', ');
        }
        return SCHEDULE_LABELS[alarm.schedule];
    };

    const renderAlarmItem = ({ item }: { item: Alarm }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('AlarmEdit', { alarmId: item.id })}
            onLongPress={() => handleDeleteAlarm(item.id)}
            activeOpacity={0.7}
        >
            <Card style={{ ...styles.alarmCard, ...(!item.enabled ? styles.alarmCardDisabled : {}) }}>
                <View style={styles.alarmContent}>
                    <View style={styles.timeContainer}>
                        <Text style={[styles.timeText, !item.enabled && styles.textDisabled]}>
                            {item.time}
                        </Text>
                        <Text style={[styles.scheduleText, !item.enabled && styles.textDisabled]}>
                            {getScheduleText(item)}
                        </Text>
                        {item.label && (
                            <Text style={[styles.labelText, !item.enabled && styles.textDisabled]}>
                                {item.label}
                            </Text>
                        )}
                    </View>
                    <Toggle
                        value={item.enabled}
                        onValueChange={() => handleToggleAlarm(item)}
                    />
                </View>
                <View style={styles.featuresRow}>
                    {item.heartRateEnabled && (
                        <View style={styles.featureBadge}>
                            <Text style={styles.featureBadgeText}>❤️ HR</Text>
                        </View>
                    )}
                    {item.flashMemoryEnabled && (
                        <View style={styles.featureBadge}>
                            <Text style={styles.featureBadgeText}>🧠 Flash</Text>
                        </View>
                    )}
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />

            {/* Header - Logo centered and larger */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../assets/RiseWell Logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('FlashCards')}
                        style={styles.headerButton}
                    >
                        <Text style={styles.headerButtonText}>🧠</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Statistics')}
                        style={styles.headerButton}
                    >
                        <Text style={styles.headerButtonText}>📊</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Alarm List */}
            {alarms.length === 0 ? (
                <View style={styles.emptyState}>
                    <Image
                        source={require('../../assets/RiseWell Logo.png')}
                        style={styles.emptyLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.emptyStateText}>No alarms yet</Text>
                    <Text style={styles.emptyStateSubtext}>
                        Tap + to create your first alarm
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={alarms}
                    keyExtractor={item => item.id}
                    renderItem={renderAlarmItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AlarmEdit', {})}
                activeOpacity={0.8}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    logoContainer: {
        flex: 1,
    },
    logo: {
        width: 160,
        height: 55,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    headerButton: {
        width: 44,
        height: 44,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButtonText: {
        fontSize: 22,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    alarmCard: {
        marginBottom: spacing.md,
    },
    alarmCardDisabled: {
        opacity: 0.6,
    },
    alarmContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timeContainer: {
        flex: 1,
    },
    timeText: {
        fontSize: typography.h1,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    scheduleText: {
        fontSize: typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    labelText: {
        fontSize: typography.caption,
        color: colors.primary,
        marginTop: spacing.xs,
    },
    textDisabled: {
        color: colors.textMuted,
    },
    featuresRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    featureBadge: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    featureBadgeText: {
        fontSize: typography.small,
        color: colors.textSecondary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyLogo: {
        width: 200,
        height: 100,
        marginBottom: spacing.lg,
    },
    emptyStateText: {
        fontSize: typography.h2,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
    emptyStateSubtext: {
        fontSize: typography.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: spacing.xl,
        right: spacing.lg,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabText: {
        fontSize: 36,
        color: colors.black,
        fontWeight: typography.bold,
        marginTop: -2,
    },
});

export default HomeScreen;
