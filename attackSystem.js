/**
 * Attack system for Pokémon battles
 */

import { handleSandAttackCounter } from './Abilities/sandgewalt.js';

import { rollAttackDice, forcedRoll } from './diceRoller.js';
import { getCharacterPositions } from './characterPositions.js';
import { createMissMessage } from './damageNumbers.js';
import { animateDodge, animateMeleeAttack, animateClawSlash } from './animationManager.js';
import { shouldUseLuckToken, useLuckToken } from './luckTokenSystem.js';
import { calculateMinDistanceBetweenPokemon } from './pokemonDistanceCalculator.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { addStatusEffect } from './statusEffects.js';
import { logBattleEvent } from './battleLog.js';
import { getCurrentWeather, WEATHER_TYPES, getWeatherEvasionThreshold } from './weather.js';
import { applyDamageAndEffects, calculateFinalDamage } from './damage.js';
import { doesPokemonOccupyTile } from './pokemonDistanceCalculator.js';
import { areAttacksInProgress, waitForAttacksToComplete } from './turnSystem.js';
import { isCharacterInAnimation } from './turnSystem.js';
import { calculateAttackDamage } from './damage.js';

import { isValidGiftpuderTarget } from './Attacken/giftpuder.js';
import { isValidSchlafpuderTarget } from './Attacken/schlafpuder.js';
import { isValidStachelsporeTarget } from './Attacken/stachelspore.js';
import { isValidSandwirbelTarget } from './Attacken/sandwirbel.js';
import { isValidFadenschussTarget } from './Attacken/fadenschuss.js';
import { shouldSelectExplosion, shouldAbortExplosion } from './Attacken/explosion.js';
import { handleRankenhiebAttack } from './Attacken/rankenhieb.js';
import { handleWalzerAttack } from './Attacken/walzer.js';
import { handleKreuzschereAttack } from './Attacken/kreuzschere.js';
import { isWalzerViable } from './Attacken/walzer.js';
import { handleToxinAttack, isValidToxinTarget } from './Attacken/toxin.js';
import { applyBlitzkanoneGENAPenalty } from './Attacken/blitzkanone.js';
import { animateBohrschnabelWithEffects } from './Attacken/bohrschnabel.js';
import { handleFlammenwurfAttack } from './Attacken/flammenwurf.js';
import { handleBlubbstrahlAttack } from './Attacken/blubbstrahl.js';
import { handleDonnerAttack, getDonnerPriorityModifier } from './Attacken/donner.js';

import { getCurrentStatValue } from './statChanges.js';
import { isConeAttack } from './coneHits.js';
import { fireProjectile, isLineOfSightBlockedByAlly, startProjectileSystem, clearAllProjectiles } from './projectileSystem.js';
import { getTerrainAt, isLineOfSightBlockedByMountain } from './terrainEffects.js';
import { getTypeEffectiveness, getAttackerAttack, getTargetDefense } from './effectivenessLookupTable.js';
import { areExplosionsInProgress } from './turnSystem.js';

// Track current attacks for synchronization
let activeAttackPromises = [];

// Track active attack callbacks to prevent duplicates
const activeAttackCallbacks = new Set();

/**
 * Get the effective range of an attack for selection purposes
 * Cone attacks get -1 range penalty during selection
 * @param {Object} attack - The attack object
 * @returns {number} - Effective range for selection
 */
function getEffectiveRangeForSelection(attack) {
    const baseRange = attack.range || 1;
    
    // Check if this is a cone attack
    if (isConeAttack(attack)) {
        return Math.max(1, baseRange - 1); // Minimum range of 1, subtract 1 for cone attacks
    }
    
    return baseRange;
}

/**
 * Reset all active attacks and ensure everything is complete before continuing
 * @returns {Promise} - Promise that resolves when all attacks are complete
 */
