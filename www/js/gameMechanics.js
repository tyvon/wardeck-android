import {players, moneyIncomePerSecond} from './gameConfig.js';
import { tileSize, gridLeftOffset, gridTopOffset, BONUS_VALUES } from './gameConfig.js';
import { animationManager, registerHqDamage } from './renderer.js';
import { determineGamePhase } from './gameState.js';
import { addUnitKill } from './unitExperience.js';
import { getCurrentMission } from "./missionManager.js";

export class GameLoop {
    constructor(field, onUpdate) {
        this.field = field;
        this.onUpdate = onUpdate;
        this.isRunning = false;
        this.lastTick = performance.now();
        this.tickRate = 1000 / 60;
        this.unitPositions = new Map();
        this.frameId = null;
        this.initializedUnits = new Set();
        this.combatUnits = new Set();
        this.inProgress = new Set(); // Stores the IDs of units that are currently being animated.
        this.isAttacking = new Set(); // Stores the IDs of units that are attacking.
        this.isUnderAttack = new Set(); // Stores the IDs of units being shot at

        // For money income timing
        this.lastMoneyIncomeTime = 0;
        this.moneyIncomeInterval = 1000; // 1 second

        // Callbacks for mission events
        this.onNpcHqDestroyed = null;
        this.onPlayerHqDestroyed = null;
        this.onEnemyUnitDestroyed = null;

        // Performance optimizations
        this.unitCache = new Map(); // Cache unit data to reduce lookups
        this.skipFrames = 0; // Frame skipping for performance
        this.batchOperations = []; // Batch operations for efficiency
        this.lastFieldState = null; // Track field changes
    }

    start() {
        this.isRunning = true;
        this.lastTick = performance.now();
        this.lastMoneyIncomeTime = performance.now();
        this.startLoop();
    }

    stop() {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    startLoop() {
        const loop = () => {
            if (!this.isRunning) return;

            // Performance: Quick check for units using cached data
            let hasUnits = this.unitCache.size > 0;
            if (!hasUnits) {
                // Only do full scan if the cache is empty
                for (let y = 0; y < this.field.length; y++) {
                    for (let x = 0; x < this.field[y].length; x++) {
                        if (this.field[y][x]) {
                            hasUnits = true;
                            break;
                        }
                    }
                    if (hasUnits) break;
                }
            }

            const now = performance.now();
            const deltaTime = (now - this.lastTick) / 1000;

            // Check if it's time to add money income
            if (now - this.lastMoneyIncomeTime >= this.moneyIncomeInterval) {
                let moneyIncome = moneyIncomePerSecond;
                const gamePhase = determineGamePhase();

                switch(gamePhase) {
                    case 'earliest':
                        moneyIncome = (moneyIncomePerSecond + 1);
                        break;
                    case 'early':
                        moneyIncome = (moneyIncomePerSecond + 5);
                        break;
                    case 'mid':
                        moneyIncome = (moneyIncomePerSecond + 10);
                        break;
                    case 'late':
                        moneyIncome = (moneyIncomePerSecond + 40);
                        break;
                    case 'very late':
                        moneyIncome = (moneyIncomePerSecond + 80);
                        break;
                    case 'latest':
                        moneyIncome = (moneyIncomePerSecond + 100);
                }

                let humanMoneyIncome = moneyIncome;
                let npcMoneyIncome = moneyIncome;

                // Apply bonus from captured money tiles using cached calculations
                if (window.gameState && window.gameState.calculatePlayerBonuses) {
                    const { calculatePlayerBonuses } = window.gameState;

                    // Get cached bonuses for human player
                    const humanBonuses = calculatePlayerBonuses(false);
                    if (humanBonuses.moneyBonusPercentage > 0) {
                        const moneyBonus = Math.round(humanMoneyIncome * humanBonuses.moneyBonusPercentage);
                        humanMoneyIncome += moneyBonus;
                    }

                    // Get cached bonuses for NPC player
                    const npcBonuses = calculatePlayerBonuses(true);
                    if (npcBonuses.moneyBonusPercentage > 0) {
                        const moneyBonus = Math.round(npcMoneyIncome * npcBonuses.moneyBonusPercentage);
                        npcMoneyIncome += moneyBonus;
                    }
                }

                // Different amount of money for player and NPC
                players[0].money += npcMoneyIncome; // NPC
                players[1].money += humanMoneyIncome; // Human

                // Store income values for display in renderer
                this.humanMoneyIncome = humanMoneyIncome;
                this.npcMoneyIncome = npcMoneyIncome;

                // Make values available through window.gameState
                if (window.gameState) {
                    window.gameState.gameLoop = this;
                }

                this.lastMoneyIncomeTime = now;
            }

            if (hasUnits) {
                this.update(deltaTime);
            }

            this.lastTick = now;

            // Schedule draw instead of immediate update
            if (this.onUpdate && window.scheduleDraw) {
                window.scheduleDraw();
            }

            this.frameId = requestAnimationFrame(loop);
        };

        this.frameId = requestAnimationFrame(loop);
    }

    isTargetInRange(unit, unitX, target, targetX) {
        const distance = Math.max(0, Math.abs(targetX - unitX) - 1);
        return distance <= unit.range;
    }

    findTargetInRow(unit, unitX, unitY) {
        const row = this.field[unitY];
        let nearestTarget = null;
        let nearestTargetX = null;
        let minDistance = Infinity;

        for (let x = 0; x < row.length; x++) {
            const target = row[x];
            if (target && target.isHuman !== unit.isHuman) {
                const distance = Math.abs(x - unitX);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestTarget = target;
                    nearestTargetX = x;
                }
            }
        }

        if (nearestTarget && this.isTargetInRange(unit, unitX, nearestTarget, nearestTargetX)) {
            return { target: nearestTarget, targetX: nearestTargetX };
        }

        return null;
    }

