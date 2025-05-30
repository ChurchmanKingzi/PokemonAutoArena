/**
 * Centralized damage handling system for Pokemon battle simulator
 * This module handles all damage application regardless of source
 */
import { logBattleEvent } from './battleLog.js';
import { createDamageNumber } from './damageNumbers.js';
import { createVolltrefferEffect } from './damageNumbers.js';
import { updatePokemonHPBar } from './pokemonOverlay.js';
import { updateInitiativeHP } from './initiativeDisplay.js';
import { wakeUpFromDamage } from './statusEffects.js';
import { getCharacterPositions } from './characterPositions.js';
import { getTypeEffectiveness, getTypeEffectivenessDescription } from './effectivenessLookupTable.js';
import { getCurrentWeather, WEATHER_TYPES } from './weather.js';
import { checkAndHandleDefeat } from './defeatHandler.js';
import { hasPokemonAbility } from './statusEffects.js';
import { checkAndHandleSandspeier } from './Abilities/sandspeier.js';
import { checkAndUseRaufboldProtection, createProtectionEffect } from './Klassen/raufbold.js';
import { rollDamageWithValue } from './diceRoller.js';
import { applyOnHitStatusEffects } from './attackSystem.js';
import { checkCriticalHit } from './attackSystem.js';
import { getCurrentStatValue } from './statChanges.js';
import { applySandgewaltDamageBoost } from './Abilities/sandgewalt.js';
import { TILE_SIZE } from './config.js';
import { handleCharacterDefeat } from './defeatHandler.js';

import { shouldApplyDiebEffect, applyDiebEffect } from './Klassen/dieb.js';

// Damage source types
export const DAMAGE_SOURCE = {
    ATTACK: 'attack',           // Direct attack from another Pokemon
    RECOIL: 'recoil',           // Recoil damage from own attack
    STATUS: 'status',           // Damage from status effects
    WEATHER: 'weather',         // Damage from weather
    TERRAIN: 'terrain',         // Damage from terrain
    SELF_DESTRUCT: 'self-destruct', // Self-destruction (Explosion)
    CONFUSION: 'confusion',     // Confusion damage
    CURSE: 'curse',             // Ghost-type Curse
    LEECH_SEED: 'leech-seed',   // Leech Seed
    TRAP: 'trap',               // Trap damage (Wrap, Fire Spin, etc.)
    INDIRECT: 'indirect',       // Other indirect damage
    SPIKE: 'spike',             // Entry hazard damage
    ABILITY: 'ability'          // Damage from abilities
};

// Status effect sources
export const STATUS_SOURCE = {
    POISON: 'poison',
    BURN: 'burn', 
    BADLY_POISON: 'badly-poison',
    CURSE: 'curse',
    LEECH_SEED: 'leech-seed',
    TRAP: 'trap'
};

// Listener registry for damage events
const damageListeners = [];

/**
 * Register a listener for damage events
 * @param {Function} listener - Function to call when damage is applied
 * @returns {Function} - Function to remove the listener
 */
export function addDamageListener(listener) {
    damageListeners.push(listener);
    
    // Return a function to remove this listener
    return () => {
        const index = damageListeners.indexOf(listener);
        if (index !== -1) {
            damageListeners.splice(index, 1);
        }
    };
}

/**
 * Notify all damage listeners about a damage event
 * @param {Object} damageEvent - Damage event data
 */
function notifyDamageListeners(damageEvent) {
    for (const listener of damageListeners) {
        try {
            listener(damageEvent);
        } catch (error) {
            console.error('Error in damage listener:', error);
        }
    }
}

/**
 * Helper function to ensure we get proper grid coordinates for damage number positioning
 * @param {Object} target - Target object (may have character property)
 * @param {string} targetId - Target character ID
 * @returns {Object} - Position object with grid coordinates (x, y)
 */
function getGridPositionForDamageNumber(target, targetId) {
    // Always try to get the authoritative position from characterPositions first
    // This ensures we use grid coordinates consistently
    if (targetId) {
        const characterPositions = getCharacterPositions();
        const authoritativePosition = characterPositions[targetId];
        if (authoritativePosition) {
            return {
                x: authoritativePosition.x,  // Grid coordinates
                y: authoritativePosition.y   // Grid coordinates
            };
        }
    }
    
    // Fallback: if target has position data, check if it's already in grid coordinates
    if (target && typeof target.x === 'number' && typeof target.y === 'number') {
        // Check if coordinates look like grid coordinates (small integers) vs pixel coordinates (large numbers)
        // Grid coordinates are typically 0-20, pixel coordinates are typically 0-400+
        const looksLikeGridCoords = target.x < 50 && target.y < 50 && 
                                   target.x >= 0 && target.y >= 0 && 
                                   Number.isInteger(target.x) && Number.isInteger(target.y);
        
        if (looksLikeGridCoords) {
            return { x: target.x, y: target.y };
        } else {
            // Convert pixel coordinates to grid coordinates
            const gridX = Math.floor(target.x / TILE_SIZE);
            const gridY = Math.floor(target.y / TILE_SIZE);
            return { x: gridX, y: gridY };
        }
    }
    
    // Final fallback: return center of battlefield
    console.warn('Could not determine proper position for damage number, using center');
    return { x: 10, y: 10 };
}

/**
 * Main function to apply damage to a Pokemon
 * @param {Object} target - Target Pokemon or target data with character property
 * @param {number} amount - Amount of damage to apply
 * @param {Object} options - Additional options
 * @param {string} options.sourceType - Type of damage source (use DAMAGE_SOURCE constants)
 * @param {Object} options.sourceCharacter - Character causing the damage (if applicable)
 * @param {string} options.sourceId - ID of the character causing damage (if applicable)
 * @param {string} options.sourceMove - The move/attack that caused the damage (if applicable)
 * @param {boolean} options.isCritical - Whether this is a critical hit
 * @param {string} options.effectiveness - Effectiveness type ('super', 'notvery', etc.)
 * @param {boolean} options.ignoreProtection - Whether to ignore Raufbold protection
 * @param {string} options.statusSource - Specific status effect causing damage
 * @param {Function} options.onDamageComplete - Callback after damage is applied
 * @returns {Promise<Object>} - Result of damage application
 */
