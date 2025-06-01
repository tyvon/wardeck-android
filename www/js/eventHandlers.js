import { canvasHeight, tileSize, gridWidth, gridHeight, gameWidth, gameHeight, gridTopOffset, gridLeftOffset, playerSectionHeight, playerSectionIconSize, menuButtonWidth, menuButtonHeight, menuButtonLeftOffset, menuButtonTopOffset } from './gameConfig.js';
import { setSelectedUnit, clearSelectedUnit, setHoveredTile, placeUnit, humanUnitTypes, canAffordUnit, selectedUnit, setSelectedBonusTile, clearSelectedBonusTile, players, gameField, isValidTile, forceActivateFirstTimeHint, deactivateFirstTimeHint } from './gameState.js';
import { draw, setMenuButtonHovered } from './renderer.js';
import { showModalWindow } from './modalWindow.js';
import { audioManager } from './audioManager.js';
import { windowToCanvasCoordinates, getScaleFactor } from './responsive.js';
import { scheduleDraw } from './drawScheduler.js';

const canvas = document.getElementById('gameCanvas');

function getTileCoordinates(x, y) {
    // Convert window coordinates to canvas coordinates
    const canvasCoords = windowToCanvasCoordinates(x, y);
    const scaledX = canvasCoords.x;
    const scaledY = canvasCoords.y;

    const gridStartY = gridTopOffset;
    const gridEndY = gridStartY + gameHeight;

    if (scaledX < gridLeftOffset || scaledX >= gridLeftOffset + gameWidth || scaledY < gridStartY || scaledY >= gridEndY) {
        return null;
    }
    return {
        x: Math.floor((scaledX - gridLeftOffset) / tileSize),
        y: Math.floor((scaledY - gridStartY) / tileSize)
    };
}

// Performance: Throttle mousemove events
let lastMouseMoveTime = 0;
const MOUSE_MOVE_THROTTLE = 16; // ~60fps

function handleMouseMove(event) {
    // Throttle mousemove events for performance
    const now = performance.now();
    if (now - lastMouseMoveTime < MOUSE_MOVE_THROTTLE) {
        return;
    }
    lastMouseMoveTime = now;

    // Get the canvas-relative coordinates
    const canvasCoords = windowToCanvasCoordinates(event.clientX, event.clientY);
    const x = canvasCoords.x;
    const y = canvasCoords.y;

    // Check if the cursor is over the menu button
    const overMenuButton = x >= menuButtonLeftOffset && x <= menuButtonLeftOffset + menuButtonWidth &&
                          y >= menuButtonTopOffset && y <= menuButtonTopOffset + menuButtonHeight;

    // Only update if state changed
    const wasHovered = canvas.style.cursor === 'pointer';
    if (overMenuButton !== wasHovered) {
        setMenuButtonHovered(overMenuButton);
        canvas.style.cursor = overMenuButton ? 'pointer' : 'default';
    }

    const tileCoords = getTileCoordinates(event.clientX, event.clientY);
    setHoveredTile(tileCoords);

    // Only redraw if needed (draw function should check dirty flags)
    scheduleDraw();
}

