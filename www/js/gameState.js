import {gridWidth, gridHeight, createUnitTypes, players as initialPlayers, BONUS_TYPE, BONUS_VALUES} from './gameConfig.js';
import { GameLoop } from './gameMechanics.js';
import { draw } from './renderer.js';
import { NPCAI } from './npcAI.js';
import { getCurrentMission, handleEnemyDefeated as handleMissionEnemyDefeated, handleNpcHqDestroyed as handleMissionNpcHqDestroyed, handlePlayerHqDestroyed as handleMissionPlayerHqDestroyed } from './missionManager.js';
import { handleEnemyDefeated as handleQuickGameEnemyDefeated, handleNpcHqDestroyed as handleQuickGameNpcHqDestroyed, handlePlayerHqDestroyed as handleQuickGamePlayerHqDestroyed, isQuickGameActive } from './quickGameManager.js';
import { initializeUnitExperience } from './unitExperience.js';
import { audioManager } from './audioManager.js';
import * as storage from './storageAdapter.js';

// Game settings key for storage
const GAME_SETTINGS_KEY = 'gameSettings';

export let selectedUnit = null;
export let hoveredTile = null;
export const gameField = Array(gridHeight).fill().map(() => Array(gridWidth).fill(null));
export let humanUnitTypes = [];
export let npcUnitTypes = [];
export let players = initialPlayers;
export let gameLoop = null;
export let npcAI = null;
let nextUnitId = 1;
let currentDifficulty = 'normal'; // Initial value, will be overridden by stored value from settings
export let isGameRunning = false;

// Current mission's bonus tiles (will be loaded from mission config)
export let bonusTiles = [];

// Track captured bonus tiles for each player
export const capturedBonusTiles = {
  human: [], // Will store {y, x, type} objects
  npc: []    // Will store {y, x, type} objects
};

// Track currently selected bonus tile for popup
export let selectedBonusTile = null;

// Cache for player bonuses to avoid recalculation every frame
const playerBonusCache = {
  human: { attackBonus: 0, armorBonus: 0, moneyBonusPercentage: 0, lastUpdate: 0 },
  npc: { attackBonus: 0, armorBonus: 0, moneyBonusPercentage: 0, lastUpdate: 0 }
};

// Variables for tracking game time
let gameStartTime = 0;
let gamePausedAt = 0;
let totalPausedTime = 0;
let isGamePaused = false;

// First-time hint system
let isFirstTimeHintActive = false;
let hasShownFirstTimeHint = false;

export function getNextUnitId() {
    return nextUnitId++;
}

export async function loadDifficultySettings() {
    try {
        const settings = await storage.getItem(GAME_SETTINGS_KEY);
        if (settings && settings.difficulty) {
            currentDifficulty = settings.difficulty;
        }
        return currentDifficulty;
    } catch (error) {
        console.error('Error loading difficulty settings:', error);
        return currentDifficulty;
    }
}

export function getCurrentDifficulty() {
    return currentDifficulty;
}

// Determine game phase based on time
export function determineGamePhase() {
    if (gameStartTime === 0) return 'earliest'; // If game hasn't started yet

    // Calculate active game time accounting for pauses
    const activeGameTime = getCurrentGameTime()

    // 30 sec
    if (activeGameTime < 30000) {
        return 'earliest';
    }
    // 1 min
    else if (activeGameTime < 60000) {
        return 'early';
    }
    // 2 min
    else if (activeGameTime < 120000) {
        return 'mid';
    }
    // 5 min
    else if (activeGameTime < 300000) {
        return 'late';
    }
    // 10 min
    else if (activeGameTime < 600000) {
        return 'very late';
    }
    // after 10 min
    else {
        return 'latest';
    }
}

// Set game start time
export function setGameStartTime() {
    gameStartTime = performance.now();
    totalPausedTime = 0;
    isGamePaused = false;
    gamePausedAt = 0;
}

// Pause game time
export function pauseGameTime() {
    if (!isGamePaused && gameStartTime > 0) {
        isGamePaused = true;
        gamePausedAt = performance.now();
    }
}

// Resume game time counting
export function resumeGameTime() {
    if (isGamePaused) {
        totalPausedTime += performance.now() - gamePausedAt;
        isGamePaused = false;
        gamePausedAt = 0;
    }
}