export async function completeAllActiveAttacks() {
    // Wait for all active attack promises to resolve
    await Promise.all(activeAttackPromises);
    
    // Clear the array when all promises resolve
    activeAttackPromises = [];
    
    // IMPORTANT: Also wait for any ongoing explosions
    if (areExplosionsInProgress()) {
        console.log("Waiting for explosions to complete in completeAllActiveAttacks...");
        
        let waitCount = 0;
        while (areExplosionsInProgress() && waitCount < 50) { // Max 5 second wait
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        
        if (waitCount >= 50) {
            console.warn('Timeout waiting for explosions in completeAllActiveAttacks');
        }
    }

    // Clear any active projectiles as a safety measure
    clearAllProjectiles();
    
    // ADDITIONAL CLEANUP: Remove any lingering attack visual effects
    const battlefield = document.querySelector('.battlefield-grid');
    if (battlefield) {
        // Remove cone indicators
        const cones = battlefield.querySelectorAll('.attack-cone');
        cones.forEach(cone => {
            if (cone.parentNode) {
                cone.parentNode.removeChild(cone);
            }
        });
        
        // Remove particle containers
        const particles = battlefield.querySelectorAll('.eissturm-particles-container');
        particles.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        // Remove tile highlights
        const highlights = battlefield.querySelectorAll('.tile-highlights-container');
        highlights.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
    }
    
    // Clear any active cones from the cone system
    try {
        const attackConeModule = await import('./attackCone.js');
        attackConeModule.removeConeIndicator(); // Remove all cones
    } catch (err) {
        console.warn('Could not clear cones:', err);
    }
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
    
    // Get the maximum range for each attack type (using effective range for cone attacks)
    const maxRangedRange = rangedAttacks.length > 0 ? 
        Math.max(...rangedAttacks.map(attack => getEffectiveRangeForSelection(attack))) : 0;
    const maxMeleeRange = meleeAttacks.length > 0 ? 
        Math.max(...meleeAttacks.map(attack => getEffectiveRangeForSelection(attack))) : 0;
    
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
            const effectiveRange = getEffectiveRangeForSelection(attack);
            if (distance > effectiveRange) continue;
            
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
                const rangeDifference = Math.abs(distance - effectiveRange);
                
                // Targets at exact range get highest priority
                if (rangeDifference === 0) {
                    targetPriority = 2000; // Very high priority
                } else if (distance === effectiveRange - 1) {
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
 * Now includes special Explosion selection logic and Walzer viability checking
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {number} distance - Precalculated minimum distance
 * @returns {Object|null} - Best attack or null if no valid attack
 */
export async function getBestAttack(attacker, target, distance = null, reaction = false) {
    // If distance wasn't provided, calculate it
    if (distance === null) {
        distance = calculateMinDistanceBetweenPokemon(attacker, target);
    }
    
    // If the character has no attacks, return null
    if (!attacker.character.attacks || attacker.character.attacks.length === 0) {
        return null;
    }

    // SPECIAL EXPLOSION LOGIC - Check if Explosion should be randomly selected
    // Only apply explosion logic if we're not looking for reaction attacks
    if (!reaction && shouldSelectExplosion(attacker.character)) {
        // Find the Explosion attack
        const explosionAttack = attacker.character.attacks.find(attack => 
            attack.weaponName === "Explosion" && 
            (attack.currentPP === undefined || attack.currentPP > 0)
        );
        
        if (explosionAttack) {            
            // Check ally/enemy ratio in explosion range
            if (shouldAbortExplosion(attacker, explosionAttack.range || 6)) {
                // Continue with normal attack selection, but exclude Explosion
            } else {
                // Use Explosion!
                logBattleEvent(`${attacker.character.name} entscheidet sich für eine verheerende Explosion!`);
                // Set attack properties to ensure it works properly
                explosionAttack.type = 'ranged';
                explosionAttack.range = explosionAttack.range || 6;
                explosionAttack.cone = 360; // Full circle
                return explosionAttack;
            }
        }
    }
    
    // Get target's types for effectiveness calculation
    const targetTypes = target.character.pokemonTypes || [];
    
    // Find all valid attacks (have PP and are in range)
    // Exclude Explosion from normal selection
    let verzweiflerAttack = null;
    let validAttacks = [];
    
    for (let i = 0; i < attacker.character.attacks.length; i++) {
        const attack = attacker.character.attacks[i];

        // NEVER select Explosion in normal attack selection
        if (attack.weaponName === "Explosion") {
            continue;
        }

        // Apply reaction filtering
        if (reaction) {
            // If looking for reaction attacks, skip attacks without reaction property
            if (!attack.reaction) {
                continue;
            }
        } else {
            // If not looking for reaction attacks, skip attacks with reaction property
            if (attack.reaction) {
                continue;
            }
        }

        if (attack.weaponName === "Verzweifler") {
            verzweiflerAttack = attack;
        }

        // NEVER select notOffensive moves (weather moves, etc.) in normal attack selection
        if (attack.notOffensive === true) {
            continue;
        }
        
        // Skip attacks with no PP (except Verzweifler which doesn't use PP)
        if (attack.weaponName !== "Verzweifler" && 
            attack.pp !== undefined && 
            attack.currentPP !== undefined && 
            attack.currentPP <= 0) {
            continue;
        }
        
        if (attack.weaponName === "Walzer") {
            if (!isWalzerViable(attacker, target)) {
                continue; // Skip Walzer if it's not viable
            }
        }
        
        // Skip Toxin if target is already poisoned or immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'toxin') {
            if (!await isValidToxinTarget(target)) {
                continue;
            }
        }
        
        // Skip Giftpuder if target is already poisoned or immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'giftpuder') {
            if (!await isValidGiftpuderTarget(target)) {
                continue;
            }
        }
        
        // Skip Schlafpuder if target is already asleep or immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'schlafpuder') {
            if (!await isValidSchlafpuderTarget(target)) {
                continue;
            }
        }

        // Skip Stachelspore if target is already paralyzed or immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'stachelspore') {
            if (!await isValidStachelsporeTarget(target)) {
                continue;
            }
        }

        // Skip Sandwirbel if target has GENA of 2 or less or is immune
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'sandwirbel') {
            if (!isValidSandwirbelTarget(target)) {
                continue;
            }
        }

        // Skip Fadenschuss if target's initiative is already at -6
        if (attack.weaponName && attack.weaponName.toLowerCase() === 'fadenschuss') {
            if (!isValidFadenschussTarget(target)) {
                continue;
            }
        }

        // Skip strahl attacks if line doesn't contain more enemies than allies
        if (attack.strahl === true) {
            const lineCounts = countCharactersOnStrahlLine(attacker, target);
            if (lineCounts.enemies <= lineCounts.allies) {
                continue; // Skip this strahl attack - not enough enemies on the line
            }
        }
        
        // Check for immunity if attack has base damage > 0
        if (attack.damage && attack.damage > 0) {
            try {
                // Calculate projected damage to check for immunity
                const damageResult = calculateAttackDamage(attacker, target, attack, {
                    isCritical: false // Don't assume critical for immunity check
                });
                console.log("Prognostizierter Schaden: " + damageResult.finalDamage);
                console.log("Effektivität: " + damageResult.effectivenessDesc);
                // If projected damage is 0, target is immune - skip this attack
                if (damageResult.finalDamage === 0) {
                    continue;
                }
            } catch (error) {
                console.error(`Error calculating damage for ${attack.weaponName}:`, error);
                // If calculation fails, continue with the attack to avoid breaking selection
            }
        }

        // Add to valid attacks
        validAttacks.push(attack);
    }
    
    // Only use Verzweifler as fallback if NOT looking for reaction attacks
    if (validAttacks.length === 0 && verzweiflerAttack && !reaction) {
        verzweiflerAttack.range = 1;
        verzweiflerAttack.type = 'melee'; // Also ensure it's marked as melee
        verzweiflerAttack.isLastResort = true;
        return verzweiflerAttack;
    }

    // No valid attacks
    if (validAttacks.length === 0) {
        return null;
    }
    
    // If Verzweifler is the only option, use it (but not if looking for reaction attacks)
    if (validAttacks.length === 1 && validAttacks[0].weaponName === "Verzweifler" && !reaction) {
        return validAttacks[0];
    }
    
    // Check if any non-Verzweifler attacks exist
    const nonVerzweiflerAttacks = validAttacks.filter(attack => attack.weaponName !== "Verzweifler");
    
    // If there are non-Verzweifler attacks, filter out Verzweifler
    // OR if we're looking for reaction attacks, always filter out Verzweifler
    if (nonVerzweiflerAttacks.length > 0 || reaction) {
        validAttacks = nonVerzweiflerAttacks;
    }

    // Check if the Pokémon has "aiming" or "zielend" strategy
    if (attacker.character.strategy === 'aiming' || attacker.character.strategy === 'zielend') {
        // Sort by range (highest first) instead of calculating damage
        validAttacks.sort((a, b) => (b.range || 1) - (a.range || 1));
        // Return the attack with the highest range
        return validAttacks[0];
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
 * Initialize attack result and handle PP reduction
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @returns {Object} - Initial attack result
 */
export function initializeAttackResult(attacker, target, selectedAttack) {
    const attackResult = {
        attacker: attacker.character.name,
        target: target.character.name,
        success: false,
        attackRolls: [],
        defenseRolls: [],
        damage: 0,
        forcedRolls: 0,
        log: []
    };
    
    // Handle PP reduction
    if (selectedAttack.weaponName !== "Verzweifler" && selectedAttack.pp !== undefined) {
        if (selectedAttack.currentPP === undefined) {
            selectedAttack.currentPP = selectedAttack.pp;
        }
        selectedAttack.currentPP = Math.max(0, selectedAttack.currentPP - 1);
        attackResult.log.push(`${attacker.character.name} benutzt ${selectedAttack.weaponName} (${selectedAttack.currentPP}/${selectedAttack.pp} AP übrig).`);
    } else {
        attackResult.log.push(`${attacker.character.name} benutzt ${selectedAttack.weaponName}.`);
    }
    
    return attackResult;
}

/**
 * Handle cone attack execution
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {string} charId - Attacker character ID
 * @returns {Promise<Object>} - Attack result
 */
async function handleConeAttack(attacker, target, selectedAttack, charId) {
    const attackResult = initializeAttackResult(attacker, target, selectedAttack);
    attackResult.success = true; // Cone attacks always "succeed" in firing
    
    const genaValue = getModifiedGena(attacker, selectedAttack);
    let attackRoll = rollAttackDice(genaValue);
    attackResult.attackRolls.push(attackRoll);
    
    attackResult.log.push(`${attacker.character.name} greift mit ${selectedAttack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses} Netto.`);
    
    // Handle luck tokens and forcing
    attackRoll = await handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult);
    
    // Apply weather evasion threshold for cone attacks
    const hitThreshold = getWeatherEvasionThreshold(target);
    const coneHits = attackRoll.netSuccesses >= hitThreshold;
    
    if (coneHits) {
        attackResult.log.push(`${attacker.character.name}s ${selectedAttack.weaponName} trifft!`);
        if (hitThreshold > 1) {
            attackResult.log.push(`${target.character.name}s Wetterreaktion konnte den Kegel-Angriff nicht vollständig vermeiden!`);
        }
    } else {
        attackResult.log.push(`${attacker.character.name}s ${selectedAttack.weaponName} verfehlt das Ziel!`);
        if (hitThreshold > 1) {
            attackResult.log.push(`${target.character.name}s Wetterreaktion half beim Ausweichen vor dem Kegel-Angriff!`);
        }
    }
    
    // Fire the cone attack
    const conePromise = new Promise((resolveCone) => {
        fireProjectile(attacker, target, selectedAttack, coneHits, () => {
            resolveCone();
        });
    });
    
    startProjectileSystem();
    await conePromise;
    
    return attackResult;
}

