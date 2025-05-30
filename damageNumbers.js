/**
 * Damage number display system
 */

import { TILE_SIZE } from './config.js';
import { getCurrentBattleZoom } from './cameraSystem.js';

// Initialize CSS styles for damage numbers
(function initializeDamageNumberStyles() {
    // Check if styles are already added
    if (document.getElementById('damage-number-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'damage-number-styles';
    
    // Add CSS for all damage types
    styleElement.textContent = `
    /* Base damage number styling */
    .damage-number {
      position: absolute;
      transform: translate(-50%, -50%);
      font-weight: bold;
      z-index: 9000;
      pointer-events: none;
      will-change: transform, opacity;
      transform-origin: center center;
      white-space: nowrap;
    }

    /* Status effect and damage type number styling */

    /* Poison damage - Dark purple */
    .damage-number.poison {
      color: #6a0dad; /* Dark purple */
      text-shadow: 0 0 3px rgba(106, 13, 173, 0.8), 0 0 5px rgba(106, 13, 173, 0.5);
      animation: damage-float-poison 1.6s ease-out forwards;
    }

    /* Burn damage - Orange numbers */
    .damage-number.burn {
      color: #ff7800; /* Bright orange */
      text-shadow: 0 0 3px rgba(255, 120, 0, 0.8), 0 0 5px rgba(255, 120, 0, 0.5);
      animation: damage-float-burn 1.6s ease-out forwards;
    }

    /* Super effective damage - Lighter red */
    .damage-number.super-effective {
      color: #ff6666; /* Light red */
      text-shadow: 0 0 3px rgba(255, 102, 102, 0.8), 0 0 5px rgba(255, 102, 102, 0.5);
      animation: damage-float-super 1.6s ease-out forwards;
      font-weight: bold;
    }

    /* Not very effective damage - Yellow */
    .damage-number.not-effective {
      color: #ffcc00; /* Yellow */
      text-shadow: 0 0 3px rgba(255, 204, 0, 0.8), 0 0 5px rgba(255, 204, 0, 0.5);
      animation: damage-float-notvery 1.3s ease-out forwards;
      font-size: 0.9em;
    }

    /* Curse damage - Dark purple (similar to poison but with different animation) */
    .damage-number.curse {
      color: #5d1d7e; /* Dark purple, slightly different from poison */
      text-shadow: 0 0 3px rgba(93, 29, 126, 0.8), 0 0 8px rgba(93, 29, 126, 0.6);
      animation: damage-float-curse 1.7s ease-out forwards;
    }

    /* Seed/leech damage - Green */
    .damage-number.seed {
      color: #4caf50; /* Medium green */
      text-shadow: 0 0 3px rgba(76, 175, 80, 0.8), 0 0 5px rgba(76, 175, 80, 0.5);
      animation: damage-float-seed 1.5s ease-out forwards;
    }

    /* Hold damage - Grey */
    .damage-number.hold {
      color: #9e9e9e; /* Medium grey */
      text-shadow: 0 0 3px rgba(158, 158, 158, 0.8), 0 0 5px rgba(158, 158, 158, 0.5);
      animation: damage-float-hold 1.5s ease-out forwards;
    }

    /* Healing - Dark green */
    .damage-number.heal {
      color: #1b5e20; /* Dark green */
      text-shadow: 0 0 5px rgba(27, 94, 32, 0.8), 0 0 8px rgba(27, 94, 32, 0.6);
      animation: damage-float-heal 1.8s ease-out forwards;
      font-weight: bold;
    }

    /* Animation keyframes for different damage types */
    @keyframes damage-float-poison {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -100%) scale(1.2); /* Higher float */
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -180%) scale(1.5); /* Higher float */
      }
    }

    @keyframes damage-float-burn {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1) rotate(-5deg);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -100%) scale(1.2) rotate(5deg); /* Higher float */
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -180%) scale(1.5) rotate(-3deg); /* Higher float */
      }
    }

    @keyframes damage-float-super {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -100%) scale(1.3); /* Higher float */
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -200%) scale(1.6); /* Higher float */
      }
    }

    @keyframes damage-float-notvery {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(0.9);
      }
      20% {
        opacity: 0.9;
        transform: translate(-50%, -90%) scale(1); /* Higher float */
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -150%) scale(1.1); /* Higher float */
      }
    }

    @keyframes damage-float-curse {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        filter: blur(0px);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -100%) scale(1.2); /* Higher float */
        filter: blur(0.5px);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -180%) scale(1.6); /* Higher float */
        filter: blur(2px);
      }
    }

    @keyframes damage-float-seed {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -100%) scale(1.1); /* Higher float */
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -170%) scale(1.4); /* Higher float */
      }
    }

    @keyframes damage-float-hold {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1) rotate(0deg);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -90%) scale(1.1) rotate(-5deg); /* Higher float */
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -150%) scale(1.3) rotate(5deg); /* Higher float */
      }
    }

    @keyframes damage-float-heal {
      0% {
        opacity: 0.8;
        transform: translate(-50%, -50%) scale(0.9);
        filter: brightness(1);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -110%) scale(1.2); /* Higher float */
        filter: brightness(1.3);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -200%) scale(1.5); /* Higher float */
        filter: brightness(1.2);
      }
    }
    
    /* Add a class for damage numbers that need to scale with camera */
    .camera-scaled-element {
      transform-origin: center center;
      /* Scale based on CSS variable for smooth updates */
      transform: scale(calc(1 / var(--camera-zoom)));
    }`;
    
    // Add the style element to the document head
    document.head.appendChild(styleElement);
})();

/**
 * Create and animate a damage number at a specific position
 * @param {number} damage - The damage amount to display (negative for healing)
 * @param {Object} targetPosition - Object with x, y coordinates
 * @param {boolean} isCritical - Whether this is a critical hit (for bigger animation)
 * @param {string} effectiveness - The effectiveness of the attack ('super', 'notvery', 'heal', etc.)
 */
export function createDamageNumber(damage, targetPosition, isCritical = false, effectiveness = '') {
    // Don't show damage number for exactly 0 damage, but allow negative values (healing)
    if (damage === 0) return;

    // Find the battlefield grid for positioning
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) return;
    
    // Ensure battlefield has position relative for proper positioning of children
    if (getComputedStyle(battlefieldElement).position === 'static') {
        battlefieldElement.style.position = 'relative';
    }
    
    // Calculate the position relative to the battlefield
    // Position X is centered on the character
    const posX = (targetPosition.x * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Position Y with a consistent offset relative to the tile - higher position
    const posY = (targetPosition.y * TILE_SIZE) + (TILE_SIZE * 0.3) - 40; // Increased Y-offset to position higher
    
    // Create the damage number element
    const damageElement = document.createElement('div');
    damageElement.className = 'damage-number';
    
    // Add critical class if needed
    if (isCritical) {
        damageElement.classList.add('critical');
    }
    
    // Add effectiveness classes
    if (effectiveness === 'super') {
        damageElement.classList.add('super-effective');
    } else if (effectiveness === 'notvery') {
        damageElement.classList.add('not-effective');
    } else if (effectiveness === 'poison') {
        damageElement.classList.add('poison');
    } else if (effectiveness === 'burn') {
        damageElement.classList.add('burn');
    } else if (effectiveness === 'curse') {
        damageElement.classList.add('curse');
    } else if (effectiveness === 'seed') {
        damageElement.classList.add('seed');
    } else if (effectiveness === 'hold') {
        damageElement.classList.add('hold');
    } else if (effectiveness === 'heal') {
        damageElement.classList.add('heal');
    }
    
    // Set damage number content - show positive numbers for healing
    const displayValue = damage < 0 ? Math.abs(damage) : damage;
    damageElement.textContent = displayValue;
    
    // Add a "+" prefix for healing numbers
    if (damage < 0) {
        damageElement.textContent = '+' + displayValue;
    }
    
    // Ensure the damage number has absolute positioning relative to battlefield
    damageElement.style.position = 'absolute';
    damageElement.style.left = `${posX}px`;
    damageElement.style.top = `${posY}px`;
    
    // Get current battle zoom (for proper font scaling)
    const battleZoom = getCurrentBattleZoom();
    
    // Add class to make damage number scale with camera
    damageElement.classList.add('camera-scaled-element');
    
    // Calculate base font size proportional to the tile size
    // This ensures consistent sizing across different arena sizes
    const baseTileRatio = 20; // Standard baseline tile size to calibrate from
    const tileRatio = TILE_SIZE / baseTileRatio;
    
    // Adjust base font size based on damage amount and effectiveness
    // Reduced sizes by ~30% from original values
    let baseFontSize = isCritical ? 13 : 10;
    
    // Make not very effective damage smaller
    if (effectiveness === 'notvery') {
        baseFontSize *= 0.8;
    }
    
    // Make healing numbers slightly larger to emphasize the positive effect
    if (effectiveness === 'heal') {
        baseFontSize *= 1.2;
    }
    
    // Scale font size slightly with damage amount (max 1.5x size for very large damage)
    // Reduced max scale from 2.0 to 1.5 and made scaling less aggressive
    const fontSizeScale = Math.min(1.5, 1 + (Math.abs(damage) / 30));
    
    // Apply all scaling factors and calculate final font size
    // This accounts for:
    // 1. Tile size changes in different arena sizes
    // 2. Damage amount scaling
    // 3. Critical hit scaling
    // 4. Current camera zoom level
    const finalFontSize = baseFontSize * fontSizeScale * tileRatio;
    
    // Apply the calculated font size
    damageElement.style.fontSize = `${finalFontSize}px`;
    
    // Add to the battlefield element instead of document.body
    // This makes them scroll with the battlefield
    battlefieldElement.appendChild(damageElement);
    
    // Remove the element when animation completes
    damageElement.addEventListener('animationend', () => {
        damageElement.remove();
    });
}

/**
 * Create a purple damage number for poison damage
 * @param {number} damage - The damage amount
 * @param {Object} targetPosition - Position of the target
 */
export function createPoisonDamageNumber(damage, targetPosition) {
    // This is now a wrapper for the main function with 'poison' effectiveness
    createDamageNumber(damage, targetPosition, false, 'poison');
}

/**
 * Create and animate a miss message at a specific position
 * @param {Object} targetPosition - Object with x, y coordinates
 */
export function createMissMessage(targetPosition) {
    // Find the battlefield grid for positioning
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) return;
    
    // Ensure battlefield has position relative for proper positioning of children
    if (getComputedStyle(battlefieldElement).position === 'static') {
        battlefieldElement.style.position = 'relative';
    }
    
    // Calculate the position relative to the battlefield
    // Position X is centered on the character
    const posX = (targetPosition.x * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Position Y with an offset above the character - higher position
    const posY = (targetPosition.y * TILE_SIZE) + (TILE_SIZE * 0.3) - 40; // Increased Y-offset to position higher
    
    // Create the miss message element
    const missElement = document.createElement('div');
    missElement.className = 'damage-number miss';
    
    // Set miss message content
    missElement.textContent = "Daneben!";
    
    // Ensure the miss message has absolute positioning relative to battlefield
    missElement.style.position = 'absolute';
    missElement.style.left = `${posX}px`;
    missElement.style.top = `${posY}px`;
    
    // Add class to make miss message scale with camera
    missElement.classList.add('camera-scaled-element');
    
    // Calculate font size proportional to tile size
    const baseTileRatio = 20; // Standard baseline tile size
    const tileRatio = TILE_SIZE / baseTileRatio;
    const baseFontSize = 12; // Reduced from 16
    const finalFontSize = baseFontSize * tileRatio;
    
    // Set font size
    missElement.style.fontSize = `${finalFontSize}px`;
    
    // Add to the battlefield element
    battlefieldElement.appendChild(missElement);
    
    // Remove the element when animation completes
    missElement.addEventListener('animationend', () => {
        missElement.remove();
    });
}

/**
 * Create a visual "Volltreffer!" effect over a target
 * @param {Object} target - The target position or character
 */
export function createVolltrefferEffect(target) {
    // Find the battlefield grid for positioning
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) return;
    
    // Ensure battlefield has position relative
    if (getComputedStyle(battlefieldElement).position === 'static') {
        battlefieldElement.style.position = 'relative';
    }
    
    // If target is a position object, use its x/y
    const x = target.x !== undefined ? target.x : target.position ? target.position.x : 0;
    const y = target.y !== undefined ? target.y : target.position ? target.position.y : 0;
    
    // Calculate the position relative to the battlefield
    const posX = (x * TILE_SIZE) + (TILE_SIZE / 2);
    const posY = (y * TILE_SIZE) + (TILE_SIZE * 0.3) - 75; // Increased Y-offset to position higher
    
    // Create the effect element
    const volltrefferEl = document.createElement('div');
    volltrefferEl.className = 'volltreffer-effect';
    volltrefferEl.textContent = 'VOLLTREFFER!';
    
    // Position the element
    volltrefferEl.style.position = 'absolute';
    volltrefferEl.style.left = `${posX}px`;
    volltrefferEl.style.top = `${posY}px`;
    volltrefferEl.style.transform = 'translate(-50%, -50%)';
    
    // Add camera scaling class
    volltrefferEl.classList.add('camera-scaled-element');
    
    // Adjust font size based on tile size
    const baseTileRatio = 20; // Standard baseline tile size
    const tileRatio = TILE_SIZE / baseTileRatio;
    const baseFontSize = 18; // Reduced from 24
    
    volltrefferEl.style.fontSize = `${baseFontSize * tileRatio}px`;
    volltrefferEl.style.fontWeight = 'bold';
    volltrefferEl.style.color = '#ff0000';
    volltrefferEl.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
    volltrefferEl.style.zIndex = '9500';
    volltrefferEl.style.pointerEvents = 'none';
    
    // Add animation
    volltrefferEl.style.animation = 'volltreffer-flash 2s forwards';
    
    // Add animation styles if they don't exist
    if (!document.getElementById('volltreffer-effect-style')) {
        const style = document.createElement('style');
        style.id = 'volltreffer-effect-style';
        style.textContent = `
            @keyframes volltreffer-flash {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); } /* Reduced from 1.5 */
                70% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } /* Reduced from 1.2 */
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); } /* Reduced from 1.5 */
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to the battlefield element instead of document.body
    battlefieldElement.appendChild(volltrefferEl);
    
    // Remove the element after the animation completes
    setTimeout(() => {
        if (volltrefferEl.parentNode) {
            volltrefferEl.parentNode.removeChild(volltrefferEl);
        }
    }, 2000); // 2 seconds duration
}

/**
 * Create a visual "Sehr effektiv!" effect over a target
 * @param {Object} target - The target position or character
 */
export function createSuperEffectiveEffect(target) {
    // Find the battlefield grid for positioning
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) return;
    
    // Ensure battlefield has position relative
    if (getComputedStyle(battlefieldElement).position === 'static') {
        battlefieldElement.style.position = 'relative';
    }
    
    // If target is a position object, use its x/y
    const x = target.x !== undefined ? target.x : target.position ? target.position.x : 0;
    const y = target.y !== undefined ? target.y : target.position ? target.position.y : 0;
    
    // Calculate the position relative to the battlefield
    const posX = (x * TILE_SIZE) + (TILE_SIZE / 2);
    const posY = (y * TILE_SIZE) + (TILE_SIZE * 0.3) - 55; // Position above the critical hit text
    
    // Create the effect element
    const effectEl = document.createElement('div');
    effectEl.className = 'effectiveness-effect super';
    effectEl.textContent = 'SEHR EFFEKTIV!';
    
    // Position the element
    effectEl.style.position = 'absolute';
    effectEl.style.left = `${posX}px`;
    effectEl.style.top = `${posY}px`;
    effectEl.style.transform = 'translate(-50%, -50%)';
    
    // Add camera scaling class
    effectEl.classList.add('camera-scaled-element');
    
    // Adjust font size based on tile size
    const baseTileRatio = 20; // Standard baseline tile size
    const tileRatio = TILE_SIZE / baseTileRatio;
    const baseFontSize = 14; // Slightly smaller than critical
    
    effectEl.style.fontSize = `${baseFontSize * tileRatio}px`;
    effectEl.style.fontWeight = 'bold';
    effectEl.style.color = '#ff8c00'; // Orange
    effectEl.style.textShadow = '0 0 6px rgba(255, 140, 0, 0.7)';
    effectEl.style.zIndex = '9400'; // Slightly below critical hit
    effectEl.style.pointerEvents = 'none';
    
    // Add animation
    effectEl.style.animation = 'effectiveness-flash 1.8s forwards';
    
    // Add animation styles if they don't exist
    if (!document.getElementById('effectiveness-effect-style')) {
        const style = document.createElement('style');
        style.id = 'effectiveness-effect-style';
        style.textContent = `
            @keyframes effectiveness-flash {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                70% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
            }
            
            .effectiveness-effect.not-very {
                color: #ffd700 !important; /* Yellow */
                text-shadow: 0 0 6px rgba(255, 215, 0, 0.7) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add to the battlefield element instead of document.body
    battlefieldElement.appendChild(effectEl);
    
    // Remove the element after the animation completes
    setTimeout(() => {
        if (effectEl.parentNode) {
            effectEl.parentNode.removeChild(effectEl);
        }
    }, 1800); // Match animation duration
}

/**
 * Create a visual "Nicht sehr effektiv..." effect over a target
 * @param {Object} target - The target position or character
 */
export function createNotVeryEffectiveEffect(target) {
    // Find the battlefield grid for positioning
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) return;
    
    // Ensure battlefield has position relative
    if (getComputedStyle(battlefieldElement).position === 'static') {
        battlefieldElement.style.position = 'relative';
    }
    
    // If target is a position object, use its x/y
    const x = target.x !== undefined ? target.x : target.position ? target.position.x : 0;
    const y = target.y !== undefined ? target.y : target.position ? target.position.y : 0;
    
    // Calculate the position relative to the battlefield
    const posX = (x * TILE_SIZE) + (TILE_SIZE / 2);
    const posY = (y * TILE_SIZE) + (TILE_SIZE * 0.3) - 55; // Position above damage numbers
    
    // Create the effect element
    const effectEl = document.createElement('div');
    effectEl.className = 'effectiveness-effect not-very';
    effectEl.textContent = 'NICHT SEHR EFFEKTIV...';
    
    // Position the element
    effectEl.style.position = 'absolute';
    effectEl.style.left = `${posX}px`;
    effectEl.style.top = `${posY}px`;
    effectEl.style.transform = 'translate(-50%, -50%)';
    
    // Add camera scaling class
    effectEl.classList.add('camera-scaled-element');
    
    // Adjust font size based on tile size
    const baseTileRatio = 20; // Standard baseline tile size
    const tileRatio = TILE_SIZE / baseTileRatio;
    const baseFontSize = 12; // Smaller than super effective
    
    effectEl.style.fontSize = `${baseFontSize * tileRatio}px`;
    effectEl.style.fontWeight = 'bold';
    effectEl.style.color = '#ffd700'; // Yellow
    effectEl.style.textShadow = '0 0 6px rgba(255, 215, 0, 0.7)';
    effectEl.style.zIndex = '9400'; // Same as super effective
    effectEl.style.pointerEvents = 'none';
    
    // Add animation - slower and less dramatic
    effectEl.style.animation = 'effectiveness-flash 1.8s forwards';
    
    // Add to the battlefield element
    battlefieldElement.appendChild(effectEl);
    
    // Remove the element after the animation completes
    setTimeout(() => {
        if (effectEl.parentNode) {
            effectEl.parentNode.removeChild(effectEl);
        }
    }, 1800); // Match animation duration
}