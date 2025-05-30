/**
 * Movement Manager - Interface for the new Pokemon movement system
 */

import { movePokemonByStrategy, calculateMovementRange } from './MovementSystem.js';
import { hasStatusEffect } from './statusEffects.js';
import { logBattleEvent } from './battleLog.js';
import { getCharacterPositions } from './characterPositions.js';

/**
 * Initialize the movement system
 */
export function initializeMovementSystem() {
    // Reset any movement-related state if needed
    logBattleEvent("Bewegungssystem initialisiert.");
}

export async function handleCharacterMovement(charId) {
    const positions = getCharacterPositions();
    const pokemonData = positions[charId];
    
    if (!pokemonData) {
        logBattleEvent(`Fehler: Keine Daten für Charakter-ID ${charId} gefunden.`);
        return { success: false, message: "Character not found" };
    }
    
    if (pokemonData.isDefeated) {
        logBattleEvent(`${pokemonData.character.name} ist besiegt und kann sich nicht bewegen.`);
        return { success: false, message: "Character is defeated" };
    }
    
    // Check for status effects that prevent movement
    if (hasStatusEffect(pokemonData.character, 'frozen')) {
        logBattleEvent(`${pokemonData.character.name} ist eingefroren und kann sich nicht bewegen.`);
        return { success: true, moved: false, message: "Frozen" };
    }
    
    if (hasStatusEffect(pokemonData.character, 'asleep')) {
        logBattleEvent(`${pokemonData.character.name} schläft und kann sich nicht bewegen.`);
        return { success: true, moved: false, message: "Asleep" };
    }
    
    // Check for the snared status effect (Fadenschuss)
    if (hasStatusEffect(pokemonData.character, 'snared')) {
        logBattleEvent(`${pokemonData.character.name} ist verstrickt und kann sich nicht bewegen.`);
        return { success: true, moved: false, message: "Snared" };
    }
    
    // Check for held status
    if (hasStatusEffect(pokemonData.character, 'held')) {
        logBattleEvent(`${pokemonData.character.name} wird festgehalten und kann sich nicht bewegen.`);
        return { success: true, moved: false, message: "Held" };
    }
    
    try {
        // Start movement phase
        logBattleEvent(`${pokemonData.character.name} beginnt Bewegungsphase.`);
        
        // Move the character based on strategy
        const result = await movePokemonByStrategy(pokemonData);
        
        if (result) {
            return { 
                success: true, 
                moved: true, 
                path: result.path,
                endPosition: { x: result.x, y: result.y }
            };
        } else {
            return { 
                success: true, 
                moved: false, 
                message: "No movement executed" 
            };
        }
    } catch (error) {
        console.error("Error during character movement:", error);
        logBattleEvent(`Fehler bei der Bewegung von ${pokemonData.character.name}: ${error.message}`);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * Get the movement range for a character
 * @param {Object} character - Character data
 * @returns {number} - Movement range in tiles
 */
export function getCharacterMovementRange(character) {
    return calculateMovementRange(character);
}

/**
 * Visualize possible movement tiles for a character
 * @param {string} charId - Character ID
 * @returns {Array} - Array of valid movement tiles {x, y}
 */
export function visualizeMovementRange(charId) {
    const positions = getCharacterPositions();
    const pokemonData = positions[charId];
    
    if (!pokemonData || pokemonData.isDefeated) {
        return [];
    }
    
    // Calculate movement range
    const movementRange = calculateMovementRange(pokemonData.character);
    
    // Get current position
    const currentX = pokemonData.x;
    const currentY = pokemonData.y;
    
    // Import findReachablePositions without using await (this is synchronous)
    const { findReachablePositions } = require('./PathfindingSystem.js');
    
    // Find all reachable positions
    const reachablePositions = findReachablePositions(
        currentX,
        currentY,
        movementRange,
        pokemonData.character,
        charId,
        pokemonData.character.strategy || 'aggressive'
    );
    
    // Return array of {x, y} positions
    return reachablePositions.map(pos => ({ x: pos.x, y: pos.y }));
}

/**
 * Extra utility functions for debugging or interface
 */

/**
 * Get the character at a specific position
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {Object|null} - Character data or null if no character
 */
export function getCharacterAtPosition(x, y) {
    const positions = getCharacterPositions();
    
    for (const charId in positions) {
        const pos = positions[charId];
        if (pos.x === x && pos.y === y && !pos.isDefeated) {
            return {
                id: charId,
                character: pos.character,
                teamIndex: pos.teamIndex
            };
        }
    }
    
    return null;
}

/**
 * Map all characters and their current movement ranges
 * @returns {Object} - Map of character IDs to their movement ranges
 */
export function mapCharacterMovementRanges() {
    const positions = getCharacterPositions();
    const movementMap = {};
    
    for (const charId in positions) {
        const pos = positions[charId];
        if (!pos.isDefeated) {
            movementMap[charId] = calculateMovementRange(pos.character);
        }
    }
    
    return movementMap;
}

/**
 * Check if a Pokémon can move based on its status effects
 * @param {Object} pokemon - The Pokémon to check
 * @returns {Object} - Result with success flag and reason if can't move
 */
export function canPokemonMove(pokemon) {
    if (!pokemon) {
        return { canMove: false, reason: "No Pokémon data" };
    }
    
    // Check for status effects that prevent movement
    if (hasStatusEffect(pokemon, 'frozen')) {
        return { canMove: false, reason: "eingefroren" };
    }
    
    if (hasStatusEffect(pokemon, 'asleep')) {
        return { canMove: false, reason: "schlafend" };
    }
    
    // Check for the snared status effect from Fadenschuss
    if (hasStatusEffect(pokemon, 'snared')) {
        return { canMove: false, reason: "verstrickt" };
    }
    
    // Check for any other effects that prevent movement
    if (hasStatusEffect(pokemon, 'held')) {
        return { canMove: false, reason: "festgehalten" };
    }
    
    return { canMove: true };
}