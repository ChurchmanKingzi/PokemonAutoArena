/**
 * Initiative system for determining turn order
 */

import { rollMultipleD6 } from './diceRoller.js';
import { shuffleArray } from './utils.js';
import { logBattleEvent } from './battleLog.js';

// Store the sorted character list
let sortedCharacters = [];

/**
 * Get the sorted character list
 * @returns {Array} - Sorted character list
 */
export function getSortedCharacters() {
    return sortedCharacters;
}

/**
 * Set the sorted character list
 * @param {Array} characters - New sorted character list
 */
export function setSortedCharacters(characters) {
    sortedCharacters = characters;
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
    
    // Store the sorted list
    sortedCharacters = result;
    
    return result;
}