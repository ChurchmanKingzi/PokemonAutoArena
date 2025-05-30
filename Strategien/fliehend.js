import { isValidPokemonPosition } from '../turnSystem.js';
import { GRID_SIZE } from '../config.js';

/**
 * Check if all remaining team members have "fleeing" strategy
 * @param {number} teamIndex - The team index to check
 * @param {Object} characterPositions - All character positions
 * @returns {boolean} - Whether all remaining team members have "fleeing" strategy
 */
export function areAllTeamMembersFleeing(teamIndex, characterPositions) {
    const teamMembers = Object.values(characterPositions).filter(pos => 
        pos.teamIndex === teamIndex && !pos.isDefeated
    );
    
    return teamMembers.length > 0 && teamMembers.every(member => 
        member.character && member.character.strategy === 'fleeing'
    );
}

/**
 * Find the tile that is furthest from all enemies
 * @param {number} teamIndex - The team index of the fleeing Pokemon
 * @param {Object} characterPositions - All character positions
 * @param {number} pokemonSize - Size category of the Pokemon (1, 2, 3, etc.)
 * @param {Object} excludePos - Position to exclude from collision checking (current Pokemon)
 * @returns {Object|null} - The furthest position {x, y} or null if none found
 */
export function findFurthestTileFromEnemies(teamIndex, characterPositions, pokemonSize, excludePos) {
    // Get all enemy positions
    const enemies = Object.values(characterPositions).filter(pos => 
        pos.teamIndex !== teamIndex && !pos.isDefeated
    );
    
    if (enemies.length === 0) {
        return null; // No enemies left
    }
    
    let bestPosition = null;
    let maxMinDistance = -1;
    
    // Search through the grid to find the tile furthest from all enemies
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            // Check if this position is valid for a Pokemon of given size
            if (!isValidPokemonPosition(x, y, pokemonSize, characterPositions, excludePos)) {
                continue;
            }
            
            // Calculate minimum distance to any enemy from this position
            let minDistanceToAnyEnemy = Infinity;
            for (const enemy of enemies) {
                // Use Manhattan distance for simplicity
                const distance = Math.abs(x - enemy.x) + Math.abs(y - enemy.y);
                minDistanceToAnyEnemy = Math.min(minDistanceToAnyEnemy, distance);
            }
            
            // If this position has a larger minimum distance than our current best, update it
            if (minDistanceToAnyEnemy > maxMinDistance) {
                maxMinDistance = minDistanceToAnyEnemy;
                bestPosition = { x, y };
            }
        }
    }
    
    return bestPosition;
}