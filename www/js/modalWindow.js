import { modalWindowWidth, modalWindowHeight, missionsConfig, uiBackgrounds } from './gameConfig.js';
import { pauseGameLoop, resumeGameLoop, stopGameLoop, isGameRunning, setDifficulty, getCurrentDifficulty, resetField } from './gameState.js';
import { isMissionUnlocked, loadProgress, getHighestMission, getHighestLevel, startMissionLevel, getCurrentMission, resetMissionState } from './missionManager.js';
import { UI, injectKeyframes, loadFonts } from './ui-design-system.js';
import { audioManager } from './audioManager.js';
import { startQuickGame, getHighScores, formatHighScore, isQuickGameActive, resetQuickGameState } from './quickGameManager.js';
import { quickGameConfig } from './quickGameConfig.js';
import { exitApp } from './cordovaInit.js';

let modalWindow = null;
let modalOverlay = null;
let menuContainer = null;
const MenuStates = {
    MAIN: 'main',
    DIFFICULTY: 'difficulty',
    SETTINGS: 'settings',
    MISSIONS: 'missions',
    LEVELS: 'levels',
    QUICK_GAME: 'quickgame'
};

const difficultyStyles = {
    easy: {
        background: 'linear-gradient(to bottom, #4fabaf, #3d8c8e)',
        hoverBackground: 'linear-gradient(to bottom, #5fbbc0, #489499)',
        glow: 'rgba(79, 171, 175, 0.5)'
    },
    normal: {
        background: 'linear-gradient(to bottom, #af7a4f, #8c633d)',
        hoverBackground: 'linear-gradient(to bottom, #c08c5a, #9d7048)',
        glow: 'rgba(175, 122, 79, 0.5)'
    },
    hard: {
        background: 'linear-gradient(to bottom, #af4f4f, #8c3d3d)',
        hoverBackground: 'linear-gradient(to bottom, #c05a5a, #9d4848)',
        glow: 'rgba(175, 79, 79, 0.5)'
    }
};

let currentMenuState = MenuStates.MAIN;
let currentMissionId = 1; // Currently selected mission ID - initialized to 1 (first mission)
let currentLevelId = 1;

let resultModalWindow = null;
let resultOverlay = null;

// Initialize UI Design System
loadFonts();
injectKeyframes();

// Function to create enhanced buttons
function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
        ${UI.components.button.primary}
        width: 240px;
        height: 46px;
        margin: 10px auto;
        font-size: ${UI.sizes.textLarge};
        letter-spacing: 1px;
        position: relative;
        overflow: hidden;
    `;

    // Add glowing effect on hover
    button.addEventListener('mouseover', () => {
        button.style.cssText += UI.components.button.primaryHover;
        button.style.animation = UI.animation.pulse;
    });

    button.addEventListener('mouseout', () => {
        button.style.cssText = `
            ${UI.components.button.primary}
            width: 240px;
            height: 46px;
            margin: 10px auto;
            font-size: ${UI.sizes.textLarge};
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
        `;
        button.style.animation = '';
    });

    // Add click effect
    button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.98)';
    });

    button.addEventListener('mouseup', () => {
        button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', () => {
        audioManager.playSound('button_click');
        onClick();
    });

    return button;
}

// Create a basic "Back" button
function createBackButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
        ${UI.components.button.secondary}
        padding: 8px 20px;
        position: absolute;
        top: 80px;
        left: 10px;
        font-size: ${UI.sizes.textNormal};
        z-index: 10;
    `;

    button.addEventListener('mouseover', () => {
        button.style.cssText += UI.components.button.secondaryHover;
        button.style.position = 'absolute';
        button.style.top = '80px';
        button.style.left = '10px';
        button.style.zIndex = '10';
    });

    button.addEventListener('mouseout', () => {
        button.style.cssText = `
            ${UI.components.button.secondary}
            padding: 8px 20px;
            position: absolute;
            top: 80px;
            left: 10px;
            font-size: ${UI.sizes.textNormal};
            z-index: 10;
        `;
    });

    button.addEventListener('click', () => {
        audioManager.playSound('button_click');
        onClick();
    });

    return button;
}

// Function to create a difficulty level button
function createDifficultyButton(text, difficulty, onClick, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;

    const style = difficultyStyles[difficulty.toLowerCase()];

    // Basic button styles
    let buttonStyle = `
        display: block;
        width: 240px;
        height: 46px;
        margin: 10px auto;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: ${UI.sizes.textLarge};
        font-family: ${UI.fonts.primary};
        font-weight: 600;
        letter-spacing: 1px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        background: ${style.background};
    `;

    // Add styles for active button
    if (isActive) {
        buttonStyle += `
            border: 2px dashed ${style.glow};
            box-shadow: 0 0 20px ${style.glow};
            transform: scale(1.05);
        `;

        // Add "CURRENT" marker to button text
        button.textContent = `${text} ✓`;
    }

    button.style.cssText = buttonStyle;

    button.addEventListener('mouseover', () => {
        button.style.background = style.hoverBackground;
        button.style.boxShadow = `0 0 15px ${style.glow}`;
        if (!isActive) {
            button.style.transform = 'scale(1.05)';
        } else {
            button.style.transform = 'scale(1.08)';
        }
    });

    button.addEventListener('mouseout', () => {
        button.style.background = style.background;
        if (isActive) {
            button.style.boxShadow = `0 0 20px ${style.glow}`;
            button.style.transform = 'scale(1.05)';
        } else {
            button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
            button.style.transform = 'scale(1)';
        }
    });

    // Effects for pressing
    button.addEventListener('mousedown', () => {
        if (isActive) {
            button.style.transform = 'scale(1.03)';
        } else {
            button.style.transform = 'scale(0.98)';
        }
    });

    button.addEventListener('mouseup', () => {
        if (isActive) {
            button.style.transform = 'scale(1.05)';
        } else {
            button.style.transform = 'scale(1.05)';
        }
    });

    button.addEventListener('click', () => {
        audioManager.playSound('button_click');
        onClick();
    });

    return button;
}

// Create a mission card element
function createMissionCard(mission, isUnlocked) {
    // Make sure the image is loaded before creating card
    const img = new Image();
    img.src = mission.bgImage;

    const missionCard = document.createElement('div');
    missionCard.className = 'mission-card';
    missionCard.style.cssText = `
        width: 450px;
        height: 250px;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: ${isUnlocked ? UI.shadows.panel : '0 4px 8px rgba(0,0,0,0.2)'};
        position: relative;
        cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
        opacity: ${isUnlocked ? '1' : '0.5'};
        transition: transform 0.3s, box-shadow 0.3s;
        border: 2px solid ${isUnlocked ? UI.colors.primary : 'rgba(50, 166, 61, 0.3)'};
    `;

    // Background image
    const bgImage = document.createElement('div');
    bgImage.style.cssText = `
        width: 100%;
        height: 100%;
        background-image: url(${mission.bgImage});
        background-size: cover;
        background-position: center;
    `;

    // Add vignette for better contrast
    const vignette = document.createElement('div');
    vignette.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(
            circle,
            transparent 50%,
            rgba(0, 0, 0, 0.6) 150%
        );
    `;

    // Mission name
    const missionName = document.createElement('div');
    missionName.textContent = mission.name.toUpperCase();
    missionName.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        padding: 10px;
        background-color: rgba(0,0,0,0.7);
        color: ${UI.colors.primaryGlow};
        text-align: center;
        font-weight: bold;
        font-family: ${UI.fonts.heading};
        font-size: ${UI.sizes.headingMedium};
        text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
        letter-spacing: 1px;
    `;

    // Mission description (hidden by default)
    const missionDesc = document.createElement('div');
        missionDesc.textContent = mission.desc || "Complete mission objectives to advance the campaign.";
        missionDesc.style.cssText = `
        position: absolute;
        bottom: -100px; /* Start hidden below the card */
        left: 0;
        width: 100%;
        padding: 15px;
        background-color: rgba(0,0,0,0.8);
        color: white;
        text-align: center;
        font-family: ${UI.fonts.primary};
        transition: bottom 0.3s ease-in-out;
        box-sizing: border-box;
        overflow-wrap: break-word;
        word-wrap: break-word;
        hyphens: auto;
        line-height: 1.4;
    `;

    if (isUnlocked) {
        missionCard.addEventListener('mouseover', () => {
            missionCard.style.transform = 'scale(1.05)';
            missionCard.style.boxShadow = UI.shadows.panelIntense;
            missionDesc.style.bottom = '0'; // Slide up to show
        });

        missionCard.addEventListener('mouseout', () => {
            missionCard.style.transform = 'scale(1)';
            missionCard.style.boxShadow = UI.shadows.panel;
            missionDesc.style.bottom = '-100px'; // Slide down to hide
        });

        missionCard.addEventListener('click', async () => {
            // Set current level to the highest unlocked level for this mission
            const highestLevel = await getHighestLevel(mission.id);
            currentLevelId = Math.max(1, highestLevel);
            showLevelsMenu(mission.id);
        });
    }

    // Lock icon for locked missions
    if (!isUnlocked) {
        const lockIcon = document.createElement('div');
        lockIcon.innerHTML = '🔒';
        lockIcon.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 40px;
            color: white;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
        `;
        missionCard.appendChild(lockIcon);
    }

    missionCard.appendChild(bgImage);
    missionCard.appendChild(vignette);
    missionCard.appendChild(missionName);
    missionCard.appendChild(missionDesc);

    return missionCard;
}

// Create a level card element
function createLevelCard(mission, level, isUnlocked) {
    // Make sure the image is loaded before creating card
    const img = new Image();
    img.src = mission.bgImage;

    const levelCard = document.createElement('div');
    levelCard.className = 'level-card';
    levelCard.style.cssText = `
        width: 450px;
        height: 250px;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: ${isUnlocked ? UI.shadows.panel : '0 4px 8px rgba(0,0,0,0.2)'};
        position: relative;
        cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
        opacity: ${isUnlocked ? '1' : '0.5'};
        transition: transform 0.3s, box-shadow 0.3s;
        border: 2px solid ${isUnlocked ? UI.colors.primary : 'rgba(50, 166, 61, 0.3)'};
    `;

    // Background image (using mission background)
    const bgImage = document.createElement('div');
    bgImage.style.cssText = `
        width: 100%;
        height: 100%;
        background-image: url(${mission.bgImage});
        background-size: cover;
        background-position: center;
    `;

    // Add vignette for better contrast
    const vignette = document.createElement('div');
    vignette.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(
            circle,
            transparent 50%,
            rgba(0, 0, 0, 0.6) 150%
        );
    `;

    // Level name
    const levelName = document.createElement('div');
    levelName.textContent = level.name.toUpperCase();
    levelName.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        padding: 10px;
        background-color: rgba(0,0,0,0.7);
        color: ${UI.colors.primaryGlow};
        text-align: center;
        font-weight: bold;
        font-family: ${UI.fonts.heading};
        font-size: ${UI.sizes.headingMedium};
        text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
        letter-spacing: 1px;
    `;

    const levelDesc = document.createElement('div');
        levelDesc.textContent = level.desc;
        levelDesc.style.cssText = `
        position: absolute;
        bottom: -100px; /* Start hidden below the card */
        left: 0;
        width: 100%;
        padding: 15px;
        background-color: rgba(0,0,0,0.8);
        color: white;
        text-align: center;
        font-family: ${UI.fonts.primary};
        transition: bottom 0.3s ease-in-out;
        box-sizing: border-box;
        overflow-wrap: break-word;
        word-wrap: break-word;
        hyphens: auto;
        line-height: 1.4;
    `;

    if (isUnlocked) {
        levelCard.addEventListener('mouseover', () => {
            levelCard.style.transform = 'scale(1.05)';
            levelCard.style.boxShadow = UI.shadows.panelIntense;
            levelDesc.style.bottom = '0'; // Slide up to show
        });

        levelCard.addEventListener('mouseout', () => {
            levelCard.style.transform = 'scale(1)';
            levelCard.style.boxShadow = UI.shadows.panel;
            levelDesc.style.bottom = '-100px'; // Slide down to hide
        });

        levelCard.addEventListener('click', () => {
            hideModalWindow();
            startMissionLevel(mission.id, level.id);
        });
    }

    // Lock icon for locked levels
    if (!isUnlocked) {
        const lockIcon = document.createElement('div');
        lockIcon.innerHTML = '🔒';
        lockIcon.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 40px;
            color: white;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
        `;
        levelCard.appendChild(lockIcon);
    }

    levelCard.appendChild(bgImage);
    levelCard.appendChild(vignette);
    levelCard.appendChild(levelName);
    levelCard.appendChild(levelDesc);

    return levelCard;
}