// Reset game time
export function resetGameTime() {
    gameStartTime = 0;
    totalPausedTime = 0;
    isGamePaused = false;
    gamePausedAt = 0;
}

// Get current game time in milliseconds
export function getCurrentGameTime() {
    if (gameStartTime === 0) return 0;

    const currentTime = performance.now();
    if (isGamePaused) {
        return gamePausedAt - gameStartTime - totalPausedTime;
    }
    return currentTime - gameStartTime - totalPausedTime;
}

export function startMenuSoundTheme() {
    audioManager.stopMusic(1000);
    audioManager.playMusic('menu_theme');
}

export function startBattleSoundTheme() {
    audioManager.stopMusic(1000);

    // Use the new playlist system for smooth transitions
    setTimeout(() => {
        audioManager.startBattleMusicPlaylist();
    }, 1000);
}

export function createGameLoop() {
    gameLoop = new GameLoop(gameField, draw);
}

export function startGameLoop() {
    isGameRunning = true;
    if (!gameLoop) {
        createGameLoop();
    }
    if (!npcAI) {
        npcAI = new NPCAI();
        npcAI.setStrategy(currentDifficulty);
    }

    // Set game start time
    setGameStartTime();

    startBattleSoundTheme();

    gameLoop.start();
    npcAI.start();
}

export function stopGameLoop() {
    if (gameLoop) {
        gameLoop.stop();
    }
    if (npcAI) {
        npcAI.stop();
    }
    isGameRunning = false;

    // Reset game time
    resetGameTime();

    audioManager.stopMusic();
}

export function pauseGameLoop() {
    if (gameLoop) {
        gameLoop.stop();
    }
    if (npcAI) {
        npcAI.stop();
    }

    // Pause game time
    pauseGameTime();

    // Save pause time for all static units
    const pauseTime = performance.now();
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const unit = gameField[y][x];
            if (unit && unit.isStatic) {
                unit.lastPauseTime = pauseTime;
            }
        }
    }

    // Pause the mission timer if it exists
    if (window.missionManager && typeof window.missionManager.pauseTimer === 'function') {
        window.missionManager.pauseTimer();
    }

    audioManager.stopMusic(1000);
    startMenuSoundTheme();
}

export function resumeGameLoop() {
    if (gameLoop && isGameRunning) {
        gameLoop.start();
    }
    if (npcAI && isGameRunning) {
        npcAI.start();
    }

    // Resume game time counting
    resumeGameTime();

    // Update total pause time for static units
    const resumeTime = performance.now();
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const unit = gameField[y][x];
            if (unit && unit.isStatic && unit.lastPauseTime) {
                unit.totalPausedTime += (resumeTime - unit.lastPauseTime);
                unit.lastPauseTime = 0;
            }
        }
    }

    // Resume the mission timer if it exists
    if (window.missionManager && typeof window.missionManager.resumeTimer === 'function') {
        window.missionManager.resumeTimer();
    }

    startBattleSoundTheme();
}

