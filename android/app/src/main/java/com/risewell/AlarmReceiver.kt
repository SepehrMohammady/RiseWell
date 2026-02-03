package com.risewell

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * BroadcastReceiver that receives alarm trigger from AlarmManager.
 * Starts AlarmService as a foreground service to handle the alarm.
 */
class AlarmReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "AlarmReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Alarm received: ${intent.action}")
        
        if (intent.action == "com.risewell.ALARM_TRIGGER") {
            val alarmId = intent.getStringExtra("alarm_id") ?: return
            val soundUri = intent.getStringExtra("sound_uri") ?: "default"
            val label = intent.getStringExtra("label") ?: ""
            
            Log.d(TAG, "Processing alarm: $alarmId, sound: $soundUri, label: $label")
            
            // Start the foreground service
            val serviceIntent = Intent(context, AlarmService::class.java).apply {
                action = "com.risewell.START_ALARM"
                putExtra("alarm_id", alarmId)
                putExtra("sound_uri", soundUri)
                putExtra("label", label)
            }
            
            // Use startForegroundService for Android O+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}
