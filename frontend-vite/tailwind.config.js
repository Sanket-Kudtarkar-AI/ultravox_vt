module.exports = {
    // other configurations...
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    plugins: [],
    theme: {
        extend: {
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.4s ease-out',
                'slide-in-left': 'slideInLeft 0.4s ease-out',
                'slide-in-up': 'slideInUp 0.4s ease-out',
                'bounce-gentle': 'bounce 2s infinite ease-in-out',
                'glow': 'glow 2s infinite ease-in-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': {opacity: '0'},
                    '100%': {opacity: '1'},
                },
                slideInRight: {
                    '0%': {transform: 'translateX(20px)', opacity: '0'},
                    '100%': {transform: 'translateX(0)', opacity: '1'},
                },
                slideInLeft: {
                    '0%': {transform: 'translateX(-20px)', opacity: '0'},
                    '100%': {transform: 'translateX(0)', opacity: '1'},
                },
                slideInUp: {
                    '0%': {transform: 'translateY(20px)', opacity: '0'},
                    '100%': {transform: 'translateY(0)', opacity: '1'},
                },
                bounce: {
                    '0%, 100%': {transform: 'translateY(0)'},
                    '50%': {transform: 'translateY(-5px)'},
                },
                glow: {
                    '0%, 100%': {boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)'},
                    '50%': {boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)'},
                },
            },
        },
    },
}