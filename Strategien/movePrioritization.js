import { getBestAttack } from '../attackSystem.js';
import { logBattleEvent } from '../battleLog.js';
import { isLineOfSightBlockedByAlly } from '../projectileSystem.js';
import { calculateMinDistanceBetweenPokemon } from '../pokemonDistanceCalculator.js';
import { getTypeEffectiveness } from '../effectivenessLookupTable.js';
import { calculateAttackDamage } from '../damage.js';


/**
 * Check if Pokemon should use a status move based on strategy and available moves
 * @param {Object} character - The Pokemon character
 * @returns {Object} - {shouldUseStatus: boolean, selectedMove: Object|null}
 */
export function shouldUseStatusMove(character) {
    if (!character.attacks || character.attacks.length === 0) {
        return { shouldUseStatus: false, selectedMove: null };
    }
    
    // Get valid status moves (Status category, not buff/support, has PP)
    const validStatusMoves = character.attacks.filter(attack => 
        attack.category === 'Status' && 
        attack.buff !== true && 
        attack.weaponName !== 'Verzweifler' &&
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    // Get valid non-status moves (not Status category, has PP)
    const validOffensiveMoves = character.attacks.filter(attack => 
        attack.category !== 'Status' && 
        attack.weaponName !== 'Verzweifler' &&
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    // If no status moves or no offensive moves, can't make the choice
    if (validStatusMoves.length === 0 || validOffensiveMoves.length === 0) {
        return { shouldUseStatus: false, selectedMove: null };
    }
    
    // Roll 1-100
    let roll = Math.floor(Math.random() * 100) + 1;
    
    // Apply strategy modifiers
    const strategy = (character.strategy || 'aggressive').toLowerCase();
    if (['aggressive', 'aggressiv', 'aiming', 'zielend', 'opportunistic', 'opportunistisch'].includes(strategy)) {
        roll += 20;
    } else if (['sneaky', 'tückisch', 'tricky'].includes(strategy)) {
        roll -= 30;
    }
    
    // If roll <= 50, use status move
    if (roll <= 50) {
        // Select random status move
        const randomIndex = Math.floor(Math.random() * validStatusMoves.length);
        const selectedStatusMove = validStatusMoves[randomIndex];
        
        return { shouldUseStatus: true, selectedMove: selectedStatusMove };
    }
    
    return { shouldUseStatus: false, selectedMove: null };
}

/**
 * Get the best attack for a character, considering status move preference
 * @param {Object} attacker - The attacking character position
 * @param {Object} target - The target character position
 * @param {Object} preferredMove - Optional preferred move to use
 * @returns {Promise<Object>} - The selected attack
 */
export async function getBestAttackWithStatusLogic(attacker, target, preferredMove = null) {
    if (preferredMove) {
        // If we have a preferred move (from status selection), use it
        return {
            weaponName: preferredMove.weaponName,
            damage: preferredMove.damage || 0,
            range: preferredMove.range || 0,
            type: preferredMove.range > 1 ? 'ranged' : 'melee',
            category: preferredMove.category,
            currentPP: preferredMove.currentPP,
            pp: preferredMove.pp
        };
    }
    
    // Otherwise use the original getBestAttack function
    return await getBestAttack(attacker, target);
}

/**
 * Find the move with the highest range from all valid moves
 * @param {Object} character - The Pokemon character
 * @returns {Object|null} - The move with highest range, or null if none available
 */
export function getHighestRangeMove(character) {
    if (!character.attacks || character.attacks.length === 0) {
        return null;
    }
    
    // Get all valid moves (have PP or unlimited PP)
    const validMoves = character.attacks.filter(attack => 
        attack.weaponName === "Verzweifler" || 
        (attack.pp === undefined || attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (validMoves.length === 0) {
        return null;
    }
    
    // Sort by range (highest first)
    validMoves.sort((a, b) => (b.range || 1) - (a.range || 1));
    
    return validMoves[0];
}

/**
 * Handle opportunistic strategy - find the target/attack combination that deals maximum damage
 * @param {string} charId - The character's ID
 * @param {Object} activeCharacter - The character data
 * @param {Object} characterPositions - Character positions object
 * @returns {Object|null} - Object with selected target and attack, or null if no valid target
 */
export async function selectOpportunisticTarget(charId, activeCharacter, characterPositions) {
    const attackerPos = characterPositions[charId];
    const attackerTeam = attackerPos.teamIndex;
    
    // Find all possible target-attack combinations
    const combinations = [];
    
    // Get all valid attacks
    const validAttacks = (activeCharacter.character.attacks || []).filter(attack => {
        return attack.weaponName === "Verzweifler" || 
               (attack.pp === undefined || attack.currentPP === undefined || attack.currentPP > 0);
    });
    
    if (validAttacks.length === 0) {
        return null;
    }
    
    // Check each enemy
    for (const targetId in characterPositions) {
        const targetPos = characterPositions[targetId];
        
        // Skip if same team, defeated, or no character
        if (targetPos.teamIndex === attackerTeam || targetPos.isDefeated || !targetPos.character) {
            continue;
        }
        
        // Check each attack against this target
        for (const attack of validAttacks) {
            // Check if target is in range
            const distance = calculateMinDistanceBetweenPokemon(attackerPos, targetPos);
            if (distance > attack.range) {
                continue;
            }
            
            // For ranged attacks, check line of sight
            if (attack.type === 'ranged') {
                const isBlocked = isLineOfSightBlockedByAlly(attackerPos, targetPos);
                if (isBlocked) {
                    continue;
                }
            }
            
            // Calculate potential damage with opportunistic bonuses
            const damageResult = calculateOpportunisticDamage(attackerPos, targetPos, attack);
            
            if (damageResult.damage > 0) {
                let score = damageResult.damage;
                
                // Apply x3 bonus if this attack would defeat the target
                if (damageResult.damage >= targetPos.character.currentKP) {
                    score *= 3;
                    damageResult.wouldDefeat = true;
                }
                
                combinations.push({
                    targetId: targetId,
                    target: {
                        id: targetId,
                        character: targetPos.character,
                        distance: distance
                    },
                    attack: attack,
                    damage: damageResult.damage,
                    score: score,
                    wouldDefeat: damageResult.wouldDefeat || false,
                    isLowHP: damageResult.isLowHP || false
                });
            }
        }
    }
    
    if (combinations.length === 0) {
        return null;
    }
    
    // Sort by score (highest first)
    combinations.sort((a, b) => b.score - a.score);
    
    const bestCombination = combinations[0];
    
    // Log the opportunistic choice
    let logMessage = `${activeCharacter.character.name} verwendet Opportunistik: ${bestCombination.attack.weaponName} gegen ${bestCombination.target.character.name} für ${bestCombination.damage} geschätzten Schaden`;
    
    if (bestCombination.wouldDefeat) {
        logMessage += " (BESIEGT!)";
    }
    if (bestCombination.isLowHP) {
        logMessage += " (Niedrige KP - Bonus angewendet)";
    }
    
    logBattleEvent(logMessage);
    
    // Debug logging for all combinations
    if (combinations.length > 1) {
        logBattleEvent(`Andere Optionen bewertet:`);
        combinations.slice(1, Math.min(4, combinations.length)).forEach((combo, index) => {
            let msg = `  ${index + 2}. ${combo.attack.weaponName} vs ${combo.target.character.name}: ${combo.damage} Schaden`;
            if (combo.wouldDefeat) msg += " (BESIEGT!)";
            if (combo.isLowHP) msg += " (Niedrige KP)"; 
            logBattleEvent(msg);
        });
    }
    
    return {
        target: bestCombination.target,
        attack: bestCombination.attack
    };
}

/**
 * Calculate damage for opportunistic strategy with special bonuses
 * @param {Object} attackerPos - Attacker's position data
 * @param {Object} targetPos - Target's position data
 * @param {Object} attack - The attack to simulate
 * @returns {Object} - Damage calculation result
 */
function calculateOpportunisticDamage(attackerPos, targetPos, attack) {
    const attacker = attackerPos.character;
    const target = targetPos.character;
    
    if (!attacker || !target || !attack) {
        return { damage: 0, isLowHP: false, wouldDefeat: false };
    }
    
    // Check if target has low HP (less than 50% of max HP)
    const maxHP = target.maxKP || target.combatStats?.kp || 100;
    const isLowHP = target.currentKP < (maxHP * 0.5);
    
    // Create a temporary attack object with bonus damage if target has low HP
    let modifiedAttack = { ...attack };
    if (isLowHP) {
        // Add 2d6 (average of 7) to base damage for low HP targets
        const bonusDamage = 2 + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6);
        modifiedAttack.damage = (attack.damage || 0) + bonusDamage;
    }
    
    // Use the existing damage calculation system
    try {
        const damageResult = calculateAttackDamage(attackerPos, targetPos, modifiedAttack, {
            isCritical: false // Don't assume critical for evaluation
        });
        
        return {
            damage: damageResult.finalDamage || 0,
            isLowHP: isLowHP,
            wouldDefeat: (damageResult.finalDamage || 0) >= target.currentKP
        };
    } catch (error) {
        console.error('Error calculating opportunistic damage:', error);
        
        // Fallback calculation
        let damage = modifiedAttack.damage || 0;
        
        // Simple type effectiveness check
        if (attack.moveType && target.pokemonTypes && target.pokemonTypes.length > 0) {
            const attackType = attack.moveType.toLowerCase();
            const targetTypes = target.pokemonTypes.map(t => typeof t === 'string' ? t.toLowerCase() : t);
            const effectiveness = getTypeEffectiveness(attackType, targetTypes);
            
            if (effectiveness !== undefined && !isNaN(effectiveness)) {
                damage = Math.round(damage * effectiveness);
            }
        }
        
        return {
            damage: Math.max(0, damage),
            isLowHP: isLowHP,
            wouldDefeat: damage >= target.currentKP
        };
    }
}

/**
 * Handle aiming strategy - select target that will take most damage from highest-range attack
 * @param {string} charId - The character's ID
 * @param {Object} activeCharacter - The character data
 * @param {Object} characterPositions - Character positions object
 * @returns {Object|null} - Object with selected target and attack, or null if no valid target
 */
export async function selectAimingTarget(charId, activeCharacter, characterPositions) {
    // Find the highest-range attack available
    const highestRangeAttack = findHighestRangeAttack(activeCharacter.character);
    
    if (!highestRangeAttack) {
        return null;
    }
    
    // Find all enemies in range of this attack
    const enemiesInRange = findAllEnemiesInRange(
        characterPositions[charId], 
        highestRangeAttack, 
        characterPositions
    );
    
    if (enemiesInRange.length === 0) {
        return null;
    }
    
    // Filter out immune targets and calculate damage for valid targets
    const validTargets = [];
    
    for (const enemy of enemiesInRange) {
        // Check if target is immune to this attack
        if (isTargetImmune(characterPositions[enemy.id], highestRangeAttack)) {
            logBattleEvent(`${enemy.character.name} ist immun gegen ${highestRangeAttack.weaponName}!`);
            continue; // Skip immune targets
        }
        
        const potentialDamage = calculatePotentialDamage(
            characterPositions[charId], 
            characterPositions[enemy.id], 
            highestRangeAttack
        );
        
        // Only include targets that would actually take damage
        if (potentialDamage > 0) {
            validTargets.push({
                enemy: enemy,
                damage: potentialDamage
            });
        }
    }
    
    // If no valid targets (all immune), fallback to aggressive behavior
    if (validTargets.length === 0) {
        logBattleEvent(`${activeCharacter.character.name} findet keine gültigen Ziele für ${highestRangeAttack.weaponName} - wechselt zu aggressivem Verhalten!`);
        // Change strategy temporarily to aggressive
        const originalStrategy = activeCharacter.character.strategy;
        activeCharacter.character.strategy = 'aggressive';
        
        // Log the strategy change
        logBattleEvent(`${activeCharacter.character.name} ändert Strategie von "${originalStrategy}" zu "aggressive" für diesen Zug.`);
        
        return null; // This will cause the system to use normal nearest enemy targeting
    }
    
    // Sort by damage (highest first) to find the best target
    validTargets.sort((a, b) => b.damage - a.damage);
    
    // Additional debugging: log all potential targets and their damage
    logBattleEvent(`${activeCharacter.character.name} bewertet Ziele:`);
    validTargets.forEach((target, index) => {
        logBattleEvent(`  ${index + 1}. ${target.enemy.character.name}: ${target.damage} geschätzter Schaden`);
    });
    
    const bestTarget = validTargets[0].enemy;
    const bestDamage = validTargets[0].damage;
    
    logBattleEvent(`${activeCharacter.character.name} zielt mit ${highestRangeAttack.weaponName} auf ${bestTarget.character.name} für maximalen Schaden (${bestDamage} geschätzter Schaden)!`);
    
    return {
        target: bestTarget,
        attack: validateAttackRange(highestRangeAttack)
    };
}

/**
 * Find the attack with the highest range that has available PP
 * @param {Object} character - The Pokemon character
 * @returns {Object|null} - Highest range attack or null
 */
function findHighestRangeAttack(character) {
    if (!character.attacks || character.attacks.length === 0) {
        return null;
    }
    
    const validAttacks = character.attacks.filter(attack => {
        return attack.weaponName === "Verzweifler" || 
               (attack.pp === undefined || attack.currentPP === undefined || attack.currentPP > 0);
    });
    
    if (validAttacks.length === 0) {
        return null;
    }
    
    // Sort by range (highest first)
    validAttacks.sort((a, b) => (b.range || 1) - (a.range || 1));
    return validAttacks[0];
}

/**
 * Find all enemies within range of a specific attack
 * @param {Object} attackerPos - Attacker's position
 * @param {Object} attack - The attack to check range for
 * @param {Object} characterPositions - All character positions
 * @returns {Array} - Array of enemies in range
 */
function findAllEnemiesInRange(attackerPos, attack, characterPositions) {
    const enemiesInRange = [];
    const attackerTeam = attackerPos.teamIndex;
    
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        
        // Skip if same team, defeated, or no character
        if (pos.teamIndex === attackerTeam || pos.isDefeated || !pos.character) {
            continue;
        }
        
        // Check if enemy is in range
        const distance = calculateMinDistanceBetweenPokemon(attackerPos, pos);
        if (distance <= attack.range) {
            // For ranged attacks, also check line of sight
            if (attack.type === 'ranged') {
                const isBlocked = isLineOfSightBlockedByAlly(attackerPos, pos);
                if (!isBlocked) {
                    enemiesInRange.push({
                        id: charId,
                        character: pos.character,
                        distance: distance
                    });
                }
            } else {
                // Melee attacks don't need line of sight
                enemiesInRange.push({
                    id: charId,
                    character: pos.character,
                    distance: distance
                });
            }
        }
    }
    
    return enemiesInRange;
}

/**
 * Calculate potential damage of an attack against a target
 * Now uses the existing type effectiveness system and properly handles immunities
 * @param {Object} attackerPos - Attacker's position data
 * @param {Object} targetPos - Target's position data
 * @param {Object} attack - The attack to simulate
 * @returns {number} - Estimated damage (0 if immune)
 */
function calculatePotentialDamage(attackerPos, targetPos, attack) {
    const attacker = attackerPos.character;
    const target = targetPos.character;
    
    if (!attacker || !target || !attack) {
        return 0;
    }
    
    // Check for immunity first - return 0 if immune
    if (isTargetImmune(targetPos, attack)) {
        return 0;
    }
    
    // Base damage from attack
    let damage = attack.damage || 0;
    
    // Apply attacker's stats (simplified)
    if (attack.attackType === 'physical' || attack.type === 'physical') {
        const attackStat = attacker.combatStats?.angriff || attacker.angriff || 50;
        damage = Math.floor(damage * (attackStat / 50));
    } else if (attack.attackType === 'special' || attack.type === 'special') {
        const spAttackStat = attacker.combatStats?.spezialAngriff || attacker.spezialAngriff || 50;
        damage = Math.floor(damage * (spAttackStat / 50));
    }
    
    // Apply target's defense (simplified)
    if (attack.attackType === 'physical' || attack.type === 'physical') {
        const defenseStat = target.combatStats?.verteidigung || target.verteidigung || 50;
        damage = Math.floor(damage * (50 / Math.max(defenseStat, 1)));
    } else if (attack.attackType === 'special' || attack.type === 'special') {
        const spDefenseStat = target.combatStats?.spezialVerteidigung || target.spezialVerteidigung || 50;
        damage = Math.floor(damage * (50 / Math.max(spDefenseStat, 1)));
    }
    
    // Apply type effectiveness using the existing system
    let effectiveness = 1.0;
    if (attack.type && target.types && target.types.length > 0) {
        effectiveness = getTypeEffectiveness(attack.type, target.types);
    }
    
    damage = Math.floor(damage * effectiveness);
    
    // Factor in target's current HP - prioritize targets that can be KO'd
    if (target.currentKP && damage >= target.currentKP) {
        damage += 50; // Bonus for potential KO
    }
    
    // Return actual calculated damage (can be 0 for very weak attacks or immunities)
    return Math.max(damage, 0);
}

/**
 * Check if a target is immune to a specific attack
 * Uses the existing type effectiveness system
 * @param {Object} targetPos - Target's position data
 * @param {Object} attack - The attack to check immunity for
 * @returns {boolean} - True if target is immune
 */
function isTargetImmune(targetPos, attack) {
    const target = targetPos.character;
    
    if (!target || !target.types || !attack.type) {
        return false; // No type info available, assume not immune
    }
    
    // Use the existing type effectiveness system
    const effectiveness = getTypeEffectiveness(attack.type, target.types);
    
    // If effectiveness is 0, target is immune
    if (effectiveness === 0) {
        return true;
    }
    
    // Check for ability-based immunities
    if (target.ability && isAbilityImmune(target.ability, attack)) {
        return true;
    }
    
    return false;
}

/**
 * Check if an ability grants immunity to an attack
 * @param {string} ability - The Pokemon's ability
 * @param {Object} attack - The attack being used
 * @returns {boolean} - True if ability grants immunity
 */
function isAbilityImmune(ability, attack) {
    // Define ability-based immunities
    const abilityImmunities = {
        'Blitzfänger': ['electric', 'elektro'],
        'Voltabsorber': ['electric', 'elektro'],
        'H2O-Absorber': ['water', 'wasser'],
        'Trockenheit': ['water', 'wasser'],
        'Schwebe': ['ground', 'boden'],
        'Vegetarier': ['grass', 'pflanze'],
        'Bodenschmaus': ['ground', 'boden'],
        'Feuerfänger': ['fire', 'feuer'],
        'Sturmsog': ['water', 'wasser'],
    };
    
    const immuneTypes = abilityImmunities[ability] || [];
    const attackType = attack.type ? attack.type.toLowerCase() : '';
    
    return immuneTypes.includes(attackType);
}

function validateAttackRange(attack) {
    const meleeAttacks = ['tackle', 'schlitzer', 'kreuzschere', 'bohrschnabel', 'walzer'];
    const attackName = attack.weaponName?.toLowerCase();
    
    if (meleeAttacks.includes(attackName) && attack.range > 1) {
        console.warn(`RANGE CORRUPTION DETECTED: ${attack.weaponName} has range ${attack.range}, correcting to 1`);
        return { ...attack, range: 1 };
    }
    
    return attack;
}