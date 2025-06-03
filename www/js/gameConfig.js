// Bonus tile types
export const BONUS_TYPE = {
    MONEY: 'money',
    ARMOR: 'armor',
    ATTACK: 'attack',
    RANDOM: 'random'
};

// Bonus values
export const BONUS_VALUES = {
    MONEY_PERCENTAGE: 0.1,  // 10% money income bonus per tile
    ARMOR_BONUS: 5,         // +5 armor bonus points per tile
    ATTACK_BONUS: 5         // +5 attack bonus points per tile
};

export const canvasWidth = 1280;
export const canvasHeight = 720;

export const tileSize = 100;
export const gridWidth = 8;
export const gridHeight = 5;
export const gridTopOffset = 60;
export const gridLeftOffset = 120;

export const gameWidth = tileSize * gridWidth;
export const gameHeight = tileSize * gridHeight;

export const bordersColor = '#32a63d';
export const playerSectionWidth = 1000;
export const playerSectionHeight = 140;
export const playerSectionLeftOffset = 20;
export const playerSectionTopOffset = 570;
export const playerSectionIconSize = 55;
export const playerSectionIconSpacing = 10;

export const infoPanelWidth = 220;
export const infoPanelHeight = 650;
export const infoPanelLeftOffset = 1040;
export const infoPanelTopOffset = 60;
export const infoPanelTopPadding = 20;
export const infoPanelLeftPadding = 20;
export const infoPanelInnerPadding = 11;
export const infoPanelIconSize = 100;

export const menuButtonWidth = 80;
export const menuButtonHeight = 35;
export const menuButtonLeftOffset = 1180;
export const menuButtonTopOffset = 15;

export const gameImages = './images';

// Bonus tile icons - paths to the images
export const bonusIcons = {
    [BONUS_TYPE.MONEY]: './images/bonus/money.png',
    [BONUS_TYPE.ARMOR]: './images/bonus/armor.png',
    [BONUS_TYPE.ATTACK]: './images/bonus/attack.png'
};
export const humanUnitsImages = `${gameImages}/units/human`;
export const npcUnitsImages = `${gameImages}/units/npc`;

// UI background images
export const uiBackgrounds = {
    main: `${gameImages}/ui/main-background.jpg`,   // Main game background
    modalWindow: `${gameImages}/ui/modal-window-bg.jpg`, // Modal window background
    modalOverlay: `${gameImages}/ui/main-background.jpg`, // Modal overlay
    resultWindow: `${gameImages}/ui/modal-window-bg.jpg`, // Result window
};

// Flag images for HQ indicators
export const flagImages = {
    human: `${gameImages}/ui/flag/green.png`,  // Green flag for human HQ
    npc: `${gameImages}/ui/flag/red.png`,      // Red flag for NPC HQ
    neutral: `${gameImages}/ui/flag/white.png`  // White flag for HQ progress bars
};

export const uiIcons = {
    stopwatch: `${gameImages}/ui/stopwatch.png`,  // Stopwatch icon for timers
    skull: `${gameImages}/ui/skull.png`           // Skull icon for enemy count
};

export const hqImageWidth = 100;
export const hqImageHeight = 500;
export const hqImageTopOffset = 60;
export const hqImageHumanLeftOffset = 19; // considering border width
export const hqImageNpcLeftOffset = 921; // considering border width

export const modalWindowWidth = 600;
export const modalWindowHeight = 530;

export const humanPlayerMoney = 5;
export const npcPlayerMoney = 5;
export const humanPlayerHqPoints = 1000;
export const npcPlayerHqPoints = 1000;

export const moneyIncomePerSecond = 0;

export const players = [
    { name: 'NPC', money: npcPlayerMoney, color: 'red', hqPoints: 0 },
    { name: 'Human', money: humanPlayerMoney, color: 'blue', hqPoints: 0 }
];

