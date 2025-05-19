/**
 * Attack system for Pokémon battles
 */

// All imports at the beginning of the file
import { rollAttackDice, forcedRoll, rollDamageWithValue } from './diceRoller.js';
import { getCurrentKP } from './utils.js';
import { getCharacterPositions } from './characterPositions.js';
import { createDamageNumber, createMissMessage, createVolltrefferEffect } from './damageNumbers.js';
import { animateDodge, animateMeleeAttack, animateClawSlash } from './animationManager.js';
import { getAvailableDodgePositions, calculateDodgeValue } from './dodgeSystem.js';
import { updateInitiativeHP } from './initiativeDisplay.js';
import { shouldUseLuckToken, useLuckToken, handleKillLuckTokenReset } from './luckTokenSystem.js';
import { calculateMinDistanceBetweenPokemon } from './pokemonDistanceCalculator.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { addStatusEffect } from './statusEffects.js';
import { logBattleEvent } from './battleLog.js';
import { isValidGiftpuderTarget } from './Attacken/giftpuder.js';
import { isValidSchlafpuderTarget } from './Attacken/schlafpuder.js';
import { isValidStachelsporeTarget } from './Attacken/stachelspore.js';
import { isValidSandwirbelTarget } from './Attacken/sandwirbel.js';
import { wakeUpFromDamage } from './statusEffects.js';
import { getCurrentStatValue } from './statChanges.js';
import { removeDefeatedCharacter } from './characterPositions.js';
import { updatePokemonHPBar } from './pokemonOverlay.js';
import { 
    fireProjectile, 
    isLineOfSightBlockedByAlly, 
    startProjectileSystem,
    clearAllProjectiles 
} from './projectileSystem.js';
import { getTerrainAt, isLineOfSightBlockedByMountain } from './terrainEffects.js';

// Import the effectiveness module directly
import { 
    getTypeEffectiveness,
    getTypeEffectivenessDescription,
    getAttackerAttack,
    getTargetDefense
} from './effectivenessLookupTable.js';

// Track current attacks for synchronization
let activeAttackPromises = [];

/**
 * Reset all active attacks and ensure everything is complete before continuing
 * @returns {Promise} - Promise that resolves when all attacks are complete
 */
export function completeAllActiveAttacks() {
    return Promise.all(activeAttackPromises).then(() => {
        // Clear the array when all promises resolve
        activeAttackPromises = [];
        // Clear any active projectiles as a safety measure
        clearAllProjectiles();
    });
}

/**
 * Find the nearest enemy to a character considering all occupied tiles
 * @param {Object} character - Character object
 * @param {number} teamIndex - Team index of the character
 * @param {number} currentX - Current x position
 * @param {number} currentY - Current y position
 * @returns {Object|null} - Nearest enemy position or null if none found
 */
export function findNearestEnemy(character, teamIndex, currentX, currentY) {
    const characterPositions = getCharacterPositions();
    let nearestEnemy = null;
    let minDistance = Infinity;
    
    // Position of the current Pokémon
    const currentPos = { 
        x: currentX, 
        y: currentY, 
        character: character 
    };
    
    // Check all characters
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        
        // Skip if same team or if defeated
        if (pos.teamIndex === teamIndex || pos.isDefeated) continue;
        
        // Calculate minimum distance between all occupied tiles
        const distance = calculateMinDistanceBetweenPokemon(currentPos, pos);
        
        // Update if this is closer
        if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = {
                x: pos.x,
                y: pos.y,
                character: pos.character,
                distance: distance,
                id: charId // Store character ID for easier reference
            };
        }
    }
    
    return nearestEnemy;
}

/**
 * Find the nearest enemy in attack range considering all occupied tiles
 * @param {Object} charData - Character data
 * @returns {Promise<Object|null>} - Promise resolving to nearest enemy in range or null if none
 */
export async function findNearestEnemyInRange(charData) {
    const characterPositions = getCharacterPositions();
    const character = charData.character;
    const teamIndex = charData.teamIndex;
    
    // Get all valid attacks with ammo/PP
    const validAttacks = (character.attacks || []).filter(attack => {
        return attack.weaponName === "Verzweifler" || 
               (attack.pp === undefined || attack.currentPP === undefined || attack.currentPP > 0);
    });
    
    // Separate ranged and non-ranged attacks
    const rangedAttacks = validAttacks.filter(attack => attack.type === 'ranged');
    const meleeAttacks = validAttacks.filter(attack => attack.type === 'melee');
    
    // Get the maximum range for each attack type
    const maxRangedRange = rangedAttacks.length > 0 ? 
        Math.max(...rangedAttacks.map(attack => attack.range)) : 0;
    const maxMeleeRange = meleeAttacks.length > 0 ? 
        Math.max(...meleeAttacks.map(attack => attack.range)) : 0;
    
    // Check if attacker is on a mountain (for line of sight advantage)
    const isAttackerOnMountain = getTerrainAt(charData.x, charData.y) === 'mountain';
    
    // Candidates array to store potential targets with priority info
    const candidates = [];
    
    // Check all characters for potential targets
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        
        // Skip if same team or if defeated
        if (pos.teamIndex === teamIndex || pos.isDefeated) continue;
        
        // Calculate minimum distance between all occupied tiles
        const distance = calculateMinDistanceBetweenPokemon(charData, pos);
        
        // For each valid attack, check if this target is in range
        for (const attack of validAttacks) {
            if (distance > attack.range) continue;
            
            // For ranged attacks, check line of sight
            if (attack.type === 'ranged') {
                // Check if blocked by ally
                const allyBlocking = isLineOfSightBlockedByAlly(charData, pos);
                if (allyBlocking) continue;
                
                // Check if blocked by mountain (unless attacker is on mountain)
                if (!isAttackerOnMountain) {
                    const mountainBlocking = isLineOfSightBlockedByMountain(
                        charData.x, charData.y, pos.x, pos.y, isAttackerOnMountain, charData.character
                    );
                    if (mountainBlocking) continue;
                }
            }
            
            // Calculate priority for this target
            // Prioritize targets at optimal range for ranged attacks
            let targetPriority = 1000 - distance; // Base priority - closer targets get higher priority by default
            
            // If we have ranged attacks, prioritize targets at the optimal range
            if (rangedAttacks.length > 0 && attack.type === 'ranged') {
                // Calculate how close to the ideal range this target is (exact match = 0)
                const rangeDifference = Math.abs(distance - attack.range);
                
                // Targets at exact range get highest priority
                if (rangeDifference === 0) {
                    targetPriority = 2000; // Very high priority
                } else if (distance === attack.range - 1) {
                    targetPriority = 1900; // Almost perfect
                } else {
                    // The closer to the ideal range, the higher the priority
                    targetPriority = 1500 - (rangeDifference * 100);
                }
            }
            
            // Add to candidates with priority
            candidates.push({
                id: charId,
                x: pos.x,
                y: pos.y,
                character: pos.character,
                distance: distance,
                attack: attack,
                priority: targetPriority
            });
            
            break; // One valid attack is enough to add this target
        }
    }
    
    // No valid targets
    if (candidates.length === 0) return null;
    
    // Sort by priority (highest first)
    candidates.sort((a, b) => b.priority - a.priority);
    
    // Return highest priority target
    return candidates[0];
}

