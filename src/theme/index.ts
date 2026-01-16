// RiseWell Theme - Minimal Flat Materials Design
// Colors inspired by logo: warm orange, yellow, brown

export const colors = {
    // Primary palette from logo
    primary: '#F5A623',      // Warm orange (sun)
    primaryLight: '#FFD93D', // Bright yellow
    primaryDark: '#E08B1E',  // Darker orange

    // Accent
    accent: '#6B4423',       // Brown (from logo text)
    accentLight: '#8B6914',  // Lighter brown

    // Backgrounds (dark theme)
    background: '#121212',
    surface: '#1E1E1E',
    surfaceLight: '#2A2A2A',

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textMuted: '#707070',

    // Semantic
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',

    // Utility
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const typography = {
    // Font sizes
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    caption: 14,
    small: 12,

    // Font weights
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const shadows = {
    // Minimal - flat design, so shadows are very subtle or none
    none: {},
    subtle: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
};

export default {
    colors,
    spacing,
    typography,
    borderRadius,
    shadows,
};
