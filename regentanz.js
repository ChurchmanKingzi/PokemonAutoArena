/**
 * Regentanz (Rain Dance) attack implementation
 * The user performs an erratic dance movement, then changes weather to rainy
 */

import { updatePokemonPosition } from '../pokemonOverlay.js';
import { getCharacterPositions } from '../characterPositions.js';
import { changeWeather, getCurrentWeather, WEATHER_TYPES } from '../weather.js';
import { logBattleEvent } from '../battleLog.js';
import { GRID_SIZE } from '../config.js';
import { unhighlightActiveCharacter } from '../animationManager.js';

/**
 * Animate the erratic dance movement for Regentanz
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 * @returns {Promise} - Resolves when animation completes
 */
export async function animateRegentanz(charId, character) {
    return new Promise(async (resolve) => {
        const characterPositions = getCharacterPositions();
        const charPos = characterPositions[charId];
        
        if (!charPos) {
            resolve();
            return;
        }
        
        const startX = charPos.x;
        const startY = charPos.y;
        
        // Define all possible adjacent positions for the dance
        const adjacentPositions = [
            { x: startX, y: startY - 1 },     // North
            { x: startX + 1, y: startY - 1 }, // Northeast  
            { x: startX + 1, y: startY },     // East
            { x: startX + 1, y: startY + 1 }, // Southeast
            { x: startX, y: startY + 1 },     // South
            { x: startX - 1, y: startY + 1 }, // Southwest
            { x: startX - 1, y: startY },     // West
            { x: startX - 1, y: startY - 1 }  // Northwest
        ];
        
        // Filter out invalid positions (out of bounds)
        const validPositions = adjacentPositions.filter(pos => 
            pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE
        );
        
        // If we don't have any valid adjacent positions, just do a stationary dance
        if (validPositions.length === 0) {
            // Just wait for the dance duration without movement
            setTimeout(() => {
                resolve();
            }, 1400); // 7 * 200ms
            return;
        }
        
        // Create an erratic dance path with 4-6 random movements
        const danceSteps = 4 + Math.floor(Math.random() * 3); // 4-6 steps
        const dancePath = [];
        
        for (let i = 0; i < danceSteps; i++) {
            // Pick a random valid adjacent position
            const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
            dancePath.push({ ...randomPos });
        }
        
        // Always end back at the starting position
        dancePath.push({ x: startX, y: startY });
        
        let currentIndex = 0;
        
        // Animate through each position in the dance path
        const animateStep = () => {
            if (currentIndex >= dancePath.length) {
                // Animation complete - ensure we're back at original position
                charPos.x = startX;
                charPos.y = startY;
                updatePokemonPosition(charId, startX, startY);
                resolve();
                return;
            }
            
            const nextPos = dancePath[currentIndex];
            
            // Update both visual and data position temporarily for the dance
            charPos.x = nextPos.x;
            charPos.y = nextPos.y;
            updatePokemonPosition(charId, nextPos.x, nextPos.y);
            
            currentIndex++;
            
            // Continue to next step after delay
            setTimeout(animateStep, 200); // 200ms between steps
        };
        
        // Start the animation
        animateStep();
    });
}

/**
 * Handle the complete Regentanz attack sequence
 * @param {string} attackerCharId - Attacker character ID
 * @param {Object} attacker - Attacker character data
 * @returns {Promise} - Resolves when attack completes
 */
export async function handleRegentanz(attackerCharId, attacker) {
    // Log the start of the attack
    logBattleEvent(`${attacker.character.name} führt Regentanz aus und beginnt einen mystischen Tanz!`);
    
    // Perform the erratic dance movement animation
    await animateRegentanz(attackerCharId, attacker.character);
    
    // Check if the user has Nassbrocken item for extended duration
    let duration = 5; // Default duration
    
    if (attacker.character.selectedItem && 
        (attacker.character.selectedItem.name === "Nassbrocken")) {
        duration = 8;
        logBattleEvent(`${attacker.character.name}'s Nassbrocken verstärkt den Tanz und verlängert die Regendauer!`);
    }
    
    // Change weather to Regen
    await changeWeather(WEATHER_TYPES.REGEN, duration);
    
    logBattleEvent(`${attacker.character.name} ruft starken Regen hervor!`);
}

/**
 * Check if Regentanz should be selected based on current weather conditions
 * @returns {boolean} - Whether Regentanz should be used
 */
export function shouldSelectRegentanz() {
    const currentWeather = getCurrentWeather();
    
    // Never select if weather is already Regen
    if (currentWeather.state === WEATHER_TYPES.REGEN) {
        return false;
    }
    
    // 33% chance if weather is Normal
    if (currentWeather.state === WEATHER_TYPES.NORMAL) {
        return Math.random() < 0.15;
    }
    
    // 66% chance if weather is anything else (but not Regen, already checked above)
    return Math.random() < 0.25;
}

/**
 * Check if character has Regentanz and if it should be used this turn
 * @param {Object} character - Character data
 * @returns {Object|null} - Regentanz attack object if it should be used, null otherwise
 */
export function findRegentanz(character) {
    // Check if character has Regentanz attack with available PP
    const regentanz = character.attacks && character.attacks.find(attack => 
        attack.weaponName === "Regentanz" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (!regentanz) {
        return null; // Character doesn't have Regentanz or no PP left
    }
    
    // Check if Regentanz should be selected based on weather
    if (!shouldSelectRegentanz()) {
        return null; // Weather conditions don't favor using Regentanz
    }
    
    return regentanz;
}

/**
 * Check and handle Regentanz move for a character's turn
 * This should be called before other attack selection logic
 * @param {string} charId - Character ID
 * @param {Object} activeCharacter - Active character data
 * @returns {Promise<boolean>} - True if Regentanz was used, false otherwise
 */
export async function checkAndHandleRegentanz(charId, activeCharacter) {
    const regentanz = findRegentanz(activeCharacter.character);
    
    if (!regentanz) {
        return false; // Regentanz not available or not selected
    }
    
    // Reduce PP for the move
    if (regentanz.pp !== undefined && regentanz.currentPP !== undefined) {
        regentanz.currentPP = Math.max(0, regentanz.currentPP - 1);
        logBattleEvent(`${regentanz.weaponName} (${regentanz.currentPP}/${regentanz.pp} AP übrig).`);
    }
    
    // Handle the Regentanz attack
    await handleRegentanz(charId, activeCharacter);
    
    // End turn after using Regentanz
    setTimeout(() => {
        unhighlightActiveCharacter();
        // Import endTurn dynamically to avoid circular dependency
        import('../turnSystem.js').then(module => {
            module.endTurn(activeCharacter);
        });
    }, 100);
    
    return true; // Regentanz was used, turn should end
}