/**
 * Get the best attack for a target based on effectiveness and damage potential
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {number} distance - Precalculated minimum distance
 * @returns {Object|null} - Best attack or null if no valid attack
 */
export async function getBestAttack(attacker, target, distance = null) {
    // If distance wasn't provided, calculate it
    if (distance === null) {
        distance = calculateMinDistanceBetweenPokemon(attacker, target);
    }
    
    // If the character has no attacks, return null
    if (!attacker.character.attacks || attacker.character.attacks.length === 0) {
        return null;
    }
    
    // Get target's types for effectiveness calculation
    const targetTypes = target.character.pokemonTypes || [];
    
    // Find all valid attacks (have PP and are in range)
    let verzweiflerAttack = null;
    let validAttacks = [];
    
    for (let i = 0; i < attacker.character.attacks.length; i++) {
        const attack = attacker.character.attacks[i];

        if (attack.weaponName === "Verzweifler") {
            verzweiflerAttack = attack;
        }
        
        // Skip attacks with no PP (except Verzweifler which doesn't use PP)
        if (attack.weaponName !== "Verzweifler" && 
            attack.pp !== undefined && 
            attack.currentPP !== undefined && 
            attack.currentPP <= 0) {
            continue;
        }
        
        // Skip attacks out of range
        if (attack.range < distance) {
            continue;
        }
        
        // Skip Giftpuder if target is already poisoned or immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'giftpuder') {
            if (!isValidGiftpuderTarget(target)) {
                continue;
            }
        }
        
        // Skip Schlafpuder if target is already asleep or immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'schlafpuder') {
            if (!isValidSchlafpuderTarget(target)) {
                continue;
            }
        }

        // Skip Stachelspore if target is already paralyzed or immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'stachelspore') {
            if (!isValidStachelsporeTarget(target)) {
                continue;
            }
        }

        // Skip Sandwirbel if target has GENA of 2 or less or is immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'sandwirbel') {
            if (!isValidSandwirbelTarget(target)) {
                continue;
            }
        }
        
        // Add to valid attacks
        validAttacks.push(attack);
    }
    
    //Only valid option is Verzweifler:
    if (validAttacks.length === 0 && verzweiflerAttack) {
        verzweiflerAttack.isLastResort = true;
        return verzweiflerAttack;
    }

    // No valid attacks
    if (validAttacks.length === 0) {
        return null;
    }
    
    // If Verzweifler is the only option, use it
    if (validAttacks.length === 1 && validAttacks[0].weaponName === "Verzweifler") {
        return validAttacks[0];
    }
    
    // Check if any non-Verzweifler attacks exist
    const nonVerzweiflerAttacks = validAttacks.filter(attack => attack.weaponName !== "Verzweifler");
    
    // If there are non-Verzweifler attacks, filter out Verzweifler
    if (nonVerzweiflerAttacks.length > 0) {
        validAttacks = nonVerzweiflerAttacks;
    }
    
    // Calculate potential damage for each attack
    let bestAttack = null;
    let highestDamage = -1;
    
    for (const attack of validAttacks) {
        // Calculate base damage
        let potentialDamage = attack.damage;
        
        // Get attack category (Physical/Special)
        let category = attack.category || 'Physisch'; // Default to Physical if not set
        
        // Get appropriate attacker and target stats
        const attackerStats = attacker.character.statsDetails?.statsGerman || {};
        const targetStats = target.character.statsDetails?.statsGerman || {};
        
        // Get relevant stats based on category
        const attackStat = getAttackerAttack(category, attackerStats);
        const defenseStat = getTargetDefense(category, targetStats);
        
        // Calculate stat modifier
        if (attackStat && defenseStat) {
            const statDifference = attackStat - defenseStat;
            const statModifier = Math.floor(statDifference / 5);
            
            // Apply modifier (minimum 50% of base damage)
            potentialDamage = Math.max(Math.ceil(attack.damage / 2), potentialDamage + statModifier);
        }
        
        // Apply type effectiveness
        if (attack.moveType && targetTypes.length > 0) {
            const attackType = attack.moveType.toLowerCase();
            const normalizedTargetTypes = targetTypes.map(t => typeof t === 'string' ? t.toLowerCase() : t);
                        
            const effectiveness = getTypeEffectiveness(attackType, normalizedTargetTypes);
            
            // Apply effectiveness if it's a valid number
            if (effectiveness !== undefined && !isNaN(effectiveness)) {
                potentialDamage = Math.round(potentialDamage * effectiveness);
            }
        }
        
        // Update best attack if this one has higher potential damage
        if (potentialDamage > highestDamage) {
            bestAttack = attack;
            highestDamage = potentialDamage;
        }
    }
    
    return bestAttack;
}

