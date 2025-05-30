/**
 * Sandsturm (Sandstorm) attack implementation
 * The user performs a spiraling whirlwind movement, then changes weather to sandstorm
 */

import { updatePokemonPosition } from '../pokemonOverlay.js';
import { getCharacterPositions } from '../characterPositions.js';
import { changeWeather, getCurrentWeather, WEATHER_TYPES } from '../weather.js';
import { logBattleEvent } from '../battleLog.js';
import { GRID_SIZE } from '../config.js';
import { unhighlightActiveCharacter } from '../animationManager.js';

/**
 * Animate the spiraling whirlwind movement for Sandsturm
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 * @returns {Promise} - Resolves when animation completes
 */
export async function animateSandsturm(charId, character) {
    return new Promise(async (resolve) => {
        const characterPositions = getCharacterPositions();
        const charPos = characterPositions[charId];
        
        if (!charPos) {
            resolve();
            return;
        }
        
        const startX = charPos.x;
        const startY = charPos.y;
        
        // Create a spiraling whirlwind pattern that expands outward and then contracts back
        // This represents the Pokemon whipping up sand and debris in a cyclonic motion
        const spiralPath = [];
        
        // First, rapid spinning in place (3 quick spins)
        const spinPositions = [
            { x: startX, y: startY - 1 },     // North
            { x: startX + 1, y: startY },     // East  
            { x: startX, y: startY + 1 },     // South
            { x: startX - 1, y: startY },     // West
            { x: startX, y: startY - 1 },     // North again
            { x: startX + 1, y: startY },     // East again
            { x: startX, y: startY + 1 },     // South again
            { x: startX - 1, y: startY },     // West again
            { x: startX, y: startY - 1 },     // North final
        ];
        
        // Then expanding spiral outward
        const expandingSpiral = [
            { x: startX + 1, y: startY - 1 }, // Northeast (distance 1)
            { x: startX + 1, y: startY + 1 }, // Southeast
            { x: startX - 1, y: startY + 1 }, // Southwest
            { x: startX - 1, y: startY - 1 }, // Northwest
            { x: startX, y: startY - 2 },     // North (distance 2)
            { x: startX + 2, y: startY },     // East
            { x: startX, y: startY + 2 },     // South
            { x: startX - 2, y: startY },     // West
        ];
        
        // Then contracting spiral back inward
        const contractingSpiral = [
            { x: startX - 1, y: startY - 1 }, // Northwest (distance 1)
            { x: startX + 1, y: startY - 1 }, // Northeast
            { x: startX + 1, y: startY + 1 }, // Southeast
            { x: startX - 1, y: startY + 1 }, // Southwest
            { x: startX, y: startY }          // Return to center
        ];
        
        // Combine all movements
        spiralPath.push(...spinPositions, ...expandingSpiral, ...contractingSpiral);
        
        // Filter out invalid positions (out of bounds) but keep the whirlwind going
        const validPath = spiralPath.map(pos => {
            // Clamp positions to grid bounds
            return {
                x: Math.max(0, Math.min(GRID_SIZE - 1, pos.x)),
                y: Math.max(0, Math.min(GRID_SIZE - 1, pos.y))
            };
        });
        
        // Ensure we always end at the starting position
        validPath.push({ x: startX, y: startY });
        
        let currentIndex = 0;
        
        // Animate through each position in the spiral path
        const animateStep = () => {
            if (currentIndex >= validPath.length) {
                // Animation complete - ensure we're back at original position
                charPos.x = startX;
                charPos.y = startY;
                updatePokemonPosition(charId, startX, startY);
                resolve();
                return;
            }
            
            const nextPos = validPath[currentIndex];
            
            // Update both visual and data position temporarily for the whirlwind
            charPos.x = nextPos.x;
            charPos.y = nextPos.y;
            updatePokemonPosition(charId, nextPos.x, nextPos.y);
            
            currentIndex++;
            
            // Variable speed: faster for initial spins, slower for expanding/contracting
            let stepDelay = 120; // Default fast speed for spinning
            
            if (currentIndex > spinPositions.length && currentIndex <= spinPositions.length + expandingSpiral.length) {
                stepDelay = 180; // Slower for expanding spiral
            } else if (currentIndex > spinPositions.length + expandingSpiral.length) {
                stepDelay = 150; // Medium speed for contracting
            }
            
            // Continue to next step after delay
            setTimeout(animateStep, stepDelay);
        };
        
        // Start the animation
        animateStep();
    });
}