function handleClick(event) {
    // Get the canvas-relative coordinates
    const canvasCoords = windowToCanvasCoordinates(event.clientX, event.clientY);
    const x = canvasCoords.x;
    const y = canvasCoords.y;

    // Check if a bonus tile popup is open
    if (window.gameState && window.gameState.selectedBonusTile) {
        // Check if click is on a unit in the popup
        let clickedOnPopupUnit = false;

        if (window.popupUnitPositions && window.popupUnitPositions.length > 0) {
            for (const unitPos of window.popupUnitPositions) {
                if (x >= unitPos.x && x <= unitPos.x + unitPos.width &&
                    y >= unitPos.y && y <= unitPos.y + unitPos.height) {
                    clickedOnPopupUnit = true;

                    // Get the current bonus tile
                    const bonusTile = window.gameState.selectedBonusTile;

                    // Check if there is already a human unit on this row
                    let hasUnitInRow = false;
                    if (window.gameState && window.gameState.isRowOccupied) {
                        // Use the isRowOccupied function for consistency
                        hasUnitInRow = window.gameState.isRowOccupied(bonusTile.y, false); // false = check for human (not NPC) units
                    }

                    // Check if player can afford the unit and no unit in row
                    const player = players[1]; // Human player
                    if (player.money >= unitPos.unit.price && !hasUnitInRow) {
                        // Place the defensive unit on the bonus tile
                        const tileCoords = {
                            y: window.gameState.selectedBonusTile.y,
                            x: window.gameState.selectedBonusTile.x
                        };

                        if (window.gameState.placeDefensiveUnit(unitPos.unit, tileCoords, true)) {
                            audioManager.playSound('unit_place');
                            scheduleDraw();
                        }
                    } else if (hasUnitInRow) {
                        // Play denial sound if there's a unit in the row
                        audioManager.playSound('button_click');
                    }
                    break;
                }
            }
        }

        // If click is outside the popup, close it
        if (!clickedOnPopupUnit) {
            clearSelectedBonusTile();
            scheduleDraw();
        }

        return; // Exit function since we've handled the popup interaction
    }

    // Checking the click on the menu button
    if (x >= menuButtonLeftOffset && x <= menuButtonLeftOffset + menuButtonWidth &&
        y >= menuButtonTopOffset && y <= menuButtonTopOffset + menuButtonHeight) {
        showModalWindow();
        return;
    }

    const humanSectionY = canvasHeight - playerSectionHeight;
    if (y >= humanSectionY) {
        // Click in the human player section
        let clickedOnUnit = false;
        // We check the click only on human units
        humanUnitTypes.forEach(unit => {
            // Use the saved icon width value (unit.width) or calculate it
            const iconWidth = unit.width || (unit.squareIcon ? playerSectionIconSize : (playerSectionIconSize * 2));

            if (x >= unit.x && x <= unit.x + iconWidth &&
                y >= unit.y && y <= unit.y + playerSectionIconSize) {
                clickedOnUnit = true;
                if (canAffordUnit(unit)) {
                    audioManager.playSound('unit_select');

                    if (selectedUnit === unit) {
                        clearSelectedUnit();
                    } else {
                        setSelectedUnit(unit);
                    }
                    scheduleDraw();
                }
            }
        });
        if (!clickedOnUnit) {
            clearSelectedUnit();
            scheduleDraw();
        }
    } else {
        // Click on the playing field
        const tileCoords = getTileCoordinates(event.clientX, event.clientY);
        if (tileCoords) {
            // Check if this is a bonus tile owned by the human player
            if (window.gameState && window.gameState.isBonusTile) {
                const isBonusTile = window.gameState.isBonusTile(tileCoords.y, tileCoords.x);

                if (isBonusTile) {
                    const owner = window.gameState.getBonusTileOwner ?
                        window.gameState.getBonusTileOwner(tileCoords.y, tileCoords.x) : null;

                    if (owner === 'human') {
                        const hasUnit = gameField[tileCoords.y][tileCoords.x] !== null;

                        if (!hasUnit) {
                            // This is a bonus tile owned by the human player with no unit on it
                            // Show the unit selection popup
                            setSelectedBonusTile(tileCoords);
                            audioManager.playSound('button_click');
                            scheduleDraw();
                            return;
                        }
                    }
                }
            }

            // Check if user has a unit selected and is trying to place it
            if (selectedUnit && !selectedUnit.isNPC) {
                // If it's a valid placement, place the unit
                if (isValidTile(tileCoords)) {
                    if (placeUnit(tileCoords)) {
                        audioManager.playSound('unit_place');
                        setHoveredTile(null);
                        scheduleDraw();
                    }
                } else {
                    // Invalid placement - check if they're trying to place outside first column
                    if (tileCoords.x !== 0) {
                        // User tried to place unit outside first column, activate hint highlighting
                        forceActivateFirstTimeHint();
                        audioManager.playSound('button_click'); // Play feedback sound
                        scheduleDraw();

                        // Auto-hide the hint after 3 seconds
                        setTimeout(() => {
                            deactivateFirstTimeHint();
                            scheduleDraw();
                        }, 1000);
                    } else {
                        // They clicked on first column but it's invalid for other reasons (occupied, etc.)
                        // Try to place normally, which will fail gracefully
                        if (placeUnit(tileCoords)) {
                            audioManager.playSound('unit_place');
                            setHoveredTile(null);
                            scheduleDraw();
                        }
                    }
                }
            } else {
                // No unit selected or NPC unit selected, try normal placement
                if (placeUnit(tileCoords)) {
                    audioManager.playSound('unit_place');
                    setHoveredTile(null);
                    scheduleDraw();
                }
            }
        } else {
            clearSelectedUnit();
            setHoveredTile(null);
            scheduleDraw();
        }
    }
}

// Handle touch events for mobile
function handleTouchStart(event) {
    event.preventDefault(); // Prevent default touch behavior
    const touch = event.touches[0];
    handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY
    });
}

function handleTouchMove(event) {
    event.preventDefault(); // Prevent scrolling
    const touch = event.touches[0];
    handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY
    });
}

function handleTouchEnd(event) {
    event.preventDefault();
    if (event.changedTouches.length > 0) {
        const touch = event.changedTouches[0];
        handleClick({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }
}

export function setupEventListeners() {
    // Mouse events for desktop
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
}
