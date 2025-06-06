// Splash screen preloader for Android
// This script runs in the splash screen and loads resources

(function() {
    'use strict';

    // Simple progress reporter
    function reportProgress(percent, message) {
        window.dispatchEvent(new CustomEvent('resource-load-progress', {
            detail: {
                percent: percent,
                message: message,
                isComplete: percent >= 100
            }
        }));
    }

    // Preload images
    function preloadImages() {
        return new Promise((resolve, reject) => {
            const imagePaths = [
                // Units
                'images/units/human/infantry.png',
                'images/units/human/heavy-infantry.png',
                'images/units/human/sniper.png',
                'images/units/human/anti-tank-gun.png',
                'images/units/human/mg-nest.png',
                'images/units/human/bunker.png',
                'images/units/human/armored-car.png',
                'images/units/human/light-tank.png',
                'images/units/human/medium-tank.png',
                'images/units/human/heavy-tank.png',
                'images/units/human/heavy-artillery.png',
                // Unit info cards
                'images/units/human/infantry-info.png',
                'images/units/human/heavy-infantry-info.png',
                'images/units/human/sniper-info.png',
                'images/units/human/anti-tank-gun-info.png',
                'images/units/human/mg-nest-info.png',
                'images/units/human/bunker-info.png',
                'images/units/human/armored-car-info.png',
                'images/units/human/light-tank-info.png',
                'images/units/human/medium-tank-info.png',
                'images/units/human/heavy-tank-info.png',
                'images/units/human/heavy-artillery-info.png',
                // NPC units
                'images/units/npc/infantry.png',
                'images/units/npc/heavy-infantry.png',
                'images/units/npc/sniper.png',
                'images/units/npc/anti-tank-gun.png',
                'images/units/npc/mg-nest.png',
                'images/units/npc/bunker.png',
                'images/units/npc/armored-car.png',
                'images/units/npc/light-tank.png',
                'images/units/npc/medium-tank.png',
                'images/units/npc/heavy-tank.png',
                'images/units/npc/heavy-artillery.png',
                // Backgrounds
                'images/backgrounds/mission1.png',
                'images/backgrounds/mission2.png',
                'images/backgrounds/mission3.png',
                'images/backgrounds/mission4.png',
                'images/backgrounds/mission5.png',
                // UI
                'images/ui/main-background.jpg',
                'images/ui/modal-overlay-bg.jpg',
                'images/ui/modal-window-bg.jpg',
                'images/ui/skull.png',
                'images/ui/stopwatch.png',
                'images/ui/flag/green.png',
                'images/ui/flag/red.png',
                'images/ui/flag/white.png',
                // Bonus icons
                'images/bonus/attack.png',
                'images/bonus/armor.png',
                'images/bonus/money.png',
                // Logo
                'images/logo.png',
                'images/icon.png'
            ];

            let loadedCount = 0;
            const totalImages = imagePaths.length;
            const images = [];

            function loadImage(src) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        loadedCount++;
                        const percent = 10 + (loadedCount / totalImages) * 40; // Images are 10-50% of progress
                        reportProgress(percent, `Loading images... (${loadedCount}/${totalImages})`);
                        resolve(img);
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load image: ${src}`);
                        loadedCount++;
                        const percent = 10 + (loadedCount / totalImages) * 40;
                        reportProgress(percent, `Loading images... (${loadedCount}/${totalImages})`);
                        resolve(null); // Continue even if an image fails
                    };
                    img.src = src;
                });
            }

            reportProgress(10, 'Loading game images...');

            // Load all images
            Promise.all(imagePaths.map(loadImage))
                .then(() => {
                    reportProgress(50, 'Images loaded successfully');
                    resolve();
                })
                .catch(reject);
        });
    }

    // Preload audio files
    function preloadAudio() {
        return new Promise((resolve) => {
            const audioPaths = [
                // Music
                'music/menu_theme.mp3',
                'music/battle_theme_1.mp3',
                'music/battle_theme_2.mp3',
                'music/battle_theme_3.mp3',
                'music/battle_theme_4.mp3',
                // Sound effects
                'sounds/ui/button_click.mp3',
                'sounds/ui/unit_select.mp3',
                'sounds/ui/unit_place.mp3',
                'sounds/ui/victory.mp3',
                'sounds/ui/defeat.mp3',
                'sounds/weapons/infantry_rifle.mp3',
                'sounds/weapons/heavy_infantry.mp3',
                'sounds/weapons/sniper_rifle.mp3',
                'sounds/weapons/tank_cannon.mp3',
                'sounds/weapons/light_tank.mp3',
                'sounds/weapons/autocannon.mp3',
                'sounds/weapons/artillery.mp3',
                'sounds/impacts/hit_vehicle.mp3',
                'sounds/impacts/ricochet.mp3',
                'sounds/explosions/medium.mp3',
                'sounds/explosions/large.mp3'
            ];

            let loadedCount = 0;
            const totalAudio = audioPaths.length;

            function loadAudio(src) {
                return new Promise((resolve) => {
                    const audio = new Audio();
                    
                    const onLoad = () => {
                        loadedCount++;
                        const percent = 50 + (loadedCount / totalAudio) * 30; // Audio is 50-80% of progress
                        reportProgress(percent, `Loading audio... (${loadedCount}/${totalAudio})`);
                        resolve();
                    };

                    audio.addEventListener('canplaythrough', onLoad, { once: true });
                    audio.addEventListener('error', () => {
                        console.warn(`Failed to load audio: ${src}`);
                        onLoad(); // Continue even if audio fails
                    });

                    audio.src = src;
                    audio.load(); // Start loading
                });
            }

            reportProgress(55, 'Loading audio resources...');

            // Load all audio files
            Promise.all(audioPaths.map(loadAudio))
                .then(() => {
                    reportProgress(80, 'Audio loaded successfully');
                    resolve();
                })
                .catch(resolve); // Continue even if audio loading fails
        });
    }

    // Main preload function
    async function preloadResources() {
        try {
            reportProgress(5, 'Initializing preloader...');
            
            // Small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 300));

            // Load images
            await preloadImages();

            // Load audio
            await preloadAudio();

            // Final initialization
            reportProgress(85, 'Finalizing game setup...');
            await new Promise(resolve => setTimeout(resolve, 500));

            // Complete
            reportProgress(100, 'All resources loaded');

        } catch (error) {
            console.error('Error during preloading:', error);
            reportProgress(0, 'Error loading resources. Please restart the game.');
        }
    }

    // Start preloading when device is ready
    if (window.cordova) {
        document.addEventListener('deviceready', preloadResources, false);
    } else {
        // For testing in browser
        preloadResources();
    }
})();