// Reset game field
export function resetField() {
    // Clear game field
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            gameField[y][x] = null;
        }
    }

    // Reset player money and HQ points
    players[0].money = 0;
    players[1].money = 0;
    players[0].hqPoints = 0;
    players[1].hqPoints = 0;

    // Reset next unit ID
    nextUnitId = 1;

    // Clear selection
    clearSelectedUnit();
    setHoveredTile(null);

    // Reset captured bonus tiles
    capturedBonusTiles.human = [];
    capturedBonusTiles.npc = [];

    // Invalidate bonus cache for both players
    invalidateBonusCache(false);
    invalidateBonusCache(true);

    // Clear bonus tiles
    bonusTiles = [];

    // Clear any selected bonus tile
    selectedBonusTile = null;

    // Update window.gameState with empty bonus tiles and clear selected tile
    if (window.gameState) {
        window.gameState.bonusTiles = [];
        window.gameState.selectedBonusTile = null;
    }

    // Reset popup unit positions
    if (window.popupUnitPositions) {
        window.popupUnitPositions = [];
    }

    // Reset unit types to their original values (to be safe)
    humanUnitTypes = createUnitTypes(true);
    npcUnitTypes = createUnitTypes(false);

    // Reload images for new unit types
    if (window.loadedImages) {
        humanUnitTypes.forEach((unit, index) => {
            unit.image = window.loadedImages.humanUnitImages[index];
            unit.infoImage = window.loadedImages.humanUnitInfoImages[index];
            unit.isNPC = false;
        });

        npcUnitTypes.forEach((unit, index) => {
            unit.image = window.loadedImages.npcUnitImages[index];
            unit.isNPC = true;
        });
    }

    // Reset unit experience
    initializeUnitExperience();

    // Reset GameLoop state if it exists
    if (gameLoop) {
        // Clear all unit-related state collections
        gameLoop.unitPositions = new Map();
        gameLoop.initializedUnits = new Set();
        gameLoop.combatUnits = new Set();
        gameLoop.inProgress = new Set();
        gameLoop.isAttacking = new Set();
        gameLoop.isUnderAttack = new Set();

        // Reset the lastTick to current time
        gameLoop.lastTick = performance.now();
    }

    // Reset NPC AI state if it exists
    if (npcAI) {
        npcAI.lastUnitCreationTime = 0;
        npcAI.unitsPlaced = [];
        npcAI.threatLevelByRow = [0, 0, 0, 0, 0];
        npcAI.opponentUnitsInLastUpdate = 0;
        npcAI.playerActionCounter = 0;
    }

    // Reset game time
    resetGameTime();

    // Reset game running state
    isGameRunning = false;
}

// Apply settings from selected mission level config
export function applyMissionLevelSettings(missionConfig) {
    players[0].money = missionConfig.npcMoney;
    players[1].money = missionConfig.playerMoney;
    players[0].hqPoints = missionConfig.npcHqPoints;
    players[1].hqPoints = missionConfig.playerHqPoints;

    // Clear captured bonus tiles when starting a new level
    capturedBonusTiles.human = [];
    capturedBonusTiles.npc = [];

    // Clear any selected bonus tile
    selectedBonusTile = null;

    // Reset popup unit positions
    if (window.popupUnitPositions) {
        window.popupUnitPositions = [];
    }

    // Load bonus tiles from mission config if available
    if (missionConfig.tileBonusPreset && Array.isArray(missionConfig.tileBonusPreset)) {
        bonusTiles = [...missionConfig.tileBonusPreset];
        // Process any random tiles
        determineBonusTileTypes();

        // Update window.gameState with the latest bonus tiles and clear selected tile
        if (window.gameState) {
            window.gameState.bonusTiles = bonusTiles;
            window.gameState.selectedBonusTile = null;
        }
    } else {
        // Clear bonus tiles if none specified in the mission
        bonusTiles = [];

        // Update window.gameState with empty bonus tiles and clear selected tile
        if (window.gameState) {
            window.gameState.bonusTiles = [];
            window.gameState.selectedBonusTile = null;
        }
    }
}

// Get current mission background
export function getCurrentMissionBackground() {
    const { background } = getCurrentMission();
    return background;
}

// Set mission complete callback in GameLoop
export function setMissionCallbacks(gameLoopInstance) {
    if (gameLoopInstance) {
        gameLoopInstance.onNpcHqDestroyed = handleNpcHqDestroyed;
        gameLoopInstance.onPlayerHqDestroyed = handlePlayerHqDestroyed;
        gameLoopInstance.onEnemyUnitDestroyed = handleEnemyDefeated;
    }
}

// Handler for NPC HQ destroyed that routes to the correct handler based on game mode
function handleNpcHqDestroyed() {
    if (isQuickGameActive()) {
        handleQuickGameNpcHqDestroyed();
    } else {
        handleMissionNpcHqDestroyed();
    }
}

// Handler for player HQ destroyed that routes to the correct handler based on game mode
function handlePlayerHqDestroyed() {
    if (isQuickGameActive()) {
        handleQuickGamePlayerHqDestroyed();
    } else {
        handleMissionPlayerHqDestroyed();
    }
}

// Handler for enemy unit destroyed that routes to the correct handler based on game mode
function handleEnemyDefeated() {
    if (isQuickGameActive()) {
        handleQuickGameEnemyDefeated();
    } else {
        handleMissionEnemyDefeated();
    }
}

