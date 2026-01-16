// App Navigator - Main navigation setup
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
    HomeScreen,
    AlarmEditScreen,
    AlarmRingScreen,
    PuzzleScreen,
    HeartRateScreen,
    FlashCardsScreen,
    FlashCardQuizScreen,
    StatisticsScreen,
} from '../screens';
import { colors, typography } from '../theme';

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

export const AppNavigator: React.FC = () => {
    return (
        <NavigationContainer>
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
    );
};

export default AppNavigator;
