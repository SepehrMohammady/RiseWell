// Reusable Button Component - Flat Materials Design
import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    style,
    textStyle,
    fullWidth = false,
}) => {
    const getBackgroundColor = () => {
        if (disabled) return colors.surfaceLight;
        switch (variant) {
            case 'primary': return colors.primary;
            case 'secondary': return colors.surface;
            case 'outline': return colors.transparent;
            case 'ghost': return colors.transparent;
            default: return colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.textMuted;
        switch (variant) {
            case 'primary': return colors.black;
            case 'secondary': return colors.textPrimary;
            case 'outline': return colors.primary;
            case 'ghost': return colors.primary;
            default: return colors.black;
        }
    };

    const getPadding = () => {
        switch (size) {
            case 'small': return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
            case 'medium': return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
            case 'large': return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl };
            default: return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
        }
    };

    const getFontSize = () => {
        switch (size) {
            case 'small': return typography.caption;
            case 'medium': return typography.body;
            case 'large': return typography.h3;
            default: return typography.body;
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            style={[
                styles.button,
                {
                    backgroundColor: getBackgroundColor(),
                    ...getPadding(),
                    borderWidth: variant === 'outline' ? 2 : 0,
                    borderColor: variant === 'outline' ? colors.primary : colors.transparent,
                },
                fullWidth && styles.fullWidth,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} size="small" />
            ) : (
                <Text
                    style={[
                        styles.text,
                        {
                            color: getTextColor(),
                            fontSize: getFontSize(),
                            fontWeight: typography.semibold,
                        },
                        textStyle,
                    ]}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    text: {
        textAlign: 'center',
    },
    fullWidth: {
        width: '100%',
    },
});

export default Button;