export async function applyDamage(target, amount, options = {}) {
    // Default options
    const defaultOptions = {
        sourceType: DAMAGE_SOURCE.INDIRECT,
        sourceCharacter: null,
        sourceId: null,
        sourceMove: null,
        isCritical: false,
        effectiveness: null,
        ignoreProtection: false,
        statusSource: null,
        onDamageComplete: null,
        targetId: null  // Will be determined if not provided
    };
    
    // Merge with default options
    options = { ...defaultOptions, ...options };
    
    // Ensure we have a character object
    let character = target;
    if (target && target.character) {
        character = target.character;
    }
    
    // If target is invalid or already at 0 HP, skip
    if (!character || character.currentKP <= 0) {
        return { 
            applied: false, 
            message: 'Invalid target or target already defeated',
            interrupted: false
        };
    }

    // Round damage to integer - Pokemon damage is always whole numbers
    amount = Math.floor(amount);
    
    // Apply minimum damage of 1 if any damage would be dealt
    if (amount > 0) {
        amount = Math.max(1, amount);
    } else {
        // If no damage would be dealt, return early
        return {
            applied: false,
            message: 'No damage to apply',
            interrupted: false
        };
    }
    
    // Find the targetId if not provided
    let targetId = options.targetId;
    if (!targetId) {
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === character) {
                targetId = charId;
                break;
            }
        }
    }
    
    // This ensures cone attacks use grid coordinates just like normal projectiles
    const targetPosition = getGridPositionForDamageNumber(target, targetId);

    // Check for Einigler active (reaction that halves damage)
    if (character.einiglerActive && options.sourceType === DAMAGE_SOURCE.ATTACK) {
        console.log(`Einigler active for ${character.name}, halving damage from ${amount} to ${Math.floor(amount / 2)}`);
        amount = Math.floor(amount / 2);
        
        // Clear the Einigler flag after use
        character.einiglerActive = false;
        
        // Log the damage reduction
        logBattleEvent(`${character.name}'s Einigler halbiert den eingehenden Schaden!`);
    }
    
    // Create the damage event object for listeners and checks
    const damageEvent = {
        target: character,
        targetId: targetId,
        amount: amount,
        finalAmount: amount, // Will be modified if applicable
        sourceType: options.sourceType,
        sourceCharacter: options.sourceCharacter,
        sourceId: options.sourceId,
        sourceMove: options.sourceMove,
        isCritical: options.isCritical,
        effectiveness: options.effectiveness,
        statusSource: options.statusSource,
        prevented: false,
        reducedBy: 0,
        position: targetPosition
    };
    
    // Check for abilities that might prevent damage
    const damageReduction = await applyDamageModifiers(damageEvent);
    damageEvent.reducedBy = damageReduction;
    damageEvent.finalAmount = Math.max(0, damageEvent.amount - damageReduction);
    
    // If damage was completely prevented by an ability
    if (damageEvent.prevented) {
        if (damageEvent.preventionMessage) {
            logBattleEvent(damageEvent.preventionMessage);
        }
        
        // Notify listeners that damage was prevented
        notifyDamageListeners({
            ...damageEvent,
            prevented: true,
            finalAmount: 0
        });
        
        return {
            applied: false,
            message: damageEvent.preventionMessage || 'Damage prevented by ability',
            interrupted: true
        };
    }
    
    // Check Raufbold protection for direct attacks
    if (!options.ignoreProtection && 
        (options.sourceType === DAMAGE_SOURCE.ATTACK) && 
        options.sourceCharacter) {
        
        if (checkAndUseRaufboldProtection(character, options.sourceCharacter)) {
            // Create a special protection visual effect
            createProtectionEffect(targetPosition);
            
            // Log protection used
            const message = `${character.name} weiß, wie man sich rauft, und entgeht jedem Schaden! (${character.raufboldProtection} übrig)`;
            logBattleEvent(message);
            
            // Notify listeners that damage was prevented
            notifyDamageListeners({
                ...damageEvent,
                prevented: true,
                finalAmount: 0,
                preventionMessage: message
            });
            
            return {
                applied: false,
                message: message,
                interrupted: true
            };
        }
    }
    
    // Final damage calculation with modifiers
    const finalDamage = damageEvent.finalAmount;
    
    // Store original HP for comparison
    const oldHP = character.currentKP;
    
    // Apply the damage
    character.currentKP = Math.max(0, oldHP - finalDamage);
    
    // Determine appropriate visual style based on damage source
    let visualStyle = determineVisualStyle(options);
    
    // Override with effectiveness if provided
    if (options.effectiveness) {
        visualStyle = options.effectiveness;
    }
    
    // Show visual damage number with proper grid coordinates
    if (targetPosition) {
        createDamageNumber(finalDamage, targetPosition, finalDamage >= 8 || options.isCritical, visualStyle);
    }
    
    // Add critical hit visual effect if applicable
    if (options.isCritical) {
        createVolltrefferEffect(targetPosition);
    }
    
    // Update HP displays
    if (targetId) {
        updatePokemonHPBar(targetId, character);
    }
    updateInitiativeHP();
    
    // Check if damage woke up a sleeping Pokemon
    let wokeUp = false;
    if (finalDamage > 0 && options.sourceType !== DAMAGE_SOURCE.STATUS) {
        wokeUp = wakeUpFromDamage(character, finalDamage);
    }
    
    // Build result object
    const result = {
        applied: true,
        oldHP: oldHP,
        newHP: character.currentKP,
        damage: finalDamage,
        wokeUp: wokeUp,
        defeated: character.currentKP <= 0,
        targetId: targetId,
        sourceId: options.sourceId
    };
    
    // Notify damage listeners
    notifyDamageListeners({
        ...damageEvent,
        finalAmount: finalDamage,
        oldHP: oldHP,
        newHP: character.currentKP,
        wokeUp: wokeUp,
        defeated: result.defeated
    });
    
    // Handle defeat if necessary
    if (result.defeated) {
        // Use the central defeat handler with appropriate source information
        await checkAndHandleDefeat(
            character,
            targetId,
            options.sourceCharacter,
            options.sourceId,
            {
                isStatusDeath: options.sourceType === DAMAGE_SOURCE.STATUS,
                isExplosionDeath: options.sourceType === DAMAGE_SOURCE.SELF_DESTRUCT,
                isWeatherDeath: options.sourceType === DAMAGE_SOURCE.WEATHER,
                sourceMove: options.sourceMove
            }
        );
    }
    
    // Call completion callback if provided
    if (typeof options.onDamageComplete === 'function') {
        try {
            options.onDamageComplete(result);
        } catch (error) {
            console.error('Error in damage completion callback:', error);
        }
    }
    
    return result;
}