/**
 * Calculate damage based on attack type, stats and type effectiveness
 * @param {Object} selectedAttack - The selected attack
 * @param {Object} target - Target character data
 * @param {Object} attacker - Attacker character data
 * @returns {Object} - Damage roll results with modified dice count
 */
export function calculateDamage(selectedAttack, target, attacker) {
        // Base damage from the attack
    let baseDamage = selectedAttack.damage;
    let originalBaseDamage = baseDamage; // Store original for debugging
    
    if (originalBaseDamage === 0) {
        return {
            rolls: [0],
            total: 0,
            modifiedDiceCount: 0,
            originalDiceCount: 0
        };
    }

    // Get attack category (Physical/Special)
    const category = selectedAttack.category || 'Physisch'; // Default to Physical if not set
    
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
        baseDamage = Math.max(Math.ceil(baseDamage / 2), baseDamage + statModifier);
    }
    
    // Apply type effectiveness - Make sure the moveType exists before checking
    if (selectedAttack.moveType && targetTypes && targetTypes.length > 0) {
        // Ensure proper formatting for effectiveness lookup
        const attackType = selectedAttack.moveType.toLowerCase();
        const normalizedTargetTypes = targetTypes.map(t => typeof t === 'string' ? t.toLowerCase() : t);
        
        // Get effectiveness value from lookup table
        const effectiveness = getTypeEffectiveness(attackType, normalizedTargetTypes);
        
        // Apply effectiveness multiplier ONLY if it's not undefined or null
        if (effectiveness !== undefined && effectiveness !== null) {
            // Apply the multiplier
            const originalDamage = baseDamage;
            baseDamage = Math.round(baseDamage * effectiveness);
            
            // Add effectiveness description to the attack's effect property
            const effectivenessDesc = getTypeEffectivenessDescription(attackType, normalizedTargetTypes);
            selectedAttack.effectivenessDesc = effectivenessDesc;
        }
    }
    
    // Roll the dice for the modified damage
    const damageRoll = rollDamageWithValue(baseDamage);
    
    // Return result with the actual dice count used
    return {
        ...damageRoll,
        modifiedDiceCount: baseDamage, // Return the actual number of dice used
        originalDiceCount: originalBaseDamage // For debugging
    };
}

/**
 * Get modified GENA value based on weapon type and character skills
 * @param {Object} attacker - Attacker character data
 * @param {Object} attack - The selected attack
 * @returns {number} - Modified GENA value
 */
export function getModifiedGena(attacker, attack) {
    // Base GENA value
    let baseGena = getCurrentStatValue(attacker.character, 'gena');
    
    // If we get an invalid value, fall back to combat stats
    if (!baseGena) {
        baseGena = (attacker.character.combatStats && attacker.character.combatStats.gena) 
            ? parseInt(attacker.character.combatStats.gena) || 1
            : 1; // Default to 1 if not set
    }
    
    // No skills to add
    if (!attacker.character.attributes || !attacker.character.attributes.skills || 
        !attacker.character.attributes.skills.ko) {
        return baseGena;
    }
    
    const skills = attacker.character.attributes.skills.ko;
    let skillModifier = 0;
    
    // Determine which skill to use based on attack type
    if (attack.type === 'ranged') {
        // Ranged attacks: GENA + Shooting value
        skillModifier = skills["Schießen"] ? parseInt(skills["Schießen"]) || 0 : 0;
    } else if (attack.type === 'melee') {
        if (attack.weaponName.toLowerCase() === 'unbewaffnet') {
            // Unarmed melee attacks: GENA + Martial Arts value
            skillModifier = skills["Kampfsport"] ? parseInt(skills["Kampfsport"]) || 0 : 0;
        } else {
            // Armed melee attacks: GENA + Melee value
            skillModifier = skills["Nahkampf"] ? parseInt(skills["Nahkampf"]) || 0 : 0;
        }
    }
    
    // Return modified GENA value
    return baseGena + skillModifier;
}

/**
 * Attempt to dodge an attack based on the enhanced dodge rules
 * @param {Object} attacker - The attacking character
 * @param {Object} target - The target character
 * @param {Object} attackRoll - The attacker's roll result
 * @param {Object} selectedAttack - The attack being used
 * @returns {Promise<Object>} - Result of dodge attempt {success, position, roll}
 */
export async function attemptEnhancedDodge(attacker, target, attackRoll, selectedAttack) {    
    // Calculate the target's dodge value (PA + Ausweichen)
    const dodgeValue = calculateDodgeValue(target.character);
    
    // Roll for defense
    const defenseRoll = rollAttackDice(dodgeValue);
    
    // Check if defense succeeds (needs to get more successes than attacker)
    const dodgeSuccessful = defenseRoll.netSuccesses > attackRoll.netSuccesses;
    
    // If dodge failed by the roll, return early
    if (!dodgeSuccessful) {
        return {
            success: false,
            roll: defenseRoll,
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
            roll: defenseRoll,
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
            roll: defenseRoll,
            message: `Error: Target character ID not found`
        };
    }
    
    // Return successful dodge result
    return {
        success: true,
        position: dodgePos,
        targetId: targetId,
        roll: defenseRoll,
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
            resolve(true);
        });
    });
}

