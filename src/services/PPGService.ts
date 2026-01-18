// PPG Heart Rate Service - Real heart rate detection using camera
// Uses the phone's camera and flash to detect blood volume changes through fingertip

// Buffer to store red intensity values for analysis
let redIntensityBuffer: number[] = [];
let lastPeakTime: number = 0;
let beatIntervals: number[] = [];

// Configuration
const SAMPLE_WINDOW_MS = 8000; // 8 seconds of data
const MIN_SAMPLES_FOR_HR = 20;
const SMOOTHING_WINDOW = 5;

// Reset the measurement state
export function resetMeasurement(): void {
    redIntensityBuffer = [];
    lastPeakTime = 0;
    beatIntervals = [];
}

// Process a frame's red channel average intensity
export function processRedIntensity(intensity: number, timestamp: number): {
    heartRate: number | null;
    confidence: number;
    progress: number;
} {
    // Add to buffer
    redIntensityBuffer.push(intensity);

    // Calculate progress (0-100%)
    const progress = Math.min(100, (redIntensityBuffer.length / MIN_SAMPLES_FOR_HR) * 100);

    // Need minimum samples before calculating
    if (redIntensityBuffer.length < MIN_SAMPLES_FOR_HR) {
        return { heartRate: null, confidence: 0, progress };
    }

    // Keep only recent samples (roughly 8 seconds at 30fps = 240 samples)
    const maxSamples = 240;
    if (redIntensityBuffer.length > maxSamples) {
        redIntensityBuffer = redIntensityBuffer.slice(-maxSamples);
    }

    // Apply smoothing filter
    const smoothedData = applyMovingAverage(redIntensityBuffer, SMOOTHING_WINDOW);

    // Detect peaks (heartbeats)
    const peaks = detectPeaks(smoothedData);

    // Calculate heart rate from peak intervals
    if (peaks.length >= 2) {
        // Calculate intervals between peaks
        const intervals: number[] = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }

        // Convert to BPM (assuming ~30 fps)
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const fps = 30;
        const secondsPerBeat = avgInterval / fps;
        const bpm = Math.round(60 / secondsPerBeat);

        // Validate reasonable HR range (40-200 BPM)
        if (bpm >= 40 && bpm <= 200) {
            // Calculate confidence based on consistency
            const stdDev = calculateStdDev(intervals);
            const cv = stdDev / avgInterval; // Coefficient of variation
            const confidence = Math.max(0, Math.min(100, (1 - cv) * 100));

            return { heartRate: bpm, confidence, progress: 100 };
        }
    }

    return { heartRate: null, confidence: 0, progress };
}

// Apply moving average smoothing
function applyMovingAverage(data: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - windowSize); j <= Math.min(data.length - 1, i + windowSize); j++) {
            sum += data[j];
            count++;
        }
        result.push(sum / count);
    }
    return result;
}

// Simple peak detection algorithm
function detectPeaks(data: number[]): number[] {
    const peaks: number[] = [];
    const threshold = calculateThreshold(data);

    // Find local maxima above threshold
    for (let i = 2; i < data.length - 2; i++) {
        if (
            data[i] > data[i - 1] &&
            data[i] > data[i - 2] &&
            data[i] > data[i + 1] &&
            data[i] > data[i + 2] &&
            data[i] > threshold
        ) {
            // Check minimum distance from last peak (at least 15 frames = 0.5s at 30fps = 120 BPM max)
            if (peaks.length === 0 || i - peaks[peaks.length - 1] > 15) {
                peaks.push(i);
            }
        }
    }

    return peaks;
}

// Calculate adaptive threshold for peak detection
function calculateThreshold(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const max = Math.max(...data);
    // Threshold at 60% between mean and max
    return mean + (max - mean) * 0.6;
}

// Calculate standard deviation
function calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
}

// Check if finger is properly covering the camera (based on average red intensity)
export function isFingerDetected(avgRed: number): boolean {
    // When finger covers camera with flash, red channel should be high
    return avgRed > 100;
}

// Get measurement quality feedback
export function getMeasurementQuality(avgRed: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (avgRed < 80) return 'poor';
    if (avgRed < 120) return 'fair';
    if (avgRed < 180) return 'good';
    return 'excellent';
}