// Shows the appropriate menu based on game state
function showMainMenu() {
    if (isGameRunning || isQuickGameActive()) {
        showInGameMenu();
    } else {
        showStartMenu();
    }
}

// Shows the main menu when no game is running
function showStartMenu() {
    currentMenuState = MenuStates.MAIN;
    clearMenuContainer();

    // Add menu header
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 10px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'WAR DECK';
    title.style.cssText = `
        color: ${UI.colors.primaryGlow};
        font-size: ${UI.sizes.displaySmall};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
        margin: 15px auto 5px auto;
    `;

    const subtitle = document.createElement('div');
    subtitle.textContent = 'TACTICAL WARFARE SIMULATION';
    subtitle.style.cssText = `
        color: ${UI.colors.textSecondary};
        font-size: ${UI.sizes.textSmall};
        font-family: ${UI.fonts.primary};
        letter-spacing: 3px;
        margin-top: 5px;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);
    titleContainer.appendChild(subtitle);
    menuContainer.appendChild(titleContainer);

    // Quick Game button
    const playButton = createButton('QUICK GAME', () => {
        showQuickGameMenu();
    });

    // Campaign button
    const missionsButton = createButton('CAMPAIGN', () => {
        showMissionsMenu();
    });

    // Difficulty button
    const difficultyButton = createButton('DIFFICULTY', () => {
        showDifficultyMenu();
    });

    // Settings button
    const settingsButton = createButton('SETTINGS', () => {
        showSettingsMenu();
    });

    // Exit button
    const exitButton = createButton('EXIT', () => {
        // Confirm before exiting
        showCustomConfirm(
            'Are you sure you want to exit the game?',
            () => {
                // Use Cordova exit if available, otherwise fallback
                exitApp();
            },
            null, // onCancel callback (null means just close)
            'EXIT',
            'CANCEL'
        );
    });

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
    `;

    buttonsContainer.appendChild(playButton);
    buttonsContainer.appendChild(missionsButton);
    buttonsContainer.appendChild(difficultyButton);
    buttonsContainer.appendChild(settingsButton);
    buttonsContainer.appendChild(exitButton);

    menuContainer.appendChild(buttonsContainer);
}

// Shows the in-game menu when a game is running
function showInGameMenu() {
    currentMenuState = MenuStates.MAIN;
    clearMenuContainer();

    // Add menu header
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 10px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'GAME PAUSED';
    title.style.cssText = `
        color: ${UI.colors.primaryGlow};
        font-size: ${UI.sizes.displaySmall};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
        margin: 15px auto 5px auto;
    `;

    const subtitle = document.createElement('div');
    subtitle.textContent = 'TACTICAL WARFARE SIMULATION';
    subtitle.style.cssText = `
        color: ${UI.colors.textSecondary};
        font-size: ${UI.sizes.textSmall};
        font-family: ${UI.fonts.primary};
        letter-spacing: 3px;
        margin-top: 5px;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);
    titleContainer.appendChild(subtitle);
    menuContainer.appendChild(titleContainer);

    // Continue button
    const continueButton = createButton('CONTINUE', () => {
        hideModalWindow();
    });

    // Settings button
    const settingsButton = createButton('SETTINGS', () => {
        showSettingsMenu();
    });

    // Main Menu button
    const mainMenuButton = createButton('MAIN MENU', () => {
        // Confirm before returning to main menu as the current game will be lost
        showCustomConfirm(
            'Exit to Main Menu? Your current game progress will be lost.',
            () => {
                // Properly stop game loop and reset state
                if (isGameRunning) {
                    stopGameLoop(); // This will set isGameRunning to false
                    resetMissionState();
                }
                if (isQuickGameActive()) {
                    stopGameLoop(); // This will set isGameRunning to false
                    resetQuickGameState();
                }

                // Reset the field to clear all units
                resetField();

                // Show start menu
                showStartMenu();
            },
            null, // onCancel callback (null means just close)
            'QUIT',
            'CANCEL'
        );
    });

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
    `;

    buttonsContainer.appendChild(continueButton);
    buttonsContainer.appendChild(settingsButton);
    buttonsContainer.appendChild(mainMenuButton);

    menuContainer.appendChild(buttonsContainer);

    // Add decorative element at the bottom of the menu
    const bottomDecor = document.createElement('div');
    bottomDecor.style.cssText = `
        margin-top: 10px;
        font-family: ${UI.fonts.monospace};
        font-size: 12px;
        color: rgba(50, 166, 61, 0.7);
        text-align: center;
        letter-spacing: 1px;
    `;
    bottomDecor.innerHTML = '// GAME PAUSED //';
    menuContainer.appendChild(bottomDecor);
}

function showDifficultyMenu() {
    currentMenuState = MenuStates.DIFFICULTY;
    clearMenuContainer();

    const currentDifficultyLevel = getCurrentDifficulty();

    // Menu header
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 10px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'DIFFICULTY LEVEL';
    title.style.cssText = `
        color: ${UI.colors.primaryGlow};
        font-size: ${UI.sizes.headingLarge};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
        margin: 15px auto;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);
    menuContainer.appendChild(titleContainer);

    const backButton = createBackButton('< BACK', () => {
        if (isGameRunning || isQuickGameActive()) {
            showInGameMenu();
        } else {
            showStartMenu();
        }
    });
    menuContainer.appendChild(backButton);

    const difficultyContainer = document.createElement('div');
    difficultyContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
    `;

    const easyButton = createDifficultyButton('EASY', 'easy', async () => {
        await setDifficulty('easy');
        showMainMenu();
    }, currentDifficultyLevel === 'easy');

    const normalButton = createDifficultyButton('NORMAL', 'normal', async () => {
        await setDifficulty('normal');
        showMainMenu();
    }, currentDifficultyLevel === 'normal');

    const hardButton = createDifficultyButton('HARD', 'hard', async () => {
        await setDifficulty('hard');
        showMainMenu();
    }, currentDifficultyLevel === 'hard');

    difficultyContainer.appendChild(easyButton);
    difficultyContainer.appendChild(normalButton);
    difficultyContainer.appendChild(hardButton);

    menuContainer.appendChild(difficultyContainer);
}

