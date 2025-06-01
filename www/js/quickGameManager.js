// quickGameManager.js - Manages quick game mode
import { tileSize, gridWidth, gridHeight } from './gameConfig.js';
import { npcAI, startGameLoop, stopGameLoop, resetField, applyMissionLevelSettings, gameField, gameLoop, getNextUnitId, npcUnitTypes, getCurrentDifficulty } from './gameState.js';
import { initializeUnitExperience } from './unitExperience.js';
import { getQuickGameConfig } from './quickGameConfig.js';
import { clearAndRedraw } from './renderer.js';
import * as storage from './storageAdapter.js';

// Game state variables for quick game
let isQuickGameInProgress = false;
let enemiesDefeated = 0;
let timeRemaining = 0;
let timerInterval = null;
let currentQuickGameConfig = null;
let quickGameMode = 'standard'; // 'standard', 'survival', 'destruction'

// Variables to control timer pause state
let isTimerPaused = false;
let lastTimerTick = 0;

// Quick game settings key for storage
const QUICK_GAME_SETTINGS_KEY = 'quickGameSettings';

/**
 * Initialize quick game settings
 * This function checks if the settings exist in the store and
 * returns them, or initializes them from defaults if not present
 */
export async function initializeQuickGameSettings() {
    let settings = await loadQuickGameSettings();

    // If settings exist, return them
    if (settings) {
        return settings;
    }

    // Fallback to manual initialization (for browser environment)
    settings = {
        lastMode: 'standard',
        highScores: {
            survival: {
                easy: 0,
                normal: 0,
                hard: 0
            },
            destruction: {
                easy: 0,
                normal: 0,
                hard: 0
            }
        }
    };

    // Save the initialized settings
    await saveQuickGameSettings(settings);
    return settings;
}

/**
 * Load quick game settings from storage
 */
export async function loadQuickGameSettings() {
    return await storage.getItem(QUICK_GAME_SETTINGS_KEY);
}

/**
 * Save quick game settings to storage
 */
export async function saveQuickGameSettings(settings) {
    return await storage.setItem(QUICK_GAME_SETTINGS_KEY, settings);
}

/**
 * Start a quick game
 * @param {string} mode - Game mode ('standard', 'survival', 'destruction')
 */
export async function startQuickGame(mode = 'standard') {
    // Reset the game state
    resetField();
    enemiesDefeated = 0;
    
    // Clear canvas and force immediate redraw
    clearAndRedraw();

    // Reset unit experience when starting a new game
    initializeUnitExperience();

    // Reset mission state if it was active
    if (window.missionManager && typeof window.missionManager.resetMissionState === 'function') {
        window.missionManager.resetMissionState();
    }

    // Get current difficulty setting
    const difficulty = getCurrentDifficulty();

    // Get quick game configuration based on mode and difficulty
    currentQuickGameConfig = getQuickGameConfig(difficulty, mode);
    quickGameMode = mode;

    // Update settings to remember last mode
    const settings = await loadQuickGameSettings();
    if (settings) {
        settings.lastMode = mode;
        await saveQuickGameSettings(settings);
    }

    // Apply the configuration
    applyMissionLevelSettings(currentQuickGameConfig);

    if (currentQuickGameConfig.preset) {
        placePresetUnits(currentQuickGameConfig.preset);
    }

    // Set time limit if applicable
    timeRemaining = currentQuickGameConfig.timeLimit;

    // Reset timer pause state
    isTimerPaused = false;

    // Start the game
    startGameLoop();

    // Start timer if survival mode
    if (currentQuickGameConfig.winCondition === 'survive') {
        startTimer();
    }

    isQuickGameInProgress = true;

    // Configure NPC AI
    if (npcAI) {
        npcAI.setEnemyCount(currentQuickGameConfig.enemyCount);
        npcAI.setEnemyLevel(currentQuickGameConfig.enemyLevel);
        npcAI.setWinCondition(currentQuickGameConfig.winCondition);
    }

    return true;
}

/**
 * Place preset units on the field
 */
function placePresetUnits(preset) {
    if (!preset || !Array.isArray(preset) || preset.length === 0) {
        return;
    }

    preset.forEach(presetUnit => {
        const { unitId, x, y } = presetUnit;
        const unitType = npcUnitTypes.find(unit => unit.id === unitId);

        if (unitType && x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
            if (!gameField[y][x]) {
                const now = performance.now();
                const readyToAttackTime = now - (unitType.reloadTime * 1000);

                const newUnit = {
                    ...unitType,
                    unitId: getNextUnitId(),
                    image: unitType.image,
                    isHuman: false,
                    iconUrl: unitType.iconUrl,
                    lastAttackTime: readyToAttackTime,
                    health: unitType.health,
                    velocity: unitType.velocity
                };

                gameField[y][x] = newUnit;

                if (gameLoop && gameLoop.unitPositions) {
                    gameLoop.unitPositions.set(newUnit.unitId, {
                        x: x * tileSize,
                        y: y * tileSize,
                        lastMoveTime: now,
                        initialX: x * tileSize,
                        currentGridX: x
                    });

                    gameLoop.initializedUnits.add(newUnit.unitId);
                }
            }
        }
    });
}

/**
 * Start the game timer
 */
function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    isTimerPaused = false;
    lastTimerTick = Date.now();

    timerInterval = setInterval(() => {
        if (!isTimerPaused) {
            timeRemaining--;

            // Check if time is up
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);

                // Check win condition
                if (currentQuickGameConfig && currentQuickGameConfig.winCondition === 'survive') {
                    // Player wins if the win condition is to survive
                    handleQuickGameCompleted("You have survived!");

                    // Update high score if this is a survival mode
                    updateSurvivalHighScore();
                } else {
                    // Player loses if they didn't complete the objective in time
                    handleQuickGameFailed("Time's up!");
                }
            }

            lastTimerTick = Date.now();
        }
    }, 1000);
}

