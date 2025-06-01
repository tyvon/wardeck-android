import {gameField, npcUnitTypes, humanUnitTypes, players, isRowOccupied, getCurrentGameTime, capturedBonusTiles, calculatePlayerBonuses} from './gameState.js';
import {gridHeight, gridWidth, gameWidth, tileSize, createUnitTypes, moneyIncomePerSecond, BONUS_TYPE, BONUS_VALUES} from './gameConfig.js';

export class NPCAI {
    constructor() {
        this.lastUnitCreationTime = 0;
        this.unitCreationInterval = 3000; // 3 seconds for unit placement
        this.isActive = false;
        this.currentStrategy = 'normal';

        // Mission level parameters
        this.enemyCount = 10; // Default enemy count
        this.enemyLevel = 1; // Default enemy level
        this.winCondition = 'destroy_all'; // Default win condition
    }

    // Set the number of enemies for this level
    setEnemyCount(count) {
        this.enemyCount = count;
    }

    // Set the enemy level difficulty for this level
    setEnemyLevel(level) {
        this.enemyLevel = level;
    }

    // Set the win condition for this level
    setWinCondition(condition) {
        this.winCondition = condition;
    }

    start() {
        this.isActive = true;
        this.update();
    }

    stop() {
        this.isActive = false;
    }

    setStrategy(difficulty) {
        this.currentStrategy = difficulty;
    }

    update() {
        if (!this.isActive) return;

        const currentTime = performance.now();

        // Unit placement according to schedule
        if (currentTime - this.lastUnitCreationTime >= this.unitCreationInterval) {
            this.tryCreateUnit();
            this.lastUnitCreationTime = currentTime;
        }

        requestAnimationFrame(() => this.update());
    }

    // Basic helper methods
    findAvailableRows() {
        const availableRows = [];
        for (let row = 0; row < gridHeight; row++) {
            if (!isRowOccupied(row, true)) {
                availableRows.push(row);
            }
        }
        return availableRows;
    }

    getAffordableUnits(filterStatic = true) {
        // Filter units that NPC can afford
        let affordableUnits = npcUnitTypes.filter(unit => players[0].money >= unit.price);

        // Additionally, filter out static units when needed based on win condition
        if (filterStatic && ['destroy_all', 'survive'].includes(this.winCondition)) {
            affordableUnits = affordableUnits.filter(unit => !unit.isStatic);
        }

        return affordableUnits;
    }

    // Find the least expensive affordable unit
    findCheapestAffordableUnit() {
        const affordableUnits = this.getAffordableUnits();
        if (affordableUnits.length === 0) return null;

        const cheapestUnit = affordableUnits.reduce((min, unit) =>
            unit.price < min.price ? unit : min, affordableUnits[0]);

        const row = this.selectBestRow();
        if (row === null) return null;

        return {
            unit: cheapestUnit,
            row
        };
    }

    // Find the strongest unit
    findStrongestUnit() {
        const affordableUnits = this.getAffordableUnits();
        if (affordableUnits.length === 0) return null;

        // Sort by combination of attack, health and range
        const sortedByPower = [...affordableUnits].sort((a, b) =>
            (b.attack * b.health * b.range) - (a.attack * a.health * a.range));

        const strongestUnit = sortedByPower[0];

        const row = this.selectBestRow();
        if (row === null) return null;

        return {
            unit: strongestUnit,
            row
        };
    }

    findStrongestAttackUnit(targetRow = null) {
        let affordableUnits = this.getAffordableUnits();
        if (affordableUnits.length === 0) return null;
        affordableUnits = affordableUnits.filter(unit => !unit.isStatic);

        const sortedByPower = [...affordableUnits].sort((a, b) =>
            (b.attack * b.health * b.range) - (a.attack * a.health * a.range));

        const strongestUnit = sortedByPower[0];

        const row = targetRow !== null ? targetRow : this.selectBestRow();
        if (row === null) return null;

        return {
            unit: strongestUnit,
            row
        };
    }


