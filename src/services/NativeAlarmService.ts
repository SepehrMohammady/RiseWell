/**
 * Native Alarm Service - TypeScript wrapper for native Android AlarmModule
 * Provides guaranteed alarm delivery using AlarmManager.setAlarmClock()
 */

import { NativeModules, Platform } from 'react-native';
import { Alarm } from '../types';

const { AlarmModule } = NativeModules;

/**
 * Check if native alarm module is available
 */
export function isNativeAlarmAvailable(): boolean {
    return Platform.OS === 'android' && AlarmModule != null;
}

/**
 * Schedule an alarm using native AlarmManager.
 * This alarm will fire even when the app is killed.
 * 
 * @param alarm The alarm to schedule
 * @returns Promise that resolves when scheduled
 */
export async function scheduleNativeAlarm(alarm: Alarm): Promise<void> {
    if (!isNativeAlarmAvailable()) {
        console.log('Native alarm module not available');
        return;
    }

    // Calculate trigger time
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (triggerDate <= now) {
        triggerDate.setDate(triggerDate.getDate() + 1);
    }

    const triggerTimeMillis = triggerDate.getTime();

    try {
        await AlarmModule.scheduleAlarm(
            alarm.id,
            triggerTimeMillis,
            alarm.soundUri || 'default',
            alarm.label || ''
        );
        console.log(`Native alarm scheduled: ${alarm.id} at ${triggerDate.toISOString()}`);
    } catch (error) {
        console.error('Failed to schedule native alarm:', error);
        throw error;
    }
}

/**
 * Cancel a scheduled native alarm.
 * 
 * @param alarmId The alarm ID to cancel
 * @returns Promise that resolves when cancelled
 */
export async function cancelNativeAlarm(alarmId: string): Promise<void> {
    if (!isNativeAlarmAvailable()) {
        return;
    }

    try {
        await AlarmModule.cancelAlarm(alarmId);
        console.log(`Native alarm cancelled: ${alarmId}`);
    } catch (error) {
        console.error('Failed to cancel native alarm:', error);
        throw error;
    }
}

/**
 * Dismiss the currently ringing alarm.
 * Stops the foreground service.
 * 
 * @returns Promise that resolves when dismissed
 */
export async function dismissNativeAlarm(): Promise<void> {
    if (!isNativeAlarmAvailable()) {
        return;
    }

    try {
        await AlarmModule.dismissAlarm();
        console.log('Native alarm dismissed');
    } catch (error) {
        console.error('Failed to dismiss native alarm:', error);
        throw error;
    }
}

/**
 * Snooze the currently ringing alarm.
 * 
 * @param alarm The current alarm
 * @param snoozeDurationMinutes Snooze duration in minutes
 * @returns Promise that resolves when snooze is scheduled
 */
export async function snoozeNativeAlarm(
    alarm: Alarm,
    snoozeDurationMinutes: number
): Promise<void> {
    if (!isNativeAlarmAvailable()) {
        return;
    }

    try {
        await AlarmModule.snoozeAlarm(
            alarm.id,
            snoozeDurationMinutes,
            alarm.soundUri || 'default',
            alarm.label || ''
        );
        console.log(`Native alarm snoozed: ${alarm.id} for ${snoozeDurationMinutes} minutes`);
    } catch (error) {
        console.error('Failed to snooze native alarm:', error);
        throw error;
    }
}

/**
 * Check if exact alarms can be scheduled.
 * On Android 12+, this requires SCHEDULE_EXACT_ALARM permission.
 * 
 * @returns Promise with boolean result
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
    if (!isNativeAlarmAvailable()) {
        return false;
    }

    try {
        return await AlarmModule.canScheduleExactAlarms();
    } catch (error) {
        console.error('Failed to check exact alarm permission:', error);
        return false;
    }
}

/**
 * Check if an alarm is currently ringing.
 * 
 * @returns Promise with boolean result
 */
export async function isAlarmRinging(): Promise<boolean> {
    if (!isNativeAlarmAvailable()) {
        return false;
    }

    try {
        return await AlarmModule.isAlarmRinging();
    } catch (error) {
        console.error('Failed to check alarm status:', error);
        return false;
    }
}
