/**
 * Main entry point for the battle system
 * Updated with improved shotgun system
 */

import { battle } from './battleManager.js';
import { clearAllProjectiles, startProjectileSystem } from './projectileSystem.js';
import { initializeShotgunSystem } from './shotgunInitializer.js';

// Immediately expose the battle function to window object to ensure it's available
window.battle = battle;

// Add CSS styles for projectiles
function addStyles() {
    // Add projectile styles
    addProjectileStyles();
    
    // Add dodge styles
    addDodgeStyles();
    
    // Add poison styles
    addPoisonStyles();
}

// Add projectile styles
function addProjectileStyles() {
    // Check if styles already exist
    if (document.getElementById('projectile-styles')) {
        return;
    }
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'projectile-styles';
    styleElement.textContent = `
    /* Projectile base style */
    .projectile {
        position: absolute;
        z-index: 1000;
        transform-origin: center;
        pointer-events: none;
    }

    /* Arrow projectile */
    .projectile.arrow {
        width: 12px;
        height: 3px;
        background-color: #6d4c41;
        border-radius: 0 2px 2px 0;
    }

    .projectile.arrow::before {
        content: '';
        position: absolute;
        right: -4px;
        top: -2px;
        width: 0;
        height: 0;
        border-left: 5px solid #6d4c41;
        border-top: 3px solid transparent;
        border-bottom: 3px solid transparent;
    }

    /* Crossbow bolt */
    .projectile.bolt {
        width: 10px;
        height: 2px;
        background-color: #424242;
        border-radius: 0 1px 1px 0;
    }

    .projectile.bolt::before {
        content: '';
        position: absolute;
        right: -3px;
        top: -2px;
        width: 0;
        height: 0;
        border-left: 4px solid #424242;
        border-top: 3px solid transparent;
        border-bottom: 3px solid transparent;
    }

    .projectile.bolt::after {
        content: '';
        position: absolute;
        left: -2px;
        top: -1px;
        width: 3px;
        height: 4px;
        background-color: #8d6e63;
        border-radius: 1px;
    }

    /* Bullet projectile */
    .projectile.bullet {
        width: 4px;
        height: 4px;
        background-color: #616161;
        border-radius: 50%;
        box-shadow: 0 0 2px #ffcc80;
    }

    /* Muzzle flash effect for pistols and rifles */
    .projectile.bullet::before {
        content: '';
        position: absolute;
        left: -10px;
        top: 50%;
        transform: translateY(-50%);
        width: 12px;
        height: 6px;
        background: radial-gradient(ellipse at left, rgba(255, 165, 0, 0.8) 0%, rgba(255, 69, 0, 0.6) 40%, rgba(255, 69, 0, 0) 80%);
        border-radius: 50%;
        opacity: 0;
        animation: muzzle-flash 0.15s ease-out;
    }

    @keyframes muzzle-flash {
        0% {
            opacity: 1;
            transform: translateY(-50%) scale(0.5);
        }
        100% {
            opacity: 0;
            transform: translateY(-50%) scale(1);
        }
    }

    /* Smoke trail for bullets */
    .projectile.bullet::after {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 1px;
        background: linear-gradient(to left, rgba(200, 200, 200, 0.5), rgba(200, 200, 200, 0));
        z-index: -1;
    }

    /* Dart projectile (blowpipe) */
    .projectile.dart {
        width: 8px;
        height: 2px;
        background-color: #8bc34a;
        border-radius: 0 1px 1px 0;
    }

    .projectile.dart::before {
        content: '';
        position: absolute;
        right: -3px;
        top: -1.5px;
        width: 0;
        height: 0;
        border-left: 4px solid #558b2f;
        border-top: 2.5px solid transparent;
        border-bottom: 2.5px solid transparent;
    }

    /* Default projectile */
    .projectile.default {
        width: 6px;
        height: 6px;
        background-color: #f44336;
        border-radius: 50%;
    }
    
    /* Shotgun projectile - smaller pellets */
    .projectile.shotgun {
        width: 2px;
        height: 2px;
        background-color: #e74c3c;
        border-radius: 50%;
        box-shadow: 0 0 2px #ff9966;
        opacity: 0.7;
    }
    
    /* Shotgun cone visualization */
    .shotgun-cone {
        position: absolute;
        pointer-events: none;
        background-color: rgba(231, 76, 60, 0.2);
        border: 1px solid rgba(231, 76, 60, 0.4);
        clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
        z-index: 90;
        transform-origin: left center;
    }
    
    /* Missed shotgun cone (yellowish to distinguish) */
    .shotgun-cone.miss-angle {
        background-color: rgba(241, 196, 15, 0.2);
        border: 1px dashed rgba(241, 196, 15, 0.4);
    }
    
    /* Animation for shotgun cone fading */
    @keyframes cone-fade-out {
        0% { opacity: 0.7; }
        100% { opacity: 0; }
    }
    
    .shotgun-cone.fade-out {
        animation: cone-fade-out 0.2s linear forwards;
    }
    `;
    
    // Add to head element
    document.head.appendChild(styleElement);
}

