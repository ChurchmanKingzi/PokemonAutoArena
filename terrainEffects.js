/**
 * Terrain effects system for the battle simulator
 */

import { TERRAIN_TYPES } from './terrainGenerator.js';
import { getTerrainGrid } from './terrainGenerator.js';
import { hasStatusEffect, addStatusEffect } from './statusEffects.js';

// Track swimming checks by turn
let swimmingRegistry = {
    // Format: { turnNumber: { charId: true } }
};

/**
 * Reset all swimming registry entries
 */
export function resetSwimmingRegistry() {
    swimmingRegistry = {};
    console.log("Swimming registry reset.");
}

/**
 * Reset swimming registry for a new turn
 * @param {number} turnNumber - Current turn number
 */
export function resetSwimmingRegistryForTurn(turnNumber) {
    // Clear only the registry for this turn
    swimmingRegistry[turnNumber] = {};
    console.log(`Swimming registry reset for turn ${turnNumber}.`);
}

/**
 * Check if a character has passed a swimming check for the current turn
 * @param {string} charId - Character ID
 * @param {number} turnNumber - Current turn number
 * @returns {boolean} - Whether the character has passed swimming check this turn
 */
export function hasPassedSwimmingCheck(charId, turnNumber) {
    return swimmingRegistry[turnNumber] && swimmingRegistry[turnNumber][charId] === true;
}

/**
 * Mark character as having passed swimming check for current turn
 * @param {string} charId - Character ID
 * @param {number} turnNumber - Current turn number
 */
export function markSwimmingCheckPassed(charId, turnNumber) {
    if (!swimmingRegistry[turnNumber]) {
        swimmingRegistry[turnNumber] = {};
    }
    swimmingRegistry[turnNumber][charId] = true;
    console.log(`Character ${charId} marked as passed swimming check for turn ${turnNumber}`);
}

/**
 * Check if a line of sight passes through any mountains
 * @param {number} startX - Start X position
 * @param {number} startY - Start Y position
 * @param {number} endX - End X position
 * @param {number} endY - End Y position
 * @param {boolean} attackerOnMountain - Whether the attacker is on a mountain
 * @returns {boolean} - Whether the line of sight is blocked
 */
export function isLineOfSightBlockedByMountain(startX, startY, endX, endY, attackerOnMountain = false, attacker = null) {
    // Check if attacker is flying
    if (attacker && attacker.terrainAttributes && attacker.terrainAttributes.fliegend) {
        return false; // Flying Pokemon can see over mountains
    }
    
    // Rest of the function remains the same
    if (attackerOnMountain) {
        return false;
    }
    
    const terrainGrid = getTerrainGrid();
    if (!terrainGrid || terrainGrid.length === 0) {
        return false;
    }
    
    // Calculate direction vector
    const dx = endX - startX;
    const dy = endY - startY;
    
    // Get distance (in grid cells)
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Normalized direction
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
    
    // Check each tile along the line
    for (let i = 1; i < distance; i++) {
        // Calculate the position to check (using precision to avoid rounding issues)
        const checkX = Math.round(startX + stepX * i);
        const checkY = Math.round(startY + stepY * i);
        
        // Skip checking the start and end positions
        if ((checkX === startX && checkY === startY) || 
            (checkX === endX && checkY === endY)) {
            continue;
        }
        
        // Check if there's a mountain at this position
        if (terrainGrid[checkY] && terrainGrid[checkY][checkX] === TERRAIN_TYPES.MOUNTAIN) {
            return true; // Line of sight is blocked by a mountain
        }
    }
    
    return false; // Line of sight is not blocked
}

/**
 * Get the terrain type at a specific position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate 
 * @returns {string} - Terrain type
 */
export function getTerrainAt(x, y) {
    const terrainGrid = getTerrainGrid();
    
    if (terrainGrid && terrainGrid[y] && terrainGrid[y][x]) {
        return terrainGrid[y][x];
    }
    
    return TERRAIN_TYPES.GRASS; // Default to grass
}

/**
 * Get lava terrain weight multiplier based on Pokemon types
 * @param {Object} character - The character/Pokemon
 * @returns {number} - Weight multiplier for pathfinding (0.1, 0.5, 1, or 2)
 */
