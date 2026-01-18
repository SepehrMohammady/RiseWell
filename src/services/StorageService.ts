// Storage Service - AsyncStorage wrapper for CRUD operations
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm, FlashCard, WakeRecord } from '../types';

const KEYS = {
    ALARMS: '@risewell_alarms',
    FLASHCARDS: '@risewell_flashcards',
    WAKE_RECORDS: '@risewell_wake_records',
    SETTINGS: '@risewell_settings',
};

// Generic helpers
async function getItem<T>(key: string): Promise<T | null> {
    try {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Error reading ${key}:`, error);
        return null;
    }
}

async function setItem<T>(key: string, value: T): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing ${key}:`, error);
        throw error;
    }
}

// Alarms
export async function getAlarms(): Promise<Alarm[]> {
    const alarms = await getItem<Alarm[]>(KEYS.ALARMS);
    return alarms || [];
}

export async function saveAlarm(alarm: Alarm): Promise<void> {
    const alarms = await getAlarms();
    const index = alarms.findIndex(a => a.id === alarm.id);

    if (index >= 0) {
        alarms[index] = alarm;
    } else {
        alarms.push(alarm);
    }

    await setItem(KEYS.ALARMS, alarms);
}

export async function deleteAlarm(id: string): Promise<void> {
    const alarms = await getAlarms();
    const filtered = alarms.filter(a => a.id !== id);
    await setItem(KEYS.ALARMS, filtered);
}

export async function getAlarmById(id: string): Promise<Alarm | null> {
    const alarms = await getAlarms();
    return alarms.find(a => a.id === id) || null;
}

// Flash Cards
export async function getFlashCards(): Promise<FlashCard[]> {
    const cards = await getItem<FlashCard[]>(KEYS.FLASHCARDS);
    return cards || [];
}

export async function saveFlashCard(card: FlashCard): Promise<void> {
    const cards = await getFlashCards();
    const index = cards.findIndex(c => c.id === card.id);

    if (index >= 0) {
        cards[index] = card;
    } else {
        // Allow up to 100 cards
        if (cards.length >= 100) {
            throw new Error('Maximum of 100 flash cards allowed');
        }
        cards.push(card);
    }

    await setItem(KEYS.FLASHCARDS, cards);
}

export async function deleteFlashCard(id: string): Promise<void> {
    const cards = await getFlashCards();
    const filtered = cards.filter(c => c.id !== id);
    await setItem(KEYS.FLASHCARDS, filtered);
}

// Wake Records
export async function getWakeRecords(): Promise<WakeRecord[]> {
    const records = await getItem<WakeRecord[]>(KEYS.WAKE_RECORDS);
    return records || [];
}

export async function saveWakeRecord(record: WakeRecord): Promise<void> {
    const records = await getWakeRecords();
    records.push(record);

    // Keep only last 30 days of records
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = records.filter(r => new Date(r.date).getTime() > thirtyDaysAgo);

    await setItem(KEYS.WAKE_RECORDS, filtered);
}

export async function getRecentWakeRecords(days: number = 7): Promise<WakeRecord[]> {
    const records = await getWakeRecords();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return records.filter(r => new Date(r.date).getTime() > cutoff);
}

// Generate unique ID
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
