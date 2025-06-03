import { createUnitTypes, missionsConfig, bonusIcons, uiBackgrounds, flagImages } from './gameConfig.js';

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        // Set image rendering properties for high quality
        img.setAttribute('decoding', 'sync');
        img.setAttribute('loading', 'eager');

        img.onload = () => {
            // Force the browser to decode the image immediately
            if (typeof createImageBitmap === 'function') {
                createImageBitmap(img).then(() => {
                    resolve(img);
                }).catch(() => {
                    // Fallback if createImageBitmap fails
                    resolve(img);
                });
            } else {
                resolve(img);
            }
        };
        img.onerror = (e) => {
            console.error(`Failed to load image: ${src}`, e);
            reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
    });
}

export async function loadImages() {
    // Create unit types with the appropriate paths
    const humanUnitTypes = createUnitTypes(true); // Human units
    const npcUnitTypes = createUnitTypes(false);  // NPC units

    // Get all mission background images
    const missionBackgroundUrls = missionsConfig.map(mission => mission.bgImage);

    // Get bonus icon URLs
    const bonusIconUrls = Object.values(bonusIcons);

    // Get UI background URLs
    const uiBackgroundUrls = Object.values(uiBackgrounds);

    // Get flag image URLs
    const flagImageUrls = Object.values(flagImages);

    // Calculate total images to load for progress tracking
    const totalImages =
        humanUnitTypes.length * 2 + // Human unit images + info images
        npcUnitTypes.length +        // NPC unit images
        missionBackgroundUrls.length + // Mission backgrounds
        bonusIconUrls.length +       // Bonus icons
        uiBackgroundUrls.length +    // UI backgrounds
        flagImageUrls.length;        // Flag images

    let loadedImages = 0;

    // Function to report loading progress
    const reportProgress = (imageType) => {
        loadedImages++;
        const percent = (loadedImages / totalImages) * 100;
        // Dispatch a custom event that the preloader can listen for
        const event = new CustomEvent('image-load-progress', {
            detail: {
                percent,
                message: `Loading ${imageType} (${loadedImages}/${totalImages})`
            }
        });
        window.dispatchEvent(event);
    };

    try {
        // Load human unit images with progress tracking
        const humanUnitImages = await Promise.all(
            humanUnitTypes.map(async (unit) => {
                const img = await loadImage(unit.iconUrl);
                reportProgress('human unit');
                return img;
            })
        );

        // Load human unit info images with progress tracking
        const humanUnitInfoImages = await Promise.all(
            humanUnitTypes.map(async (unit) => {
                const img = await loadImage(unit.iconInfoUrl);
                reportProgress('unit info');
                return img;
            })
        );

        // Load NPC unit images with progress tracking
        const npcUnitImages = await Promise.all(
            npcUnitTypes.map(async (unit) => {
                const img = await loadImage(unit.iconUrl);
                reportProgress('NPC unit');
                return img;
            })
        );

        // Load mission backgrounds with progress tracking
        const missionBackgrounds = await Promise.all(
            missionBackgroundUrls.map(async (url) => {
                const img = await loadImage(url);
                reportProgress('mission background');
                return img;
            })
        );

        // Load bonus icon images with progress tracking
        const bonusIconImages = await Promise.all(
            bonusIconUrls.map(async (url) => {
                const img = await loadImage(url);
                reportProgress('bonus icon');
                return img;
            })
        );

        // Load UI background images with progress tracking
        const uiBackgroundImages = await Promise.all(
            uiBackgroundUrls.map(async (url) => {
                const img = await loadImage(url);
                reportProgress('UI background');
                return img;
            })
        );

        // Load flag images with progress tracking
        const flagImagesLoaded = await Promise.all(
            flagImageUrls.map(async (url) => {
                const img = await loadImage(url);
                reportProgress('flag image');
                return img;
            })
        );

        // Create a map of mission backgrounds by mission ID
        const missionBackgroundsMap = {};
        missionsConfig.forEach((mission, index) => {
            missionBackgroundsMap[mission.id] = missionBackgrounds[index];
        });

        // Create a map of bonus icons by type
        const bonusIconsMap = {};
        Object.keys(bonusIcons).forEach((type, index) => {
            bonusIconsMap[type] = bonusIconImages[index];
        });

        // Create a map of UI backgrounds
        const uiBackgroundsMap = {};
        Object.keys(uiBackgrounds).forEach((type, index) => {
            uiBackgroundsMap[type] = uiBackgroundImages[index];
        });

        // Create a map of flag images
        const flagImagesMap = {};
        Object.keys(flagImages).forEach((type, index) => {
            flagImagesMap[type] = flagImagesLoaded[index];
        });

        return {
            humanUnitImages,
            humanUnitInfoImages,
            npcUnitImages,
            missionBackgrounds: missionBackgroundsMap,
            bonusIcons: bonusIconsMap,
            uiBackgrounds: uiBackgroundsMap,
            flagImages: flagImagesMap
        };
    } catch (error) {
        console.error('Error loading images:', error);
        throw error;
    }
}