export async function setDifficulty(difficulty) {
    currentDifficulty = difficulty;

    if (npcAI) {
        npcAI.setStrategy(difficulty);
    }

    try {
        // Load existing settings or create a new settings object
        const settings = await storage.getItem(GAME_SETTINGS_KEY) || {};

        // Update difficulty and save settings back to storage
        settings.difficulty = difficulty;
        await storage.setItem(GAME_SETTINGS_KEY, settings);

        return true;
    } catch (error) {
        console.error('Error saving difficulty setting:', error);
        return false;
    }
}

// Select a bonus tile when clicked
export function setSelectedBonusTile(tileCoords) {
    if (isBonusTile(tileCoords.y, tileCoords.x)) {
        selectedBonusTile = {
            y: tileCoords.y,
            x: tileCoords.x,
            type: getBonusTile(tileCoords.y, tileCoords.x).type
        };

        // Ensure selectedBonusTile is properly assigned to window.gameState
        if (window.gameState) {
            window.gameState.selectedBonusTile = selectedBonusTile;
        }

        return true;
    }
    return false;
}

// Clear selected bonus tile
export function clearSelectedBonusTile() {
    selectedBonusTile = null;
    if (window.gameState) {
        window.gameState.selectedBonusTile = null;
    }
}

// Place a defensive unit on a bonus tile
export function placeDefensiveUnit(unitType, tileCoords, isHuman) {
    // Check if this is a valid bonus tile
    if (!isBonusTile(tileCoords.y, tileCoords.x)) {
        return false;
    }

    // Check if player can afford the unit
    const player = isHuman ? players[1] : players[0];
    if (player.money < unitType.price) {
        return false;
    }

    // Check who owns the tile
    if (isBonusTileCaptured(tileCoords.y, tileCoords.x)) {
        const owner = getBonusTileOwner(tileCoords.y, tileCoords.x);

        // If the tile is owned by the opponent, human player can't place units on it
        if ((owner === 'npc' && isHuman) || (owner === 'human' && !isHuman)) {
            // Close the popup if it's open
            clearSelectedBonusTile();
            return false;
        }
    } else {
        // If the tile is not captured at all, player can't place a defensive unit
        clearSelectedBonusTile();
        return false;
    }

    // Check if there's already a unit of the same type in this row
    if (isRowOccupied(tileCoords.y, !isHuman)) {
        // Row is already occupied by a unit of the same type
        // Don't clear the popup, just prevent placing the unit
        return false;
    }

    // Set up unit properties
    const now = performance.now();
    const readyToAttackTime = now - (unitType.reloadTime * 1000);

    const defensiveUnit = {
        ...unitType,
        unitId: nextUnitId++,
        image: unitType.image,
        infoImage: unitType.infoImage,
        isHuman: isHuman,
        iconUrl: unitType.iconUrl,
        iconInfoUrl: unitType.iconInfoUrl,
        lastAttackTime: readyToAttackTime,
        health: unitType.health,
        velocity: 0, // Static unit
        totalPausedTime: 0,
        lastPauseTime: 0,
        spawnTime: now,
        isStatic: true,
        isDefendingBonusTile: true // Mark this unit as defending a bonus tile
    };

    // Place unit on the field
    gameField[tileCoords.y][tileCoords.x] = defensiveUnit;

    // Capture the bonus tile for this player
    captureBonusTile(tileCoords.y, tileCoords.x, isHuman);

    // Deduct cost from player's money
    player.money -= unitType.price;

    // Clear the selected bonus tile
    clearSelectedBonusTile();

    return true;
}

