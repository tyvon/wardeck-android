import { initResponsiveMode } from './responsive.js';
import { resourcePreloader } from './resourcePreloader.js';
import { initGame } from './gameState.js';
import { draw, setMissionBackgrounds, setBonusIcons, setUIBackgrounds, setFlagImages, setUIIcons } from './renderer.js';
import { setupEventListeners } from './eventHandlers.js';
import { setupKeyboardHandlers } from './keyboardHandlers.js';
import { createModalWindow, showModalWindow } from './modalWindow.js';
import { initializeProgress, getTimeRemaining, getEnemyDefeatCount, pauseTimer, resumeTimer, resetMissionState } from './missionManager.js';
import { initializeUnitExperience } from './unitExperience.js';
import { initializeQuickGameSettings, resetQuickGameState, getHighScores } from './quickGameManager.js';
import { uiBackgrounds } from './gameConfig.js';
import { drawScheduler, scheduleDraw } from './drawScheduler.js';
import { waitForDeviceReady, isCordovaAvailable } from './cordovaInit.js';

async function initializeGame() {
    try {
        // Wait for Cordova device ready if in Cordova environment
        await waitForDeviceReady();

        // Initialize responsive mode
        initResponsiveMode();

        // Run the preloader to load all resources
        const resources = await resourcePreloader.preloadAll();
        window.loadedImages = resources.images;

        // Initialize game progress
        initializeProgress();

        // Initialize unit experience system
        initializeUnitExperience();

        // Initialize quick game settings
        initializeQuickGameSettings();

        // Initialize game state
        await initGame(resources.images);

        // Set images in a renderer
        setMissionBackgrounds(resources.images.missionBackgrounds);
        setBonusIcons(resources.images.bonusIcons);
        setUIBackgrounds(resources.images.uiBackgrounds);
        setFlagImages(resources.images.flagImages);
        setUIIcons(resources.images.uiIcons);

        // Setup event handlers
        setupEventListeners();

        // Setup keyboard handlers
        await setupKeyboardHandlers();

        // Make keyboard handlers available globally
        const keyboardModule = await import('./keyboardHandlers.js');
        window.keyboardHandlers = {
            setModalVisible: keyboardModule.setModalVisible,
            getKeyboardShortcuts: keyboardModule.getKeyboardShortcuts
        };

        // Make modal functions available globally for keyboard handlers
        const modalModule = await import('./modalWindow.js');
        window.modalControls = {
            getVisibleModal: modalModule.getVisibleModal,
            hideCurrentModal: modalModule.hideCurrentModal,
            hideResultModal: modalModule.hideResultModal,
            hideCustomConfirm: modalModule.hideCustomConfirm
        };

        // Make mission manager functions available globally
        window.missionManager = {
            getTimeRemaining,
            getEnemyDefeatCount,
            pauseTimer,
            resumeTimer,
            resetMissionState
        };

        // Make quick game manager functions available globally
        window.quickGameManager = {
            resetQuickGameState,
            initializeQuickGameSettings,
            getHighScores
        };

        // Set up draw scheduler
        drawScheduler.setDrawFunction(draw);
        drawScheduler.start();

        // Make scheduled draw globally available
        window.scheduleDraw = scheduleDraw;
        window.draw = draw; // Keep for compatibility

        // Make animation manager available globally
        window.animationManager = await import('./animations.js').then(m => m.animationManager);

        // Create and show the modal window
        createModalWindow();
        scheduleDraw(); // Use scheduled draw instead
        showModalWindow();

        // Set the main background image if available
        if (resources.images && resources.images.uiBackgrounds && resources.images.uiBackgrounds.main) {
            document.body.style.backgroundImage = `url(${uiBackgrounds.main})`;
        }

        // Signal that the game is fully loaded
        window.dispatchEvent(new CustomEvent('game-fully-loaded'));
    } catch (error) {
        console.error('Error initializing the game:', error);

        // Display error in the canvas or via alert
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#1e262c';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Error loading game resources', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.fillText('Please restart the application', canvas.width/2, canvas.height/2 + 40);
        } else {
            alert('Failed to initialize game: ' + error.message);
        }
    }
}

// Start the game initialization
initializeGame();
