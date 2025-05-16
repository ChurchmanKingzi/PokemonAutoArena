/**
 * Movement Manager - Interface for the new Pokemon movement system
 */

import { movePokemonByStrategy, calculateMovementRange } from './MovementSystem.js';
import { logBattleEvent } from './battleLog.js';
import { getCharacterPositions } from './characterPositions.js';

/**
 * Initialize the movement system
 */
export function initializeMovementSystem() {
    // Reset any movement-related state if needed
    logBattleEvent("Bewegungssystem initialisiert.");
}

/**
 * Handle movement for a character's turn
 * @param {string} charId - Character ID
 * @returns {Promise<Object>} - Result of the movement
 */
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