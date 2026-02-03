package com.risewell

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BroadcastReceiver that receives BOOT_COMPLETED broadcast.
 * Re-schedules all saved alarms after device reboot.
 */
class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Device rebooted - will reschedule alarms from React Native")
            
            // Send a broadcast that React Native can listen to for rescheduling
            // The actual rescheduling happens in React Native where alarm data is stored
            val rescheduleIntent = Intent("com.risewell.RESCHEDULE_ALARMS")
            context.sendBroadcast(rescheduleIntent)
            
            // Also launch the app in background to trigger reschedule
            // This is handled by React Native's AsyncStorage and alarm data
        }
    }
}
