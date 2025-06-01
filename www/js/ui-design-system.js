/**
 * UI Design System
 * A centralized collection of UI styles and constants for consistent design
 */

export const UI = {
    /**
     * Color palette for the game
     */
    colors: {
        // Primary palette
        primary: '#32a63d',          // Main green color
        primaryLight: '#4fca5a',     // Lighter green variant
        primaryDark: '#28822f',      // Darker green variant
        primaryGlow: '#00ff41',      // Glowing green for highlights

        // Secondary palette - opponent/danger
        secondary: '#bf3232',        // Main red color
        secondaryLight: '#e04444',   // Lighter red variant
        secondaryDark: '#9c2828',    // Darker red variant
        secondaryGlow: '#ff5a5a',    // Glowing red for highlights

        // Background colors
        background: '#1e262c',       // Main background color
        backgroundDark: '#121a20',   // Darker background variant
        panelBg: 'rgba(24, 32, 38, 0.85)', // Semi-transparent panel background
        modalBg: 'rgba(20, 28, 34, 0.95)', // Modal window background

        // Text colors
        textPrimary: '#ffffff',      // Primary text color
        textSecondary: '#a7e1ad',    // Secondary text color (green tint)
        textTertiary: '#8a9ba8',     // Tertiary text color (gray)
        textHighlight: '#00ff41',    // Highlighted text (bright green)

        // Accent colors
        gold: '#FFD700',             // Gold color for money indicators
        blue: '#4a7eff',             // Blue accent

        // UI element colors
        buttonPrimary: '#4CAF50',    // Button color
        buttonHover: '#45a049',      // Button hover color
        border: '#32a63d',           // Border color
        borderDark: '#255c2b',       // Darker border color
        overlay: 'rgba(0, 0, 0, 0.7)' // Dark overlay for modals
    },

    /**
     * Typography settings
     */
    fonts: {
        primary: "'Oxanium', 'Rajdhani', 'Segoe UI', Arial, sans-serif",  // Main font family
        heading: "'Oxanium', 'Rajdhani', 'Segoe UI', Arial, sans-serif",  // Heading font family
        monospace: "'JetBrains Mono', 'Courier New', monospace"           // Monospace font for technical details
    },

    /**
     * Font sizes
     */
    sizes: {
        textSmall: '14px',
        textNormal: '16px',
        textLarge: '18px',
        headingSmall: '20px',
        headingMedium: '22px',
        headingLarge: '26px',
        displaySmall: '30px',
        displayLarge: '38px'
    },

    /**
     * Font weights
     */
    weights: {
        normal: '400',
        semiBold: '600',
        bold: '700'
    },

    /**
     * Borders and radius
     */
    borders: {
        none: 'none',
        thin: '1px solid #32a63d',
        normal: '2px solid #32a63d',
        thick: '3px solid #32a63d',
        dashedThin: '1px dashed #32a63d',
        dashedNormal: '2px dashed #32a63d',
        panelRadius: '10px',
        buttonRadius: '5px',
        smallRadius: '3px'
    },

    /**
     * Shadows and glow effects
     */
    shadows: {
        panel: 'none',
        panelIntense: 'none',
        text: 'none',
        textIntense: 'none',
        button: 'none',
        buttonHover: 'none',
        redGlow: 'none'
    },

    /**
     * Spacing values
     */
    spacing: {
        tiny: '4px',
        small: '8px',
        medium: '16px',
        large: '24px',
        xlarge: '32px',
        xxlarge: '48px'
    },

    /**
     * Animation timings
     */
    animation: {
        fast: '0.2s ease',
        normal: '0.3s ease',
        slow: '0.5s ease',
        verySlow: '1s ease',
        pulse: 'pulse 2s infinite'
    },

    /**
     * Z-index layers
     */
    zIndex: {
        base: 1,
        aboveBase: 10,
        modal: 1000,
        overlay: 999,
        tooltip: 1500,
        top: 2000
    },

    /**
     * Opacity values
     */
    opacity: {
        invisible: 0,
        faint: 0.3,
        medium: 0.5,
        visible: 0.7,
        high: 0.9,
        full: 1
    },

    /**
     * Game-specific UI components
     */
    components: {
        // Panel configurations
        panel: {
            background: 'linear-gradient(to bottom, rgba(30, 38, 44, 0.9), rgba(24, 32, 38, 0.9))',
            border: '2px solid #32a63d',
            borderRadius: '10px',
            boxShadow: '0 0 15px rgba(50, 166, 61, 0.3)'
        },

        // Button configurations
        button: {
            primary: `
                background: linear-gradient(to bottom, #4CAF50, #3d8c40);
                color: white;
                border: none;
                border-radius: 5px;
                padding: 8px 16px;
                font-family: 'Oxanium', 'Rajdhani', sans-serif;
                font-weight: 600;
                
                
                transition: all 0.3s ease;
            `,
            primaryHover: `
                background: linear-gradient(to bottom, #45a049, #357a37);
                
            `,
            secondary: `
                background: linear-gradient(to bottom, #2c3e50, #1a242f);
                color: #32a63d;
                border: 1px solid #32a63d;
                border-radius: 5px;
                padding: 8px 16px;
                font-family: 'Oxanium', 'Rajdhani', sans-serif;
                font-weight: 600;
                
                transition: all 0.3s ease;
            `,
            secondaryHover: `
                background: linear-gradient(to bottom, #34495e, #2c3e50);
                border-color: #4fca5a;
                color: #4fca5a;
                
            `,
            danger: `
                background: linear-gradient(to bottom, #e74c3c, #c0392b);
                color: white;
                border: none;
                border-radius: 5px;
                padding: 8px 16px;
                font-family: 'Oxanium', 'Rajdhani', sans-serif;
                font-weight: 600;
                
                
                transition: all 0.3s ease;
            `,
            dangerHover: `
                background: linear-gradient(to bottom, #ff5e4c, #d04a3b);
                
            `
        },

        // Stat bar configurations
        statBar: {
            background: 'rgba(20, 28, 34, 0.6)',
            border: '1px solid #32a63d',
            borderRadius: '3px',
            height: '10px',
            fillGradient: 'linear-gradient(to right, #32a63d, #00ff41)'
        },

        // Health bar configurations
        healthBar: {
            background: 'rgba(20, 28, 34, 0.6)',
            border: '1px solid #32a63d',
            borderRadius: '2px',
            height: '5px',
            highHealth: 'linear-gradient(to right, #32a63d, #00ff41)',
            mediumHealth: 'linear-gradient(to right, #e7ca4c, #ffde4c)',
            lowHealth: 'linear-gradient(to right, #e74c3c, #ff5e4c)'
        }
    },

    /**
     * Utility functions
     */
    utils: {
        /**
         * Creates CSS for text with glow effect
         * @param {string} color - Text color
         * @param {string} glowColor - Glow color
         * @param {string} intensity - Glow intensity (low, medium, high)
         * @returns {string} - CSS styles string
         */
        glowText: (color = '#00ff41', glowColor = 'rgba(0, 255, 65, 0.5)', intensity = 'medium') => {
            const blurRadius = {
                low: '2px',
                medium: '5px',
                high: '10px'
            }[intensity] || '5px';

            return `
                color: ${color};
                
            `;
        },

        /**
         * Creates a gradient text style
         * @param {string} startColor - Gradient start color
         * @param {string} endColor - Gradient end color
         * @param {string} direction - Gradient direction
         * @returns {string} - CSS background styles for text
         */
        gradientText: (startColor = '#32a63d', endColor = '#00ff41', direction = 'to right') => {
            return `
                background: linear-gradient(${direction}, ${startColor}, ${endColor});
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                text-fill-color: transparent;
            `;
        },

        /**
         * Creates CSS for a panel with tech design style
         * @param {boolean} withInnerBorder - Whether to add an inner border
         * @returns {string} - CSS styles string
         */
        techPanel: (withInnerBorder = true) => {
            return `
                background: linear-gradient(to bottom, rgba(30, 38, 44, 0.9), rgba(24, 32, 38, 0.9));
                border: 2px solid #32a63d;
                border-radius: 10px;
                
                position: relative;
                ${withInnerBorder ? `
                &::after {
                    content: '';
                    position: absolute;
                    top: 3px;
                    left: 3px;
                    right: 3px;
                    bottom: 3px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    pointer-events: none;
                }
                ` : ''}
            `;
        }
    },

    /**
     * Keyframe animations
     */
    keyframes: {
        pulse: `
            @keyframes pulse {
                0% { 
                    
                    
                }
                50% { 
                    
                    
                }
                100% { 
                    
                    
                }
            }
        `,
        fadeIn: `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `,
        slideUp: `
            @keyframes slideUp {
                from { 
                    transform: translateY(20px);
                    opacity: 0;
                }
                to { 
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `,
        blink: `
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.2; }
            }
        `
    }
};

/**
 * Injects required CSS keyframes into the document
 */
export function injectKeyframes() {
    if (document.querySelector('#ui-keyframes')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'ui-keyframes';

    let keyframesCSS = '';
    for (const keyframe in UI.keyframes) {
        keyframesCSS += UI.keyframes[keyframe];
    }

    styleEl.textContent = keyframesCSS;
    document.head.appendChild(styleEl);
}

/**
 * Loads the required fonts for the UI
 */
export function loadFonts() {
    if (document.querySelector('#ui-fonts')) return;

    const fontLink = document.createElement('link');
    fontLink.id = 'ui-fonts';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Oxanium:wght@400;600;700&family=Rajdhani:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
}

/**
 * Initialize the UI design system
 */
export function initUIDesignSystem() {
    loadFonts();
    injectKeyframes();

    // Log initialization to console
    console.log('%c UI Design System Initialized', 'color: #00ff41; font-weight: bold; background: #1e262c; padding: 5px 10px; border-radius: 3px;');
}

// Export utility functions for direct use
export const glowText = UI.utils.glowText;
export const gradientText = UI.utils.gradientText;
export const techPanel = UI.utils.techPanel;