/**
 * Apply damage modifiers based on abilities, types, etc.
 * @param {Object} damageEvent - The damage event
 * @returns {number} - Amount of damage reduction
 */
async function applyDamageModifiers(damageEvent) {
    let damageReduction = 0;
    
    // Extract key information for easier use
    const { target, targetId, amount, sourceType, sourceCharacter, sourceMove } = damageEvent;
    
    // Special case: Poison Heal ability for poison damage
    if (sourceType === DAMAGE_SOURCE.STATUS && 
        damageEvent.statusSource === STATUS_SOURCE.POISON || 
        damageEvent.statusSource === STATUS_SOURCE.BADLY_POISON) {
        
        const hasGiftheilung = hasPokemonAbility(target, ['aufheber', 'poison heal', 'giftheilung']);
        
        if (hasGiftheilung) {
            // Mark damage as prevented
            damageEvent.prevented = true;
            
            // Healing instead of damage
            const healAmount = Math.min(amount, target.maxKP - target.currentKP);
            
            if (healAmount > 0) {
                // Apply the healing
                target.currentKP += healAmount;
                
                // Log the healing
                damageEvent.preventionMessage = `${target.name} wird durch Gift um ${healAmount} KP geheilt! (Aufheber)`;
                
                // Update HP bar
                updatePokemonHPBar(targetId, target);
                
                // Show healing number
                if (damageEvent.position) {
                    createDamageNumber(healAmount, damageEvent.position, true, 'heal');
                }
            } else {
                damageEvent.preventionMessage = `${target.name} hat bereits volle KP und kann durch Aufheber nicht mehr geheilt werden.`;
            }
            
            return amount; // Prevent all damage
        }
    }
    
    // Add more ability checks here for damage modifiers
    if (sourceType === DAMAGE_SOURCE.ATTACK && 
        sourceMove && sourceMove.moveType && 
        sourceMove.moveType.toLowerCase() === 'fire') {
        
        const hasFlashFire = hasPokemonAbility(target, ['flashfire', 'feuerfänger']);
        
        if (hasFlashFire) {
            // Mark damage as prevented
            damageEvent.prevented = true;
            damageEvent.preventionMessage = `${target.name}'s Feuerfänger absorbiert den Feuer-Angriff!`;
            
            // You could add a flag to activate the Flash Fire boost here
            target.flashFireActivated = true;
            
            return amount; // Prevent all damage
        }
    }
    
    // Check for type immunities
    if (sourceType === DAMAGE_SOURCE.ATTACK && 
        sourceMove && sourceMove.moveType && 
        target.pokemonTypes && target.pokemonTypes.length > 0) {
        
        // Get move type and target types
        const moveType = sourceMove.moveType.toLowerCase();
        const targetTypes = target.pokemonTypes.map(t => 
            typeof t === 'string' ? t.toLowerCase() : t);
        
        // Check effectiveness
        const effectiveness = getTypeEffectiveness(moveType, targetTypes);
        
        // If effectiveness is 0, the target is immune
        if (effectiveness === 0) {
            damageEvent.prevented = true;
            damageEvent.preventionMessage = `${target.name} ist immun gegen ${sourceMove.weaponName}!`;
            return amount; // Prevent all damage
        }
    }
    
    // Add more complex damage modifiers here
    
    return damageReduction;
}

/**
 * Determine visual style for damage numbers based on damage source
 * @param {Object} options - Damage options
 * @returns {string} - Visual style identifier
 */
function determineVisualStyle(options) {
    // Base style on source type
    switch (options.sourceType) {
        case DAMAGE_SOURCE.ATTACK:
            return 'normal'; // Default attack damage
        case DAMAGE_SOURCE.RECOIL:
            return 'recoil';
        case DAMAGE_SOURCE.STATUS:
            // Further specify based on status source
            switch (options.statusSource) {
                case STATUS_SOURCE.POISON:
                case STATUS_SOURCE.BADLY_POISON:
                    return 'poison';
                case STATUS_SOURCE.BURN:
                    return 'burn';
                case STATUS_SOURCE.CURSE:
                    return 'curse';
                case STATUS_SOURCE.LEECH_SEED:
                    return 'seed';
                default:
                    return 'status';
            }
        case DAMAGE_SOURCE.WEATHER:
            return 'weather';
        case DAMAGE_SOURCE.TERRAIN:
            return 'terrain';
        case DAMAGE_SOURCE.SELF_DESTRUCT:
            return 'explosion';
        case DAMAGE_SOURCE.CONFUSION:
            return 'confusion';
        default:
            return 'normal';
    }
}

/**
 * Apply attack damage with type effectiveness calculation
 * @param {Object} attacker - Attacker data
 * @param {Object} target - Target data
 * @param {Object} attack - Attack data
 * @param {number} damageAmount - Pre-calculated damage amount (optional, will be calculated if not provided)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of damage application
 */
