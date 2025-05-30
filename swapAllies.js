/**
 * Swap Allies Module - Reusable Pokemon position swapping functionality
 * Extracted from jongleur.js for use by multiple attacks/abilities/items
 */

import { logBattleEvent } from './battleLog.js';
import { getCharacterPositions, updateCharacterPosition } from './characterPositions.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { GRID_SIZE } from './config.js';
import { doesPokemonOccupyTile } from './pokemonDistanceCalculator.js';
import { getPokemonSprite } from './pokemonOverlay.js';
import { focusOnCharacter } from './cameraSystem.js';

/**
 * Find all valid teammates that can swap positions with the active Pokemon
 * @param {string} activeCharId - The active character ID
 * @param {Object} characterPositions - All character positions (optional, will fetch if not provided)
 * @returns {Array} - Array of valid target character IDs
 */
export function findValidSwapTargets(activeCharId, characterPositions = null) {
    if (!characterPositions) {
        characterPositions = getCharacterPositions();
    }
    
    const activeCharData = characterPositions[activeCharId];
    if (!activeCharData) return [];
    
    const validTargets = [];
    
    // Check all other characters
    for (const charId in characterPositions) {
        if (charId === activeCharId) continue;
        
        const charData = characterPositions[charId];
        
        // Must be on the same team
        if (charData.teamIndex !== activeCharData.teamIndex) continue;
        
        // Must not be defeated
        if (charData.isDefeated) continue;
        
        // Must have positive KP
        if (charData.character.currentKP <= 0) continue;
        
        // Check if swap is spatially possible
        if (canSwapPositions(activeCharId, charId, characterPositions)) {
            validTargets.push(charId);
        }
    }
    
    return validTargets;
}

/**
 * Check if two Pokemon can swap positions (enough space for each other)
 * @param {string} charId1 - First character ID
 * @param {string} charId2 - Second character ID
 * @param {Object} characterPositions - All character positions (optional, will fetch if not provided)
 * @returns {boolean} - Whether the swap is possible
 */
export function canSwapPositions(charId1, charId2, characterPositions = null) {
    if (!characterPositions) {
        characterPositions = getCharacterPositions();
    }
    
    const char1Data = characterPositions[charId1];
    const char2Data = characterPositions[charId2];
    
    if (!char1Data || !char2Data) return false;
    
    // Get sizes
    const size1 = calculateSizeCategory(char1Data.character);
    const size2 = calculateSizeCategory(char2Data.character);
    
    // Check if char1 can fit at char2's position
    if (!canPokemonFitAtPosition(char2Data.x, char2Data.y, size1, [charId1, charId2], characterPositions)) {
        return false;
    }
    
    // Check if char2 can fit at char1's position
    if (!canPokemonFitAtPosition(char1Data.x, char1Data.y, size2, [charId1, charId2], characterPositions)) {
        return false;
    }
    
    return true;
}

/**
 * Check if a Pokemon of given size can fit at a specific position
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Size category of the Pokemon
 * @param {string|Array} excludeCharIds - Character ID(s) to exclude from collision check
 * @param {Object} characterPositions - All character positions (optional, will fetch if not provided)
 * @returns {boolean} - Whether the Pokemon can fit
 */
