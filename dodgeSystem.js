// dodgeSystem.js - Complete rewrite with Reaction System Integration

import { isTileOccupied } from './characterPositions.js';
import { rollAttackDice } from './diceRoller.js';
import { logBattleEvent } from './battleLog.js';
import { shouldUseLuckToken, useLuckToken } from './luckTokenSystem.js';
import { hasStatusEffect } from './statusEffects.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { animateDodge } from './animationManager.js';
import { attemptReaction } from './reactionSystem.js';

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
    
    // Get the size category of the dodging Pokemon
    const sizeCategory = calculateSizeCategory(charPos.character) || 1;
    
    // Calculate the "radius" of the Pokemon (how many tiles it extends in each direction)
    const radius = Math.floor(sizeCategory / 2);
    
    // Find the charId for the dodging Pokemon
    const characterPositions = getCharacterPositions();
    let targetCharId = null;
    for (const charId in characterPositions) {
        if (characterPositions[charId] === charPos) {
            targetCharId = charId;
            break;
        }
    }
    
    // Check each direction for valid dodge positions
    for (const dir of directions) {
        // Check positions 1 and 2 tiles away
        for (let distance = 1; distance <= 2; distance++) {
            const newX = charPos.x + (dir.x * distance);
            const newY = charPos.y + (dir.y * distance);
            
            // Check if all required tiles are empty and within bounds
            let allTilesValid = true;
            
            // Check all tiles that would be occupied by the Pokemon
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    const tileX = newX + dx;
                    const tileY = newY + dy;
                    
                    // Use isTileOccupied function to check if tile is valid
                    if (isTileOccupied(tileX, tileY, targetCharId)) {
                        allTilesValid = false;
                        break;
                    }
                }
                
                if (!allTilesValid) break;
            }
            
            if (!allTilesValid) {
                continue; // Skip positions where not all required tiles are valid
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
 * Attempt to dodge an attack based on dice rolls - NOW WITH REACTION SYSTEM
 * @param {Object} attacker - Attacker data
 * @param {Object} target - Target data
 * @param {Object} attackRoll - Attacker's roll result
 * @param {Object} selectedAttack - Attack being used
 * @returns {Promise<Object>} - Result of dodge attempt
 */
export async function attemptDodge(attacker, target, attackRoll, selectedAttack) {
    // STEP 1: Check for status effects that prevent both reactions and dodging
    if (hasStatusEffect(target.character, 'frozen')) {
        logBattleEvent(`${target.character.name} ist eingefroren und kann weder reagieren noch ausweichen!`);
        return {
            success: false,
            reactionTriggered: false,
            roll: {
                rolls: [],
                successes: 0,
                failures: 0,
                netSuccesses: 0
            }
        };
    }

    if (hasStatusEffect(target.character, 'snared')) {
        logBattleEvent(`${target.character.name} ist gefesselt und kann weder reagieren noch ausweichen!`);
        return {
            success: false,
            reactionTriggered: false,
            roll: {
                rolls: [],
                successes: 0,
                failures: 0,
                netSuccesses: 0
            }
        };
    }

    if (hasStatusEffect(target.character, 'asleep')) {
        logBattleEvent(`${target.character.name} schläft und kann weder reagieren noch ausweichen!`);
        return {
            success: false,
            reactionTriggered: false,
            roll: {
                rolls: [],
                successes: 0,
                failures: 0,
                netSuccesses: 0
            }
        };
    }

    // STEP 2: Check for paralysis (30% chance to prevent both reactions and dodging)
    if (hasStatusEffect(target.character, 'paralyzed')) {
        if (Math.random() < 0.3) {
            logBattleEvent(`${target.character.name} ist paralysiert und kann weder reagieren noch ausweichen!`);
            return {
                success: false,
                reactionTriggered: false,
                roll: {
                    rolls: [],
                    successes: 0,
                    failures: 0,
                    netSuccesses: 0
                }
            };
        }
    }

    // STEP 3: Attempt reaction BEFORE dodge
    let reactionTriggered = false;
    try {
        // Pass the selectedAttack for reaction filtering
        reactionTriggered = await attemptReaction(target.character, attacker.character, selectedAttack);
        
        if (reactionTriggered) {
            logBattleEvent(`${target.character.name} führt eine Reaktion aus und kann nicht mehr ausweichen!`);
            // If reaction triggered, return immediately without ANY dodge attempt
            return {
                success: false, // No dodge
                reactionTriggered: true,
                roll: {
                    rolls: [],
                    successes: 0,
                    failures: 0,
                    netSuccesses: 0
                }
            };
        }
    } catch (error) {
        console.error("Error attempting reaction:", error);
        // Continue with normal dodge if reaction fails
    }

    // STEP 4: If no reaction, proceed with normal dodge attempt
    
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
                    reactionTriggered: false,
                    roll: newDodgeRoll
                };
            }
        }
    }
    
    return {
        success: dodgeSuccessful,
        reactionTriggered: false,
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

/**
 * Attempt to dodge an attack based on the enhanced dodge rules
 * @param {Object} attacker - The attacking character
 * @param {Object} target - The target character
 * @param {Object} attackRoll - The attacker's roll result
 * @param {Object} selectedAttack - The attack being used
 * @returns {Promise<Object>} - Result of dodge attempt {success, position, roll, reactionTriggered}
 */
export async function attemptEnhancedDodge(attacker, target, attackRoll, selectedAttack) {    
    // First check for reactions and basic dodge attempt
    const dodgeResult = await attemptDodge(attacker, target, attackRoll, selectedAttack);
    
    // If reaction was triggered, return early (no dodge possible)
    if (dodgeResult.reactionTriggered) {
        return {
            success: false,
            roll: dodgeResult.roll,
            reactionTriggered: true,
            message: `${target.character.name} used a reaction attack instead of dodging.`
        };
    }
    
    // If dodge failed by the roll, return early
    if (!dodgeResult.success) {
        return {
            success: false,
            roll: dodgeResult.roll,
            reactionTriggered: false,
            message: `${target.character.name} failed to dodge (insufficient successes).`
        };
    }
    
    // Get available dodge positions
    const isRanged = selectedAttack.type === 'ranged';
    const dodgePositions = getAvailableDodgePositions(target, attacker, isRanged);
    
    // If no positions available, dodge fails despite successful roll
    if (!dodgePositions || dodgePositions.length === 0) {
        return {
            success: false,
            roll: dodgeResult.roll,
            reactionTriggered: false,
            message: `${target.character.name} rolled enough successes but has no valid position to dodge to.`
        };
    }
    
    let validDodgePositions = [...dodgePositions];
    
    // Choose a random dodge position from valid ones
    const dodgePos = validDodgePositions[Math.floor(Math.random() * validDodgePositions.length)];
    
    // Find the target character ID
    const characterPositions = getCharacterPositions();
    const targetId = Object.keys(characterPositions).find(id => 
        characterPositions[id].character === target.character);
    
    if (!targetId) {
        return {
            success: false,
            roll: dodgeResult.roll,
            reactionTriggered: false,
            message: `Error: Target character ID not found`
        };
    }
    
    // Return successful dodge result
    return {
        success: true,
        position: dodgePos,
        targetId: targetId,
        roll: dodgeResult.roll,
        reactionTriggered: false,
        message: `${target.character.name} dodges successfully!`
    };
}

/**
 * Execute dodge animation and update character position
 * @param {Object} dodgeResult - Result from attemptEnhancedDodge
 * @returns {Promise<boolean>} - Whether dodge was completed
 */
export function executeDodge(dodgeResult) {
    return new Promise(resolve => {
        if (!dodgeResult.success) {
            resolve(false);
            return;
        }
        
        // Animate the dodge
        animateDodge(dodgeResult.targetId, dodgeResult.position, () => {
            updateCharacterPosition(dodgeResult.targetId, dodgeResult.position);
            resolve(true);
        });
    });
}