export async function applyAttackDamage(attacker, target, attack, damageAmount = null, options = {}) {
    // Find target and attacker IDs if not provided
    let targetId = options.targetId;
    let attackerId = options.attackerId;
    
    if (!targetId || !attackerId) {
        const characterPositions = getCharacterPositions();
        
        for (const charId in characterPositions) {
            if (!targetId && characterPositions[charId].character === target.character) {
                targetId = charId;
            }
            if (!attackerId && characterPositions[charId].character === attacker.character) {
                attackerId = charId;
            }
            
            // Break early if we found both
            if (targetId && attackerId) break;
        }
    }
    
    // Check for critical hit
    let isCritical = options.isCritical || false;
    
    // Calculate damage if not provided
    let damageResult;
    if (damageAmount === null) {
        damageResult = calculateAttackDamage(attacker, target, attack, {
            isCritical: isCritical,
            ...options
        });
        damageAmount = damageResult.finalDamage;
    } else {
        // Use provided damageAmount but still get type effectiveness for visual display
        damageResult = {
            finalDamage: damageAmount,
            effectiveness: 1,
            effectivenessDesc: null,
            weatherMessage: null,
            abilityModifiers: []
        };
        
        // Try to determine effectiveness for display purposes
        if (attack.moveType && target.character.pokemonTypes) {
            const attackType = attack.moveType.toLowerCase();
            const targetTypes = target.character.pokemonTypes.map(t => 
                typeof t === 'string' ? t.toLowerCase() : t);
            
            // Get effectiveness description for logging
            damageResult.effectivenessDesc = getTypeEffectivenessDescription(attackType, targetTypes);
            
            // Determine visual style based on effectiveness
            if (damageResult.effectivenessDesc) {
                if (damageResult.effectivenessDesc.includes("nicht sehr effektiv")) {
                    damageResult.effectiveness = 'notvery';
                }else if (damageResult.effectivenessDesc.includes("sehr effektiv")) {
                    damageResult.effectiveness = 'super';
                }
            }
        }
        
        // Try to determine weather message
        const currentWeather = getCurrentWeather();
        if (attack.moveType) {
            const moveType = attack.moveType.toLowerCase();
            
            switch (currentWeather.state) {
                case WEATHER_TYPES.SONNE:
                    if (moveType === 'fire' || moveType === 'feuer') {
                        damageResult.weatherMessage = 'Sonne verstärkt Feuer-Attacken!';
                    } else if (moveType === 'water' || moveType === 'wasser') {
                        damageResult.weatherMessage = 'Sonne schwächt Wasser-Attacken!';
                    }
                    break;
                case WEATHER_TYPES.REGEN:
                    if (moveType === 'water' || moveType === 'wasser') {
                        damageResult.weatherMessage = 'Regen verstärkt Wasser-Attacken!';
                    } else if (moveType === 'fire' || moveType === 'feuer') {
                        damageResult.weatherMessage = 'Regen schwächt Feuer-Attacken!';
                    }
                    break;
                case WEATHER_TYPES.SANDSTURM:
                    if (moveType === 'rock' || moveType === 'gestein') {
                        damageResult.weatherMessage = 'Sandsturm verstärkt Gesteins-Attacken!';
                    }
                    break;
                case WEATHER_TYPES.SCHNEE:
                    if (moveType === 'ice' || moveType === 'eis') {
                        damageResult.weatherMessage = 'Schnee verstärkt Eis-Attacken!';
                    }
                    break;
            }
        }
    }
    
    // Determine effectiveness type for visual display
    let effectivenessType = options.effectiveness || null;
    if (!effectivenessType && typeof damageResult.effectiveness === 'string') {
        effectivenessType = damageResult.effectiveness;
    } else if (!effectivenessType && typeof damageResult.effectiveness === 'number' && damageResult.effectiveness !== 1) {
        if (damageResult.effectiveness > 1) {
            effectivenessType = 'super';
        } else if (damageResult.effectiveness < 1 && damageResult.effectiveness > 0) {
            effectivenessType = 'notvery';
        }
    }
    
    // Apply the damage
    const result = await applyDamage(target, damageAmount, {
        sourceType: DAMAGE_SOURCE.ATTACK,
        sourceCharacter: attacker.character,
        sourceId: attackerId,
        sourceMove: attack,
        targetId: targetId,
        isCritical: isCritical,
        effectiveness: effectivenessType,
        ...options
    });
    
    // Display effectiveness text if applicable
    if (result.applied && result.damage > 0 && target.character.currentKP > 0) {
        // Import the effectiveness display functions dynamically
        const { createSuperEffectiveEffect, createNotVeryEffectiveEffect } = await import('./damageNumbers.js');
        
        // Display appropriate effectiveness text
        if (effectivenessType === 'notvery' || 
                  (damageResult.effectivenessDesc && damageResult.effectivenessDesc.includes("nicht sehr effektiv"))) {
            createNotVeryEffectiveEffect(target);
        } else if (effectivenessType === 'super' || 
            (damageResult.effectivenessDesc && damageResult.effectivenessDesc.includes("sehr effektiv"))) {
            createSuperEffectiveEffect(target);
        }
    }
    
    // Check for Sandspeier ability trigger AFTER damage is applied
    if (result.applied && result.damage > 0 && !result.defeated) {
        // Get target position for ability effect
        const characterPositions = getCharacterPositions();
        const targetPosition = characterPositions[targetId];
        
        if (targetPosition) {
            // Check and handle Sandspeier ability
            await checkAndHandleSandspeier(
                target.character, 
                targetId, 
                targetPosition, 
                result.damage
            );
        }
    }
    
    // Log attack result
    if (result.applied) {
        // Compose appropriate message with damage roll numbers
        let attackMessage = `${attacker.character.name} trifft ${target.character.name} mit ${attack.weaponName} und verursacht ${result.damage} Schaden!`;
        
        // Add damage roll details if available
        if (damageResult.rolls && damageResult.rolls.length > 0) {
            attackMessage += ` Würfel: [${damageResult.rolls.join(', ')}] = ${damageResult.total} Schaden!`;
        }
        
        // Add effectiveness description if available
        if (damageResult.effectivenessDesc) {
            attackMessage += ` Der Angriff ${damageResult.effectivenessDesc}!`;
        }
        
        // Add weather message if applicable
        if (damageResult.weatherMessage) {
            attackMessage += ` ${damageResult.weatherMessage}`;
        }
        
        // Log the message
        logBattleEvent(attackMessage);
        
        // Add ability messages
        if (damageResult.abilityModifiers && damageResult.abilityModifiers.length > 0) {
            for (const modifier of damageResult.abilityModifiers) {
                logBattleEvent(modifier.message);
            }
        }
        
        // Log HP remaining
        logBattleEvent(`${target.character.name} hat noch ${target.character.currentKP} KP übrig.`);
        
        // Log if target woke up
        if (result.wokeUp) {
            logBattleEvent(`${target.character.name} wurde durch den Angriff geweckt!`);
        }
    }
    
    return result;
}

/**
 * Calculate attack damage based on attacker, target, and attack properties
 * @param {Object} attacker - The attacking Pokemon
 * @param {Object} target - The target Pokemon
 * @param {Object} attack - The attack data
 * @param {Object} options - Additional options
 * @returns {Object} - Calculated damage and related information
 */
