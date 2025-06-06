import { audioManager } from './audioManager.js';
import { loadImages } from './imageLoader.js';

// Class responsible for preloading all game resources
export class ResourcePreloader {
    constructor() {
        this.totalResources = 100;
        this.loadedResources = 0;
        this.listeners = [];
        this.isComplete = false;

        // Set up event listeners for specific loaders
        window.addEventListener('image-load-progress', (event) => {
            // Update the progress based on image loading (images are 50% of total)
            const adjustedPercent = 10 + (event.detail.percent * 0.4);
            this.reportProgress(adjustedPercent, event.detail.message);
        });

        window.addEventListener('audio-load-progress', (event) => {
            // Update the progress based on audio loading (audio is 30% of total)
            const adjustedPercent = 50 + (event.detail.percent * 0.3);
            this.reportProgress(adjustedPercent, event.detail.message);
        });
    }

    /**
     * Add a progress listener
     * @param {Function} callback - Function to call with progress updates
     */
    addProgressListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Report progress to all listeners
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} message - Optional status message
     */
    reportProgress(percent, message = null) {
        // Ensure percentage is capped between 0-100
        const clampedPercent = Math.min(100, Math.max(0, percent));

        // Notify all listeners
        this.listeners.forEach(listener => {
            listener({
                percent: clampedPercent,
                message: message,
                isComplete: clampedPercent >= 100
            });
        });

        // Dispatch a custom event for splash screen communication
        window.dispatchEvent(new CustomEvent('resource-load-progress', {
            detail: {
                percent: clampedPercent,
                message: message,
                isComplete: clampedPercent >= 100
            }
        }));
    }

    /**
     * Preload all game resources
     * @returns {Promise} Resolves when all resources are loaded
     */
    async preloadAll() {
        try {
            this.reportProgress(5, "Initializing preloader...");
            await this.wait(300); // Small delay for visual feedback

            // Step 1: Load images (50% of progress)
            this.reportProgress(10, "Loading game images...");
            const images = await loadImages();
            this.reportProgress(50, "Images loaded successfully");

            // Step 2: Initialize audio system (30% of progress)
            this.reportProgress(55, "Loading audio resources...");
            await audioManager.init();
            this.reportProgress(80, "Audio loaded successfully");

            // Step 3: Perform any additional initializations (20% of progress)
            this.reportProgress(85, "Finalizing game setup...");
            await this.wait(500); // Simulated additional loading time

            // Mark preloading as complete
            this.isComplete = true;
            this.reportProgress(100, "All resources loaded");

            // Return loaded resources
            return {
                images: images,
                audioReady: true
            };
        } catch (error) {
            console.error("Error during resource preloading:", error);
            this.reportProgress(0, "Error loading resources. Please restart the game.");
            throw error;
        }
    }

    /**
     * Helper method to create a delay
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Resolves after specified delay
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create and export a singleton instance
export const resourcePreloader = new ResourcePreloader();