/**
 * Handle luck tokens and forcing rolls
 * @param {Object} attacker - Attacker character data
 * @param {Object} attackRoll - Initial attack roll
 * @param {number} genaValue - Modified GENA value
 * @param {string} charId - Attacker character ID
 * @param {Object} attackResult - Attack result to log to
 * @returns {Object} - Final attack roll after tokens/forcing
 */
export async function handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult) {
    // Check luck token usage
    if (attackRoll.netSuccesses <= 0 && shouldUseLuckToken(attacker.character, attackRoll)) {
        const luckTokenResult = useLuckToken(attacker.character, attackRoll, genaValue, charId);
        if (luckTokenResult.success) {
            attackResult.log.push(luckTokenResult.message);
            attackRoll = luckTokenResult.roll;
            attackResult.attackRolls.push(attackRoll);
        }
    }
    
    // Handle forcing rolls
    let forcedCount = 0;
    const forcingMode = attacker.character.forcingMode || 'always';
    let usedLuckToken = false;

    while (attackRoll.netSuccesses === 0) {
        forcedCount++;
        attackResult.forcedRolls++;
        
        attackResult.log.push(`${attacker.character.name} erhält genau 0 Erfolge und forciert!`);
        
        attackRoll = forcedRoll(genaValue, forcedCount, forcingMode);
        attackResult.attackRolls.push(attackRoll);
        
        attackResult.log.push(`Forcieren-Wurf (${forcedCount}): [${attackRoll.rolls.join(', ')}] mit Erschwernis von ${forcedCount} = ${attackRoll.netSuccesses} Netto.`);
        
        if (attackRoll.netSuccesses < 0 && !usedLuckToken && shouldUseLuckToken(attacker.character, attackRoll)) {
            const luckTokenResult = useLuckToken(attacker.character, attackRoll, genaValue);
            if (luckTokenResult.success) {
                usedLuckToken = true;
                attackResult.log.push(luckTokenResult.message);
                attackRoll = luckTokenResult.roll;
                attackResult.attackRolls.push(attackRoll);
            }
        }
        
        if (forcingMode === 'once' && forcedCount >= 1) break;
        if (forcingMode === 'dynamic' && forcedCount >= Math.floor(genaValue / 4) + 1) break;
        if (forcingMode === 'never') break;
    }
    
    return attackRoll;
}

