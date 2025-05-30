/**
 * Enhanced Initiative system with centralized double turn management
 * This ensures double turns are always recalculated when initiative changes
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
 * CENTRALIZED INITIATIVE UPDATE FUNCTION
 * This function should be used whenever initiative values change to ensure
 * double turns are always recalculated and displays are updated
 * 
 * @param {Object} options - Update options
 * @param {boolean} options.recalculateDoubleTurns - Whether to recalculate double turns (default: true)
 * @param {boolean} options.updateDisplay - Whether to update the initiative display (default: true)
 * @param {string} options.source - Source of the change for logging (optional)
 * @returns {boolean} - Whether any changes were made
 */
export async function updateInitiativeOrder({ 
    recalculateDoubleTurns = true, 
    updateDisplay = true, 
    source = null 
} = {}) {
    let changesWereMade = false;

    // Re-sort both lists based on current initiative values
    const originalLogicOrder = sortedCharactersLogic.map(entry => entry.character?.uniqueId).join(',');
    const originalDisplayOrder = sortedCharactersDisplay.map(entry => entry.character?.uniqueId).join(',');

    // Sort both lists
    sortedCharactersLogic.sort((a, b) => b.initiativeRoll - a.initiativeRoll);
    sortedCharactersDisplay.sort((a, b) => b.initiativeRoll - a.initiativeRoll);

    // Check if order actually changed
    const newLogicOrder = sortedCharactersLogic.map(entry => entry.character?.uniqueId).join(',');
    const newDisplayOrder = sortedCharactersDisplay.map(entry => entry.character?.uniqueId).join(',');
    
    if (originalLogicOrder !== newLogicOrder || originalDisplayOrder !== newDisplayOrder) {
        changesWereMade = true;
        
        if (source) {
            console.log(`[Initiative] Order changed due to: ${source}`);
        }
    }

    // Always recalculate double turns when initiative values might have changed
    if (recalculateDoubleTurns) {
        try {
            // Dynamic import to avoid circular dependency
            const { calculateDoubleTurns, logDoubleTurnStatus } = await import('./doubleTurnSystem.js');
            
            console.log('[Initiative] Recalculating double turns...');
            const doubleTurnPokemon = calculateDoubleTurns();
            
            // Log the updated status
            logDoubleTurnStatus();
            
            console.log(`[Initiative] Double turn recalculation complete. Double turn Pokemon: ${Array.from(doubleTurnPokemon).length}`);
        } catch (error) {
            console.error('[Initiative] Error recalculating double turns:', error);
        }
    }

    // Update the initiative display if requested
    if (updateDisplay) {
        try {
            // Dynamic import to avoid circular dependency
            const { displayInitiativeOrder } = await import('./initiativeDisplay.js');
            displayInitiativeOrder(sortedCharactersDisplay);
        } catch (error) {
            console.error('[Initiative] Error updating initiative display:', error);
        }
    }

    return changesWereMade;
}

/**
 * Update initiative value for a specific Pokemon and trigger all necessary recalculations
 * This is the centralized function that should be used for all initiative changes
 * 
 * @param {string} pokemonId - Unique ID of the Pokemon
 * @param {number} newInitiativeValue - New initiative value
 * @param {string} source - Source of the change for logging
 * @param {boolean} preserveOriginal - Whether to preserve the original roll value (default: true)
 * @returns {Object} - Result object with success status and details
 */
export async function updatePokemonInitiative(pokemonId, newInitiativeValue, source = 'Unknown', preserveOriginal = true) {
    console.log(`[Initiative] Updating ${pokemonId} initiative to ${newInitiativeValue} (source: ${source})`);
    
    let pokemonFound = false;
    let oldValue = 0;
    
    // Update in both logic and display lists
    const listsToUpdate = [
        { list: sortedCharactersLogic, name: 'logic' },
        { list: sortedCharactersDisplay, name: 'display' }
    ];
    
    for (const { list, name } of listsToUpdate) {
        const pokemonEntry = list.find(entry => 
            entry.character && entry.character.uniqueId === pokemonId
        );
        
        if (pokemonEntry) {
            pokemonFound = true;
            oldValue = pokemonEntry.initiativeRoll;
            
            // Preserve original roll if this is the first change and preserveOriginal is true
            if (preserveOriginal && !pokemonEntry.originalInitiativeRollBeforeWeatherAbility) {
                pokemonEntry.originalInitiativeRollBeforeWeatherAbility = oldValue;
            }
            
            // Update the initiative value
            pokemonEntry.initiativeRoll = newInitiativeValue;
            
            console.log(`[Initiative] Updated ${pokemonId} in ${name} list: ${oldValue} → ${newInitiativeValue}`);
        }
    }
    
    if (!pokemonFound) {
        console.warn(`[Initiative] Pokemon ${pokemonId} not found in initiative lists`);
        return { 
            success: false, 
            message: `Pokemon ${pokemonId} not found in initiative lists` 
        };
    }
    
    // Log the change if there was an actual change
    if (oldValue !== newInitiativeValue) {
        // Get Pokemon name for logging
        const pokemonEntry = sortedCharactersLogic.find(entry => 
            entry.character && entry.character.uniqueId === pokemonId
        ) || sortedCharactersDisplay.find(entry => 
            entry.character && entry.character.uniqueId === pokemonId
        );
        
        const pokemonName = pokemonEntry?.character?.name || pokemonId;
        
        if (newInitiativeValue > oldValue) {
            logBattleEvent(`${pokemonName}'s Initiative wurde erhöht von ${oldValue} auf ${newInitiativeValue} (${source})`);
        } else {
            logBattleEvent(`${pokemonName}'s Initiative wurde verringert von ${oldValue} auf ${newInitiativeValue} (${source})`);
        }
    }
    
    // Trigger centralized update
    const changesWereMade = await updateInitiativeOrder({ 
        recalculateDoubleTurns: true, 
        updateDisplay: true, 
        source 
    });
    
    return {
        success: true,
        pokemonId,
        oldValue,
        newValue: newInitiativeValue,
        changesWereMade,
        source
    };
}

