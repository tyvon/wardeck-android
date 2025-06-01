import { unitExperienceLevels } from './gameConfig.js';
import { humanUnitTypes, npcUnitTypes } from './gameState.js';

// Experience storage for each unit type
const unitTypeExperience = {
    human: {}, // id: { kills: number, level: number }
    npc: {}    // id: { kills: number, level: number }
};

export function initializeUnitExperience() {
    // Reset all counters
    unitTypeExperience.human = {};
    unitTypeExperience.npc = {};

    // Initialize experience for human units and reset bonuses
    humanUnitTypes.forEach(unit => {
        // Use the unit's configured level as the default experience level
        const defaultLevel = unit.level || 0;

        // Reset experienceLevel property to default
        unit.experienceLevel = defaultLevel;

        // Restore original values
        if (unitTypeExperience.human[unit.id]) {
            unit.velocity = unitTypeExperience.human[unit.id].originalVelocity;
            unit.reloadTime = unitTypeExperience.human[unit.id].originalReloadTime;
        }

        // Re-initialize experience with default level
        // Set kills to match the minimum required for the default level
        const defaultKills = defaultLevel > 0 ? unitExperienceLevels[defaultLevel].kills : 0;
        unitTypeExperience.human[unit.id] = {
            kills: defaultKills,
            level: defaultLevel,
            originalVelocity: unit.velocity,
            originalReloadTime: unit.reloadTime
        };

        // Apply bonuses for the default level if greater than 0
        if (defaultLevel > 0) {
            applyLevelBonuses(unit.id, true, defaultLevel);
        }
    });

    // Initialize experience for NPC units and reset bonuses
    npcUnitTypes.forEach(unit => {
        // Use the unit's configured level as the default experience level
        const defaultLevel = unit.level || 0;

        // Reset experienceLevel property to default
        unit.experienceLevel = defaultLevel;

        // Restore original values
        if (unitTypeExperience.npc[unit.id]) {
            unit.velocity = unitTypeExperience.npc[unit.id].originalVelocity;
            unit.reloadTime = unitTypeExperience.npc[unit.id].originalReloadTime;
        }

        // Re-initialize experience with default level
        // Set kills to match the minimum required for the default level
        const defaultKills = defaultLevel > 0 ? unitExperienceLevels[defaultLevel].kills : 0;
        unitTypeExperience.npc[unit.id] = {
            kills: defaultKills,
            level: defaultLevel,
            originalVelocity: unit.velocity,
            originalReloadTime: unit.reloadTime
        };

        // Apply bonuses for the default level if greater than 0
        if (defaultLevel > 0) {
            applyLevelBonuses(unit.id, false, defaultLevel);
        }
    });
}

// Add experience (kills) to the specified unit type
export function addUnitKill(unitId, isHuman) {
    const experienceStore = isHuman ? unitTypeExperience.human : unitTypeExperience.npc;

    // If the record for this unit type doesn't exist, create it
    if (!experienceStore[unitId]) {
        const unitType = isHuman
            ? humanUnitTypes.find(u => u.id === unitId)
            : npcUnitTypes.find(u => u.id === unitId);

        if (!unitType) return false;

        experienceStore[unitId] = {
            kills: 0,
            level: 0,
            originalVelocity: unitType.velocity,
            originalReloadTime: unitType.reloadTime
        };
    }

    // Increase the kill counter
    experienceStore[unitId].kills++;

    // Check if the unit has reached a new level
    const newLevel = checkLevelUp(experienceStore[unitId]);

    // If the level has increased, update it
    if (newLevel > experienceStore[unitId].level) {
        experienceStore[unitId].level = newLevel;
        applyLevelBonuses(unitId, isHuman, newLevel);
        return true; // Level has increased
    }

    return false; // Level hasn't changed
}

// Level up check
function checkLevelUp(unitExperience) {
    let maxLevel = 0;

    // Go through all levels in reverse order
    for (let i = unitExperienceLevels.length - 1; i >= 0; i--) {
        if (unitExperience.kills >= unitExperienceLevels[i].kills) {
            maxLevel = i;
            break;
        }
    }

    return maxLevel;
}

// Apply level bonuses to units of the corresponding type
function applyLevelBonuses(unitId, isHuman, level) {
    const unitTypes = isHuman ? humanUnitTypes : npcUnitTypes;
    const experienceStore = isHuman ? unitTypeExperience.human : unitTypeExperience.npc;

    // Find the unit type to update
    const unitType = unitTypes.find(u => u.id === unitId);
    if (!unitType) return;

    // Get base values for velocity and reload time
    const originalVelocity = experienceStore[unitId].originalVelocity;
    const originalReloadTime = experienceStore[unitId].originalReloadTime;

    // Get multipliers for the current level
    const { velocityBonus, reloadBonus } = unitExperienceLevels[level];

    // Apply bonuses to the unit type
    unitType.velocity = Math.round(originalVelocity * velocityBonus);
    unitType.reloadTime = Math.round(originalReloadTime / reloadBonus * 10) / 10; // Round to 1 decimal place

    // Save the level in the unit type for display
    unitType.experienceLevel = level;
}

// Get current experience level for a unit type
export function getUnitExperienceLevel(unitId, isHuman) {
    const experienceStore = isHuman ? unitTypeExperience.human : unitTypeExperience.npc;
    return experienceStore[unitId]?.level || 0;
}

// Get kill count for a unit type
export function getUnitKillCount(unitId, isHuman) {
    const experienceStore = isHuman ? unitTypeExperience.human : unitTypeExperience.npc;
    return experienceStore[unitId]?.kills || 0;
}

// Get the name of the current experience level for a unit type
export function getUnitExperienceLevelName(unitId, isHuman) {
    const level = getUnitExperienceLevel(unitId, isHuman);
    return unitExperienceLevels[level].name;
}

// Get all experience info for a unit (for the information panel)
export function getUnitExperienceInfo(unitId, isHuman) {
    const level = getUnitExperienceLevel(unitId, isHuman);
    const kills = getUnitKillCount(unitId, isHuman);

    // Get current and next levels
    const currentLevel = unitExperienceLevels[level];
    const nextLevel = level < unitExperienceLevels.length - 1 ? unitExperienceLevels[level + 1] : null;

    return {
        level,
        levelName: currentLevel.name,
        kills,
        nextLevelKills: nextLevel ? nextLevel.kills : null,
        nextLevelName: nextLevel ? nextLevel.name : null,
        progress: nextLevel ? (kills - currentLevel.kills) / (nextLevel.kills - currentLevel.kills) : 1,
        isMaxLevel: level === unitExperienceLevels.length - 1
    };
}
