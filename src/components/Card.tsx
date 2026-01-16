// Card Component - Flat Materials Design
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    variant = 'default',
}) => {
    const getStyle = () => {
        switch (variant) {
            case 'elevated':
                return {
                    backgroundColor: colors.surfaceLight,
                };
            case 'outlined':
                return {
                    backgroundColor: colors.transparent,
                    borderWidth: 1,
                    borderColor: colors.surfaceLight,
                };
            default:
                return {
                    backgroundColor: colors.surface,
                };
        }
    };

    return (
        <View style={[styles.card, getStyle(), style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
});

export default Card;