export function canPokemonFitAtPosition(x, y, size, excludeCharIds, characterPositions = null) {
    if (!characterPositions) {
        characterPositions = getCharacterPositions();
    }
    
    // Ensure excludeCharIds is always an array
    const excludeIds = Array.isArray(excludeCharIds) ? excludeCharIds : [excludeCharIds];
    
    const extension = Math.floor(size / 2);
    
    // Check if all required tiles are within bounds and free
    for (let dx = -extension; dx <= extension; dx++) {
        for (let dy = -extension; dy <= extension; dy++) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            // Check bounds
            if (checkX < 0 || checkX >= GRID_SIZE || checkY < 0 || checkY >= GRID_SIZE) {
                return false;
            }
            
            // Check if tile is occupied by someone other than the excluded Pokemon
            for (const charId in characterPositions) {
                if (excludeIds.includes(charId)) continue;
                
                const charData = characterPositions[charId];
                if (charData.isDefeated) continue;
                
                // Check if this Pokemon occupies the tile we're checking
                if (doesPokemonOccupyTile(charData, checkX, checkY)) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

/**
 * Execute a swap between two Pokemon with animations and camera movement
 * @param {string} charId1 - First character ID
 * @param {string} charId2 - Second character ID
 * @param {Object} options - Options for the swap animation
 * @param {boolean} options.showFlash - Whether to show flash animations (default: true)
 * @param {boolean} options.moveCameraToFirst - Whether to focus camera on first Pokemon at start (default: true)
 * @param {boolean} options.moveCameraToBoth - Whether to show both Pokemon after swap (default: true)
 * @param {string} options.swapReason - Reason for the swap (for logging, default: "")
 * @returns {Promise} - Promise that resolves when swap animation completes
 */
export async function executeSwap(charId1, charId2, options = {}) {
    const {
        showFlash = true,
        moveCameraToFirst = true,
        moveCameraToBoth = true,
        swapReason = ""
    } = options;
    
    const characterPositions = getCharacterPositions();
    const char1Data = characterPositions[charId1];
    const char2Data = characterPositions[charId2];
    
    if (!char1Data || !char2Data) {
        console.error('Cannot execute swap: character data not found');
        return;
    }
    
    // Store original positions
    const pos1 = { x: char1Data.x, y: char1Data.y };
    const pos2 = { x: char2Data.x, y: char2Data.y };
    
    // STEP 1: Focus camera on first Pokemon (if requested)
    if (moveCameraToFirst) {
        await focusOnCharacter(charId1, 200);
    }
    
    // STEP 2: Show flash animation on first Pokemon (if requested)
    if (showFlash) {
        await createSwapFlash(charId1);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // STEP 3: Move camera to second Pokemon
    await focusOnCharacter(charId2, 400);
    
    // STEP 4: Show flash animation on second Pokemon (if requested)
    if (showFlash) {
        await createSwapFlash(charId2);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // STEP 5: Perform the actual swap
    char1Data.x = pos2.x;
    char1Data.y = pos2.y;
    char2Data.x = pos1.x;
    char2Data.y = pos1.y;
    
    // Update visual positions
    updateCharacterPosition(charId1, pos2);
    updateCharacterPosition(charId2, pos1);
    
    // STEP 6: Brief pause to let user see the result
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // STEP 7: Show both Pokemon in their new positions (if requested)
    if (moveCameraToBoth) {
        await focusOnCharacter(charId1, 250);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await focusOnCharacter(charId2, 250);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

/**
 * Select and execute a swap with a random valid ally
 * @param {string} activeCharId - The character ID initiating the swap
 * @param {string} swapReason - Reason for the swap (for logging)
 * @param {Object} swapOptions - Options for the swap animation
 * @returns {Promise<boolean>} - True if swap was executed, false if no valid targets
 */
export async function swapWithRandomAlly(activeCharId, swapReason = "", swapOptions = {}) {
    const characterPositions = getCharacterPositions();
    const validTargets = findValidSwapTargets(activeCharId, characterPositions);
    
    if (validTargets.length === 0) {
        return false; // No valid swap targets
    }
    
    // Randomly select a teammate to swap with
    const targetCharId = validTargets[Math.floor(Math.random() * validTargets.length)];
    const activeData = characterPositions[activeCharId];
    const targetData = characterPositions[targetCharId];
    
    // Log the swap with the provided reason
    if (swapReason) {
        logBattleEvent(`${swapReason} ${activeData.character.name} tauscht mit ${targetData.character.name}!`);
    } else {
        logBattleEvent(`${activeData.character.name} tauscht Position mit ${targetData.character.name}!`);
    }
    
    // Execute the swap
    await executeSwap(activeCharId, targetCharId, swapOptions);
    
    return true; // Swap was successful
}

/**
 * Create a white flash animation on a Pokemon (Pokeball recall/release effect)
 * @param {string} charId - Character ID to animate
 * @returns {Promise} - Promise that resolves when animation completes
 */
export async function createSwapFlash(charId) {
    return new Promise((resolve) => {
        // Get the Pokemon sprite
        const sprite = getPokemonSprite(charId);
        
        if (!sprite) {
            resolve();
            return;
        }
        
        // Create flash effect container
        const flashContainer = document.createElement('div');
        flashContainer.className = 'swap-flash-container';
        flashContainer.style.position = 'absolute';
        flashContainer.style.top = '0';
        flashContainer.style.left = '0';
        flashContainer.style.width = '100%';
        flashContainer.style.height = '100%';
        flashContainer.style.pointerEvents = 'none';
        flashContainer.style.zIndex = '100';
        flashContainer.style.borderRadius = '50%';
        
        // Create the flash effect
        const flash = document.createElement('div');
        flash.className = 'swap-flash';
        flash.style.position = 'absolute';
        flash.style.top = '-20%';
        flash.style.left = '-20%';
        flash.style.width = '140%';
        flash.style.height = '140%';
        flash.style.background = 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.3) 60%, transparent 100%)';
        flash.style.borderRadius = '50%';
        flash.style.animation = 'swapFlash 0.4s ease-out';
        
        flashContainer.appendChild(flash);
        sprite.appendChild(flashContainer);
        
        // Add CSS animation keyframes if not already added
        if (!document.querySelector('#swap-flash-styles')) {
            const style = document.createElement('style');
            style.id = 'swap-flash-styles';
            style.textContent = `
                @keyframes swapFlash {
                    0% {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(1.5);
                    }
                }
                
                .swap-flash-container {
                    animation: swapFlashPulse 0.4s ease-out;
                }
                
                @keyframes swapFlashPulse {
                    0% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.1);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove the flash effect after animation
        setTimeout(() => {
            if (flashContainer.parentNode) {
                flashContainer.parentNode.removeChild(flashContainer);
            }
            resolve();
        }, 400);
    });
}