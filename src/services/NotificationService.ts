// Notification Service - Schedule and manage alarm notifications
import notifee, {
    AndroidImportance,
    AndroidCategory,
    TimestampTrigger,
    TriggerType,
    RepeatFrequency,
} from '@notifee/react-native';
import { Alarm, ScheduleType } from '../types';

const CHANNEL_ID = 'risewell_alarms';
const CHANNEL_NAME = 'RiseWell Alarms';

// Initialize notification channel (must be called on app start)
export async function initializeNotifications(): Promise<void> {
    await notifee.createChannel({
        id: CHANNEL_ID,
        name: CHANNEL_NAME,
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 500],
    });
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
            title: alarm.label || 'RiseWell Alarm',
            body: `Time to wake up! ${alarm.time}`,
            android: {
                channelId: CHANNEL_ID,
                category: AndroidCategory.ALARM,
                importance: AndroidImportance.HIGH,
                fullScreenAction: {
                    id: 'default',
                },
                pressAction: {
                    id: 'default',
                },
                actions: [
                    {
                        title: 'Snooze',
                        pressAction: { id: 'snooze' },
                    },
                    {
                        title: 'Dismiss',
                        pressAction: { id: 'dismiss' },
                    },
                ],
            },
            data: {
                alarmId: alarm.id,
                type: 'alarm',
            },
        },
        trigger,
    );

    console.log(`Scheduled alarm ${alarm.id} for ${nextTime.toISOString()}`);
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
    await notifee.displayNotification({
        id: `${alarm.id}_active`,
        title: alarm.label || 'RiseWell Alarm',
        body: `Time to wake up! ${alarm.time}`,
        android: {
            channelId: CHANNEL_ID,
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            ongoing: true,
            fullScreenAction: {
                id: 'default',
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
            title: 'Snooze Ended',
            body: `Time to wake up! ${alarm.label || 'Alarm'}`,
            android: {
                channelId: CHANNEL_ID,
                category: AndroidCategory.ALARM,
                importance: AndroidImportance.HIGH,
                fullScreenAction: {
                    id: 'default',
                },
            },
            data: {
                alarmId: alarm.id,
                type: 'snooze',
            },
        },
        trigger,
    );
}

// Cancel active alarm display
export async function cancelActiveAlarm(alarmId: string): Promise<void> {
    await notifee.cancelNotification(`${alarmId}_active`);
    await notifee.cancelNotification(`${alarmId}_snooze`);
}