function showSettingsMenu() {
    currentMenuState = MenuStates.SETTINGS;
    clearMenuContainer();

    // Menu header
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 5px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'SETTINGS';
    title.style.cssText = `
        color: ${UI.colors.primaryGlow};
        font-size: ${UI.sizes.headingLarge};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
        margin: 10px auto;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);
    menuContainer.appendChild(titleContainer);

    const backButton = createBackButton('< BACK', () => {
        if (isGameRunning || isQuickGameActive()) {
            showInGameMenu();
        } else {
            showStartMenu();
        }
    });
    menuContainer.appendChild(backButton);

    // Add container for sound settings
    const soundContainer = document.createElement('div');
    soundContainer.style.cssText = `
        width: 80%;
        margin: 0 auto 5px auto;
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        border: 1px solid rgba(50, 166, 61, 0.3);
    `;

    // Header for sounds
    const soundLabel = document.createElement('div');
    soundLabel.textContent = 'SOUND EFFECTS';
    soundLabel.style.cssText = `
        margin-bottom: 10px;
        color: ${UI.colors.textSecondary};
        font-family: ${UI.fonts.primary};
        font-size: ${UI.sizes.textNormal};
        letter-spacing: 1px;
    `;

    // Sound volume controls
    const soundControls = document.createElement('div');
    soundControls.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    `;

    const soundSlider = document.createElement('input');
    soundSlider.type = 'range';
    soundSlider.min = '0';
    soundSlider.max = '100';
    soundSlider.value = audioManager.soundVolume * 100;
    soundSlider.style.cssText = `
        width: 80%;
        height: 5px;
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(to right, ${UI.colors.primary}, ${UI.colors.primaryGlow});
        outline: none;
        border-radius: 5px;
    `;

    const soundValue = document.createElement('div');
    soundValue.textContent = `${Math.round(audioManager.soundVolume * 100)}%`;
    soundValue.style.cssText = `
        width: 15%;
        color: ${UI.colors.textPrimary};
        font-family: ${UI.fonts.monospace};
        font-size: ${UI.sizes.textNormal};
        text-align: center;
        padding: 5px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
        border: 1px solid rgba(50, 166, 61, 0.3);
    `;

    // Update sound volume value
    soundSlider.addEventListener('input', async () => {
        const value = parseInt(soundSlider.value) / 100;
        await audioManager.setSoundVolume(value);
        soundValue.textContent = `${soundSlider.value}%`;

        // Play a short sound as an example
        if (parseInt(soundSlider.value) % 10 === 0) {
            audioManager.playSound('unit_select', value);
        }
    });

    // Add sound toggle on/off
    const soundToggleContainer = document.createElement('div');
    soundToggleContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 5px;
    `;

    const soundToggleCheckbox = document.createElement('input');
    soundToggleCheckbox.type = 'checkbox';
    soundToggleCheckbox.id = 'soundToggle';
    soundToggleCheckbox.checked = audioManager.soundEnabled;
    soundToggleCheckbox.style.cssText = `
        margin-right: 8px;
    `;

    const soundToggleLabel = document.createElement('label');
    soundToggleLabel.htmlFor = 'soundToggle';
    soundToggleLabel.textContent = 'Enable Sound Effects';
    soundToggleLabel.style.cssText = `
        color: ${UI.colors.textSecondary};
        font-family: ${UI.fonts.primary};
        font-size: ${UI.sizes.textSmall};
    `;

    soundToggleCheckbox.addEventListener('change', async () => {
        const enabled = await audioManager.toggleSound();
        soundToggleCheckbox.checked = enabled;

        // Play sound when enabled
        if (enabled) {
            audioManager.playSound('button_click');
        }
    });

    soundToggleContainer.appendChild(soundToggleCheckbox);
    soundToggleContainer.appendChild(soundToggleLabel);

    // Add all elements to the sound container
    soundControls.appendChild(soundSlider);
    soundControls.appendChild(soundValue);
    soundContainer.appendChild(soundLabel);
    soundContainer.appendChild(soundControls);
    soundContainer.appendChild(soundToggleContainer);

    // Add container for music settings
    const musicContainer = document.createElement('div');
    musicContainer.style.cssText = `
        width: 80%;
        margin: 0 auto;
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        border: 1px solid rgba(50, 166, 61, 0.3);
    `;

    // Header for music
    const musicLabel = document.createElement('div');
    musicLabel.textContent = 'MUSIC';
    musicLabel.style.cssText = `
        margin-bottom: 10px;
        color: ${UI.colors.textSecondary};
        font-family: ${UI.fonts.primary};
        font-size: ${UI.sizes.textNormal};
        letter-spacing: 1px;
    `;

    // Music volume controls
    const musicControls = document.createElement('div');
    musicControls.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    `;

    const musicSlider = document.createElement('input');
    musicSlider.type = 'range';
    musicSlider.min = '0';
    musicSlider.max = '100';
    musicSlider.value = audioManager.musicVolume * 100;
    musicSlider.style.cssText = `
        width: 80%;
        height: 5px;
        -webkit-appearance: none;
        appearance: none;
        background: linear-gradient(to right, ${UI.colors.primary}, ${UI.colors.primaryGlow});
        outline: none;
        border-radius: 5px;
    `;

    const musicValue = document.createElement('div');
    musicValue.textContent = `${Math.round(audioManager.musicVolume * 100)}%`;
    musicValue.style.cssText = `
        width: 15%;
        color: ${UI.colors.textPrimary};
        font-family: ${UI.fonts.monospace};
        font-size: ${UI.sizes.textNormal};
        text-align: center;
        padding: 5px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
        border: 1px solid rgba(50, 166, 61, 0.3);
    `;

    // Update music volume value
    musicSlider.addEventListener('input', async () => {
        const value = parseInt(musicSlider.value) / 100;
        await audioManager.setMusicVolume(value);
        musicValue.textContent = `${musicSlider.value}%`;
    });

    // Add music toggle on/off
    const musicToggleContainer = document.createElement('div');
    musicToggleContainer.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 5px;
    `;

    const musicToggleCheckbox = document.createElement('input');
    musicToggleCheckbox.type = 'checkbox';
    musicToggleCheckbox.id = 'musicToggle';
    musicToggleCheckbox.checked = audioManager.musicEnabled;
    musicToggleCheckbox.style.cssText = `
        margin-right: 8px;
    `;

    const musicToggleLabel = document.createElement('label');
    musicToggleLabel.htmlFor = 'musicToggle';
    musicToggleLabel.textContent = 'Enable Music';
    musicToggleLabel.style.cssText = `
        color: ${UI.colors.textSecondary};
        font-family: ${UI.fonts.primary};
        font-size: ${UI.sizes.textSmall};
    `;

    musicToggleCheckbox.addEventListener('change', async () => {
        const enabled = await audioManager.toggleMusic();
        musicToggleCheckbox.checked = enabled;

        if (enabled) {
            audioManager.playSound('button_click');
        }
    });

    musicToggleContainer.appendChild(musicToggleCheckbox);
    musicToggleContainer.appendChild(musicToggleLabel);

    // Add all elements to the music container
    musicControls.appendChild(musicSlider);
    musicControls.appendChild(musicValue);
    musicContainer.appendChild(musicLabel);
    musicContainer.appendChild(musicControls);
    musicContainer.appendChild(musicToggleContainer);

    // Add containers to the settings page
    menuContainer.appendChild(soundContainer);
    menuContainer.appendChild(musicContainer);
}

// Preload mission images to prevent layout issues
function preloadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

// Show missions selection menu
async function showMissionsMenu(preserveCurrentMission = false) {
    currentMenuState = MenuStates.MISSIONS;
    clearMenuContainer();

    const progress = await loadProgress();

    // Only auto-set to the highest mission if not preserving current selection
    if (!preserveCurrentMission) {
        const highestMission = await getHighestMission();
        currentMissionId = Math.min(highestMission, missionsConfig.length);
    }

    // Preload the current mission image before doing anything else
    if (currentMissionId > 0 && currentMissionId <= missionsConfig.length) {
        const mission = missionsConfig.find(m => m.id === currentMissionId);
        if (mission) {
            await preloadImage(mission.bgImage);
        }
    }

    // Menu header
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 10px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'CAMPAIGN';
    title.style.cssText = `
        color: ${UI.colors.primaryGlow};
        font-size: ${UI.sizes.headingLarge};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
        margin: 15px auto;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);
    menuContainer.appendChild(titleContainer);

    // Back button
    const backButton = createBackButton('< BACK', showMainMenu);
    menuContainer.appendChild(backButton);

    // Mission selection container
    const missionsContainer = document.createElement('div');
    missionsContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        position: relative;
        height: 260px;
        margin-top: 10px;
    `;

    // Left arrow
    const leftArrow = document.createElement('div');
    leftArrow.innerHTML = '&#10094;';
    leftArrow.style.cssText = `
        font-size: 40px;
        cursor: pointer;
        color: ${UI.colors.primary};
        font-weight: bold;
        text-shadow: 0 0 10px rgba(50, 166, 61, 0.5);
        transition: transform 0.2s, color 0.2s;
    `;
    leftArrow.addEventListener('mouseover', () => {
        leftArrow.style.color = UI.colors.primaryGlow;
        leftArrow.style.transform = 'scale(1.1)';
    });
    leftArrow.addEventListener('mouseout', () => {
        leftArrow.style.color = UI.colors.primary;
        leftArrow.style.transform = 'scale(1)';
    });
    leftArrow.addEventListener('click', () => {
        // Show previous mission
        if (currentMissionId > 1) {
            currentMissionId--;
            showMissionsMenu(true); // Preserve current mission
            audioManager.playSound('button_click');
        }
    });

    // Right arrow
    const rightArrow = document.createElement('div');
    rightArrow.innerHTML = '&#10095;';
    rightArrow.style.cssText = `
        font-size: 40px;
        cursor: pointer;
        color: ${UI.colors.primary};
        font-weight: bold;
        text-shadow: 0 0 10px rgba(50, 166, 61, 0.5);
        transition: transform 0.2s, color 0.2s;
    `;
    rightArrow.addEventListener('mouseover', () => {
        rightArrow.style.color = UI.colors.primaryGlow;
        rightArrow.style.transform = 'scale(1.1)';
    });
    rightArrow.addEventListener('mouseout', () => {
        rightArrow.style.color = UI.colors.primary;
        rightArrow.style.transform = 'scale(1)';
    });
    rightArrow.addEventListener('click', () => {
        // Show next mission
        if (currentMissionId < missionsConfig.length) {
            currentMissionId++;
            showMissionsMenu(true); // Preserve current mission
            audioManager.playSound('button_click');
        }
    });

    // Disable arrows if at the edge
    if (currentMissionId === 1) {
        leftArrow.style.opacity = '0.3';
        leftArrow.style.cursor = 'not-allowed';
        leftArrow.style.textShadow = 'none';
    }
    if (currentMissionId === missionsConfig.length) {
        rightArrow.style.opacity = '0.3';
        rightArrow.style.cursor = 'not-allowed';
        rightArrow.style.textShadow = 'none';
    }

    // Current mission card
    const mission = missionsConfig.find(m => m.id === currentMissionId);
    if (mission) {
        const isUnlocked = await isMissionUnlocked(mission.id);
        const missionCard = createMissionCard(mission, isUnlocked);

        missionsContainer.appendChild(leftArrow);
        missionsContainer.appendChild(missionCard);
        missionsContainer.appendChild(rightArrow);
    } else {
        // No mission found with the specified ID
        // Fallback - create a message indicating missing mission
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Mission data not available';
        errorMessage.style.cssText = `
            color: ${UI.colors.textPrimary};
            background-color: rgba(0, 0, 0, 0.7);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid ${UI.colors.primary};
        `;
        missionsContainer.appendChild(errorMessage);
    }

    menuContainer.appendChild(missionsContainer);

    // Mission indicators (dots)
    const dotsContainer = document.createElement('div');
    dotsContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
    `;

    for (let i = 1; i <= missionsConfig.length; i++) {
        const dot = document.createElement('div');
        dot.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${i === currentMissionId ? UI.colors.primaryGlow : UI.colors.primary};
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: ${i === currentMissionId ? UI.shadows.text : 'none'};
        `;

        dot.addEventListener('mouseover', () => {
            if (i !== currentMissionId) {
                dot.style.transform = 'scale(1.2)';
                dot.style.backgroundColor = 'rgba(0, 255, 65, 0.7)';
            }
        });

        dot.addEventListener('mouseout', () => {
            if (i !== currentMissionId) {
                dot.style.transform = 'scale(1)';
                dot.style.backgroundColor = UI.colors.primary;
            }
        });

        dot.addEventListener('click', () => {
            currentMissionId = i;
            showMissionsMenu(true); // Preserve current mission
            audioManager.playSound('button_click');
        });

        dotsContainer.appendChild(dot);
    }

    menuContainer.appendChild(dotsContainer);

    // Add progress information
    const progressInfo = document.createElement('div');
    progressInfo.style.cssText = `
        position: absolute;
        bottom: 15px;
        right: 15px;
        font-family: ${UI.fonts.monospace};
        font-size: 12px;
        color: ${UI.colors.textSecondary};
    `;

    // Safely handle progress information
    let completedMissions = 0;
    if (progress && progress.missionProgress) {
        completedMissions = Object.values(progress.missionProgress)
            .filter(m => m && m.completed)
            .length;
    }

    progressInfo.textContent = `Campaign progress: ${completedMissions}/${missionsConfig.length}`;
    menuContainer.appendChild(progressInfo);
}

// Show levels selection menu for a specific mission
async function showLevelsMenu(missionId, preserveCurrentLevel = false) {
    currentMenuState = MenuStates.LEVELS;
    clearMenuContainer();

    // Preload mission background image first to prevent layout jumps
    const mission = missionsConfig.find(m => m.id === missionId);
    if (mission) {
        await preloadImage(mission.bgImage);
    }

    const highestLevel = await getHighestLevel(missionId);

    // Only auto-set to the highest level if not preserving current selection
    if (!preserveCurrentLevel) {
        currentLevelId = Math.max(1, highestLevel);
    }

    // Menu header with mission name
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 10px;
    `;

    const title = document.createElement('h1');
    title.textContent = mission ? mission.name.toUpperCase() : 'MISSION';
    title.style.cssText = `
        color: ${UI.colors.primaryGlow};
        font-size: ${UI.sizes.headingLarge};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
        margin: 15px auto;
    `;

    const subtitle = document.createElement('div');
    subtitle.textContent = 'SELECT LEVEL';
    subtitle.style.cssText = `
        color: ${UI.colors.textSecondary};
        font-size: ${UI.sizes.textSmall};
        font-family: ${UI.fonts.primary};
        letter-spacing: 3px;
        margin-top: 5px;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);
    titleContainer.appendChild(subtitle);
    menuContainer.appendChild(titleContainer);

    // Back button
    const backButton = createBackButton('< BACK', () => showMissionsMenu(true)); // Preserve current mission
    menuContainer.appendChild(backButton);

    if (!mission) return;

    // Levels container
    const levelsContainer = document.createElement('div');
    levelsContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        position: relative;
        height: 260px;
        margin-top: 10px;
    `;

    // Left arrow
    const leftArrow = document.createElement('div');
    leftArrow.innerHTML = '&#10094;';
    leftArrow.style.cssText = `
        font-size: 40px;
        cursor: pointer;
        color: ${UI.colors.primary};
        font-weight: bold;
        text-shadow: 0 0 10px rgba(50, 166, 61, 0.5);
        transition: transform 0.2s, color 0.2s;
    `;
    leftArrow.addEventListener('mouseover', () => {
        leftArrow.style.color = UI.colors.primaryGlow;
        leftArrow.style.transform = 'scale(1.1)';
    });
    leftArrow.addEventListener('mouseout', () => {
        leftArrow.style.color = UI.colors.primary;
        leftArrow.style.transform = 'scale(1)';
    });
    leftArrow.addEventListener('click', () => {
        // Show previous level
        if (currentLevelId > 1) {
            currentLevelId--;
            showLevelsMenu(missionId, true); // Preserve current level
            audioManager.playSound('button_click');
        }
    });

    // Right arrow
    const rightArrow = document.createElement('div');
    rightArrow.innerHTML = '&#10095;';
    rightArrow.style.cssText = `
        font-size: 40px;
        cursor: pointer;
        color: ${UI.colors.primary};
        font-weight: bold;
        text-shadow: 0 0 10px rgba(50, 166, 61, 0.5);
        transition: transform 0.2s, color 0.2s;
    `;
    rightArrow.addEventListener('mouseover', () => {
        rightArrow.style.color = UI.colors.primaryGlow;
        rightArrow.style.transform = 'scale(1.1)';
    });
    rightArrow.addEventListener('mouseout', () => {
        rightArrow.style.color = UI.colors.primary;
        rightArrow.style.transform = 'scale(1)';
    });
    rightArrow.addEventListener('click', () => {
        // Show next level
        if (currentLevelId < mission.levels.length) {
            currentLevelId++;
            showLevelsMenu(missionId, true); // Preserve current level
            audioManager.playSound('button_click');
        }
    });

    // Disable arrows if at the edge
    if (currentLevelId === 1) {
        leftArrow.style.opacity = '0.3';
        leftArrow.style.cursor = 'not-allowed';
        leftArrow.style.textShadow = 'none';
    }
    if (currentLevelId === mission.levels.length) {
        rightArrow.style.opacity = '0.3';
        rightArrow.style.cursor = 'not-allowed';
        rightArrow.style.textShadow = 'none';
    }

    // Current level card
    const level = mission.levels.find(l => l.id === currentLevelId);
    if (level) {
        const isUnlocked = level.id <= highestLevel;
        const levelCard = createLevelCard(mission, level, isUnlocked);

        levelsContainer.appendChild(leftArrow);
        levelsContainer.appendChild(levelCard);
        levelsContainer.appendChild(rightArrow);
    } else {
        // No level found with the specified ID
        // Fallback - create a message indicating missing level
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Level data not available';
        errorMessage.style.cssText = `
            color: ${UI.colors.textPrimary};
            background-color: rgba(0, 0, 0, 0.7);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid ${UI.colors.primary};
        `;
        levelsContainer.appendChild(errorMessage);
    }

    menuContainer.appendChild(levelsContainer);

    // Level indicators (dots)
    const dotsContainer = document.createElement('div');
    dotsContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
    `;

    for (let i = 1; i <= mission.levels.length; i++) {
        const dot = document.createElement('div');
        dot.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${i === currentLevelId ? UI.colors.primaryGlow : UI.colors.primary};
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: ${i === currentLevelId ? UI.shadows.text : 'none'};
        `;

        dot.addEventListener('mouseover', () => {
            if (i !== currentLevelId) {
                dot.style.transform = 'scale(1.2)';
                dot.style.backgroundColor = 'rgba(0, 255, 65, 0.7)';
            }
        });

        dot.addEventListener('mouseout', () => {
            if (i !== currentLevelId) {
                dot.style.transform = 'scale(1)';
                dot.style.backgroundColor = UI.colors.primary;
            }
        });

        dot.addEventListener('click', () => {
            currentLevelId = i;
            showLevelsMenu(missionId, true); // Preserve current level
            audioManager.playSound('button_click');
        });

        dotsContainer.appendChild(dot);
    }

    menuContainer.appendChild(dotsContainer);
}