/**
 * Handle attack miss animations
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {string} charId - Attacker character ID
 * @returns {Promise<void>} - Resolves when miss animation completes
 */
async function handleAttackMiss(attacker, target, selectedAttack, charId) {
    if (selectedAttack.type === 'ranged') {
        const projectilePromise = new Promise((resolveProjectile) => {
            fireProjectile(attacker, target, selectedAttack, false, () => {
                resolveProjectile();
            });
        });
        startProjectileSystem();
        await projectilePromise;
    } else {
        createMissMessage(attacker);
        const attackerSize = calculateSizeCategory(attacker.character);
        const targetSize = calculateSizeCategory(target.character);
        
        const attackAnimPromise = new Promise((resolveAnim) => {
            animateMeleeAttack(charId, attacker, target, attackerSize, targetSize, () => {
                resolveAnim();
            });
        });
        await attackAnimPromise;
    }
}

/**
 * Apply on-hit status effects
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {Object} attackResult - Attack result to update
 * @param {Object} attackRoll - Attack roll result
 * @param {boolean} shouldDealDamage - Whether damage was dealt
 */
export function applyOnHitStatusEffects(attacker, target, selectedAttack, attackResult, attackRoll, shouldDealDamage) {
    if (!attackResult.success || attackRoll.netSuccesses < 0) return;
    
    if (selectedAttack.weaponName === "Glut") {
        const isImmuneType = target.character.pokemonTypes && 
                          target.character.pokemonTypes.some(type => 
                              type.toLowerCase() === 'fire' || type.toLowerCase() === 'feuer');
        
        if (!isImmuneType) {
            const statusApplied = applyStatusEffectFromAttack(target.character, 'burned', attacker.character);
            if (statusApplied) {
                attackResult.log.push(`${attacker.character.name}s Glut verursacht eine Verbrennung bei ${target.character.name}!`);
            }
        } else {
            attackResult.log.push(`${target.character.name} ist als Feuer-Pokémon immun gegen Verbrennungen!`);
        }
    }
    
    if (selectedAttack.weaponName === "Donnerschock") {
        const isImmuneType = target.character.pokemonTypes && 
                          target.character.pokemonTypes.some(type => 
                              type.toLowerCase() === 'ground' || type.toLowerCase() === 'boden' || 
                              type.toLowerCase() === 'electric' || type.toLowerCase() === 'elektro');
        
        if (!isImmuneType) {
            const statusApplied = applyStatusEffectFromAttack(target.character, 'paralyzed', attacker.character);
            if (statusApplied) {
                const message = shouldDealDamage ? 
                    `${attacker.character.name}s Donnerschock paralysiert ${target.character.name}!` :
                    `${attacker.character.name}s Donnerschock paralysiert ${target.character.name} trotz fehlendem Schaden!`;
                attackResult.log.push(message);
            }
        } else {
            attackResult.log.push(`${target.character.name} ist gegen Paralyse immun!`);
        }
    }
}

