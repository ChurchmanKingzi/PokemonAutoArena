/**
 * Main script for the RPG Character Combat Simulator
 */

import { battle } from './battleManager.js';

// When the DOM is loaded, initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    setupEventListeners();
    
    // Expose the battle function globally so it can be accessed from the original characterauswahl.js
    window.battle = battle;
});

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Back button to return to character selection
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Hide combat area
            const combatArea = document.getElementById('combat-area');
            if (combatArea) {
                combatArea.style.display = 'none';
            }
            
            // Show character selection
            const characterSelection = document.querySelector('.character-selection');
            if (characterSelection) {
                characterSelection.style.display = 'block';
            }
        });
    });

    // Fight button to start the battle
    const fightButton = document.querySelector('.fight-button');
    if (fightButton) {
        fightButton.addEventListener('click', () => {
            // This will be handled by the original charakterauswahl.js logic
            // which will call our exposed battle function
        });
    }
}

// If we need to add CSS styles programmatically, do it here
function addStyles() {
    // Check if battle styles are already added
    if (!document.getElementById('battle-styles')) {
        addBattleStyles();
    }
    
    // Add projectile styles
    if (!document.getElementById('projectile-styles')) {
        addProjectileStyles();
    }
    
    // Add dodge styles
    if (!document.getElementById('dodge-styles')) {
        addDodgeStyles();
    }
    
    // Add poison styles
    if (!document.getElementById('poison-styles')) {
        addPoisonStyles();
    }
}

/**
 * Add battle-specific styles
 */
function addBattleStyles() {
    const styleElement = document.createElement('style');
    styleElement.id = 'battle-styles';
    styleElement.textContent = `
    /* Active character highlighting */
    .battlefield-character.active {
        box-shadow: 0 0 8px 2px yellow;
        z-index: 10;
    }
    
    /* Damage numbers animation */
    .damage-number {
        position: absolute;
        font-weight: bold;
        color: #ff0000;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
        z-index: 1000;
        pointer-events: none;
        font-family: 'Arial', sans-serif;
        animation: damage-float 1.5s ease-out forwards;
        transform-origin: center;
    }
    
    @keyframes damage-float {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        20% {
            opacity: 1;
            transform: translate(-50%, -70%) scale(1.2);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -120%) scale(1.5);
        }
    }
    
    /* Critical hit variation (for bigger damage numbers) */
    .damage-number.critical {
        color: #ff3333;
        text-shadow: 0 0 5px #ff0000, 1px 1px 2px rgba(0, 0, 0, 0.8);
        font-size: 1.5em;
        animation: damage-float-critical 1.8s ease-out forwards;
    }
    
    @keyframes damage-float-critical {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        10% {
            transform: translate(-50%, -55%) scale(1.3);
        }
        30% {
            opacity: 1;
            transform: translate(-50%, -80%) scale(1.4);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1.8);
        }
    }
    `;
    
    document.head.appendChild(styleElement);
}

/**
 * Add projectile styles
 */
function addProjectileStyles() {
    const styleElement = document.createElement('style');
    styleElement.id = 'projectile-styles';
    styleElement.textContent = `
    /* Projectile base style */
    .projectile {
        position: absolute;
        z-index: 1000;
        transform-origin: center;
    }

    /* Arrow/bolt (elongated brown projectile) */
    .projectile.arrow {
        width: 12px;
        height: 3px;
        background-color: #8B4513; /* Brown */
        border-radius: 0 2px 2px 0;
    }

    /* Arrow tip */
    .projectile.arrow::before {
        content: '';
        position: absolute;
        right: -4px;
        top: -2px;
        width: 0;
        height: 0;
        border-top: 3.5px solid transparent;
        border-bottom: 3.5px solid transparent;
        border-left: 5px solid #8B4513;
    }

    /* Poison dart (for blowpipe) */
    .projectile.dart {
        width: 10px;
        height: 2px;
        background-color: #556B2F; /* Dark green for poison */
        border-radius: 0 1px 1px 0;
    }

    /* Poison dart tip */
    .projectile.dart::before {
        content: '';
        position: absolute;
        right: -3px;
        top: -2px;
        width: 0;
        height: 0;
        border-top: 3px solid transparent;
        border-bottom: 3px solid transparent;
        border-left: 4px solid #556B2F;
    }

    /* Bullet (round gray projectile) */
    .projectile.bullet {
        width: 4px;
        height: 4px;
        background-color: #696969; /* Dark gray */
        border-radius: 50%;
        box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
    }

    /* Animation for flying projectiles */
    .projectile.flying {
        animation: fly-projectile linear forwards;
    }

    @keyframes fly-projectile {
        0% {
            transform: translate(-50%, -50%) rotate(var(--rotate-angle, 0deg));
        }
        100% {
            transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) rotate(var(--rotate-angle, 0deg));
        }
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

    /* Same animation for crossbow bolts - but slightly longer flight time */
    .projectile.arrow.flying {
        animation-duration: 1.2s !important;
    }
    `;
    
    document.head.appendChild(styleElement);
}

/**
 * Add dodge styles
 */
function addDodgeStyles() {
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
    
    document.head.appendChild(styleElement);
}

/**
 * Add poison styles
 */
function addPoisonStyles() {
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
    
    document.head.appendChild(styleElement);
}

// Run initialization when the page loads
window.addEventListener('load', () => {
    // Add all necessary styles
    addStyles();
});