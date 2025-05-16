/**
 * Animation management for characters
 */

import { getCharacterPositions, updateCharacterPosition } from './characterPositions.js';
import { TILE_SIZE } from './config.js';

/**
 * Animate character movement one tile at a time
 * @param {string} charId - Character ID
 * @param {Object} currentPosition - Current position {x, y}
 * @param {Array} path - Array of positions to move through [{x, y}, ...]
 * @param {Function} callback - Function to call when animation completes
 */
export function animateCharacterMovement(charId, currentPosition, path, callback) {
    // If path is empty or undefined, just call the callback
    if (!path || path.length === 0) {
        if (callback) callback();
        return;
    }
    
    // Function to animate a single step
    function animateStep(stepIndex) {
        // If we're done with all steps, call the callback
        if (stepIndex >= path.length) {
            if (callback) callback();
            return;
        }
        
        // Get the next position
        const nextPos = path[stepIndex];
        
        // Update character position visually
        updateCharacterPosition(charId, nextPos);
        
        // Schedule the next step with a short delay
        setTimeout(() => {
            animateStep(stepIndex + 1);
        }, 150); // 150ms delay between steps
    }
    
    // Start the animation
    animateStep(0);
}

/**
 * Animate character dodge movement by directly moving the original element
 * @param {string} charId - Character ID
 * @param {Object} targetPos - Target position {x, y}
 * @param {Function} callback - Function to call when animation completes
 */
export async function animateDodge(charId, targetPos, callback) {
    // Import to avoid circular dependency
    const { getCharacterPositions } = await import('./characterPositions.js');
    const { TILE_SIZE } = await import('./config.js');
    const { getTeamColor, getStrategyBorderStyle } = await import('./utils.js');
    const { updateTileZIndex } = await import('./tileZIndexManager.js');
    const characterPositions = getCharacterPositions();
    
    const charData = characterPositions[charId];
    if (!charData) {
        if (callback) callback();
        return;
    }
    
    // Store original position
    const originalX = charData.x;
    const originalY = charData.y;
    
    // Find the current tile
    const currentTile = document.querySelector(`.battlefield-tile[data-x="${originalX}"][data-y="${originalY}"]`);
    if (!currentTile) {
        if (callback) callback();
        return;
    }

    // Find the character element
    const characterEl = currentTile.querySelector(`.battlefield-character[data-character-id="${charId}"]`);
    if (!characterEl) {
        if (callback) callback();
        return;
    }
    
    // Find the HP bar container if it exists
    const hpBarContainer = currentTile.querySelector(`.character-hp-bar-container[data-character-id="${charId}"]`);
    
    // Get the battlefield element for positioning
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) {
        if (callback) callback();
        return;
    }
    
    // Calculate positions for animation
    const battlefieldRect = battlefieldElement.getBoundingClientRect();
    
    // Set the character to absolute positioning relative to the document
    // This allows us to move it freely during the animation
    const charRect = characterEl.getBoundingClientRect();
    
    // Update z-index for the current tile IMMEDIATELY (Pokémon is leaving)
    // This happens BEFORE removing the character from the DOM
    updateTileZIndex(currentTile, false);
    
    // Create a wrapper for the character during animation
    const animationWrapper = document.createElement('div');
    animationWrapper.className = 'dodge-animation-wrapper';
    animationWrapper.style.position = 'fixed'; // Fixed to viewport
    animationWrapper.style.zIndex = '100';
    animationWrapper.style.pointerEvents = 'none';
    
    // Calculate absolute start position
    animationWrapper.style.left = `${charRect.left}px`;
    animationWrapper.style.top = `${charRect.top}px`;
    animationWrapper.style.width = `${charRect.width}px`;
    animationWrapper.style.height = `${charRect.height}px`;
    
    // Calculate target position
    const endX = battlefieldRect.left + (targetPos.x * TILE_SIZE) + (TILE_SIZE / 2) - (charRect.width / 2);
    const endY = battlefieldRect.top + (targetPos.y * TILE_SIZE) + (TILE_SIZE / 2) - (charRect.height / 2);
    
    // Temporarily detach the character from the DOM
    characterEl.remove();
    currentTile.classList.remove('occupied');
    
    // If we have an HP bar, detach it too
    if (hpBarContainer) {
        hpBarContainer.remove();
    }
    
    // Add dodge effect to character (will be automatically preserved)
    characterEl.classList.add('dodging');
    characterEl.style.filter = 'drop-shadow(0 0 3px rgba(0, 200, 255, 0.8))'; // Blue dodge effect
    
    // Add character to animation wrapper
    animationWrapper.appendChild(characterEl);
    
    // Add animation wrapper to document
    document.body.appendChild(animationWrapper);
    
    // Mark character as dodge-immune in data
    charData.isDodging = true;
    
    // Define the animation properties
    animationWrapper.style.transition = 'all 0.3s cubic-bezier(0.2, -0.3, 0.8, 1.3)';
    
    // Get the new tile and increase its z-index IMMEDIATELY before the animation starts
    const newTile = document.querySelector(`.battlefield-tile[data-x="${targetPos.x}"][data-y="${targetPos.y}"]`);
    if (newTile) {
        updateTileZIndex(newTile, true);
    }
    
    // Start animation after a frame
    requestAnimationFrame(() => {
        animationWrapper.style.left = `${endX}px`;
        animationWrapper.style.top = `${endY}px`;
    });
    
    // Wait for animation to complete
    setTimeout(() => {
        // Remove animation class and effects
        characterEl.classList.remove('dodging');
        characterEl.style.filter = '';
        
        // Remove the character from the animation wrapper
        characterEl.remove();
        
        // Update position in data
        charData.x = targetPos.x;
        charData.y = targetPos.y;
        charData.isDodging = false;
        
        // Place character on the new tile
        if (newTile) {
            // If we have an HP bar, add it to the new tile first
            if (hpBarContainer) {
                newTile.appendChild(hpBarContainer);
            }
            
            // Add the character to the new tile
            newTile.appendChild(characterEl);
            newTile.classList.add('occupied');
        }
        
        // Remove the animation wrapper
        animationWrapper.remove();
        
        if (callback) callback();
    }, 300); // 300ms for animation
}

