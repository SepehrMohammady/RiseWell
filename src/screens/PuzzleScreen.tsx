// Puzzle Screen - Container for puzzle components
import React, { useCallback } from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, PuzzleType, DifficultyLevel } from '../types';
import { PatternMemory } from '../puzzles/PatternMemory';
import { colors } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'Puzzle'>;

export const PuzzleScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { difficulty, puzzleType, onComplete } = route.params;

    // Prevent back button during puzzle
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                // Prevent back navigation during puzzle
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => subscription.remove();
        }, [])
    );

    const handlePuzzleComplete = (errors: number, timeMs: number) => {
        // Call the completion callback
        onComplete();

        // Go back
        navigation.goBack();
    };

    const renderPuzzle = () => {
        switch (puzzleType) {
            case 'pattern':
                return (
                    <PatternMemory
                        difficulty={difficulty}
                        onComplete={handlePuzzleComplete}
                    />
                );
            case 'logic':
                // TODO: Implement SimpleLogic puzzle
                return (
                    <PatternMemory
                        difficulty={difficulty}
                        onComplete={handlePuzzleComplete}
                    />
                );
            case 'math':
                // TODO: Implement QuickMath puzzle
                return (
                    <PatternMemory
                        difficulty={difficulty}
                        onComplete={handlePuzzleComplete}
                    />
                );
            default:
                return (
                    <PatternMemory
                        difficulty={difficulty}
                        onComplete={handlePuzzleComplete}
                    />
                );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <View style={styles.content}>
                {renderPuzzle()}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
});

export default PuzzleScreen;