function clearMenuContainer() {
    if (menuContainer) {
        menuContainer.innerHTML = '';
    }
}

export function createModalWindow() {
    modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        background: ${window.loadedImages && window.loadedImages.uiBackgrounds && window.loadedImages.uiBackgrounds.modalOverlay 
            ? `url(${uiBackgrounds.modalOverlay}) no-repeat center/cover` 
            : UI.colors.overlay};
        backdrop-filter: blur(3px);
        display: none;
        z-index: ${UI.zIndex.overlay};
    `;

    modalWindow = document.createElement('div');
    modalWindow.style.cssText = `
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: ${modalWindowWidth}px;
        height: ${modalWindowHeight}px;
        background: ${window.loadedImages && window.loadedImages.uiBackgrounds && window.loadedImages.uiBackgrounds.modalWindow 
            ? `url(${uiBackgrounds.modalWindow}) no-repeat center/cover` 
            : 'linear-gradient(to bottom, rgba(30, 38, 44, 0.95), rgba(20, 28, 34, 0.95))'};
        border: ${UI.borders.normal};
        border-radius: ${UI.borders.panelRadius};
        display: none;
        z-index: ${UI.zIndex.modal};
        padding: 20px;
        box-sizing: border-box;
        box-shadow: ${UI.shadows.panel};
    `;

    // Add decorative elements to create a "technical" look
    const topDecoration = document.createElement('div');
    topDecoration.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
    `;

    const bottomDecoration = document.createElement('div');
    bottomDecoration.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
    `;

    // Corner decorative elements
    const cornerSize = 15;
    const corners = [
        { top: 0, left: 0 },
        { top: 0, right: 0 },
        { bottom: 0, left: 0 },
        { bottom: 0, right: 0 }
    ];

    corners.forEach(pos => {
        const corner = document.createElement('div');
        const posStyle = Object.entries(pos)
            .map(([key, value]) => `${key}: ${value}px;`)
            .join(' ');

        // Determine a corner type for correct border radius and style
        let borderStyle, borderRadius;

        if (pos.top === 0 && pos.left === 0) {
            // Top left corner
            borderStyle = '2px 0 0 2px';
            borderRadius = '10px 0 0 0';
        } else if (pos.top === 0 && pos.right === 0) {
            // Top right corner
            borderStyle = '2px 2px 0 0';
            borderRadius = '0 10px 0 0';
        } else if (pos.bottom === 0 && pos.left === 0) {
            // Bottom left corner
            borderStyle = '0 0 2px 2px';
            borderRadius = '0 0 0 10px';
        } else {
            // Bottom right corner
            borderStyle = '0 2px 2px 0';
            borderRadius = '0 0 10px 0';
        }

        corner.style.cssText = `
        position: absolute;
        ${posStyle}
        width: ${cornerSize}px;
        height: ${cornerSize}px;
        border-color: ${UI.colors.primary};
        border-style: solid;
        border-width: ${borderStyle};
        border-radius: ${borderRadius};
    `;

        modalWindow.appendChild(corner);
    });

    modalWindow.appendChild(topDecoration);
    modalWindow.appendChild(bottomDecoration);

    menuContainer = document.createElement('div');
    menuContainer.style.cssText = `
        width: 100%;
        height: 100%;
        overflow: auto;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    `;

    modalWindow.appendChild(menuContainer);
    document.body.appendChild(modalOverlay);
    document.body.appendChild(modalWindow);

    modalWindow.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    showMainMenu();
}

export function showModalWindow() {
    if (modalWindow && modalOverlay) {
        modalOverlay.style.display = 'block';
        modalWindow.style.display = 'block';

        modalOverlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        // Stop the game loop and timer without changing isGameRunning
        pauseGameLoop();

        // Update keyboard handler visibility state
        if (window.keyboardHandlers) {
            window.keyboardHandlers.setModalVisible(true);
        }

        // Show appropriate menu based on game state
        showMainMenu();
    }
}

export function hideModalWindow() {
    if (modalWindow && modalOverlay) {
        modalOverlay.style.display = 'none';
        modalWindow.style.display = 'none';

        // Update keyboard handler visibility state
        if (window.keyboardHandlers) {
            window.keyboardHandlers.setModalVisible(false);
        }

        // If the game was running, resume the game loop
        if (isGameRunning) {
            resumeGameLoop();
        }
    }
}

// Function to display a styled modal window with the game result
export function showGameResultModal(isSuccess, message, isFromQuickGame = false) {
    audioManager.playSound(isSuccess ? 'victory' : 'defeat');

    // Create overlay and window if they don't exist yet
    if (!resultModalWindow) {
        resultOverlay = document.createElement('div');
        resultOverlay.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            background: ${window.loadedImages && window.loadedImages.uiBackgrounds && window.loadedImages.uiBackgrounds.modalOverlay 
                ? `url(${uiBackgrounds.modalOverlay}) no-repeat center/cover` 
                : UI.colors.overlay};
            backdrop-filter: blur(3px);
            display: none;
            z-index: ${UI.zIndex.overlay + 2};
        `;

        resultModalWindow = document.createElement('div');
        resultModalWindow.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: ${modalWindowWidth * 0.9}px;
            height: ${modalWindowHeight * 0.7}px;
            background: ${window.loadedImages && window.loadedImages.uiBackgrounds && window.loadedImages.uiBackgrounds.resultWindow 
                ? `url(${uiBackgrounds.resultWindow}) no-repeat center/cover` 
                : 'linear-gradient(to bottom, rgba(30, 38, 44, 0.95), rgba(20, 28, 34, 0.95))'};
            border: ${UI.borders.normal};
            border-radius: ${UI.borders.panelRadius};
            display: none;
            z-index: ${UI.zIndex.modal + 2};
            padding: 20px;
            box-sizing: border-box;
            box-shadow: ${UI.shadows.panel};
        `;

        // Add decorative elements to create a "technical" look
        const topDecoration = document.createElement('div');
        topDecoration.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(to right, 
                rgba(50, 166, 61, 0), 
                rgba(50, 166, 61, 1), 
                rgba(50, 166, 61, 0));
        `;

        const bottomDecoration = document.createElement('div');
        bottomDecoration.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(to right, 
                rgba(50, 166, 61, 0), 
                rgba(50, 166, 61, 1), 
                rgba(50, 166, 61, 0));
        `;

        // Corner decorative elements
        const cornerSize = 15;
        const corners = [
            { top: 0, left: 0 },
            { top: 0, right: 0 },
            { bottom: 0, left: 0 },
            { bottom: 0, right: 0 }
        ];

        corners.forEach(pos => {
            const corner = document.createElement('div');
            const posStyle = Object.entries(pos)
                .map(([key, value]) => `${key}: ${value}px;`)
                .join(' ');

            // Determine a corner type for correct border radius and style
            let borderStyle, borderRadius;

            if (pos.top === 0 && pos.left === 0) {
                // Top left corner
                borderStyle = '2px 0 0 2px';
                borderRadius = '10px 0 0 0';
            } else if (pos.top === 0 && pos.right === 0) {
                // Top right corner
                borderStyle = '2px 2px 0 0';
                borderRadius = '0 10px 0 0';
            } else if (pos.bottom === 0 && pos.left === 0) {
                // Bottom left corner
                borderStyle = '0 0 2px 2px';
                borderRadius = '0 0 0 10px';
            } else {
                // Bottom right corner
                borderStyle = '0 2px 2px 0';
                borderRadius = '0 0 10px 0';
            }

            corner.style.cssText = `
                position: absolute;
                ${posStyle}
                width: ${cornerSize}px;
                height: ${cornerSize}px;
                border-color: ${isSuccess ? UI.colors.primary : UI.colors.secondary};
                border-style: solid;
                border-width: ${borderStyle};
                border-radius: ${borderRadius};
            `;

            resultModalWindow.appendChild(corner);
        });

        resultModalWindow.appendChild(topDecoration);
        resultModalWindow.appendChild(bottomDecoration);

        document.body.appendChild(resultOverlay);
        document.body.appendChild(resultModalWindow);
    }

    // Clear window content
    resultModalWindow.innerHTML = '';

    // Recreate decorative elements after clearing content
    const topDecoration = document.createElement('div');
    topDecoration.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(to right, 
            ${isSuccess ? 'rgba(50, 166, 61, 0), rgba(50, 166, 61, 1), rgba(50, 166, 61, 0)'
        : 'rgba(191, 50, 50, 0), rgba(191, 50, 50, 1), rgba(191, 50, 50, 0)'});
    `;

    const bottomDecoration = document.createElement('div');
    bottomDecoration.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(to right, 
            ${isSuccess ? 'rgba(50, 166, 61, 0), rgba(50, 166, 61, 1), rgba(50, 166, 61, 0)'
        : 'rgba(191, 50, 50, 0), rgba(191, 50, 50, 1), rgba(191, 50, 50, 0)'});
    `;

    // Update window border based on result
    resultModalWindow.style.border = isSuccess
        ? `2px solid ${UI.colors.primary}`
        : `2px solid ${UI.colors.secondary}`;

    // Update shadow based on result
    resultModalWindow.style.boxShadow = isSuccess
        ? UI.shadows.panel
        : UI.shadows.redGlow;

    // Corner decorative elements
    const cornerSize = 15;
    const corners = [
        { top: 0, left: 0 },
        { top: 0, right: 0 },
        { bottom: 0, left: 0 },
        { bottom: 0, right: 0 }
    ];

    corners.forEach(pos => {
        const corner = document.createElement('div');
        const posStyle = Object.entries(pos)
            .map(([key, value]) => `${key}: ${value}px;`)
            .join(' ');

        // Determine a corner type for correct border radius and style
        let borderStyle, borderRadius;

        if (pos.top === 0 && pos.left === 0) {
            // Top left corner
            borderStyle = '2px 0 0 2px';
            borderRadius = '10px 0 0 0';
        } else if (pos.top === 0 && pos.right === 0) {
            // Top right corner
            borderStyle = '2px 2px 0 0';
            borderRadius = '0 10px 0 0';
        } else if (pos.bottom === 0 && pos.left === 0) {
            // Bottom left corner
            borderStyle = '0 0 2px 2px';
            borderRadius = '0 0 0 10px';
        } else {
            // Bottom right corner
            borderStyle = '0 2px 2px 0';
            borderRadius = '0 0 10px 0';
        }

        corner.style.cssText = `
            position: absolute;
            ${posStyle}
            width: ${cornerSize}px;
            height: ${cornerSize}px;
            border-color: ${isSuccess ? UI.colors.primary : UI.colors.secondary};
            border-style: solid;
            border-width: ${borderStyle};
            border-radius: ${borderRadius};
        `;

        resultModalWindow.appendChild(corner);
    });

    resultModalWindow.appendChild(topDecoration);
    resultModalWindow.appendChild(bottomDecoration);

    // Create container for content
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        width: 100%;
        height: 100%;
        overflow: auto;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    `;

    // Create header with improved style
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 8px;
    `;

    const title = document.createElement('h1');
    title.textContent = isSuccess ? 'VICTORY' : 'DEFEAT';
    title.style.cssText = `
        color: ${isSuccess ? UI.colors.primaryGlow : UI.colors.secondaryGlow};
        font-size: ${UI.sizes.displaySmall};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px ${isSuccess ? 'rgba(0, 255, 65, 0.6)' : 'rgba(255, 50, 50, 0.6)'};
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            ${isSuccess
        ? 'rgba(50, 166, 61, 0), rgba(50, 166, 61, 1), rgba(50, 166, 61, 0)'
        : 'rgba(191, 50, 50, 0), rgba(191, 50, 50, 1), rgba(191, 50, 50, 0)'});
        margin: 15px auto 5px auto;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);

    // Create container for message
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
        padding: 20px;
        margin: 10px 0;
        text-align: center;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        border: 1px solid ${isSuccess ? 'rgba(50, 166, 61, 0.3)' : 'rgba(191, 50, 50, 0.3)'};
        width: 80%;
    `;

    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageText.style.cssText = `
        color: ${UI.colors.textPrimary};
        font-size: ${UI.sizes.textLarge};
        font-family: ${UI.fonts.primary};
        text-align: center;
        margin: 0;
        line-height: 1.5;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    `;

    messageContainer.appendChild(messageText);

    // Create "OK" button with improved style
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        margin-top: 20px;
    `;

    const okButton = document.createElement('button');
    okButton.textContent = 'CONTINUE';

    // Basic styles for button with explicitly specified dimensions
    const successButtonStyle = `
        ${UI.components.button.primary}
        width: 200px;
        height: 46px;
        font-size: ${UI.sizes.textLarge};
        letter-spacing: 1px;
    `;

    const failureButtonStyle = `
        background: linear-gradient(to bottom, ${UI.colors.secondary}, ${UI.colors.secondaryDark});
        color: white;
        border: none;
        border-radius: 5px;
        padding: 8px 16px;
        font-family: ${UI.fonts.primary};
        font-weight: 600;
        font-size: ${UI.sizes.textLarge};
        letter-spacing: 1px;
        width: 200px;
        height: 46px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
    `;

    // Apply appropriate styles
    okButton.style.cssText = isSuccess ? successButtonStyle : failureButtonStyle;

    // Add hover effects to button
    okButton.addEventListener('mouseover', () => {
        if (isSuccess) {
            okButton.style.cssText = successButtonStyle + UI.components.button.primaryHover;
            okButton.style.transform = 'scale(1.05)';
        } else {
            okButton.style.cssText = failureButtonStyle;
            okButton.style.background = `linear-gradient(to bottom, ${UI.colors.secondaryLight}, ${UI.colors.secondary})`;
            okButton.style.boxShadow = '0 0 15px rgba(255, 50, 50, 0.5)';
            okButton.style.transform = 'scale(1.05)';
        }
    });

    okButton.addEventListener('mouseout', () => {
        if (isSuccess) {
            okButton.style.cssText = successButtonStyle;
        } else {
            okButton.style.cssText = failureButtonStyle;
        }
        okButton.style.transform = 'scale(1)';
    });

    // Add click effects to button
    okButton.addEventListener('mousedown', () => {
        okButton.style.transform = 'scale(0.98)';
    });

    okButton.addEventListener('mouseup', () => {
        okButton.style.transform = 'scale(1.05)';
    });

    okButton.addEventListener('click', () => {
        // Stop victory/defeat sound to prevent overlap with menu music
        audioManager.stopAllSounds();

        hideResultModal();
        // Show a menu
        showModalWindow();

        // Check if we're in quick game mode
        if (isFromQuickGame) {
            // For quick game mode, just return to main menu (already shown by showModalWindow)
            return;
        }

        // For campaign mode, handle mission progression
        if (isSuccess) {
            const { missionId, levelId } = getCurrentMission();
            const mission = missionsConfig.find(m => m.id === missionId);
            if (mission) {
                if (levelId < mission.levels.length) {
                    // If there is a next level in current mission
                    currentLevelId = levelId + 1;
                    showLevelsMenu(missionId);
                } else if (missionId < missionsConfig.length) {
                    // If it was the last level, move to the next mission
                    currentMissionId = missionId + 1;
                    currentLevelId = 1;
                    showMissionsMenu();
                }
            }
        } else {
            const { missionId } = getCurrentMission();
            showLevelsMenu(missionId);
        }
    });

    buttonContainer.appendChild(okButton);

    // Add everything to the container
    contentContainer.appendChild(titleContainer);
    contentContainer.appendChild(messageContainer);
    contentContainer.appendChild(buttonContainer);

    // Add container to a modal window
    resultModalWindow.appendChild(contentContainer);

    resultOverlay.style.display = 'block';
    resultModalWindow.style.display = 'block';
}

