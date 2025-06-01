// This module handles responsive design with improved scaling

// Store original config values to use as reference points
let originalConfig = {
    canvasWidth: 1280,
    canvasHeight: 720,
    aspectRatio: 1280 / 720
};

// Current scale factor and offset for letterboxing/pillarboxing
let scaleFactor = 1;
let offsetX = 0;
let offsetY = 0;
let effectiveWidth = 1280;
let effectiveHeight = 720;

// Flag to track fullscreen state
let isFullscreen = false;

// Get reference to the canvas element
const canvas = document.getElementById('gameCanvas');
const container = document.getElementById('canvas-container');

/**
 * Initialize responsive handlers
 * This sets up event listeners and configures the initial layout
 */
export function initResponsiveMode() {
    // Apply initial sizing
    resizeCanvas();

    // Set up resize handler with debounce
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
        }, 100); // Debounce resize events
    });

    // Add fullscreen toggle keyboard shortcut (F11 or F)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F11' || (e.key === 'f' && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            toggleFullscreen();
        }
    });

    // Export functions to global window for external access
    window.gameUIControls = {
        toggleFullscreen,
        resizeCanvas,
        getScaleFactor: () => scaleFactor
    };

    // Export resize function globally
    window.resizeCanvas = resizeCanvas;
}

/**
 * Resize the canvas and game elements based on window size
 */
function resizeCanvas() {
    // Get current window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Check if we're in Cordova/mobile environment
    const isMobile = window.cordova !== undefined;

    if (isMobile) {
        // For mobile, we want to fill the screen while maintaining aspect ratio
        // This means we might have black bars either on top/bottom or left/right

        const windowRatio = windowWidth / windowHeight;
        const gameRatio = originalConfig.aspectRatio;

        if (windowRatio > gameRatio) {
            // Window is wider than game - fit to height with pillarboxing (black bars on sides)
            effectiveHeight = windowHeight;
            effectiveWidth = windowHeight * gameRatio;
            scaleFactor = windowHeight / originalConfig.canvasHeight;
            offsetX = (windowWidth - effectiveWidth) / 2;
            offsetY = 0;
        } else {
            // Window is taller than game - fit to width with letterboxing (black bars on top/bottom)
            effectiveWidth = windowWidth;
            effectiveHeight = windowWidth / gameRatio;
            scaleFactor = windowWidth / originalConfig.canvasWidth;
            offsetX = 0;
            offsetY = (windowHeight - effectiveHeight) / 2;
        }

        // Set canvas to original dimensions (we'll scale with CSS)
        canvas.width = originalConfig.canvasWidth;
        canvas.height = originalConfig.canvasHeight;

        // Scale and position the canvas
        canvas.style.width = `${effectiveWidth}px`;
        canvas.style.height = `${effectiveHeight}px`;
        canvas.style.position = 'absolute';
        canvas.style.left = `${offsetX}px`;
        canvas.style.top = `${offsetY}px`;

        // Update container to full screen
        container.style.width = `${windowWidth}px`;
        container.style.height = `${windowHeight}px`;
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.overflow = 'hidden';
        container.style.backgroundColor = '#000'; // Black background for letterboxing

    } else {
        // Desktop behavior remains the same
        const margin = 20;
        const windowRatio = windowWidth / windowHeight;
        let newWidth, newHeight;

        if (windowRatio > originalConfig.aspectRatio) {
            newHeight = windowHeight - margin;
            newWidth = newHeight * originalConfig.aspectRatio;
        } else {
            newWidth = windowWidth - margin;
            newHeight = newWidth / originalConfig.aspectRatio;
        }

        effectiveWidth = newWidth;
        effectiveHeight = newHeight;
        offsetX = 0;
        offsetY = 0;

        canvas.width = originalConfig.canvasWidth;
        canvas.height = originalConfig.canvasHeight;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
        canvas.style.position = 'relative';
        canvas.style.left = '0';
        canvas.style.top = '0';

        scaleFactor = newWidth / originalConfig.canvasWidth;

        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
        container.style.backgroundColor = 'transparent';
        const marginTop = Math.max(0, (windowHeight - newHeight) / 2);
        const marginLeft = Math.max(0, (windowWidth - newWidth) / 2);
        container.style.marginTop = `${marginTop}px`;
        container.style.marginLeft = `${marginLeft}px`;
        container.style.position = 'relative';
    }

    // Redraw the game
    if (window.scheduleDraw) {
        window.scheduleDraw();
    } else if (window.draw) {
        window.draw();
    }
}

/**
 * Toggle fullscreen mode for the application
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen()
                .then(() => {
                    isFullscreen = true;
                    resizeCanvas();
                })
                .catch(err => {
                    console.error('Error attempting to enable fullscreen:', err);
                });
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen()
                .then(() => {
                    isFullscreen = false;
                    resizeCanvas();
                })
                .catch(err => {
                    console.error('Error attempting to exit fullscreen:', err);
                });
        }
    }
}

/**
 * Convert window coordinates to canvas coordinates
 * This is necessary for proper mouse interaction
 * @param {number} clientX - Window X coordinate
 * @param {number} clientY - Window Y coordinate
 * @returns {Object} - Canvas coordinates {x, y}
 */
export function windowToCanvasCoordinates(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();

    // Adjust for the offset when there's letterboxing/pillarboxing
    const adjustedX = clientX - rect.left;
    const adjustedY = clientY - rect.top;

    // Convert to game coordinates
    const gameX = (adjustedX / effectiveWidth) * originalConfig.canvasWidth;
    const gameY = (adjustedY / effectiveHeight) * originalConfig.canvasHeight;

    return {
        x: gameX,
        y: gameY
    };
}

/**
 * Get the current scale factor
 * @returns {number} Current scale factor
 */
export function getScaleFactor() {
    return scaleFactor;
}

/**
 * Check if the application is currently in fullscreen mode
 * @returns {boolean} Fullscreen state
 */
export function isInFullscreen() {
    return isFullscreen;
}

// Export canvas state globally
window.getCanvasState = () => ({
    scaleFactor,
    offsetX,
    offsetY,
    effectiveWidth,
    effectiveHeight
});
