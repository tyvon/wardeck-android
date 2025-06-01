/**
 * Cordova initialization and device-specific configurations
 */

// Flag to track if Cordova is available
export const isCordovaAvailable = () => {
    return window.cordova !== undefined;
};

// Flag to track if device is ready
let deviceReady = false;

// Device ready promise
let deviceReadyPromise = null;

/**
 * Wait for device ready event
 * @returns {Promise} Resolves when device is ready
 */
export function waitForDeviceReady() {
    if (!isCordovaAvailable()) {
        // Not in Cordova environment, resolve immediately
        return Promise.resolve();
    }

    if (deviceReady) {
        // Device already ready
        return Promise.resolve();
    }

    if (!deviceReadyPromise) {
        // Create promise that resolves when device is ready
        deviceReadyPromise = new Promise((resolve) => {
            document.addEventListener('deviceready', () => {
                deviceReady = true;
                initializeCordovaFeatures();
                resolve();
            }, false);
        });
    }

    return deviceReadyPromise;
}

/**
 * Initialize Cordova-specific features
 */
function initializeCordovaFeatures() {
    console.log('Cordova device ready - initializing features');

    // Set up status bar
    if (window.StatusBar) {
        window.StatusBar.hide();
    }

    // Force fullscreen mode on Android
    if (window.AndroidFullScreen) {
        window.AndroidFullScreen.immersiveMode(
            () => {
                console.log('Entered fullscreen mode');
                // Force resize after entering fullscreen
                setTimeout(() => {
                    if (window.resizeCanvas) {
                        window.resizeCanvas();
                    }
                }, 100);
            },
            (err) => console.warn('Fullscreen error:', err)
        );
    }

    // Set up screen orientation (landscape only)
    if (window.screen && window.screen.orientation) {
        window.screen.orientation.lock('landscape').catch(err => {
            console.warn('Could not lock screen orientation:', err);
        });
    }

    // Set up fullscreen
    if (window.AndroidFullScreen) {
        window.AndroidFullScreen.immersiveMode(
            () => console.log('Entered fullscreen mode'),
            (err) => console.warn('Fullscreen error:', err)
        );
    }

    // Handle pause/resume events
    document.addEventListener('pause', onDevicePause, false);
    document.addEventListener('resume', onDeviceResume, false);

    // Handle back button
    document.addEventListener('backbutton', onBackButton, false);

    // Prevent default touch behaviors that might interfere with the game
    document.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    document.addEventListener('touchmove', preventDefaultTouch, { passive: false });
}

/**
 * Handle device pause event (app goes to background)
 */
function onDevicePause() {
    console.log('App paused');
    // Pause game music and sounds
    if (window.audioManager) {
        window.audioManager.pauseAll();
    }
    // Pause game loop
    if (window.gameState && window.gameState.pauseGameLoop) {
        window.gameState.pauseGameLoop();
    }
}

/**
 * Handle device resume event (app comes back to foreground)
 */
function onDeviceResume() {
    console.log('App resumed');
    // Resume game music and sounds
    if (window.audioManager) {
        window.audioManager.resumeAll();
    }
    // Note: Don't auto-resume game loop - let player unpause manually
}

/**
 * Handle back button press
 */
function onBackButton(e) {
    e.preventDefault();

    // Check if modal is visible
    const visibleModal = document.querySelector('.modal-overlay:not([style*="display: none"])');
    if (visibleModal) {
        // Close modal instead of exiting app
        if (window.modalModule && window.modalModule.hideModalWindow) {
            window.modalModule.hideModalWindow();
        }
    } else {
        // Show main menu or confirm exit
        if (window.modalModule && window.modalModule.showModalWindow) {
            window.modalModule.showModalWindow();
        }
    }
}

/**
 * Prevent default touch behavior to avoid scrolling/zooming
 */
function preventDefaultTouch(e) {
    // Only prevent default for touches on the game canvas
    if (e.target.id === 'gameCanvas' || e.target.closest('#canvas-container')) {
        e.preventDefault();
    }
}

/**
 * Exit the application (Cordova only)
 */
export function exitApp() {
    if (isCordovaAvailable() && navigator.app && navigator.app.exitApp) {
        navigator.app.exitApp();
    } else {
        // Fallback for non-Cordova environments
        window.close();
    }
}

/**
 * Get device information
 * @returns {Object} Device information or null
 */
export function getDeviceInfo() {
    if (isCordovaAvailable() && window.device) {
        return {
            platform: window.device.platform,
            version: window.device.version,
            model: window.device.model,
            manufacturer: window.device.manufacturer,
            isVirtual: window.device.isVirtual,
            uuid: window.device.uuid
        };
    }
    return null;
}

/**
 * Vibrate device (if supported)
 * @param {number} duration - Vibration duration in milliseconds
 */
export function vibrate(duration = 100) {
    if (isCordovaAvailable() && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

// Auto-initialize if in Cordova environment
if (isCordovaAvailable()) {
    waitForDeviceReady();
}
