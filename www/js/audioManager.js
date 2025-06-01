// audioManager.js
import * as storage from './storageAdapter.js';

// Game settings key for storage
const GAME_SETTINGS_KEY = 'gameSettings';

class AudioManager {
    constructor() {
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.soundVolume = 0.2;
        this.musicVolume = 0.7;
        this.maxConcurrentSounds = 8;
        this.activeSounds = [];

        this.sounds = {};
        this.music = {};
        this.currentMusic = null;
        this.nextMusicTimeout = null;

        // Battle theme playlist
        this.battleThemePlaylist = ['battle_theme_1', 'battle_theme_2', 'battle_theme_3', 'battle_theme_4'];
        this.currentPlaylistIndex = 0;
        this.playlistMode = 'random'; // 'sequential' or 'random'
        this.crossfadeDuration = 1000; // 1 second crossfade
        this.isTransitioning = false; // Prevent overlapping transitions

        // Load saved settings
        this.loadSettings();
    }

    // Initialize and load all audio files
    // Modify the init method in audioManager.js to support progress reporting
    async init() {
        try {
            // Create arrays for all sounds to load
            const soundsToLoad = [
                // Unit weapons sounds
                { id: 'shot_infantry', url: 'sounds/weapons/infantry_rifle.mp3' },
                { id: 'shot_heavy_infantry', url: 'sounds/weapons/heavy_infantry.mp3' },
                { id: 'shot_sniper', url: 'sounds/weapons/sniper_rifle.mp3' },
                { id: 'shot_autocannon', url: 'sounds/weapons/autocannon.mp3' },
                { id: 'shot_light_tank', url: 'sounds/weapons/light_tank.mp3' },
                { id: 'shot_tank', url: 'sounds/weapons/tank_cannon.mp3' },
                { id: 'shot_artillery', url: 'sounds/weapons/artillery.mp3' },

                // Impact/hit effects
                { id: 'ricochet', url: 'sounds/impacts/ricochet.mp3' },

                // Explosions
                { id: 'explosion_small', url: 'sounds/explosions/medium.mp3' },
                { id: 'explosion_medium', url: 'sounds/explosions/medium.mp3' },
                { id: 'explosion_large', url: 'sounds/explosions/large.mp3' },

                // UI sounds
                { id: 'button_click', url: 'sounds/ui/button_click.mp3' },
                { id: 'unit_select', url: 'sounds/ui/unit_select.mp3' },
                { id: 'unit_place', url: 'sounds/ui/unit_place.mp3' },
                { id: 'victory', url: 'sounds/ui/victory.mp3' },
                { id: 'defeat', url: 'sounds/ui/defeat.mp3' }
            ];

            const musicToLoad = [
                { id: 'battle_theme_1', url: 'music/battle_theme_1.mp3' },
                { id: 'battle_theme_2', url: 'music/battle_theme_2.mp3' },
                { id: 'battle_theme_3', url: 'music/battle_theme_3.mp3' },
                { id: 'battle_theme_4', url: 'music/battle_theme_4.mp3' },
                { id: 'menu_theme', url: 'music/menu_theme.mp3' }
                // Add other music tracks here
            ];

            // Total items to load
            const totalItems = soundsToLoad.length + musicToLoad.length;
            let loadedItems = 0;

            // Custom event to report loading progress
            const reportProgress = (itemType) => {
                loadedItems++;
                const percent = (loadedItems / totalItems) * 100;
                // Dispatch a custom event that the preloader can listen for
                const event = new CustomEvent('audio-load-progress', {
                    detail: {
                        percent,
                        message: `Loading ${itemType} (${loadedItems}/${totalItems})`
                    }
                });
                window.dispatchEvent(event);
            };

            // Load all sound effects with progress reporting
            for (const sound of soundsToLoad) {
                await this.loadSound(sound.id, sound.url);
                reportProgress('sound effect');
            }

            // Load all music tracks with progress reporting
            for (const music of musicToLoad) {
                await this.loadMusic(music.id, music.url);
                reportProgress('music track');
            }

            // Preload most frequently used sounds
            this.preloadCommonSounds();

            console.log('All audio assets loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading audio assets:', error);
            return false;
        }
    }

