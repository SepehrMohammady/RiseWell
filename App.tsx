// RiseWell - Main App Entry Point
import React, { useEffect, useRef } from 'react';
import { StatusBar, LogBox, AppState, AppStateStatus, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import notifee, { EventType, Event } from '@notifee/react-native';
import { RootStackParamList } from './src/types';
import {
  HomeScreen,
  AlarmEditScreen,
  AlarmRingScreen,
  PuzzleScreen,
  HeartRateScreen,
  FlashCardsScreen,
  FlashCardQuizScreen,
  StatisticsScreen,
} from './src/screens';
import { initializeNotifications, cancelActiveAlarm } from './src/services/NotificationService';
import { colors, typography } from './src/theme';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.background,
  },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    fontWeight: typography.semibold,
  },
  contentStyle: {
    backgroundColor: colors.background,
  },
  headerShadowVisible: false,
};

// Background event handler - MUST be registered outside component
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Background event:', type, detail);

  const { alarmId } = (detail.notification?.data || {}) as {
    alarmId?: string;
  };

  if (!alarmId) return;

  // Handle action button presses in background
  if (type === EventType.ACTION_PRESS) {
    if (detail.pressAction?.id === 'dismiss' || detail.pressAction?.id === 'snooze') {
      // Cancel the notification - app will open and handle the action
      await notifee.cancelNotification(detail.notification?.id || '');
    }
  }
});

function App(): React.JSX.Element {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const pendingAlarmId = useRef<string | null>(null);
  const pendingAction = useRef<'dismiss' | 'snooze' | null>(null);

  useEffect(() => {
    // Initialize notification channels on app start
    initializeNotifications();

    // Check for initial notification (app opened from notification)
    checkInitialNotification();

    // Handle app state changes (background to foreground)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - check for pending alarm
        if (pendingAlarmId.current) {
          navigateToAlarm(pendingAlarmId.current, pendingAction.current);
          pendingAlarmId.current = null;
          pendingAction.current = null;
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkInitialNotification = async () => {
    const initialNotification = await notifee.getInitialNotification();
    if (initialNotification) {
      const { alarmId, type: notificationType } = (initialNotification.notification.data || {}) as {
        alarmId?: string;
        type?: string;
      };
      if (alarmId && (notificationType === 'alarm' || notificationType === 'snooze')) {
        const action = initialNotification.pressAction?.id as 'dismiss' | 'snooze' | undefined;
        // Wait for navigation to be ready, then reset stack to AlarmRing
        setTimeout(() => {
          if (navigationRef.current) {
            navigationRef.current.reset({
              index: 0,
              routes: [
                { name: 'Home' },
                { name: 'AlarmRing', params: { alarmId, action: action || undefined } },
              ],
            });
          }
        }, 500);
      }
    }
  };

  const navigateToAlarm = (alarmId: string, action: 'dismiss' | 'snooze' | null) => {
    if (navigationRef.current) {
      // Reset navigation stack to ensure we go to AlarmRing
      navigationRef.current.reset({
        index: 1,
        routes: [
          { name: 'Home' },
          { name: 'AlarmRing', params: { alarmId, action: action || undefined } },
        ],
      });
    }
  };

  // Handle foreground notification events
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }: Event) => {
      console.log('Foreground event:', type, detail);

      if (!detail.notification?.data) return;

      const { alarmId, type: notificationType } = detail.notification.data as {
        alarmId: string;
        type: string;
      };

      switch (type) {
        case EventType.DELIVERED:
          // Alarm notification was delivered - open the alarm ring screen immediately
          if (notificationType === 'alarm' || notificationType === 'snooze') {
            navigateToAlarm(alarmId, null);
          }
          break;
        case EventType.PRESS:
          // User pressed on the notification
          if (notificationType === 'alarm' || notificationType === 'snooze') {
            navigateToAlarm(alarmId, null);
          }
          break;
        case EventType.ACTION_PRESS:
          // User pressed an action button
          if (detail.pressAction?.id === 'snooze') {
            navigateToAlarm(alarmId, 'snooze');
          } else if (detail.pressAction?.id === 'dismiss') {
            navigateToAlarm(alarmId, 'dismiss');
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={screenOptions}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AlarmEdit"
              component={AlarmEditScreen}
              options={({ route }) => ({
                title: route.params?.alarmId ? 'Edit Alarm' : 'New Alarm',
                headerBackTitle: 'Back',
              })}
            />
            <Stack.Screen
              name="AlarmRing"
              component={AlarmRingScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="Puzzle"
              component={PuzzleScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="HeartRate"
              component={HeartRateScreen}
              options={{
                title: 'Heart Rate Check',
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="FlashCards"
              component={FlashCardsScreen}
              options={{
                title: 'Flash Cards',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="FlashCardQuiz"
              component={FlashCardQuizScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Statistics"
              component={StatisticsScreen}
              options={{
                title: 'Statistics',
                headerBackTitle: 'Back',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
