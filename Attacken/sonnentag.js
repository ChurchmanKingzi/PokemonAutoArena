/**
 * Sonnentag (Sunny Day) attack implementation
 * The user performs a circular ritual movement, then changes weather to sunny
 */

import { updatePokemonPosition } from '../pokemonOverlay.js';
import { getCharacterPositions } from '../characterPositions.js';
import { changeWeather, getCurrentWeather, WEATHER_TYPES } from '../weather.js';
import { logBattleEvent } from '../battleLog.js';
import { GRID_SIZE } from '../config.js';
import { unhighlightActiveCharacter } from '../animationManager.js';

/**
 * Animate the circular movement ritual for Sonnentag
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 * @returns {Promise} - Resolves when animation completes
 */
export async function animateSonnentag(charId, character) {
    return new Promise(async (resolve) => {
        const characterPositions = getCharacterPositions();
        const charPos = characterPositions[charId];
        
        if (!charPos) {
            resolve();
            return;
        }
        
        const startX = charPos.x;
        const startY = charPos.y;
        
        // Define the circular path around the starting position
        // Going clockwise starting from the north
        const circularPath = [
            { x: startX, y: startY - 1 },     // North
            { x: startX + 1, y: startY - 1 }, // Northeast  
            { x: startX + 1, y: startY },     // East
            { x: startX + 1, y: startY + 1 }, // Southeast
            { x: startX, y: startY + 1 },     // South
            { x: startX - 1, y: startY + 1 }, // Southwest
            { x: startX - 1, y: startY },     // West
            { x: startX - 1, y: startY - 1 }, // Northwest
            { x: startX, y: startY }          // Return to center
        ];
        
        // Filter out invalid positions (out of bounds) but keep the ritual going
        const validPath = circularPath.filter(pos => 
            pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE
        );
        
        // If we don't have enough valid positions, just stay in place but still do the ritual timing
        if (validPath.length < 3) {
            // Just wait for the ritual duration without movement
            setTimeout(() => {
                resolve();
            }, 1600); // 8 * 200ms
            return;
        }
        
        let currentIndex = 0;
        
        // Animate through each position in the path
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
            
            // Update both visual and data position temporarily for the ritual
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
 * Handle the complete Sonnentag attack sequence
 * @param {string} attackerCharId - Attacker character ID
 * @param {Object} attacker - Attacker character data
 * @returns {Promise} - Resolves when attack completes
 */
export async function handleSonnentag(attackerCharId, attacker) {
    // Log the start of the attack
    logBattleEvent(`${attacker.character.name} führt Sonnentag aus und beginnt ein Sonnenritual!`);
    
    // Perform the circular movement animation
    await animateSonnentag(attackerCharId, attacker.character);
    
    // Check if the user has Heißbrocken item for extended duration
    let duration = 5; // Default duration
    
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log(attacker.character);

    if (attacker.character.selectedItem && 
        (attacker.character.selectedItem.name === "Heißbrocken")) {
        duration = 8;
        logBattleEvent(`${attacker.character.name}'s Heißbrocken verstärkt das Ritual und verlängert die Sonnenscheindauer!`);
    }
    
    // Change weather to Sonne
    await changeWeather(WEATHER_TYPES.SONNE, duration);
    
    logBattleEvent(`${attacker.character.name} ruft intensiven Sonnenschein hervor!`);
}

/**
 * Check if Sonnentag should be selected based on current weather conditions
 * @returns {boolean} - Whether Sonnentag should be used
 */
export function shouldSelectSonnentag() {
    const currentWeather = getCurrentWeather();
    
    // Never select if weather is already Sonne
    if (currentWeather.state === WEATHER_TYPES.SONNE) {
        return false;
    }
    
    // 15% chance if weather is Normal
    if (currentWeather.state === WEATHER_TYPES.NORMAL) {
        return Math.random() < 0.15;
    }
    
    // 25% chance if weather is anything else (but not Sonne, already checked above)
    return Math.random() < 0.25;
}

/**
 * Check if character has Sonnentag and if it should be used this turn
 * @param {Object} character - Character data
 * @returns {Object|null} - Sonnentag attack object if it should be used, null otherwise
 */
export function findSonnentag(character) {
    // Check if character has Sonnentag attack with available PP
    const sonnentag = character.attacks && character.attacks.find(attack => 
        attack.weaponName === "Sonnentag" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (!sonnentag) {
        return null; // Character doesn't have Sonnentag or no PP left
    }
    
    // Check if Sonnentag should be selected based on weather
    if (!shouldSelectSonnentag()) {
        return null; // Weather conditions don't favor using Sonnentag
    }
    
    return sonnentag;
}

/**
 * Check and handle Sonnentag move for a character's turn
 * This should be called before other attack selection logic
 * @param {string} charId - Character ID
 * @param {Object} activeCharacter - Active character data
 * @returns {Promise<boolean>} - True if Sonnentag was used, false otherwise
 */
export async function checkAndHandleSonnentag(charId, activeCharacter) {
    const sonnentag = findSonnentag(activeCharacter.character);
    
    if (!sonnentag) {
        return false; // Sonnentag not available or not selected
    }
    
    // Reduce PP for the move
    if (sonnentag.pp !== undefined && sonnentag.currentPP !== undefined) {
        sonnentag.currentPP = Math.max(0, sonnentag.currentPP - 1);
        logBattleEvent(`${sonnentag.weaponName} (${sonnentag.currentPP}/${sonnentag.pp} AP übrig).`);
    }
    
    // Handle the Sonnentag attack
    await handleSonnentag(charId, activeCharacter);
    
    // End turn after using Sonnentag
    setTimeout(() => {
        unhighlightActiveCharacter();
        // Import endTurn dynamically to avoid circular dependency
        import('../turnSystem.js').then(module => {
            module.endTurn(activeCharacter);
        });
    }, 100);
    
    return true; // Sonnentag was used, turn should end
}