/**
 * Execute ranged attack with dodge handling
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
    // Handle dodge failure bonus (only if no reaction was triggered)
    if (!dodgeResult.success && !dodgeResult.reactionTriggered && dodgeResult.roll && dodgeResult.roll.netSuccesses < 0) {
        const dodgeFailureBonus = Math.abs(dodgeResult.roll.netSuccesses);
        attackRoll.netSuccesses += dodgeFailureBonus;
        attackResult.log.push(`${target.character.name} verschlechtert seine Position durch den Ausweichversuch! ${attacker.character.name} erhält +${dodgeFailureBonus} Erfolge.`);
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
    
    // Log reaction status
    if (dodgeResult.reactionTriggered) {
        attackResult.log.push(`${target.character.name} führt eine Reaktionsattacke aus und kann nicht ausweichen!`);
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
 * Execute melee attack with dodge handling
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
    // Handle dodge failure bonus (only if no reaction was triggered)
    if (!dodgeResult.success && !dodgeResult.reactionTriggered && dodgeResult.roll && dodgeResult.roll.netSuccesses < 0) {
        const dodgeFailureBonus = Math.abs(dodgeResult.roll.netSuccesses);
        attackRoll.netSuccesses += dodgeFailureBonus;
        attackResult.log.push(`${target.character.name} verschlechtert seine Position durch den Ausweichversuch! ${attacker.character.name} erhält +${dodgeFailureBonus} Erfolge.`);
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
    
    // Log reaction status
    if (dodgeResult.reactionTriggered) {
        attackResult.log.push(`${target.character.name} führt eine Reaktionsattacke aus und kann nicht ausweichen!`);
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

/**
 * Main attack execution function - refactored for clarity
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @returns {Promise<Object>} - Attack results
 */