export function calculateAttackDamage(attacker, target, attack, options = {}) {
    // Base damage from the attack
    let baseDamage = attack.damage || 0;
    let originalBaseDamage = baseDamage; // Store original for reference

    if (originalBaseDamage === 0) {
        return {
            baseDamage: 0,
            finalDamage: 0,
            rolls: [0],
            total: 0,
            isCritical: false,
            effectiveness: null,
            effectivenessDesc: null,
            weatherModifier: 1,
            weatherMessage: null
        };
    }

    // === OPPORTUNISTIC STRATEGY BONUS ===
    // Check if attacker has opportunistic strategy and target has low HP
    if (attacker.character.strategy === 'opportunistic' || attacker.character.strategy === 'opportunistisch') {
        const maxHP = target.character.maxKP || target.character.combatStats?.kp || 100;
        const isLowHP = target.character.currentKP < (maxHP * 0.5);
        
        if (isLowHP) {
            // Add 2d6 bonus damage for low HP targets
            const bonusDamage = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
            baseDamage += bonusDamage;
        }
    }

    // Get attack category (Physical/Special)
    const category = attack.category || 'Physisch'; // Default to Physical if not set
    
    // Get target's types - ensure proper formatting
    const targetTypes = target.character.pokemonTypes || [];
    
    // Determine which stats to use based on category
    let attackStatName, defenseStatName;
    if (category.toLowerCase() === 'physisch' || category.toLowerCase() === 'physical') {
        attackStatName = 'angriff';
        defenseStatName = 'verteidigung';
    } else {
        attackStatName = 'spezialAngriff';
        defenseStatName = 'spezialVerteidigung';
    }
    
    // Get current attack and defense values
    const attackStat = getCurrentStatValue(attacker.character, attackStatName);
    const defenseStat = getCurrentStatValue(target.character, defenseStatName);
    
    // Calculate stat modifier
    if (attackStat && defenseStat) {
        const statDifference = attackStat - defenseStat;
        const statModifier = Math.floor(statDifference / 5);
        
        // Apply modifier (minimum 50% of base damage)
        baseDamage = Math.max(1, baseDamage + statModifier);
    }
    
    // Initialize result object
    const result = {
        baseDamage: originalBaseDamage,
        currentDamage: baseDamage,
        isCritical: options.isCritical || false,
        effectiveness: 1,
        effectivenessDesc: null,
        weatherModifier: 1,
        weatherMessage: null,
        abilityModifiers: []
    };
    
    // Apply ability effects (like Sandgewalt)
    try {
        const sandgewaltResult = applySandgewaltDamageBoost(baseDamage, attacker.character, category);
        baseDamage = sandgewaltResult.damage;
        
        if (sandgewaltResult.boosted) {
            result.abilityModifiers.push({
                name: 'Sandgewalt',
                message: sandgewaltResult.message
            });
        }
    } catch (error) {
        console.error('Error applying Sandgewalt boost:', error);
    }
    
    // Apply type effectiveness - Make sure the moveType exists before checking
    if (attack.moveType && targetTypes && targetTypes.length > 0) {
        // Ensure proper formatting for effectiveness lookup
        const attackType = attack.moveType.toLowerCase();
        const normalizedTargetTypes = targetTypes.map(t => typeof t === 'string' ? t.toLowerCase() : t);
        
        // Get effectiveness value from lookup table
        let effectiveness = getTypeEffectiveness(attackType, normalizedTargetTypes);
        
        // Apply effectiveness multiplier ONLY if it's not undefined or null
        if (effectiveness !== undefined && effectiveness !== null) {
            // Enhance effectiveness for "Ass-Trainer" class
            if (attacker.character.trainer != null && attacker.character.trainer.class === 'ace-trainer') {
                if (effectiveness === 2) {
                    // 2x becomes 2.5x for "Ass-Trainer"
                    effectiveness = 2.5;
                    result.abilityModifiers.push({
                        name: 'Ass-Trainer',
                        message: `${attacker.character.name}s Ass-Trainer-Fähigkeit verstärkt die Typ-Effektivität!`
                    });
                } else if (effectiveness === 4) {
                    // 4x becomes 5x for "Ass-Trainer"
                    effectiveness = 5;
                    result.abilityModifiers.push({
                        name: 'Ass-Trainer',
                        message: `${attacker.character.name}s Ass-Trainer-Fähigkeit verstärkt die Typ-Effektivität massiv!`
                    });
                }
            }
            
            // Store effectiveness before applying
            result.effectiveness = effectiveness;
            
            // Apply the (potentially enhanced) multiplier
            baseDamage = Math.round(baseDamage * effectiveness);

            if(effectiveness == 0)baseDamage = 0;
            
            // Add effectiveness description
            result.effectivenessDesc = getTypeEffectivenessDescription(attackType, normalizedTargetTypes);
        }
    }
    
    // Get current weather
    const currentWeather = getCurrentWeather();
    
    // Ensure we have a move type to check - handle special case for Eissturm explicitly
    let attackType = attack.moveType ? attack.moveType.toLowerCase() : '';
    if (attack.weaponName === "Eissturm") {
        attackType = 'eis'; // Ensure Eissturm is treated as Ice type
    }
    
    // Apply weather effects based on attack type
    if (attackType) {
        switch (currentWeather.state) {
            case WEATHER_TYPES.SONNE:
                if (attackType === 'fire' || attackType === 'feuer') {
                    // Fire-type attacks do 50% more damage in sun
                    baseDamage = Math.round(baseDamage * 1.5);
                    result.weatherModifier = 1.5;
                    result.weatherMessage = 'Sonne verstärkt Feuer-Attacken!';
                } else if (attackType === 'water' || attackType === 'wasser') {
                    // Water-type attacks do 50% less damage in sun
                    baseDamage = Math.round(baseDamage * 0.5);
                    result.weatherModifier = 0.5;
                    result.weatherMessage = 'Sonne schwächt Wasser-Attacken!';
                }
                break;
                
            case WEATHER_TYPES.REGEN:
                if (attackType === 'water' || attackType === 'wasser') {
                    // Water-type attacks do 50% more damage in rain
                    baseDamage = Math.round(baseDamage * 1.5);
                    result.weatherModifier = 1.5;
                    result.weatherMessage = 'Regen verstärkt Wasser-Attacken!';
                } else if (attackType === 'fire' || attackType === 'feuer') {
                    // Fire-type attacks do 50% less damage in rain
                    baseDamage = Math.round(baseDamage * 0.5);
                    result.weatherModifier = 0.5;
                    result.weatherMessage = 'Regen schwächt Feuer-Attacken!';
                }
                break;
                
            case WEATHER_TYPES.SCHNEE:
                if (attackType === 'ice' || attackType === 'eis') {
                    // Ice-type attacks do 50% more damage in snow
                    baseDamage = Math.round(baseDamage * 1.5);
                    result.weatherModifier = 1.5;
                    result.weatherMessage = 'Schnee verstärkt Eis-Attacken!';
                }
                break;
                
            case WEATHER_TYPES.SANDSTURM:
                if (attackType === 'rock' || attackType === 'gestein') {
                    // Rock-type attacks do 50% more damage in sandstorm
                    baseDamage = Math.round(baseDamage * 1.5);
                    result.weatherModifier = 1.5;
                    result.weatherMessage = 'Sandsturm verstärkt Gesteins-Attacken!';
                }
                break;
        }
    }
    
    // Check for Solarkraft ability and Sonne weather boost
    if (currentWeather.state === WEATHER_TYPES.SONNE) {
        // Check if attacker has Solarkraft ability
        const hasSolarkraft = attacker.character.statsDetails?.abilities?.some(ability => 
            ability.name === "Solarkraft" || ability.englishName === "solar-power"
        );
        
        if (hasSolarkraft) {
            // 50% bonus to all attacks during sunny weather
            baseDamage = Math.round(baseDamage * 1.5);
            result.abilityModifiers.push({
                name: 'Solarkraft',
                message: 'Solarkraft verstärkt den Angriff!'
            });
        }
    }
    
    // Apply critical hit bonus if applicable
    if (result.isCritical) {
        baseDamage = Math.round(baseDamage * 2);
    }

    console.log(" DEBUG BASE DMG: " + baseDamage);
    
    // Roll the dice for the modified damage
    const damageRoll = rollDamageWithValue(baseDamage);
    
    // Return final result
    return {
        ...result,
        rolls: damageRoll.rolls,
        total: damageRoll.total,
        finalDamage: damageRoll.total,
        modifiedDiceCount: baseDamage
    };
}