// Hide result modal window
export function hideResultModal() {
    if (resultModalWindow && resultOverlay) {
        resultOverlay.style.display = 'none';
        resultModalWindow.style.display = 'none';
    }
}

// Function to create a quick game mode card
function createQuickGameCard(mode, config, onClick) {
    // Create card container
    const card = document.createElement('div');
    card.className = 'quick-game-card';
    card.style.cssText = `
        width: 450px;
        height: 250px;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: ${UI.shadows.panel};
        position: relative;
        cursor: pointer;
        transition: transform 0.3s, box-shadow 0.3s;
        border: 2px solid ${UI.colors.primary};
    `;

    // Background image
    const bgImage = document.createElement('div');
    bgImage.style.cssText = `
        width: 100%;
        height: 100%;
        background-image: url(${config.bgImage});
        background-size: cover;
        background-position: center;
    `;

    // Add vignette for better contrast
    const vignette = document.createElement('div');
    vignette.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(
            circle,
            transparent 50%,
            rgba(0, 0, 0, 0.6) 150%
        );
    `;

    // Mode name - at the top
    const modeName = document.createElement('div');
    modeName.textContent = config.name.toUpperCase();
    modeName.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        padding: 10px;
        background-color: rgba(0,0,0,0.7);
        color: ${UI.colors.primaryGlow};
        text-align: center;
        font-weight: bold;
        font-family: ${UI.fonts.heading};
        font-size: ${UI.sizes.headingMedium};
        text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
        letter-spacing: 1px;
    `;

    // Mode description (hidden by default)
    const modeDesc = document.createElement('div');
    modeDesc.textContent = config.desc;
    modeDesc.style.cssText = `
        position: absolute;
        bottom: -100px; /* Start hidden below the card */
        left: 0;
        width: 100%;
        padding: 15px;
        background-color: rgba(0,0,0,0.8);
        color: white;
        text-align: center;
        font-family: ${UI.fonts.primary};
        transition: bottom 0.3s ease-in-out;
        box-sizing: border-box;
        overflow-wrap: break-word;
        word-wrap: break-word;
        hyphens: auto;
        line-height: 1.4;
    `;

    card.addEventListener('mouseover', () => {
        card.style.transform = 'scale(1.05)';
        card.style.boxShadow = UI.shadows.panelIntense;
        modeDesc.style.bottom = '0'; // Slide up to show
    });

    card.addEventListener('mouseout', () => {
        card.style.transform = 'scale(1)';
        card.style.boxShadow = UI.shadows.panel;
        modeDesc.style.bottom = '-100px'; // Slide down to hide
    });

    card.addEventListener('click', () => {
        audioManager.playSound('button_click');
        onClick();
    });

    card.appendChild(bgImage);
    card.appendChild(vignette);
    card.appendChild(modeName);
    card.appendChild(modeDesc);

    return card;
}