// Add dodge styles
function addDodgeStyles() {
    // Check if styles already exist
    if (document.getElementById('dodge-styles')) {
        return;
    }
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'dodge-styles';
    styleElement.textContent = `
    /* Base style for dodging characters */
    .dodge-character {
        position: absolute;
        z-index: 100;
        transition: all 0.2s cubic-bezier(0.2, 0.8, 0.3, 1.2); /* Faster but bouncy animation */
        width: 20px;
        height: 20px;
    }

    /* Animation for successful dodge */
    .dodging {
        animation: dodge-effect 0.3s ease-out;
    }

    /* Glow effect when dodging */
    @keyframes dodge-effect {
        0% {
            filter: drop-shadow(0 0 2px rgba(0, 200, 255, 0.2)) brightness(1);
            transform: scale(1);
        }
        40% {
            filter: drop-shadow(0 0 8px rgba(0, 200, 255, 0.8)) brightness(1.4);
            transform: scale(1.2);
        }
        100% {
            filter: drop-shadow(0 0 2px rgba(0, 200, 255, 0.2)) brightness(1);
            transform: scale(1);
        }
    }

    /* Animation for movement of a dodging character */
    @keyframes dodge-movement {
        0% {
            transform: translate(-50%, -50%) scale(1);
        }
        50% {
            transform: translate(-50%, -50%) scale(1.2);
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
        }
    }

    /* Afterglow effect when the character jumps back to its position */
    .return-glow {
        position: absolute;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(0, 200, 255, 0.4) 0%, rgba(0, 200, 255, 0) 70%);
        border-radius: 50%;
        animation: return-pulse 0.6s ease-out;
        z-index: 99;
    }

    @keyframes return-pulse {
        0% {
            opacity: 0.8;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(1.5);
        }
    }
    `;
    
    // Add to head element
    document.head.appendChild(styleElement);
}

// Add poison styles
function addPoisonStyles() {
    // Check if styles already exist
    if (document.getElementById('poison-styles')) {
        return;
    }
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'poison-styles';
    styleElement.textContent = `
    /* Pulsating poison effect */
    @keyframes poison-pulse {
        0% {
            box-shadow: 0 0 8px 2px rgba(0, 204, 0, 0.4);
            filter: brightness(1);
        }
        50% {
            box-shadow: 0 0 12px 4px rgba(0, 204, 0, 0.7);
            filter: brightness(1.2) sepia(0.3);
        }
        100% {
            box-shadow: 0 0 8px 2px rgba(0, 204, 0, 0.4);
            filter: brightness(1);
        }
    }
    
    /* Poison cloud animation */
    .poison-cloud {
        position: absolute;
        width: 30px;
        height: 30px;
        background: radial-gradient(circle, rgba(0, 204, 0, 0.7) 0%, rgba(0, 204, 0, 0) 70%);
        border-radius: 50%;
        z-index: 90;
        pointer-events: none;
        animation: poison-cloud 1.5s ease-out forwards;
    }
    
    @keyframes poison-cloud {
        0% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(0.5);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2);
        }
    }
    
    /* Poison damage number (green instead of red) */
    .damage-number.poison {
        color: #00cc00;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
    }
    
    /* Flash animation for poison damage */
    @keyframes poison-damage-flash {
        0% { filter: brightness(1); }
        50% { filter: brightness(1.5) sepia(0.7); }
        100% { filter: brightness(1); }
    }
    
    .taking-poison-damage {
        animation: poison-damage-flash 0.5s 1;
    }
    `;
    
    // Add to head element
    document.head.appendChild(styleElement);
}

/**
 * Initialize the projectile system
 */
function initializeProjectileSystem() {
    // Clear any existing projectiles
    clearAllProjectiles();
    
    // Add event listeners for battle state changes
    document.addEventListener('battleStart', () => {
        // Reset the projectile system at battle start
        clearAllProjectiles();
    });
    
    document.addEventListener('battleEnd', () => {
        // Clean up projectiles when battle ends
        clearAllProjectiles();
    });
}

// Initialize the battle system
function init() {
    // Add necessary styles
    addStyles();
    
    // Initialize projectile system
    initializeProjectileSystem();
    
    // Initialize shotgun system
    initializeShotgunSystem();
    
    console.log("Battle system initialized with improved shotgun mechanics");
}

// Start the initialization when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);