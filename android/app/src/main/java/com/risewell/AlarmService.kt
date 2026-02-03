package com.risewell

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground Service that handles alarm execution.
 * Plays sound, vibrates, and shows full-screen notification.
 */
class AlarmService : Service() {
    
    companion object {
        private const val TAG = "AlarmService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "alarm_service_channel"
        
        // Static reference for React Native bridge
        @Volatile
        var currentInstance: AlarmService? = null
            private set
    }
    
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var currentAlarmId: String? = null
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "AlarmService created")
        currentInstance = this
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "onStartCommand: ${intent?.action}")
        
        when (intent?.action) {
            "com.risewell.START_ALARM" -> {
                val alarmId = intent.getStringExtra("alarm_id") ?: ""
                val soundUri = intent.getStringExtra("sound_uri") ?: "default"
                val label = intent.getStringExtra("label") ?: ""
                
                currentAlarmId = alarmId
                
                // Create notification channel for Android O+
                createNotificationChannel()
                
                // Start as foreground service with notification
                startForeground(NOTIFICATION_ID, createNotification(alarmId, label))
                
                // Request audio focus and start playback
                requestAudioFocusAndPlay(soundUri)
                
                // Start vibration
                startVibration()
                
                // Launch the alarm ring activity
                launchAlarmActivity(alarmId)
            }
            "com.risewell.STOP_ALARM" -> {
                stopAlarm()
            }
            "com.risewell.SNOOZE_ALARM" -> {
                // Handle snooze - will be called from React Native
                stopAlarm()
            }
        }
        
        return START_NOT_STICKY
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarm Service",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Active alarm notification"
                enableLights(true)
                lightColor = Color.parseColor("#F5A623")
                enableVibration(false) // We handle vibration separately
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(alarmId: String, label: String): Notification {
        // Full-screen intent to launch alarm activity
        val fullScreenIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("alarm_id", alarmId)
            putExtra("source", "full_screen_notification")
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            0,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Dismiss action
        val dismissIntent = Intent(this, AlarmService::class.java).apply {
            action = "com.risewell.STOP_ALARM"
        }
        val dismissPendingIntent = PendingIntent.getService(
            this,
            1,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⏰ ${label.ifEmpty { "Alarm" }}")
            .setContentText("Tap to open")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .addAction(R.mipmap.ic_launcher, "Dismiss", dismissPendingIntent)
            .build()
    }
    
    private fun requestAudioFocusAndPlay(soundUri: String) {
        // Request audio focus
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener { focusChange ->
                    Log.d(TAG, "Audio focus changed: $focusChange")
                    // Don't stop on focus loss - alarms are critical
                }
                .build()
            
            audioManager?.requestAudioFocus(audioFocusRequest!!)
        } else {
            @Suppress("DEPRECATION")
            audioManager?.requestAudioFocus(
                { /* ignore focus changes for alarm */ },
                AudioManager.STREAM_ALARM,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            )
        }
        
        // Play sound
        playSound(soundUri)
    }
    
    private fun playSound(soundUri: String) {
        try {
            stopSound() // Stop any existing playback
            
            // Map sound URI to resource
            val soundResId = when (soundUri) {
                "alarm1" -> R.raw.alarm1
                "alarm2" -> R.raw.alarm2
                "alarm3" -> R.raw.alarm3
                "alarm4" -> R.raw.alarm4
                "alarm5" -> R.raw.alarm5
                else -> R.raw.alarm1 // Default to alarm1
            }
            
            mediaPlayer = MediaPlayer.create(this, soundResId)?.apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                setVolume(1.0f, 1.0f)
                start()
            }
            
            Log.d(TAG, "Playing alarm sound: $soundUri")
        } catch (e: Exception) {
            Log.e(TAG, "Error playing sound: ${e.message}")
        }
    }
    
    private fun stopSound() {
        try {
            mediaPlayer?.apply {
                if (isPlaying) stop()
                release()
            }
            mediaPlayer = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping sound: ${e.message}")
        }
    }
    
    private fun startVibration() {
        val pattern = longArrayOf(0, 500, 1000, 500, 1000)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val vibrationEffect = VibrationEffect.createWaveform(pattern, 0)
            vibrator?.vibrate(vibrationEffect)
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }
    
    private fun stopVibration() {
        vibrator?.cancel()
    }
    
    private fun launchAlarmActivity(alarmId: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("alarm_id", alarmId)
            putExtra("source", "alarm_service")
        }
        startActivity(intent)
    }
    
    fun stopAlarm() {
        Log.d(TAG, "Stopping alarm")
        stopSound()
        stopVibration()
        
        // Abandon audio focus
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager?.abandonAudioFocus(null)
        }
        
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }
    
    override fun onDestroy() {
        Log.d(TAG, "AlarmService destroyed")
        stopSound()
        stopVibration()
        currentInstance = null
        super.onDestroy()
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
}
