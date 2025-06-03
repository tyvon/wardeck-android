import {
    canvasWidth,
    canvasHeight,
    tileSize,
    gridWidth,
    gridHeight,
    gameWidth,
    gameHeight,
    gridTopOffset,
    gridLeftOffset,
    playerSectionWidth,
    playerSectionHeight,
    playerSectionLeftOffset,
    playerSectionTopOffset,
    infoPanelWidth,
    infoPanelHeight,
    infoPanelLeftOffset,
    infoPanelTopOffset,
    infoPanelTopPadding,
    infoPanelLeftPadding,
    playerSectionIconSize,
    playerSectionIconSpacing,
    infoPanelIconSize,
    players,
    menuButtonWidth,
    menuButtonHeight,
    menuButtonLeftOffset,
    menuButtonTopOffset,
    hqImageWidth,
    hqImageHeight,
    hqImageHumanLeftOffset,
    hqImageNpcLeftOffset,
    hqImageTopOffset,
    infoPanelInnerPadding,
    BONUS_TYPE,
    BONUS_VALUES,
    uiBackgrounds
} from './gameConfig.js';
import {
    selectedUnit,
    hoveredTile,
    gameField,
    humanUnitTypes,
    npcUnitTypes,
    isValidTile,
    isGameRunning,
    getCurrentDifficulty,
    getIsFirstTimeHintActive
} from './gameState.js';
import { AnimationManager } from './animations.js';
import { getCurrentMission } from "./missionManager.js";
import { missionsConfig } from "./gameConfig.js";
import { isQuickGameActive, getQuickGameMode, getTimeRemaining as getQuickGameTimeRemaining, getEnemyDefeatCount as getQuickGameEnemyDefeatCount, getCurrentQuickGameConfig } from "./quickGameManager.js";
import { quickGameConfig, getQuickGameConfig } from "./quickGameConfig.js";
import { UI, loadFonts, injectKeyframes } from './ui-design-system.js';
import { experienceLevelColors } from './gameConfig.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', {
    alpha: false, // Disable alpha for better performance
    desynchronized: true // Enable desynchronized rendering
});

canvas.width = canvasWidth;
canvas.height = canvasHeight;

let missionBackgrounds = {};
export const animationManager = new AnimationManager();

let lastHqDamageTime = {
    human: 0,
    npc: 0
};

// Bonus icons images
let bonusIconsImages = {};

// UI background images
let uiBackgroundImages = {};

// Flag images
let flagImagesLoaded = {};

// UI icon images
let uiIconsLoaded = {};

// Initialize UI Design System
loadFonts();
injectKeyframes();

// Track menu button hover state
let isMenuButtonHovered = false;

// Performance optimization: Offscreen canvases for static elements
const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = canvasWidth;
offscreenCanvas.height = canvasHeight;
const offscreenCtx = offscreenCanvas.getContext('2d');

// Cache for scaled images
const scaledImageCache = new Map();

// Dirty flags for selective rendering
let dirtyRegions = {
    background: true,
    grid: true,
    units: true,
    ui: true,
    animations: true
};

// Last known state for change detection
let lastGameState = {
    unitPositions: new Map(),
    playerMoney: { human: 0, npc: 0 },
    hqPoints: { human: 0, npc: 0 }
};

export function registerHqDamage(isHuman) {
    lastHqDamageTime[isHuman ? 'human' : 'npc'] = performance.now();
}

function drawUnitTypeSymbol(unit, x, y, color, scale = 1) {
    if (!unit || !unit.symbol) return;

    const symbol = unit.symbol;
    const symbolSize = 20 * scale;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    const radius = 4;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + symbolSize - radius, y);
    ctx.arcTo(x + symbolSize, y, x + symbolSize, y + radius, radius);
    ctx.lineTo(x + symbolSize, y + symbolSize - radius);
    ctx.arcTo(x + symbolSize, y + symbolSize, x + symbolSize - radius, y + symbolSize, radius);
    ctx.lineTo(x + radius, y + symbolSize);
    ctx.arcTo(x, y + symbolSize, x, y + symbolSize - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Create SVG path
    const path = new Path2D(symbol.path);

    // Use style from configuration or default style
    const style = symbol.style || 'stroke';

    if (style === 'fill' || style === 'both') {
        ctx.fillStyle = color;
        ctx.fill(path);
    }

    if (style === 'stroke' || style === 'both') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(path);
    }

    ctx.restore();
}

export function setMissionBackgrounds(backgrounds) {
    missionBackgrounds = backgrounds;
}

export function setBonusIcons(icons) {
    bonusIconsImages = icons;
}

export function setUIBackgrounds(backgrounds) {
    uiBackgroundImages = backgrounds;
}

export function setFlagImages(flags) {
    flagImagesLoaded = flags;
}

export function setUIIcons(icons) {
    uiIconsLoaded = icons;
}

export function clearAndRedraw() {
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Force immediate redraw
    draw();
}

export function setMenuButtonHovered(isHovered) {
    isMenuButtonHovered = isHovered;
    if (window.scheduleDraw) {
        window.scheduleDraw();
    }
}

function drawEnhancedPanel(x, y, width, height, title = null) {

    // Panel background with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(35, 45, 55, 0.9)');
    gradient.addColorStop(0.4, UI.colors.panelBg);
    gradient.addColorStop(1, 'rgba(20, 28, 34, 0.95)');

    // Create a path for rounded corners
    const radius = parseInt(UI.borders.panelRadius) + 2; // Slightly larger radius
    drawRoundedRect(x, y, width, height, radius);

    // Fill with gradient
    ctx.fillStyle = gradient;
    ctx.fill();


    // Add outer border with glow effect
    ctx.strokeStyle = UI.colors.border;
    ctx.lineWidth = 2;
    drawRoundedRect(x, y, width, height, radius);
    ctx.stroke();

    // Add subtle glossy effect at the top
    const glossGradient = ctx.createLinearGradient(x, y, x, y + height * 0.15);
    glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
    glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glossGradient;

    // Create path for just the top part with rounded corners
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height * 0.15);
    ctx.lineTo(x, y + height * 0.15);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // Add thin inner line for depth effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const innerOffset = 3;
    ctx.beginPath();
    // Start at top-left corner
    ctx.moveTo(x + radius + innerOffset, y + innerOffset);
    // Top edge
    ctx.lineTo(x + width - radius - innerOffset, y + innerOffset);
    // Top-right corner
    ctx.quadraticCurveTo(x + width - innerOffset, y + innerOffset, x + width - innerOffset, y + radius + innerOffset);
    // Right edge
    ctx.lineTo(x + width - innerOffset, y + height - radius - innerOffset);
    // Bottom-right corner
    ctx.quadraticCurveTo(x + width - innerOffset, y + height - innerOffset, x + width - radius - innerOffset, y + height - innerOffset);
    // Bottom edge
    ctx.lineTo(x + radius + innerOffset, y + height - innerOffset);
    // Bottom-left corner
    ctx.quadraticCurveTo(x + innerOffset, y + height - innerOffset, x + innerOffset, y + height - radius - innerOffset);
    // Left edge
    ctx.lineTo(x + innerOffset, y + radius + innerOffset);
    // Top-left corner
    ctx.quadraticCurveTo(x + innerOffset, y + innerOffset, x + radius + innerOffset, y + innerOffset);
    ctx.stroke();

    // Add decorative corner accents
    const accentSize = 8;
    const accentOffset = 6;
    ctx.strokeStyle = 'rgba(50, 166, 61, 0.6)';
    ctx.lineWidth = 2;

    // Top-left accent
    ctx.beginPath();
    ctx.moveTo(x + accentOffset + accentSize, y + accentOffset);
    ctx.lineTo(x + accentOffset, y + accentOffset);
    ctx.lineTo(x + accentOffset, y + accentOffset + accentSize);
    ctx.stroke();

    // Top-right accent
    ctx.beginPath();
    ctx.moveTo(x + width - accentOffset - accentSize, y + accentOffset);
    ctx.lineTo(x + width - accentOffset, y + accentOffset);
    ctx.lineTo(x + width - accentOffset, y + accentOffset + accentSize);
    ctx.stroke();

    // Bottom-left accent
    ctx.beginPath();
    ctx.moveTo(x + accentOffset + accentSize, y + height - accentOffset);
    ctx.lineTo(x + accentOffset, y + height - accentOffset);
    ctx.lineTo(x + accentOffset, y + height - accentOffset - accentSize);
    ctx.stroke();

    // Bottom-right accent
    ctx.beginPath();
    ctx.moveTo(x + width - accentOffset - accentSize, y + height - accentOffset);
    ctx.lineTo(x + width - accentOffset, y + height - accentOffset);
    ctx.lineTo(x + width - accentOffset, y + height - accentOffset - accentSize);
    ctx.stroke();

    // Add title if it exists
    if (title) {
        // Draw title background
        const titleHeight = 30;
        const titleY = y + 15;
        const titleBgWidth = title.length * 14 + 40; // Approximate width based on title length
        const titleBgX = x + (width - titleBgWidth) / 2;

        // Title panel background
        ctx.fillStyle = 'rgba(20, 28, 34, 0.85)';
        drawRoundedRect(titleBgX, titleY, titleBgWidth, titleHeight, 5);
        ctx.fill();

        // Title panel border
        ctx.strokeStyle = UI.colors.primaryLight;
        ctx.lineWidth = 1;
        drawRoundedRect(titleBgX, titleY, titleBgWidth, titleHeight, 5);
        ctx.stroke();

        // Gradient for the title
        const titleGradient = ctx.createLinearGradient(x, titleY + titleHeight/2, x + width, titleY + titleHeight/2);
        titleGradient.addColorStop(0, UI.colors.primary);
        titleGradient.addColorStop(0.5, UI.colors.primaryGlow);
        titleGradient.addColorStop(1, UI.colors.primary);

        // Draw title text
        ctx.fillStyle = titleGradient;
        ctx.font = `bold ${UI.sizes.headingMedium} ${UI.fonts.heading}`;
        ctx.textAlign = 'center';
        ctx.fillText(title, x + width / 2, titleY + titleHeight - 8);
    }
}

