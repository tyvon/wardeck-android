import { audioManager } from './audioManager.js';

// Track if modal is currently visible
let isModalVisible = false;

// Cache references to avoid circular imports
let modalModule = null;
let gameStateModule = null;
let rendererModule = null;

// Track modal state
export function setModalVisible(visible) {
    isModalVisible = visible;
}

// Initialize module references to avoid circular imports
async function initializeModules() {
    if (!modalModule) {
        modalModule = await import('./modalWindow.js');
    }
    if (!gameStateModule) {
        gameStateModule = await import('./gameState.js');
    }
    if (!rendererModule) {
        rendererModule = await import('./renderer.js');
    }
}

// Keyboard shortcuts configuration
const keyboardShortcuts = {
    // Menu controls
    'Escape': handleEscapeKey,
    'F1': showHelpMenu,

    // Game controls
    ' ': handleSpacebar,  // Space key is represented as a space character
    'Enter': handleEnterKey,
    'Delete': handleDeleteKey,
    'Backspace': handleDeleteKey,

    // Unit controls
    'c': clearSelection,
    'p': pauseGame,

    // Quick actions
    'r': resetCurrentAction,

    // Audio controls
    'm': toggleMute
};

/**
 * Initialize keyboard event listeners
 */
export async function setupKeyboardHandlers() {
    await initializeModules();
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Main keyboard event handler
 */
function handleKeyDown(event) {
    // Don't handle keyboard shortcuts if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    // Get the key pressed
    const key = event.key;

    // Check if we have a handler for this key
    if (keyboardShortcuts[key]) {
        event.preventDefault(); // Prevent default browser behavior
        keyboardShortcuts[key](event);
    }
}

/**
 * Handle Escape key - Show/hide menu (handles all modal types)
 */
function handleEscapeKey(event) {
    if (modalModule) {
        const visibleModal = modalModule.getVisibleModal();

        if (visibleModal) {
            // A modal is visible, try to hide it
            if (visibleModal === 'main') {
                // For main menu modal, only hide if game is running
                if (gameStateModule && gameStateModule.isGameRunning) {
                    modalModule.hideModalWindow();
                    isModalVisible = false;
                    audioManager.playSound('button_click');
                }
                // If no game is running, don't hide the main menu on Escape
            } else {
                // For other modals (result, etc.), hide them normally
                const wasHidden = modalModule.hideCurrentModal();
                if (wasHidden) {
                    audioManager.playSound('button_click');
                }
            }
        } else {
            // No modal is visible, show the main menu
            modalModule.showModalWindow();
            isModalVisible = true;
            audioManager.playSound('button_click');
        }
    }
}

/**
 * Handle F1 key - Show help/controls
 */
function showHelpMenu(event) {
    showKeyboardShortcuts();
    audioManager.playSound('button_click');
}

/**
 * Display keyboard shortcuts in console or as overlay
 */
function showKeyboardShortcuts() {
    const shortcuts = getKeyboardShortcuts();
    console.log('%c=== KEYBOARD SHORTCUTS ===', 'font-weight: bold; font-size: 16px; color: #32a63d;');

    Object.entries(shortcuts).forEach(([category, keys]) => {
        console.log(`%c${category}:`, 'font-weight: bold; color: #4fabaf;');
        Object.entries(keys).forEach(([key, description]) => {
            console.log(`  ${key}: ${description}`);
        });
        console.log(''); // Empty line between categories
    });
}

/**
 * Handle Spacebar - Context-sensitive action
 */
function handleSpacebar(event) {
    if (isModalVisible) return;

    if (gameStateModule && gameStateModule.isGameRunning) {
        // If game is running, spacebar clears selection or provides feedback
        if (gameStateModule.selectedUnit) {
            // If unit is selected, clear selection
            clearSelection();
        } else {
            // Provide audio feedback for spacebar press
            audioManager.playSound('button_click');
        }
    }
}

/**
 * Handle Enter key - Confirm action
 */
function handleEnterKey(event) {
    if (isModalVisible) return;

    if (gameStateModule && gameStateModule.isGameRunning) {
        // Enter key provides feedback - in a real-time game, there's no turn to end
        audioManager.playSound('button_click');
    }
}

/**
 * Handle Delete/Backspace - Cancel current action
 */
function handleDeleteKey(event) {
    if (isModalVisible) return;

    if (gameStateModule && gameStateModule.selectedUnit) {
        clearSelection();
        audioManager.playSound('button_click');
    }
}

/**
 * Clear current unit selection
 */
function clearSelection() {
    if (isModalVisible) return;

    if (gameStateModule) {
        gameStateModule.clearSelectedUnit();
    }
    if (rendererModule) {
        if (window.scheduleDraw) { window.scheduleDraw(); } else { rendererModule.draw(); }
    }
    audioManager.playSound('unit_select');
}

/**
 * Pause/unpause the game
 */
function pauseGame() {
    if (isModalVisible) return;

    if (gameStateModule && gameStateModule.isGameRunning) {
        gameStateModule.pauseGameLoop();
        if (modalModule) {
            modalModule.showModalWindow();
            isModalVisible = true;
        }
    } else if (modalModule) {
        modalModule.hideModalWindow();
        isModalVisible = false;
        if (gameStateModule) {
            gameStateModule.resumeGameLoop();
        }
    }
    audioManager.playSound('button_click');
}

/**
 * Reset current action
 */
function resetCurrentAction() {
    if (isModalVisible) return;

    clearSelection();
    // TODO: Add any other reset functionality needed
}

/**
 * Toggle audio mute
 */
function toggleMute() {
    if (audioManager.toggleMute) {
        audioManager.toggleMute();
    } else {
        // Fallback if toggleMute doesn't exist
        audioManager.soundVolume = audioManager.soundVolume > 0 ? 0 : 0.5;
        audioManager.musicVolume = audioManager.musicVolume > 0 ? 0 : 0.5;
    }
}

/**
 * Get a formatted list of keyboard shortcuts for display
 */
export function getKeyboardShortcuts() {
    return {
        'Game Controls': {
            'Esc': 'Show/Hide Menu',
            'Space': 'Clear Selection',
            'Enter': 'Confirm Action',
            'C': 'Clear Selection',
            'P': 'Pause Game'
        },
        'General': {
            'F1': 'Help',
            'M': 'Toggle Mute',
            'S': 'Quick Save',
            'R': 'Reset Action',
            'Delete/Backspace': 'Cancel Action'
        }
    };
}

// Export for use in other modules
export { isModalVisible };