    canAttackFirst(unit, unitX, target, targetX) {
        // Distance between units, subtract 1 as in isTargetInRange
        const distance = Math.max(0, Math.abs(targetX - unitX) - 1);

        // A unit can attack if the distance is <= its range parameter.
        return distance <= unit.range;
    }

    update(deltaTime) {
        // Performance: Skip frames if running slow
        if (this.skipFrames > 0) {
            this.skipFrames--;
            return;
        }

        const updateStart = performance.now();
        const units = [];

        // Performance: Use cached units when possible
        this.unitCache.clear();

        for (let y = 0; y < this.field.length; y++) {
            for (let x = 0; x < this.field[y].length; x++) {
                const unit = this.field[y][x];
                if (unit) {
                    this.unitCache.set(unit.unitId, { unit, x, y });
                    if (unit.isStatic) {
                        // Initialize spawnTime if not set
                        if (!unit.spawnTime) {
                            unit.spawnTime = performance.now();
                            // Adding a field to track pauses
                            unit.totalPausedTime = 0;
                            unit.lastPauseTime = 0;
                        }

                        // Check if the unit should expire
                        // We take into account the total time on pause when calculating the lifetime
                        const elapsedTime = performance.now() - unit.spawnTime - unit.totalPausedTime;
                        if (elapsedTime >= unit.lifespan) {
                            // Unit has expired, remove it
                            this.field[y][x] = null;
                            this.clearUnitState(unit.unitId);
                            continue; // Skip this unit in further processing
                        }
                    }

                    if (!this.unitPositions.has(unit.unitId)) {
                        this.unitPositions.set(unit.unitId, {
                            x: x * tileSize,
                            y: y * tileSize,
                            lastMoveTime: performance.now(),
                            initialX: x * tileSize,
                            currentGridX: x
                        });
                    }
                    units.push({ unit, currentX: x, currentY: y });
                }
            }
        }

        const newField = Array(this.field.length).fill().map(() =>
            Array(this.field[0].length).fill(null)
        );

        let gameOver = false;

        units.forEach(({unit, currentX, currentY}) => {
            if (!unit) return;

            let position = this.unitPositions.get(unit.unitId);
            if (!position) {
                position = {
                    x: currentX * tileSize,
                    y: currentY * tileSize,
                    lastMoveTime: performance.now(),
                    initialX: currentX * tileSize,
                    currentGridX: currentX
                };
                this.unitPositions.set(unit.unitId, position);
            }

            if (!this.initializedUnits.has(unit.unitId)) {
                this.initializedUnits.add(unit.unitId);
                newField[currentY][currentX] = unit;
                return;
            }

            if (!this.combatUnits.has(unit.unitId) &&
                !this.isUnderAttack.has(unit.unitId) &&
                !this.isAttacking.has(unit.unitId)) {
                const now = performance.now();
                const timeSinceLastMove = (now - position.lastMoveTime) / 1000;
                const timeForOneTile = tileSize / unit.velocity;

                if (timeSinceLastMove >= timeForOneTile) {
                    // Calculate the new position first
                    let newPositionX;
                    if (unit.isHuman) {
                        newPositionX = position.x + tileSize;
                        // Checking for NPC HQ Reach
                        if (newPositionX >= (this.field[0].length - 1) * tileSize) {
                            players[0].hqPoints -= unit.attack;
                            this.unitPositions.delete(unit.unitId);

                            // Registering damage to NPC HQ
                            registerHqDamage(false);

                            if (players[0].hqPoints <= 0) {
                                players[0].hqPoints = 0;
                                gameOver = true;
                                this.handleGameOver(true); // True means victory of a human player
                            }
                            return;
                        }
                    } else {
                        newPositionX = position.x - tileSize;
                        // Checking the achievement of the human headquarters
                        if (newPositionX <= 0) {
                            players[1].hqPoints -= unit.attack;
                            this.unitPositions.delete(unit.unitId);

                            // We register damage to the human headquarters
                            registerHqDamage(true);

                            if (players[1].hqPoints <= 0) {
                                players[1].hqPoints = 0;
                                gameOver = true;
                                this.handleGameOver(false); // false means NPC victory
                            }
                            return;
                        }
                    }

                    // Calculate the new grid position
                    const newGridX = Math.floor(newPositionX / tileSize);

                    // Check if the new position is a bonus tile
                    if (window.gameState && window.gameState.isBonusTile) {
                        const { isBonusTile, isBonusTileCaptured, releaseBonusTile, captureBonusTile, setSelectedBonusTile } = window.gameState;

                        if (isBonusTile(currentY, newGridX)) {
                            // If the tile is already captured by an opponent, release it first
                            if (isBonusTileCaptured(currentY, newGridX))  {
                                releaseBonusTile(currentY, newGridX);
                            }

                            // Capture the bonus tile for this player
                            captureBonusTile(currentY, newGridX, unit.isHuman);
                        }
                    }

                    // Normal movement - update position
                    if (unit.isHuman) {
                        position.x += tileSize;
                    } else {
                        position.x -= tileSize;
                    }
                    position.lastMoveTime = now;
                    position.currentGridX = Math.floor(position.x / tileSize);
                }
            }

            if (!gameOver && position.currentGridX >= 0 && position.currentGridX < this.field[0].length) {
                newField[currentY][position.currentGridX] = unit;
            }
        });

        for (let y = 0; y < this.field.length; y++) {
            for (let x = 0; x < this.field[y].length; x++) {
                this.field[y][x] = newField[y][x];
            }
        }

        if (!gameOver) {
            this.handleCombat();
        }

        // Performance monitoring: adjust frame skipping if needed
        const updateTime = performance.now() - updateStart;
        if (updateTime > 16.67) { // More than 1 frame at 60fps
            this.skipFrames = Math.min(3, Math.floor(updateTime / 16.67) - 1);
        }
    }

