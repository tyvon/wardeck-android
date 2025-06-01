import { BONUS_TYPE, tileSize, gridWidth, gridHeight } from './gameConfig.js';

// Quick game mode configurations
export const quickGameConfig = {
    // Destroy HQ Easy difficulty preset
    easy: {
        name: 'Easy Skirmish',
        desc: 'A relaxed game with fewer enemy units and increased starting resources.',
        enemyCount: Infinity,
        enemyLevel: 1,
        timeLimit: Infinity,
        playerMoney: 1000,
        playerHqPoints: 1000,
        npcMoney: 1000,
        npcHqPoints: 2000,
        winCondition: 'destroy_hq',
        preset: [
            { unitId: 1, x: 7, y: 0 },
            { unitId: 2, x: 7, y: 1 },
            { unitId: 4, x: 7, y: 2 },
            { unitId: 2, x: 7, y: 3 },
            { unitId: 1, x: 7, y: 4 }
        ],
        tileBonusPreset: [
            { y: 1, x: 4, type: BONUS_TYPE.ARMOR },
            { y: 1, x: 6, type: BONUS_TYPE.MONEY },
            { y: 3, x: 6, type: BONUS_TYPE.MONEY },
            { y: 3, x: 4, type: BONUS_TYPE.ATTACK }
        ],
        bgImage: './images/backgrounds/mission1.png',
        bgImageId: 1
    },

    // Destroy HQ Normal difficulty preset
    normal: {
        name: 'Standard Battle',
        desc: 'Balanced forces with moderate enemy units and resources.',
        enemyCount: Infinity,
        enemyLevel: 1,
        timeLimit: Infinity,
        playerMoney: 750,
        playerHqPoints: 750,
        npcMoney: 750,
        npcHqPoints: 1000,
        winCondition: 'destroy_hq',
        preset: [
            { unitId: 1, x: 7, y: 0 },
            { unitId: 2, x: 7, y: 1 },
            { unitId: 1, x: 7, y: 2 },
            { unitId: 2, x: 7, y: 3 },
            { unitId: 1, x: 7, y: 4 }
        ],
        tileBonusPreset: [
            { y: 1, x: 2, type: BONUS_TYPE.RANDOM },
            { y: 3, x: 2, type: BONUS_TYPE.MONEY },
            { y: 1, x: 5, type: BONUS_TYPE.RANDOM },
            { y: 3, x: 5, type: BONUS_TYPE.MONEY }
        ],
        bgImage: './images/backgrounds/mission3.png',
        bgImageId: 3
    },

    // Destroy HQ Hard difficulty preset
    hard: {
        name: 'Intense Combat',
        desc: 'Challenging battle with numerous enemy units and formidable defenses.',
        enemyCount: Infinity,
        enemyLevel: 2,
        timeLimit: Infinity,
        playerMoney: 800,
        playerHqPoints: 1000,
        npcMoney: 1000,
        npcHqPoints: 2000,
        winCondition: 'destroy_hq',
        preset: [
            { unitId: 2, x: 7, y: 0 },
            { unitId: 4, x: 7, y: 1 },
            { unitId: 5, x: 7, y: 2 },
            { unitId: 4, x: 7, y: 3 },
            { unitId: 2, x: 7, y: 4 }
        ],
        tileBonusPreset: [
            { y: 1, x: 2, type: BONUS_TYPE.RANDOM },
            { y: 3, x: 2, type: BONUS_TYPE.RANDOM },
            { y: 2, x: 3, type: BONUS_TYPE.MONEY },
            { y: 2, x: 4, type: BONUS_TYPE.MONEY },
            { y: 1, x: 5, type: BONUS_TYPE.RANDOM },
            { y: 3, x: 5, type: BONUS_TYPE.RANDOM }
        ],
        bgImage: './images/backgrounds/mission5.png',
        bgImageId: 5
    },

    // Survival mode preset
    survival: {
        name: 'Survival Challenge',
        desc: 'Survive against endless waves of enemies for as long as possible.',
        enemyCount: Infinity,
        enemyLevel: 1,
        timeLimit: 900, // 15 minutes survival
        playerMoney: 2000,
        playerHqPoints: 800,
        npcMoney: 1500,
        npcHqPoints: 2000,
        winCondition: 'survive',
        preset: [
            { unitId: 3, x: 7, y: 0 },
            { unitId: 6, x: 7, y: 1 },
            { unitId: 7, x: 7, y: 2 },
            { unitId: 6, x: 7, y: 3 },
            { unitId: 3, x: 7, y: 4 }
        ],
        tileBonusPreset: [
            { y: 0, x: 3, type: BONUS_TYPE.ARMOR },
            { y: 1, x: 4, type: BONUS_TYPE.MONEY },
            { y: 2, x: 3, type: BONUS_TYPE.ATTACK },
            { y: 3, x: 4, type: BONUS_TYPE.MONEY },
            { y: 4, x: 3, type: BONUS_TYPE.ARMOR }
        ],
        bgImage: './images/backgrounds/mission4.png',
        bgImageId: 4
    },

    // Destruction mode preset
    destruction: {
        name: 'Destruction Mode',
        desc: 'Eliminate a fixed number of enemy units to achieve victory.',
        enemyCount: 250,
        enemyLevel: 1,
        timeLimit: Infinity,
        playerMoney: 1200,
        playerHqPoints: 1000,
        npcMoney: 2000,
        npcHqPoints: 2000,
        winCondition: 'destroy_all',
        preset: [
            { unitId: 1, x: 7, y: 0 },
            { unitId: 3, x: 7, y: 1 },
            { unitId: 4, x: 7, y: 2 },
            { unitId: 3, x: 7, y: 3 },
            { unitId: 1, x: 7, y: 4 }
        ],
        tileBonusPreset: [
            { y: 1, x: 2, type: BONUS_TYPE.ARMOR },
            { y: 3, x: 2, type: BONUS_TYPE.ARMOR },
            { y: 2, x: 3, type: BONUS_TYPE.MONEY },
            { y: 2, x: 4, type: BONUS_TYPE.MONEY },
            { y: 1, x: 5, type: BONUS_TYPE.ATTACK },
            { y: 3, x: 5, type: BONUS_TYPE.ATTACK }
        ],
        bgImage: './images/backgrounds/mission2.png',
        bgImageId: 2
    }
};

// Function to get a quick game configuration based on difficulty and mode
export function getQuickGameConfig(difficulty = 'normal', mode = 'standard') {
    const configKey = mode === 'survival' ? 'survival' :
                     mode === 'destruction' ? 'destruction' :
                     difficulty;

    return quickGameConfig[configKey] || quickGameConfig.normal;
}