export function getLavaWeightMultiplier(character) {
    if (!character || !character.pokemonTypes) {
        return 1; // Default normal weight
    }
    
    // Check if character is already burned - treat lava as normal terrain
    if (hasStatusEffect(character, 'burned')) {
        return 1; // Normal weight if already burned
    }
    
    const types = character.pokemonTypes.map(type => 
        typeof type === 'string' ? type.toLowerCase() : type
    );
    
    // Fire type Pokemon view lava as weight 0.1 (very low weight)
    if (types.includes('fire')) {
        return 0.1; // Very low weight to make it preferable
    }
    
    // Flying Pokemon also have reduced weight but not as much as fire types
    if (character.terrainAttributes && character.terrainAttributes.fliegend) {
        return 0.2; // Low but not minimal
    }
    
    // Check for Rock type and types weak to lava
    const hasRockType = types.includes('rock');
    const hasWeakType = types.includes('grass') || types.includes('bug') || types.includes('ice');
    
    // Rock type AND a weak type cancel each other out
    if (hasRockType && hasWeakType) {
        return 1; // Normal weight
    }
    
    // Rock type Pokemon (without weak types) view lava with half weight
    if (hasRockType) {
        return 0.5;
    }
    
    // Grass, Bug, or Ice type Pokemon view lava with double weight
    if (hasWeakType) {
        return 2;
    }
    
    // Default: normal weight
    return 1;
}

/**
 * Get mountain movement cost based on Pokemon types
 * @param {Object} character - The character/Pokemon
 * @returns {number} - Movement cost (1, 2, 3, or 4)
 */
export function getMountainMovementCost(character) {
    // Flying Pokemon automatically use only 1 movement
    if (character && character.terrainAttributes && character.terrainAttributes.fliegend) {
        return 1;
    }
    
    // If no character or no types data, default to 2
    if (!character || !character.pokemonTypes || !Array.isArray(character.pokemonTypes)) {
        return 2; // Default cost of 2 for unknown types
    }
    
    // Extract types (ensure they're lowercase strings)
    const types = character.pokemonTypes.map(type => 
        typeof type === 'string' ? type.toLowerCase() : type
    );
    
    // Check for lowest cost type (1 movement point)
    if (types.some(type => 
        ['flying', 'dragon', 'rock', 'ground', 'steel'].includes(type))) {
        return 1;
    }
    
    // Check for second tier types (2 movement points)
    if (types.some(type => 
        ['fire', 'electric', 'fighting', 'bug', 'ghost', 'dark', 'normal'].includes(type))) {
        return 2;
    }
    
    // Check for third tier types (3 movement points)
    if (types.some(type => 
        ['grass', 'ice', 'fairy'].includes(type))) {
        return 3;
    }
    
    // Check for fourth tier types (4 movement points)
    if (types.some(type => 
        ['water', 'poison', 'psychic'].includes(type))) {
        return 4;
    }
    
    // Default fallback
    return 2;
}

/**
 * Apply lava effects to a character (burn status)
 * @param {Object} character - The character/Pokemon
 * @returns {Object} - Message and whether the effect was applied
 */
export function applyLavaEffect(character) {
    // Skip if character is null
    if (!character) {
        return { applied: false, message: null };
    }
        
    // Skip if character is already burned
    if (hasStatusEffect(character, 'burned')) {
        return { applied: false, message: null };
    }
    
    // Skip if character is a fire type
    if (character.pokemonTypes && character.pokemonTypes.some(type => {
        const typeName = typeof type === 'string' ? type.toLowerCase() : type;
        return typeName === 'fire';
    })) {
        return { applied: false, message: null };
    }
    
    // Apply burned status
    const applied = addStatusEffect(character, 'burned');
    
    if (applied) {
        return { 
            applied: true, 
            message: `${character.name} wird durch die Lava verbrannt!` 
        };
    }
    
    return { applied: false, message: null };
}

/**
 * Get swamp terrain weight multiplier based on Pokemon types and status
 * @param {Object} character - The character/Pokemon
 * @returns {number} - Weight multiplier for pathfinding
 */