// Quick game menu with slider
async function showQuickGameMenu() {
    currentMenuState = MenuStates.QUICK_GAME;
    clearMenuContainer();

    // Current mode index
    let currentModeIndex = 0;
    const modes = [
        { id: 'standard', name: 'Standard' },
        { id: 'survival', name: 'Survival' },
        { id: 'destruction', name: 'Destruction' }
    ];

    // Get current difficulty level
    const currentDifficultyLevel = getCurrentDifficulty();

    // Menu header
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 10px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'QUICK GAME';
    title.style.cssText = `
        color: ${UI.colors.primaryGlow};
        font-size: ${UI.sizes.headingLarge};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
        margin: 15px auto;
    `;

    const subtitle = document.createElement('div');
    subtitle.textContent = 'SELECT GAME MODE';
    subtitle.style.cssText = `
        color: ${UI.colors.textSecondary};
        font-size: ${UI.sizes.textSmall};
        font-family: ${UI.fonts.primary};
        letter-spacing: 3px;
        margin-top: 5px;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);
    titleContainer.appendChild(subtitle);
    menuContainer.appendChild(titleContainer);

    // Back button
    const backButton = createBackButton('< BACK', showMainMenu);
    menuContainer.appendChild(backButton);

    // Mode selection container with slider
    const modeSliderContainer = document.createElement('div');
    modeSliderContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        position: relative;
        height: 260px;
        margin-top: 10px;
    `;

    // Left arrow
    const leftArrow = document.createElement('div');
    leftArrow.innerHTML = '&#10094;';
    leftArrow.style.cssText = `
        font-size: 40px;
        cursor: pointer;
        color: ${UI.colors.primary};
        font-weight: bold;
        text-shadow: 0 0 10px rgba(50, 166, 61, 0.5);
        transition: transform 0.2s, color 0.2s;
    `;
    leftArrow.addEventListener('mouseover', () => {
        leftArrow.style.color = UI.colors.primaryGlow;
        leftArrow.style.transform = 'scale(1.1)';
    });
    leftArrow.addEventListener('mouseout', () => {
        leftArrow.style.color = UI.colors.primary;
        leftArrow.style.transform = 'scale(1)';
    });
    leftArrow.addEventListener('click', () => {
        // Show previous mode
        if (currentModeIndex > 0) {
            currentModeIndex--;
            updateModeDisplay();
            updateDots(); // Update the dots when changing mode
            audioManager.playSound('button_click');
        }
    });

    // Right arrow
    const rightArrow = document.createElement('div');
    rightArrow.innerHTML = '&#10095;';
    rightArrow.style.cssText = `
        font-size: 40px;
        cursor: pointer;
        color: ${UI.colors.primary};
        font-weight: bold;
        text-shadow: 0 0 10px rgba(50, 166, 61, 0.5);
        transition: transform 0.2s, color 0.2s;
    `;
    rightArrow.addEventListener('mouseover', () => {
        rightArrow.style.color = UI.colors.primaryGlow;
        rightArrow.style.transform = 'scale(1.1)';
    });
    rightArrow.addEventListener('mouseout', () => {
        rightArrow.style.color = UI.colors.primary;
        rightArrow.style.transform = 'scale(1)';
    });
    rightArrow.addEventListener('click', () => {
        // Show next mode
        if (currentModeIndex < modes.length - 1) {
            currentModeIndex++;
            updateModeDisplay();
            updateDots(); // Update the dots when changing mode
            audioManager.playSound('button_click');
        }
    });

    // Container for current mode card
    const currentModeContainer = document.createElement('div');
    currentModeContainer.style.cssText = `
        width: 450px;
        height: 250px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    // Function to update the displayed mode
    function updateModeDisplay() {
        // Clear previous content
        currentModeContainer.innerHTML = '';

        // Update arrow states
        if (currentModeIndex === 0) {
            leftArrow.style.opacity = '0.3';
            leftArrow.style.cursor = 'not-allowed';
            leftArrow.style.textShadow = 'none';
        } else {
            leftArrow.style.opacity = '1';
            leftArrow.style.cursor = 'pointer';
            leftArrow.style.textShadow = '0 0 10px rgba(50, 166, 61, 0.5)';
        }

        if (currentModeIndex === modes.length - 1) {
            rightArrow.style.opacity = '0.3';
            rightArrow.style.cursor = 'not-allowed';
            rightArrow.style.textShadow = 'none';
        } else {
            rightArrow.style.opacity = '1';
            rightArrow.style.cursor = 'pointer';
            rightArrow.style.textShadow = '0 0 10px rgba(50, 166, 61, 0.5)';
        }

        // Get current mode config
        const currentMode = modes[currentModeIndex];
        const config = currentMode.id === 'standard' ?
            quickGameConfig[currentDifficultyLevel] :
            quickGameConfig[currentMode.id];

        // Create card for current mode
        const modeCard = createQuickGameCard(currentMode.id, config, () => {
            hideModalWindow();
            startQuickGame(currentMode.id);
        });

        currentModeContainer.appendChild(modeCard);
    }

    // Add elements to the slider container
    modeSliderContainer.appendChild(leftArrow);
    modeSliderContainer.appendChild(currentModeContainer);
    modeSliderContainer.appendChild(rightArrow);

    // Initialize display
    updateModeDisplay();

    menuContainer.appendChild(modeSliderContainer);

    // Mode indicators (dots)
    const dotsContainer = document.createElement('div');
    dotsContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
    `;

    // Function to update dots based on current mode index
    function updateDots() {
        // Clear any existing dots
        dotsContainer.innerHTML = '';

        for (let i = 0; i < modes.length; i++) {
            const dot = document.createElement('div');
            const isActive = i === currentModeIndex;

            dot.style.cssText = `
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: ${isActive ? UI.colors.primaryGlow : UI.colors.primary};
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: ${isActive ? '0 0 10px rgba(0, 255, 65, 0.7)' : 'none'};
                transform: ${isActive ? 'scale(1.05)' : 'scale(1)'};
                opacity: ${isActive ? '1' : '0.7'};
            `;

            dot.addEventListener('mouseover', () => {
                if (!isActive) {
                    dot.style.transform = 'scale(1.2)';
                    dot.style.backgroundColor = 'rgba(0, 255, 65, 0.7)';
                    dot.style.opacity = '0.9';
                    dot.style.boxShadow = '0 0 5px rgba(0, 255, 65, 0.3)';
                }
            });

            dot.addEventListener('mouseout', () => {
                if (!isActive) {
                    dot.style.transform = 'scale(1)';
                    dot.style.backgroundColor = UI.colors.primary;
                    dot.style.opacity = '0.7';
                    dot.style.boxShadow = 'none';
                }
            });

            dot.addEventListener('click', () => {
                if (i !== currentModeIndex) {
                    currentModeIndex = i;
                    updateModeDisplay();
                    updateDots();
                    audioManager.playSound('button_click');
                }
            });

            dotsContainer.appendChild(dot);
        }
    }

    // Initialize dots
    updateDots();

    menuContainer.appendChild(dotsContainer);

    // Create high score container
    const highScoreContainer = document.createElement('div');
    highScoreContainer.id = 'high-score-container';
    highScoreContainer.style.cssText = `
        margin-top: 15px;
        font-family: ${UI.fonts.monospace};
        font-size: 12px;
        color: ${UI.colors.textSecondary};
        text-align: center;
        min-height: 20px;
    `;

    // menuContainer.appendChild(highScoreContainer);

    // Add high scores if available
    const highScores = await getHighScores();

    // Extend updateModeDisplay to also update high scores
    const originalUpdateModeDisplay = updateModeDisplay;
    updateModeDisplay = function() {
        // Call the original function first
        originalUpdateModeDisplay();

        // Then update high scores based on current mode
        if (highScores) {
            // Format scores for current difficulty
            const survivalScore = formatHighScore(highScores.survival[currentDifficultyLevel], 'survival');
            const destructionScore = formatHighScore(highScores.destruction[currentDifficultyLevel], 'destruction');

            const currentMode = modes[currentModeIndex].id;
            if (currentMode === 'survival') {
                highScoreContainer.innerHTML = `
                    Best Survival Time: <span style="color: ${UI.colors.primaryGlow}; text-shadow: 0 0 5px rgba(0, 255, 65, 0.7);">${survivalScore}</span>
                `;
                highScoreContainer.style.opacity = '1';
            } else if (currentMode === 'destruction') {
                highScoreContainer.innerHTML = `
                    Best Destruction Score: <span style="color: ${UI.colors.primaryGlow}; text-shadow: 0 0 5px rgba(0, 255, 65, 0.7);">${destructionScore}</span>
                `;
                highScoreContainer.style.opacity = '1';
            } else {
                highScoreContainer.innerHTML = '';
                highScoreContainer.style.opacity = '0';
            }
        }
    };

    // Initial update for high scores
    updateModeDisplay();
}

