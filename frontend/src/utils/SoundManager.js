/**
 * SoundManager - Utility for managing game sounds
 * 
 * This module handles sound preloading and playback for the game.
 * Sound files should be placed in the /public/sounds directory.
 */

class SoundManager {
  constructor() {
    this.sounds = {};
    this.muted = false;
    this.volume = 0.5; // Default volume
    
    // Load sounds from localStorage settings if available
    this.loadSettings();
  }

  loadSettings() {
    try {
      const soundSettings = localStorage.getItem('soundSettings');
      if (soundSettings) {
        const { muted, volume } = JSON.parse(soundSettings);
        this.muted = muted ?? false;
        this.volume = volume ?? 0.5;
      }
    } catch (error) {
      console.error('Error loading sound settings:', error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('soundSettings', JSON.stringify({
        muted: this.muted,
        volume: this.volume
      }));
    } catch (error) {
      console.error('Error saving sound settings:', error);
    }
  }

  /**
   * Preload a sound file
   * @param {string} name - Name to reference the sound by
   * @param {string} url - Path to the sound file
   */
  preload(name, url) {
    if (this.sounds[name]) {
      return;
    }
    
    const audio = new Audio(url);
    audio.volume = this.volume;
    this.sounds[name] = audio;
    
    // Preload by forcing a load
    audio.load();
  }

  /**
   * Preload multiple sounds
   * @param {Object} soundMap - Object mapping sound names to URLs
   */
  preloadAll(soundMap) {
    Object.entries(soundMap).forEach(([name, url]) => {
      this.preload(name, url);
    });
  }

  /**
   * Play a sound by name
   * @param {string} name - Name of the sound to play
   */
  play(name) {
    if (this.muted || !this.sounds[name]) {
      return;
    }
    
    try {
      // Stop and reset the sound before playing
      const sound = this.sounds[name];
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.error(`Error playing sound ${name}:`, error);
      });
    } catch (error) {
      console.error(`Error playing sound ${name}:`, error);
    }
  }

  /**
   * Set the global volume for all sounds
   * @param {number} volume - Volume level (0 to 1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Apply to all loaded sounds
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
    
    this.saveSettings();
  }

  /**
   * Mute or unmute all sounds
   * @param {boolean} muted - Whether sounds should be muted
   */
  setMuted(muted) {
    this.muted = muted;
    this.saveSettings();
  }

  /**
   * Toggle mute state
   * @returns {boolean} - New mute state
   */
  toggleMute() {
    this.muted = !this.muted;
    this.saveSettings();
    return this.muted;
  }
}

// Create a singleton instance
const soundManager = new SoundManager();

// Preload common sounds for mines game
soundManager.preloadAll({
  'gem1': '/sounds/gem1.mp3',
  'gem2': '/sounds/gem2.mp3',
  'gem3': '/sounds/gem3.mp3',
  'gem4': '/sounds/gem4.mp3',
  'gem5': '/sounds/gem5.mp3',
  'explosion': '/sounds/explosion.mp3',
  'cashout': '/sounds/cashout.mp3',
  'gameStart': '/sounds/game-start.mp3'
});

export default soundManager; 