/**
 * Perform an attack from one character to another with luck token integration
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @returns {Promise<Object>} - Attack results
 */
export async function performAttack(attacker, target) {    
    const characterPositions = getCharacterPositions();
    const attackerName = attacker.character.name;
    const targetName = target.character.name;
    const targetId = Object.keys(characterPositions).find(id => characterPositions[id].character === target.character);
    const charId = Object.keys(characterPositions).find(id => characterPositions[id].character === attacker.character);
    
    if (!targetId) {
        console.error('Target character ID not found');
        return {
            attacker: attackerName,
            target: targetName,
            success: false,
            attackRolls: [],
            defenseRolls: [],
            damage: 0,
            log: ['Error: Target not found']
        };
    }
    
    // Create and store a promise for this attack
    const attackPromise = new Promise(async (resolveAttack) => {
        try {
            // Get the best attack for this target
            const selectedAttack = await getBestAttack(attacker, target);
            
            // If no valid attack found, return failure
            if (!selectedAttack) {
                resolveAttack({
                    attacker: attackerName,
                    target: targetName,
                    success: false,
                    attackRolls: [],
                    defenseRolls: [],
                    damage: 0,
                    log: [`${attackerName} kann ${targetName} nicht angreifen!`]
                });
                return;
            }
            
            // Check if line of sight is blocked for ranged attacks
            if (selectedAttack.type === 'ranged' && isLineOfSightBlockedByAlly(attacker, target)) {
                resolveAttack({
                    attacker: attackerName,
                    target: targetName,
                    success: false,
                    attackRolls: [],
                    defenseRolls: [],
                    damage: 0,
                    log: [`${attackerName} can't get a clear shot - an ally is in the way!`]
                });
                return;
            }
            
            // Get modified GENA value based on weapon type and skills
            const genaValue = getModifiedGena(attacker, selectedAttack);
            
            // Initialize attack results
            const attackResult = {
                attacker: attackerName,
                target: targetName,
                success: false,
                attackRolls: [],
                defenseRolls: [],
                damage: 0,
                forcedRolls: 0,
                log: []
            };
            
            // Reduce PP for non-Verzweifler attacks at the start
            if (selectedAttack.weaponName !== "Verzweifler" && selectedAttack.pp !== undefined) {
                // Initialize currentPP if it doesn't exist
                if (selectedAttack.currentPP === undefined) {
                    selectedAttack.currentPP = selectedAttack.pp;
                }
                
                // Reduce PP by 1, minimum 0
                selectedAttack.currentPP = Math.max(0, selectedAttack.currentPP - 1);
                
                attackResult.log.push(`${attackerName} benutzt ${selectedAttack.weaponName} (${selectedAttack.currentPP}/${selectedAttack.pp} AP übrig).`);
            } else {
                attackResult.log.push(`${attackerName} benutzt ${selectedAttack.weaponName}.`);
            }
            
            // Roll for attack
            let attackRoll = rollAttackDice(genaValue);
            attackResult.attackRolls.push(attackRoll);
            
            attackResult.log.push(`${attackerName} greift ${targetName} mit ${selectedAttack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses} Netto.`);
                        
            // Check if the attack roll was bad and we should use a luck token
            if (attackRoll.netSuccesses <= 0 && shouldUseLuckToken(attacker.character, attackRoll)) {
                // Use a luck token to reroll the attack
                const luckTokenResult = useLuckToken(attacker.character, attackRoll, genaValue, charId);
                
                if (luckTokenResult.success) {
                    // Log the luck token usage
                    attackResult.log.push(luckTokenResult.message);
                    
                    // Use the better roll
                    attackRoll = luckTokenResult.roll;
                    attackResult.attackRolls.push(attackRoll);
                }
            }
            
            // Handle forced rolls if net successes is exactly 0
            let forcedCount = 0;
            const forcingMode = attacker.character.forcingMode || 'always'; // Default to 'always'
            let usedLuckToken = false;

            while (attackRoll.netSuccesses === 0) {
                forcedCount++;
                attackResult.forcedRolls++;
                
                attackResult.log.push(`${attackerName} erhält genau 0 Erfolge und forciert!`);
                
                // Perform forced roll with penalty - pass the forcing mode
                attackRoll = forcedRoll(genaValue, forcedCount, forcingMode);
                attackResult.attackRolls.push(attackRoll);
                
                attackResult.log.push(`Forcieren-Wurf (${forcedCount}): [${attackRoll.rolls.join(', ')}] mit Erschwernis von ${forcedCount} = ${attackRoll.netSuccesses} Netto.`);
                
                // If the forced roll is really bad, consider using a luck token
                if (attackRoll.netSuccesses < 0 && !usedLuckToken && shouldUseLuckToken(attacker.character, attackRoll)) {
                    // Use a luck token to reroll
                    const luckTokenResult = useLuckToken(attacker.character, attackRoll, genaValue);
                    
                    if (luckTokenResult.success) {
                        usedLuckToken = true;
                        // Log the luck token usage
                        attackResult.log.push(luckTokenResult.message);
                        
                        // Use the better roll
                        attackRoll = luckTokenResult.roll;
                        attackResult.attackRolls.push(attackRoll);
                    }
                }
                
                // For the different forcing modes, check if we should stop forcing
                if (forcingMode === 'once' && forcedCount >= 1) {
                    break;
                } else if (forcingMode === 'dynamic') {
                    const maxForcedRolls = Math.floor(genaValue / 4) + 1;
                    if (forcedCount >= maxForcedRolls) {
                        break;
                    }
                } else if (forcingMode === 'never') {
                    break;
                }
            }
            
            // Check if attack misses
            if (attackRoll.netSuccesses <= 0) {                
                // Handle different miss visualizations based on attack type
                if (selectedAttack.type === 'ranged') {
                    // Create a Promise for the projectile animation
                    const projectilePromise = new Promise((resolveProjectile) => {
                        // Fire a projectile that misses
                        fireProjectile(attacker, target, selectedAttack, false, () => {
                            resolveProjectile();
                        });
                    });
                    
                    // Start the projectile update loop
                    startProjectileSystem();
                    
                    // Wait for projectile to complete before resolving
                    await projectilePromise;
                } else {
                    // For melee attacks, show miss message
                    createMissMessage(target);
                    
                    // Get size categories for both Pokemon
                    const attackerSize = calculateSizeCategory(attacker.character);
                    const targetSize = calculateSizeCategory(target.character);
                    
                    // Show miss animation for melee attacks
                    const attackAnimPromise = new Promise((resolveAnim) => {
                        animateMeleeAttack(charId, attacker, target, attackerSize, targetSize, () => {
                            resolveAnim();
                        });
                    });
                    
                    // Wait for animation to complete
                    await attackAnimPromise;
                }
                
                resolveAttack(attackResult);
                return;
            }
            
            // Attack hits, attempt dodge
            attackResult.log.push(`${attackerName}s Angriff trifft mit ${attackRoll.netSuccesses} Erfolgen.`);
            
            // Attempt dodge with new simplified system
            const { attemptDodge, chooseDodgePosition } = await import('./dodgeSystem.js');
            const dodgeResult = attemptDodge(attacker, target, attackRoll, selectedAttack);
            
            // Store the defense roll in the attack result
            if (dodgeResult.roll) {
                attackResult.defenseRolls.push(dodgeResult.roll);
            }
            
            // Handle ranged and melee attacks differently for dodging
            if (selectedAttack.type === 'ranged') {
                // For ranged attacks, both projectile and dodge happen simultaneously
                
                // If the dodge attempt failed with negative success, increase attacker's net successes
                if (!dodgeResult.success && dodgeResult.roll && dodgeResult.roll.netSuccesses < 0) {
                    const dodgeFailureBonus = Math.abs(dodgeResult.roll.netSuccesses);
                    attackRoll.netSuccesses += dodgeFailureBonus;
                    
                    attackResult.log.push(`${targetName} verschlechtert seine Position durch den Ausweichversuch! ${attackerName} erhält +${dodgeFailureBonus} Erfolge.`);
                }
                
                // If dodge was successful
                if (dodgeResult.success) {
                    // Get a dodge position
                    const dodgePos = chooseDodgePosition(target, attacker, true);
                    
                    // If there's a valid position to dodge to
                    if (dodgePos) {                        
                        // Create a Promise for the projectile
                        const projectilePromise = new Promise((resolveProjectile) => {
                            // Fire projectile - it might still hit something!
                            fireProjectile(attacker, target, selectedAttack, true, () => {
                                resolveProjectile();
                            });
                        });
                        
                        // Start projectile system
                        startProjectileSystem();
                        
                        // Start dodge animation - don't wait for it
                        const { animateDodge } = await import('./animationManager.js');
                        animateDodge(targetId, dodgePos, () => {
                        });
                        
                        // Wait for projectile to complete
                        await projectilePromise;
                        
                        // Now resolve the attack
                        resolveAttack(attackResult);
                        return;
                    } else {
                        // Successful dodge roll but nowhere to go
                        attackResult.log.push(`${targetName} versucht auszuweichen, hat aber keinen Platz!`);
                    }
                }
                
                // If dodge failed or there's no valid position, hit the target
                attackResult.success = true;
                attackResult.log.push(`${targetName} konnte nicht ausweichen!`);
                
                // Check for critical hit (Volltreffer)
                const isCriticalHit = checkCriticalHit(attacker.character, selectedAttack, attackRoll.netSuccesses);
                
                // Calculate damage
                const damageRoll = calculateDamage(selectedAttack, target, attacker);
                
                // Apply critical hit damage multiplier if applicable
                if (isCriticalHit) {
                    damageRoll.total *= 2; // Double the damage
                    attackResult.log.push(`VOLLTREFFER! Der Angriff verursacht doppelten Schaden!`);
                }
                
                attackResult.damage = damageRoll.total;
                
                // Add effectiveness message if available
                let effectivenessType = '';
                if (selectedAttack.effectivenessDesc) {
                    attackResult.log.push(`Der Angriff ${selectedAttack.effectivenessDesc}!`);
                    
                    // Determine effectiveness type for damage number styling
                    if (selectedAttack.effectivenessDesc.includes("sehr effektiv")) {
                        effectivenessType = 'super';
                    } else if (selectedAttack.effectivenessDesc.includes("nicht sehr effektiv")) {
                        effectivenessType = 'notvery';
                    }
                }
                
                // Log damage details
                attackResult.log.push(`${targetName} kann nicht ausweichen! ${attackerName} verursacht ${damageRoll.total} Schaden mit ${selectedAttack.weaponName} [${damageRoll.modifiedDiceCount}d6: ${damageRoll.rolls.join(', ')}].`);
                
                // Create a Promise for the projectile animation and damage
                const projectilePromise = new Promise((resolveProjectile) => {
                    // Fire a projectile that hits, with damage and effectiveness info
                    fireProjectile(attacker, target, selectedAttack, true, (hitSuccess) => {
                        // Apply damage with effectiveness
                        createDamageNumber(damageRoll.total, target, damageRoll.total >= 8, effectivenessType);
                        
                        // Apply damage to target
                        const oldKP = parseInt(getCurrentKP(target.character), 10);
                        const damageAmount = parseInt(damageRoll.total, 10);
                        target.character.currentKP = Math.max(0, oldKP - damageAmount);
                        
                        updatePokemonHPBar(targetId, target.character);
                        
                        //Wake up from damage
                        if (damageAmount > 0) {
                            const wokeUp = wakeUpFromDamage(target.character, damageAmount);
                            if (wokeUp) {
                                attackResult.log.push(`${targetName} wurde durch den Angriff geweckt!`);
                            }
                        }

                        // On-Hit-Effekte
                        if (attackResult.success && attackRoll.netSuccesses >= 0) {
                            if(selectedAttack.weaponName === "Glut"){
                                // Check if target is a Fire type
                                const isImmuneType = target.character.pokemonTypes && 
                                                target.character.pokemonTypes.some(type => 
                                                    type.toLowerCase() === 'fire' || type.toLowerCase() === 'feuer');
                                
                                if (!isImmuneType) {
                                    // Apply burned status effect to the target
                                    const statusApplied = applyStatusEffectFromAttack(target.character, 'burned', attacker.character);
                                    
                                    if (statusApplied) {
                                        attackResult.log.push(`${attackerName}s Glut verursacht eine Verbrennung bei ${targetName}!`);
                                    }
                                } else {
                                    // Log that the Fire-type is immune to burns
                                    attackResult.log.push(`${targetName} ist als Feuer-Pokémon immun gegen Verbrennungen!`);
                                }
                            }
                            
                            if(selectedAttack.weaponName === "Donnerschock"){
                                // Check if target is an Electric or Ground type
                                const isImmuneType = target.character.pokemonTypes && 
                                                target.character.pokemonTypes.some(type => 
                                                    type.toLowerCase() === 'ground' || type.toLowerCase() === 'boden' || type.toLowerCase() === 'electric' || type.toLowerCase() === 'elektro');
                                
                                if (!isImmuneType) {
                                    // Apply paralyzed status effect to the target
                                    const statusApplied = applyStatusEffectFromAttack(target.character, 'paralyzed', attacker.character);
                                    
                                    if (statusApplied) {
                                        attackResult.log.push(`${attackerName}s Donnerschock paralysiert ${targetName}!`);
                                    }
                                } else {
                                    // Log that some Pokemon are immune to burns
                                    attackResult.log.push(`${targetName} ist gegen Paralyse!`);
                                }
                            }
                        }
                        
                        // Create Volltreffer effect if applicable
                        if (isCriticalHit) {
                            createVolltrefferEffect(target);
                        }
                                                
                        // Update initiative HP display
                        updateInitiativeHP();
                        
                        // Log remaining HP
                        attackResult.log.push(`${targetName} hat noch ${target.character.currentKP} KP übrig.`);
                        
                        // Check if target was defeated
                        if (target.character.currentKP <= 0) {
                            attackResult.log.push(`${targetName} ist besiegt und verlässt den Kampf!`);
                            
                            // Handle luck token reset for kill
                            handleKillLuckTokenReset(charId);
                            
                            // Calculate the max tokens based on the formula
                            const baseStatTotal = attacker.character.statsDetails?.baseStatTotal || 500;
                            const maxTokens = Math.max(1, Math.floor((600 - baseStatTotal) / 80) + 1);
                            
                            attackResult.log.push(`${attackerName} hat einen Gegner besiegt und erhält alle Glücks-Tokens zurück! (${maxTokens})`);
                        }
                        
                        resolveProjectile();
                    }, false, damageRoll.total); // false = don't skip damage
                });
                
                // Start the projectile update loop
                startProjectileSystem();
                
                // Wait for the projectile to complete
                await projectilePromise;
                
                // Now resolve the attack
                resolveAttack(attackResult);
            } else {
                // For melee attacks, a successful dodge completely prevents the hit
                
                // If the dodge attempt failed with negative success, increase attacker's net successes
                if (!dodgeResult.success && dodgeResult.roll && dodgeResult.roll.netSuccesses < 0) {
                    const dodgeFailureBonus = Math.abs(dodgeResult.roll.netSuccesses);
                    attackRoll.netSuccesses += dodgeFailureBonus;
                    
                    attackResult.log.push(`${targetName} verschlechtert seine Position durch den Ausweichversuch! ${attackerName} erhält +${dodgeFailureBonus} Erfolge.`);
                }
                
                // Get size categories for both Pokemon
                const attackerSize = calculateSizeCategory(attacker.character);
                const targetSize = calculateSizeCategory(target.character);
                
                // If dodge was successful
                if (dodgeResult.success) {
                    // Get a dodge position
                    const dodgePos = chooseDodgePosition(target, attacker, false);
                    
                    // If there's a valid position to dodge to
                    if (dodgePos) {
                        attackResult.log.push(`${targetName} weicht dem Nahkampfangriff aus!`);
                        
                        // Create promises for both animations
                        const dodgePromise = new Promise((resolveDodge) => {
                            // For dodge animation - start later
                            setTimeout(() => {
                                animateDodge(targetId, dodgePos, () => {
                                    resolveDodge();
                                });
                            }, 200); // Start dodge after attack animation starts
                        });
                        
                        // Animate the attack even if dodge is successful
                        const attackPromise = new Promise((resolveAttack) => {
                            animateMeleeAttack(charId, attacker, target, attackerSize, targetSize, () => {
                                resolveAttack();
                            });
                        });
                        
                        // Wait for both animations to complete
                        await Promise.all([attackPromise, dodgePromise]);
                        
                        // Melee attack completely misses if dodge is successful
                        resolveAttack(attackResult);
                        return;
                    } else {
                        // Successful dodge roll but nowhere to go
                        attackResult.log.push(`${targetName} versucht auszuweichen, hat aber keinen Platz!`);
                    }
                }
                
                // If dodge failed or there's no valid position, hit the target
                attackResult.success = true;
                attackResult.log.push(`${targetName} konnte nicht ausweichen!`);
                
                // Create a promise for the attack animation
                const attackAnimPromise = new Promise((resolveAnim) => {
                    // Check if this is the Schlitzer attack and it hit
                    if (selectedAttack.weaponName === "Schlitzer" && attackResult.success) {
                        // Play the claw slash animation on the target
                        animateClawSlash(target, () => {
                            // Animation complete - no additional action needed
                        });
                        
                        // Add a message to the log
                        attackResult.log.push(`${attackerName}s Schlitzer-Angriff hinterlässt tiefe Kratzspuren!`);
                    }

                    animateMeleeAttack(charId, attacker, target, attackerSize, targetSize, () => {
                        // Once animation completes, apply damage and show damage number
                        
                        // Check for critical hit (Volltreffer)
                        const isCriticalHit = checkCriticalHit(attacker.character, selectedAttack, attackRoll.netSuccesses);
                        
                        // Calculate damage with advanced rules
                        const damageRoll = calculateDamage(selectedAttack, target, attacker);
                        //Exclude status moves, which always deal 0 damage, from crits and stuff!
                        if(damageRoll.total > 0){
                            // Apply critical hit damage multiplier if applicable
                            if (isCriticalHit && damageRoll) {
                                damageRoll.total *= 2; // Double the damage
                                attackResult.log.push(`VOLLTREFFER! Der Angriff verursacht doppelten Schaden!`);
                                
                                // Create the Volltreffer visual effect
                                createVolltrefferEffect(target);
                            }
                            
                            attackResult.damage = damageRoll.total;
                            
                            // Add effectiveness message if available
                            let effectivenessType = '';
                            if (selectedAttack.effectivenessDesc) {
                                attackResult.log.push(`Der Angriff ${selectedAttack.effectivenessDesc}!`);
                                
                                if (selectedAttack.effectivenessDesc.includes("sehr effektiv")) {
                                    effectivenessType = 'super';
                                } else if (selectedAttack.effectivenessDesc.includes("nicht sehr effektiv")) {
                                    effectivenessType = 'notvery';
                                }
                            }
                            
                            // Show damage number with effectiveness styling
                            createDamageNumber(damageRoll.total, target, damageRoll.total >= 8, effectivenessType);
                            
                            // Log damage details
                            attackResult.log.push(`${targetName} kann nicht ausweichen! ${attackerName} verursacht ${damageRoll.total} Schaden mit ${selectedAttack.weaponName} [${damageRoll.modifiedDiceCount}d6: ${damageRoll.rolls.join(', ')}].`);
                            
                            // Apply damage to target
                            const oldKP = parseInt(getCurrentKP(target.character), 10);
                            const damageAmount = parseInt(damageRoll.total, 10);
                            target.character.currentKP = Math.max(0, oldKP - damageAmount);

                            updatePokemonHPBar(targetId, target.character);
                            
                            // Update HP bar immediately
                            updatePokemonHPBar(targetId, target.character);

                            //Wake up from damage
                            if (damageAmount > 0) {
                                const wokeUp = wakeUpFromDamage(target.character, damageAmount);
                                if (wokeUp) {
                                    attackResult.log.push(`${targetName} wurde durch den Angriff geweckt!`);
                                }
                            }

                            // Check if this is a Verzweifler attack and apply self-damage
                            if (selectedAttack.weaponName === "Verzweifler") {
                                const recoilDamage = Math.ceil(damageAmount * 0.5); // 50% rounded up
                                const attackerOldKP = parseInt(getCurrentKP(attacker.character), 10);
                                attacker.character.currentKP = Math.max(0, attackerOldKP - recoilDamage);
                                
                                updatePokemonHPBar(charId, attacker.character);
                                
                                // Log the recoil damage
                                attackResult.log.push(`${attackerName} nimmt ${recoilDamage} Rückstoßschaden von Verzweifler!`);
                                
                                // Create damage number for attacker
                                createDamageNumber(recoilDamage, attacker, false, 'recoil');

                                if (attacker.character.currentKP <= 0) {
                                    attackResult.log.push(`${attackerName} wurde durch Rückstoßschaden besiegt!`);
                                    
                                    // Add this line to mark the attacker as defeated
                                    removeDefeatedCharacter(charId);
                                }
                                
                                // Update initiative HP display again
                                updateInitiativeHP();
                            }    
                            
                            // Update initiative HP display
                            updateInitiativeHP();
                            
                            // Log remaining HP
                            attackResult.log.push(`${targetName} hat noch ${target.character.currentKP} KP übrig.`);
                        }  
                        // Check if target was defeated
                        if (target.character.currentKP <= 0) {
                            attackResult.log.push(`${targetName} ist besiegt und verlässt den Kampf!`);
                            
                            // Handle luck token reset for kill
                            handleKillLuckTokenReset(charId);
                            
                            // Calculate the max tokens based on the formula
                            const baseStatTotal = attacker.character.statsDetails?.baseStatTotal || 500;
                            const maxTokens = Math.max(1, Math.floor((600 - baseStatTotal) / 80) + 1);
                            
                            attackResult.log.push(`${attackerName} hat einen Gegner besiegt und erhält alle Glücks-Tokens zurück! (${maxTokens})`);
                        }
                        
                        resolveAnim();
                    });
                });
                
                // Wait for the animation to complete
                await attackAnimPromise;
                
                // Add a short delay to let animations render properly
                setTimeout(() => {
                    resolveAttack(attackResult);
                }, 50);
            }
        } catch (error) {
            console.error("Error during attack execution:", error);
            resolveAttack({
                attacker: attackerName,
                target: targetName,
                success: false,
                attackRolls: [],
                defenseRolls: [],
                damage: 0,
                log: [`Error during attack: ${error.message}`]
            });
        }
    });
    
    // Add this attack to the active promises
    activeAttackPromises.push(attackPromise);
    
    // Return the promise
    return attackPromise;
}