export async function performAttack(attacker, target) {
    if (areAttacksInProgress()) {
        console.log("Waiting for attacks to complete before performing attack...");
        await waitForAttacksToComplete();
    }
    
    // Check if the attacker is in an animation state
    const characterPositions = getCharacterPositions();

    const attackerId = Object.keys(characterPositions).find(id => 
        characterPositions[id].character === attacker.character);
    
    if (attackerId && isCharacterInAnimation(attacker.character, characterPositions[attackerId])) {
        return {
            attacker: attacker.character.name,
            target: target.character.name,
            success: false,
            attackRolls: [],
            defenseRolls: [],
            damage: 0
        };
    }

    const targetId = Object.keys(characterPositions).find(id => characterPositions[id].character === target.character);
    const charId = Object.keys(characterPositions).find(id => characterPositions[id].character === attacker.character);
    
    if (!targetId) {
        console.error('Target character ID not found');
        return {
            attacker: attacker.character.name,
            target: target.character.name,
            success: false,
            attackRolls: [],
            defenseRolls: [],
            damage: 0,
            log: ['Error: Target not found']
        };
    }
    
    try {
        const selectedAttack = await getBestAttack(attacker, target);

        if (!selectedAttack) {
            return {
                attacker: attacker.character.name,
                target: target.character.name,
                success: false,
                attackRolls: [],
                defenseRolls: [],
                damage: 0,
                log: [`${attacker.character.name} kann ${target.character.name} nicht angreifen!`]
            };
        }

        handleSandAttackCounter(attacker.character, selectedAttack);
        
        // Create a unique ID for this attack
        const attackId = `${attacker.character.uniqueId}_${target.character.uniqueId}_${Date.now()}_${Math.random()}`;
        
        // Handle special attack types with safe callbacks
        if (isConeAttack(selectedAttack)) {
            const safeCallback = createSafeCallback(attackId, () => {
                // The cone attack callback logic would go here
                // This ensures endTurn() is only called once
            });
            return await handleConeAttack(attacker, target, selectedAttack, charId, safeCallback);
        }

        if (selectedAttack.weaponName === "Kreuzschere") {
            const safeCallback = createSafeCallback(attackId, () => {
                // Kreuzschere callback logic
            });
            return await handleKreuzschereAttack(attacker, target, selectedAttack, charId, targetId, safeCallback);
        }
        
        if (selectedAttack.weaponName === "Rankenhieb") {
            const safeCallback = createSafeCallback(attackId, () => {
                // Rankenhieb callback logic
            });
            return await handleRankenhiebAttack(attacker, target, selectedAttack, charId, targetId, safeCallback);
        }

        if (selectedAttack.weaponName === "Walzer") {
            const safeCallback = createSafeCallback(attackId, () => {
                // Walzer callback logic
            });
            return await handleWalzerAttack(attacker, target, selectedAttack, charId, targetId, safeCallback);
        }
        
        if (selectedAttack.weaponName === "Toxin") {
            const safeCallback = createSafeCallback(attackId, () => {
                // Toxin callback logic
            });
            return await handleToxinAttack(attacker, target, selectedAttack, charId, targetId, safeCallback);
        }

        if (selectedAttack.weaponName === "Flammenwurf") {
            const safeCallback = createSafeCallback(attackId, () => {
                // Flammenwurf callback logic
            });
            return await handleFlammenwurfAttack(attacker, target, selectedAttack, charId, targetId, safeCallback);
        }

        if (selectedAttack.weaponName === "Blubbstrahl") {
            const safeCallback = createSafeCallback(attackId, () => {
                // Blubbstrahl callback logic
            });
            return await handleBlubbstrahlAttack(attacker, target, selectedAttack, charId, targetId, safeCallback);
        }

        if (selectedAttack.weaponName === "Donner") {
            const safeCallback = createSafeCallback(attackId, () => {
                // Donner callback logic
            });
            return await handleDonnerAttack(attacker, target, selectedAttack, charId, targetId, safeCallback);
        }
        
        // Check line of sight for ranged attacks
        if (selectedAttack.type === 'ranged' && isLineOfSightBlockedByAlly(attacker, target)) {
            return {
                attacker: attacker.character.name,
                target: target.character.name,
                success: false,
                attackRolls: [],
                defenseRolls: [],
                damage: 0,
                log: [`${attacker.character.name} can't get a clear shot - an ally is in the way!`]
            };
        }
        
        // Standard attack flow with safe callback
        const attackResult = initializeAttackResult(attacker, target, selectedAttack);
        const genaValue = getModifiedGena(attacker, selectedAttack);
        
        // Execute attack roll
        let attackRoll = rollAttackDice(genaValue);
        attackResult.attackRolls.push(attackRoll);

        // Apply Blitzkanone GENA penalty if applicable
        if (selectedAttack.weaponName && selectedAttack.weaponName.toLowerCase() === 'blitzkanone') {
            const originalNet = attackRoll.netSuccesses;
            attackRoll = applyBlitzkanoneGENAPenalty(attackRoll);
            attackResult.log.push(`${attacker.character.name} greift ${target.character.name} mit ${selectedAttack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${originalNet} Netto (${attackRoll.netSuccesses} nach Blitzkanone-Malus).`);
        } else {
            attackResult.log.push(`${attacker.character.name} greift ${target.character.name} mit ${selectedAttack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses} Netto.`);
        }

        // Handle luck tokens and forcing
        attackRoll = await handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult);
        
        // Get weather evasion threshold
        const hitThreshold = getWeatherEvasionThreshold(target);

        // Check for miss
        if (attackRoll.netSuccesses < hitThreshold) {
            if (hitThreshold > 1) {
                const abilities = target.character.statsDetails?.abilities || [];
                const currentWeather = getCurrentWeather();
                
                let abilityName = "";
                if (abilities.some(a => a.name === "Sandschleier" || a.englishName === "sand-veil") && 
                    currentWeather.state === WEATHER_TYPES.SANDSTURM) {
                    abilityName = "Sandschleier";
                } else if (abilities.some(a => a.name === "Schneemantel" || a.englishName === "snow-cloak") && 
                        (currentWeather.state === WEATHER_TYPES.HAGEL || currentWeather.state === WEATHER_TYPES.SCHNEE)) {
                    abilityName = "Schneemantel";
                }
                
                attackResult.log.push(`${target.character.name}s ${abilityName} nutzt das Wetter aus! Mindestens ${hitThreshold} Erfolge erforderlich.`);
            }
            await handleAttackMiss(attacker, target, selectedAttack, charId);
            return attackResult;
        }
        
        // Attack hits, attempt dodge
        attackResult.log.push(`${attacker.character.name}s Angriff trifft mit ${attackRoll.netSuccesses} Erfolgen.`);
        
        const { attemptDodge } = await import('./dodgeSystem.js');
        const dodgeResult = attemptDodge(attacker, target, attackRoll, selectedAttack);
        
        if (dodgeResult.roll) {
            attackResult.defenseRolls.push(dodgeResult.roll);
        }
        
        // Create safe callback for the projectile
        const projectileCallback = createSafeCallback(attackId, (hitSuccess) => {
            // This callback will eventually lead to endTurn() being called
            // but now it's protected against duplicate execution
        });
        
        // Execute attack based on type with safe callback
        if (selectedAttack.type === 'ranged') {
            await executeRangedAttack(attacker, target, selectedAttack, attackRoll, attackResult, dodgeResult, targetId, charId, projectileCallback);
        } else {
            await executeMeleeAttack(attacker, target, selectedAttack, attackRoll, attackResult, dodgeResult, targetId, charId, projectileCallback);
        }
        
        // Add to active promises and return
        activeAttackPromises.push(Promise.resolve(attackResult));
        return attackResult;
        
    } catch (error) {
        console.error("Error during attack execution:", error);
        return {
            attacker: attacker.character.name,
            target: target.character.name,
            success: false,
            attackRolls: [],
            defenseRolls: [],
            damage: 0,
            log: [`Error during attack: ${error.message}`]
        };
    }
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
            
            // Use effective range for selection (cone attacks get -1 penalty)
            const effectiveRange = getEffectiveRangeForSelection(attack);
            if (effectiveRange >= distance) {
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

    // Check for "aiming"/"zielend" strategy with ranged attacks
    if ((attacker.strategy === 'aiming' || attacker.strategy === 'zielend') && 
        attack.range > 1) {
        threshold -= 1;
    }
    
    // Ensure threshold never goes below 2
    threshold = Math.max(2, threshold);
    
    // Check if net successes meets or exceeds the threshold
    return netSuccesses >= threshold;
}