/**
 * Highlight the active character in both battlefield and initiative list
 * @param {string} charId - ID of the active character
 */
export async function highlightActiveCharacter(charId) {
    // Import to avoid circular dependency
    const { getCharacterPositions } = await import('./characterPositions.js');
    const characterPositions = getCharacterPositions();
    
    // Find the character element in the battlefield
    const charPos = characterPositions[charId];
    if (!charPos) return;
    
    const charElement = document.querySelector(`.battlefield-tile[data-x="${charPos.x}"][data-y="${charPos.y}"] .battlefield-character`);
    if (charElement) {
        charElement.classList.add('active');
    }
    
    // Also highlight in initiative list using uniqueId instead of name
    const characterUniqueId = charPos.character.uniqueId;
    const initiativeItem = document.querySelector(`.initiative-item[data-character="${characterUniqueId}"]`);
    if (initiativeItem) {
        // Remove active class from any previously active item
        const activeItem = document.querySelector('.initiative-item.active');
        if (activeItem) {
            activeItem.classList.remove('active');
        }
        // Add active class to current character
        initiativeItem.classList.add('active');
        
        // Scroll to make sure the active item is visible
        initiativeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Remove highlight from the active character
 */
export function unhighlightActiveCharacter() {
    const activeChar = document.querySelector('.battlefield-character.active');
    if (activeChar) {
        activeChar.classList.remove('active');
    }
    
    // NEW CODE: Also remove highlight from initiative list
    const activeInitiativeItem = document.querySelector('.initiative-item.active');
    if (activeInitiativeItem) {
        activeInitiativeItem.classList.remove('active');
    }
}

/**
 * Animate a melee attack by moving the attacker toward the target and back
 * @param {string} attackerId - ID of the attacking character
 * @param {Object} attackerPos - Position of the attacker {x, y}
 * @param {Object} targetPos - Position of the target {x, y}
 * @param {number} attackerSize - Size category of the attacker
 * @param {number} targetSize - Size category of the target
 * @param {Function} callback - Function to call when animation completes
 */
export async function animateMeleeAttack(attackerId, attackerPos, targetPos, attackerSize, targetSize, callback) {
    // Import to avoid circular dependency
    const { getCharacterPositions } = await import('./characterPositions.js');
    const { TILE_SIZE } = await import('./config.js');
    const characterPositions = getCharacterPositions();
    
    // Find the character element on the battlefield
    const currentTile = document.querySelector(`.battlefield-tile[data-x="${attackerPos.x}"][data-y="${attackerPos.y}"]`);
    if (!currentTile) {
        if (callback) callback();
        return;
    }

    // Find the character element
    const characterEl = currentTile.querySelector(`.battlefield-character[data-character-id="${attackerId}"]`);
    if (!characterEl) {
        if (callback) callback();
        return;
    }
    
    // Get the battlefield element for positioning
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) {
        if (callback) callback();
        return;
    }
    
    // CHANGED: Create animation wrapper with position: absolute
    const animationWrapper = document.createElement('div');
    animationWrapper.className = 'melee-attack-animation-wrapper';
    animationWrapper.style.position = 'absolute'; 
    animationWrapper.style.zIndex = '100';
    animationWrapper.style.pointerEvents = 'none';
    
    // Get character's current position and size
    const charRect = characterEl.getBoundingClientRect();
    
    // CHANGED: Calculate position relative to the battlefield, not the viewport
    const battlefieldRect = battlefieldElement.getBoundingClientRect();
    const relativeLeft = charRect.left - battlefieldRect.left;
    const relativeTop = charRect.top - battlefieldRect.top;
    
    // Set starting position relative to the battlefield
    animationWrapper.style.left = `${relativeLeft}px`;
    animationWrapper.style.top = `${relativeTop}px`;
    animationWrapper.style.width = `${charRect.width}px`;
    animationWrapper.style.height = `${charRect.height}px`;
    
    // Calculate attack distance - half the size category of the smaller participant
    const smallerSize = Math.min(attackerSize, targetSize);
    const attackDistance = smallerSize / 2;
    
    // Calculate center tiles for both attacker and target based on size
    // For attacker - get center coordinate by calculating size radius
    const attackerRadius = Math.floor(attackerSize / 2);
    const attackerCenterX = attackerPos.x + attackerRadius * (attackerSize > 1 ? 0.5 : 0);
    const attackerCenterY = attackerPos.y + attackerRadius * (attackerSize > 1 ? 0.5 : 0);
    
    // For target - get center coordinate by calculating size radius
    const targetRadius = Math.floor(targetSize / 2);
    const targetCenterX = targetPos.x + targetRadius * (targetSize > 1 ? 0.5 : 0);
    const targetCenterY = targetPos.y + targetRadius * (targetSize > 1 ? 0.5 : 0);
    
    // Calculate vector from attacker's center to target's center
    const dx = targetCenterX - attackerCenterX;
    const dy = targetCenterY - attackerCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Calculate attack position (move along the direction vector)
    const attackPositionX = attackerCenterX + dirX * attackDistance;
    const attackPositionY = attackerCenterY + dirY * attackDistance;
    
    // CHANGED: Calculate movement distance in pixels relative to the battlefield
    const moveX = (attackPositionX - attackerPos.x) * TILE_SIZE;
    const moveY = (attackPositionY - attackerPos.y) * TILE_SIZE;
    
    // Temporarily detach the character and add to animation wrapper
    characterEl.remove();
    currentTile.classList.remove('occupied');
    
    // Add attack effect to character
    characterEl.classList.add('attacking');
    
    // Add character to animation wrapper
    animationWrapper.appendChild(characterEl);
    
    // CHANGED: Add animation wrapper to the battlefield element instead of document body
    battlefieldElement.appendChild(animationWrapper);
    
    // Define animation properties - lunge forward quickly with slight acceleration
    animationWrapper.style.transition = 'all 0.2s cubic-bezier(0.2, 0.7, 0.4, 1.0)';
    
    // CHANGED: Set up safety cleanup in case animation is interrupted
    const cleanupAnimation = () => {
        // Only run if animation wrapper is still in the DOM
        if (animationWrapper.parentNode) {
            // Remove animation class
            if (characterEl.parentNode === animationWrapper) {
                characterEl.classList.remove('attacking');
                characterEl.remove();
                
                // Place character back on the original tile
                if (currentTile) {
                    currentTile.appendChild(characterEl);
                    currentTile.classList.add('occupied');
                }
            }
            
            // Remove the animation wrapper
            animationWrapper.remove();
        }
    };
    
    // CHANGED: Add event listener for page navigation
    window.addEventListener('beforeunload', cleanupAnimation);
    
    // Start animation after a frame - move to attack position
    requestAnimationFrame(() => {
        // CHANGED: Use transforms instead of left/top for better performance
        animationWrapper.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
    
    // Store animation timeouts so we can clear them if needed
    let attackTimeout;
    
    // Wait for attack animation to complete
    attackTimeout = setTimeout(() => {
        // CHANGED APPROACH: Instead of animating back, directly return to original tile
        // Remove animation class
        characterEl.classList.remove('attacking');
        
        // Remove character from animation wrapper
        characterEl.remove();
        
        // Place character back on the original tile
        currentTile.appendChild(characterEl);
        currentTile.classList.add('occupied');
        
        // Remove the animation wrapper
        animationWrapper.remove();
        
        // Clean up beforeunload listener
        window.removeEventListener('beforeunload', cleanupAnimation);
        
        // Call the callback
        if (callback) callback();
    }, 200); // Only wait for forward animation
    
    // CHANGED: Add cleanup method to the animation wrapper for external access
    animationWrapper.cleanup = () => {
        clearTimeout(attackTimeout);
        window.removeEventListener('beforeunload', cleanupAnimation);
        cleanupAnimation();
        if (callback) callback();
    };
}

/**
 * Animate a stat boost effect (bounce and arrow)
 * @param {string} charId - Character ID
 * @param {string} buffType - Type of buff ('attack', 'defense', etc)
 * @param {Function} callback - Callback function when animation completes
 */
export function animateStatBoost(charId, buffType, callback) {
    // Find the character tile first
    const characterPositions = getCharacterPositions();
    const charPos = characterPositions[charId];
    
    if (!charPos) {
        if (callback) callback();
        return;
    }

    // Store original position
    const originalX = charPos.x;
    const originalY = charPos.y;
    
    // Find the current tile
    const currentTile = document.querySelector(`.battlefield-tile[data-x="${charPos.x}"][data-y="${charPos.y}"]`);
    if (!currentTile) {
        if (callback) callback();
        return;
    }

    // Find the character element
    const characterEl = currentTile.querySelector(`.battlefield-character[data-character-id="${charId}"]`);
    if (!characterEl) {
        if (callback) callback();
        return;
    }
    
    // Find battlefield element
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) {
        if (callback) callback();
        return;
    }
    
    // Calculate center position for effects
    const posX = (charPos.x * TILE_SIZE) + (TILE_SIZE / 2);
    const posY = (charPos.y * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Create stat arrow animations if not already present
    if (!document.getElementById('stat-boost-animations')) {
        const style = document.createElement('style');
        style.id = 'stat-boost-animations';
        style.textContent = `
            @keyframes stat-arrow-animation {
                0% { opacity: 0; transform: translate(-50%, 0); }
                20% { opacity: 1; transform: translate(-50%, 0); }
                80% { opacity: 1; transform: translate(-50%, -15px); }
                100% { opacity: 0; transform: translate(-50%, -30px); }
            }
            
            .stat-arrow {
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 24px;
                font-weight: bold;
                z-index: 1000;
                pointer-events: none;
                animation: stat-arrow-animation 1.5s forwards;
            }
            
            .attack-boost .stat-arrow {
                color: #e74c3c;
                text-shadow: 0 0 5px rgba(231, 76, 60, 0.7);
            }
            
            .attack-strong .stat-arrow {
                color: #ff0000;
                text-shadow: 0 0 8px rgba(255, 0, 0, 0.8);
                font-size: 28px;
            }
            
            .defense-boost .stat-arrow {
                color: #3498db;
                text-shadow: 0 0 5px rgba(52, 152, 219, 0.7);
            }
            
            .speed-boost .stat-arrow {
                color: #2ecc71;
                text-shadow: 0 0 5px rgba(46, 204, 113, 0.7);
            }
            
            .stat-flash {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                z-index: 990;
                animation: stat-flash 0.5s ease-in-out;
            }
            
            @keyframes stat-flash {
                0% { opacity: 0; transform: scale(0.8); }
                50% { opacity: 0.7; transform: scale(1.2); }
                100% { opacity: 0; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create arrow container
    const arrowContainer = document.createElement('div');
    arrowContainer.className = buffType;
    arrowContainer.style.position = 'absolute';
    arrowContainer.style.left = `${posX}px`;
    arrowContainer.style.top = `${posY - 20}px`;
    arrowContainer.style.width = `${TILE_SIZE}px`;
    arrowContainer.style.height = `${TILE_SIZE}px`;
    arrowContainer.style.zIndex = '2000';
    arrowContainer.style.pointerEvents = 'none';
    
    // Create arrow(s)
    const arrow = document.createElement('div');
    arrow.className = 'stat-arrow';
    arrow.textContent = '▲'; // Unicode up arrow
    arrowContainer.appendChild(arrow);
    
    // Add second arrow for 2-stage boosts
    if (buffType === 'attack-strong') {
        const arrow2 = document.createElement('div');
        arrow2.className = 'stat-arrow';
        arrow2.textContent = '▲';
        arrow2.style.top = '-25px';
        arrowContainer.appendChild(arrow2);
    }
    
    // Add color flash based on buff type
    const flash = document.createElement('div');
    flash.className = 'stat-flash';
    flash.style.left = `${posX}px`;
    flash.style.top = `${posY}px`;
    flash.style.width = `${TILE_SIZE * 1.5}px`;
    flash.style.height = `${TILE_SIZE * 1.5}px`;
    flash.style.transform = 'translate(-50%, -50%)';
    
    // Set flash color based on buff type
    if (buffType === 'attack' || buffType === 'attack-strong') {
        flash.style.backgroundColor = 'rgba(231, 76, 60, 0.3)';
    } else if (buffType === 'defense') {
        flash.style.backgroundColor = 'rgba(52, 152, 219, 0.3)';
    } else if (buffType === 'speed') {
        flash.style.backgroundColor = 'rgba(46, 204, 113, 0.3)';
    }
    
    // Add elements to battlefield
    battlefieldElement.appendChild(arrowContainer);
    battlefieldElement.appendChild(flash);
    
    // Define bounce animation sequence
    // We'll move the Pokemon up and down slightly to create a bounce effect
    // This sequence will be executed repeatedly
    const bounceSequence = [
        { dx: 0, dy: -1 }, // Move up
        { dx: 0, dy: 0 },  // Back to center
        { dx: 0, dy: -1 }, // Move up again
        { dx: 0, dy: 0 },  // Back to center
        { dx: 0, dy: -1 }, // Move up a third time
        { dx: 0, dy: 0 },  // Return to original position
    ];
    
    // Execute bounce sequence
    let currentIndex = 0;
    const bounceInterval = setInterval(() => {
        if (currentIndex >= bounceSequence.length) {
            clearInterval(bounceInterval);
            return;
        }
        
        const move = bounceSequence[currentIndex];
        const newX = originalX + move.dx;
        const newY = originalY + move.dy;
        
        // Update character position using the character positioning system
        updateCharacterPosition(charId, { x: newX, y: newY });
        
        currentIndex++;
        
        // If we've finished the sequence, make sure we're at the original position
        if (currentIndex >= bounceSequence.length) {
            updateCharacterPosition(charId, { x: originalX, y: originalY });
        }
    }, 150); // 150ms per movement for a smooth animation
    
    // Clean up after animation completes
    setTimeout(() => {
        // Ensure character is back at original position
        updateCharacterPosition(charId, { x: originalX, y: originalY });
        
        // Remove visual elements
        if (arrowContainer.parentNode) {
            arrowContainer.remove();
        }
        if (flash.parentNode) {
            flash.remove();
        }
        
        // Clear interval as safety measure
        clearInterval(bounceInterval);
        
        // Call callback
        if (callback) callback();
    }, 1000);
}

/**
 * Create and animate a claw slash effect over a target
 * @param {Object} target - Target position information
 * @param {Function} callback - Function to call when animation completes
 */
export function animateClawSlash(target, callback) {
    // Find the target tile
    const targetTile = document.querySelector(`.battlefield-tile[data-x="${target.x}"][data-y="${target.y}"]`);
    if (!targetTile) {
        if (callback) callback();
        return;
    }
    
    // Find the battlefield grid for positioning
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (!battlefieldGrid) {
        if (callback) callback();
        return;
    }
    
    // Create slash container
    const slashContainer = document.createElement('div');
    slashContainer.className = 'claw-slash-container';
    slashContainer.style.position = 'absolute';
    slashContainer.style.top = '0';
    slashContainer.style.left = '0';
    slashContainer.style.width = '100%';
    slashContainer.style.height = '100%';
    slashContainer.style.pointerEvents = 'none';
    slashContainer.style.zIndex = '2000'; // High z-index to appear above other elements
    
    // Create claw slash elements (3 slashes for effect)
    for (let i = 0; i < 3; i++) {
        const slash = document.createElement('div');
        slash.className = 'claw-slash';
        
        // Position and style for each slash
        slash.style.position = 'absolute';
        slash.style.top = '50%';
        slash.style.left = '50%';
        slash.style.width = '100%';
        slash.style.height = '3px';
        slash.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        slash.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.6)';
        slash.style.borderRadius = '2px';
        slash.style.transformOrigin = 'left center';
        slash.style.transform = 'translate(-50%, -50%) rotate(0deg) scaleX(0)';
        
        // Set custom properties for animation
        slash.style.setProperty('--delay', `${i * 0.06}s`);
        slash.style.setProperty('--angle', `${(i-1) * 25}deg`); // -25, 0, 25 degrees for more dramatic angles
        
        // Apply the animation
        slash.style.animation = `claw-slash-animation 0.5s var(--delay) forwards`;
        
        slashContainer.appendChild(slash);
    }
    
    // Add to target tile
    targetTile.appendChild(slashContainer);
    
    // Add the necessary CSS animation if not already in the document
    if (!document.getElementById('claw-slash-animation-style')) {
        const slashStyle = document.createElement('style');
        slashStyle.id = 'claw-slash-animation-style';
        slashStyle.textContent = `
            @keyframes claw-slash-animation {
                0% {
                    transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(0);
                    opacity: 0;
                }
                10% {
                    transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(0.1);
                    opacity: 1;
                }
                70% {
                    transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(1);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(1.2);
                    opacity: 0;
                }
            }
            
            /* Add a blood red splash effect behind the slashes */
            .claw-slash::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 0;
                width: 100%;
                height: 200%;
                background: radial-gradient(ellipse at left, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
                transform: translateY(-50%);
                opacity: 0;
                animation: splash-fade 0.5s var(--delay) forwards;
            }
            
            @keyframes splash-fade {
                0% { opacity: 0; }
                30% { opacity: 0.8; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(slashStyle);
    }
    
    // Remove after animation completes
    setTimeout(() => {
        if (slashContainer.parentNode) {
            slashContainer.remove();
        }
        if (callback) callback();
    }, 600); // Slightly longer than animation to ensure completion
}