/**
 * Apply recoil damage from an attack
 * @param {Object} attacker - Attacker that receives recoil
 * @param {Object} attack - Attack that caused recoil
 * @param {number} damageDealt - Damage dealt to the target
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of recoil damage application
 */
export async function applyRecoilDamage(attacker, attack, damageDealt, options = {}) {
    // Calculate recoil damage (typically 1/4 or 1/3 of damage dealt)
    let recoilFraction = 0.5; // Default for Verzweifler (1/2)
    
    // Different moves have different recoil fractions
    if (attack.recoilFraction) {
        recoilFraction = attack.recoilFraction;
    } else if (attack.weaponName) {
        // Define recoil fractions for specific moves
        const recoilMoves = {
            'Verzweifler': 0.5,     // 1/2 of damage dealt
            'Knochenkeule': 0.25,   // 1/4 of damage dealt
            'Risikotackle': 0.33,   // 1/3 of damage dealt
            'Volttackle': 0.33,     // 1/3 of damage dealt
            'Holzgeweih': 0.33      // 1/3 of damage dealt
        };
        
        if (recoilMoves[attack.weaponName]) {
            recoilFraction = recoilMoves[attack.weaponName];
        }
    }
    
    // Calculate recoil amount
    const recoilAmount = Math.ceil(damageDealt * recoilFraction);
    
    // Find attacker ID if not provided
    let attackerId = options.attackerId;
    if (!attackerId) {
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === attacker.character) {
                attackerId = charId;
                break;
            }
        }
    }
    
    // Apply the recoil damage
    const result = await applyDamage(attacker, recoilAmount, {
        sourceType: DAMAGE_SOURCE.RECOIL,
        sourceMove: attack,
        targetId: attackerId,
        ...options
    });
    
    // Log recoil damage
    if (result.applied) {
        logBattleEvent(`${attacker.character.name} nimmt ${result.damage} Rückstoßschaden von ${attack.weaponName}!`);
    }
    
    return result;
}

/**
 * Apply status effect damage
 * @param {Object} target - Target taking damage
 * @param {string} statusEffectType - Type of status effect (use STATUS_SOURCE constants)
 * @param {number} amount - Amount of damage
 * @param {Object} sourceInfo - Information about the source of the status
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of damage application
 */
export async function applyStatusDamage(target, statusEffectType, amount, sourceInfo = {}, options = {}) {
    // Find target ID if not provided
    let targetId = options.targetId;
    if (!targetId) {
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === target) {
                targetId = charId;
                break;
            }
        }
    }
    
    // Apply the status damage
    const result = await applyDamage(target, amount, {
        sourceType: DAMAGE_SOURCE.STATUS,
        statusSource: statusEffectType,
        sourceCharacter: sourceInfo.sourceCharacter || null,
        sourceId: sourceInfo.sourceId || null,
        targetId: targetId,
        ...options
    });
    
    // Log status damage based on type
    if (result.applied) {
        let message = '';
        switch (statusEffectType) {
            case STATUS_SOURCE.POISON:
                message = `${target.name} erleidet ${result.damage} Schaden durch Gift!`;
                break;
            case STATUS_SOURCE.BADLY_POISON:
                message = `${target.name} erleidet ${result.damage} Schaden durch schweres Gift!`;
                break;
            case STATUS_SOURCE.BURN:
                message = `${target.name} erleidet ${result.damage} Schaden durch Verbrennung!`;
                break;
            case STATUS_SOURCE.CURSE:
                message = `${target.name} erleidet ${result.damage} Schaden durch den Fluch!`;
                break;
            case STATUS_SOURCE.LEECH_SEED:
                message = `${target.name} verliert ${result.damage} KP durch Egelsamen!`;
                
                // Handle healing the source if available
                if (sourceInfo.sourceCharacter && sourceInfo.sourceId) {
                    const healAmount = Math.min(result.damage, sourceInfo.sourceCharacter.maxKP - sourceInfo.sourceCharacter.currentKP);
                    
                    if (healAmount > 0) {
                        sourceInfo.sourceCharacter.currentKP += healAmount;
                        updatePokemonHPBar(sourceInfo.sourceId, sourceInfo.sourceCharacter);
                        logBattleEvent(`${sourceInfo.sourceCharacter.name} erhält ${healAmount} KP durch Egelsamen!`);
                    }
                }
                break;
            case STATUS_SOURCE.TRAP:
                message = `${target.name} erleidet ${result.damage} Schaden durch Festhalten!`;
                break;
            default:
                message = `${target.name} erleidet ${result.damage} Schaden durch Statuseffekt!`;
        }
        
        logBattleEvent(message);
    }
    
    return result;
}

/**
 * Apply weather damage
 * @param {Object} target - Target taking damage
 * @param {string} weatherType - Type of weather
 * @param {number} amount - Amount of damage
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of damage application
 */