/**
 * Find the nearest ally to a character considering all occupied tiles
 * @param {Object} character - Character object
 * @param {number} teamIndex - Team index of the character
 * @param {number} currentX - Current x position
 * @param {number} currentY - Current y position
 * @param {string} excludeCharId - Character ID to exclude (usually self)
 * @returns {Object|null} - Nearest ally position or null if none found
 */
export function findNearestAlly(character, teamIndex, currentX, currentY, excludeCharId = null) {
    const characterPositions = getCharacterPositions();
    let nearestAlly = null;
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
        
        // Skip if different team, defeated, or if it's the excluded character (usually self)
        if (pos.teamIndex !== teamIndex || pos.isDefeated || charId === excludeCharId) continue;
        
        // Calculate minimum distance between all occupied tiles
        const distance = calculateMinDistanceBetweenPokemon(currentPos, pos);
        
        // Update if this is closer
        if (distance < minDistance) {
            minDistance = distance;
            nearestAlly = {
                x: pos.x,
                y: pos.y,
                character: pos.character,
                distance: distance,
                id: charId // Store character ID for easier reference
            };
        }
    }
    
    return nearestAlly;
}

/**
 * Find the nearest ally in attack range considering all occupied tiles
 * @param {Object} charData - Character data
 * @param {string} excludeCharId - Character ID to exclude (usually self)
 * @returns {Promise<Object|null>} - Promise resolving to nearest ally in range or null if none
 */
