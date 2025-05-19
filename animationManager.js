/**
 * Animation management for characters - Updated for Pokemon overlay system
 * Pokemon sprites are now in an overlay layer, not in individual tiles
 */

import { getCharacterPositions, updateCharacterPosition } from './characterPositions.js';
import { TILE_SIZE } from './config.js';
import { focusOnCharacter, positionElementWithCamera } from './cameraSystem.js';
import { getPokemonSprite, updatePokemonPosition, setPokemonSpriteState } from './pokemonOverlay.js';

/**
 * Animate character movement one tile at a time
 * @param {string} charId - Character ID
 * @param {Object} currentPosition - Current position {x, y}
 * @param {Array} path - Array of positions to move through [{x, y}, ...]
 * @param {Function} callback - Function to call when animation completes
 */
export function animateCharacterMovement(charId, currentPosition, path, callback) {
    if (!path || path.length === 0) {
        if (callback) callback();
        return;
    }
    
    // Function to animate a single step
    function animateStep(stepIndex) {
        if (stepIndex >= path.length) {
            if (callback) callback();
            return;
        }
        
        // Get the next position
        const nextPos = path[stepIndex];
        
        // Update character position (this updates both data and visual)
        updateCharacterPosition(charId, nextPos);
        
        // Schedule the next step
        setTimeout(() => {
            animateStep(stepIndex + 1);
        }, 150);
    }
    
    // Start the animation
    animateStep(0);
}

/**
 * Animate character dodge movement using the overlay system
 * @param {string} charId - Character ID
 * @param {Object} targetPos - Target position {x, y}
 * @param {Function} callback - Function to call when animation completes
 */