function drawGameGrid() {
    // Check if we're in quick game mode or mission mode
    let bgImage = null;
    if (isQuickGameActive()) {
        // Get background image from quick game config
        const difficulty = getCurrentDifficulty();
        const quickGameMode = getQuickGameMode();

        // Get quick game configuration
        const currentConfig = getQuickGameConfig(difficulty, quickGameMode);

        if (currentConfig && currentConfig.bgImageId) {
            if (missionBackgrounds[currentConfig.bgImageId]) {
                bgImage = missionBackgrounds[currentConfig.bgImageId];
            }
        }
    } else {
        // Get background from mission
        const { missionId } = getCurrentMission();
        if (missionId && missionBackgrounds[missionId]) {
            bgImage = missionBackgrounds[missionId];
        }
    }

    // Draw the background image if available
    if (bgImage) {
        // Add vignetting for better contrast and depth - with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            bgImage,
            gridLeftOffset,
            gridTopOffset,
            gameWidth,
            gameHeight
        );

        // Add vignette (darkening at the edges)
        const gradient = ctx.createRadialGradient(
            gridLeftOffset + gameWidth/2,
            gridTopOffset + gameHeight/2,
            gameHeight * 0.3,
            gridLeftOffset + gameWidth/2,
            gridTopOffset + gameHeight/2,
            gameHeight * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.5)');

        ctx.fillStyle = gradient;
        ctx.fillRect(gridLeftOffset, gridTopOffset, gameWidth, gameHeight);
    } else {
        // Enhanced default background with gradient
        const gradient = ctx.createLinearGradient(
            gridLeftOffset,
            gridTopOffset,
            gridLeftOffset,
            gridTopOffset + gameHeight
        );
        gradient.addColorStop(0, UI.colors.background);
        gradient.addColorStop(1, UI.colors.backgroundDark);

        ctx.fillStyle = gradient;
        ctx.fillRect(gridLeftOffset, gridTopOffset, gameWidth, gameHeight);
    }

    // Draw more stylish grid lines
    ctx.strokeStyle = 'rgba(20, 28, 34, 0.4)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(gridLeftOffset + x * tileSize, gridTopOffset);
        ctx.lineTo(gridLeftOffset + x * tileSize, gridTopOffset + gameHeight);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(gridLeftOffset, gridTopOffset + y * tileSize);
        ctx.lineTo(gridLeftOffset + gameWidth, gridTopOffset + y * tileSize);
        ctx.stroke();
    }

    // Semi-transparent layer for better readability
    ctx.fillStyle = 'rgba(30, 38, 44, 0.1)';
    ctx.fillRect(gridLeftOffset, gridTopOffset, gameWidth, gameHeight);

    // Draw bonus tiles
    if (window.gameState && window.gameState.bonusTiles) {
        const { bonusTiles, getBonusTileOwner, isBonusTileCaptured, BONUS_TYPE } = window.gameState;

        bonusTiles.forEach(tile => {
            const tileX = gridLeftOffset + tile.x * tileSize;
            const tileY = gridTopOffset + tile.y * tileSize;

            // Check if the tile is captured
            const isCaptured = isBonusTileCaptured(tile.y, tile.x);
            const owner = isCaptured ? getBonusTileOwner(tile.y, tile.x) : null;

            // Draw highlight based on tile type and capture status
            let highlightColor;
            if (isCaptured) {
                // Captured tile color based on owner
                highlightColor = owner === 'human' ?
                    'rgba(0, 255, 65, 0.2)' : 'rgba(255, 50, 50, 0.2)';
            } else {
                // Uncaptured tile - neutral color with a pulse effect
                const pulseIntensity = 0.5 + 0.5 * Math.sin(Date.now() / 1000);
                highlightColor = `rgba(255, 215, 0, ${0.1 + 0.1 * pulseIntensity})`;
            }

            const cornerRadius = 4; // Smaller radius for grid tiles


            // Draw tile highlight with rounded corners
            ctx.fillStyle = highlightColor;
            drawRoundedRect(tileX, tileY, tileSize, tileSize, cornerRadius);
            ctx.fill();


            // Draw a subtle border around the bonus tile with rounded corners
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 2;
            drawRoundedRect(tileX, tileY, tileSize, tileSize, cornerRadius);
            ctx.stroke();

            // Add glossy highlight at the top
            const glossGradient = ctx.createLinearGradient(tileX, tileY, tileX, tileY + tileSize * 0.3);
            glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glossGradient;

            // Draw the glossy effect with rounded top corners
            ctx.beginPath();
            ctx.moveTo(tileX + cornerRadius, tileY);
            ctx.lineTo(tileX + tileSize - cornerRadius, tileY);
            ctx.quadraticCurveTo(tileX + tileSize, tileY, tileX + tileSize, tileY + cornerRadius);
            ctx.lineTo(tileX + tileSize, tileY + tileSize * 0.3);
            ctx.lineTo(tileX, tileY + tileSize * 0.3);
            ctx.lineTo(tileX, tileY + cornerRadius);
            ctx.quadraticCurveTo(tileX, tileY, tileX + cornerRadius, tileY);
            ctx.closePath();
            ctx.fill();

            // Draw tile icon image
            const iconSize = 40; // Size for the icon image
            const iconX = tileX + (tileSize - iconSize) / 2;
            const iconY = tileY + (tileSize - iconSize) / 2;

            // Apply glow effect

            // Draw the appropriate bonus icon image
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(bonusIconsImages[tile.type], iconX, iconY, iconSize, iconSize);

        });
    }

    // Enhanced unit rendering
    gameField.forEach((row, y) => {
        row.forEach((unit, x) => {
            if (unit) {
                const xPos = gridLeftOffset + x * tileSize;
                const yPos = gridTopOffset + y * tileSize;
                const isUnitImageSquareIcon = unit.squareIcon;

                // Define coordinates and width for rendering the unit and its highlight
                let xPosLeft = xPos;
                let xPosRight = tileSize;
                let highlightX = xPos;
                let highlightWidth = tileSize;

                if (unit.isHuman && !isUnitImageSquareIcon) {
                    xPosLeft = xPos - tileSize;
                    xPosRight = tileSize * 2;
                    highlightX = xPos - tileSize;
                    highlightWidth = tileSize * 2;
                } else if (unit.isNPC && !isUnitImageSquareIcon) {
                    xPosRight = tileSize * 2;
                    highlightWidth = tileSize * 2;
                }

                const cornerRadius = 4; // Smaller radius for grid units


                // Enhanced cell highlighting under the unit with gradient
                const tileBg = ctx.createLinearGradient(
                    highlightX,
                    yPos,
                    highlightX,
                    yPos + tileSize
                );

                if (unit.isHuman) {
                    tileBg.addColorStop(0, 'rgba(40, 70, 50, 0.7)');
                    tileBg.addColorStop(1, 'rgba(30, 38, 44, 0.85)');
                } else {
                    tileBg.addColorStop(0, 'rgba(70, 40, 40, 0.7)');
                    tileBg.addColorStop(1, 'rgba(30, 38, 44, 0.85)');
                }

                ctx.fillStyle = tileBg;
                drawRoundedRect(highlightX, yPos, highlightWidth, tileSize, cornerRadius);
                ctx.fill();


                // Add glossy highlight at the top
                const glossGradient = ctx.createLinearGradient(highlightX, yPos, highlightX, yPos + tileSize * 0.3);
                glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
                glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = glossGradient;

                // Draw the glossy effect with rounded top corners
                ctx.beginPath();
                ctx.moveTo(highlightX + cornerRadius, yPos);
                ctx.lineTo(highlightX + highlightWidth - cornerRadius, yPos);
                ctx.quadraticCurveTo(highlightX + highlightWidth, yPos, highlightX + highlightWidth, yPos + cornerRadius);
                ctx.lineTo(highlightX + highlightWidth, yPos + tileSize * 0.3);
                ctx.lineTo(highlightX, yPos + tileSize * 0.3);
                ctx.lineTo(highlightX, yPos + cornerRadius);
                ctx.quadraticCurveTo(highlightX, yPos, highlightX + cornerRadius, yPos);
                ctx.closePath();
                ctx.fill();

                // Add decorative border with glow effect
                const lineWidth = 2;
                ctx.lineWidth = lineWidth;

                // Outer border with rounded corners
                if (unit.isHuman) {
                    ctx.strokeStyle = 'rgba(47, 150, 62, 0.8)';
                } else {
                    ctx.strokeStyle = 'rgba(191, 50, 50, 0.8)';
                }

                drawRoundedRect(
                    highlightX + lineWidth/2,
                    yPos + lineWidth/2,
                    highlightWidth - lineWidth,
                    tileSize - lineWidth,
                    cornerRadius
                );
                ctx.stroke();

                // Inner glowing border with rounded corners
                if (unit.isHuman) {
                    ctx.strokeStyle = 'rgba(0, 255, 65, 0.4)';
                } else {
                    ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
                }

                ctx.lineWidth = 1;
                drawRoundedRect(
                    highlightX + lineWidth + 1,
                    yPos + lineWidth + 1,
                    highlightWidth - (lineWidth * 2) - 2,
                    tileSize - (lineWidth * 2) - 2,
                    Math.max(1, cornerRadius - 2)
                );
                ctx.stroke();

                // Performance: Use cached scaled image
                const cacheKey = `unit_${unit.id}_${unit.isHuman}_${xPosRight}_${tileSize}`;
                let cachedImage = scaledImageCache.get(cacheKey);

                if (!cachedImage) {
                    // Create cached version
                    const img = unit.image;
                    const imgWidth = img.naturalWidth || 1;
                    const imgHeight = img.naturalHeight || 1;

                    const fixedWidth = xPosRight;
                    let calculatedHeight = (imgHeight / imgWidth) * fixedWidth;
                    calculatedHeight = Math.min(calculatedHeight, tileSize * 1);

                    // Create offscreen canvas for cached image
                    const cacheCanvas = document.createElement('canvas');
                    cacheCanvas.width = fixedWidth;
                    cacheCanvas.height = calculatedHeight;
                    const cacheCtx = cacheCanvas.getContext('2d');

                    cacheCtx.imageSmoothingEnabled = true;
                    cacheCtx.imageSmoothingQuality = 'high';
                    cacheCtx.drawImage(img, 0, 0, fixedWidth, calculatedHeight);

                    cachedImage = {
                        canvas: cacheCanvas,
                        height: calculatedHeight,
                        topOffset: Math.max(0, tileSize - calculatedHeight)
                    };

                    scaledImageCache.set(cacheKey, cachedImage);

                    // Clean cache if too large
                    if (scaledImageCache.size > 100) {
                        const firstKey = scaledImageCache.keys().next().value;
                        scaledImageCache.delete(firstKey);
                    }
                }


                // Draw cached image
                ctx.drawImage(cachedImage.canvas, xPosLeft, yPos + cachedImage.topOffset);


                // Draw unit experience indicator if it has experience
                if (unit.experienceLevel && unit.experienceLevel > 0) {
                    // Draw experience markers in the corner of the cell
                    const markerSize = 8;
                    const markerPadding = 2;

                    // For NPC units, stars go in the upper right corner, for humans - in the upper left corner
                    let markerX;
                    if (unit.isHuman) {
                        // For human units - upper left corner
                        // Move 5px to the right if this is a static unit to avoid timer bar overlap
                        markerX = highlightX + 5 + (unit.isStatic ? 6 : 0);
                    } else {
                        // For NPC units - upper right corner
                        // Move 5px to the left if this is a static unit to avoid timer bar overlap
                        markerX = highlightX + highlightWidth - markerSize - 5 - (unit.isStatic ? 6 : 0);
                    }

                    const markerY = yPos + lineWidth + 7; // Top edge of the cell + padding

                    // Draw stars or other symbols depending on the level
                    ctx.fillStyle = experienceLevelColors[unit.experienceLevel];

                    // Display options for different levels considering direction
                    if (unit.isHuman) {
                        // For human units draw from left to right
                        switch(unit.experienceLevel) {
                            case 1: // Regular - one star
                                drawExperienceStar(markerX, markerY, markerSize);
                                break;
                            case 2: // Veteran - two stars
                                drawExperienceStar(markerX, markerY, markerSize);
                                drawExperienceStar(markerX + markerSize + markerPadding, markerY, markerSize);
                                break;
                            case 3: // Elite - three stars
                                drawExperienceStar(markerX, markerY, markerSize);
                                drawExperienceStar(markerX + markerSize + markerPadding, markerY, markerSize);
                                drawExperienceStar(markerX + (markerSize + markerPadding) * 2, markerY, markerSize);
                                break;
                        }
                    } else {
                        // For NPC units draw from right to left
                        switch(unit.experienceLevel) {
                            case 1: // Regular - one star
                                drawExperienceStar(markerX, markerY, markerSize);
                                break;
                            case 2: // Veteran - two stars
                                drawExperienceStar(markerX - markerSize - markerPadding, markerY, markerSize);
                                drawExperienceStar(markerX, markerY, markerSize);
                                break;
                            case 3: // Elite - three stars
                                drawExperienceStar(markerX - (markerSize + markerPadding) * 2, markerY, markerSize);
                                drawExperienceStar(markerX - markerSize - markerPadding, markerY, markerSize);
                                drawExperienceStar(markerX, markerY, markerSize);
                                break;
                        }
                    }
                }

                // Add visual indicators of unit state
                // - Health bar
                const healthPercentage = unit.health / (unit.originalHealth || unit.health);
                const barWidth = highlightWidth - 8;
                const barHeight = 4;
                const barX = highlightX + lineWidth + 2;
                const barY = yPos + lineWidth + 2;

                // Health bar background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(barX, barY, barWidth, barHeight);

                // Health bar fill
                if (healthPercentage > 0.6) {
                    ctx.fillStyle = 'rgba(0, 255, 65, 0.8)';
                } else if (healthPercentage > 0.3) {
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                } else {
                    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
                }

                ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);

                if (unit.isStatic && unit.spawnTime) {
                    // Modify the remaining time calculation, taking into account the pause
                    const elapsedTime = performance.now() - unit.spawnTime - (unit.totalPausedTime || 0);
                    const remainingPercent = Math.max(0, 1 - (elapsedTime / unit.lifespan));

                    // Parameters for the timer bar
                    const barWidth = 4; // Width of the timer bar
                    const barHeight = tileSize - 13; // Height same as the main cell, with padding

                    // Determine the position of the bar depending on which unit it is
                    let barX;
                    if (unit.isHuman) {
                        // For human units - at the left edge
                        barX = highlightX + 5;
                    } else {
                        // For NPC units - at the right edge
                        barX = highlightX + highlightWidth - barWidth - 5;
                    }

                    // Y position is always the same
                    const barY = yPos + 8;

                    // Timer bar background
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(barX, barY, barWidth, barHeight);

                    // Determine the color of the timer bar depending on the remaining time
                    let timerColor;
                    if (remainingPercent > 0.6) {
                        timerColor = 'rgba(65, 105, 225, 0.8)'; // Blue for plenty of time left
                    } else if (remainingPercent > 0.3) {
                        timerColor = 'rgba(255, 165, 0, 0.8)'; // Orange for medium time left
                    } else {
                        timerColor = 'rgba(220, 20, 60, 0.8)'; // Crimson for low time left
                    }

                    // Fill the timer bar
                    const filledHeight = barHeight * remainingPercent;
                    ctx.fillStyle = timerColor;
                    ctx.fillRect(barX, barY + barHeight - filledHeight, barWidth, filledHeight);

                    // Add a thin outline around the timer bar
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(barX, barY, barWidth, barHeight);
                }

                // Enhanced unit type symbol
                const symbolScale = 0.9;
                const symbolSize = 20 * symbolScale;

                if (unit.isHuman) {
                    // Symbol for human units (green)
                    const symbolX = highlightX + highlightWidth - symbolSize - 8;
                    const symbolY = yPos + 8;

                    // Add a glow around the symbol
                    drawUnitTypeSymbol(unit, symbolX, symbolY, 'rgba(47, 150, 62, 1)', symbolScale);
                } else {
                    // Symbol for NPC units (red)
                    const symbolX = highlightX + 8;
                    const symbolY = yPos + 8;

                    // Add a glow around the symbol
                    drawUnitTypeSymbol(unit, symbolX, symbolY, 'rgba(191, 50, 50, 1)', symbolScale);
                }
            }
        });
    });

    // First-time hint highlighting for the first column
    if (getIsFirstTimeHintActive() && selectedUnit) {
        // Highlight the entire first column (x = 0) for human player
        const pulseIntensity = 0.5 + 0.3 * Math.sin(Date.now() / 300);

        ctx.fillStyle = `rgba(255, 215, 0, ${0.15 + 0.1 * pulseIntensity})`; // Yellowish color like selected unit
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + 0.2 * pulseIntensity})`;
        ctx.lineWidth = 2;

        // Draw highlight for each tile in the first column
        for (let y = 0; y < gridHeight; y++) {
            const hintX = gridLeftOffset + 0 * tileSize; // First column (x = 0)
            const hintY = gridTopOffset + y * tileSize;

            // Fill with semi-transparent yellow
            ctx.fillRect(hintX, hintY, tileSize, tileSize);

            // Draw border
            ctx.strokeRect(hintX + 1, hintY + 1, tileSize - 2, tileSize - 2);
        }

        ctx.lineWidth = 1;
    }

}

// Function for drawing experience star
function drawExperienceStar(x, y, size) {
    ctx.save();

    // Create a star with 5 rays
    ctx.beginPath();
    ctx.translate(x + size/2, y + size/2);


    for (let i = 0; i < 5; i++) {
        ctx.lineTo(0, -size/2);
        ctx.rotate(Math.PI * 0.4);
        ctx.lineTo(0, -size/4);
        ctx.rotate(Math.PI * 0.4);
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawPlayerSection() {
    // Draw an enhanced panel with a background
    drawEnhancedPanel(
        playerSectionLeftOffset,
        playerSectionTopOffset,
        playerSectionWidth,
        playerSectionHeight
        // "AVAILABLE UNITS"
    );

    if (isGameRunning) {
        drawUnitTypes(playerSectionLeftOffset, playerSectionTopOffset, players[1]);
    }
}

function drawUnitTypes(startX, startY, player) {
    // Step 1: Calculate how many units of each type and their total widths
    const units = humanUnitTypes;

    // Get the width of each unit icon
    const unitWidths = units.map(unit => unit.squareIcon ? playerSectionIconSize : (playerSectionIconSize * 2));

    // Calculate the max width available for icons
    const availableWidth = playerSectionWidth - (2 * playerSectionIconSpacing);

    // Step 2: Determine layout - how many units per row and how many rows
    let currentRowWidth = 0;
    let currentRow = 0;
    const unitPositions = []; // Will store {unit, x, y, width, row}

    units.forEach((unit, index) => {
        const iconWidth = unitWidths[index];

        // If this unit won't fit in current row, move to next row
        if (currentRowWidth + iconWidth + playerSectionIconSpacing > availableWidth && currentRowWidth > 0) {
            currentRow++;
            currentRowWidth = 0;
        }

        // Add unit to current row
        unitPositions.push({
            unit,
            width: iconWidth,
            row: currentRow
        });

        // Update current row width
        currentRowWidth += iconWidth + playerSectionIconSpacing;
    });

    // Total number of rows
    const totalRows = currentRow + 1;

    // Step 3: Calculate row heights and vertical centering
    const rowHeight = playerSectionIconSize + playerSectionIconSpacing;
    const totalHeight = totalRows * rowHeight - playerSectionIconSpacing; // Subtract the last spacing
    const startYCentered = startY + (playerSectionHeight - totalHeight) / 2;

    // Step 4: Calculate horizontal positions for each row (to center them)
    const rowWidths = Array(totalRows).fill(0);

    // Calculate width of each row
    unitPositions.forEach(pos => {
        rowWidths[pos.row] += pos.width + playerSectionIconSpacing;
    });

    // Step 5: Draw each unit
    // Group units by row
    const rowUnits = Array(totalRows).fill().map(() => []);
    unitPositions.forEach(pos => {
        rowUnits[pos.row].push(pos);
    });

    // Draw each row
    rowUnits.forEach((rowUnitPositions, rowIndex) => {
        // Calculate starting X to center this row
        const rowWidth = rowWidths[rowIndex] - playerSectionIconSpacing; // Subtract last spacing
        const rowStartX = startX + (playerSectionWidth - rowWidth) / 2;

        // Starting Y position for this row
        const rowStartY = startYCentered + rowIndex * rowHeight;

        // Draw units in this row
        let currentX = rowStartX;
        rowUnitPositions.forEach(pos => {
            const unit = pos.unit;
            const iconWidth = pos.width;
            const cornerRadius = 8; // Rounded corner radius


            // Draw rounded rectangle background
            ctx.fillStyle = 'rgba(30, 40, 50, 0.8)';
            drawRoundedRect(currentX, rowStartY, iconWidth, playerSectionIconSize, cornerRadius);
            ctx.fill();


            // Add attractive gradient overlay
            const gradient = ctx.createLinearGradient(currentX, rowStartY, currentX, rowStartY + playerSectionIconSize);
            gradient.addColorStop(0, 'rgba(40, 60, 80, 0.8)');
            gradient.addColorStop(1, 'rgba(20, 35, 45, 0.9)');
            ctx.fillStyle = gradient;
            drawRoundedRect(currentX, rowStartY, iconWidth, playerSectionIconSize, cornerRadius);
            ctx.fill();

            // Add a subtle inner glow border
            ctx.strokeStyle = 'rgba(60, 180, 75, 0.4)';
            ctx.lineWidth = 1.5;
            drawRoundedRect(currentX, rowStartY, iconWidth, playerSectionIconSize, cornerRadius);
            ctx.stroke();

            // Add glossy highlight at the top
            const glossGradient = ctx.createLinearGradient(currentX, rowStartY, currentX, rowStartY + playerSectionIconSize * 0.3);
            glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = glossGradient;

            // Draw the glossy effect with rounded top corners
            ctx.beginPath();
            ctx.moveTo(currentX + cornerRadius, rowStartY);
            ctx.lineTo(currentX + iconWidth - cornerRadius, rowStartY);
            ctx.quadraticCurveTo(currentX + iconWidth, rowStartY, currentX + iconWidth, rowStartY + cornerRadius);
            ctx.lineTo(currentX + iconWidth, rowStartY + playerSectionIconSize * 0.3);
            ctx.lineTo(currentX, rowStartY + playerSectionIconSize * 0.3);
            ctx.lineTo(currentX, rowStartY + cornerRadius);
            ctx.quadraticCurveTo(currentX, rowStartY, currentX + cornerRadius, rowStartY);
            ctx.closePath();
            ctx.fill();

            // Draw the unit icon with image smoothing enabled for higher quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Calculate dimensions to maintain aspect ratio
            const img = unit.infoImage;
            const imgWidth = img.naturalWidth || 1; // Prevent division by zero
            const imgHeight = img.naturalHeight || 1;

            // Use fixed width but calculate height to maintain aspect ratio
            let calculatedHeight = (imgHeight / imgWidth) * iconWidth;

            // Safety check to ensure height doesn't exceed reasonable limits
            calculatedHeight = Math.min(calculatedHeight, playerSectionIconSize * 1);

            // Position the image at the bottom of the container
            const topOffset = Math.max(0, playerSectionIconSize - calculatedHeight);

            ctx.drawImage(unit.infoImage, currentX, rowStartY + topOffset, iconWidth, calculatedHeight);

            // If player can't afford unit, gray it out and display the price
            if (unit.price > player.money) {
                // Semi-transparent overlay with gradient
                const unaffordableGradient = ctx.createLinearGradient(currentX, rowStartY, currentX, rowStartY + playerSectionIconSize);
                unaffordableGradient.addColorStop(0, 'rgba(20, 20, 20, 0.7)');
                unaffordableGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
                ctx.fillStyle = unaffordableGradient;
                drawRoundedRect(currentX, rowStartY, iconWidth, playerSectionIconSize, cornerRadius);
                ctx.fill();

                // Measure the price text to ensure it fits
                const priceText = `$${unit.price}`;
                ctx.font = `bold 14px ${UI.fonts.primary}`;
                const textWidth = ctx.measureText(priceText).width;

                // Create dynamic price tag background that fits the text
                const tagPadding = 10;
                const tagWidth = Math.max(textWidth + tagPadding * 2, 40);
                const tagHeight = 22;
                const tagX = currentX + (iconWidth - tagWidth) / 2;
                const tagY = rowStartY + playerSectionIconSize / 2 - tagHeight / 2;

                ctx.fillStyle = 'rgba(220, 160, 40, 0.95)';
                drawRoundedRect(tagX, tagY, tagWidth, tagHeight, 4);
                ctx.fill();

                // Add price tag border
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                ctx.lineWidth = 1;
                drawRoundedRect(tagX, tagY, tagWidth, tagHeight, 4);
                ctx.stroke();

                // Display the price with currency symbol
                ctx.fillStyle = '#FFF';
                ctx.font = `bold 14px ${UI.fonts.primary}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';  // Center text vertically
                ctx.fillText(priceText, tagX + tagWidth / 2, tagY + tagHeight / 2);
                ctx.textBaseline = 'alphabetic';  // Reset to default
            }

            // Highlight selected unit with a glowing border and effect
            if (selectedUnit === unit) {
                // Add pulsation animation for the selected unit
                const pulseIntensity = 0.5 + 0.5 * Math.sin(Date.now() / 200);

                // Outer glow
                ctx.strokeStyle = `rgba(255, 215, 0, ${0.7 + 0.3 * pulseIntensity})`;
                ctx.lineWidth = 2.5;
                drawRoundedRect(currentX, rowStartY, iconWidth, playerSectionIconSize, cornerRadius);
                ctx.stroke();

                // Inner highlight
                ctx.fillStyle = `rgba(255, 255, 180, ${0.1 + 0.1 * pulseIntensity})`;
                drawRoundedRect(currentX, rowStartY, iconWidth, playerSectionIconSize, cornerRadius);
                ctx.fill();
            }

            // Add unit level indicator if unit has experience level
            if (unit.experienceLevel && unit.experienceLevel > 0) {
                const badgeSize = 15;
                const badgeX = currentX + iconWidth - badgeSize - 3;
                const badgeY = rowStartY + 3;

                // Draw level badge with appropriate color based on experience level
                ctx.fillStyle = experienceLevelColors[unit.experienceLevel];
                ctx.beginPath();
                ctx.arc(badgeX + badgeSize/2, badgeY + badgeSize/2, badgeSize/2, 0, Math.PI * 2);
                ctx.fill();

                // Add stars to the badge based on experience level
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = `bold ${unit.experienceLevel > 1 ? '6px' : '8px'} ${UI.fonts.primary}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                if (unit.experienceLevel === 1) {
                    // One star for level 1
                    ctx.fillText('★', badgeX + badgeSize/2, badgeY + badgeSize/2);
                } else if (unit.experienceLevel === 2) {
                    // Two stars for level 2
                    ctx.fillText('★★', badgeX + badgeSize/2, badgeY + badgeSize/2 + 1);
                } else if (unit.experienceLevel === 3) {
                    // Three stars for level 3
                    ctx.fillText('★★★', badgeX + badgeSize/2, badgeY + badgeSize/2 + 1);
                }

                ctx.textBaseline = 'alphabetic'; // Reset text baseline to default
            }

            // Store the position for interaction handling
            unit.x = currentX;
            unit.y = rowStartY;
            unit.width = iconWidth; // Store width for click detection

            // Move to the next position
            currentX += iconWidth + playerSectionIconSpacing;
        });
    });
}

// Helper function to draw rounded rectangles
function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawInfoPanel() {
    const startX = infoPanelLeftOffset;
    const startY = infoPanelTopOffset;

    // Draw panel without title first
    drawEnhancedPanel(
        startX,
        startY,
        infoPanelWidth,
        infoPanelHeight,
        ""
    );

    // If no unit is selected, manually draw the "INFORMATION" title to ensure it's properly centered
    if (!selectedUnit) {
        // Draw title background
        const titleHeight = 30;
        const titleY = startY + 15;
        const title = "INFORMATION";
        const titleBgWidth = title.length * 14 + 40; // Approximate width based on title length
        const titleBgX = startX + (infoPanelWidth - titleBgWidth) / 2;

        // Title panel background
        ctx.fillStyle = 'rgba(20, 28, 34, 0.85)';
        drawRoundedRect(titleBgX, titleY, titleBgWidth, titleHeight, 5);
        ctx.fill();

        // Title panel border
        ctx.strokeStyle = UI.colors.primaryLight;
        ctx.lineWidth = 1;
        drawRoundedRect(titleBgX, titleY, titleBgWidth, titleHeight, 5);
        ctx.stroke();

        // Gradient for the title
        const titleGradient = ctx.createLinearGradient(startX, titleY + titleHeight/2, startX + infoPanelWidth, titleY + titleHeight/2);
        titleGradient.addColorStop(0, UI.colors.primary);
        titleGradient.addColorStop(0.5, UI.colors.primaryGlow);
        titleGradient.addColorStop(1, UI.colors.primary);

        // Draw title text properly centered
        ctx.fillStyle = titleGradient;
        ctx.font = `bold ${UI.sizes.headingMedium} ${UI.fonts.heading}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; // This ensures vertical centering
        ctx.fillText(title, titleBgX + titleBgWidth / 2, titleY + titleHeight / 2 + 2);
        ctx.textBaseline = 'alphabetic'; // Reset to default
    }

    // If a unit is selected, display its information
    if (selectedUnit) {
        const iconY = startY + infoPanelTopPadding; // Increase padding for balance
        const lineHeight = 28; // Increased line height for better readability
        // Reduce the width for larger unit icons by 10px
        const iconWidth = (selectedUnit.squareIcon ? infoPanelIconSize : (infoPanelIconSize * 2 - 10));
        const iconX = startX + (infoPanelWidth - iconWidth) / 2;

        const cornerRadius = 8; // Rounded corner radius


        // Draw rounded rectangle background
        ctx.fillStyle = 'rgba(30, 40, 50, 0.8)';
        drawRoundedRect(iconX - 5, iconY - 5, iconWidth + 10, infoPanelIconSize + 10, cornerRadius);
        ctx.fill();


        // Add attractive gradient overlay
        const backgroundGradient = ctx.createLinearGradient(iconX - 5, iconY - 5, iconX - 5, iconY - 5 + infoPanelIconSize + 10);
        backgroundGradient.addColorStop(0, 'rgba(40, 60, 80, 0.8)');
        backgroundGradient.addColorStop(1, 'rgba(20, 35, 45, 0.9)');
        ctx.fillStyle = backgroundGradient;
        drawRoundedRect(iconX - 5, iconY - 5, iconWidth + 10, infoPanelIconSize + 10, cornerRadius);
        ctx.fill();

        // Add a subtle inner glow border
        ctx.strokeStyle = 'rgba(60, 180, 75, 0.4)';
        ctx.lineWidth = 1.5;
        drawRoundedRect(iconX - 5, iconY - 5, iconWidth + 10, infoPanelIconSize + 10, cornerRadius);
        ctx.stroke();

        // Add glossy highlight at the top
        const glossGradient = ctx.createLinearGradient(iconX - 5, iconY - 5, iconX - 5, iconY - 5 + infoPanelIconSize * 0.3);
        glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glossGradient;

        // Draw the glossy effect with rounded top corners
        ctx.beginPath();
        ctx.moveTo(iconX - 5 + cornerRadius, iconY - 5);
        ctx.lineTo(iconX - 5 + iconWidth + 10 - cornerRadius, iconY - 5);
        ctx.quadraticCurveTo(iconX - 5 + iconWidth + 10, iconY - 5, iconX - 5 + iconWidth + 10, iconY - 5 + cornerRadius);
        ctx.lineTo(iconX - 5 + iconWidth + 10, iconY - 5 + infoPanelIconSize * 0.3);
        ctx.lineTo(iconX - 5, iconY - 5 + infoPanelIconSize * 0.3);
        ctx.lineTo(iconX - 5, iconY - 5 + cornerRadius);
        ctx.quadraticCurveTo(iconX - 5, iconY - 5, iconX - 5 + cornerRadius, iconY - 5);
        ctx.closePath();
        ctx.fill();

        // Draw the unit icon with image smoothing enabled for higher quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Calculate dimensions to maintain aspect ratio
        const img = selectedUnit.infoImage;
        const imgWidth = img.naturalWidth || 1; // Prevent division by zero
        const imgHeight = img.naturalHeight || 1;

        // Use fixed width but calculate height to maintain aspect ratio
        let calculatedHeight = (imgHeight / imgWidth) * iconWidth;

        // Safety check to ensure height doesn't exceed reasonable limits
        calculatedHeight = Math.min(calculatedHeight, infoPanelIconSize * 1);

        // Position the image at the bottom of the container
        const topOffset = Math.max(0, infoPanelIconSize - calculatedHeight);

        ctx.drawImage(selectedUnit.infoImage, iconX, iconY + topOffset, iconWidth, calculatedHeight);

        let textY = iconY + infoPanelIconSize + 28;

        // Create gradient for text
        const textGradient = ctx.createLinearGradient(
            startX, textY,
            startX + infoPanelWidth, textY
        );
        textGradient.addColorStop(0, UI.colors.primary);
        textGradient.addColorStop(0.5, UI.colors.primaryGlow);
        textGradient.addColorStop(1, UI.colors.primary);

        ctx.fillStyle = textGradient;
        ctx.font = `bold ${UI.sizes.headingMedium} ${UI.fonts.heading}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic'; // Ensure consistent text baseline

        ctx.fillText(`${selectedUnit.name}`, startX + infoPanelWidth / 2, textY);

        // Return alignment to left edge for the rest of the information
        ctx.textAlign = 'left';
        textY += lineHeight;

        // Dynamically determine maximum stat values based on unit configuration
        const allUnits = [...humanUnitTypes, ...npcUnitTypes];
        const maxStats = {
            health: Math.max(...allUnits.map(unit => unit.originalHealth || unit.health)),
            armor: Math.max(...allUnits.map(unit => unit.armor || 0)),
            attack: Math.max(...allUnits.map(unit => unit.attack)),
            range: Math.max(...allUnits.map(unit => unit.range)),
            velocity: Math.max(...allUnits.map(unit => unit.velocity)),
            // For reloadTime, the minimum value will be considered the best
            reloadTime: Math.max(...allUnits.map(unit => unit.reloadTime))
        };

        // Function for drawing a two-color stat bar with an icon
        function drawStatBar(label, value, maxValue, iconSymbol, y, invertScale = false) {
            const leftPadding = 15;
            const barWidth = infoPanelWidth - (leftPadding * 2) - 10;
            const barHeight = 20;

            // For reloadTime, invert the percentage ratio (lower is better)
            let percentage;
            if (maxValue === 0) {
                // If maxValue is 0 (for example, for velocity of static units)
                percentage = invertScale ? 0 : 1; // If inverted, then 0, otherwise 1
            } else {
                percentage = invertScale
                    ? 1 - Math.min(value / maxValue, 1) // Inverted value for reloadTime
                    : Math.min(value / maxValue, 1);    // Normal percentage ratio
            }

            const progressBarWidth = 89;

            // Create a fixed container for icon with the same width
            const iconWidth = 22; // Fixed width for all icons
            const iconX = startX + leftPadding;

            // Draw icon with center alignment in a fixed width container
            ctx.fillStyle = UI.colors.primaryGlow;

            // Adjust font size individually for each icon
            let iconSize;
            switch(iconSymbol) {
                case '⟳': // Reload icon - make it larger
                    iconSize = '26px';
                    break;
                case '◊': // Armor icon
                    iconSize = '24px';
                    break;
                case '❤': // Health icon
                    iconSize = '20px';
                    break;
                case '⚔': // Attack icon
                    iconSize = '26px';
                    break;
                case '◎': // Range icon
                    iconSize = '18px';
                    break;
                case '➙': // Speed icon
                    iconSize = '18px';
                    break;
                default:
                    iconSize = '20px';
            }

            ctx.font = `bold ${iconSize} ${UI.fonts.primary}`;
            ctx.textAlign = 'center'; // Center the icon text
            ctx.fillText(iconSymbol, iconX + iconWidth/2, y + barHeight/2 + 5);
            ctx.textAlign = 'left'; // Return alignment to left edge

            // Draw stat text
            ctx.font = `bold ${UI.sizes.textNormal} ${UI.fonts.primary}`;
            ctx.fillStyle = UI.colors.textSecondary;
            ctx.fillText(`${label}: ${value}`, iconX + iconWidth + 5, y + barHeight/2 + 5);

            // Draw bar outline
            ctx.strokeStyle = UI.colors.primary;
            ctx.lineWidth = 1;
            ctx.strokeRect(
                startX + leftPadding + iconWidth + 5 + progressBarWidth + 10,
                y,
                barWidth - (iconWidth + 5 + progressBarWidth + 10),
                barHeight
            );

            // Draw bar fill with gradient
            const barGradient = ctx.createLinearGradient(
                startX + leftPadding + iconWidth + 5 + progressBarWidth + 10, y,
                startX + leftPadding + iconWidth + 5 + progressBarWidth + 10 +
                (barWidth - (iconWidth + 5 + progressBarWidth + 10)) * percentage, y
            );
            barGradient.addColorStop(0, UI.colors.primary);
            barGradient.addColorStop(1, UI.colors.primaryGlow);

            ctx.fillStyle = barGradient;
            ctx.fillRect(
                startX + leftPadding + iconWidth + 5 + progressBarWidth + 10 + 1,
                y + 1,
                ((barWidth - (iconWidth + 5 + progressBarWidth + 10)) * percentage) - 2,
                barHeight - 2
            );

            return y + lineHeight;
        }

        // Display unit characteristics with visual indicators
        const statIcons = {
            health: '❤',
            armor: '◊', // Replace shield with a diamond that can be colored green
            attack: '⚔',
            range: '◎',
            velocity: '➙',
            reloadTime: '⟳'
        };

        // Don't display Price
        textY = drawStatBar('Health', selectedUnit.health, maxStats.health, statIcons.health, textY);
        // Add armor display after health
        textY = drawStatBar('Armor', selectedUnit.armor || 0, maxStats.armor, statIcons.armor, textY);
        textY = drawStatBar('Attack', selectedUnit.attack, maxStats.attack, statIcons.attack, textY);
        textY = drawStatBar('Range', selectedUnit.range, maxStats.range, statIcons.range, textY);
        textY = drawStatBar('Velocity', selectedUnit.velocity, maxStats.velocity, statIcons.velocity, textY);
        // For reload time, invert the scale since lower value is better
        textY = drawStatBar('Reload', selectedUnit.reloadTime, maxStats.reloadTime, statIcons.reloadTime, textY, true);

        textY += 10;

        // Add decorative divider line before description
        ctx.strokeStyle = 'rgba(50, 166, 61, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX + 10, textY);
        ctx.lineTo(startX + infoPanelWidth - 10, textY);
        ctx.stroke();

        textY += 20;

        // Display unit description with improved formatting
        if (selectedUnit.desc) {
            ctx.font = `${UI.sizes.textNormal} ${UI.fonts.primary}`;
            ctx.fillStyle = UI.colors.textSecondary;

            const maxWidth = infoPanelWidth - (infoPanelInnerPadding * 2);
            const words = selectedUnit.desc.split(' ');
            let line = '';

            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line, startX + infoPanelInnerPadding, textY + 10);
                    line = words[i] + ' ';
                    textY += lineHeight - 5; // Reduce line spacing for description
                } else {
                    line = testLine;
                }
            }

            ctx.fillText(line, startX + infoPanelInnerPadding, textY + 10);
        }
    } else {
        // If no unit is selected, show general game information
        ctx.font = `${UI.sizes.textNormal} ${UI.fonts.primary}`;
        ctx.fillStyle = UI.colors.textSecondary;
        ctx.textAlign = 'center';

        const centerX = startX + infoPanelWidth / 2;
        let textY = startY + 100;

        ctx.fillText("Select a unit to see", centerX, textY);
        textY += 30;
        ctx.fillText("detailed information", centerX, textY);

        // Add decorative elements
        ctx.strokeStyle = UI.colors.primary;
        ctx.lineWidth = 1;

        // Top decorative line
        ctx.beginPath();
        ctx.moveTo(startX + 40, startY + 70);
        ctx.lineTo(startX + infoPanelWidth - 40, startY + 70);
        ctx.stroke();

        // Bottom decorative line
        ctx.beginPath();
        ctx.moveTo(startX + 40, textY + 30);
        ctx.lineTo(startX + infoPanelWidth - 40, textY + 30);
        ctx.stroke();
    }
}

function drawPlayersInfo() {
    // Variables to be determined based on game mode
    let winCondition, playerMaxHqPoints, npcMaxHqPoints;

    if (isQuickGameActive()) {
        // Quick game mode
        const quickGameConfig = getCurrentQuickGameConfig();
        if (quickGameConfig) {
            winCondition = quickGameConfig.winCondition;
            playerMaxHqPoints = quickGameConfig.playerHqPoints;
            npcMaxHqPoints = quickGameConfig.npcHqPoints;
        } else {
            // Default values if config not available
            winCondition = 'destroy_hq';
            playerMaxHqPoints = players[1].hqPoints;
            npcMaxHqPoints = players[0].hqPoints;
        }
    } else {
        // Mission mode
        const { winCondition: missionWinCondition, missionId, levelId } = getCurrentMission();
        winCondition = missionWinCondition;

        // Get maximum values for HQ from current mission and level
        const mission = missionsConfig.find(m => m.id === missionId);
        const level = mission ? mission.levels.find(l => l.id === levelId) : null;

        // If we can't find values, use current values as maximum
        playerMaxHqPoints = level ? level.playerHqPoints : players[1].hqPoints;
        npcMaxHqPoints = level ? level.npcHqPoints : players[0].hqPoints;
    }

    // Calculate percentages (make sure we don't divide by zero)
    const playerHqPercentage = playerMaxHqPoints > 0 ?
        Math.ceil((players[1].hqPoints / playerMaxHqPoints) * 100) : 100;
    const npcHqPercentage = npcMaxHqPoints > 0 ?
        Math.ceil((players[0].hqPoints / npcMaxHqPoints) * 100) : 100;

    // Create stylish panel for top information with glass effect
    const topPanelX = 20;
    const topPanelY = 10;
    const topPanelWidth = canvasWidth - 280;
    const topPanelHeight = 44;
    const cornerRadius = 8;

    // Create glass-like background effect

    // Slightly transparent gradient background
    const topPanelGradient = ctx.createLinearGradient(topPanelX, topPanelY, topPanelX, topPanelY + topPanelHeight);
    topPanelGradient.addColorStop(0, 'rgba(40, 55, 70, 0.85)');
    topPanelGradient.addColorStop(1, 'rgba(25, 35, 45, 0.9)');
    ctx.fillStyle = topPanelGradient;

    // Draw rounded panel
    drawRoundedRect(topPanelX, topPanelY, topPanelWidth, topPanelHeight, cornerRadius);
    ctx.fill();


    // Add glossy highlight at the top
    const glossGradient = ctx.createLinearGradient(topPanelX, topPanelY, topPanelX, topPanelY + topPanelHeight * 0.6);
    glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glossGradient;

    // Draw glossy effect with rounded top
    ctx.beginPath();
    ctx.moveTo(topPanelX + cornerRadius, topPanelY);
    ctx.lineTo(topPanelX + topPanelWidth - cornerRadius, topPanelY);
    ctx.quadraticCurveTo(topPanelX + topPanelWidth, topPanelY, topPanelX + topPanelWidth, topPanelY + cornerRadius);
    ctx.lineTo(topPanelX + topPanelWidth, topPanelY + topPanelHeight * 0.4);
    ctx.lineTo(topPanelX, topPanelY + topPanelHeight * 0.4);
    ctx.lineTo(topPanelX, topPanelY + cornerRadius);
    ctx.quadraticCurveTo(topPanelX, topPanelY, topPanelX + cornerRadius, topPanelY);
    ctx.closePath();
    ctx.fill();

    // Add subtle border for definition
    ctx.strokeStyle = UI.colors.primary;
    ctx.lineWidth = 1.5;
    drawRoundedRect(topPanelX, topPanelY, topPanelWidth, topPanelHeight, cornerRadius);
    ctx.stroke();

    // Human player info
    ctx.fillStyle = UI.colors.primaryGlow;
    ctx.textAlign = 'left';

    // HQ icon
    const flagSize = 22;
    ctx.drawImage(flagImagesLoaded.human, 30, (32 - flagSize/2) - 1, flagSize, flagSize);

    // HQ value
    ctx.font = `bold ${UI.sizes.headingSmall} ${UI.fonts.primary}`;
    ctx.fillStyle = UI.colors.primary;
    ctx.fillText(`${playerHqPercentage}%`, 52, 32);

    // Money icon - adjust position to accommodate the HQ text
    const moneyXHuman = 50 + ctx.measureText(`${playerHqPercentage}%`).width + 20;
    ctx.fillStyle = UI.colors.primaryGlow;
    ctx.fillText('$', moneyXHuman, 32);

    // Get humanMoneyIncome from the gameLoop if available
    let humanMoneyIncome = 0;
    if (window.gameState && window.gameState.gameLoop) {
        humanMoneyIncome = window.gameState.gameLoop.humanMoneyIncome || 0;
    }

    // Money value with income
    ctx.font = `bold ${UI.sizes.headingSmall} ${UI.fonts.primary}`;
    ctx.fillStyle = UI.colors.gold;

    // Display money with income in brackets
    ctx.fillText(`${players[1].money} (+${humanMoneyIncome})`, moneyXHuman + 15, 32);

    // Display captured bonuses for human player
    let nextX = moneyXHuman + 15 + ctx.measureText(`${players[1].money} (+${humanMoneyIncome})`).width + 20;

    // Check if human player has any captured bonuses
    if (window.gameState && window.gameState.capturedBonusTiles && window.gameState.capturedBonusTiles.human.length > 0) {
        // Aggregate bonuses by type
        const aggregatedBonuses = {
            [BONUS_TYPE.MONEY]: 0,
            [BONUS_TYPE.ARMOR]: 0,
            [BONUS_TYPE.ATTACK]: 0
        };

        // Count bonuses of each type
        window.gameState.capturedBonusTiles.human.forEach(tile => {
            if (aggregatedBonuses[tile.type] !== undefined) {
                aggregatedBonuses[tile.type]++;
            }
        });

        // Calculate actual bonus values
        const moneyBonusValue = aggregatedBonuses[BONUS_TYPE.MONEY] > 0
            ? `${Math.round(aggregatedBonuses[BONUS_TYPE.MONEY] * (BONUS_VALUES.MONEY_PERCENTAGE * 100))}%`
            : '0';
        const armorBonusValue = aggregatedBonuses[BONUS_TYPE.ARMOR] > 0
            ? `${aggregatedBonuses[BONUS_TYPE.ARMOR] * BONUS_VALUES.ARMOR_BONUS}`
            : '0';
        const attackBonusValue = aggregatedBonuses[BONUS_TYPE.ATTACK] > 0
            ? `${aggregatedBonuses[BONUS_TYPE.ATTACK] * BONUS_VALUES.ATTACK_BONUS}`
            : '0';

        // Display each type of bonus that exists
        if (aggregatedBonuses[BONUS_TYPE.MONEY] > 0) {

            // Draw money icon image
            const iconSize = 20;
            ctx.drawImage(bonusIconsImages[BONUS_TYPE.MONEY], nextX, (32 - iconSize/2) - 1, iconSize, iconSize);

            // Money bonus value
            ctx.fillStyle = UI.colors.gold;
            ctx.fillText(`+${moneyBonusValue}`, nextX + 20, 32);
            nextX += 20 + ctx.measureText(`+${moneyBonusValue}`).width + 10;
        }

        if (aggregatedBonuses[BONUS_TYPE.ARMOR] > 0) {
            // Armor bonus icon - use image

            // Draw armor icon image
            const iconSize = 20;
            ctx.drawImage(bonusIconsImages[BONUS_TYPE.ARMOR], nextX, (32 - iconSize/2) - 1, iconSize, iconSize);

            // nextX += 15;

            // Armor bonus value
            ctx.fillStyle = 'rgba(60, 130, 200, 0.8)';
            ctx.fillText(`+${armorBonusValue}`, nextX + 20, 32);
            nextX += 20 + ctx.measureText(`+${armorBonusValue}`).width + 10;
        }

        if (aggregatedBonuses[BONUS_TYPE.ATTACK] > 0) {
            // Attack bonus icon - use image

            // Draw attack icon image
            const iconSize = 16;
            ctx.drawImage(bonusIconsImages[BONUS_TYPE.ATTACK], nextX, (32 - iconSize/2) - 1, iconSize, iconSize);

            // Attack bonus value
            ctx.fillStyle = 'rgba(220, 60, 60, 0.8)';
            ctx.fillText(`+${attackBonusValue}`, nextX + 20, 32);
        }
    }

    // NPC info
    let xPos = canvasWidth - 280;

    // HQ value
    ctx.fillStyle = UI.colors.secondary;
    xPos -= ctx.measureText(`${npcHqPercentage}%`).width;
    ctx.fillText(`${npcHqPercentage}%`, xPos, 32);

    // HQ icon
    xPos -= flagSize;
    ctx.drawImage(flagImagesLoaded.npc, xPos, (32 - flagSize/2) - 1, flagSize, flagSize);

    // Draw enemy defeat count if available
    if (winCondition === 'destroy_all') {
        const isInQuickGame = isQuickGameActive();
        const maxEnemyCount = isInQuickGame ?
            (getCurrentQuickGameConfig() ? getCurrentQuickGameConfig().enemyCount : 0) :
            (missionsConfig.find(m => m.id === getCurrentMission().missionId)?.levels.find(l => l.id === getCurrentMission().levelId)?.enemyCount || 0);

        xPos -= 20;
        ctx.fillStyle = UI.colors.secondary;
        xPos -= ctx.measureText(maxEnemyCount.toString()).width;
        ctx.fillText(maxEnemyCount.toString(), xPos, 32);
        xPos -= 10;
        ctx.fillText('/', xPos, 32);
        xPos -= 5;

        const enemyDefeatCount = isInQuickGame ?
            getQuickGameEnemyDefeatCount() :
            window.missionManager.getEnemyDefeatCount();

        xPos -= ctx.measureText(enemyDefeatCount.toString()).width;
        ctx.fillText(enemyDefeatCount.toString(), xPos, 32);

        const skullSize = 20;
        xPos -= skullSize + 2;
        ctx.drawImage(uiIconsLoaded.skull, xPos, (32 - skullSize/2) - 1, skullSize, skullSize);
    }

    // Draw mission timer if available
    if (winCondition === 'survive') {
        const isInQuickGame = isQuickGameActive();
        const timeRemaining = isInQuickGame ?
            getQuickGameTimeRemaining() :
            window.missionManager.getTimeRemaining();

        xPos -= 20;
        ctx.fillStyle = UI.colors.secondary;
        xPos -= ctx.measureText(timeRemaining).width;
        ctx.fillText(timeRemaining, xPos, 32);

        const stopwatchSize = 22;
        xPos -= stopwatchSize;
        ctx.drawImage(uiIconsLoaded.stopwatch, xPos, (32 - stopwatchSize/2) - 2, stopwatchSize, stopwatchSize);
    }

    // Money value with income
    xPos -= 20;
    ctx.fillStyle = UI.colors.gold;
    ctx.font = `bold ${UI.sizes.headingSmall} ${UI.fonts.primary}`;

    // Get npcMoneyIncome from the gameLoop if available
    let npcMoneyIncome = 0;
    if (window.gameState && window.gameState.gameLoop) {
        npcMoneyIncome = window.gameState.gameLoop.npcMoneyIncome || 0;
    }

    // Space between indicators - adjust for the new text with income
    xPos -= ctx.measureText(`${players[0].money} (+${npcMoneyIncome})`).width;

    // Display money with income in brackets
    ctx.fillText(`${players[0].money} (+${npcMoneyIncome})`, xPos, 32);

    // Money icon
    xPos -= 5;
    ctx.fillStyle = UI.colors.secondaryGlow;
    ctx.textAlign = 'right';
    ctx.font = `bold ${UI.sizes.headingSmall} ${UI.fonts.primary}`;
    ctx.fillText('$', xPos, 32);

    // Display captured bonuses for NPC player
    // Check if NPC player has any captured bonuses
    if (window.gameState && window.gameState.capturedBonusTiles && window.gameState.capturedBonusTiles.npc.length > 0) {
        // Aggregate bonuses by type
        const aggregatedBonuses = {
            [BONUS_TYPE.MONEY]: 0,
            [BONUS_TYPE.ARMOR]: 0,
            [BONUS_TYPE.ATTACK]: 0
        };

        // Count bonuses of each type
        window.gameState.capturedBonusTiles.npc.forEach(tile => {
            if (aggregatedBonuses[tile.type] !== undefined) {
                aggregatedBonuses[tile.type]++;
            }
        });

        // Calculate actual bonus values
        const moneyBonusValue = aggregatedBonuses[BONUS_TYPE.MONEY] > 0
            ? `${Math.round(aggregatedBonuses[BONUS_TYPE.MONEY] * (BONUS_VALUES.MONEY_PERCENTAGE * 100))}%`
            : '0';
        const armorBonusValue = aggregatedBonuses[BONUS_TYPE.ARMOR] > 0
            ? `${aggregatedBonuses[BONUS_TYPE.ARMOR] * BONUS_VALUES.ARMOR_BONUS}`
            : '0';
        const attackBonusValue = aggregatedBonuses[BONUS_TYPE.ATTACK] > 0
            ? `${aggregatedBonuses[BONUS_TYPE.ATTACK] * BONUS_VALUES.ATTACK_BONUS}`
            : '0';

        if (aggregatedBonuses[BONUS_TYPE.MONEY] > 0) {
            xPos -= 30;

            // Money bonus value
            ctx.fillStyle = UI.colors.gold;
            const moneyText = `+${moneyBonusValue}`;
            ctx.fillText(moneyText, xPos, 32);

            xPos -= ctx.measureText(moneyText).width;

            // Draw money icon image
            const iconSize = 20;
            ctx.drawImage(bonusIconsImages[BONUS_TYPE.MONEY], xPos - iconSize, (32 - iconSize/2) - 1, iconSize, iconSize);
        }

        if (aggregatedBonuses[BONUS_TYPE.ARMOR] > 0) {
            xPos -= 30;

            // Armor bonus value
            ctx.fillStyle = 'rgba(60, 130, 200, 0.8)';
            const armorText = `+${armorBonusValue}`;
            ctx.fillText(armorText, xPos, 32);

            // Armor bonus icon - use image
            xPos -= ctx.measureText(armorText).width;

            // Draw armor icon image
            const iconSize = 20;
            ctx.drawImage(bonusIconsImages[BONUS_TYPE.ARMOR], xPos - iconSize, (32 - iconSize/2) - 1, iconSize, iconSize);
        }

        if (aggregatedBonuses[BONUS_TYPE.ATTACK] > 0) {
            xPos -= 30;

            // Attack bonus value
            ctx.fillStyle = 'rgba(220, 60, 60, 0.8)';
            const attackText = `+${attackBonusValue}`;
            ctx.fillText(attackText, xPos, 32);

            // Attack bonus icon - use image
            xPos -= ctx.measureText(attackText).width;

            // Draw attack icon image
            const iconSize = 16;
            ctx.drawImage(bonusIconsImages[BONUS_TYPE.ATTACK], xPos - iconSize, (32 - iconSize/2) - 1, iconSize, iconSize);
        }
    }
}

function drawMenuButton() {
    // Create gradient for button background
    const gradient = ctx.createLinearGradient(
        menuButtonLeftOffset,
        menuButtonTopOffset,
        menuButtonLeftOffset,
        menuButtonTopOffset + menuButtonHeight
    );

    if (isMenuButtonHovered) {
        gradient.addColorStop(0, UI.colors.buttonHover);
        gradient.addColorStop(1, UI.colors.primaryDark);
    } else {
        gradient.addColorStop(0, UI.colors.buttonPrimary);
        gradient.addColorStop(1, UI.colors.primaryDark);
    }

    ctx.fillStyle = gradient;


    // Draw button background with rounded corners
    const radius = 5;
    ctx.beginPath();
    ctx.moveTo(menuButtonLeftOffset + radius, menuButtonTopOffset);
    ctx.lineTo(menuButtonLeftOffset + menuButtonWidth - radius, menuButtonTopOffset);
    ctx.quadraticCurveTo(menuButtonLeftOffset + menuButtonWidth, menuButtonTopOffset, menuButtonLeftOffset + menuButtonWidth, menuButtonTopOffset + radius);
    ctx.lineTo(menuButtonLeftOffset + menuButtonWidth, menuButtonTopOffset + menuButtonHeight - radius);
    ctx.quadraticCurveTo(menuButtonLeftOffset + menuButtonWidth, menuButtonTopOffset + menuButtonHeight, menuButtonLeftOffset + menuButtonWidth - radius, menuButtonTopOffset + menuButtonHeight);
    ctx.lineTo(menuButtonLeftOffset + radius, menuButtonTopOffset + menuButtonHeight);
    ctx.quadraticCurveTo(menuButtonLeftOffset, menuButtonTopOffset + menuButtonHeight, menuButtonLeftOffset, menuButtonTopOffset + menuButtonHeight - radius);
    ctx.lineTo(menuButtonLeftOffset, menuButtonTopOffset + radius);
    ctx.quadraticCurveTo(menuButtonLeftOffset, menuButtonTopOffset, menuButtonLeftOffset + radius, menuButtonTopOffset);
    ctx.closePath();
    ctx.fill();


    // Add "Menu" text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${UI.sizes.textNormal} ${UI.fonts.primary}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MENU', menuButtonLeftOffset + menuButtonWidth / 2, menuButtonTopOffset + menuButtonHeight / 2);
}

function drawHeadquarters() {
    // Variables to be determined based on game mode
    let winCondition, playerMaxHqPoints, npcMaxHqPoints;
    let level = null;

    if (isQuickGameActive()) {
        // Quick game mode
        const quickGameConfig = getCurrentQuickGameConfig();
        if (quickGameConfig) {
            winCondition = quickGameConfig.winCondition;
            playerMaxHqPoints = quickGameConfig.playerHqPoints;
            npcMaxHqPoints = quickGameConfig.npcHqPoints;
            // For quick game, we still need level-like object for some values
            level = {
                enemyCount: quickGameConfig.enemyCount,
                timeLimit: quickGameConfig.timeLimit
            };
        } else {
            // Default values if config not available
            winCondition = 'destroy_hq';
            playerMaxHqPoints = players[1].hqPoints || 1000;
            npcMaxHqPoints = players[0].hqPoints || 1000;
        }
    } else {
        // Mission mode
        const { missionId, levelId, winCondition: missionWinCondition } = getCurrentMission();
        winCondition = missionWinCondition;

        // Get maximum values for HQ from current mission and level
        const mission = missionsConfig.find(m => m.id === missionId);
        level = mission ? mission.levels.find(l => l.id === levelId) : null;

        // If we can't find values, use current values as maximum
        playerMaxHqPoints = level ? level.playerHqPoints : players[1].hqPoints || 1000;
        npcMaxHqPoints = level ? level.npcHqPoints : players[0].hqPoints || 1000;
    }

    // Define sizes and positions of progress bars
    const barWidth = hqImageWidth;
    const barHeight = hqImageHeight;

    // Default values for HQ percentages
    let playerHqPercentage = playerMaxHqPoints > 0 ?
        (players[1].hqPoints / playerMaxHqPoints) : 1;
    let npcHqPercentage = npcMaxHqPoints > 0 ?
        (players[0].hqPoints / npcMaxHqPoints) : 1;

    // Symbol to display at the top of the progress bar
    let npcHqSymbol = '⚑'; // Default - flag
    let npcDisplayText = ''; // Text to display (for destroy_all and survive)

    // Change display logic depending on game condition
    if (winCondition === 'destroy_all' && level) {
        // For destroy all enemies mode - show destruction progress
        npcHqSymbol = '⚔';
        const isInQuickGame = isQuickGameActive();
        const enemyDefeated = isInQuickGame ?
            getQuickGameEnemyDefeatCount() :
            window.missionManager.getEnemyDefeatCount();

        const enemiesRemaining = Math.max(0, level.enemyCount - enemyDefeated);
        npcHqPercentage = level.enemyCount > 0 ?
            (enemiesRemaining / level.enemyCount) : 0;
        npcDisplayText = enemiesRemaining.toString(); // Number of remaining enemies
    } else if (winCondition === 'survive' && level) {
        // For survival mode - show remaining time
        npcHqSymbol = '⏱';

        // Get remaining time string based on game mode
        const isInQuickGame = isQuickGameActive();
        const timeString = isInQuickGame ?
            getQuickGameTimeRemaining() :
            window.missionManager.getTimeRemaining();

        // Parse the time string
        const [minutes, seconds] = timeString.split(':').map(Number);
        const remainingTime = minutes * 60 + seconds;

        // Calculate percentage of remaining time
        const totalTime = level.timeLimit; // in seconds
        npcHqPercentage = totalTime > 0 ? remainingTime / totalTime : 0;
        npcDisplayText = timeString; // Display time in MM:SS format
    }

    // Draw progress bar for player (Human)
    drawHqProgressBar(
        hqImageHumanLeftOffset,
        hqImageTopOffset,
        barWidth,
        barHeight,
        playerHqPercentage,
        true, // isHuman
        '⚑', // HQ symbol for human is always flag
        '' // Standard percentage display
    );

    // Draw progress bar for NPC
    drawHqProgressBar(
        hqImageNpcLeftOffset,
        hqImageTopOffset,
        barWidth,
        barHeight,
        npcHqPercentage,
        false, // isNPC
        npcHqSymbol,
        npcDisplayText // Text to display (number of enemies or time)
    );
}

function drawHqProgressBar(x, y, width, height, percentage, isHuman, symbol = '⚑', displayText = '') {
    // Define more muted colors depending on the player
    const baseColor = isHuman ? 'rgba(20, 40, 30, 0.6)' : 'rgba(40, 20, 20, 0.6)';
    let borderColor = isHuman ? 'rgba(30, 100, 40, 0.6)' : 'rgba(100, 30, 30, 0.6)';
    let glowColor = isHuman ? 'rgba(0, 180, 50, 0.2)' : 'rgba(180, 50, 50, 0.2)';

    // Define more muted fill colors
    let fillColor;
    if (isHuman) {
        if (percentage > 0.7) {
            fillColor = 'rgba(0, 180, 50, 0.5)';
        } else if (percentage > 0.3) {
            fillColor = 'rgba(180, 180, 0, 0.5)';
        } else {
            fillColor = 'rgba(180, 90, 0, 0.5)';
        }
    } else {
        if (percentage > 0.7) {
            fillColor = 'rgba(180, 50, 50, 0.5)';
        } else if (percentage > 0.3) {
            fillColor = 'rgba(180, 90, 0, 0.5)';
        } else {
            fillColor = 'rgba(180, 180, 0, 0.5)';
        }
    }

    // Check if the progress bar should flash due to recent damage
    const now = performance.now();
    const damageTime = lastHqDamageTime[isHuman ? 'human' : 'npc'];
    const isDamageFlashing = (now - damageTime) < 500; // Flashing lasts for 1 second

    // Check if the HQ progress bar is displayed (for NPC this is only in destroy_hq mode)
    const isHqDisplayed = isHuman || (symbol === '⚑');

    // If HQ was recently damaged and this is an HQ progress bar, apply flashing effect
    if (isDamageFlashing && isHqDisplayed) {
        // Flashing effect: alternating between normal color and red/green
        if (Math.floor((now - damageTime) / 100) % 2 === 0) {
            // Brighter colors for flashing
            borderColor = isHuman ? 'rgba(50, 200, 70, 0.9)' : 'rgba(220, 50, 50, 0.9)';
            glowColor = isHuman ? 'rgba(0, 255, 65, 0.6)' : 'rgba(255, 50, 50, 0.6)';

            // Enhance glow during flashing
        }
    }

    // Draw progress bar background
    ctx.fillStyle = baseColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;


    // Draw progress bar base with rounded corners
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();


    // Calculate fill height (bottom to top)
    const fillHeight = height * percentage;
    const fillY = y + height - fillHeight;

    // Create a more muted gradient for filling
    const gradient = ctx.createLinearGradient(x, fillY, x, y + height);
    const brighterColor = isHuman ? 'rgba(40, 180, 70, 0.6)' : 'rgba(180, 60, 60, 0.6)';
    gradient.addColorStop(0, brighterColor);
    gradient.addColorStop(1, fillColor);
    ctx.fillStyle = gradient;

    // If there is a flashing effect and this is an HQ progress bar, modify the gradient
    if (isDamageFlashing && isHqDisplayed && Math.floor((now - damageTime) / 100) % 2 === 0) {
        const damageGradient = ctx.createLinearGradient(x, fillY, x, y + height);
        const brighterDamageColor = isHuman ? 'rgba(60, 255, 100, 0.7)' : 'rgba(255, 80, 80, 0.7)';
        const midDamageColor = isHuman ? 'rgba(40, 220, 70, 0.6)' : 'rgba(220, 60, 60, 0.6)';
        damageGradient.addColorStop(0, brighterDamageColor);
        damageGradient.addColorStop(0.5, midDamageColor);
        damageGradient.addColorStop(1, fillColor);
        ctx.fillStyle = damageGradient;
    }

    // Draw fill with rounded corners
    ctx.beginPath();
    if (percentage < 1) {
        // If percentage < 100%, the top part of the fill is straight
        ctx.moveTo(x, fillY);
        ctx.lineTo(x + width, fillY);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    } else {
        // If 100%, copy the base shape completely
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.closePath();
    ctx.fill();

    // Make percentage text more subdued
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `bold ${UI.sizes.headingMedium} ${UI.fonts.heading}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';


    // Display either custom text or percentages
    const textToDisplay = displayText !== '' ? displayText : `${Math.ceil(percentage * 100)}%`;

    // If there is a flashing effect and this is HQ, change text style
    if (isDamageFlashing && isHqDisplayed && Math.floor((now - damageTime) / 100) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    }

    ctx.fillText(textToDisplay, x + width / 2, y + height / 2);

    // Add more subtle decorative elements
    // Horizontal stripes for visual separation
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;

    for (let i = 1; i < 10; i++) {
        const lineY = y + (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, lineY);
        ctx.lineTo(x + width, lineY);
        ctx.stroke();
    }

    // Add more subtle HQ symbol
    // Add HQ symbol or image
    if (isHqDisplayed && flagImagesLoaded.neutral) {
        // Use white flag image for HQ progress bars
        const flagIconSize = 30;
        const flagX = x + width / 2 - flagIconSize / 2;
        const flagY = y + 15;
        ctx.drawImage(flagImagesLoaded.neutral, flagX, flagY, flagIconSize, flagIconSize);
    } else if (symbol === '⏱' && uiIconsLoaded.stopwatch) {
        // Use stopwatch image for time-based progress bars
        const iconSize = 30;
        const iconX = x + width / 2 - iconSize / 2;
        const iconY = y + 15;

        // Save context for opacity
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(uiIconsLoaded.stopwatch, iconX, iconY, iconSize, iconSize);
        ctx.restore();
    } else if (symbol === '⚔' && uiIconsLoaded.skull) {
        // Use skull image for enemy count progress bars
        const iconSize = 30;
        const iconX = x + width / 2 - iconSize / 2;
        const iconY = y + 15;

        // Save context for opacity
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(uiIconsLoaded.skull, iconX, iconY, iconSize, iconSize);
        ctx.restore();
    } else {
        // Fallback to text symbol
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = `bold ${UI.sizes.displaySmall} ${UI.fonts.heading}`;

        // If there is a flashing effect and this is HQ, change symbol style
        if (isDamageFlashing && isHqDisplayed && Math.floor((now - damageTime) / 100) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        }

        ctx.fillText(symbol, x + width / 2, y + 30);
    }
}

