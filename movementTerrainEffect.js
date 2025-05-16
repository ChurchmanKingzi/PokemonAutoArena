// Add this to a new file called movementTerrainEffects.js or similar

import { getTerrainAt } from './terrainSystem.js';
import { applyLavaEffect } from './terrainEffects.js';
import { logBattleEvent } from './battleLog.js';

/**
 * Apply terrain effects during movement
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object} - Effect results
 */
export function applyTerrainEffectsOnMovement(charId, character, x, y) {
    const terrainType = getTerrainAt(x, y);
    const results = {
        messages: [],
        effectsApplied: []
    };
    
    // Handle each terrain type
    switch (terrainType) {
        case 'lava':
            // Apply burn status effect instead of direct damage
            const lavaEffect = applyLavaEffect(character);
            if (lavaEffect.applied && lavaEffect.message) {
                results.messages.push(lavaEffect.message);
                results.effectsApplied.push('burned');
                
                // Log the effect to the battle log
                logBattleEvent(lavaEffect.message);
            }
            break;
        
        // Handle other terrain types as needed
    }
    
    return results;
}