    // Get information about player units on the field
    getPlayerUnits() {
        const playerUnits = [];
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const unit = gameField[y][x];
                if (unit && unit.isHuman) {
                    playerUnits.push({ unit, row: y, col: x });
                }
            }
        }
        return playerUnits;
    }

    getNpcUnits() {
        const npcUnits = [];
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const unit = gameField[y][x];
                if (unit && !unit.isHuman) {
                    npcUnits.push({ unit, row: y, col: x });
                }
            }
        }
        return npcUnits;
    }

    // Select the best row for unit placement
    selectBestRow() {
        const availableRows = this.findAvailableRows();
        if (availableRows.length === 0) return null;
        return availableRows[Math.floor(Math.random() * availableRows.length)];
    }

    getExpensiveUnit() {
        const activeGameTime = getCurrentGameTime();
        const npcMoney = players[0].money;

        if (this.currentStrategy === 'easy' || this.currentStrategy === 'normal') {
            if (activeGameTime > 120000 && npcMoney >= 2000) {
                return this.findStrongestAttackUnit();
            }
        }  else if (this.currentStrategy === 'hard') {
            const playerUnits = this.getPlayerUnits();
            const playerUnitsCount = playerUnits.length;
            const playerUnitsPrice = playerUnits.reduce((sum, unit) => sum + unit.unit.price, 0);

            if (activeGameTime > 120000 && playerUnitsCount >= 4 && playerUnitsPrice < 500 && npcMoney >= 500) {
                return this.findStrongestAttackUnit();
            }
        }

        return null;
    }

    handleCapturedBonusTiles() {
        // Check if NPC has any captured bonus tiles which don't have a defensive unit on them
        if (!window.gameState || !window.gameState.capturedBonusTiles || !window.gameState.capturedBonusTiles.npc) {
            return null;
        }

        // Get captured bonus tiles for the NPC
        const npcCapturedTiles = window.gameState.capturedBonusTiles.npc;
        if (npcCapturedTiles.length === 0) {
            return null;
        }

        // Find tiles that are in rows not occupied by any NPC units
        const tilesWithoutDefensiveUnits = npcCapturedTiles.filter(tile => {
            // Check if the row is already occupied by NPC units
            const isRowAlreadyOccupied = isRowOccupied(tile.y, true); // true = check for NPC units

            // Return true if the row is NOT already occupied by NPC units
            return !isRowAlreadyOccupied;
        });

        if (tilesWithoutDefensiveUnits.length === 0) {
            return null;
        }

        // Only handle one bonus tile per call
        // Choose the first tile in the list (we could add more complex selection logic later)
        const tileToDefend = tilesWithoutDefensiveUnits[0];

        // Define specific defensive units by their unitLevel
        const defensiveUnits = [
            npcUnitTypes.find(unit => unit.id === 5), // MG Nest
            npcUnitTypes.find(unit => unit.id === 8)  // Armor Shredder
        ].filter(unit => unit);

        // Get defensive units the NPC can afford
        const affordableStaticUnits = defensiveUnits.filter(unit =>
            players[0].money >= unit.price
        );

        if (affordableStaticUnits.length === 0) {
            return null;
        }

        let selectedUnit = null;

        // Different selection strategies based on AI difficulty
        switch (this.currentStrategy) {
            case 'easy':
                // Get the cheapest available defensive unit
                selectedUnit = affordableStaticUnits.reduce((cheapest, unit) =>
                    unit.price < cheapest.price ? unit : cheapest, affordableStaticUnits[0]
                );
                break;

            case 'normal':
                // 50/50 chance between cheapest and most expensive unit
                if (Math.random() < 0.5) {
                    // Get the cheapest
                    selectedUnit = affordableStaticUnits.reduce((cheapest, unit) =>
                        unit.price < cheapest.price ? unit : cheapest, affordableStaticUnits[0]
                    );
                } else {
                    // Get the most expensive
                    selectedUnit = affordableStaticUnits.reduce((mostExpensive, unit) =>
                        unit.price > mostExpensive.price ? unit : mostExpensive, affordableStaticUnits[0]
                    );
                }
                break;

            case 'hard':
                // Get the most expensive (presumably strongest) available defensive unit
                selectedUnit = affordableStaticUnits.reduce((mostExpensive, unit) =>
                    unit.price > mostExpensive.price ? unit : mostExpensive, affordableStaticUnits[0]
                );

                // Check for enemy unit in the same row
                if (selectedUnit) {
                    const playerUnits = this.getPlayerUnits();
                    // Find human unit in the same row as the bonus tile (there can be only one)
                    const enemyUnit = playerUnits.find(pu => pu.row === tileToDefend.y);

                    if (enemyUnit) {
                        // Don't place defensive units against enemy static units
                        if (enemyUnit.unit.isStatic) {
                            selectedUnit = null;
                        } else {
                            // Calculate player's bonuses for mobile enemy units
                            const playerBonuses = calculatePlayerBonuses(false); // false = human player
                            const enemyEffectiveAttack = enemyUnit.unit.attack + playerBonuses.attackBonus;
                            const enemyEffectiveArmor = (enemyUnit.unit.armor || 0) + playerBonuses.armorBonus;

                            // Calculate effective damage considering armor and bonuses
                            const ourDamage = selectedUnit.attack > enemyEffectiveArmor ?
                                selectedUnit.attack - enemyEffectiveArmor : 0;
                            const enemyDamage = enemyEffectiveAttack > (selectedUnit.armor || 0) ?
                                enemyEffectiveAttack - (selectedUnit.armor || 0) : 0;

                            // Calculate DPS and time to kill
                            const ourDPS = ourDamage / selectedUnit.reloadTime;
                            const enemyDPS = enemyDamage / enemyUnit.unit.reloadTime;
                            const timeToKillEnemy = ourDamage > 0 ? enemyUnit.unit.health / ourDPS : Infinity;
                            const timeToBeKilled = enemyDamage > 0 ? selectedUnit.health / enemyDPS : Infinity;

                            // Only place the defensive unit if it can defeat the enemy unit
                            if (timeToKillEnemy >= timeToBeKilled) {
                                // Not strong enough to defend against the enemy unit
                                selectedUnit = null;
                            }
                        }
                    }
                }
                break;

            default:
                // Fallback to normal strategy
                selectedUnit = affordableStaticUnits[Math.floor(Math.random() * affordableStaticUnits.length)];
        }

        if (selectedUnit) {
            // Create coordinates object
            const tileCoords = { y: tileToDefend.y, x: tileToDefend.x };

            // Use placeDefensiveUnit function from gameState to place the unit
            if (window.gameState && typeof window.gameState.placeDefensiveUnit === 'function') {
                // placeDefensiveUnit(unitType, tileCoords, isHuman)
                const result = window.gameState.placeDefensiveUnit(selectedUnit, tileCoords, false);

                if (result) {
                    return { unit: selectedUnit, row: tileToDefend.y };
                }
            }
        }

        return null;
    }

    // "Easy" strategy
    easyStrategy() {
        const affordableUnits = this.getAffordableUnits();
        if (affordableUnits.length === 0) return null;

        const reactionType = Math.random();
        if (reactionType < 0.2) {
            this.handleCapturedBonusTiles();
        }

        const expensiveUnit = this.getExpensiveUnit();
        if (expensiveUnit) {
            return expensiveUnit;
        }

        // In easy mode, only use random unit selection
        const randomUnit = affordableUnits[Math.floor(Math.random() * affordableUnits.length)];
        const row = this.selectBestRow();

        if (row === null) return null;

        return { unit: randomUnit, row };
    }

    // "Normal" strategy
    normalStrategy() {
        const availableRows = this.findAvailableRows();
        if (availableRows.length === 0) return null;
        const affordableUnits = this.getAffordableUnits();
        if (affordableUnits.length === 0) return null;

        const playerUnits = this.getPlayerUnits();

        // If a player has no units, use base strategy
        if (playerUnits.length === 0) {
            return this.findStrongestAttackUnit();
        }

        const expensiveUnit = this.getExpensiveUnit();
        if (expensiveUnit) {
            return expensiveUnit;
        }

        // Choose a random reaction type for unpredictability
        const reactionType = Math.random();

        if (reactionType < 0.6) {
            // 60% of cases: try to counter player's units
            const targetUnit = playerUnits[Math.floor(Math.random() * playerUnits.length)];

            // Select a unit with higher characteristics considering bonuses
            const counterUnit = this.findCounterUnit(targetUnit.unit);

            if (counterUnit && availableRows.includes(targetUnit.row)) {
                return {
                    unit: counterUnit,
                    row: targetUnit.row
                };
            }

            this.handleCapturedBonusTiles();
        }

        return this.findCheapestAffordableUnit();
    }

    // Improved hardStrategy function
    hardStrategy() {
        const npcMoney = players[0].money;
        const availableRows = this.findAvailableRows();
        if (availableRows.length === 0) return null;
        const affordableUnits = this.getAffordableUnits();
        if (affordableUnits.length === 0) return null;

        const expensiveUnit = this.getExpensiveUnit();
        if (expensiveUnit) {
            return expensiveUnit;
        }

        const playerUnits = this.getPlayerUnits();
        let unhandledCounterUnits = 0;

        // Separate player units into attacking and defensive
        const attackingUnits = playerUnits.filter(unit => !unit.unit.isStatic);
        const staticUnits = playerUnits.filter(unit => unit.unit.isStatic);

        // Sort attacking units by descending danger
        const sortedAttackingUnits = [...attackingUnits].sort((a, b) =>
            (b.unit.attack * b.unit.range) - (a.unit.attack * a.unit.range));

        // Sort defensive units by ascending power (to attack the weakest)
        const sortedStaticUnits = [...staticUnits].sort((a, b) =>
            (a.unit.attack * a.unit.range) - (b.unit.attack * b.unit.range));

        // Combine lists - attacking first, then defensive
        const sortedPlayerUnits = [...sortedAttackingUnits, ...sortedStaticUnits];

        // Check each player unit, starting with the most dangerous
        for (const targetUnit of sortedPlayerUnits) {
            const targetRow = targetUnit.row;

            // Check if the line with the current player unit is free
            if (!isRowOccupied(targetRow, true)) {
                const counterUnit = this.findCounterUnit(targetUnit.unit);

                if (!counterUnit) {
                    if (this.winCondition !== 'destroy_hq' && this.isStrongestUnit(targetUnit.unit)) {
                        if (npcMoney >= 1200) {
                            return this.findStrongestAttackUnit(targetRow);
                        }
                    }
                }

                if (counterUnit) {
                    return {
                        unit: counterUnit,
                        row: targetRow
                    };
                } else {
                    unhandledCounterUnits++;
                }
            }
        }

        if (this.winCondition == 'destroy_hq') {
            this.handleCapturedBonusTiles();
        } else if (npcMoney < 1200) {
            this.handleCapturedBonusTiles();
        }


        if (unhandledCounterUnits == 0) {
            return this.findStrongestAttackUnit();
        } else {
            return this.findCheapestAffordableUnit();
        }
    }

    // Finds the optimal counter-unit against the specified enemy unit
    findCounterUnit(enemyUnit) {
        const affordableUnits = this.getAffordableUnits();
        if (affordableUnits.length === 0) return null;

        // Calculate player's bonuses
        const playerBonuses = calculatePlayerBonuses(false); // false = human player
        const enemyEffectiveAttack = enemyUnit.attack + playerBonuses.attackBonus;
        const enemyEffectiveArmor = (enemyUnit.armor || 0) + playerBonuses.armorBonus;

        // For each available unit, calculate its ability to defeat the enemy unit
        const counterUnits = affordableUnits.map(unit => {
            // Consider armor when calculating effective damage
            // If attack is less than or equal to armor - no damage is dealt
            const effectiveUnitDamage = unit.attack > enemyEffectiveArmor ?
                unit.attack - enemyEffectiveArmor : 0;

            const effectiveEnemyDamage = enemyEffectiveAttack > (unit.armor || 0) ?
                enemyEffectiveAttack - (unit.armor || 0) : 0;

            // Calculate DPS (damage per second) of both units considering armor
            const unitDPS = effectiveUnitDamage / unit.reloadTime;
            const enemyDPS = effectiveEnemyDamage / enemyUnit.reloadTime;

            // Base time to kill each other without considering advantages
            // If effective damage is 0, then time is infinite (i.e. cannot kill)
            let timeToKillEnemy = effectiveUnitDamage > 0 ? enemyUnit.health / unitDPS : Infinity;
            let timeToBeKilled = effectiveEnemyDamage > 0 ? unit.health / enemyDPS : Infinity;

            // Determine who will attack first, considering range and speed
            let unitStartsAttackFirst = false;
            let extraDamageBeforeEnemyCanAttack = 0;

            // Maximum possible distance between units
            const maxDistance = (gridWidth - 2);

            if (unit.range >= maxDistance) {
                timeToKillEnemy = 0;
                timeToBeKilled = Infinity;
            }
            else if (unit.range > enemyUnit.range) {
                // IMPORTANT: First shot occurs immediately when enemy enters attack range
                // Consider armor when calculating damage from first shot
                extraDamageBeforeEnemyCanAttack = effectiveUnitDamage;

                // Calculate how many shots unit can make before enemy can attack
                // Calculate the difference in range (in cells)
                const rangeDifference = unit.range - enemyUnit.range;

                // Time required for enemy to cover the distance and enter its attack zone
                // velocity is speed in pixels per second, so we divide distance by it
                const timeToCloseDistance = (rangeDifference * tileSize) / enemyUnit.velocity;

                // How many shots our unit can make during this time
                const shotsBeforeContact = Math.floor(timeToCloseDistance / unit.reloadTime);

                // Additional damage before enemy's first shot (considering armor)
                extraDamageBeforeEnemyCanAttack += (shotsBeforeContact * effectiveUnitDamage);

                // If damage dealt is greater than or equal to opponent's health, our unit will win without taking damage
                if (extraDamageBeforeEnemyCanAttack >= enemyUnit.health) {
                    timeToKillEnemy = timeToCloseDistance;
                    timeToBeKilled = Infinity; // Our unit won't take damage
                } else {
                    // Adjust enemy health and kill time considering initial damage
                    const remainingEnemyHealth = enemyUnit.health - extraDamageBeforeEnemyCanAttack;
                    timeToKillEnemy = timeToCloseDistance + (remainingEnemyHealth / unitDPS);
                }

                unitStartsAttackFirst = true;
            }
            else if (unit.range < enemyUnit.range) {
                // Calculate if the unit can reach the enemy before they reload
                const distanceToEnemy = ((gridWidth - 2) * tileSize); // Maximum possible distance between units
                const timeToReachEnemy = Math.ceil(distanceToEnemy / unit.velocity);
                let enemyExtraDamage = 0;

                // Check if unit can reach enemy before enemy can fire again
                if (timeToReachEnemy > enemyUnit.reloadTime) {
                    // Enemy will have time to fire at least once
                    enemyExtraDamage = effectiveEnemyDamage;
                }

                // Calculate how many shots enemy can fire while unit approaches
                const rangeDifference = enemyUnit.range - unit.range;
                const timeToCloseDistance = (rangeDifference * tileSize) / unit.velocity;
                const shotsBeforeContact = Math.floor(timeToCloseDistance / enemyUnit.reloadTime);
                enemyExtraDamage += (shotsBeforeContact * effectiveEnemyDamage);

                if (enemyExtraDamage >= unit.health) {
                    timeToBeKilled = timeToCloseDistance;
                    timeToKillEnemy = Infinity; // Our unit won't be able to deal damage
                } else {
                    const remainingUnitHealth = unit.health - enemyExtraDamage;
                    timeToBeKilled = (remainingUnitHealth / enemyDPS);
                }

                unitStartsAttackFirst = false;
            }
            // Both units have the same range
            else {
                // Special case: both units are static (velocity = 0)
                if (unit.velocity === 0 && enemyUnit.velocity === 0) {
                    // Check if they can reach each other based on the map width
                    const maxDistanceBetweenUnits = (gridWidth - 2); // Max distance in tiles, excluding placement tiles

                    // If both units can't reach each other due to range limitations
                    if (unit.range < maxDistanceBetweenUnits && enemyUnit.range < maxDistanceBetweenUnits) {
                        // Neither unit can attack the other, so this isn't a valid counter
                        timeToKillEnemy = Infinity;
                        timeToBeKilled = Infinity;
                        unitStartsAttackFirst = false;
                    }
                    // Both can reach each other
                    else {
                        timeToBeKilled = Infinity;
                        unitStartsAttackFirst = unit.reloadTime <= enemyUnit.reloadTime;
                    }
                }
                // Regular case: both units have the same range but at least one can move
                else {
                    // Whoever attacks first depends on reload time
                    unitStartsAttackFirst = unit.reloadTime <= enemyUnit.reloadTime;
                }
            }

            // Determine battle outcome - who will win
            // Consider cases when damage is completely absorbed by armor
            const unitWins = (() => {
                // If both times are Infinity, it's a draw (units cannot kill each other)
                if (timeToKillEnemy === Infinity && timeToBeKilled === Infinity) return false;

                // If a unit's effective damage is 0, it cannot win
                if (effectiveUnitDamage <= 0) return false;

                // If an opponent's effective damage is 0, unit always wins
                if (effectiveEnemyDamage <= 0) return true;

                // In other cases, whoever kills the opponent faster wins
                return timeToKillEnemy <= timeToBeKilled;
            })();

            // Calculate our unit's remaining health after battle (if it wins)
            let remainingHealth = 0;
            if (unitWins) {
                if (timeToBeKilled === Infinity) {
                    remainingHealth = unit.health; // The Unit didn't take damage
                } else {
                    // Calculate damage received by our unit before killing the opponent
                    const damageReceived = enemyDPS * timeToKillEnemy;
                    remainingHealth = Math.max(0, unit.health - damageReceived);
                }
            }

            // Effectiveness = ratio of remaining health to initial health (for winning units)
            const healthEfficiency = unitWins ? (remainingHealth / unit.health) : 0;

            // Additional metric - armor penetration (how well the unit penetrates opponent's armor)
            // The higher the value, the more effective the unit is against this opponent
            const armorPenetrationEfficiency = enemyUnit.armor > 0 ?
                (unit.attack / enemyUnit.armor) : unit.attack;

            return {
                unit,
                unitWins,
                timeToKillEnemy,
                timeToBeKilled,
                remainingHealth,
                healthEfficiency,
                armorPenetrationEfficiency,
                // Other useful metrics for debugging
                effectiveUnitDamage,
                effectiveEnemyDamage,
                extraDamageBeforeEnemyCanAttack,
                unitStartsAttackFirst
            };
        });

        // Filter only those units that can defeat the enemy
        const winningCounters = counterUnits.filter(info => info.unitWins);

        if (winningCounters.length > 0) {
            if (enemyUnit.unitLevel >= 9) {
                winningCounters.sort((a, b) => b.timeToBeKilled - a.timeToBeKilled);
                return winningCounters[0].unit;
            } else {
                winningCounters.sort((a, b) => a.unit.unitLevel - b.unit.unitLevel);
                if (winningCounters.length >= 2) {
                    let counterUnit = winningCounters[0].unit;
                    if (counterUnit.unitLevel === enemyUnit.unitLevel) {
                        return winningCounters[1].unit;
                    }
                }
                return winningCounters[0].unit;
            }
        }

        return null;
    }

    isStrongestUnit(unit) {
        const humanUnitTypes = createUnitTypes(true);

        // Skip if unit is static
        if (unit.isStatic) {
            return false;
        }

        // Filter non-static units and calculate their power
        const nonStaticUnits = humanUnitTypes.filter(u => !u.isStatic);
        const unitPower = unit.attack * unit.health;

        // Compare against all non-static units
        return !nonStaticUnits.some(u =>
            (u.attack * u.health) > unitPower
        );
    }

    getMoneyShortageRate() {
        const npcMoney = players[0].money;
        const playerMoney = players[1].money;
        let moneyShortageRate = 0;

        if (npcMoney !== 0) {
            if (playerMoney === 0) {
                moneyShortageRate = 1;
            } else {
                moneyShortageRate = Number((npcMoney / playerMoney).toFixed(1));
            }
        }

        return moneyShortageRate;
    }

    // Choose strategy based on current difficulty
    selectStrategy() {
        switch (this.currentStrategy) {
            case 'easy':
                return this.easyStrategy();
            case 'normal':
                return this.normalStrategy();
            case 'hard':
                return this.hardStrategy();
            default:
                return this.normalStrategy();
        }
    }

    tryCreateUnit() {
        const decision = this.selectStrategy();
        if (!decision) return;

        const { unit, row } = decision;
        const x = gridWidth - 1; // Rightmost column for NPC

        if (players[0].money >= unit.price) {
            const now = performance.now();
            const readyToAttackTime = now - (unit.reloadTime * 1000);

            const newUnit = {
                ...unit,
                unitId: Date.now(),
                image: unit.image,
                infoImage: unit.infoImage,
                isHuman: false,
                iconUrl: unit.iconUrl,
                lastAttackTime: readyToAttackTime,
                health: unit.health,
                velocity: unit.velocity
            };

            gameField[row][x] = newUnit;

            // Deduct money for unit placement
            players[0].money -= unit.price;
        }
    }
}