// Draw defensive units selection popup for bonus tiles
function drawBonusUnitSelectionPopup() {
    if (!window.gameState || !window.gameState.selectedBonusTile) {
        return;
    }

    const bonusTile = window.gameState.selectedBonusTile;

    // Calculate popup position on screen (above the bonus tile)
    const tileX = gridLeftOffset + bonusTile.x * tileSize;
    const tileY = gridTopOffset + bonusTile.y * tileSize;

    // Get defensive units by id (MG Nest: id = 5, Armor Shredder: id = 8)
    const defensiveUnits = [
        humanUnitTypes.find(unit => unit.id === 5), // MG Nest
        humanUnitTypes.find(unit => unit.id === 8)  // Armor Shredder
    ].filter(unit => unit); // Filter out any undefined units

    // No defensive units found
    if (defensiveUnits.length === 0) {
        return;
    }

    // Current player money
    const playerMoney = players[1].money;

    // Calculate total width needed for the popup (based on unit icons)
    const iconSize = playerSectionIconSize;
    const iconSpacing = 10;
    const iconWidth = defensiveUnits.map(unit =>
        unit.squareIcon ? iconSize : (iconSize * 2)
    );
    const totalIconWidth = iconWidth.reduce((sum, width) => sum + width, 0) +
                          ((defensiveUnits.length - 1) * iconSpacing) + 20; // 20px for padding

    // Set popup dimensions
    const popupWidth = Math.max(totalIconWidth, 180); // Minimum width
    const popupHeight = iconSize + 20; // Height for icons + padding

    // Position popup above the tile (or below if not enough space)
    let popupX = tileX + (tileSize - popupWidth) / 2;
    let popupY = tileY - popupHeight - 10; // 10px gap

    // Make sure popup doesn't go off screen
    if (popupX < 10) popupX = 10;
    if (popupX + popupWidth > canvasWidth - 10) popupX = canvasWidth - 10 - popupWidth;

    // If popup would be off the top of the screen, show it below the tile instead
    if (popupY < 10) {
        popupY = tileY + tileSize + 10;
    }

    // Draw popup with enhanced background
    const radius = 8; // Corner radius


    // Create a gradient for the popup background
    const gradient = ctx.createLinearGradient(popupX, popupY, popupX, popupY + popupHeight);
    gradient.addColorStop(0, 'rgba(35, 45, 55, 0.95)');
    gradient.addColorStop(0.4, 'rgba(30, 38, 44, 0.95)');
    gradient.addColorStop(1, 'rgba(20, 28, 34, 0.98)');

    // Draw the main popup background
    ctx.fillStyle = gradient;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, radius);
    ctx.fill();


    // Add glossy highlight at the top
    const glossGradient = ctx.createLinearGradient(popupX, popupY, popupX, popupY + popupHeight * 0.3);
    glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glossGradient;

    // Draw the glossy effect with rounded top corners
    ctx.beginPath();
    ctx.moveTo(popupX + radius, popupY);
    ctx.lineTo(popupX + popupWidth - radius, popupY);
    ctx.quadraticCurveTo(popupX + popupWidth, popupY, popupX + popupWidth, popupY + radius);
    ctx.lineTo(popupX + popupWidth, popupY + popupHeight * 0.3);
    ctx.lineTo(popupX, popupY + popupHeight * 0.3);
    ctx.lineTo(popupX, popupY + radius);
    ctx.quadraticCurveTo(popupX, popupY, popupX + radius, popupY);
    ctx.closePath();
    ctx.fill();

    // Add outer border with slight glow
    ctx.strokeStyle = 'rgba(50, 166, 61, 0.7)';
    ctx.lineWidth = 2;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, radius);
    ctx.stroke();

    // Add decorative corner accents
    const accentSize = 6;
    const accentOffset = 5;
    ctx.strokeStyle = 'rgba(50, 166, 61, 0.6)';
    ctx.lineWidth = 1.5;

    // Top-left accent
    ctx.beginPath();
    ctx.moveTo(popupX + accentOffset + accentSize, popupY + accentOffset);
    ctx.lineTo(popupX + accentOffset, popupY + accentOffset);
    ctx.lineTo(popupX + accentOffset, popupY + accentOffset + accentSize);
    ctx.stroke();

    // Top-right accent
    ctx.beginPath();
    ctx.moveTo(popupX + popupWidth - accentOffset - accentSize, popupY + accentOffset);
    ctx.lineTo(popupX + popupWidth - accentOffset, popupY + accentOffset);
    ctx.lineTo(popupX + popupWidth - accentOffset, popupY + accentOffset + accentSize);
    ctx.stroke();

    // Bottom-left accent
    ctx.beginPath();
    ctx.moveTo(popupX + accentOffset + accentSize, popupY + popupHeight - accentOffset);
    ctx.lineTo(popupX + accentOffset, popupY + popupHeight - accentOffset);
    ctx.lineTo(popupX + accentOffset, popupY + popupHeight - accentOffset - accentSize);
    ctx.stroke();

    // Bottom-right accent
    ctx.beginPath();
    ctx.moveTo(popupX + popupWidth - accentOffset - accentSize, popupY + popupHeight - accentOffset);
    ctx.lineTo(popupX + popupWidth - accentOffset, popupY + popupHeight - accentOffset);
    ctx.lineTo(popupX + popupWidth - accentOffset, popupY + popupHeight - accentOffset - accentSize);
    ctx.stroke();

    // No title needed

    // Store positions for click handling
    // Always initialize with a new array to ensure clean state
    window.popupUnitPositions = [];

    // Draw unit options in a row (similar to unit selection panel)
    const unitsStartY = popupY + 10; // Start from the top with just padding
    let currentX = popupX + 10; // Start with padding

    defensiveUnits.forEach((unit, index) => {
        // Calculate icon width for this unit
        const currentIconWidth = unit.squareIcon ? iconSize : (iconSize * 2);

        // Store unit position for click detection
        // Find the current unit from humanUnitTypes to ensure we get the latest properties
        // including any experience bonuses
        const latestUnit = humanUnitTypes.find(u => u.id === unit.id) || unit;

        window.popupUnitPositions.push({
            x: currentX,
            y: unitsStartY,
            width: currentIconWidth,
            height: iconSize,
            unit: latestUnit
        });

        const cornerRadius = 8; // Rounded corner radius


        // Draw rounded rectangle background
        ctx.fillStyle = 'rgba(30, 40, 50, 0.8)';
        drawRoundedRect(currentX, unitsStartY, currentIconWidth, iconSize, cornerRadius);
        ctx.fill();


        // Add attractive gradient overlay
        const gradient = ctx.createLinearGradient(currentX, unitsStartY, currentX, unitsStartY + iconSize);
        gradient.addColorStop(0, 'rgba(40, 60, 80, 0.8)');
        gradient.addColorStop(1, 'rgba(20, 35, 45, 0.9)');
        ctx.fillStyle = gradient;
        drawRoundedRect(currentX, unitsStartY, currentIconWidth, iconSize, cornerRadius);
        ctx.fill();

        // Add a subtle inner glow border
        ctx.strokeStyle = 'rgba(60, 180, 75, 0.4)';
        ctx.lineWidth = 1.5;
        drawRoundedRect(currentX, unitsStartY, currentIconWidth, iconSize, cornerRadius);
        ctx.stroke();

        // Add glossy highlight at the top
        const glossGradient = ctx.createLinearGradient(currentX, unitsStartY, currentX, unitsStartY + iconSize * 0.3);
        glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glossGradient;

        // Draw the glossy effect with rounded top corners
        ctx.beginPath();
        ctx.moveTo(currentX + cornerRadius, unitsStartY);
        ctx.lineTo(currentX + currentIconWidth - cornerRadius, unitsStartY);
        ctx.quadraticCurveTo(currentX + currentIconWidth, unitsStartY, currentX + currentIconWidth, unitsStartY + cornerRadius);
        ctx.lineTo(currentX + currentIconWidth, unitsStartY + iconSize * 0.3);
        ctx.lineTo(currentX, unitsStartY + iconSize * 0.3);
        ctx.lineTo(currentX, unitsStartY + cornerRadius);
        ctx.quadraticCurveTo(currentX, unitsStartY, currentX + cornerRadius, unitsStartY);
        ctx.closePath();
        ctx.fill();

        // Draw the unit icon with image smoothing enabled for higher quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Calculate dimensions to maintain aspect ratio
        const img = unit.infoImage;
        const imgWidth = img.naturalWidth || 1; // Prevent division by zero
        const imgHeight = img.naturalHeight || 1;

        // Use fixed width but calculate height to maintain aspect ratio
        let calculatedHeight = (imgHeight / imgWidth) * currentIconWidth;

        // Safety check to ensure height doesn't exceed reasonable limits
        calculatedHeight = Math.min(calculatedHeight, iconSize * 1);

        // Position the image at the bottom of the container
        const topOffset = Math.max(0, iconSize - calculatedHeight);

        ctx.drawImage(unit.infoImage, currentX, unitsStartY + topOffset, currentIconWidth, calculatedHeight);

        // Check if there is already a human unit on this row
        let hasUnitInRow = false;
        if (bonusTile && window.gameState && window.gameState.isRowOccupied) {
            // Use the isRowOccupied function for consistency
            hasUnitInRow = window.gameState.isRowOccupied(bonusTile.y, false); // false = check for human (not NPC) units
        }

        // Gray out the icon if player can't afford unit or if there's already a unit in row
        if (unit.price > playerMoney || hasUnitInRow) {
            // Create semi-transparent overlay with gradient
            const unaffordableGradient = ctx.createLinearGradient(currentX, unitsStartY, currentX, unitsStartY + iconSize);
            unaffordableGradient.addColorStop(0, 'rgba(20, 20, 20, 0.7)');
            unaffordableGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
            ctx.fillStyle = unaffordableGradient;
            drawRoundedRect(currentX, unitsStartY, currentIconWidth, iconSize, cornerRadius);
            ctx.fill();

            // Measure the text to ensure it fits
            const priceText = `$${unit.price}`;
            ctx.font = `bold 14px ${UI.fonts.primary}`;
            const textWidth = ctx.measureText(priceText).width;

            if (!hasUnitInRow) {
                // Create dynamic price tag background that fits the text
                const tagPadding = 10;
                const tagWidth = Math.max(textWidth + tagPadding * 2, 40);
                const tagHeight = 22;
                const tagX = currentX + (currentIconWidth - tagWidth) / 2;
                const tagY = unitsStartY + iconSize / 2 - tagHeight / 2;

                ctx.fillStyle = 'rgba(220, 160, 40, 0.95)';
                drawRoundedRect(tagX, tagY, tagWidth, tagHeight, 4);
                ctx.fill();

                // Add price tag border
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
                ctx.lineWidth = 1;
                drawRoundedRect(tagX, tagY, tagWidth, tagHeight, 4);
                ctx.stroke();

                // Display the price with currency symbol
                ctx.fillStyle = '#FFF';
                ctx.font = `bold 14px ${UI.fonts.primary}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';  // Center text vertically
                ctx.fillText(priceText, tagX + tagWidth / 2, tagY + tagHeight / 2);
                ctx.textBaseline = 'alphabetic';  // Reset to default
            }
        }

        // Move to the next position
        currentX += currentIconWidth + iconSpacing;
    });
}

// Optimized draw function - always draw everything to prevent flicker
export function draw() {
    // Set rendering quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Always draw background first to prevent black flicker
    drawBackground();

    // Draw all game elements
    drawHeadquarters();
    drawGameGrid();
    drawPlayerSection();
    drawInfoPanel();
    drawMenuButton();
    drawPlayersInfo();

    // Update and draw animations
    animationManager.update();
    animationManager.draw(ctx);

    // Draw popups
    drawBonusUnitSelectionPopup();
}

function drawBackground() {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGradient.addColorStop(0, UI.colors.backgroundDark);
    bgGradient.addColorStop(1, '#0c1015');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}