export async function applyWeatherDamage(target, weatherType, amount, options = {}) {
    // Find target ID if not provided
    let targetId = options.targetId;
    if (!targetId) {
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === target) {
                targetId = charId;
                break;
            }
        }
    }
    
    // Apply the weather damage
    const result = await applyDamage(target, amount, {
        sourceType: DAMAGE_SOURCE.WEATHER,
        targetId: targetId,
        ...options
    });
    
    // Log weather damage based on type
    if (result.applied) {
        let message = '';
        switch (weatherType) {
            case WEATHER_TYPES.SANDSTURM:
                message = `${target.name} wird vom Sandsturm für ${result.damage} Schaden getroffen!`;
                break;
            case WEATHER_TYPES.HAGEL:
                message = `${target.name} wird vom Hagel für ${result.damage} Schaden getroffen!`;
                break;
            default:
                message = `${target.name} erleidet ${result.damage} Schaden durch das Wetter!`;
        }
        
        logBattleEvent(message);
    }
    
    return result;
}

/**
 * Apply explosion/self-destruct damage
 * @param {Object} attacker - Pokemon using explosion
 * @param {Object} target - Target of explosion
 * @param {Object} attack - Explosion attack data
 * @param {number} damageAmount - Pre-calculated damage amount
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of damage application
 */
export async function applyExplosionDamage(attacker, target, attack, damageAmount, options = {}) {
    // Find target and attacker IDs if not provided
    let targetId = options.targetId;
    let attackerId = options.attackerId;
    
    if (!targetId || !attackerId) {
        const characterPositions = getCharacterPositions();
        
        for (const charId in characterPositions) {
            if (!targetId && characterPositions[charId].character === target.character) {
                targetId = charId;
            }
            if (!attackerId && characterPositions[charId].character === attacker.character) {
                attackerId = charId;
            }
            
            // Break early if we found both
            if (targetId && attackerId) break;
        }
    }
    
    // Apply the explosion damage to target
    const result = await applyDamage(target, damageAmount, {
        sourceType: DAMAGE_SOURCE.SELF_DESTRUCT,
        sourceCharacter: attacker.character,
        sourceId: attackerId,
        sourceMove: attack,
        targetId: targetId,
        isCritical: options.isCritical || false,
        ...options
    });
    
    // Log attack result
    if (result.applied) {
        logBattleEvent(`${target.character.name} wird von ${attacker.character.name}'s Explosion getroffen und erleidet ${result.damage} Schaden!`);
    }
    
    return result;
}

/**
 * Apply self-knockout damage for explosion user
 * @param {Object} attacker - Pokemon using explosion
 * @param {Object} attack - Explosion attack data
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of damage application
 */
export async function applyExplosionSelfDamage(attacker, attack, options = {}) {
    // Find attacker ID if not provided
    let attackerId = options.attackerId;
    if (!attackerId) {
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === attacker.character) {
                attackerId = charId;
                break;
            }
        }
    }
    
    // Calculate max HP to ensure the Pokemon is defeated
    const maxHP = attacker.character.maxKP || attacker.character.combatStats.kp || 100;
    
    // Apply fatal damage to the exploding Pokemon
    const result = await applyDamage(attacker, maxHP, {
        sourceType: DAMAGE_SOURCE.SELF_DESTRUCT,
        sourceCharacter: attacker.character, // Self-inflicted
        sourceId: attackerId,
        sourceMove: attack,
        targetId: attackerId,
        ignoreProtection: true, // Can't protect against own explosion
        ...options
    });
    
    // Log result
    if (result.applied) {
        logBattleEvent(`${attacker.character.name} wurde durch seine eigene Explosion besiegt!`);
    }
    
    return result;
}

/**
 * Apply splash damage (e.g., Earthquake hitting multiple targets)
 * @param {Object} attacker - Attacker data
 * @param {Array} targets - Array of targets
 * @param {Object} attack - Attack data
 * @param {number} damageAmount - Pre-calculated damage amount
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Array of damage application results
 */
export async function applySplashDamage(attacker, targets, attack, damageAmount, options = {}) {
    const results = [];
    
    // Find attacker ID if not provided
    let attackerId = options.attackerId;
    if (!attackerId) {
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === attacker.character) {
                attackerId = charId;
                break;
            }
        }
    }
    
    // Apply damage to each target
    for (const target of targets) {
        // Skip invalid targets
        if (!target || !target.character) continue;
        
        // Apply damage to this target
        const result = await applyAttackDamage(
            attacker,
            target,
            attack,
            damageAmount,
            {
                ...options,
                attackerId: attackerId,
                // Don't pass targetId - let applyAttackDamage find it
            }
        );
        
        results.push(result);
    }
    
    return results;
}

/**
 * Apply confusion self-damage
 * @param {Object} target - Confused Pokemon
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of damage application
 */
export async function applyConfusionDamage(target, options = {}) {
    // Find target ID if not provided
    let targetId = options.targetId;
    if (!targetId) {
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId].character === target) {
                targetId = charId;
                break;
            }
        }
    }
    
    // Calculate confusion damage (typically 40 power in main games)
    // Here we'll use a simple formula of 1/8 of max HP
    const maxHP = target.maxKP || target.combatStats.kp || 100;
    const confusionDamage = Math.max(1, Math.floor(maxHP / 8));
    
    // Apply the confusion damage
    const result = await applyDamage(target, confusionDamage, {
        sourceType: DAMAGE_SOURCE.CONFUSION,
        sourceCharacter: target, // Self-inflicted
        targetId: targetId,
        ...options
    });
    
    // Log confusion damage
    if (result.applied) {
        logBattleEvent(`${target.name} ist so verwirrt, dass es sich selbst für ${result.damage} Schaden verletzt!`);
    }
    
    return result;
}

/**
 * Apply damage, status effects, and update displays - with Dieb class handling and Verzweifler recoil
 * @param {Object} target - Target data
 * @param {Object} attacker - Attacker data
 * @param {Object} selectedAttack - The selected attack
 * @param {Object} damageData - Damage calculation result
 * @param {Object} attackResult - Attack result to update
 * @param {string} targetId - Target character ID
 * @param {string} charId - Attacker character ID
 * @param {Object} attackRoll - Attack roll result
 */