export function placeUnit(tileCoords) {
    if (selectedUnit && isValidTile(tileCoords)) {
        const player = selectedUnit.isNPC ? players[0] : players[1];
        const isHuman = !selectedUnit.isNPC;

        if (player.money >= selectedUnit.price) {
            // Set lastAttackTime in the past by subtracting reload time,
            // so the unit can attack immediately after placement
            const now = performance.now();
            const readyToAttackTime = now - (selectedUnit.reloadTime * 1000);

            const newUnit = {
                ...selectedUnit,
                unitId: nextUnitId++,
                image: selectedUnit.image,
                infoImage: selectedUnit.infoImage,
                isHuman: isHuman,
                iconUrl: selectedUnit.iconUrl,
                iconInfoUrl: selectedUnit.iconInfoUrl,
                lastAttackTime: readyToAttackTime, // Now the unit is ready to attack immediately
                health: selectedUnit.health,
                velocity: selectedUnit.velocity,
                totalPausedTime: 0,
                lastPauseTime: 0
            };

            gameField[tileCoords.y][tileCoords.x] = newUnit;
            player.money -= selectedUnit.price;
            selectedUnit = null;
            
            // Deactivate first-time hint after placing first unit
            if (isHuman && isFirstTimeHintActive) {
                deactivateFirstTimeHint();
            }
            
            return true;
        }
    }
    return false;
}

export async function initGame(images) {
    await loadDifficultySettings();
    await loadFirstTimeHintStatus();

    // Create human unit types (true = human)
    humanUnitTypes = createUnitTypes(true);
    // Create NPC unit types (false = NPC)
    npcUnitTypes = createUnitTypes(false);

    humanUnitTypes.forEach((unit, index) => {
        unit.image = images.humanUnitImages[index];
        unit.infoImage = images.humanUnitInfoImages[index];
        unit.isNPC = false;
    });
    npcUnitTypes.forEach((unit, index) => {
        unit.image = images.npcUnitImages[index];
        // NPC units don't need info images
        unit.isNPC = true;
    });

    createGameLoop();

    // Set mission callbacks
    setMissionCallbacks(gameLoop);

    // Make the gameState module available globally for other modules to access
    window.gameState = {
        capturedBonusTiles,
        bonusTiles,
        selectedBonusTile,
        isBonusTile,
        getBonusTile,
        isBonusTileCaptured,
        getBonusTileOwner,
        captureBonusTile,
        releaseBonusTile,
        setSelectedBonusTile,
        clearSelectedBonusTile,
        placeDefensiveUnit,
        isRowOccupied,
        determineBonusTileTypes, // Add the function to determine random tile types
        BONUS_TYPE: BONUS_TYPE, // Use BONUS_TYPE from gameConfig.js
        gameLoop: gameLoop, // Make gameLoop available for accessing income values
        calculatePlayerBonuses // Add cached bonus calculation function
    };

    // Initialize popupUnitPositions array
    window.popupUnitPositions = [];
}

export function setSelectedUnit(unit) {
    selectedUnit = unit;
    // Activate first-time hint if conditions are met
    if (unit && !hasShownFirstTimeHint) {
        activateFirstTimeHint();
    }
}

export function clearSelectedUnit() {
    selectedUnit = null;
}

export function setHoveredTile(tile) {
    hoveredTile = tile;
}

export function isRowOccupied(row, isNPC) {
    return gameField[row].some(unit => unit && unit.isNPC === isNPC);
}

export function isValidTile(tileCoords) {
    if (!tileCoords) return false;
    if (gameField[tileCoords.y][tileCoords.x]) return false;

    // Check if there's already a unit of the same type in this row
    if (isRowOccupied(tileCoords.y, selectedUnit.isNPC)) return false;

    return (tileCoords.x === 0 && !selectedUnit.isNPC) ||
        (tileCoords.x === gridWidth - 1 && selectedUnit.isNPC);
}

export function canAffordUnit(unit) {
    if (unit.isNPC) {
        return players[0].money >= unit.price;
    }
    return players[1].money >= unit.price;
}

