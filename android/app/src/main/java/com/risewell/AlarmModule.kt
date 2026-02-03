package com.risewell

import android.util.Log
import com.facebook.react.bridge.*
import java.util.Calendar

/**
 * React Native Native Module for alarm functionality.
 * Provides bridge between JavaScript and native AlarmScheduler.
 */
class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "AlarmModule"
        const val NAME = "AlarmModule"
    }
    
    override fun getName(): String = NAME
    
    /**
     * Schedule a native alarm using AlarmManager.
     * 
     * @param alarmId Unique alarm identifier
     * @param triggerTimeMillis Time to trigger (epoch milliseconds)
     * @param soundUri Sound to play
     * @param label Alarm label
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    fun scheduleAlarm(
        alarmId: String,
        triggerTimeMillis: Double,
        soundUri: String,
        label: String,
        promise: Promise
    ) {
        try {
            Log.d(TAG, "scheduleAlarm: $alarmId at $triggerTimeMillis")
            
            AlarmScheduler.scheduleAlarm(
                context = reactApplicationContext,
                alarmId = alarmId,
                triggerTimeMillis = triggerTimeMillis.toLong(),
                soundUri = soundUri,
                label = label
            )
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error scheduling alarm: ${e.message}")
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }
    
    /**
     * Cancel a scheduled alarm.
     * 
     * @param alarmId Alarm identifier to cancel
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    fun cancelAlarm(alarmId: String, promise: Promise) {
        try {
            Log.d(TAG, "cancelAlarm: $alarmId")
            
            AlarmScheduler.cancelAlarm(
                context = reactApplicationContext,
                alarmId = alarmId
            )
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling alarm: ${e.message}")
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }
    
    /**
     * Stop the currently ringing alarm (dismiss).
     * 
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    fun dismissAlarm(promise: Promise) {
        try {
            Log.d(TAG, "dismissAlarm")
            
            AlarmService.currentInstance?.stopAlarm()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing alarm: ${e.message}")
            promise.reject("DISMISS_ERROR", e.message, e)
        }
    }
    
    /**
     * Stop current alarm and schedule snooze.
     * 
     * @param alarmId Current alarm ID
     * @param snoozeDurationMinutes Snooze duration in minutes
     * @param soundUri Sound to play when snooze ends
     * @param label Alarm label
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    fun snoozeAlarm(
        alarmId: String,
        snoozeDurationMinutes: Int,
        soundUri: String,
        label: String,
        promise: Promise
    ) {
        try {
            Log.d(TAG, "snoozeAlarm: $alarmId for $snoozeDurationMinutes minutes")
            
            // Stop current alarm
            AlarmService.currentInstance?.stopAlarm()
            
            // Schedule snooze alarm
            val snoozeTime = System.currentTimeMillis() + (snoozeDurationMinutes * 60 * 1000L)
            
            AlarmScheduler.scheduleAlarm(
                context = reactApplicationContext,
                alarmId = "${alarmId}_snooze",
                triggerTimeMillis = snoozeTime,
                soundUri = soundUri,
                label = "Snooze: $label"
            )
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error snoozing alarm: ${e.message}")
            promise.reject("SNOOZE_ERROR", e.message, e)
        }
    }
    
    /**
     * Check if exact alarms can be scheduled.
     * 
     * @param promise Promise with boolean result
     */
    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        try {
            val canSchedule = AlarmScheduler.canScheduleExactAlarms(reactApplicationContext)
            promise.resolve(canSchedule)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }
    
    /**
     * Check if alarm service is currently running.
     * 
     * @param promise Promise with boolean result
     */
    @ReactMethod
    fun isAlarmRinging(promise: Promise) {
        promise.resolve(AlarmService.currentInstance != null)
    }
}