export async function findNearestAllyInRange(charData, excludeCharId = null) {
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
    
    // Get the maximum range for each attack type (using effective range for cone attacks)
    const maxRangedRange = rangedAttacks.length > 0 ? 
        Math.max(...rangedAttacks.map(attack => getEffectiveRangeForSelection(attack))) : 0;
    const maxMeleeRange = meleeAttacks.length > 0 ? 
        Math.max(...meleeAttacks.map(attack => getEffectiveRangeForSelection(attack))) : 0;
    
    // Candidates array to store potential targets with priority info
    const candidates = [];
    
    // Check all characters for potential ally targets
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        
        // Skip if different team, defeated, or if it's the excluded character
        if (pos.teamIndex !== teamIndex || pos.isDefeated || charId === excludeCharId) continue;
        
        // Calculate minimum distance between all occupied tiles
        const distance = calculateMinDistanceBetweenPokemon(charData, pos);
        
        // For each valid attack, check if this ally is in range
        for (const attack of validAttacks) {
            const effectiveRange = getEffectiveRangeForSelection(attack);
            if (distance > effectiveRange) continue;
            
            // For ranged attacks, check line of sight
            if (attack.type === 'ranged') {
                // Check if blocked by another character
                const blocked = isLineOfSightBlockedByAlly(charData, pos);
                if (blocked) continue;
            }
            
            // Calculate priority for this target (closer = higher priority)
            let targetPriority = 1000 - distance;
            
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
    
    // No valid ally targets
    if (candidates.length === 0) return null;
    
    // Sort by priority (highest first)
    candidates.sort((a, b) => b.priority - a.priority);
    
    // Return highest priority ally target
    return candidates[0];
}

/**
 * Create a safe callback wrapper that prevents duplicate executions
 * @param {string} attackId - Unique identifier for this attack
 * @param {Function} originalCallback - The original callback function
 * @returns {Function} - Wrapped callback that can only execute once
 */
function createSafeCallback(attackId, originalCallback) {
    return function safeCallback(...args) {
        // Check if this callback has already been executed
        if (activeAttackCallbacks.has(attackId)) {
            console.warn(`Callback for attack ${attackId} already executed - ignoring duplicate`);
            return;
        }
        
        // Mark this callback as executed
        activeAttackCallbacks.add(attackId);
        
        try {
            // Execute the original callback
            if (typeof originalCallback === 'function') {
                originalCallback(...args);
            }
        } catch (error) {
            console.error(`Error in attack callback ${attackId}:`, error);
        } finally {
            // Remove from active callbacks after a delay to prevent immediate re-execution
            setTimeout(() => {
                activeAttackCallbacks.delete(attackId);
            }, 100);
        }
    };
}

/**
 * Clear all active attack callbacks - call this during battle reset
 */
export function clearActiveAttackCallbacks() {
    activeAttackCallbacks.clear();
    console.log("Cleared all active attack callbacks");
}

/**
 * Count enemies and allies along a line from attacker through and beyond target
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {number} maxRange - Maximum range to check along the line (default: 20)
 * @returns {Object} - {enemies: number, allies: number}
 */
function countCharactersOnStrahlLine(attacker, target, maxRange = 20) {
    const characterPositions = getCharacterPositions();
    
    // Calculate direction vector from attacker to target
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If target is at same position as attacker, no valid line
    if (distance === 0) {
        return { enemies: 0, allies: 0 };
    }
    
    // Normalize direction vector
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    let enemyCount = 0;
    let allyCount = 0;
    
    // Check positions along the line from attacker through and beyond target
    // Start from position 1 (skip attacker's position) and go to maxRange
    for (let step = 1; step <= maxRange; step++) {
        const checkX = Math.round(attacker.x + dirX * step);
        const checkY = Math.round(attacker.y + dirY * step);
        
        // Check if any character occupies this position
        for (const charId in characterPositions) {
            const charPos = characterPositions[charId];
            
            // Skip defeated characters
            if (charPos.isDefeated) continue;
            
            // Skip the attacker (though we shouldn't hit this due to step starting at 1)
            if (charPos === attacker) continue;
            
            // Check if character occupies this tile (accounting for Pokemon size)
            if (doesPokemonOccupyTile(charPos, checkX, checkY)) {
                if (charPos.teamIndex === attacker.teamIndex) {
                    allyCount++;
                } else {
                    enemyCount++;
                }
            }
        }
    }
    
    return { enemies: enemyCount, allies: allyCount };
}