export const createUnitTypes = (isHuman = true) => {
    const imagesPath = isHuman ? humanUnitsImages : npcUnitsImages;

    return [
        {
            id: 1,
            name: 'Storm Troopers',
            desc: 'Basic foot soldiers equipped with standard firearms. Low cost makes them perfect for early deployment, but they lack durability in prolonged combat.',
            price: 5,
            originalHealth: 10,
            health: 10,
            armor: 0, // No armor for basic infantry
            attack: 3,
            range: 1,
            velocity: 35,
            reloadTime: 1,
            killPrice: 15,
            level: 0,
            unitLevel: 1,
            squareIcon: true,
            iconUrl: `${imagesPath}/infantry.png`,
            iconInfoUrl: `${imagesPath}/infantry-info.png`,
            symbol: {
                path: 'M5,16 L9,5 L11,5 L15,16 M7,10 L13,10',
                viewBox: '0 0 20 20'
            },
            unitType: 'infantry'
        },

        {
            id: 2,
            name: 'Iron Guard',
            desc: 'Soldiers with enhanced armor and improved weapons. Their increased health allows them to absorb significant damage while providing steady offensive capability. Slower movement makes them vulnerable to ranged attacks.',
            price: 25,
            originalHealth: 25,
            health: 25,
            armor: 2, // Light armor that can block weak attacks
            attack: 5,
            range: 1,
            velocity: 25,
            reloadTime: 1.5,
            killPrice: 40,
            level: 0,
            unitLevel: 2,
            squareIcon: true,
            iconUrl: `${imagesPath}/heavy-infantry.png`,
            iconInfoUrl: `${imagesPath}/heavy-infantry-info.png`,
            symbol: {
                path: 'M5,15 L9,5 L11,5 L15,15 M7,10 L13,10 M3,13 L17,13',
                viewBox: '0 0 20 20'
            },
            unitType: 'heavy_infantry'
        },

        {
            id: 3,
            name: 'Sniper',
            desc: 'Specialized marksmen with exceptional range and high damage per shot. Their ability to engage targets from distance makes them excellent support units, but very low health means they must be protected. Slow reload time between shots.',
            price: 50,
            originalHealth: 8,
            health: 8,
            armor: 0, // No armor for snipers
            attack: 10,
            range: 3,
            velocity: 20,
            reloadTime: 2.5,
            killPrice: 120,
            level: 0,
            unitLevel: 3,
            squareIcon: true,
            iconUrl: `${imagesPath}/sniper.png`,
            iconInfoUrl: `${imagesPath}/sniper-info.png`,
            symbol: {
                path: 'M3,17 L9,8 L11,8 L17,17 M4,5 L16,5 M10,5 L10,8',
                viewBox: '0 0 20 20'
            },
            unitType: 'sniper'
        },

        {
            id: 4,
            name: 'Viper Recon',
            desc: 'Fast-moving light vehicles with mounted weapons. Their high speed allows for quick deployment and flanking maneuvers. Armor provides some protection, but vulnerable to anti-vehicle weapons.',
            price: 150,
            originalHealth: 35,
            health: 35,
            armor: 10, // Light vehicle armor
            attack: 18,
            range: 2,
            velocity: 40,
            reloadTime: 1.5,
            killPrice: 225,
            level: 0,
            unitLevel: 4,
            squareIcon: false,
            iconUrl: `${imagesPath}/armored-car.png`,
            iconInfoUrl: `${imagesPath}/armored-car-info.png`,
            symbol: {
                path: 'M3,5 L17,5 L17,15 L3,15 Z',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'autocannon'
        },

        {
            id: 5,
            name: 'MG Nest',
            desc: 'Fortified machine gun position with excellent anti-infantry capabilities. Provides sustained fire support but cannot move. Limited lifespan of 60 seconds makes strategic placement crucial.',
            price: 150,
            originalHealth: 50,
            health: 50,
            armor: 5,
            attack: 10,
            range: 3,
            velocity: 0, // Static unit
            reloadTime: 1.5,
            killPrice: 600,
            level: 0,
            unitLevel: 5,
            squareIcon: true,
            lifespan: 60000, // 60 seconds in milliseconds
            spawnTime: 0, // Will be set when placed
            isStatic: true, // Flag to identify static units
            iconUrl: `${imagesPath}/mg-nest.png`,
            iconInfoUrl: `${imagesPath}/mg-nest-info.png`,
            symbol: {
                path: 'M4,4 L16,4 L16,16 L4,16 Z M5,10 L15,10 M10,5 L10,15 M6,6 L14,14 M6,14 L14,6',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'autocannon'
        },

        {
            id: 6,
            name: 'Raptor Strike',
            desc: 'Versatile combat vehicles with balanced offensive and defensive capabilities. More durable than armored cars with improved firepower, maintaining good mobility. Effective against most ground units but susceptible to heavy anti-tank weapons.',
            price: 300,
            originalHealth: 80,
            health: 80,
            armor: 15, // Medium armor
            attack: 30,
            range: 2,
            velocity: 30,
            reloadTime: 1.8,
            killPrice: 450,
            level: 0,
            unitLevel: 6,
            squareIcon: false,
            iconUrl: `${imagesPath}/light-tank.png`,
            iconInfoUrl: `${imagesPath}/light-tank-info.png`,
            symbol: {
                path: 'M10,2 L18,10 L10,18 L2,10 Z',
                viewBox: '0 0 20 20',
                style: 'fill'
            },
            unitType: 'light_tank'
        },

        {
            id: 7,
            name: 'Thunder Hammer',
            desc: 'Battle-hardened tanks with reinforced armor and powerful main guns. Provides excellent firepower combined with good survivability, making them core battlefield units. More expensive than light tanks but offers substantially better combat performance.',
            price: 600,
            originalHealth: 120,
            health: 120,
            armor: 20, // Heavy armor
            attack: 45,
            range: 2,
            velocity: 25,
            reloadTime: 2.5,
            killPrice: 900,
            level: 0,
            unitLevel: 7,
            squareIcon: false,
            iconUrl: `${imagesPath}/medium-tank.png`,
            iconInfoUrl: `${imagesPath}/medium-tank-info.png`,
            symbol: {
                path: 'M10,2 L18,10 L10,18 L2,10 Z M4,10 L16,10 M10,4 L10,16',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'tank'
        },

        {
            id: 8,
            name: 'Armor Shredder',
            desc: 'Specialized heavy weapon designed specifically to counter armored vehicles. Its high-velocity shells can penetrate thick tank armor with devastating efficiency. Immobile but provides crucial defensive capability against enemy armor. Expires after 60 seconds.',
            price: 1000,
            originalHealth: 80,
            health: 80,
            armor: 15,
            attack: 65,
            range: 3,
            velocity: 0,
            reloadTime: 2.5,
            killPrice: 900,
            level: 0,
            unitLevel: 8,
            squareIcon: false,
            lifespan: 60000,
            spawnTime: 0,
            isStatic: true,
            iconUrl: `${imagesPath}/anti-tank-gun.png`,
            iconInfoUrl: `${imagesPath}/anti-tank-gun-info.png`,
            symbol: {
                path: 'M4,4 L16,4 L16,16 L4,16 Z M4,8 L16,8 M4,12 L16,12 M8,4 L8,16 M12,4 L12,16',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'tank'
        },

        // {
        //     id: 8,
        //     name: 'Steel Citadel',
        //     desc: 'Fortified defensive structure that provides strong protection. Immobile but has high armor and health. Expires after 60 seconds.',
        //     price: 1000,
        //     originalHealth: 150,
        //     health: 150,
        //     armor: 30,
        //     attack: 45,
        //     range: 3,
        //     velocity: 0,
        //     reloadTime: 2.5,
        //     killPrice: 900,
        //     level: 0,
        //     unitLevel: 8,
        //     squareIcon: false,
        //     lifespan: 60000,
        //     spawnTime: 0,
        //     isStatic: true,
        //     iconUrl: `${imagesPath}/bunker.png`,
        //     iconInfoUrl: `${imagesPath}/bunker-info.png`,
        //     symbol: {
        //         path: 'M4,4 L16,4 L16,16 L4,16 Z M4,8 L16,8 M4,12 L16,12 M8,4 L8,16 M12,4 L12,16',
        //         viewBox: '0 0 20 20',
        //         style: 'stroke'
        //     },
        //     unitType: 'tank'
        // },

        {
            id: 9,
            name: 'Fortress Breaker',
            desc: 'Imposing armored behemoths with devastating firepower and exceptional durability. Their thick armor and powerful cannons make them nearly unstoppable in direct engagements. Extremely slow movement and high cost are significant drawbacks.',
            price: 1200,
            originalHealth: 200,
            health: 200,
            armor: 35, // Very heavy armor
            attack: 80,
            range: 2,
            velocity: 15,
            reloadTime: 3.5,
            killPrice: 1800,
            level: 0,
            unitLevel: 9,
            squareIcon: false,
            iconUrl: `${imagesPath}/heavy-tank.png`,
            iconInfoUrl: `${imagesPath}/heavy-tank-info.png`,
            symbol: {
                path: 'M10,2 L18,10 L10,18 L2,10 Z M5,6 L15,16 M15,6 L5,16',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'tank'
        },

        {
            id: 10,
            name: 'Siege Howitzer',
            desc: 'Long-range bombardment platform capable of striking targets across the battlefield. Unmatched damage potential and exceptional range allow them to destroy enemies without retaliation. Extremely vulnerable if engaged directly and requires significant time between shots.',
            price: 1500,
            originalHealth: 40,
            health: 40,
            armor: 3, // Minimal armor
            attack: 280,
            range: 6,
            velocity: 0,
            reloadTime: 21,
            killPrice: 2000,
            level: 0,
            unitLevel: 10,
            squareIcon: false,
            lifespan: 60000,
            spawnTime: 0,
            isStatic: true,
            iconUrl: `${imagesPath}/heavy-artillery.png`,
            iconInfoUrl: `${imagesPath}/heavy-artillery-info.png`,
            symbol: {
                path: 'M4,4 L16,4 L16,16 L4,16 Z',
                viewBox: '0 0 20 20',
                style: 'fill'
            },
            unitType: 'artillery'
        },

        {
            id: 11,
            name: 'Storm Troopers',
            desc: 'Basic foot soldiers equipped with standard firearms. Low cost makes them perfect for early deployment, but they lack durability in prolonged combat.',
            price: 10,
            originalHealth: 10,
            health: 10,
            armor: 0, // No armor for basic infantry
            attack: 3,
            range: 1,
            velocity: 35,
            reloadTime: 1,
            killPrice: 15,
            level: 3,
            unitLevel: 1,
            squareIcon: true,
            iconUrl: `${imagesPath}/infantry.png`,
            iconInfoUrl: `${imagesPath}/infantry-info.png`,
            symbol: {
                path: 'M5,16 L9,5 L11,5 L15,16 M7,10 L13,10',
                viewBox: '0 0 20 20'
            },
            unitType: 'infantry'
        },

        {
            id: 12,
            name: 'Viper Recon',
            desc: 'Fast-moving light vehicles with mounted weapons. Their high speed allows for quick deployment and flanking maneuvers. Armor provides some protection, but vulnerable to anti-vehicle weapons.',
            price: 200,
            originalHealth: 35,
            health: 35,
            armor: 10, // Light vehicle armor
            attack: 18,
            range: 2,
            velocity: 40,
            reloadTime: 1.5,
            killPrice: 225,
            level: 3,
            unitLevel: 4,
            squareIcon: false,
            iconUrl: `${imagesPath}/armored-car.png`,
            iconInfoUrl: `${imagesPath}/armored-car-info.png`,
            symbol: {
                path: 'M3,5 L17,5 L17,15 L3,15 Z',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'autocannon'
        },

        {
            id: 13,
            name: 'MG Nest',
            desc: 'Fortified machine gun position with excellent anti-infantry capabilities. Provides sustained fire support but cannot move. Limited lifespan of 60 seconds makes strategic placement crucial.',
            price: 200,
            originalHealth: 50,
            health: 50,
            armor: 5,
            attack: 10,
            range: 3,
            velocity: 0, // Static unit
            reloadTime: 1.5,
            killPrice: 600,
            level: 3,
            unitLevel: 5,
            squareIcon: true,
            lifespan: 60000, // 60 seconds in milliseconds
            spawnTime: 0, // Will be set when placed
            isStatic: true, // Flag to identify static units
            iconUrl: `${imagesPath}/mg-nest.png`,
            iconInfoUrl: `${imagesPath}/mg-nest-info.png`,
            symbol: {
                path: 'M4,4 L16,4 L16,16 L4,16 Z M5,10 L15,10 M10,5 L10,15 M6,6 L14,14 M6,14 L14,6',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'autocannon'
        },

        {
            id: 14,
            name: 'Armor Shredder',
            desc: 'Specialized heavy weapon designed specifically to counter armored vehicles. Its high-velocity shells can penetrate thick tank armor with devastating efficiency. Immobile but provides crucial defensive capability against enemy armor. Expires after 60 seconds.',
            price: 1500,
            originalHealth: 80,
            health: 80,
            armor: 15,
            attack: 65,
            range: 3,
            velocity: 0,
            reloadTime: 2.5,
            killPrice: 900,
            level: 3,
            unitLevel: 8,
            squareIcon: false,
            lifespan: 60000,
            spawnTime: 0,
            isStatic: true,
            iconUrl: `${imagesPath}/anti-tank-gun.png`,
            iconInfoUrl: `${imagesPath}/anti-tank-gun-info.png`,
            symbol: {
                path: 'M4,4 L16,4 L16,16 L4,16 Z M4,8 L16,8 M4,12 L16,12 M8,4 L8,16 M12,4 L12,16',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'tank'
        },

        {
            id: 15,
            name: 'Fortress Breaker',
            desc: 'Imposing armored behemoths with devastating firepower and exceptional durability. Their thick armor and powerful cannons make them nearly unstoppable in direct engagements. Extremely slow movement and high cost are significant drawbacks.',
            price: 2000,
            originalHealth: 200,
            health: 200,
            armor: 35, // Very heavy armor
            attack: 80,
            range: 2,
            velocity: 15,
            reloadTime: 3.5,
            killPrice: 1800,
            level: 3,
            unitLevel: 9,
            squareIcon: false,
            iconUrl: `${imagesPath}/heavy-tank.png`,
            iconInfoUrl: `${imagesPath}/heavy-tank-info.png`,
            symbol: {
                path: 'M10,2 L18,10 L10,18 L2,10 Z M5,6 L15,16 M15,6 L5,16',
                viewBox: '0 0 20 20',
                style: 'stroke'
            },
            unitType: 'tank'
        },
    ];
};

// Unit experience levels and required kills
export const unitExperienceLevels = [
    { name: 'Rookie', kills: 0, velocityBonus: 1, reloadBonus: 1 },        // Level 0
    { name: 'Regular', kills: 5, velocityBonus: 1.15, reloadBonus: 1.1 },  // Level 1
    { name: 'Veteran', kills: 15, velocityBonus: 1.3, reloadBonus: 1.25 }, // Level 2
    { name: 'Elite', kills: 30, velocityBonus: 1.5, reloadBonus: 1.4 }     // Level 3
];

// Experience indicator colors for each level
export const experienceLevelColors = [
    'rgba(255, 255, 255, 0.5)',   // Rookie - white
    'rgba(80, 200, 80, 0.7)',     // Regular - green
    'rgba(80, 80, 220, 0.7)',     // Veteran - blue
    'rgba(220, 180, 50, 0.7)'     // Elite - golden
];

export const missionDescConf = {
    destroy_hq: 'Neutralize the enemy headquarters while protecting your own base. Strategic offensive is key to victory.',
    destroy_all: (enemyCount) => `Repel the enemy onslaught by eliminating ${enemyCount} hostile units. Your base must remain operational.`,
    survive: (timeLimit) => `Hold your position against waves of enemy forces for ${timeLimit} minutes. Fortify defenses and endure at all costs.`
}

export const missionsConfig = [
    {
        id: 1,
        name: 'Wastelands',
        desc: 'Our first offensive into enemy territory. Push through the contaminated wasteland and establish a foothold.',
        levels: [
            {
                id: 1,
                name: 'First Strike',
                desc: missionDescConf.destroy_hq,
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: humanPlayerMoney,
                playerHqPoints: 300,
                npcMoney: npcPlayerMoney,
                npcHqPoints: 100,
                winCondition: 'destroy_hq',
                tileBonusPreset: [
                    { y: 1, x: 2, type: BONUS_TYPE.MONEY },
                    { y: 3, x: 5, type: BONUS_TYPE.MONEY }
                ]
            },
            {
                id: 2,
                name: 'Counter Attack',
                desc: missionDescConf.destroy_all(100),
                enemyCount: 100,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: 750,
                playerHqPoints: 300,
                npcMoney: 1000,
                npcHqPoints: 2000,
                winCondition: 'destroy_all',
                preset: [
                    { unitId: 1, x: 7, y: 0 },
                    { unitId: 1, x: 7, y: 1 },
                    { unitId: 1, x: 7, y: 2 },
                    { unitId: 1, x: 7, y: 3 },
                    { unitId: 1, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    { y: 1, x: 2, type: BONUS_TYPE.ARMOR },
                    { y: 3, x: 5, type: BONUS_TYPE.ATTACK }
                ]
            },
            {
                id: 3,
                name: 'Hold The Line',
                desc: missionDescConf.survive(5),
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: 300,
                playerMoney: 1000,
                playerHqPoints: 300,
                npcMoney: 1000,
                npcHqPoints: 2000,
                winCondition: 'survive',
                preset: [
                    { unitId: 1, x: 7, y: 0 },
                    { unitId: 2, x: 7, y: 1 },
                    { unitId: 1, x: 7, y: 2 },
                    { unitId: 2, x: 7, y: 3 },
                    { unitId: 1, x: 7, y: 4 },
                ],
                tileBonusPreset: [
                    { y: 1, x: 2, type: BONUS_TYPE.ARMOR },
                    { y: 3, x: 2, type: BONUS_TYPE.ARMOR },
                    { y: 1, x: 5, type: BONUS_TYPE.ATTACK },
                    { y: 3, x: 5, type: BONUS_TYPE.ATTACK }
                ]
            }
        ],
        bgImage: `${gameImages}/backgrounds/mission1.png`
    },
    {
        id: 2,
        name: 'Forest Enclave',
        desc: 'Intelligence reveals an enemy base hidden in the forest. Capture it to secure resources and deny their reinforcements.',
        levels: [
            {
                id: 1,
                name: 'Woodland Assault',
                desc: missionDescConf.destroy_hq,
                enemyCount: Infinity,
                enemyLevel: 2,
                timeLimit: Infinity,
                playerMoney: humanPlayerMoney,
                playerHqPoints: 500,
                npcMoney: npcPlayerMoney,
                npcHqPoints: npcPlayerHqPoints,
                winCondition: 'destroy_hq',
                tileBonusPreset: [
                    { y: 0, x: 5, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 3, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 4, type: BONUS_TYPE.MONEY },
                    { y: 4, x: 2, type: BONUS_TYPE.ARMOR },
                ]
            },
            {
                id: 2,
                name: 'Forest Ambush',
                desc: missionDescConf.destroy_all(120),
                enemyCount: 120,
                enemyLevel: 2,
                timeLimit: Infinity,
                playerMoney: 1500,
                playerHqPoints: 500,
                npcMoney: 2000,
                npcHqPoints: 2000,
                winCondition: 'destroy_all',
                preset: [
                    { unitId: 2, x: 7, y: 0 },
                    { unitId: 1, x: 7, y: 1 },
                    { unitId: 3, x: 7, y: 2 },
                    { unitId: 1, x: 7, y: 3 },
                    { unitId: 2, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    { y: 0, x: 4, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 2, type: BONUS_TYPE.ARMOR },
                    { y: 2, x: 5, type: BONUS_TYPE.ARMOR },
                    { y: 4, x: 3, type: BONUS_TYPE.ATTACK }
                ]
            },
            {
                id: 3,
                name: 'Green Hell',
                desc: missionDescConf.survive(10),
                enemyCount: Infinity,
                enemyLevel: 2,
                timeLimit: 600,
                playerMoney: 2000,
                playerHqPoints: 500,
                npcMoney: 2000,
                npcHqPoints: 2000,
                winCondition: 'survive',
                preset: [
                    { unitId: 2, x: 7, y: 0 },
                    { unitId: 3, x: 7, y: 1 },
                    { unitId: 4, x: 7, y: 2 },
                    { unitId: 3, x: 7, y: 3 },
                    { unitId: 2, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    { y: 1, x: 1, type: BONUS_TYPE.ATTACK },
                    { y: 3, x: 1, type: BONUS_TYPE.ARMOR },
                    { y: 2, x: 3, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 4, type: BONUS_TYPE.MONEY },
                    { y: 0, x: 6, type: BONUS_TYPE.RANDOM },
                    { y: 4, x: 6, type: BONUS_TYPE.RANDOM }
                ]
            }
        ],
        bgImage: `${gameImages}/backgrounds/mission2.png`
    },
    {
        id: 3,
        name: 'Desert Fortress',
        desc: 'A critical enemy command center is located in the heart of the desert. Neutralize all resistance and capture their fortress.',
        levels: [
            {
                id: 1,
                name: 'Burning Sands',
                desc: missionDescConf.destroy_hq,
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: humanPlayerMoney,
                playerHqPoints: 700,
                npcMoney: npcPlayerMoney,
                npcHqPoints: npcPlayerHqPoints,
                winCondition: 'destroy_hq',
                preset: [
                    { unitId: 5, x: 7, y: 0 },
                    { unitId: 1, x: 7, y: 1 },
                    { unitId: 5, x: 7, y: 2 },
                    { unitId: 1, x: 7, y: 3 },
                    { unitId: 5, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    { y: 0, x: 2, type: BONUS_TYPE.RANDOM },
                    { y: 2, x: 3, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 4, type: BONUS_TYPE.MONEY },
                    { y: 4, x: 5, type: BONUS_TYPE.RANDOM }
                ]
            },
            {
                id: 2,
                name: 'Sandstorm Offensive',
                desc: missionDescConf.destroy_all(150),
                enemyCount: 150,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: 2000,
                playerHqPoints: 700,
                npcMoney: 2000,
                npcHqPoints: 3000,
                winCondition: 'destroy_all',
                preset: [
                    { unitId: 3, x: 7, y: 0 },
                    { unitId: 4, x: 7, y: 1 },
                    { unitId: 3, x: 7, y: 2 },
                    { unitId: 4, x: 7, y: 3 },
                    { unitId: 3, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    { y: 1, x: 2, type: BONUS_TYPE.ATTACK },
                    { y: 3, x: 5, type: BONUS_TYPE.ATTACK },
                    { y: 0, x: 4, type: BONUS_TYPE.ARMOR },
                    { y: 2, x: 3, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 4, type: BONUS_TYPE.MONEY },
                    { y: 4, x: 3, type: BONUS_TYPE.ARMOR }
                ]
            },
            {
                id: 3,
                name: 'Oasis Defense',
                desc: missionDescConf.survive(12),
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: 720,
                playerMoney: 2000,
                playerHqPoints: 700,
                npcMoney: 1500,
                npcHqPoints: 3000,
                winCondition: 'survive',
                preset: [
                    { unitId: 4, x: 7, y: 0 },
                    { unitId: 6, x: 7, y: 1 },
                    { unitId: 4, x: 7, y: 2 },
                    { unitId: 6, x: 7, y: 3 },
                    { unitId: 4, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    { y: 1, x: 2, type: BONUS_TYPE.ARMOR },
                    { y: 1, x: 5, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 1, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 6, type: BONUS_TYPE.MONEY },
                    { y: 3, x: 2, type: BONUS_TYPE.ARMOR },
                    { y: 3, x: 5, type: BONUS_TYPE.ATTACK }
                ]
            }
        ],
        bgImage: `${gameImages}/backgrounds/mission3.png`
    },
    {
        id: 4,
        name: 'Frozen Outpost',
        desc: 'An enemy research facility in the frozen tundra develops experimental weaponry. Seize it before these weapons are deployed.',
        levels: [
            {
                id: 1,
                name: 'Arctic Assault',
                desc: missionDescConf.destroy_hq,
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: humanPlayerMoney,
                playerHqPoints: humanPlayerHqPoints,
                npcMoney: npcPlayerMoney,
                npcHqPoints: npcPlayerHqPoints,
                winCondition: 'destroy_hq',
                preset: [
                    { unitId: 5, x: 7, y: 0 },
                    { unitId: 2, x: 7, y: 1 },
                    { unitId: 5, x: 7, y: 2 },
                    { unitId: 2, x: 7, y: 3 },
                    { unitId: 5, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    // Balanced pairs - equidistant from bases
                    { y: 1, x: 2, type: BONUS_TYPE.ATTACK },
                    { y: 1, x: 5, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 3, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 4, type: BONUS_TYPE.MONEY },
                    { y: 3, x: 2, type: BONUS_TYPE.ARMOR },
                    { y: 3, x: 5, type: BONUS_TYPE.ARMOR }
                ]
            },
            {
                id: 2,
                name: 'Blizzard Strike',
                desc: missionDescConf.destroy_all(150),
                enemyCount: 150,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: 3000,
                playerHqPoints: humanPlayerHqPoints,
                npcMoney: 2000,
                npcHqPoints: 2000,
                winCondition: 'destroy_all',
                preset: [
                    { unitId: 6, x: 7, y: 0 },
                    { unitId: 4, x: 7, y: 1 },
                    { unitId: 7, x: 7, y: 2 },
                    { unitId: 4, x: 7, y: 3 },
                    { unitId: 6, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    // Diamond pattern - mixed types
                    { y: 0, x: 3, type: BONUS_TYPE.MONEY },
                    { y: 0, x: 4, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 1, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 6, type: BONUS_TYPE.ATTACK },
                    { y: 4, x: 3, type: BONUS_TYPE.ARMOR },
                    { y: 4, x: 4, type: BONUS_TYPE.ARMOR }
                ]
            },
            {
                id: 3,
                name: 'Frozen Hell',
                desc: missionDescConf.survive(12),
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: 720,
                playerMoney: 5000,
                playerHqPoints: humanPlayerHqPoints,
                npcMoney: 2000,
                npcHqPoints: 2000,
                winCondition: 'survive',
                preset: [
                    { unitId: 6, x: 7, y: 0 },
                    { unitId: 7, x: 7, y: 1 },
                    { unitId: 9, x: 7, y: 2 },
                    { unitId: 7, x: 7, y: 3 },
                    { unitId: 6, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    // Cross pattern - random center
                    { y: 1, x: 1, type: BONUS_TYPE.ARMOR },
                    { y: 1, x: 6, type: BONUS_TYPE.ARMOR },
                    { y: 2, x: 3, type: BONUS_TYPE.RANDOM },
                    { y: 2, x: 4, type: BONUS_TYPE.RANDOM },
                    { y: 3, x: 1, type: BONUS_TYPE.ATTACK },
                    { y: 3, x: 6, type: BONUS_TYPE.ATTACK }
                ]
            }
        ],
        bgImage: `${gameImages}/backgrounds/mission4.png`
    },
    {
        id: 5,
        name: 'Capital Siege',
        desc: 'The final push to the enemy capital. Victory here will end the war and secure our future. Failure is not an option.',
        levels: [
            {
                id: 1,
                name: 'Breach The Walls',
                desc: missionDescConf.destroy_hq,
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: 1000,
                playerHqPoints: humanPlayerHqPoints,
                npcMoney: 1000,
                npcHqPoints: npcPlayerHqPoints,
                winCondition: 'destroy_hq',
                preset: [
                    { unitId: 8, x: 7, y: 0 },
                    { unitId: 4, x: 7, y: 1 },
                    { unitId: 8, x: 7, y: 2 },
                    { unitId: 4, x: 7, y: 3 },
                    { unitId: 8, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    { y: 0, x: 4, type: BONUS_TYPE.ARMOR },
                    { y: 1, x: 3, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 4, type: BONUS_TYPE.ARMOR },
                    { y: 3, x: 3, type: BONUS_TYPE.ATTACK },
                    { y: 4, x: 4, type: BONUS_TYPE.ARMOR }
                ]
            },
            {
                id: 2,
                name: 'Tropical Heat',
                desc: missionDescConf.destroy_all(200),
                enemyCount: 250,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: 5000,
                playerHqPoints: humanPlayerHqPoints,
                npcMoney: 3000,
                npcHqPoints: 2000,
                winCondition: 'destroy_all',
                preset: [
                    { unitId: 7, x: 7, y: 0 },
                    { unitId: 7, x: 7, y: 1 },
                    { unitId: 9, x: 7, y: 2 },
                    { unitId: 7, x: 7, y: 3 },
                    { unitId: 7, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    // Butterfly pattern - money wings
                    { y: 1, x: 2, type: BONUS_TYPE.MONEY },
                    { y: 1, x: 5, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 1, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 6, type: BONUS_TYPE.MONEY },
                    { y: 3, x: 2, type: BONUS_TYPE.MONEY },
                    { y: 3, x: 5, type: BONUS_TYPE.MONEY }
                ]
            },
            {
                id: 3,
                name: 'Final Stand',
                desc: missionDescConf.survive(15),
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: 900,
                playerMoney: 10000,
                playerHqPoints: humanPlayerHqPoints,
                npcMoney: 5000,
                npcHqPoints: 2000,
                winCondition: 'survive',
                preset: [
                    { unitId: 7, x: 7, y: 0 },
                    { unitId: 9, x: 7, y: 1 },
                    { unitId: 9, x: 7, y: 2 },
                    { unitId: 9, x: 7, y: 3 },
                    { unitId: 7, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    // Triangle formation - mixed types
                    { y: 0, x: 1, type: BONUS_TYPE.ARMOR },
                    { y: 0, x: 6, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 1, type: BONUS_TYPE.ARMOR },
                    { y: 2, x: 6, type: BONUS_TYPE.ATTACK },
                    { y: 4, x: 1, type: BONUS_TYPE.ARMOR },
                    { y: 4, x: 6, type: BONUS_TYPE.ATTACK }
                ]
            },
            {
                id: 4,
                name: 'Victory March',
                desc: missionDescConf.destroy_hq,
                enemyCount: Infinity,
                enemyLevel: 1,
                timeLimit: Infinity,
                playerMoney: 15000,
                playerHqPoints: humanPlayerHqPoints,
                npcMoney: 15000,
                npcHqPoints: 2000,
                winCondition: 'destroy_hq',
                preset: [
                    { unitId: 9, x: 7, y: 0 },
                    { unitId: 9, x: 7, y: 1 },
                    { unitId: 9, x: 7, y: 2 },
                    { unitId: 9, x: 7, y: 3 },
                    { unitId: 9, x: 7, y: 4 }
                ],
                tileBonusPreset: [
                    // Star pattern - all attack power
                    { y: 0, x: 3, type: BONUS_TYPE.ATTACK },
                    { y: 0, x: 4, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 1, type: BONUS_TYPE.ATTACK },
                    { y: 2, x: 3, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 4, type: BONUS_TYPE.MONEY },
                    { y: 2, x: 6, type: BONUS_TYPE.ATTACK },
                    { y: 4, x: 3, type: BONUS_TYPE.ATTACK },
                    { y: 4, x: 4, type: BONUS_TYPE.ATTACK }
                ]
            },
        ],
        bgImage: `${gameImages}/backgrounds/mission5.png`
    }
];
