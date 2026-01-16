// Toggle Switch Component - Flat Materials Design
import React from 'react';
import {
    TouchableOpacity,
    View,
    StyleSheet,
    Animated,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface ToggleProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export const Toggle: React.FC<ToggleProps> = ({
    value,
    onValueChange,
    disabled = false,
    size = 'medium',
}) => {
    const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

    React.useEffect(() => {
        Animated.spring(animatedValue, {
            toValue: value ? 1 : 0,
            useNativeDriver: false,
            friction: 8,
            tension: 40,
        }).start();
    }, [value, animatedValue]);

    const getSizes = () => {
        switch (size) {
            case 'small':
                return { width: 40, height: 24, thumbSize: 18 };
            case 'medium':
                return { width: 52, height: 32, thumbSize: 24 };
            case 'large':
                return { width: 64, height: 38, thumbSize: 30 };
            default:
                return { width: 52, height: 32, thumbSize: 24 };
        }
    };

    const { width, height, thumbSize } = getSizes();
    const trackPadding = (height - thumbSize) / 2;

    const thumbPosition = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [trackPadding, width - thumbSize - trackPadding],
    });

    const trackColor = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.surfaceLight, colors.primary],
    });

    return (
        <TouchableOpacity
            onPress={() => !disabled && onValueChange(!value)}
            activeOpacity={0.8}
            disabled={disabled}
        >
            <Animated.View
                style={[
                    styles.track,
                    {
                        width,
                        height,
                        borderRadius: height / 2,
                        backgroundColor: trackColor,
                        opacity: disabled ? 0.5 : 1,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.thumb,
                        {
                            width: thumbSize,
                            height: thumbSize,
                            borderRadius: thumbSize / 2,
                            transform: [{ translateX: thumbPosition }],
                        },
                    ]}
                />
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    track: {
        justifyContent: 'center',
    },
    thumb: {
        backgroundColor: colors.white,
        position: 'absolute',
    },
});

export default Toggle;