    handleGameOver(humanWon) {
        this.stop();

        // Call the appropriate callback based on who won
        if (humanWon) {
            // Human won - NPC HQ destroyed
            if (this.onNpcHqDestroyed) {
                this.onNpcHqDestroyed();
            }
        } else {
            // NPC won - Human HQ destroyed
            if (this.onPlayerHqDestroyed) {
                this.onPlayerHqDestroyed();
            }
        }
    }

    clearUnitState(unitId) {
        this.unitPositions.delete(unitId);
        this.initializedUnits.delete(unitId);
        this.combatUnits.delete(unitId);
        this.inProgress.delete(unitId);
        this.isAttacking.delete(unitId);
        this.isUnderAttack.delete(unitId);
    }

    performAttack(unit, target, unitX, unitY, targetX) {
        if (this.inProgress.has(unit.unitId)) return;

        const fromX = gridLeftOffset + unitX * tileSize + tileSize / 2;
        const fromY = gridTopOffset + unitY * tileSize + tileSize / 2;
        const toX = gridLeftOffset + targetX * tileSize + tileSize / 2;
        const toY = gridTopOffset + unitY * tileSize + tileSize / 2;

        // Import required functions from gameState
        const { calculatePlayerBonuses } = window.gameState || {};

        // 15% critical hit chance (x1.5 damage)
        const isCritical = Math.random() < 0.15;
        const damageMultiplier = isCritical ? 1.5 : 1;

        // Get cached attack bonus for the attacker
        let attackBonus = 0;
        if (calculatePlayerBonuses) {
            const bonuses = calculatePlayerBonuses(!unit.isHuman);
            attackBonus = bonuses.attackBonus;
        }

        // Normal attack
        this.inProgress.add(unit.unitId);
        this.isAttacking.add(unit.unitId);
        this.isUnderAttack.add(target.unitId);

        animationManager.createShotAnimation(fromX, fromY, toX, toY, unit, isCritical).then(() => {
            // Saving the ID for access after possible destruction
            const targetId = target.unitId;
            const unitId = unit.unitId;

            // Clear only animation and attack status
            this.inProgress.delete(unitId);
            this.isAttacking.delete(unitId);

            // If the unit still exists, deal damage to it
            if (this.field[unitY][targetX] === target) {
                // Calculate total damage taking into account critical hit and any attack bonus
                const rawDamage = parseFloat(((unit.attack + attackBonus) * damageMultiplier).toFixed(1));

                // Get cached armor bonus for the defender
                let armorBonus = 0;
                if (calculatePlayerBonuses) {
                    const bonuses = calculatePlayerBonuses(!target.isHuman);
                    armorBonus = bonuses.armorBonus;
                }

                // Total armor including bonus
                const targetArmor = (target.armor || 0) + armorBonus;

                // We take armor into account when dealing damage
                let finalDamage = 0;
                const penetratedArmor = rawDamage > targetArmor;

                if (penetratedArmor) {
                    // If attack exceeds armor, we deal damage = attack - armor
                    finalDamage = parseFloat((rawDamage - targetArmor).toFixed(1));
                } else {
                    // If attack is less than or equal to armor, no damage is dealt (= 0)
                    finalDamage = 0;

                    // Adding a ricochet effect when armor is not penetrated
                    animationManager.createRicochetAnimation(toX, toY);
                }

                // Adding a visual hit effect based on the unit type
                animationManager.createHitEffect(
                    toX, toY,
                    finalDamage,
                    isCritical,
                    penetratedArmor,
                    target
                );

                // Dealing the final damage
                target.health -= finalDamage;
                unit.lastAttackTime = performance.now();

                // Clearing the "under attack" status for the target
                this.isUnderAttack.delete(targetId);

                if (target.health <= 0) {
                    animationManager.createUnitDestructionEffect(toX, toY,target);

                    // If the target is destroyed
                    this.field[unitY][targetX] = null;
                    this.clearUnitState(targetId);

                    // Register the kill for the unit type that committed the kill
                    const killRegistered = addUnitKill(unit.id, unit.isHuman);

                    // Update the unit's lastMoveTime so it doesn't move instantly
                    const position = this.unitPositions.get(unitId);
                    if (position) {
                        position.lastMoveTime = performance.now();
                    }

                    // If the unit was under attack from the target, clear its status
                    if (this.isUnderAttack.has(unitId)) {
                        this.isUnderAttack.delete(unitId);
                    }

                    // Clearing the battle status for the attacking unit as the enemy has been destroyed
                    this.combatUnits.delete(unitId);

                    // Notify that an enemy unit was destroyed (if it's an NPC unit and the player killed it)
                    if (!target.isHuman && unit.isHuman && this.onEnemyUnitDestroyed) {
                        this.onEnemyUnitDestroyed();
                    }

                    // Schedule draw after unit is destroyed
                    if (window.scheduleDraw) {
                        window.scheduleDraw();
                    }
                }
            }
        });
    }

