// RiseWell - Main App Entry Point
import React, { useEffect, useRef } from 'react';
import { StatusBar, LogBox, AppState, Platform, Linking, Alert } from 'react-native';
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
import { initializeNotifications } from './src/services/NotificationService';
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

function App(): React.JSX.Element {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize notification channels on app start
    initializeNotifications();

    // Handle app state changes (background to foreground)
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
          // Alarm notification was delivered - open the alarm ring screen
          if (notificationType === 'alarm' || notificationType === 'snooze') {
            if (navigationRef.current) {
              navigationRef.current.navigate('AlarmRing', { alarmId });
            }
          }
          break;
        case EventType.PRESS:
          // User pressed on the notification
          if (notificationType === 'alarm' || notificationType === 'snooze') {
            if (navigationRef.current) {
              navigationRef.current.navigate('AlarmRing', { alarmId });
            }
          }
          break;
        case EventType.ACTION_PRESS:
          // User pressed an action button
          if (detail.pressAction?.id === 'snooze') {
            // Open alarm ring screen to handle snooze
            if (navigationRef.current) {
              navigationRef.current.navigate('AlarmRing', { alarmId });
            }
          } else if (detail.pressAction?.id === 'dismiss') {
            // Open alarm ring screen to handle dismiss
            if (navigationRef.current) {
              navigationRef.current.navigate('AlarmRing', { alarmId });
            }
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle background notification events (must be outside component or use notifee.onBackgroundEvent)
  useEffect(() => {
    // Register background event handler
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      console.log('Background event:', type, detail);

      const { alarmId, type: notificationType } = (detail.notification?.data || {}) as {
        alarmId?: string;
        type?: string;
      };

      if (!alarmId) return;

      if (type === EventType.PRESS || type === EventType.DELIVERED) {
        // This will be handled when app opens
        // The notification data will be available to the app
      }
    });
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