// Calculate player bonuses with caching to avoid recalculation every frame
export function calculatePlayerBonuses(isNpc) {
    const playerKey = isNpc ? 'npc' : 'human';
    const cache = playerBonusCache[playerKey];
    const now = performance.now();

    // Check if cache is still valid (update every 100ms max)
    if (cache.lastUpdate && (now - cache.lastUpdate) < 100) {
        return {
            attackBonus: cache.attackBonus,
            armorBonus: cache.armorBonus,
            moneyBonusPercentage: cache.moneyBonusPercentage
        };
    }

    // Recalculate bonuses
    const capturedTiles = capturedBonusTiles[playerKey] || [];

    let attackBonus = 0;
    let armorBonus = 0;
    let moneyTileCount = 0;

    capturedTiles.forEach(tile => {
        if (tile.type === BONUS_TYPE.ATTACK) {
            attackBonus += BONUS_VALUES.ATTACK_BONUS;
        } else if (tile.type === BONUS_TYPE.ARMOR) {
            armorBonus += BONUS_VALUES.ARMOR_BONUS;
        } else if (tile.type === BONUS_TYPE.MONEY) {
            moneyTileCount++;
        }
    });

    // Calculate money bonus percentage
    const moneyBonusPercentage = moneyTileCount * BONUS_VALUES.MONEY_PERCENTAGE;

    // Update cache
    cache.attackBonus = attackBonus;
    cache.armorBonus = armorBonus;
    cache.moneyBonusPercentage = moneyBonusPercentage;
    cache.lastUpdate = now;

    return { attackBonus, armorBonus, moneyBonusPercentage };
}

// Force update of bonus cache when tiles are captured or lost
export function invalidateBonusCache(isNpc) {
    const playerKey = isNpc ? 'npc' : 'human';
    playerBonusCache[playerKey].lastUpdate = 0;
}

// Determine the type for random bonus tiles
export function determineBonusTileTypes() {
    // Skip if no bonus tiles
    if (!bonusTiles || bonusTiles.length === 0) {
        return;
    }

    // Find all random tiles
    const randomTiles = bonusTiles.filter(tile => tile.type === BONUS_TYPE.RANDOM);

    if (randomTiles.length >= 2) {
        // Process tiles in pairs
        for (let i = 0; i < randomTiles.length; i += 2) {
            if (i + 1 < randomTiles.length) {
                // For each pair, make them opposite types
                const firstType = Math.random() < 0.5 ? BONUS_TYPE.ARMOR : BONUS_TYPE.ATTACK;
                const secondType = firstType === BONUS_TYPE.ARMOR ? BONUS_TYPE.ATTACK : BONUS_TYPE.ARMOR;

                // Find and update these tiles in the bonusTiles array
                const firstTileIndex = bonusTiles.findIndex(
                    tile => tile.type === BONUS_TYPE.RANDOM &&
                            tile.y === randomTiles[i].y &&
                            tile.x === randomTiles[i].x
                );

                const secondTileIndex = bonusTiles.findIndex(
                    tile => tile.type === BONUS_TYPE.RANDOM &&
                            tile.y === randomTiles[i+1].y &&
                            tile.x === randomTiles[i+1].x
                );

                if (firstTileIndex !== -1) {
                    bonusTiles[firstTileIndex].type = firstType;
                }

                if (secondTileIndex !== -1) {
                    bonusTiles[secondTileIndex].type = secondType;
                }
            } else {
                // If there's an odd number of random tiles, the last one gets a random type
                const lastTileIndex = bonusTiles.findIndex(
                    tile => tile.type === BONUS_TYPE.RANDOM &&
                            tile.y === randomTiles[i].y &&
                            tile.x === randomTiles[i].x
                );

                if (lastTileIndex !== -1) {
                    bonusTiles[lastTileIndex].type = Math.random() < 0.5 ? BONUS_TYPE.ARMOR : BONUS_TYPE.ATTACK;
                }
            }
        }
    } else if (randomTiles.length === 1) {
        // If there's only one random tile, give it a random type
        const tileIndex = bonusTiles.findIndex(
            tile => tile.type === BONUS_TYPE.RANDOM &&
                    tile.y === randomTiles[0].y &&
                    tile.x === randomTiles[0].x
        );

        if (tileIndex !== -1) {
            bonusTiles[tileIndex].type = Math.random() < 0.5 ? BONUS_TYPE.ARMOR : BONUS_TYPE.ATTACK;
        }
    }
}

// Check if a tile is a bonus tile
export function isBonusTile(y, x) {
    return bonusTiles.some(tile => tile.y === y && tile.x === x);
}

// Get bonus tile at specific coordinates
export function getBonusTile(y, x) {
    return bonusTiles.find(tile => tile.y === y && tile.x === x);
}

// Check if a bonus tile is captured
export function isBonusTileCaptured(y, x) {
    return capturedBonusTiles.human.some(tile => tile.y === y && tile.x === x) ||
           capturedBonusTiles.npc.some(tile => tile.y === y && tile.x === x);
}

