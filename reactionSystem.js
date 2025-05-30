/**
 * Reaction System - Handles reaction attacks during combat
 * When Pokemon are about to be hit, they have a chance to use a reaction move in parallel
 */

import { logBattleEvent } from './battleLog.js';
import { performAttack } from './attackSystem.js';
import { getCharacterPositions } from './characterPositions.js';

// Store active reaction attacks to prevent interference with main turn system
let activeReactionAttacks = [];

// Track reaction statistics for battle
let reactionStats = {
    totalReactionAttempts: 0,
    successfulReactions: 0,
    reactionAttacksUsed: {}
};

/**
 * Reset the reaction system for a new battle
 */
export function resetReactionSystem() {
    activeReactionAttacks = [];
    reactionStats = {
        totalReactionAttempts: 0,
        successfulReactions: 0,
        reactionAttacksUsed: {}
    };
    console.log("Reaction system reset for new battle");
}

/**
 * Get the reaction chance for a Pokemon based on its strategy
 * @param {Object} character - The Pokemon character
 * @returns {number} - Reaction chance as a decimal (0.0 to 1.0)
 */
export function getReactionChance(character) {
    if (!character || !character.strategy) {
        return 0.25; // Default 25% chance
    }
    
    const strategy = character.strategy.toLowerCase();
    
    // Reinforcing strategy gets 50% chance
    if (strategy === 'reinforcing' || strategy === 'verstärkend') {
        return 0.50;
    }
    
    // All other strategies get 25% chance
    return 0.25;
}

/**
 * Roll for reaction chance
 * @param {Object} character - The Pokemon character
 * @returns {boolean} - Whether the reaction was triggered
 */
export function rollForReaction(character) {
    const chance = getReactionChance(character);
    const roll = Math.random();
    
    reactionStats.totalReactionAttempts++;
    
    const success = roll <= chance;
    
    if (success) {
        logBattleEvent(`${character.name} aktiviert eine Reaktion! (${Math.round(chance * 100)}% Chance, gewürfelt: ${Math.round(roll * 100)})`);
    }
    
    return success;
}

/**
 * Execute a reaction attack in parallel with the original attack
 * @param {Object} reactor - The Pokemon using the reaction
 * @param {Object} originalAttacker - The Pokemon that triggered the reaction
 * @param {Object} reactionMove - The reaction move to use
 * @returns {Promise<void>} - Resolves when reaction attack completes
 */
