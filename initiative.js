/**
 * Initiative system with separated logic and display lists
 */

import { rollMultipleD6 } from './diceRoller.js';
import { shuffleArray } from './utils.js';
import { logBattleEvent } from './battleLog.js';

// Store both lists separately
let sortedCharactersLogic = [];  // Only alive characters for turn processing
let sortedCharactersDisplay = []; // All characters for display purposes

/**
 * Get the sorted characters for logic (only alive characters)
 * @returns {Array} - Sorted characters for turn processing
 */
export function getSortedCharacters() {
    return sortedCharactersLogic;
}

/**
 * Get the sorted characters for display (all characters including defeated)
 * @returns {Array} - Sorted characters for display
 */
export function getSortedCharactersDisplay() {
    return sortedCharactersDisplay;
}

/**
 * Set the sorted characters logic list
 * @param {Array} characters - The characters array for logic
 */
export function setSortedCharacters(characters) {
    sortedCharactersLogic = [...characters];
}

/**
 * Set the sorted characters display list
 * @param {Array} characters - The characters array for display
 */
export function setSortedCharactersDisplay(characters) {
    sortedCharactersDisplay = [...characters];
}

/**
 * Remove a defeated character from the logic list only
 * @param {string} characterId - Unique ID of the defeated character
 */
export function removeDefeatedFromLogic(characterId) {
    const originalLength = sortedCharactersLogic.length;
    
    // Remove from logic list only
    sortedCharactersLogic = sortedCharactersLogic.filter(entry => {
        return entry.character && entry.character.uniqueId !== characterId;
    });
    
    // Log the removal
    if (sortedCharactersLogic.length !== originalLength) {
        const removedCount = originalLength - sortedCharactersLogic.length;
        console.log(`Removed ${removedCount} defeated character(s) from logic list`);
    }
}

/**
 * Mark a character as defeated in the display list
 * @param {string} characterId - Unique ID of the defeated character
 */
export function markDefeatedInDisplay(characterId) {
    // Find the character in the display list and mark as defeated
    sortedCharactersDisplay.forEach(entry => {
        if (entry.character && entry.character.uniqueId === characterId) {
            entry.isDefeated = true;
            entry.character.isDefeated = true;
        }
    });
}

/**
 * Roll initiative for all characters and sort them
 * @param {Array} characterList - List of characters
 * @returns {Array} - Characters sorted by initiative
 */
export function rollInitiativeAndSort(characterList) {
    // Roll initiative for each character
    characterList.forEach(entry => {
        // Default to 1 if INIT is not defined
        const initValue = (entry.character.combatStats && entry.character.combatStats.init) 
            ? entry.character.combatStats.init 
            : 1;
            
        entry.initiativeRoll = rollMultipleD6(initValue);
        
        // Log the roll
        logBattleEvent(`${entry.character.name} rolled initiative: ${entry.initiativeRoll}`);
        
        // Initialize defeated status
        entry.isDefeated = false;
        if (entry.character) {
            entry.character.isDefeated = false;
        }
    });
    
    // First sort by initiative roll (higher first)
    characterList.sort((a, b) => b.initiativeRoll - a.initiativeRoll);
    
    // Then, shuffle characters with the same initiative roll to randomize their order
    const initiativeGroups = {};
    
    // Group characters by initiative roll
    characterList.forEach(entry => {
        if (!initiativeGroups[entry.initiativeRoll]) {
            initiativeGroups[entry.initiativeRoll] = [];
        }
        initiativeGroups[entry.initiativeRoll].push(entry);
    });
    
    // Shuffle each group with the same initiative roll
    for (const roll in initiativeGroups) {
        if (initiativeGroups[roll].length > 1) {
            initiativeGroups[roll] = shuffleArray(initiativeGroups[roll]);
            
            // Log the shuffle
            const names = initiativeGroups[roll].map(entry => entry.character.name).join(', ');
            logBattleEvent(`Tied initiative (${roll}): ${names} - order randomized`);
        }
    }
    
    // Rebuild the list in proper order
    const result = [];
    
    // Collect all unique initiative rolls and sort them descending
    const initiativeRolls = Object.keys(initiativeGroups).map(Number).sort((a, b) => b - a);
    
    // Rebuild the list in the correct order
    initiativeRolls.forEach(roll => {
        initiativeGroups[roll].forEach(entry => {
            result.push(entry);
        });
    });
    
    // Set both lists to the same initial sorted order
    sortedCharactersLogic = [...result];
    sortedCharactersDisplay = [...result];
    
    return result;
}

/**
 * Get next character for their turn (from logic list)
 * @param {number} currentTurn - Current turn number
 * @returns {Object|null} - Next character or null if no characters remain
 */
export function getNextCharacterForTurn(currentTurn) {
    if (sortedCharactersLogic.length === 0) {
        return null;
    }
    
    const turnIndex = (currentTurn - 1) % sortedCharactersLogic.length;
    return sortedCharactersLogic[turnIndex];
}