// Get the player who captured a specific bonus tile
export function getBonusTileOwner(y, x) {
    if (capturedBonusTiles.human.some(tile => tile.y === y && tile.x === x)) {
        return 'human';
    }
    if (capturedBonusTiles.npc.some(tile => tile.y === y && tile.x === x)) {
        return 'npc';
    }
    return null;
}

// Capture a bonus tile for a player
export function captureBonusTile(y, x, isHuman) {
    // First, check if this tile is currently selected in the defensive unit popup
    if (selectedBonusTile && selectedBonusTile.y === y && selectedBonusTile.x === x && !isHuman) {
        // An NPC unit is capturing a tile that has the popup open
        // Close the popup since the human player can no longer place a unit here
        clearSelectedBonusTile();
    }

    // Check if the tile is already captured or not a bonus tile
    if (!isBonusTile(y, x)) {
        return false;
    }

    // If the tile is already captured, release it first
    if (isBonusTileCaptured(y, x)) {
        releaseBonusTile(y, x);
    }

    const tile = getBonusTile(y, x);
    if (!tile) return false;

    // Add to captured tiles array for appropriate player
    const capturedTile = { ...tile };
    if (isHuman) {
        capturedBonusTiles.human.push(capturedTile);
        invalidateBonusCache(false); // Invalidate human player cache
    } else {
        capturedBonusTiles.npc.push(capturedTile);
        invalidateBonusCache(true); // Invalidate NPC cache
    }

    return true;
}

// Release a bonus tile
export function releaseBonusTile(y, x) {
    let owner = getBonusTileOwner(y, x);
    if (!owner) return false;

    const index = owner === 'human'
        ? capturedBonusTiles.human.findIndex(tile => tile.y === y && tile.x === x)
        : capturedBonusTiles.npc.findIndex(tile => tile.y === y && tile.x === x);

    if (index === -1) return false;

    // Remove bonus effect
    const capturedTile = owner === 'human'
        ? capturedBonusTiles.human[index]
        : capturedBonusTiles.npc[index];

    // Remove from captured tiles array
    if (owner === 'human') {
        capturedBonusTiles.human.splice(index, 1);
        invalidateBonusCache(false); // Invalidate human player cache
    } else {
        capturedBonusTiles.npc.splice(index, 1);
        invalidateBonusCache(true); // Invalidate NPC cache
    }

    return true;
}

// First-time hint system functions
export async function loadFirstTimeHintStatus() {
    try {
        const settings = await storage.getItem(GAME_SETTINGS_KEY);
        if (settings && settings.hasShownFirstTimeHint !== undefined) {
            hasShownFirstTimeHint = settings.hasShownFirstTimeHint;
        }
        return hasShownFirstTimeHint;
    } catch (error) {
        console.error('Error loading first-time hint status:', error);
        return false;
    }
}

export async function saveFirstTimeHintShown() {
    try {
        const settings = await storage.getItem(GAME_SETTINGS_KEY) || {};
        settings.hasShownFirstTimeHint = true;
        await storage.setItem(GAME_SETTINGS_KEY, settings);
        hasShownFirstTimeHint = true;
        return true;
    } catch (error) {
        console.error('Error saving first-time hint status:', error);
        return false;
    }
}

export function getIsFirstTimeHintActive() {
    return isFirstTimeHintActive;
}

export function activateFirstTimeHint() {
    if (selectedUnit && isGameRunning) {
        isFirstTimeHintActive = true;
        // The hint will be shown until the player places their first unit
        return true;
    }
    return false;
}

export function deactivateFirstTimeHint() {
    isFirstTimeHintActive = false;
    if (!hasShownFirstTimeHint) {
        saveFirstTimeHintShown();
    }
}

// Force activate hint for mobile placement guidance (regardless of whether hint was shown before)
export function forceActivateFirstTimeHint() {
    if (selectedUnit && !selectedUnit.isNPC) {
        isFirstTimeHintActive = true;
        return true;
    }
    return false;
}

export function getHasShownFirstTimeHint() {
    return hasShownFirstTimeHint;
}

// Make gameState available globally for Cordova events
window.gameState = {
    pauseGameLoop,
    resumeGameLoop,
    isGameRunning
};