/**
 * Update high score for survival mode
 */
async function updateSurvivalHighScore() {
    if (quickGameMode !== 'survival') return;

    const difficulty = getCurrentDifficulty();
    const settings = await loadQuickGameSettings();

    if (settings && settings.highScores && settings.highScores.survival) {
        // Time in seconds is the score for survival mode
        const currentTime = currentQuickGameConfig.timeLimit - timeRemaining;

        // If current time is better than high score, update it
        if (currentTime > settings.highScores.survival[difficulty]) {
            settings.highScores.survival[difficulty] = currentTime;
            await saveQuickGameSettings(settings);
        }
    }
}

/**
 * Update high score for destruction mode
 */
async function updateDestructionHighScore() {
    if (quickGameMode !== 'destruction') return;

    const difficulty = getCurrentDifficulty();
    const settings = await loadQuickGameSettings();

    if (settings && settings.highScores && settings.highScores.destruction) {
        // Enemy defeated count is the score for destruction mode

        // If enemy count is better than high score, update it
        if (enemiesDefeated > settings.highScores.destruction[difficulty]) {
            settings.highScores.destruction[difficulty] = enemiesDefeated;
            await saveQuickGameSettings(settings);
        }
    }
}

/**
 * Stop the game timer
 */
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerPaused = false;
}

/**
 * Pause the timer
 */
export function pauseTimer() {
    isTimerPaused = true;
}

/**
 * Resume the timer
 */
export function resumeTimer() {
    isTimerPaused = false;
    lastTimerTick = Date.now();
}

/**
 * Handle enemy defeated event
 */
export function handleEnemyDefeated() {
    enemiesDefeated++;

    // Check if all enemies are defeated for destroy_all win condition
    if (currentQuickGameConfig &&
        currentQuickGameConfig.winCondition === 'destroy_all' &&
        enemiesDefeated >= currentQuickGameConfig.enemyCount) {
        handleQuickGameCompleted("All enemies have been defeated!");

        // Update high score if this is a destruction mode
        updateDestructionHighScore();
    }
}

/**
 * Handle NPC HQ destroyed
 */
export function handleNpcHqDestroyed() {
    handleQuickGameCompleted("Enemy Headquarters destroyed!");
}

/**
 * Handle player HQ destroyed
 */
export function handlePlayerHqDestroyed() {
    handleQuickGameFailed("Your Headquarters destroyed!");
}

/**
 * Handle quick game completed
 */
export function handleQuickGameCompleted(message = "You Won!") {
    if (!isQuickGameInProgress) return;

    isQuickGameInProgress = false;
    stopTimer();
    stopGameLoop();

    // Reset the field to clear all units
    resetField();

    // Show completion message in modal window
    showResultModal(true, message);

    return true;
}

/**
 * Handle quick game failed
 */
export function handleQuickGameFailed(reason = "You Lost!") {
    if (!isQuickGameInProgress) return;

    isQuickGameInProgress = false;
    stopTimer();
    stopGameLoop();

    // Reset the field to clear all units
    resetField();

    // Show failure message in modal window
    showResultModal(false, reason);

    return false;
}

/**
 * Show a modal window with the game result
 */
function showResultModal(isSuccess, message) {
    if (window.showGameResultModal) {
        window.showGameResultModal(isSuccess, message, true);
    } else {
        // Fallback option if the function is unavailable
        alert(message);
    }
}

/**
 * Get time remaining in formatted string (MM:SS)
 */
export function getTimeRemaining() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if a quick game is in progress
 */
export function isQuickGameActive() {
    return isQuickGameInProgress;
}

/**
 * Get the current quick game mode
 */
export function getQuickGameMode() {
    return quickGameMode;
}

/**
 * Get enemy defeat count
 */
export function getEnemyDefeatCount() {
    return enemiesDefeated;
}

/**
 * Get current quick game configuration
 */
export function getCurrentQuickGameConfig() {
    return currentQuickGameConfig;
}

/**
 * Get high scores for quick game modes
 */
export async function getHighScores() {
    const settings = await loadQuickGameSettings();
    return settings?.highScores || {
        survival: { easy: 0, normal: 0, hard: 0 },
        destruction: { easy: 0, normal: 0, hard: 0 }
    };
}

/**
 * Format high score for display
 * @param {number} score - The score to format
 * @param {string} mode - Game mode ('survival' or 'destruction')
 */
export function formatHighScore(score, mode) {
    if (mode === 'survival') {
        // Convert seconds to MM:SS format
        const minutes = Math.floor(score / 60);
        const seconds = score % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        // For destruction mode, just return the number of defeats
        return score.toString();
    }
}

/**
 * Reset high scores (for development/testing)
 */
export async function resetHighScores() {
    const settings = await loadQuickGameSettings();
    if (settings) {
        settings.highScores = {
            survival: {
                easy: 0,
                normal: 0,
                hard: 0
            },
            destruction: {
                easy: 0,
                normal: 0,
                hard: 0
            }
        };
        await saveQuickGameSettings(settings);
    }
}

/**
 * Reset quick game state
 * This function is called when starting a mission to ensure quick game state is cleared
 */
export function resetQuickGameState() {
    isQuickGameInProgress = false;
    stopTimer();
    quickGameMode = 'standard';
    enemiesDefeated = 0;
    timeRemaining = 0;
    currentQuickGameConfig = null;
}
