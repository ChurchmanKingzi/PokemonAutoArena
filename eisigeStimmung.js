/**
 * Eisige Stimmung (Icy Mood) attack implementation
 * The user changes weather to snow and swaps positions with a random ally
 */

import { changeWeather, getCurrentWeather, WEATHER_TYPES } from '../weather.js';
import { logBattleEvent } from '../battleLog.js';
import { unhighlightActiveCharacter } from '../animationManager.js';
import { findValidSwapTargets, swapWithRandomAlly } from '../swapAllies.js';

/**
 * Handle the complete Eisige Stimmung attack sequence
 * @param {string} attackerCharId - Attacker character ID
 * @param {Object} attacker - Attacker character data
 * @returns {Promise} - Resolves when attack completes
 */
export async function handleEisigeStimmung(attackerCharId, attacker) {
    // Log the start of the attack
    logBattleEvent(`${attacker.character.name} führt Eisige Stimmung aus!`);
    
    // First, change the weather to snow
    let duration = 5; // Default duration
    
    if (attacker.character.selectedItem && 
        (attacker.character.selectedItem.name === "Eisbrocken")) {
        duration = 8;
        logBattleEvent(`${attacker.character.name}'s Eisbrocken verstärkt die eisige Stimmung und verlängert die Schneedauer!`);
    }
    
    // Change weather to Schnee
    await changeWeather(WEATHER_TYPES.SCHNEE, duration);
    logBattleEvent(`${attacker.character.name} hüllt das Schlachtfeld in eisige Kälte!`);
    
    // Then, attempt to swap with a random ally
    const swapSuccessful = await swapWithRandomAlly(
        attackerCharId, 
        "🧊 Durch die eisige Stimmung",
        {
            showFlash: true,
            moveCameraToFirst: true,
            moveCameraToBoth: true
        }
    );
    
    if (!swapSuccessful) {
        logBattleEvent(`${attacker.character.name} findet keinen Partner zum Tauschen in der eisigen Kälte.`);
    }
}

/**
 * Check if Eisige Stimmung should be selected based on current weather conditions
 * @returns {boolean} - Whether Eisige Stimmung should be used
 */
export function shouldSelectEisigeStimmung() {
    const currentWeather = getCurrentWeather();
    
    // Never select if weather is already Schnee
    if (currentWeather.state === WEATHER_TYPES.SCHNEE) {
        return false;
    }
    
    // 33% chance if weather is Normal
    if (currentWeather.state === WEATHER_TYPES.NORMAL) {
        return Math.random() < 0.33;
    }
    
    // 66% chance if weather is anything else (but not Schnee, already checked above)
    return Math.random() < 0.66;
}

/**
 * Check if character has Eisige Stimmung and if it should be used this turn
 * This move can only be used if there are valid allies to swap with
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 * @returns {Object|null} - Eisige Stimmung attack object if it should be used, null otherwise
 */
export function findEisigeStimmung(charId, character) {
    // Check if character has Eisige Stimmung attack with available PP
    const eisigeStimmung = character.attacks && character.attacks.find(attack => 
        attack.weaponName === "Eisige Stimmung" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (!eisigeStimmung) {
        return null; // Character doesn't have Eisige Stimmung or no PP left
    }
    
    // Check if there are valid allies to swap with
    const validSwapTargets = findValidSwapTargets(charId);
    if (validSwapTargets.length === 0) {
        return null; // No valid allies to swap with - move cannot be used
    }
    
    // Check if Eisige Stimmung should be selected based on weather
    if (!shouldSelectEisigeStimmung()) {
        return null; // Weather conditions don't favor using Eisige Stimmung
    }
    
    return eisigeStimmung;
}

/**
 * Check and handle Eisige Stimmung move for a character's turn
 * This should be called before other attack selection logic
 * @param {string} charId - Character ID
 * @param {Object} activeCharacter - Active character data
 * @returns {Promise<boolean>} - True if Eisige Stimmung was used, false otherwise
 */
export async function checkAndHandleEisigeStimmung(charId, activeCharacter) {
    const eisigeStimmung = findEisigeStimmung(charId, activeCharacter.character);
    
    if (!eisigeStimmung) {
        return false; // Eisige Stimmung not available or not selected
    }
    
    // Reduce PP for the move
    if (eisigeStimmung.pp !== undefined && eisigeStimmung.currentPP !== undefined) {
        eisigeStimmung.currentPP = Math.max(0, eisigeStimmung.currentPP - 1);
        logBattleEvent(`${eisigeStimmung.weaponName} (${eisigeStimmung.currentPP}/${eisigeStimmung.pp} AP übrig).`);
    }
    
    // Handle the Eisige Stimmung attack
    await handleEisigeStimmung(charId, activeCharacter);
    
    // End turn after using Eisige Stimmung
    setTimeout(() => {
        unhighlightActiveCharacter();
        // Import endTurn dynamically to avoid circular dependency
        import('../turnSystem.js').then(module => {
            module.endTurn(activeCharacter);
        });
    }, 100);
    
    return true; // Eisige Stimmung was used, turn should end
}