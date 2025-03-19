/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
    ],
    theme: {
        extend: {
            colors: {
                // Primary brand color with varying shades
                primary: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#2dd4bf',
                    500: '#14b8a6', // Teal accent
                    600: '#0d9488',
                    700: '#0f766e',
                    800: '#115e59',
                    900: '#134e4a',
                },
                accent: {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    200: '#e9d5ff',
                    300: '#d8b4fe',
                    400: '#c084fc',
                    500: '#a855f7', // Main brand color - rich purple
                    600: '#9333ea',
                    700: '#7e22ce',
                    800: '#6b21a8',
                    900: '#581c87',
                },
                // Refined dark theme colors
                dark: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                    950: '#030712', // Deepest background
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                heading: ['Manrope', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-in-left': 'slideInLeft 0.5s ease-out',
                'slide-in-up': 'slideInUp 0.5s ease-out',
                'bounce-gentle': 'bounceGentle 1s infinite',
                'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 1.5s ease-in-out infinite alternate',
                'ripple': 'ripple 0.8s ease-out forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': {opacity: '0'},
                    '100%': {opacity: '1'},
                },
                slideInLeft: {
                    '0%': {transform: 'translateX(-10px)', opacity: '0'},
                    '100%': {transform: 'translateX(0)', opacity: '1'},
                },
                slideInUp: {
                    '0%': {transform: 'translateY(10px)', opacity: '0'},
                    '100%': {transform: 'translateY(0)', opacity: '1'},
                },
                bounceGentle: {
                    '0%, 100%': {transform: 'translateY(-2px)'},
                    '50%': {transform: 'translateY(0)'},
                },
                glow: {
                    '0%': {textShadow: '0 0 2px #fff, 0 0 4px #fff, 0 0 6px currentColor'},
                    '100%': {textShadow: '0 0 4px #fff, 0 0 8px #fff, 0 0 12px currentColor'},
                },
                ripple: {
                    '0%': { transform: 'scale(0)', opacity: '0.7' },
                    '100%': { transform: 'scale(4)', opacity: '0' },
                },
            },
            boxShadow: {
                'elegant': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'button': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))',
            },
            transitionDuration: {
                '400': '400ms',
            },
        },
    },
    plugins: [],
}