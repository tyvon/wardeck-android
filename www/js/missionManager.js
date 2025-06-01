// missionManager.js - Manages missions, levels, and game progress
import { tileSize, gridWidth, gridHeight, missionsConfig } from './gameConfig.js';
import {npcAI, startGameLoop, stopGameLoop, resetField, applyMissionLevelSettings, gameField, gameLoop, getNextUnitId, npcUnitTypes} from './gameState.js';
import { initializeUnitExperience } from './unitExperience.js';
import { clearAndRedraw } from './renderer.js';
import * as storage from './storageAdapter.js';

// Current mission and level state
let currentMission = 0;
let currentLevel = 0;
let currentWinCondition = '';
let enemiesDefeated = 0;
let timeRemaining = 0;
let timerInterval = null;
let missionInProgress = false;

// Variables to control timer pause state
let isTimerPaused = false;
let lastTimerTick = 0;

// Game progress key for storage
const GAME_PROGRESS_KEY = 'gameProgress';

// Initialize progress from storage
export async function initializeProgress() {
    let progress = await loadProgress();

    // If we have progress already, return it
    if (progress) {
        return progress;
    }

    // Default progress - only first mission and level unlocked
    progress = {
        highestMission: 1,
        missionProgress: {
            1: { unlocked: true, highestLevel: 1, completed: false },
            2: { unlocked: false, highestLevel: 0, completed: false },
            3: { unlocked: false, highestLevel: 0, completed: false },
            4: { unlocked: false, highestLevel: 0, completed: false },
            5: { unlocked: false, highestLevel: 0, completed: false }
        }
    };

    await saveProgress(progress);
    return progress;
}

// Load progress from storage
export async function loadProgress() {
    return await storage.getItem(GAME_PROGRESS_KEY);
}

// Save progress to storage
export async function saveProgress(progress) {
    return await storage.setItem(GAME_PROGRESS_KEY, progress);
}

// Check if a mission is unlocked
export async function isMissionUnlocked(missionId) {
    const progress = await loadProgress();
    return progress && progress.missionProgress[missionId] &&
        progress.missionProgress[missionId].unlocked;
}

// Check if a level is unlocked
export async function isLevelUnlocked(missionId, levelId) {
    const progress = await loadProgress();
    return progress && progress.missionProgress[missionId] &&
        progress.missionProgress[missionId].highestLevel >= levelId;
}

// Get highest mission unlocked
export async function getHighestMission() {
    const progress = await loadProgress();
    return progress ? progress.highestMission : 1;
}

// Get highest level unlocked for a mission
export async function getHighestLevel(missionId) {
    const progress = await loadProgress();
    return progress && progress.missionProgress[missionId] ?
        progress.missionProgress[missionId].highestLevel : 0;
}

// Set current mission and level
export function setCurrentMission(missionId, levelId, winCondition) {
    currentMission = missionId;
    currentLevel = levelId;
    currentWinCondition = winCondition;
}

// Get current mission and level
export function getCurrentMission() {
    return {
        missionId: currentMission,
        levelId: currentLevel,
        winCondition: currentWinCondition
    };
}

// Start a mission level
export async function startMissionLevel(missionId, levelId) {
    // Check if the level is unlocked
    const isUnlocked = await isLevelUnlocked(missionId, levelId);
    if (!isUnlocked) {
        // This level is not unlocked yet
        return false;
    }

    // Reset game state
    resetField();
    enemiesDefeated = 0;
    
    // Clear canvas and force immediate redraw
    clearAndRedraw();

    // Reset unit experience when starting a new level
    initializeUnitExperience();

    // Reset quick game state if it was active
    if (window.quickGameManager && typeof window.quickGameManager.resetQuickGameState === 'function') {
        window.quickGameManager.resetQuickGameState();
    }

    // Get mission and level configuration
    const mission = missionsConfig.find(m => m.id === missionId);
    const level = mission ? mission.levels.find(l => l.id === levelId) : null;
    const winCondition = level ? level.winCondition : '';

    if (!mission || !level) {
        // Invalid mission or level
        return false;
    }

    // Set current mission and level
    setCurrentMission(missionId, levelId, winCondition);

    applyMissionLevelSettings(level);

    if (level.preset) {
        placePresetUnits(level.preset);
    }

    // Set time limit
    timeRemaining = level.timeLimit;

    // Reset timer pause state
    isTimerPaused = false;

    // Start the game
    startGameLoop();

    // Start timer if survival mode
    if (winCondition === 'survive') {
        startTimer();
    }
    missionInProgress = true;

    // Configure NPC AI for the level
    if (npcAI) {
        npcAI.setEnemyCount(level.enemyCount);
        npcAI.setEnemyLevel(level.enemyLevel);
        npcAI.setWinCondition(level.winCondition);
    }

    return true;
}

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
                    unitId: getNextUnitId(), // Using function instead of direct access
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