/**
 * Check if a target is in range for any attack considering all occupied tiles
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @returns {boolean} - Whether target is in range
 */
export function isTargetInRange(attacker, target) {
    // Skip defeated targets
    if (target.isDefeated) return false;
    
    // Calculate Manhattan distance between all occupied tiles
    const distance = calculateMinDistanceBetweenPokemon(attacker, target);
    
    // Check each attack to see if any can reach the target
    if (attacker.character.attacks) {
        for (const attack of attacker.character.attacks) {
            // Skip attacks with no PP
            if (attack.weaponName !== "Verzweifler" && 
                attack.pp !== undefined && 
                attack.currentPP !== undefined && 
                attack.currentPP <= 0) {
                continue;
            }
            
            if (attack.range >= distance) {
                // For ranged attacks, also check line of sight
                if (attack.type === 'ranged' && isLineOfSightBlockedByAlly(attacker, target)) {
                    continue;
                }
                
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Apply a status effect from an attack
 * @param {Object} target - Target character
 * @param {string} effectId - Status effect ID
 * @param {Object} source - Source character
 * @returns {boolean} - Whether the effect was applied
 */
export function applyStatusEffectFromAttack(target, effectId, source) {
  if (!target || !effectId) return false;
  
  // Get proper effect name
  let effectName = '';
  switch (effectId) {
    case 'poisoned': effectName = 'Vergiftet'; break;
    case 'badly-poisoned': effectName = 'Schwer vergiftet'; break;
    case 'burned': effectName = 'Verbrannt'; break;
    case 'asleep': effectName = 'Schlafend'; break;
    case 'paralyzed': effectName = 'Paralysiert'; break;
    case 'frozen': effectName = 'Eingefroren'; break;
    case 'confused': effectName = 'Verwirrt'; break;
    case 'cursed': effectName = 'Verflucht'; break;
    case 'infatuated': effectName = 'Verliebt'; break;
    case 'held': effectName = 'Festgehalten'; break;
    case 'seeded': effectName = 'Egelsamen'; break;
    default: effectName = effectId;
  }
  
  // Add the effect with source info if available
  const options = source ? { 
    sourceId: source.uniqueId, 
    sourceName: source.name 
  } : {};
  
  const applied = addStatusEffect(target, effectId, options);
  
  if (applied) {
    logBattleEvent(`${target.name} wurde ${effectName}!`);
    return true;
  }
  
  return false;
}

// Example function to determine status effects based on attack type
export function getStatusEffectForAttackType(attackType, moveType) {
  // Common Pokémon move types that cause status effects
  switch (moveType) {
    case 'poison':
      return Math.random() < 0.3 ? 'poisoned' : null;
    case 'fire':
      return Math.random() < 0.2 ? 'burned' : null;
    case 'electric':
      return Math.random() < 0.3 ? 'paralyzed' : null;
    case 'ice':
      return Math.random() < 0.1 ? 'frozen' : null;
    case 'psychic':
      return Math.random() < 0.2 ? 'confused' : null;
    case 'ghost':
      return Math.random() < 0.15 ? 'cursed' : null;
    case 'grass':
      return Math.random() < 0.25 ? 'seeded' : null;
    case 'fairy':
      return Math.random() < 0.2 ? 'infatuated' : null;
    default:
      return null;
  }
}

/**
 * Check if an attack results in a critical hit
 * @param {Object} attacker - The attacking character
 * @param {Object} attack - The attack being used
 * @param {number} netSuccesses - The number of net successes from the attack roll
 * @returns {boolean} - Whether the attack is a critical hit
 */
export function checkCriticalHit(attacker, attack, netSuccesses) {
    // Status moves (dealing no damage) cannot be critical hits
    if (!attack.damage || attack.damage === 0) {
        return false;
    }
    
    // Default critThreshold is 4 if not set
    let threshold = attacker.critThreshold !== undefined ? attacker.critThreshold : 4;
    
    // List of high-crit attacks that reduce threshold by 1
    const highCritAttacks = [
        'auraschwingen', 'aquaschnitt', 'dunkelklaue', 'drillingspfeile', 
        'felsaxt', 'feuerfeger', 'giftschweif', 'giftstreich', 
        'himmelsfeger', 'karateschlag', 'klingenschwall', 'klingensturm', 
        'krabbhammer', 'kreuzschere', 'kreuzhieb', 'laubklinge', 
        'luftstoß', 'nachthieb', 'präzisionsschuss', 'psychoklinge', 
        'rasierblatt', 'rankenkeule', 'raumschlag', 'schlagbefehl', 
        'schlagbohrer', 'schlitzer', 'steinkante', 'unheilsklauen', 'windschnitt'
    ];
    
    // Check if the attack is in the high-crit list
    const attackName = attack.weaponName?.toLowerCase() || '';
    if (highCritAttacks.includes(attackName)) {
        threshold -= 1;
    }
    
    // Ensure threshold never goes below 2
    threshold = Math.max(2, threshold);
    
    // Check if net successes meets or exceeds the threshold
    return netSuccesses >= threshold;
}