export async function executeReactionAttack(reactor, originalAttacker, reactionMove) {
    try {
        // Find character positions
        const characterPositions = getCharacterPositions();
        
        // Find the reactor's character ID and position data
        let reactorId = null;
        let reactorPos = null;
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === reactor) {
                reactorId = charId;
                reactorPos = characterPositions[charId];
                break;
            }
        }
        
        // Find the original attacker's position data  
        let attackerPos = null;
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === originalAttacker) {
                attackerPos = characterPositions[charId];
                break;
            }
        }
        
        if (!reactorPos || !attackerPos) {
            console.error("Could not find character positions for reaction attack");
            return;
        }
        
        // Create a unique reaction attack ID
        const reactionId = `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // Add to active reactions
        activeReactionAttacks.push({
            id: reactionId,
            reactor: reactor,
            target: originalAttacker,
            move: reactionMove,
            startTime: Date.now()
        });
        
        logBattleEvent(`${reactor.name} führt ${reactionMove.weaponName} als Reaktionsangriff aus!`);
        
        // FIXED: Remove the faulty validation step that was causing the "no valid reaction attacks" error
        // The move was already validated in getReactionMove(), so we don't need to validate again
        
        // Execute the reaction attack using the existing attack system
        const reactionResult = await performReactionAttackInternal(reactorPos, attackerPos, reactionMove);
        
        // Log the results
        if (reactionResult && reactionResult.log) {
            reactionResult.log.forEach(logEntry => {
                logBattleEvent(`[Reaktion] ${logEntry}`);
            });
        }
        
        reactionStats.successfulReactions++;
        
        // Remove from active reactions when complete
        removeActiveReaction(reactionId);
        
    } catch (error) {
        console.error("Error executing reaction attack:", error);
        logBattleEvent(`${reactor.name}s Reaktionsangriff ist fehlgeschlagen!`);
    }
}

/**
 * Internal function to perform the reaction attack - USES EXISTING SYSTEMS
 * Determines move type and uses the appropriate existing system
 * @param {Object} reactorPos - Reactor's position data
 * @param {Object} attackerPos - Original attacker's position data  
 * @param {Object} reactionMove - The reaction move to use
 * @returns {Promise<Object>} - Attack result
 */
async function performReactionAttackInternal(reactorPos, attackerPos, reactionMove) {
    try {
        console.log(`Executing reaction move: ${reactionMove.weaponName}`);
        
        // Find the reactor's character ID
        const characterPositions = getCharacterPositions();
        const reactorId = Object.keys(characterPositions).find(id => 
            characterPositions[id].character === reactorPos.character);
        
        if (!reactorId) {
            throw new Error("Could not find reactor character ID");
        }

        // Special handling for Einigler
            if (reactionMove.weaponName === "Einigler") {
                // Einigler as a reaction doesn't need stat changes
                // The damage halving is already handled via the einiglerActive flag
                logBattleEvent(`${reactorPos.character.name} rollt sich ein und halbiert den Schaden!`);
                
                // Still play the animation
                const { animateEinigler } = await import('./Attacken/einigler.js');
                await animateEinigler(reactorId, reactorPos.character);
            }
        
        // BUFF MOVES: Use existing buff/stat system
        if (reactionMove.buff === true) {
            // Import stat change functions
            const { changeStatValue } = await import('./statChanges.js');
            const { animateStatBoost } = await import('./animationManager.js');
            
            // Handle PP reduction
            if (reactionMove.pp !== undefined && reactionMove.currentPP !== undefined) {
                reactionMove.currentPP = Math.max(0, reactionMove.currentPP - 1);
            }
            
            // Apply stat changes based on move
            let statChanged = false;
            if (reactionMove.weaponName === "Härtner" || reactionMove.weaponName === "Panzerschutz") {
                const result = changeStatValue(reactorPos.character, 'verteidigung', 1);
                if (result.success) {
                    logBattleEvent(`${reactorPos.character.name}s Verteidigung steigt!`);
                    statChanged = true;
                }
            } else if (reactionMove.weaponName === "Schwerttanz") {
                const result = changeStatValue(reactorPos.character, 'angriff', 2);
                if (result.success) {
                    logBattleEvent(`${reactorPos.character.name}s Angriff steigt stark!`);
                    statChanged = true;
                }
            } else if (reactionMove.weaponName === "Eisenabwehr") {
                const result = changeStatValue(reactorPos.character, 'verteidigung', 2);
                if (result.success) {
                    logBattleEvent(`${reactorPos.character.name}s Verteidigung steigt stark!`);
                    statChanged = true;
                }
            } else if (reactionMove.weaponName === "Agilität") {
                const result = changeStatValue(reactorPos.character, 'initiative', 2);
                if (result.success) {
                    logBattleEvent(`${reactorPos.character.name}s Initiative steigt stark!`);
                    statChanged = true;
                }
            }
            
            // Animate the stat boost
            if (statChanged) {
                await new Promise((resolve) => {
                    animateStatBoost(reactorId, 'defense', () => {
                        resolve();
                    });
                });
            }
            
            return {
                success: true,
                log: [`${reactorPos.character.name} verwendet ${reactionMove.weaponName} als Reaktion!`],
                attacker: reactorPos.character.name,
                target: reactorPos.character.name, // Buff targets self
                attackRolls: [],
                defenseRolls: [],
                damage: 0
            };
        }
        
        
        // STATUS MOVES: Check for status moves and handle appropriately
        else if (reactionMove.notOffensive === true || reactionMove.damage === 0) {
            console.log(`${reactionMove.weaponName} is a status move - applying status effects`);
            
            // Handle PP reduction
            if (reactionMove.pp !== undefined && reactionMove.currentPP !== undefined) {
                reactionMove.currentPP = Math.max(0, reactionMove.currentPP - 1);
            }
            
            // For status moves, we'd need to implement the specific logic
            // For now, just log and return
            return {
                success: true,
                log: [`${reactorPos.character.name} verwendet Statusattacke ${reactionMove.weaponName} als Reaktion!`],
                attacker: reactorPos.character.name,
                target: attackerPos.character.name,
                attackRolls: [],
                defenseRolls: [],
                damage: 0
            };
        }
        
        // ATTACK MOVES: Use existing attack system with forced move selection
        else {
            console.log(`${reactionMove.weaponName} is an attack move - using attack system`);
            
            // Store original attacks
            const originalAttacks = reactorPos.character.attacks;
            
            // Create temporary attacks array with only the reaction move
            const modifiedReactionMove = {
                ...reactionMove,
                reaction: undefined, // Remove so it's not filtered out
                tempForced: true
            };
            
            // Temporarily replace attacks with just this move
            reactorPos.character.attacks = [modifiedReactionMove];
            
            try {
                // Use the existing attack system
                const attackResult = await performAttack(reactorPos, attackerPos);
                
                // Restore original attacks
                reactorPos.character.attacks = originalAttacks;
                
                return attackResult;
                
            } catch (error) {
                // Always restore original attacks
                reactorPos.character.attacks = originalAttacks;
                throw error;
            }
        }
        
    } catch (error) {
        console.error("Error in performReactionAttackInternal:", error);
        return {
            success: false,
            log: [`Reaction ${reactionMove.weaponName} failed: ${error.message}`],
            attacker: reactorPos.character.name,
            target: attackerPos.character.name,
            attackRolls: [],
            defenseRolls: [],
            damage: 0
        };
    }
}

/**
 * Remove a reaction attack from the active list
 * @param {string} reactionId - ID of the reaction to remove
 */
function removeActiveReaction(reactionId) {
    const index = activeReactionAttacks.findIndex(reaction => reaction.id === reactionId);
    if (index !== -1) {
        activeReactionAttacks.splice(index, 1);
    }
}

/**
 * Check if a Pokemon has any reaction moves available
 * @param {Object} character - The Pokemon character
 * @returns {boolean} - Whether the Pokemon has reaction moves
 */
export function hasReactionMoves(character) {
    if (!character || !character.attacks) {
        return false;
    }
    
    return character.attacks.some(attack => 
        attack.reaction === true && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
}

/**
 * Check if reaction attacks are currently in progress
 * @returns {boolean} - Whether any reactions are active
 */
export function areReactionsInProgress() {
    return activeReactionAttacks.length > 0;
}

/**
 * Wait for all active reactions to complete
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 5000)
 * @returns {Promise<void>} - Resolves when all reactions complete or timeout
 */
export function waitForReactionsToComplete(maxWaitTime = 5000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkReactions = () => {
            const elapsed = Date.now() - startTime;
            
            if (activeReactionAttacks.length === 0) {
                resolve();
                return;
            }
            
            if (elapsed >= maxWaitTime) {
                console.warn(`Reaction timeout after ${maxWaitTime}ms, forcing completion`);
                activeReactionAttacks.length = 0; // Force clear
                resolve();
                return;
            }
            
            // Check again in 100ms
            setTimeout(checkReactions, 100);
        };
        
        checkReactions();
    });
}

/**
 * Force complete all active reactions (emergency cleanup)
 */
export function forceCompleteAllReactions() {
    console.warn(`Force completing ${activeReactionAttacks.length} active reactions`);
    activeReactionAttacks.length = 0;
}

/**
 * Get reaction statistics for the current battle
 * @returns {Object} - Reaction statistics
 */
export function getReactionStats() {
    return {
        ...reactionStats,
        currentlyActive: activeReactionAttacks.length,
        successRate: reactionStats.totalReactionAttempts > 0 
            ? (reactionStats.successfulReactions / reactionStats.totalReactionAttempts * 100).toFixed(1) + '%'
            : '0%'
    };
}

/**
 * Attempt to trigger a reaction for a Pokemon about to be hit - IMPROVED
 * This is the main entry point called from the dodge system
 * @param {Object} reactor - The Pokemon that might react
 * @param {Object} originalAttacker - The Pokemon making the original attack
 * @returns {Promise<boolean>} - Whether a reaction was triggered
 */
/**
 * Attempt to trigger a reaction for a Pokemon about to be hit - IMPROVED
 * This is the main entry point called from the dodge system
 * @param {Object} reactor - The Pokemon that might react
 * @param {Object} originalAttacker - The Pokemon making the original attack
 * @param {Object} incomingAttack - The attack being used against the reactor
 * @returns {Promise<boolean>} - Whether a reaction was triggered
 */
export async function attemptReaction(reactor, originalAttacker, incomingAttack = null) {
    try {        
        // Check if the Pokemon has any reaction moves
        if (!hasReactionMoves(reactor)) {
            return false;
        }
        
        // Roll for reaction chance
        if (!rollForReaction(reactor)) {
            return false;
        }
        
        // Get a reaction move - pass the incoming attack for filtering
        const reactionMove = getReactionMove(reactor, incomingAttack);
        if (!reactionMove) {
            return false;
        }
        
        console.log(`${reactor.name} will use reaction move: ${reactionMove.weaponName}`);
        
        // Special handling for Einigler - mark it as active BEFORE damage calculation
        if (reactionMove.weaponName === "Einigler") {
            reactor.einiglerActive = true;
        }
        
        // Execute the reaction attack (this runs in parallel) - NO AWAIT HERE!
        // We don't want to block the main attack flow
        executeReactionAttack(reactor, originalAttacker, reactionMove);
        
        return true;
        
    } catch (error) {
        console.error("Error in attemptReaction:", error);
        return false;
    }
}

/**
 * Debug function to list all reaction moves for a Pokemon
 * @param {Object} character - The Pokemon character
 * @returns {Array} - Array of reaction move names
 */
export function debugListReactionMoves(character) {
    if (!character || !character.attacks) {
        return [];
    }
    
    return character.attacks
        .filter(attack => attack.reaction === true)
        .map(attack => ({
            name: attack.weaponName,
            pp: attack.currentPP || 0,
            maxPP: attack.pp || 0,
            available: attack.currentPP === undefined || attack.currentPP > 0
        }));
}

// ============================================================================
// FIXED attackSystem.js - Key changes in executeRangedAttack and executeMeleeAttack
// ============================================================================

/**
 * Execute ranged attack with dodge handling - FIXED VERSION
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {Object} attackRoll - Attack roll result
 * @param {Object} attackResult - Attack result to update
 * @param {Object} dodgeResult - Dodge attempt result
 * @param {string} targetId - Target character ID
 * @param {string} charId - Attacker character ID
 * @returns {Promise<void>} - Resolves when attack completes
 */
async function executeRangedAttack(attacker, target, selectedAttack, attackRoll, attackResult, dodgeResult, targetId, charId) {
    // FIXED: Don't handle dodge failure bonus or log messages if reaction was triggered
    if (!dodgeResult.reactionTriggered) {
        // Handle dodge failure bonus (only if no reaction was triggered)
        if (!dodgeResult.success && dodgeResult.roll && dodgeResult.roll.netSuccesses < 0) {
            const dodgeFailureBonus = Math.abs(dodgeResult.roll.netSuccesses);
            attackRoll.netSuccesses += dodgeFailureBonus;
            attackResult.log.push(`${target.character.name} verschlechtert seine Position durch den Ausweichversuch! ${attacker.character.name} erhält +${dodgeFailureBonus} Erfolge.`);
        }
    }
    
    // Handle successful dodge for non-cone attacks (only if no reaction was triggered)
    if (dodgeResult.success && !dodgeResult.reactionTriggered && selectedAttack.cone === undefined) {
        const { chooseDodgePosition } = await import('./dodgeSystem.js');
        const dodgePos = chooseDodgePosition(target, attacker, true);
        
        if (dodgePos) {
            const projectilePromise = new Promise((resolveProjectile) => {
                fireProjectile(attacker, target, selectedAttack, false, () => {
                    resolveProjectile();
                });
            });
            
            startProjectileSystem();
            
            const { animateDodge } = await import('./animationManager.js');
            animateDodge(targetId, dodgePos, () => {});
            
            await projectilePromise;
            return;
        } else {
            attackResult.log.push(`${target.character.name} versucht auszuweichen, hat aber keinen Platz!`);
        }
    }
    
    // FIXED: Only log reaction status or dodge failure if reaction wasn't triggered
    if (dodgeResult.reactionTriggered) {
        // No additional logs needed - reaction system handles its own logging
    } else if (!dodgeResult.success) {
        attackResult.log.push(`${target.character.name} konnte nicht ausweichen!`);
    }
    
    // Attack hits target (either failed dodge or reaction triggered)
    attackResult.success = true;
    
    const damageData = calculateFinalDamage(selectedAttack, target, attacker, attackRoll);
    
    const projectilePromise = new Promise((resolveProjectile) => {
        fireProjectile(attacker, target, selectedAttack, true, (hitSuccess) => {
            applyDamageAndEffects(target, attacker, selectedAttack, damageData, attackResult, targetId, charId, attackRoll);
            resolveProjectile();
        }, damageData.shouldDealDamage ? damageData.finalDamage : 0);
    });
    
    startProjectileSystem();
    await projectilePromise;
}

/**
 * Execute melee attack with dodge handling - FIXED VERSION
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {Object} attackRoll - Attack roll result
 * @param {Object} attackResult - Attack result to update
 * @param {Object} dodgeResult - Dodge attempt result
 * @param {string} targetId - Target character ID
 * @param {string} charId - Attacker character ID
 * @returns {Promise<void>} - Resolves when attack completes
 */
async function executeMeleeAttack(attacker, target, selectedAttack, attackRoll, attackResult, dodgeResult, targetId, charId) {
    // FIXED: Don't handle dodge failure bonus or log messages if reaction was triggered
    if (!dodgeResult.reactionTriggered) {
        // Handle dodge failure bonus (only if no reaction was triggered)
        if (!dodgeResult.success && dodgeResult.roll && dodgeResult.roll.netSuccesses < 0) {
            const dodgeFailureBonus = Math.abs(dodgeResult.roll.netSuccesses);
            attackRoll.netSuccesses += dodgeFailureBonus;
            attackResult.log.push(`${target.character.name} verschlechtert seine Position durch den Ausweichversuch! ${attacker.character.name} erhält +${dodgeFailureBonus} Erfolge.`);
        }
    }
    
    const attackerSize = calculateSizeCategory(attacker.character);
    const targetSize = calculateSizeCategory(target.character);
    
    // Handle successful dodge (only if no reaction was triggered)
    if (dodgeResult.success && !dodgeResult.reactionTriggered) {
        const { chooseDodgePosition } = await import('./dodgeSystem.js');
        const dodgePos = chooseDodgePosition(target, attacker, false);
        
        if (dodgePos) {
            attackResult.log.push(`${target.character.name} weicht dem Nahkampfangriff aus!`);
            
            const dodgePromise = new Promise((resolveDodge) => {
                setTimeout(() => {
                    animateDodge(targetId, dodgePos, () => {
                        resolveDodge();
                    });
                }, 200);
            });
            
            const attackPromise = new Promise((resolveAttack) => {
                animateMeleeAttack(charId, attacker, target, attackerSize, targetSize, () => {
                    resolveAttack();
                });
            });
            
            await Promise.all([attackPromise, dodgePromise]);
            return;
        } else {
            attackResult.log.push(`${target.character.name} versucht auszuweichen, hat aber keinen Platz!`);
        }
    }
    
    // FIXED: Only log reaction status or dodge failure if reaction wasn't triggered
    if (dodgeResult.reactionTriggered) {
        // No additional logs needed - reaction system handles its own logging
    } else if (!dodgeResult.success) {
        attackResult.log.push(`${target.character.name} konnte nicht ausweichen!`);
    }
    
    // Attack hits target (either failed dodge or reaction triggered)
    attackResult.success = true;
    
    const attackAnimPromise = new Promise((resolveAnim) => {
        // Handle Schlitzer special animation
        if (selectedAttack.weaponName === "Schlitzer" && attackResult.success) {
            animateClawSlash(target, () => {});
            attackResult.log.push(`${attacker.character.name}s Schlitzer-Angriff hinterlässt tiefe Kratzspuren!`);
        }

        // Handle Bohrschnabel special animation  
        if (selectedAttack.weaponName === "Bohrschnabel" && attackResult.success) {
            animateBohrschnabelWithEffects(attacker, target, () => {
                // IMPORTANT: Calculate and apply damage in the callback
                const damageData = calculateFinalDamage(selectedAttack, target, attacker, attackRoll);
                applyDamageAndEffects(target, attacker, selectedAttack, damageData, attackResult, targetId, charId, attackRoll);
                resolveAnim();
            });
            attackResult.log.push(`${attacker.character.name} bohrt sich mit rotierenden Bewegungen in ${target.character.name} hinein!`);
        } else {
            // Standard melee attack animation with damage calculation
            animateMeleeAttack(charId, attacker, target, attackerSize, targetSize, () => {
                const damageData = calculateFinalDamage(selectedAttack, target, attacker, attackRoll);
                applyDamageAndEffects(target, attacker, selectedAttack, damageData, attackResult, targetId, charId, attackRoll);
                resolveAnim();
            });
        }
    });
    
    await attackAnimPromise;
}

// ============================================================================
// FIXED dodgeSystem.js - Key changes in attemptDodge function
// ============================================================================

/**
 * Attempt to dodge an attack based on dice rolls - FIXED VERSION
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
        reactionTriggered = await attemptReaction(target.character, attacker.character);
        
        if (reactionTriggered) {
            logBattleEvent(`${target.character.name} führt eine Reaktion aus und kann nicht mehr ausweichen!`);
            // FIXED: If reaction triggered, return immediately without ANY dodge attempt
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
    // FIXED: Only execute this section if NO reaction was triggered
    
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
 * Get a random reaction move for a Pokemon - IMPROVED with damage filtering
 * @param {Object} character - The Pokemon character
 * @param {Object} incomingAttack - The attack that triggered the reaction (optional)
 * @returns {Object|null} - Random reaction move or null if none available
 */
export function getReactionMove(character, incomingAttack = null) {
    if (!character || !character.attacks) {
        return null;
    }
        
    // Filter for attacks with reaction property and available PP
    let reactionMoves = character.attacks.filter(attack => {
        const isReaction = attack.reaction === true;
        const hasAvailablePP = attack.currentPP === undefined || attack.currentPP > 0;
                
        return isReaction && hasAvailablePP;
    });
    
    // Additional filtering for specific reaction moves
    if (incomingAttack) {
        reactionMoves = reactionMoves.filter(move => {
            // Einigler can only be used against attacks with base damage > 0
            if (move.weaponName === "Einigler") {
                const hasBaseDamage = incomingAttack.damage && incomingAttack.damage > 0;
                return hasBaseDamage;
            }
            
            // Other reaction moves don't have this restriction
            return true;
        });
    }
        
    if (reactionMoves.length === 0) {
        console.log(`No reaction moves available for ${character.name} - falling back to dodge attempt`);
        return null;
    }
    
    // Select a random reaction move
    const randomIndex = Math.floor(Math.random() * reactionMoves.length);
    const selectedMove = reactionMoves[randomIndex];
    
    console.log(`Selected reaction move: ${selectedMove.weaponName}`);
    
    // Track usage statistics
    const moveName = selectedMove.weaponName;
    if (!reactionStats.reactionAttacksUsed[moveName]) {
        reactionStats.reactionAttacksUsed[moveName] = 0;
    }
    reactionStats.reactionAttacksUsed[moveName]++;
        
    return selectedMove;
}

/**
 * Check if an attack can trigger Einigler reaction
 * @param {Object} attack - The incoming attack
 * @returns {boolean} - Whether Einigler can be used against this attack
 */
export function canTriggerEinigler(attack) {
    if (!attack) return false;
    
    // Einigler can only be used against attacks with base damage > 0
    return attack.damage && attack.damage > 0;
}