export async function animateDodge(charId, targetPos, callback) {
    const characterPositions = getCharacterPositions();
    const charData = characterPositions[charId];
    if (!charData) {
        if (callback) callback();
        return;
    }
    
    // Get the Pokemon sprite from the overlay
    const sprite = getPokemonSprite(charId);
    if (!sprite) {
        if (callback) callback();
        return;
    }
    
    // Store original position
    const originalX = charData.x;
    const originalY = charData.y;
    
    // Mark character as dodging in data
    charData.isDodging = true;
    
    // Add dodging visual effect
    sprite.classList.add('dodging');
    sprite.style.filter = 'drop-shadow(0 0 3px rgba(0, 200, 255, 0.8))';
    
    // Calculate pixel positions
    const startPixelX = (originalX * TILE_SIZE) + (TILE_SIZE / 2);
    const startPixelY = (originalY * TILE_SIZE) + (TILE_SIZE / 2);
    const endPixelX = (targetPos.x * TILE_SIZE) + (TILE_SIZE / 2);
    const endPixelY = (targetPos.y * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Set up animation transition
    sprite.style.transition = 'all 0.3s cubic-bezier(0.2, -0.3, 0.8, 1.3)';
    
    // Animate to target position
    sprite.style.left = `${endPixelX}px`;
    sprite.style.top = `${endPixelY}px`;
    
    // Update HP bar position to follow the sprite
    if (sprite.updateHPBar) {
        sprite.updateHPBar();
    }
    
    // Wait for animation to complete
    setTimeout(() => {
        // Remove dodging effects
        sprite.classList.remove('dodging');
        sprite.style.filter = '';
        sprite.style.transition = '';
        
        // Update position in data
        charData.x = targetPos.x;
        charData.y = targetPos.y;
        charData.isDodging = false;
        
        // Update the sprite's stored grid position
        sprite.dataset.gridX = targetPos.x;
        sprite.dataset.gridY = targetPos.y;
        
        // Ensure HP bar position is correct after animation
        if (sprite.updateHPBar) {
            sprite.updateHPBar();
        }
        
        if (callback) callback();
    }, 300);
}

/**
 * Highlight the active character in both battlefield and initiative list
 * @param {string} charId - ID of the active character
 */
export async function highlightActiveCharacter(charId) {
    const characterPositions = getCharacterPositions();
    const charPos = characterPositions[charId];
    if (!charPos) return;
    
    // Get the Pokemon sprite from the overlay
    const sprite = getPokemonSprite(charId);
    if (sprite) {
        setPokemonSpriteState(charId, 'active', true);
    }
    
    // Also highlight in initiative list
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
    // Remove active state from all Pokemon sprites
    const characterPositions = getCharacterPositions();
    for (const charId in characterPositions) {
        setPokemonSpriteState(charId, 'active', false);
    }
    
    // Remove highlight from initiative list
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
    const { getOccupiedTiles } = await import('./pokemonDistanceCalculator.js');
    
    // Get the Pokemon sprite from the overlay
    const sprite = getPokemonSprite(attackerId);
    if (!sprite) {
        if (callback) callback();
        return;
    }
    
    // Get the battlefield element for positioning context
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) {
        if (callback) callback();
        return;
    }
    
    // Calculate the centers of attacker and target based on occupied tiles
    const attackerTiles = getOccupiedTiles(attackerPos);
    const targetTiles = getOccupiedTiles(targetPos);
    
    // Calculate center of attacker's tiles
    let attackerCenterX = 0, attackerCenterY = 0;
    for (const tile of attackerTiles) {
        attackerCenterX += tile.x;
        attackerCenterY += tile.y;
    }
    attackerCenterX /= attackerTiles.length;
    attackerCenterY /= attackerTiles.length;
    
    // Calculate center of target's tiles
    let targetCenterX = 0, targetCenterY = 0;
    for (const tile of targetTiles) {
        targetCenterX += tile.x;
        targetCenterY += tile.y;
    }
    targetCenterX /= targetTiles.length;
    targetCenterY /= targetTiles.length;
    
    // Convert to pixel coordinates
    const startPixelX = attackerCenterX * TILE_SIZE + TILE_SIZE / 2;
    const startPixelY = attackerCenterY * TILE_SIZE + TILE_SIZE / 2;
    const targetPixelX = targetCenterX * TILE_SIZE + TILE_SIZE / 2;
    const targetPixelY = targetCenterY * TILE_SIZE + TILE_SIZE / 2;
    
    // Focus camera on the attacker
    await focusOnCharacter(attackerId);
    
    // Calculate movement vector
    const dx = targetPixelX - startPixelX;
    const dy = targetPixelY - startPixelY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Calculate attack distance (stop short of the target)
    const attackDistance = Math.min(distance * 0.7, TILE_SIZE * (1 + (targetSize - 1) * 0.5));
    
    // Calculate end position for attack
    const endPixelX = startPixelX + dirX * attackDistance;
    const endPixelY = startPixelY + dirY * attackDistance;
    
    // Add attacking state
    setPokemonSpriteState(attackerId, 'attacking', true);
    
    // Set up animation
    sprite.style.transition = 'all 0.2s cubic-bezier(0.2, 0.7, 0.4, 1.0)';
    
    // Store original position
    const originalLeft = sprite.style.left;
    const originalTop = sprite.style.top;
    
    // Animate to attack position
    sprite.style.left = `${endPixelX}px`;
    sprite.style.top = `${endPixelY}px`;
    
    // Set up cleanup timeout
    const attackTimeout = setTimeout(() => {
        // Remove attacking state
        setPokemonSpriteState(attackerId, 'attacking', false);
        
        // Return to original position immediately
        sprite.style.transition = '';
        sprite.style.left = originalLeft;
        sprite.style.top = originalTop;
        
        if (callback) callback();
    }, 200);
    
    // Store cleanup method for external access
    sprite.meleeAttackCleanup = () => {
        clearTimeout(attackTimeout);
        setPokemonSpriteState(attackerId, 'attacking', false);
        sprite.style.transition = '';
        sprite.style.left = originalLeft;
        sprite.style.top = originalTop;
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
    const characterPositions = getCharacterPositions();
    const charPos = characterPositions[charId];
    
    if (!charPos) {
        if (callback) callback();
        return;
    }
    
    // Get the Pokemon sprite
    const sprite = getPokemonSprite(charId);
    if (!sprite) {
        if (callback) callback();
        return;
    }
    
    // Get battlefield element for overlay effects
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) {
        if (callback) callback();
        return;
    }
    
    // Calculate pixel position for effects
    const posX = (charPos.x * TILE_SIZE) + (TILE_SIZE / 2);
    const posY = (charPos.y * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Add stat boost CSS if not already present
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
            
            .attack-boost .stat-arrow { color: #e74c3c; text-shadow: 0 0 5px rgba(231, 76, 60, 0.7); }
            .attack-strong .stat-arrow { color: #ff0000; text-shadow: 0 0 8px rgba(255, 0, 0, 0.8); font-size: 28px; }
            .defense-boost .stat-arrow { color: #3498db; text-shadow: 0 0 5px rgba(52, 152, 219, 0.7); }
            .speed-boost .stat-arrow { color: #2ecc71; text-shadow: 0 0 5px rgba(46, 204, 113, 0.7); }
            
            .stat-flash {
                position: absolute;
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
    
    // Create arrow container (no camera scaling needed since it's positioned relative to battlefield)
    const arrowContainer = document.createElement('div');
    arrowContainer.className = `${buffType}`;
    arrowContainer.style.position = 'absolute';
    arrowContainer.style.left = `${posX}px`;
    arrowContainer.style.top = `${posY - 20}px`;
    arrowContainer.style.transform = 'translate(-50%, 0)';
    arrowContainer.style.width = `${TILE_SIZE}px`;
    arrowContainer.style.height = `${TILE_SIZE}px`;
    arrowContainer.style.zIndex = '2000';
    arrowContainer.style.pointerEvents = 'none';
    
    // Create arrow(s)
    const arrow = document.createElement('div');
    arrow.className = 'stat-arrow';
    arrow.textContent = '▲';
    arrowContainer.appendChild(arrow);
    
    // Add second arrow for strong boosts
    if (buffType === 'attack-strong') {
        const arrow2 = document.createElement('div');
        arrow2.className = 'stat-arrow';
        arrow2.textContent = '▲';
        arrow2.style.top = '-25px';
        arrowContainer.appendChild(arrow2);
    }
    
    // Create color flash (no camera scaling needed)
    const flash = document.createElement('div');
    flash.className = 'stat-flash';
    flash.style.position = 'absolute';
    flash.style.left = `${posX}px`;
    flash.style.top = `${posY}px`;
    flash.style.transform = 'translate(-50%, -50%)';
    flash.style.width = `${TILE_SIZE * 1.5}px`;
    flash.style.height = `${TILE_SIZE * 1.5}px`;
    
    // Set flash color
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
    
    // Create bounce effect by temporarily moving the sprite
    const originalX = charPos.x;
    const originalY = charPos.y;
    
    // Define bounce sequence
    const bounceSequence = [
        { dx: 0, dy: -1 }, // Up
        { dx: 0, dy: 0 },  // Center
        { dx: 0, dy: -1 }, // Up
        { dx: 0, dy: 0 },  // Center
        { dx: 0, dy: -1 }, // Up
        { dx: 0, dy: 0 },  // Return
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
        
        // Update visual position temporarily
        updatePokemonPosition(charId, newX, newY);
        
        currentIndex++;
        
        // Ensure return to original position
        if (currentIndex >= bounceSequence.length) {
            updatePokemonPosition(charId, originalX, originalY);
        }
    }, 150);
    
    // Clean up after animation
    setTimeout(() => {
        // Ensure position is correct
        updatePokemonPosition(charId, originalX, originalY);
        
        // Remove visual elements
        if (arrowContainer.parentNode) arrowContainer.remove();
        if (flash.parentNode) flash.remove();
        
        clearInterval(bounceInterval);
        
        if (callback) callback();
    }, 1000);
}

/**
 * Create and animate a claw slash effect over a target
 * @param {Object} target - Target position information
 * @param {Function} callback - Function to call when animation completes
 */
export function animateClawSlash(target, callback) {
    // This effect is independent of the Pokemon sprites, so it can remain largely unchanged
    // Find the battlefield grid for positioning
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (!battlefieldGrid) {
        if (callback) callback();
        return;
    }
    
    // Calculate the center position in pixels for the slash
    const centerX = (target.x * TILE_SIZE) + (TILE_SIZE / 2);
    const centerY = (target.y * TILE_SIZE) + (TILE_SIZE / 2);
    
    // Create slash container (no camera scaling needed)
    const slashContainer = document.createElement('div');
    slashContainer.className = 'claw-slash-container';
    slashContainer.style.position = 'absolute';
    slashContainer.style.left = `${centerX}px`;
    slashContainer.style.top = `${centerY}px`;
    slashContainer.style.transform = 'translate(-50%, -50%)';
    slashContainer.style.width = `${TILE_SIZE * 1.5}px`;
    slashContainer.style.height = `${TILE_SIZE * 1.5}px`;
    slashContainer.style.pointerEvents = 'none';
    slashContainer.style.zIndex = '2000';
    
    // Create claw slash elements
    for (let i = 0; i < 3; i++) {
        const slash = document.createElement('div');
        slash.className = 'claw-slash';
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
        slash.style.setProperty('--delay', `${i * 0.06}s`);
        slash.style.setProperty('--angle', `${(i-1) * 25}deg`);
        slash.style.animation = `claw-slash-animation 0.5s var(--delay) forwards`;
        
        slashContainer.appendChild(slash);
    }
    
    // Add CSS if not present
    if (!document.getElementById('claw-slash-animation-style')) {
        const slashStyle = document.createElement('style');
        slashStyle.id = 'claw-slash-animation-style';
        slashStyle.textContent = `
            @keyframes claw-slash-animation {
                0% { transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(0); opacity: 0; }
                10% { transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(0.1); opacity: 1; }
                70% { transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(1); opacity: 0.8; }
                100% { transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(1.2); opacity: 0; }
            }
        `;
        document.head.appendChild(slashStyle);
    }
    
    // Add to battlefield
    battlefieldGrid.appendChild(slashContainer);
    
    // Remove after animation
    setTimeout(() => {
        if (slashContainer.parentNode) {
            slashContainer.remove();
        }
        if (callback) callback();
    }, 600);
}