/**
 * Batch update multiple Pokemon initiative values
 * More efficient than calling updatePokemonInitiative multiple times
 * 
 * @param {Array} updates - Array of {pokemonId, newValue, source} objects
 * @returns {Array} - Array of result objects
 */
export async function batchUpdatePokemonInitiative(updates) {
    console.log(`[Initiative] Batch updating ${updates.length} Pokemon initiative values`);
    
    const results = [];
    
    // Apply all updates first without triggering recalculations
    for (const { pokemonId, newValue, source = 'Batch Update' } of updates) {
        let pokemonFound = false;
        let oldValue = 0;
        
        // Update in both logic and display lists
        const listsToUpdate = [
            { list: sortedCharactersLogic, name: 'logic' },
            { list: sortedCharactersDisplay, name: 'display' }
        ];
        
        for (const { list, name } of listsToUpdate) {
            const pokemonEntry = list.find(entry => 
                entry.character && entry.character.uniqueId === pokemonId
            );
            
            if (pokemonEntry) {
                pokemonFound = true;
                oldValue = pokemonEntry.initiativeRoll;
                
                // Preserve original roll if this is the first change
                if (!pokemonEntry.originalInitiativeRollBeforeWeatherAbility) {
                    pokemonEntry.originalInitiativeRollBeforeWeatherAbility = oldValue;
                }
                
                // Update the initiative value
                pokemonEntry.initiativeRoll = newValue;
                
                console.log(`[Initiative] Batch updated ${pokemonId} in ${name} list: ${oldValue} → ${newValue}`);
            }
        }
        
        // Log individual changes
        if (pokemonFound && oldValue !== newValue) {
            const pokemonEntry = sortedCharactersLogic.find(entry => 
                entry.character && entry.character.uniqueId === pokemonId
            ) || sortedCharactersDisplay.find(entry => 
                entry.character && entry.character.uniqueId === pokemonId
            );
            
            const pokemonName = pokemonEntry?.character?.name || pokemonId;
            
            if (newValue > oldValue) {
                logBattleEvent(`${pokemonName}'s Initiative wurde erhöht von ${oldValue} auf ${newValue} (${source})`);
            } else {
                logBattleEvent(`${pokemonName}'s Initiative wurde verringert von ${oldValue} auf ${newValue} (${source})`);
            }
        }
        
        results.push({
            success: pokemonFound,
            pokemonId,
            oldValue,
            newValue,
            source
        });
    }
    
    // Trigger single centralized update for all changes
    const changesWereMade = await updateInitiativeOrder({ 
        recalculateDoubleTurns: true, 
        updateDisplay: true, 
        source: 'Batch Update' 
    });
    
    // Update all results with the changesWereMade flag
    results.forEach(result => {
        result.changesWereMade = changesWereMade;
    });
    
    return results;
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
        
        // Recalculate double turns when the participant list changes
        updateInitiativeOrder({ 
            recalculateDoubleTurns: true, 
            updateDisplay: false, 
            source: 'Character Defeated' 
        });
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
    
    // Calculate initial double turns
    updateInitiativeOrder({ 
        recalculateDoubleTurns: true, 
        updateDisplay: true, 
        source: 'Initial Roll' 
    });
    
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

// Export for legacy compatibility and external access
window.gameModules = window.gameModules || {};
window.gameModules.initiative = { 
    getSortedCharacters, 
    getSortedCharactersDisplay,
    updateInitiativeOrder,
    updatePokemonInitiative,
    batchUpdatePokemonInitiative
};