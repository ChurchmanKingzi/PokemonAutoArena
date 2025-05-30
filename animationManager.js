/**
 * Animation management for characters - Updated for Pokemon overlay system
 * Pokemon sprites are now in an overlay layer, not in individual tiles
 */

import { getCharacterPositions, updateCharacterPosition } from './characterPositions.js';
import { TILE_SIZE } from './config.js';
import { focusOnCharacter } from './cameraSystem.js';
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

    // Update status icons position to follow the sprite
    if (sprite.updateStatusIcons) {
        sprite.updateStatusIcons();
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
 * Animate a stat boost/decrease effect (bounce and arrow)
 * @param {string} charId - Character ID or uniqueId
 * @param {string} statType - Type of stat ('angriff', 'verteidigung', etc.)
 * @param {number} stages - Number of stages changed (positive for increase, negative for decrease)
 * @param {Function} callback - Callback function when animation completes
 */
export function animateStatBoost(charId, statType, stages, callback) {   
    // Get character positions 
    const characterPositions = getCharacterPositions();
    let charPos = null;
    let actualCharId = null;
    
    // First try direct lookup (for cases where actual character ID is passed)
    if (characterPositions[charId]) {
        charPos = characterPositions[charId];
        actualCharId = charId;
    } else {
        // If not found by direct lookup, search by uniqueId
        for (const posId in characterPositions) {
            const position = characterPositions[posId];
            if (position.character && position.character.uniqueId === charId) {
                charPos = position;
                actualCharId = posId;
                break;
            }
        }
    }
    
    // If still not found, try a name-based partial match as last resort
    if (!charPos) {
        for (const posId in characterPositions) {
            const position = characterPositions[posId];
            if (position.character && position.character.name && 
                (charId.includes(position.character.name) || 
                 position.character.name.includes(charId.split('_')[0]))) {
                charPos = position;
                actualCharId = posId;
                break;
            }
        }
    }
    
    // If still not found, use center of battlefield as fallback
    if (!charPos) {
        console.error('Could not find position for character ID:', charId);
        charPos = { x: Math.floor(GRID_SIZE/2), y: Math.floor(GRID_SIZE/2) };
        actualCharId = charId; // Use original ID as fallback
    }
    
    // Get the Pokemon sprite using the correct character ID
    let sprite = null;
    if (actualCharId) {
        sprite = getPokemonSprite(actualCharId);
    }
    
    // Get battlefield element for overlay effects
    const battlefieldElement = document.querySelector('.battlefield-grid');
    if (!battlefieldElement) {
        console.error('Battlefield grid element not found');
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
            /* Keyframes for arrow animations */
            @keyframes stat-arrow-up {
                0% { opacity: 0; transform: translateY(0); }
                20% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(-30px); }
                100% { opacity: 0; transform: translateY(-60px); }
            }
            
            @keyframes stat-arrow-down {
                0% { opacity: 0; transform: translateY(0); }
                20% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(30px); }
                100% { opacity: 0; transform: translateY(60px); }
            }
            
            /* Arrow base styling */
            .stat-arrow {
                position: absolute;
                width: 100%;
                text-align: center;
                font-size: 32px;
                font-weight: bold;
                z-index: 2500;
                pointer-events: none;
                text-shadow: 0 0 5px white;
            }
            
            /* Animation classes */
            .stat-arrow.up {
                animation: stat-arrow-up 1.5s forwards;
            }
            
            .stat-arrow.down {
                animation: stat-arrow-down 1.5s forwards;
            }
            
            /* Color styling for each stat type */
            .angriff-boost .stat-arrow { color: #e74c3c; text-shadow: 0 0 5px rgba(231, 76, 60, 0.7), 0 0 2px white; }
            .verteidigung-boost .stat-arrow { color: #3498db; text-shadow: 0 0 5px rgba(52, 152, 219, 0.7), 0 0 2px white; }
            .spezialAngriff-boost .stat-arrow { color: #ff8c00; text-shadow: 0 0 5px rgba(255, 140, 0, 0.7), 0 0 2px white; }
            .spezialVerteidigung-boost .stat-arrow { color: #8e44ad; text-shadow: 0 0 5px rgba(142, 68, 173, 0.7), 0 0 2px white; }
            .init-boost .stat-arrow { color: #2ecc71; text-shadow: 0 0 5px rgba(46, 204, 113, 0.7), 0 0 2px white; }
            .gena-boost .stat-arrow { color: #34495e; text-shadow: 0 0 5px rgba(52, 73, 94, 0.7), 0 0 2px white; }
            .pa-boost .stat-arrow { color: #f1c40f; text-shadow: 0 0 5px rgba(241, 196, 15, 0.7), 0 0 2px white; }
            
            /* Flash effect styling */
            .stat-flash {
                position: absolute;
                border-radius: 50%;
                z-index: 990;
                animation: stat-flash 0.5s ease-in-out;
            }
            
            @keyframes stat-flash {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Determine the CSS class and flash color based on the stat type
    let buffClass, flashColor;
    switch (statType) {
        case 'angriff':
            buffClass = 'angriff-boost';
            flashColor = 'rgba(231, 76, 60, 0.3)'; // Red
            break;
        case 'verteidigung':
            buffClass = 'verteidigung-boost';
            flashColor = 'rgba(52, 152, 219, 0.3)'; // Blue
            break;
        case 'spezialAngriff':
            buffClass = 'spezialAngriff-boost';
            flashColor = 'rgba(255, 140, 0, 0.3)'; // Orange
            break;
        case 'spezialVerteidigung':
            buffClass = 'spezialVerteidigung-boost';
            flashColor = 'rgba(142, 68, 173, 0.3)'; // Purple
            break;
        case 'init':
            buffClass = 'init-boost';
            flashColor = 'rgba(46, 204, 113, 0.3)'; // Green
            break;
        case 'gena':
            buffClass = 'gena-boost';
            flashColor = 'rgba(52, 73, 94, 0.3)'; // Dark gray
            break;
        case 'pa':
            buffClass = 'pa-boost';
            flashColor = 'rgba(241, 196, 15, 0.3)'; // Yellow
            break;
        default:
            buffClass = 'angriff-boost'; // Default to attack boost
            flashColor = 'rgba(231, 76, 60, 0.3)'; // Red
    }
    
    // Get Pokémon size category for scaling the arrow position
    const sizeCategory = parseInt(sprite?.dataset.sizeCategory) || 1;
    
    // Calculate the vertical offset based on size category
    const yOffset = TILE_SIZE * (1 + sizeCategory * 0.5);
    
    // Create arrow container
    const arrowContainer = document.createElement('div');
    arrowContainer.className = `${buffClass}`;
    arrowContainer.style.position = 'absolute';
    arrowContainer.style.left = `${posX}px`;
    arrowContainer.style.top = `${posY - yOffset}px`; // Positioned higher based on size
    arrowContainer.style.width = `${TILE_SIZE * 2}px`;
    arrowContainer.style.height = `${TILE_SIZE * 3}px`;
    arrowContainer.style.zIndex = '3000';
    arrowContainer.style.pointerEvents = 'none';
    arrowContainer.style.transform = 'translate(-50%, -50%)';
    arrowContainer.id = `stat-boost-${actualCharId}-${statType}-${Date.now()}`;
    
    // Create arrows based on the number of stages
    const absStages = Math.abs(stages);
    for (let i = 0; i < absStages; i++) {
        const arrow = document.createElement('div');
        arrow.className = `stat-arrow ${stages > 0 ? 'up' : 'down'}`;
        arrow.textContent = stages > 0 ? '▲' : '▼';
        arrow.style.top = `${TILE_SIZE + (i * 10)}px`;
        arrow.style.animationDelay = `${i * 0.15}s`;
        arrowContainer.appendChild(arrow);
    }
    
    // Create color flash element
    const flash = document.createElement('div');
    flash.className = 'stat-flash';
    flash.style.position = 'absolute';
    flash.style.left = `${posX}px`;
    flash.style.top = `${posY}px`;
    flash.style.transform = 'translate(-50%, -50%)';
    flash.style.width = `${TILE_SIZE * 1.5}px`;
    flash.style.height = `${TILE_SIZE * 1.5}px`;
    flash.style.backgroundColor = flashColor;
    flash.style.zIndex = '2900';
    flash.id = `stat-flash-${actualCharId}-${Date.now()}`;
    
    // Add elements to battlefield
    battlefieldElement.appendChild(arrowContainer);
    battlefieldElement.appendChild(flash);
    
    // Add camera scaling class after elements are in DOM
    setTimeout(() => {
        arrowContainer.classList.add('camera-scaled-element');
        flash.classList.add('camera-scaled-element');
    }, 0);
    
    // Store original position for bounce animation
    const originalX = charPos.x;
    const originalY = charPos.y;
    
    // Define bounce sequence based on whether stat increases or decreases
    let bounceSequence;
    if (stages > 0) {
        bounceSequence = [
            { dx: 0, dy: -0.5 },
            { dx: 0, dy: 0 },
            { dx: 0, dy: -0.5 },
            { dx: 0, dy: 0 },
            { dx: 0, dy: -0.5 },
            { dx: 0, dy: 0 },
        ];
    } else {
        bounceSequence = [
            { dx: 0, dy: 0.5 },
            { dx: 0, dy: 0 },
            { dx: 0, dy: 0.5 },
            { dx: 0, dy: 0 },
            { dx: 0, dy: 0.5 },
            { dx: 0, dy: 0 },
        ];
    }
    
    // Execute bounce sequence - ONLY for non-defeated Pokemon with INCREASING stats
    let currentIndex = 0;
    let bounceInterval = null;

    if (sprite && stages > 0) {  // Only bounce for positive stat changes
        // Check if Pokemon is not defeated before bouncing
        const isDefeated = charPos.isDefeated || 
                        (charPos.character && 
                        (charPos.character.isDefeated || 
                            charPos.character.currentKP <= 0));
        
        if (!isDefeated) {
            // Only do bounce if Pokemon is not defeated
            bounceInterval = setInterval(() => {
                if (currentIndex >= bounceSequence.length) {
                    clearInterval(bounceInterval);
                    return;
                }
                
                const move = bounceSequence[currentIndex];
                const newX = originalX + move.dx;
                const newY = originalY + move.dy;
                
                // Try to update position using both methods
                try {
                    if (typeof updatePokemonPosition === 'function') {
                        updatePokemonPosition(actualCharId, newX, newY);
                    } else {
                        // Direct sprite manipulation as fallback
                        const pixelX = (newX * TILE_SIZE) + (TILE_SIZE / 2);
                        const pixelY = (newY * TILE_SIZE) + (TILE_SIZE / 2);
                        sprite.style.left = `${pixelX}px`;
                        sprite.style.top = `${pixelY}px`;
                    }
                } catch (err) {
                    console.warn('Error in bounce animation (non-critical):', err);
                }
                
                currentIndex++;
                
                // Ensure return to original position at end of sequence
                if (currentIndex >= bounceSequence.length) {
                    try {
                        if (typeof updatePokemonPosition === 'function') {
                            updatePokemonPosition(actualCharId, originalX, originalY);
                        } else {
                            const pixelX = (originalX * TILE_SIZE) + (TILE_SIZE / 2);
                            const pixelY = (originalY * TILE_SIZE) + (TILE_SIZE / 2);
                            sprite.style.left = `${pixelX}px`;
                            sprite.style.top = `${pixelY}px`;
                        }
                    } catch (err) {
                        console.warn('Error resetting position (non-critical):', err);
                    }
                }
            }, 150);
        }
    }
    
    // Clean up after animation
    setTimeout(() => {
        // Ensure position is correct
        if (sprite) {
            try {
                if (typeof updatePokemonPosition === 'function') {
                    updatePokemonPosition(actualCharId, originalX, originalY);
                } else {
                    const pixelX = (originalX * TILE_SIZE) + (TILE_SIZE / 2);
                    const pixelY = (originalY * TILE_SIZE) + (TILE_SIZE / 2);
                    sprite.style.left = `${pixelX}px`;
                    sprite.style.top = `${pixelY}px`;
                }
            } catch (err) {
                console.warn('Error in final position reset (non-critical):', err);
            }
        }
        
        // Remove visual elements
        if (bounceInterval) clearInterval(bounceInterval);
        
        if (arrowContainer.parentNode) {
            arrowContainer.remove();
        }
        
        if (flash.parentNode) {
            flash.remove();
        }
        
        if (callback) callback();
    }, 1500);
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