    handleCombat() {
        for (let y = 0; y < this.field.length; y++) {
            // Performance: Early row check
            let hasHuman = false;
            let hasNPC = false;

            for (let x = 0; x < this.field[y].length; x++) {
                const unit = this.field[y][x];
                if (unit) {
                    if (unit.isHuman) hasHuman = true;
                    else hasNPC = true;
                }
            }

            // Skip row if no potential combat
            if (!hasHuman || !hasNPC) continue;

            for (let x = 0; x < this.field[y].length; x++) {
                const unit = this.field[y][x];
                if (!unit || !unit.lastAttackTime || this.inProgress.has(unit.unitId)) continue;

                const targetInfo = this.findTargetInRow(unit, x, y);

                if (targetInfo) {
                    const { target, targetX } = targetInfo;
                    this.combatUnits.add(unit.unitId);

                    const now = performance.now();
                    const timeSinceLastAttack = (now - unit.lastAttackTime) / 1000;

                    if (timeSinceLastAttack >= unit.reloadTime) {
                        // Simplified check - if the unit can attack the target by range
                        if (this.canAttackFirst(unit, x, target, targetX)) {
                            this.performAttack(unit, target, x, y, targetX);
                        }
                    }
                } else {
                    this.combatUnits.delete(unit.unitId);
                }
            }
        }
    }
}
