/**
 * Damage number display system
 */

import { TILE_SIZE } from './config.js';

// Initialize CSS styles for damage numbers
(function initializeDamageNumberStyles() {
    // Check if styles are already added
    if (document.getElementById('damage-number-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'damage-number-styles';
    
    // Add CSS for all damage types
    styleElement.textContent = `
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
        transform: translate(-50%, -70%) scale(1.3);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -120%) scale(1.6);
      }
    }

    @keyframes damage-float-burn {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1) rotate(-5deg);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -70%) scale(1.3) rotate(5deg);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -120%) scale(1.6) rotate(-3deg);
      }
    }

    @keyframes damage-float-super {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -70%) scale(1.4);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -130%) scale(1.7);
      }
    }

    @keyframes damage-float-notvery {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(0.9);
      }
      20% {
        opacity: 0.9;
        transform: translate(-50%, -60%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -100%) scale(1.1);
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
        transform: translate(-50%, -60%) scale(1.3);
        filter: blur(0.5px);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -130%) scale(1.7);
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
        transform: translate(-50%, -65%) scale(1.2);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -110%) scale(1.5);
      }
    }

    @keyframes damage-float-hold {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1) rotate(0deg);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -60%) scale(1.1) rotate(-5deg);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -100%) scale(1.4) rotate(5deg);
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
        transform: translate(-50%, -80%) scale(1.3);
        filter: brightness(1.3);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -140%) scale(1.6);
        filter: brightness(1.2);
      }
    }`;
    
    // Add the style element to the document head
    document.head.appendChild(styleElement);
})();

/**
 * Create and animate a damage number at a specific position
 * @param {number} damage - The damage amount to display
 * @param {Object} targetPosition - Object with x, y coordinates
 * @param {boolean} isCritical - Whether this is a critical hit (for bigger animation)
 * @param {string} effectiveness - The effectiveness of the attack ('super', 'notvery', or '')
 */
export function createDamageNumber(damage, targetPosition, isCritical = false, effectiveness = '') {
    // Don't show damage number for 0 damage
    if (damage <= 0) return;

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
    
    // Position Y with a consistent offset relative to the tile
    const posY = (targetPosition.y * TILE_SIZE) + (TILE_SIZE * 0.3) - 25;
    
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
    
    // Set damage number content
    damageElement.textContent = damage;
    
    // Ensure the damage number has absolute positioning relative to battlefield
    damageElement.style.position = 'absolute';
    damageElement.style.left = `${posX}px`;
    damageElement.style.top = `${posY}px`;
    
    // Adjust font size based on damage amount and effectiveness
    let baseFontSize = isCritical ? 18 : 14;
    
    // Make not very effective damage smaller
    if (effectiveness === 'notvery') {
        baseFontSize *= 0.8;
    }
    
    // Scale font size slightly with damage amount (max 2x size for very large damage)
    const fontSizeScale = Math.min(2, 1 + (damage / 20));
    damageElement.style.fontSize = `${baseFontSize * fontSizeScale}px`;
    
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
    // Find the battlefield for positioning
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) return;
    
    // Ensure battlefield has position relative for proper positioning of children
    if (getComputedStyle(battlefieldElement).position === 'static') {
        battlefieldElement.style.position = 'relative';
    }
    
    // Calculate the position relative to the battlefield
    const posX = (targetPosition.x * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Use a slightly higher offset for poison damage to distinguish from regular damage
    const posY = (targetPosition.y * TILE_SIZE) + (TILE_SIZE * 0.6);
    
    // Create the damage number element
    const damageElement = document.createElement('div');
    damageElement.className = 'damage-number poison'; // This will use our purple styling
    
    // Set damage number content
    damageElement.textContent = damage;
    
    // Ensure the damage number has absolute positioning relative to battlefield
    damageElement.style.position = 'absolute';
    damageElement.style.left = `${posX}px`;
    damageElement.style.top = `${posY}px`;
    
    // Adjust font size
    const baseFontSize = 14; // Slightly larger for poison damage
    damageElement.style.fontSize = `${baseFontSize}px`;
    
    // Add to the battlefield element instead of document.body
    battlefieldElement.appendChild(damageElement);
    
    // Remove the element after the animation
    damageElement.addEventListener('animationend', () => {
        damageElement.remove();
    });
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
    
    // Position Y with an offset above the character
    const posY = (targetPosition.y * TILE_SIZE) + (TILE_SIZE * 0.3) - 25;
    
    // Create the miss message element
    const missElement = document.createElement('div');
    missElement.className = 'damage-number miss';
    
    // Set miss message content
    missElement.textContent = "Daneben!";
    
    // Ensure the miss message has absolute positioning relative to battlefield
    missElement.style.position = 'absolute';
    missElement.style.left = `${posX}px`;
    missElement.style.top = `${posY}px`;
    
    // Set font size
    missElement.style.fontSize = '16px';
    
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
    
    // Calculate the position relative to the battlefield (just like in createMissMessage)
    const posX = (x * TILE_SIZE) + (TILE_SIZE / 2);
    const posY = (y * TILE_SIZE) + (TILE_SIZE * 0.3) - 60;
    
    // Create the effect element
    const volltrefferEl = document.createElement('div');
    volltrefferEl.className = 'volltreffer-effect';
    volltrefferEl.textContent = 'VOLLTREFFER!';
    
    // Position the element (fixed the typo)
    volltrefferEl.style.position = 'absolute';
    volltrefferEl.style.left = `${posX}px`;
    volltrefferEl.style.top = `${posY}px`;
    
    // Add to the battlefield element instead of document.body
    battlefieldElement.appendChild(volltrefferEl);
    
    // Remove the element after the animation completes
    setTimeout(() => {
        if (volltrefferEl.parentNode) {
            volltrefferEl.parentNode.removeChild(volltrefferEl);
        }
    }, 2000); // 2 seconds duration
}