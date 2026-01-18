// Audio Service - Sound playback for alarms and preview
import Sound from 'react-native-sound';

// Enable playback in silent mode
Sound.setCategory('Playback');

// Sound file mapping
const SOUND_FILES: Record<string, string> = {
    default: 'default',
    alarm1: 'alarm1.mp3',
    alarm2: 'alarm2.mp3',
    alarm3: 'alarm3.mp3',
    alarm4: 'alarm4.mp3',
    alarm5: 'alarm5.mp3',
};

let currentSound: Sound | null = null;

// Play a sound (for preview or alarm ring)
export function playSound(soundUri: string, loop: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
        // Stop any currently playing sound
        stopSound();

        const soundFile = SOUND_FILES[soundUri] || SOUND_FILES.default;

        // Use default system sound if 'default'
        if (soundFile === 'default') {
            resolve();
            return;
        }

        const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.error('Failed to load sound:', error);
                reject(error);
                return;
            }

            currentSound = sound;

            if (loop) {
                sound.setNumberOfLoops(-1);
            }

            sound.setVolume(1.0);
            sound.play((success) => {
                if (success) {
                    resolve();
                } else {
                    console.error('Sound playback failed');
                    reject(new Error('Playback failed'));
                }
            });
        });
    });
}

// Stop currently playing sound
export function stopSound(): void {
    if (currentSound) {
        currentSound.stop();
        currentSound.release();
        currentSound = null;
    }
}

// Play preview (short clip, no loop)
export async function playPreview(soundUri: string): Promise<void> {
    return new Promise((resolve, reject) => {
        stopSound();

        const soundFile = SOUND_FILES[soundUri] || SOUND_FILES.default;

        if (soundFile === 'default') {
            // For default, do nothing (system handles it)
            resolve();
            return;
        }

        const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
            if (error) {
                console.error('Failed to load preview sound:', error);
                reject(error);
                return;
            }

            currentSound = sound;
            sound.setVolume(1.0);

            // Play for 3 seconds then stop
            sound.play(() => {
                sound.release();
                currentSound = null;
                resolve();
            });

            // Auto-stop after 3 seconds
            setTimeout(() => {
                if (currentSound === sound) {
                    sound.stop();
                    sound.release();
                    currentSound = null;
                }
            }, 3000);
        });
    });
}

// Get sound display name
export function getSoundDisplayName(soundUri: string): string {
    const names: Record<string, string> = {
        default: '🔔 Default',
        alarm1: '🎵 Gentle Wake',
        alarm2: '🎵 Morning Rise',
        alarm3: '🎵 Sunrise Bell',
        alarm4: '🎵 Soft Chime',
        alarm5: '🎵 Dawn Break',
    };
    return names[soundUri] || '🔔 Default';
}