/**
 * Handle the complete Sandsturm attack sequence
 * @param {string} attackerCharId - Attacker character ID
 * @param {Object} attacker - Attacker character data
 * @returns {Promise} - Resolves when attack completes
 */
export async function handleSandsturm(attackerCharId, attacker) {
    // Log the start of the attack
    logBattleEvent(`${attacker.character.name} führt Sandsturm aus und beginnt wild zu wirbeln!`);
    
    // Perform the spiraling whirlwind movement animation
    await animateSandsturm(attackerCharId, attacker.character);
    
    // Check if the user has Glattbrocken item for extended duration
    let duration = 5; // Default duration
    
    if (attacker.character.selectedItem && 
        (attacker.character.selectedItem.name === "Glattbrocken")) {
        duration = 8;
        logBattleEvent(`${attacker.character.name}'s Glattbrocken verstärkt den Wirbelsturm und verlängert die Sandsturmdauer!`);
    }
    
    // Change weather to Sandsturm
    await changeWeather(WEATHER_TYPES.SANDSTURM, duration);
    
    logBattleEvent(`${attacker.character.name} wirbelt einen gewaltigen Sandsturm auf!`);
}

/**
 * Check if Sandsturm should be selected based on current weather conditions
 * @returns {boolean} - Whether Sandsturm should be used
 */
export function shouldSelectSandsturm() {
    const currentWeather = getCurrentWeather();
    
    // Never select if weather is already Sandsturm
    if (currentWeather.state === WEATHER_TYPES.SANDSTURM) {
        return false;
    }
    
    // 33% chance if weather is Normal
    if (currentWeather.state === WEATHER_TYPES.NORMAL) {
        return Math.random() < 0.15;
    }
    
    // 66% chance if weather is anything else (but not Sandsturm, already checked above)
    return Math.random() < 0.25;
}

/**
 * Check if character has Sandsturm and if it should be used this turn
 * @param {Object} character - Character data
 * @returns {Object|null} - Sandsturm attack object if it should be used, null otherwise
 */
export function findSandsturm(character) {
    // Check if character has Sandsturm attack with available PP
    const sandsturm = character.attacks && character.attacks.find(attack => 
        attack.weaponName === "Sandsturm" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (!sandsturm) {
        return null; // Character doesn't have Sandsturm or no PP left
    }
    
    // Check if Sandsturm should be selected based on weather
    if (!shouldSelectSandsturm()) {
        return null; // Weather conditions don't favor using Sandsturm
    }
    
    return sandsturm;
}

/**
 * Check and handle Sandsturm move for a character's turn
 * This should be called before other attack selection logic
 * @param {string} charId - Character ID
 * @param {Object} activeCharacter - Active character data
 * @returns {Promise<boolean>} - True if Sandsturm was used, false otherwise
 */
export async function checkAndHandleSandsturm(charId, activeCharacter) {
    const sandsturm = findSandsturm(activeCharacter.character);
    
    if (!sandsturm) {
        return false; // Sandsturm not available or not selected
    }
    
    // Reduce PP for the move
    if (sandsturm.pp !== undefined && sandsturm.currentPP !== undefined) {
        sandsturm.currentPP = Math.max(0, sandsturm.currentPP - 1);
        logBattleEvent(`${sandsturm.weaponName} (${sandsturm.currentPP}/${sandsturm.pp} AP übrig).`);
    }
    
    // Handle the Sandsturm attack
    await handleSandsturm(charId, activeCharacter);
    
    // End turn after using Sandsturm
    setTimeout(() => {
        unhighlightActiveCharacter();
        // Import endTurn dynamically to avoid circular dependency
        import('../turnSystem.js').then(module => {
            module.endTurn(activeCharacter);
        });
    }, 100);
    
    return true; // Sandsturm was used, turn should end
}