export function getSwampWeightMultiplier(character) {
    if (!character) {
        return 1; // Default normal weight
    }
    
    // Check if character is already poisoned - treat swamp as normal terrain
    if (hasStatusEffect(character, 'poisoned') || hasStatusEffect(character, 'badly-poisoned')) {
        return 1; // Normal weight for already poisoned Pokémon
    }
    
    // Get types in lowercase for easier comparison
    if (character.pokemonTypes) {
        const types = character.pokemonTypes.map(type => 
            typeof type === 'string' ? type.toLowerCase() : type
        );
        
        // Poison and Steel type Pokemon are immune
        if (types.includes('poison') || types.includes('steel')) {
            return 1; // Normal weight for immune types
        }
    }
    
    // Check for Giftheilung ability
    if (character.abilities && character.abilities.some(ability => 
        ability.name === 'Giftheilung' || ability.name === 'Poison Heal' || 
        (ability.effect && ability.effect.toLowerCase().includes('giftheilung')))) {
        return 0; // Highly preferable to Pokémon with Giftheilung
    }
    
    // Default: high weight for swamp to non-immune Pokémon
    return 4;
}

/**
 * Get snow terrain weight multiplier based on Pokemon types
 * @param {Object} character - The character/Pokemon
 * @returns {number} - Weight multiplier for pathfinding
 */
export function getSnowWeightMultiplier(character) {
    if (!character) {
        return 4; // Default high weight
    }
    
    // Get types in lowercase for easier comparison
    if (character.pokemonTypes) {
        const types = character.pokemonTypes.map(type => 
            typeof type === 'string' ? type.toLowerCase() : type
        );
        
        // Ice and Fire type Pokemon find snow easier to traverse
        if (types.includes('ice') || types.includes('fire')) {
            return 1; // Normal weight for immune types
        }
    }
    
    // Flying Pokemon also have reduced weight
    if (character.terrainAttributes && character.terrainAttributes.fliegend) {
        return 1; // No penalty for flying Pokemon
    }
    
    // Default: high weight for snow
    return 4;
}

/**
 * Get snow movement cost for a Pokemon
 * @param {Object} character - The character/Pokemon
 * @returns {number} - Movement cost (1 or 2)
 */
export function getSnowMovementCost(character) {
    // Flying Pokemon automatically use only 1 movement
    if (character && character.terrainAttributes && character.terrainAttributes.fliegend) {
        return 1;
    }
    
    // If no character or no types data, default to 2
    if (!character || !character.pokemonTypes || !Array.isArray(character.pokemonTypes)) {
        return 2; // Default cost of 2 for unknown types
    }
    
    // Extract types (ensure they're lowercase strings)
    const types = character.pokemonTypes.map(type => 
        typeof type === 'string' ? type.toLowerCase() : type
    );
    
    // Check for Ice and Fire types
    if (types.some(type => ['ice', 'fire'].includes(type))) {
        return 1; // Ice and Fire types can traverse snow easier
    }
    
    // All other types use 2 movement points per snow tile
    return 2;
}

/**
 * Apply snow effects to a character (chance to freeze)
 * @param {Object} character - The character/Pokemon
 * @returns {Object} - Message and whether the effect was applied
 */
export function applySnowEffect(character) {
    console.log("Snow effect check triggered");
    
    // Skip if character is null
    if (!character) {

        return { applied: false, message: null };
    }
        
    // Skip if character is already frozen
    if (hasStatusEffect(character, 'frozen')) {
        return { applied: false, message: null };
    }
    
    // Skip if character is an Ice or Fire type
    if (character.pokemonTypes && character.pokemonTypes.some(type => {
        const typeName = typeof type === 'string' ? type.toLowerCase() : type;
        return typeName === 'ice' || typeName === 'fire';
    })) {
        return { applied: false, message: null };
    }
    
    // 10% chance to apply frozen status
    if (Math.random() < 0.1) {
        console.log("TEEEEEEEEEEEST");
        // Apply frozen status
        const applied = addStatusEffect(character, 'frozen');
        
        if (applied) {
            console.log(`${character.name} was frozen by snow!`);
            return { 
                applied: true, 
                message: `${character.name} wird durch den Schnee eingefroren!` 
            };
        }
    }
    
    return { applied: false, message: null };
}