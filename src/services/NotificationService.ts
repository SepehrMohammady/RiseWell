// Notification Service - Schedule and manage alarm notifications
import notifee, {
    AndroidImportance,
    AndroidCategory,
    AndroidVisibility,
    TimestampTrigger,
    TriggerType,
} from '@notifee/react-native';
import { Alarm, ScheduleType } from '../types';

// Channel IDs for different sounds
const CHANNEL_PREFIX = 'risewell_alarm_';
const SOUND_CHANNELS = {
    default: { id: 'risewell_alarm_default', name: 'Default Alarm', sound: 'default' },
    alarm1: { id: 'risewell_alarm_1', name: 'Alarm Sound 1', sound: 'alarm1' },
    alarm2: { id: 'risewell_alarm_2', name: 'Alarm Sound 2', sound: 'alarm2' },
    alarm3: { id: 'risewell_alarm_3', name: 'Alarm Sound 3', sound: 'alarm3' },
    alarm4: { id: 'risewell_alarm_4', name: 'Alarm Sound 4', sound: 'alarm4' },
    alarm5: { id: 'risewell_alarm_5', name: 'Alarm Sound 5', sound: 'alarm5' },
};

// Initialize all notification channels (must be called on app start)
export async function initializeNotifications(): Promise<void> {
    // Create a channel for each alarm sound
    for (const [key, config] of Object.entries(SOUND_CHANNELS)) {
        await notifee.createChannel({
            id: config.id,
            name: config.name,
            importance: AndroidImportance.HIGH,
            sound: config.sound,
            vibration: true,
            vibrationPattern: [300, 500, 300, 500],
            lights: true,
            lightColor: '#FFB347',
            visibility: AndroidVisibility.PUBLIC,
        });
    }
    console.log('Notification channels initialized');
}

// Get channel ID for a given sound
function getChannelId(soundUri: string): string {
    const config = SOUND_CHANNELS[soundUri as keyof typeof SOUND_CHANNELS];
    return config?.id || SOUND_CHANNELS.default.id;
}

// Get the next alarm time based on schedule
function getNextAlarmTime(time: string, schedule: ScheduleType, customDays: number[]): Date | null {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday

    // Get days this alarm should fire
    let alarmDays: number[];
    switch (schedule) {
        case 'workdays':
            alarmDays = [1, 2, 3, 4, 5]; // Mon-Fri
            break;
        case 'weekends':
            alarmDays = [0, 6]; // Sun, Sat
            break;
        case 'daily':
            alarmDays = [0, 1, 2, 3, 4, 5, 6];
            break;
        case 'custom':
            alarmDays = customDays;
            break;
        default:
            return null;
    }

    if (alarmDays.length === 0) return null;

    // Find the next occurrence
    for (let daysAhead = 0; daysAhead < 8; daysAhead++) {
        const checkDay = (today + daysAhead) % 7;
        if (alarmDays.includes(checkDay)) {
            const alarmDate = new Date(now);
            alarmDate.setDate(now.getDate() + daysAhead);
            alarmDate.setHours(hours, minutes, 0, 0);

            // If it's today but already passed, skip
            if (daysAhead === 0 && alarmDate <= now) {
                continue;
            }

            return alarmDate;
        }
    }

    return null;
}

// Schedule an alarm notification
export async function scheduleAlarm(alarm: Alarm): Promise<void> {
    if (!alarm.enabled) {
        await cancelAlarm(alarm.id);
        return;
    }

    const nextTime = getNextAlarmTime(alarm.time, alarm.schedule, alarm.customDays);
    if (!nextTime) {
        console.warn(`Could not determine next time for alarm ${alarm.id}`);
        return;
    }

    const channelId = getChannelId(alarm.soundUri);

    const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: nextTime.getTime(),
        alarmManager: {
            allowWhileIdle: true,
        },
    };

    await notifee.createTriggerNotification(
        {
            id: alarm.id,
            title: alarm.label || '⏰ RiseWell Alarm',
            body: `Time to wake up! ${alarm.time}`,
            android: {
                channelId: channelId,
                category: AndroidCategory.ALARM,
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                fullScreenAction: {
                    id: 'default',
                    launchActivity: 'com.risewell.MainActivity',
                },
                pressAction: {
                    id: 'default',
                    launchActivity: 'com.risewell.MainActivity',
                },
                ongoing: true,
                autoCancel: false,
                actions: [
                    {
                        title: '😴 Snooze',
                        pressAction: { id: 'snooze' },
                    },
                    {
                        title: '✓ Dismiss',
                        pressAction: { id: 'dismiss' },
                    },
                ],
            },
            data: {
                alarmId: alarm.id,
                type: 'alarm',
                soundUri: alarm.soundUri,
                heartRateEnabled: String(alarm.heartRateEnabled),
                flashMemoryEnabled: String(alarm.flashMemoryEnabled),
                puzzleDifficulty: String(alarm.puzzleDifficulty),
                puzzleMode: alarm.puzzleMode,
                snoozeDuration: String(alarm.snoozeDuration),
            },
        },
        trigger,
    );

    console.log(`Scheduled alarm ${alarm.id} for ${nextTime.toISOString()} with sound ${alarm.soundUri}`);
}

// Cancel an alarm notification
export async function cancelAlarm(alarmId: string): Promise<void> {
    await notifee.cancelNotification(alarmId);
    console.log(`Cancelled alarm ${alarmId}`);
}

// Reschedule all alarms (call after device restart)
export async function rescheduleAllAlarms(alarms: Alarm[]): Promise<void> {
    for (const alarm of alarms) {
        if (alarm.enabled) {
            await scheduleAlarm(alarm);
        }
    }
}

// Display an immediate notification (for testing or snooze)
export async function displayAlarmNotification(alarm: Alarm): Promise<void> {
    const channelId = getChannelId(alarm.soundUri);

    await notifee.displayNotification({
        id: `${alarm.id}_active`,
        title: alarm.label || '⏰ RiseWell Alarm',
        body: `Time to wake up! ${alarm.time}`,
        android: {
            channelId: channelId,
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            ongoing: true,
            autoCancel: false,
            fullScreenAction: {
                id: 'default',
                launchActivity: 'com.risewell.MainActivity',
            },
        },
        data: {
            alarmId: alarm.id,
            type: 'alarm_active',
        },
    });
}

// Schedule a snooze notification
export async function scheduleSnooze(alarm: Alarm, snoozeDurationMinutes: number): Promise<void> {
    const snoozeTime = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000);
    const channelId = getChannelId(alarm.soundUri);

    const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: snoozeTime.getTime(),
        alarmManager: {
            allowWhileIdle: true,
        },
    };

    await notifee.createTriggerNotification(
        {
            id: `${alarm.id}_snooze`,
            title: '😴 Snooze Ended',
            body: `Time to wake up! ${alarm.label || 'Alarm'}`,
            android: {
                channelId: channelId,
                category: AndroidCategory.ALARM,
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                ongoing: true,
                autoCancel: false,
                fullScreenAction: {
                    id: 'default',
                    launchActivity: 'com.risewell.MainActivity',
                },
                lights: true,
                lightColor: '#FFB347',
            },
            data: {
                alarmId: alarm.id,
                type: 'snooze',
            },
        },
        trigger,
    );

    console.log(`Scheduled snooze for ${snoozeDurationMinutes} minutes`);
}

// Cancel active alarm display
export async function cancelActiveAlarm(alarmId: string): Promise<void> {
    await notifee.cancelNotification(`${alarmId}_active`);
    await notifee.cancelNotification(`${alarmId}_snooze`);
}