export async function applyDamageAndEffects(target, attacker, selectedAttack, damageData, attackResult, targetId, charId, attackRoll) {
    const { finalDamage, isCritical, shouldDealDamage, effectivenessType } = damageData;
    
    // Check for Raufbold protection
    if (target.character.raufboldProtection > 0) {
        const protectionUsed = checkAndUseRaufboldProtection(target.character, attacker.character);
        
        if (protectionUsed) {            
            // Create a special protection visual effect
            createProtectionEffect(target);
            
            // Skip damage and effects application
            return;
        }
    }

    let actualDamageDealt = 0;

    if (shouldDealDamage) {
        // Apply damage through centralized system
        const damageResult = await applyAttackDamage(
            attacker, 
            target, 
            selectedAttack, 
            finalDamage, 
            {
                isCritical: isCritical,
                attackerId: charId,
                targetId: targetId,
                effectiveness: effectivenessType
            }
        );
        
        // Store the actual damage dealt for recoil calculation
        actualDamageDealt = damageResult.applied ? damageResult.damage : 0;
        
        // Add result messages to attack log if needed
        if (damageResult.wokeUp) {
            attackResult.log.push(`${target.character.name} wurde durch den Angriff geweckt!`);
        }
    } else {
        // No damage dealt
        attackResult.log.push(`${target.character.name} kann nicht ausweichen! ${attacker.character.name}s ${selectedAttack.weaponName} verursacht keinen Schaden!`);
    }
    
    // Handle Verzweifler recoil damage
    if (selectedAttack.weaponName === "Verzweifler" && actualDamageDealt > 0) {
        try {
            const { applyRecoilDamage } = await import('./damage.js');
            const recoilResult = await applyRecoilDamage(
                attacker, 
                selectedAttack, 
                actualDamageDealt, 
                {
                    attackerId: charId
                }
            );
            
            // Add recoil message to attack log if recoil was applied
            if (recoilResult.applied) {
                attackResult.log.push(`${attacker.character.name} nimmt ${recoilResult.damage} Rückstoßschaden von Verzweifler!`);
            }
        } catch (error) {
            console.error('Error applying Verzweifler recoil damage:', error);
        }
    }
    
    // Apply status effects
    applyOnHitStatusEffects(attacker, target, selectedAttack, attackResult, attackRoll, shouldDealDamage);
    
    // Update displays
    updateInitiativeHP();
    
    attackResult.damage = finalDamage;
}

/**
 * Get effectiveness type for damage number styling
 * @param {Object} selectedAttack - The selected attack
 * @returns {string} - Effectiveness type
 */
function getEffectivenessType(selectedAttack) {
    if(!selectedAttack.effectivenessDesc) return '';
    
    if(selectedAttack.effectivenessDesc.includes("nicht sehr effektiv")) {
        return 'notvery';
    }else if (selectedAttack.effectivenessDesc.includes("sehr effektiv")) {
        return 'super';
    }
    return '';
}

/**
 * Calculate final damage and check for 0-damage cases
 * @param {Object} selectedAttack - The selected attack
 * @param {Object} target - Target character data
 * @param {Object} attacker - Attacker character data
 * @param {Object} attackRoll - Attack roll result
 * @returns {Object} - Damage calculation result with metadata
 */
export function calculateFinalDamage(selectedAttack, target, attacker, attackRoll) {
    // Use the centralized damage calculation
    const damageResult = calculateAttackDamage(attacker, target, selectedAttack, {
        isCritical: checkCriticalHit(attacker.character, selectedAttack, attackRoll.netSuccesses)
    });
    
    const shouldDealDamage = damageResult.total > 0 && damageResult.baseDamage > 0;
    
    return {
        damageRoll: {
            rolls: damageResult.rolls,
            total: damageResult.total
        },
        finalDamage: damageResult.finalDamage,
        isCritical: damageResult.isCritical,
        shouldDealDamage,
        effectivenessType: damageResult.effectiveness,
        effectivenessDesc: damageResult.effectivenessDesc,
        weatherMessage: damageResult.weatherMessage
    };
}

/**
 * Handle potential defeat with Dieb class consideration
 * @param {Object} attacker - Attacker data
 * @param {Object} target - Target data
 * @param {Object} attackResult - Attack result to update
 * @param {string} charId - Attacker character ID
 * @param {string} targetId - Target character ID
 * @param {Object} selectedAttack - The selected attack
 */
export async function handlePotentialDefeat(attacker, target, attackResult, charId, targetId, selectedAttack) {
    try {
        // Set trainer references to make it easier to check team relationships
        if (!attacker.character.trainer) {
            attacker.character.trainer = {
                name: `Team ${attacker.teamIndex + 1} Trainer`,
                teamIndex: attacker.teamIndex,
                class: undefined  // Default to undefined class
            };
        }
        
        if (!target.character.trainer) {
            target.character.trainer = {
                name: `Team ${target.teamIndex + 1} Trainer`,
                teamIndex: target.teamIndex,
                class: undefined  // Default to undefined class
            }
        }
        
        // Check if Dieb effect should be applied (direct attack)
        if (shouldApplyDiebEffect(attacker.character, target.character, true)) {
            // Apply the Dieb effect
            const stealSuccessful = await applyDiebEffect(attacker.character, target.character, targetId);
            
            if (stealSuccessful) {
                // Add to the attack result log
                attackResult.log.push(`${attacker.character.trainer.name} stiehlt ${target.character.name} und fügt es seinem Team hinzu!`);
                attackResult.log.push(`${target.character.name} überlebt mit ${target.character.currentKP} KP!`);
                
                // The Pokemon is not defeated, so we don't proceed with normal defeat handling
                return;
            }
        }
        
        // CENTRALIZED DEFEAT HANDLING: Import and use defeatHandler        
        // Add defeat message to attack log
        attackResult.log.push(`${target.character.name} wurde besiegt!`);
        
        // Use the centralized defeat handler
        await handleCharacterDefeat(
            target.character,
            targetId,
            attacker.character,
            charId
        );
        
        // Still log the luck token reset message for the attack log
        const baseStatTotal = attacker.character.statsDetails?.baseStatTotal || 500;
        const maxTokens = Math.max(1, Math.floor((600 - baseStatTotal) / 80) + 1);
        attackResult.log.push(`${attacker.character.name} hat einen Gegner besiegt und erhält alle Glücks-Tokens zurück! (${maxTokens})`);
        
    } catch (error) {
        console.error("Error in handlePotentialDefeat:", error);
        
        // Fallback to centralized defeat handling
        await handleCharacterDefeat(
            target.character,
            targetId,
            attacker.character,
            charId
        );
    }
}