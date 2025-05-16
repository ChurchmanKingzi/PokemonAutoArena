/**
 * Initiative changes module - handles modifications to initiative during battle
 */
import { getSortedCharacters, setSortedCharacters } from './initiative.js';
import { displayInitiativeOrder } from './initiativeDisplay.js';
import { logBattleEvent } from './battleLog.js';
import { getCurrentTurn } from './turnSystem.js';

// Keep track of characters that have taken their turn in the current round
let currentRoundTakenTurns = new Set();

/**
 * Reset the taken turns tracker at the start of a new round
 */
export function resetTakenTurnsTracker() {
    currentRoundTakenTurns.clear();
}

/**
 * Mark a character as having taken their turn this round
 * @param {string} pokemonId - Unique ID of the Pokémon that took its turn
 */
export function markTurnTaken(pokemonId) {
    currentRoundTakenTurns.add(pokemonId);
}

/**
 * Check if a character has taken their turn this round
 * @param {string} pokemonId - Unique ID of the Pokémon to check
 * @returns {boolean} - Whether the Pokémon has taken its turn
 */
export function hasTakenTurn(pokemonId) {
    return currentRoundTakenTurns.has(pokemonId);
}

/**
 * Apply an initiative change to a specific Pokémon
 * @param {string} pokemonId - Unique ID of the affected Pokémon
 * @param {number} modifier - Value to add to or subtract from initiative (negative for reduction)
 * @param {string} reason - Reason for the initiative change (for logging)
 * @returns {Object} Information about the initiative change including any turn effects
 */
export function changeInitiative(pokemonId, modifier, reason) {
    // Get current sorted characters
    const characters = getSortedCharacters();
    const currentTurn = getCurrentTurn();
    
    // Find the affected Pokémon
    const characterIndex = characters.findIndex(
        entry => entry.character && entry.character.uniqueId === pokemonId
    );
    
    if (characterIndex === -1) return { success: false, message: "Pokémon nicht gefunden" }; 
    
    // Calculate turn position in the current round
    const turnPosition = (currentTurn - 1) % characters.length;
    
    // Check if this Pokémon has already had its turn this round
    const hasTakenTurnAlready = hasTakenTurn(pokemonId);
    
    // Get the Pokémon
    const pokemon = characters[characterIndex];
    
    // Store original roll and apply the change
    const originalRoll = pokemon.initiativeRoll;
    pokemon.initiativeRoll = Math.max(1, pokemon.initiativeRoll + modifier); // Ensure minimum of 1
    
    // Log the change
    let logMessage = `${pokemon.character.name}'s Initiative wurde`;
    
    if (modifier > 0) {
        logMessage += ` erhöht von ${originalRoll} auf ${pokemon.initiativeRoll}`;
    } else if (modifier < 0) {
        logMessage += ` verringert von ${originalRoll} auf ${pokemon.initiativeRoll}`;
    } else {
        return { success: false, message: "Keine Initiative-Änderung" }; // No change, no effect
    }
    
    if (reason) {
        logMessage += ` (${reason})`;
    }
    
    logBattleEvent(logMessage);
    
    // Save original position to compare later
    const originalPosition = characterIndex;
    
    // Re-sort based on initiative
    characters.sort((a, b) => b.initiativeRoll - a.initiativeRoll);
    
    // Store the new sorted order
    setSortedCharacters(characters);
    
    // Update the initiative display
    displayInitiativeOrder(characters);
    
    // Find where the Pokémon ended up
    const newPosition = characters.findIndex(
        entry => entry.character && entry.character.uniqueId === pokemonId
    );
    
    // Initialize result
    const result = {
        success: true,
        originalRoll,
        newRoll: pokemon.initiativeRoll,
        originalPosition,
        newPosition,
        pokemonId,
        pokemonName: pokemon.character.name,
        shouldSkip: false,
        shouldTakeTurnNow: false
    };
    
    // Handle turn order effects:
    
    // Case 1: Pokémon has taken its turn but got slower (newPosition > turnPosition)
    // Should be skipped if it would get another turn this round
    if (hasTakenTurnAlready && newPosition > turnPosition) {
        // Should skip its turn this round
        pokemon.character.skipTurnThisRound = true;
        result.shouldSkip = true;
        
        // No log message for silently skipping
    }
    
    // Case 2: Pokémon hasn't taken its turn but got faster (newPosition < turnPosition)
    // If it's now BEFORE the current turn position but was originally AFTER,
    // it would have been skipped this round, so give it an immediate turn
    if (!hasTakenTurnAlready && newPosition < turnPosition && originalPosition > turnPosition) {
        result.shouldTakeTurnNow = true;
        
        // Log this special case
        logBattleEvent(`${pokemon.character.name} erhält durch die Initiative-Änderung einen sofortigen Zug!`);
    }
    
    return result;
}

/**
 * Apply a paralysis initiative effect (halves the initiative)
 * @param {string} pokemonId - Unique ID of the paralyzed Pokémon
 * @returns {Object} Result of the initiative change
 */
export function applyParalysisInitiativeEffect(pokemonId) {
    // Get current sorted characters
    const characters = getSortedCharacters();
    
    // Find the paralyzed Pokémon
    const characterIndex = characters.findIndex(
        entry => entry.character && entry.character.uniqueId === pokemonId
    );
    
    if (characterIndex === -1) return { success: false, message: "Pokémon nicht gefunden" };
    
    // Get the Pokémon
    const pokemon = characters[characterIndex];
    
    // Calculate the modifier to halve their initiative
    const currentRoll = pokemon.initiativeRoll;
    const newRoll = Math.floor(currentRoll / 2);
    const modifier = newRoll - currentRoll; // This will be negative
    
    // Apply the initiative change
    return changeInitiative(pokemonId, modifier, "Paralyse");
}

/**
 * Get the next Pokémon that should take a turn immediately due to initiative changes
 * @returns {string|null} - Unique ID of the Pokémon that should take a turn, or null if none
 */
export function getNextImmediateTurn() {
    const characters = getSortedCharacters();
    
    // Find any character that should take an immediate turn
    for (const character of characters) {
        if (character.character && character.character.takeTurnImmediately) {
            // Clear the flag
            character.character.takeTurnImmediately = false;
            return character.character.uniqueId;
        }
    }
    
    return null;
}

/**
 * Trigger a Pokémon to take its turn immediately
 * @param {string} pokemonId - Unique ID of the Pokémon to give a turn to
 */
export function triggerImmediateTurn(pokemonId) {
    const characters = getSortedCharacters();
    
    // Find the character
    const character = characters.find(entry => 
        entry.character && entry.character.uniqueId === pokemonId
    );
    
    if (character) {
        character.character.takeTurnImmediately = true;
    }
}
