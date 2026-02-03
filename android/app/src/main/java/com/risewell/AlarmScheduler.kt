package com.risewell

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Utility class for scheduling alarms using AlarmManager.
 * Uses setAlarmClock() for highest priority - shows in system UI and bypasses Doze.
 */
object AlarmScheduler {
    private const val TAG = "AlarmScheduler"
    
    /**
     * Schedule an alarm using AlarmManager.setAlarmClock() for guaranteed delivery.
     * 
     * @param context Application context
     * @param alarmId Unique alarm identifier
     * @param triggerTimeMillis Time to trigger the alarm (epoch milliseconds)
     * @param soundUri URI of the alarm sound
     * @param label Optional alarm label
     */
    fun scheduleAlarm(
        context: Context,
        alarmId: String,
        triggerTimeMillis: Long,
        soundUri: String,
        label: String = ""
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        // Create intent for AlarmReceiver
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "com.risewell.ALARM_TRIGGER"
            putExtra("alarm_id", alarmId)
            putExtra("sound_uri", soundUri)
            putExtra("label", label)
        }
        
        // Use alarmId hashCode as request code for unique PendingIntents
        val requestCode = alarmId.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Create show intent for when user taps the alarm clock icon in system UI
        val showIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alarm_id", alarmId)
            putExtra("source", "alarm_clock_icon")
        }
        val showPendingIntent = PendingIntent.getActivity(
            context,
            requestCode + 1000,
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Use setAlarmClock for highest priority (shows in system status bar)
        val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTimeMillis, showPendingIntent)
        
        try {
            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            Log.d(TAG, "Alarm scheduled: $alarmId at $triggerTimeMillis")
        } catch (e: SecurityException) {
            Log.e(TAG, "Failed to schedule exact alarm: ${e.message}")
            // Fallback to setExactAndAllowWhileIdle
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTimeMillis,
                    pendingIntent
                )
                Log.d(TAG, "Fallback: Used setExactAndAllowWhileIdle for $alarmId")
            }
        }
    }
    
    /**
     * Cancel a scheduled alarm.
     * 
     * @param context Application context
     * @param alarmId Alarm identifier to cancel
     */
    fun cancelAlarm(context: Context, alarmId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "com.risewell.ALARM_TRIGGER"
        }
        
        val requestCode = alarmId.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
        Log.d(TAG, "Alarm cancelled: $alarmId")
    }
    
    /**
     * Check if exact alarms can be scheduled (Android 12+)
     */
    fun canScheduleExactAlarms(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.canScheduleExactAlarms()
        } else {
            true // Pre-Android 12 doesn't require special permission
        }
    }
}