// Custom confirmation modal system
let confirmModalWindow = null;
let confirmOverlay = null;

function showCustomConfirm(message, onConfirm, onCancel = null, confirmText = 'YES', cancelText = 'NO') {
    // Create overlay and window if they don't exist yet
    if (!confirmModalWindow) {
        confirmOverlay = document.createElement('div');
        confirmOverlay.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            background: ${window.loadedImages && window.loadedImages.uiBackgrounds && window.loadedImages.uiBackgrounds.modalOverlay 
                ? `url(${uiBackgrounds.modalOverlay}) no-repeat center/cover` 
                : UI.colors.overlay};
            backdrop-filter: blur(3px);
            display: none;
            z-index: ${UI.zIndex.overlay + 5};
        `;

        confirmModalWindow = document.createElement('div');
        confirmModalWindow.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: ${modalWindowWidth * 0.9}px;
            height: ${modalWindowHeight * 0.7}px;
            background: ${window.loadedImages && window.loadedImages.uiBackgrounds && window.loadedImages.uiBackgrounds.modalWindow 
                ? `url(${uiBackgrounds.modalWindow}) no-repeat center/cover` 
                : 'linear-gradient(to bottom, rgba(30, 38, 44, 0.95), rgba(20, 28, 34, 0.95))'};
            border: ${UI.borders.normal};
            border-radius: ${UI.borders.panelRadius};
            display: none;
            z-index: ${UI.zIndex.modal + 5};
            padding: 20px;
            box-sizing: border-box;
            box-shadow: ${UI.shadows.panel};
        `;

        // Add decorative elements to create a "technical" look
        const topDecoration = document.createElement('div');
        topDecoration.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(to right, 
                rgba(50, 166, 61, 0), 
                rgba(50, 166, 61, 1), 
                rgba(50, 166, 61, 0));
        `;

        const bottomDecoration = document.createElement('div');
        bottomDecoration.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(to right, 
                rgba(50, 166, 61, 0), 
                rgba(50, 166, 61, 1), 
                rgba(50, 166, 61, 0));
        `;

        // Corner decorative elements
        const cornerSize = 15;
        const corners = [
            { top: 0, left: 0 },
            { top: 0, right: 0 },
            { bottom: 0, left: 0 },
            { bottom: 0, right: 0 }
        ];

        corners.forEach(pos => {
            const corner = document.createElement('div');
            const posStyle = Object.entries(pos)
                .map(([key, value]) => `${key}: ${value}px;`)
                .join(' ');

            // Determine a corner type for correct border radius and style
            let borderStyle, borderRadius;

            if (pos.top === 0 && pos.left === 0) {
                // Top left corner
                borderStyle = '2px 0 0 2px';
                borderRadius = '10px 0 0 0';
            } else if (pos.top === 0 && pos.right === 0) {
                // Top right corner
                borderStyle = '2px 2px 0 0';
                borderRadius = '0 10px 0 0';
            } else if (pos.bottom === 0 && pos.left === 0) {
                // Bottom left corner
                borderStyle = '0 0 2px 2px';
                borderRadius = '0 0 0 10px';
            } else {
                // Bottom right corner
                borderStyle = '0 2px 2px 0';
                borderRadius = '0 0 10px 0';
            }

            corner.style.cssText = `
                position: absolute;
                ${posStyle}
                width: ${cornerSize}px;
                height: ${cornerSize}px;
                border-color: ${UI.colors.primary};
                border-style: solid;
                border-width: ${borderStyle};
                border-radius: ${borderRadius};
            `;

            confirmModalWindow.appendChild(corner);
        });

        confirmModalWindow.appendChild(topDecoration);
        confirmModalWindow.appendChild(bottomDecoration);

        document.body.appendChild(confirmOverlay);
        document.body.appendChild(confirmModalWindow);
    }

    // Clear window content
    confirmModalWindow.innerHTML = '';

    // Recreate decorative elements after clearing content
    const topDecoration = document.createElement('div');
    topDecoration.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
    `;

    const bottomDecoration = document.createElement('div');
    bottomDecoration.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
    `;

    // Corner decorative elements
    const cornerSize = 15;
    const corners = [
        { top: 0, left: 0 },
        { top: 0, right: 0 },
        { bottom: 0, left: 0 },
        { bottom: 0, right: 0 }
    ];

    corners.forEach(pos => {
        const corner = document.createElement('div');
        const posStyle = Object.entries(pos)
            .map(([key, value]) => `${key}: ${value}px;`)
            .join(' ');

        // Determine a corner type for correct border radius and style
        let borderStyle, borderRadius;

        if (pos.top === 0 && pos.left === 0) {
            // Top left corner
            borderStyle = '2px 0 0 2px';
            borderRadius = '10px 0 0 0';
        } else if (pos.top === 0 && pos.right === 0) {
            // Top right corner
            borderStyle = '2px 2px 0 0';
            borderRadius = '0 10px 0 0';
        } else if (pos.bottom === 0 && pos.left === 0) {
            // Bottom left corner
            borderStyle = '0 0 2px 2px';
            borderRadius = '0 0 0 10px';
        } else {
            // Bottom right corner
            borderStyle = '0 2px 2px 0';
            borderRadius = '0 0 10px 0';
        }

        corner.style.cssText = `
            position: absolute;
            ${posStyle}
            width: ${cornerSize}px;
            height: ${cornerSize}px;
            border-color: ${UI.colors.primary};
            border-style: solid;
            border-width: ${borderStyle};
            border-radius: ${borderRadius};
        `;

        confirmModalWindow.appendChild(corner);
    });

    confirmModalWindow.appendChild(topDecoration);
    confirmModalWindow.appendChild(bottomDecoration);

    // Create container for content
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        width: 100%;
        height: 100%;
        overflow: auto;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    `;

    // Create header
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = `
        text-align: center;
        margin-bottom: 5px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'CONFIRMATION';
    title.style.cssText = `
        color: ${UI.colors.primaryGlow};
        font-size: ${UI.sizes.headingLarge};
        font-family: ${UI.fonts.heading};
        margin: 0;
        text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
        letter-spacing: 2px;
    `;

    // Add decorative line under the header
    const divider = document.createElement('div');
    divider.style.cssText = `
        width: 80%;
        height: 2px;
        background: linear-gradient(to right, 
            rgba(50, 166, 61, 0), 
            rgba(50, 166, 61, 1), 
            rgba(50, 166, 61, 0));
        margin: 15px auto 5px auto;
    `;

    titleContainer.appendChild(title);
    titleContainer.appendChild(divider);

    // Create container for message
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
        padding: 20px;
        margin: 10px 0;
        text-align: center;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        border: 1px solid rgba(50, 166, 61, 0.3);
        width: 80%;
    `;

    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageText.style.cssText = `
        color: ${UI.colors.textPrimary};
        font-size: ${UI.sizes.textLarge};
        font-family: ${UI.fonts.primary};
        text-align: center;
        margin: 0;
        line-height: 1.5;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    `;

    messageContainer.appendChild(messageText);

    // Create buttons container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        margin-top: 20px;
        display: flex;
        gap: 20px;
        justify-content: center;
    `;

    // Create confirm button
    const confirmButton = document.createElement('button');
    confirmButton.textContent = confirmText;
    confirmButton.style.cssText = `
        ${UI.components.button.primary}
        width: 120px;
        height: 46px;
        font-size: ${UI.sizes.textLarge};
        letter-spacing: 1px;
    `;

    confirmButton.addEventListener('mouseover', () => {
        confirmButton.style.cssText += UI.components.button.primaryHover;
        confirmButton.style.width = '120px';
        confirmButton.style.height = '46px';
    });

    confirmButton.addEventListener('mouseout', () => {
        confirmButton.style.cssText = `
            ${UI.components.button.primary}
            width: 120px;
            height: 46px;
            font-size: ${UI.sizes.textLarge};
            letter-spacing: 1px;
        `;
    });

    confirmButton.addEventListener('click', () => {
        audioManager.playSound('button_click');
        hideCustomConfirm();
        if (onConfirm) onConfirm();
    });

    // Create cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = cancelText;
    cancelButton.style.cssText = `
        ${UI.components.button.secondary}
        width: 120px;
        height: 46px;
        font-size: ${UI.sizes.textLarge};
        letter-spacing: 1px;
    `;

    cancelButton.addEventListener('mouseover', () => {
        cancelButton.style.cssText += UI.components.button.secondaryHover;
        cancelButton.style.width = '120px';
        cancelButton.style.height = '46px';
    });

    cancelButton.addEventListener('mouseout', () => {
        cancelButton.style.cssText = `
            ${UI.components.button.secondary}
            width: 120px;
            height: 46px;
            font-size: ${UI.sizes.textLarge};
            letter-spacing: 1px;
        `;
    });

    cancelButton.addEventListener('click', () => {
        audioManager.playSound('button_click');
        hideCustomConfirm();
        if (onCancel) onCancel();
    });

    buttonContainer.appendChild(confirmButton);
    buttonContainer.appendChild(cancelButton);

    // Add everything to the container
    contentContainer.appendChild(titleContainer);
    contentContainer.appendChild(messageContainer);
    contentContainer.appendChild(buttonContainer);

    // Add container to a modal window
    confirmModalWindow.appendChild(contentContainer);

    // Show the modal
    confirmOverlay.style.display = 'block';
    confirmModalWindow.style.display = 'block';

    // Prevent clicking outside to close (force user to choose)
    confirmOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
}