// Start the level timer
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
                const mission = missionsConfig.find(m => m.id === currentMission);
                const level = mission ? mission.levels.find(l => l.id === currentLevel) : null;

                if (level && level.winCondition === 'survive') {
                    // Player wins if the win condition is to survive
                    handleLevelCompleted("You have survived!");
                } else {
                    // Player loses if they didn't complete the objective in time
                    handleLevelFailed("Time's up!");
                }
            }

            lastTimerTick = Date.now();
        }
    }, 1000);
}

// Stop the level timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerPaused = false;
}

// Pause the timer
export function pauseTimer() {
    isTimerPaused = true;
}

// Resume the timer
export function resumeTimer() {
    isTimerPaused = false;
    lastTimerTick = Date.now();
}

// Handle enemy defeated
export function handleEnemyDefeated() {
    enemiesDefeated++;

    // Check if all enemies are defeated
    const mission = missionsConfig.find(m => m.id === currentMission);
    const level = mission ? mission.levels.find(l => l.id === currentLevel) : null;

    if (level && level.winCondition === 'destroy_all' && enemiesDefeated >= level.enemyCount) {
        handleLevelCompleted("All enemies have been defeated!");
    }
}

// Handle NPC HQ destroyed
export function handleNpcHqDestroyed() {
    handleLevelCompleted("Enemy Headquarters destroyed!");
}

// Handle player HQ destroyed
export function handlePlayerHqDestroyed() {
    handleLevelFailed("Your Headquarters destroyed!");
}

// Handle level completed
export async function handleLevelCompleted(message = "Level completed successfully!") {
    if (!missionInProgress) return;

    missionInProgress = false;
    stopTimer();
    stopGameLoop();

    // Reset the field to clear all units
    resetField();

    const progress = await loadProgress();
    const mission = missionsConfig.find(m => m.id === currentMission);

    // Update progress
    if (currentLevel === mission.levels.length) {
        // Completed the last level of the mission
        progress.missionProgress[currentMission].completed = true;

        // Unlock next mission if available and not already unlocked
        if (currentMission < missionsConfig.length) {
            // Check if the next mission exists in progress and if it's unlocked
            if (!progress.missionProgress[currentMission + 1] ||
                !progress.missionProgress[currentMission + 1].unlocked) {

                // Initialize if the mission doesn't exist in progress yet
                if (!progress.missionProgress[currentMission + 1]) {
                    progress.missionProgress[currentMission + 1] = {
                        unlocked: true,
                        highestLevel: 1,
                        completed: false
                    };
                } else {
                    // Only unlock if it already exists but is not unlocked
                    progress.missionProgress[currentMission + 1].unlocked = true;
                }

                // Update highestMission only if current progress is lower
                if (progress.highestMission < currentMission + 1) {
                    progress.highestMission = currentMission + 1;
                }

                // Set highestLevel to 1 only if mission was locked
                if (progress.missionProgress[currentMission + 1].highestLevel < 1) {
                    progress.missionProgress[currentMission + 1].highestLevel = 1;
                }
            }
        }
    } else {
        // Unlock next level
        if (progress.missionProgress[currentMission].highestLevel < currentLevel + 1) {
            progress.missionProgress[currentMission].highestLevel = currentLevel + 1;
        }
    }

    await saveProgress(progress);

    // Show completion message in modal window
    showResultModal(true, message);

    return true;
}

// Handle level failed
export function handleLevelFailed(reason = "Mission failed!") {
    if (!missionInProgress) return;

    missionInProgress = false;
    stopTimer();
    stopGameLoop();

    // Reset the field to clear all units
    resetField();

    // Show failure message in modal window
    showResultModal(false, reason);

    return false;
}

// Function to display a modal window with the result
function showResultModal(isSuccess, message) {
    if (window.showGameResultModal) {
        window.showGameResultModal(isSuccess, message);
    } else {
        // Fallback option if the function is unavailable
        alert(message);
    }
}

// Get time remaining in formatted string (MM:SS)
export function getTimeRemaining() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Check if a mission is in progress
export function isMissionInProgress() {
    return missionInProgress;
}

// Get enemy defeat count
export function getEnemyDefeatCount() {
    return enemiesDefeated;
}

// Reset game progress (for debugging)
export async function resetProgress() {
    // Remove the game progress data
    await storage.removeItem(GAME_PROGRESS_KEY);

    // Reinitialize with default values
    return await initializeProgress();
}

/**
 * Reset mission state
 * This function is called when starting a quick game to ensure mission state is cleared
 */
export function resetMissionState() {
    missionInProgress = false;
    stopTimer();
    currentMission = 0;
    currentLevel = 0;
    currentWinCondition = '';
    enemiesDefeated = 0;
    timeRemaining = 0;
}
