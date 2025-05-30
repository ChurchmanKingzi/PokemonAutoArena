/**
 * Initiative changes module - handles modifications to initiative during battle
 * Updated to use the centralized initiative management system
 */
import { getSortedCharacters, updatePokemonInitiative } from './initiative.js';
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
 * Apply an initiative change to a specific Pokémon using stage-based system
 * Now uses the centralized initiative management system
 * 
 * @param {string} pokemonId - Unique ID of the affected Pokémon
 * @param {number} stageChange - Number of stages to change (-6 to +6)
 * @param {string} reason - Reason for the initiative change (for logging)
 * @returns {Object} Information about the initiative change including any turn effects
 */
export async function changeInitiative(pokemonId, stageChange, reason) {
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
    
    // Store original roll and position
    const originalRoll = pokemon.initiativeRoll;
    const originalPosition = characterIndex;

    // Define stage multipliers - same as in statChanges.js
    const stageMultipliers = {
        "-6": 0.25, "-5": 0.28, "-4": 0.33, "-3": 0.4, "-2": 0.5, "-1": 0.67,
        "0": 1,
        "1": 1.5, "2": 2, "3": 2.5, "4": 3, "5": 3.5, "6": 4
    };

    // Initialize or get current initiative stage
    if (!pokemon.initiativeStage) {
        pokemon.initiativeStage = 0;
    }
    
    // Calculate new stage value, clamped to -6 to +6
    const newStage = Math.max(-6, Math.min(6, pokemon.initiativeStage + stageChange));
    
    // If no stage change, don't do anything
    if (newStage === pokemon.initiativeStage) {
        return { 
            success: false, 
            message: stageChange > 0 
                ? `${pokemon.character.name}'s Initiative kann nicht weiter erhöht werden.`
                : `${pokemon.character.name}'s Initiative kann nicht weiter gesenkt werden.`
        };
    }
    
    // Get original base initiative (before any stage modifiers)
    // If not stored, current value is assumed to be the base
    if (!pokemon.originalInitiativeRoll) {
        // This is the first change, save the original value
        pokemon.originalInitiativeRoll = originalRoll;
    }
    
    // Calculate new initiative based on original value and new stage multiplier
    const baseInitiative = pokemon.originalInitiativeRoll;
    const stageMultiplier = stageMultipliers[newStage.toString()];
    const newInitiativeValue = Math.max(1, Math.round(baseInitiative * stageMultiplier));
    
    // Store the new stage value
    pokemon.initiativeStage = newStage;
    
    // Use the centralized initiative update system
    // This will automatically handle:
    // - Updating both logic and display lists
    // - Re-sorting initiative order
    // - Recalculating double turns  ← This is the key fix!
    // - Updating the display
    const updateResult = await updatePokemonInitiative(
        pokemonId, 
        newInitiativeValue, 
        reason,
        false // Don't preserve original since we're handling it manually
    );
    
    if (!updateResult.success) {
        return { 
            success: false, 
            message: `Fehler beim Aktualisieren der Initiative: ${updateResult.message}` 
        };
    }
    
    // Find where the Pokémon ended up after the centralized update
    const updatedCharacters = getSortedCharacters();
    const newPosition = updatedCharacters.findIndex(
        entry => entry.character && entry.character.uniqueId === pokemonId
    );
    
    // Initialize result
    const result = {
        success: true,
        originalRoll,
        newRoll: newInitiativeValue,
        originalPosition,
        newPosition,
        pokemonId,
        pokemonName: pokemon.character.name,
        shouldSkip: false,
        shouldTakeTurnNow: false,
        stageChange: newStage - (pokemon.initiativeStage - stageChange), // Actual stage change applied
        newStage: newStage
    };
    
    // Handle turn order effects:
    // Case 1: Pokémon has taken its turn but got slower (newPosition > turnPosition)
    if (hasTakenTurnAlready && newPosition > turnPosition) {
        // Should skip its turn this round
        pokemon.character.skipTurnThisRound = true;
        result.shouldSkip = true;
        
        logBattleEvent(`${pokemon.character.name} verliert durch die Initiative-Änderung den restlichen Zug dieser Runde!`);
    }
    
    // Case 2: Pokémon hasn't taken its turn but got faster (newPosition < turnPosition)
    if (!hasTakenTurnAlready && newPosition < turnPosition && originalPosition > turnPosition) {
        result.shouldTakeTurnNow = true;
        
        // Log this special case
        logBattleEvent(`${pokemon.character.name} erhält durch die Initiative-Änderung einen sofortigen Zug!`);
    }
    
    console.log(`[InitiativeChanges] Successfully updated ${pokemon.character.name}'s initiative using centralized system`);
    
    return result;
}

/**
 * Apply a paralysis initiative effect (reduces initiative by 2 stages)
 * @param {string} pokemonId - Unique ID of the paralyzed Pokémon
 * @returns {Object} Result of the initiative change
 */
export async function applyParalysisInitiativeEffect(pokemonId) {
    return await changeInitiative(pokemonId, -2, "Paralyse");
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

/**
 * Check if all living Pokemon have taken their turn this round
 * @returns {boolean} - Whether all living Pokemon have taken their turn
 */
export function allPokemonHaveTakenTurn() {
    const characters = getSortedCharacters();
    
    // Check if all characters have taken their turn
    return characters.every(entry => hasTakenTurn(entry.character.uniqueId));
}

/**
 * Get the next Pokemon that should take their turn (hasn't taken turn yet)
 * @returns {Object|null} - Next character entry or null if all have taken their turn
 */
export function getNextPokemonForTurn() {
    const characters = getSortedCharacters();
    
    // Find the first character in initiative order that hasn't taken their turn
    for (const character of characters) {
        if (!hasTakenTurn(character.character.uniqueId)) {
            return character;
        }
    }
    
    return null; // All have taken their turn
}

/**
 * Get remaining Pokemon count that haven't taken their turn this round
 * @returns {number} - Number of Pokemon that still need to act this round
 */
export function getRemainingTurnsThisRound() {
    const characters = getSortedCharacters();
    
    return characters.filter(entry => !hasTakenTurn(entry.character.uniqueId)).length;
}

/**
 * Check if a new round should start based on turn completion
 * @returns {boolean} - Whether a new round should start
 */
export function shouldStartNewRound() {
    return allPokemonHaveTakenTurn();
}