// Hide custom confirmation modal
export function hideCustomConfirm() {
    if (confirmModalWindow && confirmOverlay) {
        confirmOverlay.style.display = 'none';
        confirmModalWindow.style.display = 'none';
    }
}

/**
 * Check which modal is currently visible
 * @returns {string|null} - 'main', 'result', 'confirm', or null if no modal is visible
 */
export function getVisibleModal() {
    if (confirmModalWindow && confirmModalWindow.style.display === 'block') {
        return 'confirm';
    }
    if (resultModalWindow && resultModalWindow.style.display === 'block') {
        return 'result';
    }
    if (modalWindow && modalWindow.style.display === 'block') {
        return 'main';
    }
    return null;
}

/**
 * Hide the currently visible modal (used for Escape key handling)
 * @returns {boolean} - true if a modal was hidden, false if no modal was visible
 */
export function hideCurrentModal() {
    const visibleModal = getVisibleModal();

    switch (visibleModal) {
        case 'confirm':
            // Don't allow escape on confirmation modals as they usually require explicit choice
            return false;
        case 'result':
            hideResultModal();
            return true;
        case 'main':
            hideModalWindow();
            return true;
        default:
            return false;
    }
}

// Export function for calling from missionManager.js
window.showGameResultModal = showGameResultModal;

// Make modal functions available globally for Cordova events
window.modalModule = {
    showModalWindow,
    hideModalWindow,
    getVisibleModal
};
