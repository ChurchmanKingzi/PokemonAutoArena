// dodgeSystem.js - Complete rewrite

import { isTileOccupied } from './characterPositions.js';
import { GRID_SIZE } from './config.js';
import { rollAttackDice } from './diceRoller.js';
import { logBattleEvent } from './battleLog.js';
import { shouldUseLuckToken, useLuckToken } from './luckTokenSystem.js';
import { hasStatusEffect } from './statusEffects.js';

/**
 * Get available positions for dodging
 * @param {Object} charPos - Position of the dodging character {x, y}
 * @param {Object} attackerPos - Position of the attacker {x, y}
 * @param {boolean} isRanged - Whether the attack is ranged or melee
 * @returns {Array} - Array of possible dodge positions
 */
export function getAvailableDodgePositions(charPos, attackerPos, isRanged = false) {
    // All possible directions to check (including diagonals)
    const directions = [
        {x: 0, y: -1},  // Up
        {x: 1, y: -1},  // Up-Right
        {x: 1, y: 0},   // Right
        {x: 1, y: 1},   // Down-Right
        {x: 0, y: 1},   // Down
        {x: -1, y: 1},  // Down-Left
        {x: -1, y: 0},  // Left
        {x: -1, y: -1}  // Up-Left
    ];
    
    const availablePositions = [];
    
    // Check each direction for valid dodge positions
    for (const dir of directions) {
        // Check positions 1 and 2 tiles away
        for (let distance = 1; distance <= 2; distance++) {
            const newX = charPos.x + (dir.x * distance);
            const newY = charPos.y + (dir.y * distance);
            
            // Check if position is within the battlefield
            if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) {
                continue; // Skip positions outside the battlefield
            }
            
            // Check if position is not occupied
            if (isTileOccupied(newX, newY)) {
                continue; // Skip occupied positions
            }
            
            // For melee attacks, check if the position is out of melee range
            if (!isRanged) {
                const meleeDistance = Math.abs(newX - attackerPos.x) + Math.abs(newY - attackerPos.y);
                if (meleeDistance <= 1) {
                    continue; // Skip positions still in melee range
                }
            }
            
            // For ranged attacks, check if the position is not directly in the projectile path
            if (isRanged) {
                // Calculate if the new position is in the same line as the projectile
                // This is a simplified check - real projectiles could have more complex paths
                const isInLine = (
                    // Same row
                    (newX === attackerPos.x && charPos.x === attackerPos.x) ||
                    // Same column
                    (newY === attackerPos.y && charPos.y === attackerPos.y) ||
                    // Same diagonal
                    (Math.abs(newX - attackerPos.x) === Math.abs(newY - attackerPos.y) &&
                     Math.abs(charPos.x - attackerPos.x) === Math.abs(charPos.y - attackerPos.y))
                );
                
                if (isInLine) {
                    continue; // Skip positions directly in the projectile path
                }
            }
            
            // Position is valid, add it
            availablePositions.push({x: newX, y: newY});
        }
    }
    
    return availablePositions;
}

/**
 * Calculate dodge value based on character stats
 * @param {Object} character - Character data
 * @returns {number} - Dodge value (number of dice to roll)
 */
export function calculateDodgeValue(character) {
    // Use PA (Passive Defense) for dodge calculations
    return (character.combatStats && character.combatStats.pa) 
        ? parseInt(character.combatStats.pa) || 1
        : 1; // Default to 1 if not set
}

/**
 * Attempt to dodge an attack based on dice rolls
 * @param {Object} attacker - Attacker data
 * @param {Object} target - Target data
 * @param {Object} attackRoll - Attacker's roll result
 * @param {Object} selectedAttack - Attack being used
 * @returns {Object} - Result of dodge attempt
 */
export function attemptDodge(attacker, target, attackRoll, selectedAttack) {
    if (hasStatusEffect(target.character, 'frozen')) {
        logBattleEvent(`${target.character.name} ist eingefroren und kann nicht ausweichen!`);
        return {
            success: false,
            roll: {
                rolls: [],
                successes: 0,
                failures: 0,
                netSuccesses: 0
            }
        };
    }

    if (hasStatusEffect(target.character, 'asleep')) {
        logBattleEvent(`${target.character.name} schläft und kann nicht ausweichen!`);
        return {
            success: false,
            roll: {
                rolls: [],
                successes: 0,
                failures: 0,
                netSuccesses: 0
            }
        };
    }

    if (hasStatusEffect(target.character, 'paralyzed')) {
        // 30% chance to fail dodge due to paralysis
        if (Math.random() < 0.3) {
            logBattleEvent(`${target.character.name} ist paralysiert und kann nicht ausweichen!`);
            return {
                success: false,
                roll: {
                    rolls: [],
                    successes: 0,
                    failures: 0,
                    netSuccesses: 0
                }
            };
        }
    }

    // Calculate dodge value
    const dodgeValue = calculateDodgeValue(target.character);
    
    // Roll for dodge
    const dodgeRoll = rollAttackDice(dodgeValue);
    
    // Log the dodge attempt
    logBattleEvent(`${target.character.name} versucht auszuweichen: [${dodgeRoll.rolls.join(', ')}] - ${dodgeRoll.successes} Erfolge, ${dodgeRoll.failures} Fehlschläge = ${dodgeRoll.netSuccesses} Netto.`);
    
    // Check if dodge is successful (dodge needs at least as many successes as attack)
    const dodgeSuccessful = dodgeRoll.netSuccesses >= attackRoll.netSuccesses;
    
    // If dodge failed, check if we should use a luck token
    if (!dodgeSuccessful && shouldUseLuckToken(target.character, dodgeRoll)) {
        // Find the target character ID
        const characterPositions = getCharacterPositions();
        const targetId = Object.keys(characterPositions).find(id => 
            characterPositions[id].character === target.character);
            
        // Use a luck token to reroll the dodge
        const luckTokenResult = useLuckToken(target.character, dodgeRoll, dodgeValue, targetId);
        
        if (luckTokenResult.success) {
            // Log the luck token usage
            logBattleEvent(luckTokenResult.message);
            
            // Use the better roll
            const newDodgeRoll = luckTokenResult.roll;
            
            // Check if the new roll succeeds
            const newDodgeSuccessful = newDodgeRoll.netSuccesses >= attackRoll.netSuccesses;
            
            if (newDodgeSuccessful) {
                return {
                    success: true,
                    roll: newDodgeRoll
                };
            }
        }
    }
    
    return {
        success: dodgeSuccessful,
        roll: dodgeRoll
    };
}

/**
 * Choose a random valid dodge position
 * @param {Object} target - Target character data
 * @param {Object} attacker - Attacker character data
 * @param {boolean} isRanged - Whether the attack is ranged
 * @returns {Object|null} - Chosen dodge position or null if none available
 */
export function chooseDodgePosition(target, attacker, isRanged) {
    // Get available dodge positions
    const positions = getAvailableDodgePositions(target, attacker, isRanged);
    
    // If no positions available, return null
    if (!positions || positions.length === 0) {
        return null;
    }
    
    // Choose a random position
    return positions[Math.floor(Math.random() * positions.length)];
}

// Helper function to get character positions (to avoid circular imports)
function getCharacterPositions() {
    // We use this approach to avoid circular dependencies
    return window.characterPositions || {};
}