    // Preload most common sounds
    preloadCommonSounds() {
        // const commonSounds = [
        //     'shot_infantry', 'shot_light_tank',
        //     'hit_armor', 'hit_infantry', 'ricochet',
        //     'button_click', 'unit_select', 'unit_place'
        // ];
        const commonSounds = [
            'shot_infantry', 'shot_light_tank',
            'ricochet', 'button_click', 'unit_select', 'unit_place'
        ];

        commonSounds.forEach(id => {
            if (this.sounds[id]) {
                // Create additional copies for frequent sounds
                for (let i = 0; i < 3; i++) {
                    const clone = this.sounds[id].cloneNode();
                    clone.volume = 0;
                    clone.play().catch(() => {});
                    clone.pause();
                    clone.currentTime = 0;
                }
            }
        });
    }

    async loadSound(id, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = url;

            audio.addEventListener('canplaythrough', () => {
                this.sounds[id] = audio;
                resolve();
            }, { once: true });

            audio.addEventListener('error', (error) => {
                console.error(`Error loading sound ${id}: ${error.message}`);
                reject(error);
            });

            // Start loading
            audio.load();
        });
    }

    async loadMusic(id, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = url;
            audio.loop = false; // We'll handle looping manually for track changes

            audio.addEventListener('canplaythrough', () => {
                this.music[id] = audio;
                resolve();
            }, { once: true });

            audio.addEventListener('error', (error) => {
                console.error(`Error loading music ${id}: ${error.message}`);
                reject(error);
            });

            // Start loading
            audio.load();
        });
    }

    // Sound methods
    playSound(id, volume = this.soundVolume) {
        if (!this.soundEnabled) return;

        const sound = this.sounds[id];
        if (!sound) {
            console.warn(`Sound ${id} not found`);
            return;
        }

        // Limit the number of simultaneous sounds
        if (this.activeSounds.length >= this.maxConcurrentSounds) {
            // Remove the oldest sound effect
            const oldestSound = this.activeSounds.shift();
            oldestSound.pause();
            oldestSound.remove();
        }

        // Create a clone for simultaneous playback
        const soundInstance = sound.cloneNode();
        soundInstance.volume = volume;
        soundInstance.play().catch(e => console.warn(`Could not play sound ${id}: ${e.message}`));

        // Add to active sounds
        this.activeSounds.push(soundInstance);

        // Remove from active after completion
        soundInstance.addEventListener('ended', () => {
            const index = this.activeSounds.indexOf(soundInstance);
            if (index !== -1) {
                this.activeSounds.splice(index, 1);
            }
            soundInstance.remove();
        });
    }

    // Updated playWeaponSound function in audioManager.js
    playWeaponSound(unit) {
        if (!unit) return;

        // Now using unitType instead of checking ID
        let soundId;

        if (typeof unit === 'object' && unit.unitType) {
            // If a unit object with unitType is passed, use it directly
            switch (unit.unitType) {
                case 'infantry':
                    soundId = 'shot_infantry';
                    break;
                case 'heavy_infantry':
                    soundId = 'shot_heavy_infantry';
                    break;
                case 'sniper':
                    soundId = 'shot_sniper';
                    break;
                case 'autocannon':
                    soundId = 'shot_autocannon';
                    break;
                case 'light_tank':
                    soundId = 'shot_light_tank';
                    break;
                case 'tank':
                    soundId = 'shot_tank';
                    break;
                case 'artillery':
                    soundId = 'shot_artillery';
                    break;
                default:
                    soundId = 'shot_infantry';
                    break;
            }
        } else {
            // For backward compatibility - if only ID or name is passed
            soundId = 'shot_infantry'; // default value
        }

        this.playSound(soundId);
    }

    // Updated isInfantryUnit function
    isInfantryUnit(unit) {
        if (!unit) return false;

        // Check unitType directly, if it exists
        if (typeof unit === 'object' && unit.unitType) {
            return unit.unitType === 'infantry' ||
                unit.unitType === 'heavy_infantry' ||
                unit.unitType === 'sniper';
        }

        return false;
    }

    // Updated playImpactSound function
    playImpactSound(targetUnit, isCritical = false, penetratedArmor = true) {
        // if (isCritical) {
        //     this.playSound('critical_hit');
        //     return;
        // }

        if (!penetratedArmor) {
            this.playSound('ricochet');
            return;
        }

        // let soundId;
        // if (this.isInfantryUnit(targetUnit)) {
        //     soundId = 'hit_infantry';
        // } else {
        //     soundId = 'hit_vehicle';
        // }

        // this.playSound(soundId);
    }

    // Play explosion sound based on size
    playExplosionSound(size = 'medium') {
        let soundId;
        switch (size) {
            case 'small': soundId = 'explosion_small'; break;
            case 'large':
            case 'huge': soundId = 'explosion_large'; break;
            case 'medium':
            default: soundId = 'explosion_medium'; break;
        }

        this.playSound(soundId);
    }

    // Music methods
    async playMusic(id, fadeInDuration = 1000) {
        if (!this.musicEnabled) return;

        const track = this.music[id];
        if (!track) {
            console.warn(`Music track ${id} not found`);
            return;
        }

        // Fade out current music if playing and wait for it to complete
        if (this.currentMusic) {
            await this.fadeOutCurrentMusic(fadeInDuration);
        }

        // Set up new track
        track.volume = 0;
        track.currentTime = 0;

        try {
            await track.play();
        } catch (e) {
            console.warn(`Could not play music ${id}: ${e.message}`);
            // Retry once after a short delay
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
                await track.play();
            } catch (retryError) {
                console.error(`Failed to play music ${id} after retry: ${retryError.message}`);
                return;
            }
        }

        // Fade in the new track
        this.fadeInTrack(track, this.musicVolume, fadeInDuration);

        // Set as current music
        this.currentMusic = {
            track,
            id
        };

        // Create bound function for this track
        const boundListener = () => this.playNextMusicTrack();

        // Remove any existing listener first
        if (this.musicEndedListener) {
            track.removeEventListener('ended', this.musicEndedListener);
        }

        // Store the listener reference
        this.musicEndedListener = boundListener;

        // Set up ended event for music switching
        track.addEventListener('ended', boundListener);
    }

    // Start battle music playlist with smooth transitions
    async startBattleMusicPlaylist() {
        if (!this.musicEnabled) return;

        // Start with the first track in the playlist
        this.currentPlaylistIndex = 0;
        await this.playMusic(this.battleThemePlaylist[this.currentPlaylistIndex]);
    }

    // Crossfade to the next track
    async crossfadeToTrack(nextTrackId, crossfadeDuration = null) {
        if (!this.musicEnabled) return;

        const duration = crossfadeDuration || this.crossfadeDuration;
        const nextTrack = this.music[nextTrackId];
        if (!nextTrack) {
            console.warn(`Music track ${nextTrackId} not found`);
            return;
        }

        // Clear any existing timeouts
        clearTimeout(this.nextMusicTimeout);

        // Reset the next track completely
        nextTrack.pause();
        nextTrack.currentTime = 0;
        nextTrack.volume = 0;
        nextTrack.playbackRate = 1.0; // Ensure normal playback speed

        // Remove any existing listeners on the next track
        if (this.nextTrackBoundListener) {
            nextTrack.removeEventListener('ended', this.nextTrackBoundListener);
        }

        try {
            await nextTrack.play();
        } catch (e) {
            console.warn(`Could not play music ${nextTrackId}: ${e.message}`);
            return;
        }

        // Store crossfade interval to clean it up if needed
        if (this.activeCrossfadeInterval) {
            clearInterval(this.activeCrossfadeInterval);
        }

        // If there's current music, crossfade
        if (this.currentMusic && this.currentMusic.track) {
            const currentTrack = this.currentMusic.track;
            const startTime = performance.now();

            // Remove listener from current track before crossfade
            if (this.boundPlayNextMusicTrack) {
                currentTrack.removeEventListener('ended', this.boundPlayNextMusicTrack);
            }

            // Crossfade interval
            this.activeCrossfadeInterval = setInterval(() => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Fade out current track
                if (!currentTrack.paused) {
                    currentTrack.volume = Math.max(0, this.musicVolume * (1 - progress));
                }
                // Fade in next track
                nextTrack.volume = Math.min(this.musicVolume, this.musicVolume * progress);

                if (progress >= 1) {
                    clearInterval(this.activeCrossfadeInterval);
                    this.activeCrossfadeInterval = null;
                    currentTrack.pause();
                    currentTrack.currentTime = 0;
                    currentTrack.volume = 0;
                }
            }, 50);
        } else {
            // No current music, just fade in the new track
            this.fadeInTrack(nextTrack, this.musicVolume, duration);
        }

        // Create new bound function for this track
        this.boundPlayNextMusicTrack = () => this.playNextMusicTrack();
        this.nextTrackBoundListener = this.boundPlayNextMusicTrack;

        // Set up ended event for smooth transition
        nextTrack.addEventListener('ended', this.boundPlayNextMusicTrack);

        // Set as current music after setting up the listener
        this.currentMusic = {
            track: nextTrack,
            id: nextTrackId
        };
    }

    fadeInTrack(track, targetVolume, duration) {
        const startTime = performance.now();
        const initialVolume = track.volume;

        const fadeInInterval = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            track.volume = initialVolume + (targetVolume - initialVolume) * progress;

            if (progress >= 1) {
                clearInterval(fadeInInterval);
            }
        }, 50);
    }

    fadeOutCurrentMusic(duration = 1000) {
        if (!this.currentMusic) return Promise.resolve();

        const { track } = this.currentMusic;
        const startTime = performance.now();
        const initialVolume = track.volume;

        return new Promise((resolve) => {
            const fadeOutInterval = setInterval(() => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                track.volume = initialVolume * (1 - progress);

                if (progress >= 1) {
                    track.pause();
                    track.currentTime = 0;
                    clearInterval(fadeOutInterval);
                    resolve();
                }
            }, 50);
        });
    }

    playNextMusicTrack() {
        if (!this.currentMusic) return;

        // Prevent overlapping transitions
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Check if current track is a battle theme
        const isBattleTheme = this.battleThemePlaylist.includes(this.currentMusic.id);

        if (isBattleTheme) {
            let nextTrackId;

            if (this.playlistMode === 'sequential') {
                // Move to next track in sequence
                this.currentPlaylistIndex = (this.currentPlaylistIndex + 1) % this.battleThemePlaylist.length;
                nextTrackId = this.battleThemePlaylist[this.currentPlaylistIndex];
            } else {
                // Random mode - select a different track
                const availableTracks = this.battleThemePlaylist.filter(id => id !== this.currentMusic.id);
                if (availableTracks.length > 0) {
                    nextTrackId = availableTracks[Math.floor(Math.random() * availableTracks.length)];
                    // Update current index for consistency
                    this.currentPlaylistIndex = this.battleThemePlaylist.indexOf(nextTrackId);
                } else {
                    nextTrackId = this.battleThemePlaylist[0];
                    this.currentPlaylistIndex = 0;
                }
            }

            // Start crossfade immediately (no delay for smooth transition)
            clearTimeout(this.nextMusicTimeout);
            this.crossfadeToTrack(nextTrackId).then(() => {
                this.isTransitioning = false;
            }).catch(() => {
                this.isTransitioning = false;
            });
        } else {
            // For non-battle themes (like menu_theme), loop the same track
            if (this.currentMusic.id === 'menu_theme') {
                // Loop the menu theme
                this.isTransitioning = false;
                this.currentMusic.track.currentTime = 0;
                this.currentMusic.track.play().catch(e => {
                    console.warn(`Could not replay menu theme: ${e.message}`);
                });
            } else {
                this.isTransitioning = false;
            }
        }
    }

    stopMusic(fadeOutDuration = 1000) {
        if (this.currentMusic) {
            this.fadeOutCurrentMusic(fadeOutDuration);
            this.currentMusic = null;
        }

        clearTimeout(this.nextMusicTimeout);
    }

    // Stop all active sounds immediately
    stopAllSounds() {
        // Stop and remove all active sound instances
        this.activeSounds.forEach(sound => {
            if (sound && !sound.paused) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
        this.activeSounds = [];
    }

    // Set playlist mode for battle themes
    setPlaylistMode(mode) {
        if (mode === 'sequential' || mode === 'random') {
            this.playlistMode = mode;
        }
    }

    // Set crossfade duration in milliseconds
    setCrossfadeDuration(duration) {
        if (duration > 0 && duration <= 10000) { // Max 10 seconds
            this.crossfadeDuration = duration;
        }
    }

    // Volume control methods
    async setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        await this.saveSettings();
    }

    async setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));

        // Update current music if playing
        if (this.currentMusic && this.currentMusic.track) {
            this.currentMusic.track.volume = this.musicVolume;
        }

        await this.saveSettings();
    }

    async toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        await this.saveSettings();
        return this.soundEnabled;
    }

    async toggleMusic() {
        this.musicEnabled = !this.musicEnabled;

        if (this.musicEnabled) {
            // Resume music if it was playing
            if (this.currentMusic) {
                this.currentMusic.track.play().catch(e => console.warn(e));
                this.fadeInTrack(this.currentMusic.track, this.musicVolume, 1000);
            }
        } else {
            // Pause all music
            if (this.currentMusic) {
                this.fadeOutCurrentMusic(1000);
            }
        }

        await this.saveSettings();
        return this.musicEnabled;
    }

    async toggleMute() {
        const isMuted = !this.soundEnabled || !this.musicEnabled;

        if (isMuted) {
            // Unmute both sound and music
            this.soundEnabled = true;
            this.musicEnabled = true;

            // Resume music if it was playing
            if (this.currentMusic) {
                this.currentMusic.track.play().catch(e => console.warn(e));
                this.fadeInTrack(this.currentMusic.track, this.musicVolume, 1000);
            }
        } else {
            // Mute both sound and music
            this.soundEnabled = false;
            this.musicEnabled = false;

            // Pause all music
            if (this.currentMusic) {
                this.fadeOutCurrentMusic(1000);
            }
        }

        await this.saveSettings();
        return !isMuted;
    }

    // Save audio settings to storage
    async saveSettings() {
        try {
            // Load existing settings or create new settings object
            const settings = await storage.getItem(GAME_SETTINGS_KEY) || {};

            // Update audio settings
            settings.audio = {
                soundEnabled: this.soundEnabled,
                musicEnabled: this.musicEnabled,
                soundVolume: this.soundVolume,
                musicVolume: this.musicVolume
            };

            // Save settings back to store
            await storage.setItem(GAME_SETTINGS_KEY, settings);

            // Fallback to localStorage for compatibility
            const audioSettings = {
                soundEnabled: this.soundEnabled,
                musicEnabled: this.musicEnabled,
                soundVolume: this.soundVolume,
                musicVolume: this.musicVolume
            };
            localStorage.setItem('audio_settings', JSON.stringify(audioSettings));

            return true;
        } catch (error) {
            console.error('Error saving audio settings:', error);
            return false;
        }
    }

    // Load audio settings from storage
    async loadSettings() {
        try {
            // Try to load from storage first
            const settings = await storage.getItem(GAME_SETTINGS_KEY);

            if (settings && settings.audio) {
                // Apply settings from storage
                this.soundEnabled = settings.audio.soundEnabled ?? true;
                this.musicEnabled = settings.audio.musicEnabled ?? true;
                this.soundVolume = settings.audio.soundVolume ?? 0.7;
                this.musicVolume = settings.audio.musicVolume ?? 0.4;
                return;
            }

            // Fallback to localStorage if storage doesn't have audio settings
            const savedSettings = localStorage.getItem('audio_settings');
            if (savedSettings) {
                try {
                    const localSettings = JSON.parse(savedSettings);
                    this.soundEnabled = localSettings.soundEnabled ?? true;
                    this.musicEnabled = localSettings.musicEnabled ?? true;
                    this.soundVolume = localSettings.soundVolume ?? 0.7;
                    this.musicVolume = localSettings.musicVolume ?? 0.4;

                    // Migrate settings to storage
                    this.saveSettings();
                } catch (e) {
                    console.warn('Error parsing localStorage audio settings:', e);
                }
            }
        } catch (error) {
            console.error('Error loading audio settings:', error);
        }
    }

    // Pause all audio (for Cordova app pause)
    pauseAll() {
        // Pause music
        if (this.currentMusic) {
            this.currentMusic.pause();
        }
        
        // Stop all active sounds
        this.activeSounds.forEach(sound => {
            if (sound && !sound.paused) {
                sound.pause();
            }
        });
    }

    // Resume all audio (for Cordova app resume)
    resumeAll() {
        // Resume music if it was playing
        if (this.currentMusic && this.musicEnabled) {
            this.currentMusic.play().catch(error => {
                console.error('Error resuming music:', error);
            });
        }
        
        // Note: We don't resume sound effects as they're typically short
        // and context-specific
    }
}

// Export a singleton instance
export const audioManager = new AudioManager();

// Make it globally available for Cordova events
window.audioManager = audioManager;
