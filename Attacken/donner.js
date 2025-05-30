/**
 * donner.js - Implementation of the Donner (Thunder) attack
 * This powerful electric attack targets a 3x3 area and has special
 * weather interactions. In rain, it gets a bonus and is prioritized.
 * In sun or sandstorm, it receives penalties and is de-prioritized.
 */

import { createSquareDangerArea } from '../dangerIndicator.js';
import { getCurrentWeather, WEATHER_TYPES } from '../weather.js';
import { addStatusEffect } from '../statusEffects.js';
import { TILE_SIZE } from '../config.js';
import { createDamageNumber } from '../damageNumbers.js';
import { updatePokemonHPBar } from '../pokemonOverlay.js';
import { updateInitiativeHP } from '../initiativeDisplay.js';
import { getCharacterPositions } from '../characterPositions.js';
import { calculateSizeCategory } from '../pokemonSizeCalculator.js';
import { notifyAttackStarted, notifyAttackCompleted } from '../turnSystem.js';

/**
 * Handle the Donner attack
 * @param {Object} attacker - The attacking character
 * @param {Object} target - The target character
 * @param {Object} attack - The attack data
 * @param {string} attackerId - The attacker's ID
 * @param {string} targetId - The target's ID
 * @param {Function} callback - Callback function when attack completes
 * @returns {Promise<Object>} - Attack result
 */
export async function handleDonnerAttack(attacker, target, attack, attackerId, targetId, callback) {
    notifyAttackStarted('donner');

    // Create attack result object
    const attackResult = {
        attacker: attacker.character.name,
        target: target.character.name,
        success: false,
        attackRolls: [],
        defenseRolls: [],
        damage: 0,
        log: []
    };
    
    // Lock the turn system by setting animation flags on attacker
    attacker.animationInProgress = true;
    attacker.cannotMove = true;
    attacker.isUsingDonner = true;
    
    try {
        // Reduce PP
        if (attack.pp !== undefined && attack.currentPP !== undefined) {
            attack.currentPP = Math.max(0, attack.currentPP - 1);
            attackResult.log.push(`${attacker.character.name} benutzt Donner (${attack.currentPP}/${attack.pp} AP übrig).`);
        } else {
            attackResult.log.push(`${attacker.character.name} benutzt Donner.`);
        }
        
        // Check weather conditions for success penalty/bonus
        const currentWeather = getCurrentWeather();
        let successModifier = -1; // Default -1 success
        let weatherMessage = "Donner hat standardmäßig einen Erfolgsmalus von -1.";
        
        if (currentWeather.state === WEATHER_TYPES.REGEN) {
            successModifier = 1; // +1 success in rain
            weatherMessage = "Donner erhält im Regen einen Erfolgsbonus von +1!";
        } else if (currentWeather.state === WEATHER_TYPES.SONNE || currentWeather.state === WEATHER_TYPES.SANDSTURM) {
            successModifier = -3; // -3 success in sun or sandstorm
            weatherMessage = `Donner hat bei ${currentWeather.state} einen starken Erfolgsmalus von -3!`;
        }
        
        attackResult.log.push(weatherMessage);
        
        // Roll for attack with modifier
        const genaValue = attacker.character.combatStats?.gena || 1;
        const { rollAttackDice } = await import('../diceRoller.js');
        const attackRoll = rollAttackDice(genaValue);
        
        // Apply the weather modifier to net successes
        attackRoll.netSuccesses += successModifier;
        
        // Log the roll with modifier applied
        attackResult.log.push(`${attacker.character.name} würfelt für Donner: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses - successModifier} Netto (${attackRoll.netSuccesses} nach Wettermodifikator).`);
        attackResult.attackRolls.push(attackRoll);
        
        // Get character positions to know where everyone is
        const characterPositions = getCharacterPositions();
        
        // Determine the actual target area based on GENA success
        let targetArea = { x: target.x, y: target.y };
        let targetDescription = `${target.character.name}`;
        
        // If GENA success is <= -2, target closest ally to intended target if any
        if (attackRoll.netSuccesses <= -2) {
            const closestAlly = findClosestAllyToTarget(target, attacker.teamIndex, characterPositions);
            
            if (closestAlly) {
                targetArea = { x: closestAlly.x, y: closestAlly.y };
                targetDescription = `den verbündeten ${closestAlly.character.name} (kritischer Fehlschlag!)`;
                attackResult.log.push(`Der Donner verfehlt das Ziel völlig und bewegt sich in Richtung eines Verbündeten!`);
            } else {
                // No allies found, find a random empty area
                const emptyArea = findRandomEmptyArea(target, characterPositions);
                targetArea = emptyArea;
                targetDescription = `eine leere Fläche (Fehlschlag!)`;
                attackResult.log.push(`Der Donner verfehlt das Ziel völlig!`);
            }
        }
        // If GENA success is <= 0 but > -2, hit an empty area
        else if (attackRoll.netSuccesses <= 0) {
            const emptyArea = findRandomEmptyArea(target, characterPositions);
            targetArea = emptyArea;
            targetDescription = `eine leere Fläche (Fehlschlag!)`;
            attackResult.log.push(`Der Donner verfehlt das Ziel!`);
        }
        
        // Display danger indicator for 1.5 seconds (increased from 1 second)
        attackResult.log.push(`Ein gefährliches Knistern erfüllt die Luft über dem Gebiet um ${targetDescription}!`);
        
        // Import camera system for focusing on the danger area
        const { focusOnCharacter, zoomToPoint } = await import('../cameraSystem.js');
        
        // Create a list of potential targets in the area
        const potentialTargets = findPokemonInArea(targetArea, 3);
        
        // Create the danger indicator with longer duration
        const dangerIndicator = createSquareDangerArea(targetArea, 3, {
            color: 'rgba(255, 0, 0, 0.5)',
            duration: 1500,
            onComplete: async () => {
                try {                    
                    // Create the dramatic lightning effect and wait for it to complete
                    await createLightningEffect(targetArea);
                    
                    // Find all Pokemon still in the danger area after dodges
                    const finalTargets = findPokemonInArea(targetArea, 3);
                    
                    // Apply damage and effects to each target still in the area
                    for (const finalTarget of finalTargets) {
                        // Skip if already defeated
                        if (characterPositions[finalTarget.id].isDefeated) continue;
                        
                        // Import damage system
                        const { applyAttackDamage } = await import('../damage.js');
                        const { calculateFinalDamage } = await import('../damage.js');
                        
                        // Calculate damage for this target
                        const damageData = calculateFinalDamage(attack, characterPositions[finalTarget.id], attacker, attackRoll);
                        
                        // Apply damage
                        const damageResult = await applyAttackDamage(
                            attacker, 
                            characterPositions[finalTarget.id], 
                            attack, 
                            damageData.finalDamage,
                            {
                                attackerId: attackerId,
                                targetId: finalTarget.id,
                                isCritical: damageData.isCritical
                            }
                        );
                        
                        // Log damage
                        if (damageResult.applied) {
                            attackResult.log.push(`${finalTarget.character.name} wird vom Donner getroffen und erleidet ${damageResult.damage} Schaden!`);
                            attackResult.damage += damageResult.damage;
                            attackResult.success = true;
                            
                            // Apply paralysis if GENA successes >= 3 and target is not immune
                            if (attackRoll.netSuccesses >= 3 && !damageResult.defeated) {
                                const isImmuneType = finalTarget.character.pokemonTypes && 
                                                  finalTarget.character.pokemonTypes.some(type => 
                                                      type.toLowerCase() === 'ground' || type.toLowerCase() === 'boden' || 
                                                      type.toLowerCase() === 'electric' || type.toLowerCase() === 'elektro');
                                
                                if (!isImmuneType) {
                                    const statusApplied = addStatusEffect(finalTarget.character, 'paralyzed');
                                    if (statusApplied) {
                                        attackResult.log.push(`${finalTarget.character.name} wird durch den starken Donner paralysiert!`);
                                    }
                                } 
                            }
                        }
                    }
                    
                    // If no targets were hit
                    if (!attackResult.success) {
                        attackResult.log.push(`Der Donner trifft niemanden!`);
                    }
                                        
                    // ENHANCED TIMING: Linger on the scene for dramatic effect
                    await new Promise(resolve => setTimeout(resolve, 1200));
                                        
                    // Then smoothly return camera to attacker
                    await focusOnCharacter(attackerId, 800);
                    
                    
                    // ENHANCED TIMING: Additional wait after camera returns
                    await new Promise(resolve => setTimeout(resolve, 100));
                                        
                } finally {
                    // ALWAYS unlock the turn system and notify completion
                    attacker.animationInProgress = false;
                    attacker.cannotMove = false;
                    attacker.isUsingDonner = false;
                    
                    // Clear flags from position object too
                    if (characterPositions[attackerId]) {
                        characterPositions[attackerId].animationInProgress = false;
                        characterPositions[attackerId].cannotMove = false;
                        characterPositions[attackerId].isUsingDonner = false;
                    }
                    
                    // Notify that attack is complete using unified system
                    notifyAttackCompleted('donner');
                    
                    // Call the callback to complete the attack
                    if (callback) callback(attackResult);
                }
            }
        });
        
        // After creating the danger indicator, immediately focus camera on the target area
        const centerX = (targetArea.x + 0.5) * TILE_SIZE;
        const centerY = (targetArea.y + 0.5) * TILE_SIZE;
        await zoomToPoint(centerX, centerY, 1.25, 400); // Slightly slower zoom for drama
        
        // Now give Pokemon in area a chance to dodge
        for (const potentialTarget of potentialTargets) {
            // Skip if already defeated
            if (characterPositions[potentialTarget.id].isDefeated) continue;
            
            // Attempt dodge
            const dodgeResult = await attemptDodgeFromArea(attacker, characterPositions[potentialTarget.id], potentialTarget.id);
            
            if (dodgeResult.success) {
                attackResult.log.push(`${characterPositions[potentialTarget.id].character.name} sieht die Gefahr und weicht aus dem Bereich aus!`);
            } else {
                attackResult.log.push(`${characterPositions[potentialTarget.id].character.name} kann nicht aus dem Gefahrenbereich ausweichen!`);
            }
        }
        
        // Return the attack result (it will be updated asynchronously)
        return attackResult;
    } catch (error) {
        console.error("Error in Donner attack:", error);
        
        // Always cleanup on error
        attacker.animationInProgress = false;
        attacker.cannotMove = false;
        attacker.isUsingDonner = false;
        
        if (characterPositions[attackerId]) {
            characterPositions[attackerId].animationInProgress = false;
            characterPositions[attackerId].cannotMove = false;
            characterPositions[attackerId].isUsingDonner = false;
        }
        
        notifyAttackCompleted('donner');
        
        if (callback) callback(attackResult);
    }
    
    // Return the attack result (it will be updated asynchronously)
    return attackResult;
}

/**
 * Find the closest ally to a target
 * @param {Object} target - The target position
 * @param {number} teamIndex - Team index of the attacker
 * @param {Object} characterPositions - All character positions
 * @returns {Object|null} - Closest ally or null if none found
 */
function findClosestAllyToTarget(target, teamIndex, characterPositions) {
    let closestAlly = null;
    let minDistance = Infinity;
    
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        
        // Skip if not on same team as target, or if defeated, or if it's the target itself
        if (pos.teamIndex !== target.teamIndex || pos.isDefeated || pos === target) continue;
        
        // Calculate distance from target
        const dx = pos.x - target.x;
        const dy = pos.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update if this is closer
        if (distance < minDistance) {
            minDistance = distance;
            closestAlly = pos;
        }
    }
    
    return closestAlly;
}

/**
 * Find a random empty area near a target
 * @param {Object} target - The target position
 * @param {Object} characterPositions - All character positions
 * @returns {Object} - Random empty position {x, y}
 */
function findRandomEmptyArea(target, characterPositions) {
    // Try up to 20 random positions within 5 tiles of target
    const maxRadius = 5;
    const maxAttempts = 20;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random offset within radius
        const radius = 2 + Math.floor(Math.random() * (maxRadius - 1)); // Between 2-5 tiles away
        const angle = Math.random() * Math.PI * 2; // Random angle
        
        // Calculate position
        const offsetX = Math.round(Math.cos(angle) * radius);
        const offsetY = Math.round(Math.sin(angle) * radius);
        
        const x = target.x + offsetX;
        const y = target.y + offsetY;
        
        // Check if position is valid (within grid and not occupied)
        if (x >= 0 && x < 20 && y >= 0 && y < 20) {
            // Check if position is occupied by any character
            let isOccupied = false;
            for (const charId in characterPositions) {
                const pos = characterPositions[charId];
                if (!pos.isDefeated && pos.x === x && pos.y === y) {
                    isOccupied = true;
                    break;
                }
            }
            
            if (!isOccupied) {
                return { x, y };
            }
        }
    }
    
    // If no empty space found after all attempts, return a default position
    // that's at least away from the target
    return {
        x: Math.max(0, Math.min(19, target.x + 3)),
        y: Math.max(0, Math.min(19, target.y + 3))
    };
}

/**
 * Create a more dramatic lightning bolt effect on the target area
 * @param {Object} targetPos - Target position {x, y}
 * @returns {Promise<void>} - Promise that resolves when animation completes
 */
async function createLightningEffect(targetPos) {
    return new Promise(resolve => {
        // Create container for lightning effect
        const container = document.createElement('div');
        container.className = 'lightning-effect-container';
        container.style.position = 'absolute';
        container.style.zIndex = '200';
        container.style.pointerEvents = 'none';
        
        // Create multiple lightning bolts for more dramatic effect
        const numMainBolts = 3;
        const numSecondaryBolts = 8;
        
        // Create the main lightning bolts (larger, more prominent)
        for (let i = 0; i < numMainBolts; i++) {
            const lightning = document.createElement('div');
            lightning.className = 'lightning-bolt-main';
            
            // Vary the position slightly for each main bolt
            const offsetX = (i - 1) * (TILE_SIZE * 0.3);
            
            // Position lightning over the target area
            lightning.style.position = 'absolute';
            lightning.style.left = `${targetPos.x * TILE_SIZE - TILE_SIZE + offsetX}px`;
            lightning.style.top = '0';
            lightning.style.width = `${TILE_SIZE * 2}px`; // Wider bolts
            lightning.style.height = `${targetPos.y * TILE_SIZE + TILE_SIZE * 2}px`;
            
            // Enhanced styling for main bolts
            lightning.style.background = 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 30%, rgba(200,230,255,0.9) 50%, rgba(255,255,255,1) 70%, rgba(255,255,255,0) 100%)';
            lightning.style.boxShadow = '0 0 30px #fff, 0 0 60px #4df, 0 0 90px #4df, 0 0 120px #08f';
            lightning.style.opacity = '0';
            lightning.style.filter = 'blur(2px)';
            lightning.style.transform = 'translateX(3px)';
            
            // Staggered animation delays for more dynamic effect
            lightning.style.animation = `lightning-flash-main 1.2s ease-out ${i * 0.1}s`;
            
            container.appendChild(lightning);
        }
        
        // Add more secondary lightning bolts for dramatic effect
        for (let i = 0; i < numSecondaryBolts; i++) {
            const secondaryBolt = document.createElement('div');
            secondaryBolt.className = 'lightning-bolt-secondary';
            
            // More varied positioning
            const offsetX = -TILE_SIZE * 1.5 + Math.random() * TILE_SIZE * 4;
            const offsetY = Math.random() * TILE_SIZE * 0.5;
            
            // Position
            secondaryBolt.style.position = 'absolute';
            secondaryBolt.style.left = `${targetPos.x * TILE_SIZE + offsetX}px`;
            secondaryBolt.style.top = `${offsetY}px`;
            secondaryBolt.style.width = `${8 + Math.random() * 20}px`; // Varied width
            secondaryBolt.style.height = `${targetPos.y * TILE_SIZE + TILE_SIZE * 2 - offsetY}px`;
            
            // Style
            secondaryBolt.style.background = 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 40%, rgba(120,210,255,0.7) 60%, rgba(255,255,255,0.8) 80%, rgba(255,255,255,0) 100%)';
            secondaryBolt.style.boxShadow = '0 0 15px #fff, 0 0 30px #4df, 0 0 45px #08f';
            secondaryBolt.style.opacity = '0';
            secondaryBolt.style.filter = 'blur(1px)';
            
            // Randomize animation delay and duration
            const delay = 0.05 + Math.random() * 0.4;
            const duration = 0.8 + Math.random() * 0.6;
            secondaryBolt.style.animation = `lightning-flash-secondary ${duration}s ease-out ${delay}s`;
            
            container.appendChild(secondaryBolt);
        }
        
        // Enhanced flash overlay for the whole battlefield
        const flash = document.createElement('div');
        flash.className = 'lightning-flash-overlay';
        flash.style.position = 'absolute';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = '#ffffff';
        flash.style.opacity = '0';
        flash.style.animation = 'lightning-flash-overlay 1.5s ease-out';
        
        // Add rumble effect to the entire battlefield
        const battlefield = document.querySelector('.battlefield-grid');
        if (battlefield) {
            battlefield.style.animation = 'lightning-rumble 1.5s ease-out';
        }
        
        // Enhanced style animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes lightning-flash-main {
                0% { opacity: 0; transform: translateX(5px) scaleY(0.8); }
                8% { opacity: 1; transform: translateX(-3px) scaleY(1.1); }
                15% { opacity: 0.9; transform: translateX(4px) scaleY(0.9); }
                25% { opacity: 1; transform: translateX(-2px) scaleY(1.05); }
                35% { opacity: 0.8; transform: translateX(1px) scaleY(0.95); }
                50% { opacity: 0.9; transform: translateX(-1px) scaleY(1.02); }
                65% { opacity: 0.7; transform: translateX(2px) scaleY(0.98); }
                80% { opacity: 0.5; transform: translateX(0px) scaleY(1.0); }
                100% { opacity: 0; transform: translateX(0px) scaleY(1.0); }
            }
            
            @keyframes lightning-flash-secondary {
                0% { opacity: 0; transform: translateX(3px); }
                12% { opacity: 0.8; transform: translateX(-2px); }
                25% { opacity: 0.6; transform: translateX(3px); }
                40% { opacity: 0.7; transform: translateX(-1px); }
                60% { opacity: 0.4; transform: translateX(1px); }
                80% { opacity: 0.2; transform: translateX(0px); }
                100% { opacity: 0; transform: translateX(0px); }
            }
            
            @keyframes lightning-flash-overlay {
                0% { opacity: 0; }
                8% { opacity: 0.9; }
                15% { opacity: 0.4; }
                25% { opacity: 0.7; }
                35% { opacity: 0.3; }
                50% { opacity: 0.5; }
                65% { opacity: 0.2; }
                80% { opacity: 0.3; }
                100% { opacity: 0; }
            }
            
            @keyframes lightning-rumble {
                0% { transform: translate(0px, 0px); }
                10% { transform: translate(-1px, -1px); }
                20% { transform: translate(1px, 1px); }
                30% { transform: translate(-1px, 0px); }
                40% { transform: translate(1px, -1px); }
                50% { transform: translate(-1px, 1px); }
                60% { transform: translate(1px, 0px); }
                70% { transform: translate(-1px, -1px); }
                80% { transform: translate(1px, 1px); }
                90% { transform: translate(0px, -1px); }
                100% { transform: translate(0px, 0px); }
            }
        `;
        document.head.appendChild(style);
        
        // Add elements to container
        container.appendChild(flash);
        
        // Add to battlefield
        if (battlefield) {
            battlefield.appendChild(container);
        } else {
            document.body.appendChild(container);
        }
        
        // Enhanced impact effect at the target area (earlier for better sync)
        setTimeout(() => {
            createImpactEffect(targetPos);
        }, 200);
        
        // Extended cleanup time to let the animation fully play
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
            if (battlefield) {
                battlefield.style.animation = ''; // Clear rumble animation
            }
            resolve();
        }, 1200); // Extended from 500ms to 1800ms for more dramatic effect
    });
}

/**
 * Create impact effect when lightning hits the ground
 * @param {Object} targetPos - Target position {x, y}
 */
function createImpactEffect(targetPos) {
    // Create container for impact effect
    const container = document.createElement('div');
    container.className = 'lightning-impact-container';
    container.style.position = 'absolute';
    container.style.zIndex = '180';
    container.style.pointerEvents = 'none';
    
    // Position impact at the target area
    container.style.left = `${targetPos.x * TILE_SIZE - TILE_SIZE * 1.5}px`;
    container.style.top = `${targetPos.y * TILE_SIZE - TILE_SIZE * 1.5}px`;
    container.style.width = `${TILE_SIZE * 4}px`;
    container.style.height = `${TILE_SIZE * 4}px`;
    
    // Create central explosion ring
    const explosionRing = document.createElement('div');
    explosionRing.className = 'lightning-explosion-ring';
    explosionRing.style.position = 'absolute';
    explosionRing.style.left = '50%';
    explosionRing.style.top = '50%';
    explosionRing.style.width = '20px';
    explosionRing.style.height = '20px';
    explosionRing.style.borderRadius = '50%';
    explosionRing.style.border = '3px solid #4df';
    explosionRing.style.boxShadow = '0 0 20px #4df, inset 0 0 20px #fff';
    explosionRing.style.transform = 'translate(-50%, -50%) scale(0)';
    explosionRing.style.animation = 'explosion-ring 1.2s ease-out';
    
    container.appendChild(explosionRing);
    
    // Create more electric particles
    for (let i = 0; i < 35; i++) {
        const particle = document.createElement('div');
        particle.className = 'electric-particle';
        
        // Randomize position within the target area
        const posX = TILE_SIZE * 1.5 + Math.random() * TILE_SIZE;
        const posY = TILE_SIZE * 1.5 + Math.random() * TILE_SIZE;
        
        // Set particle properties
        particle.style.position = 'absolute';
        particle.style.left = `${posX}px`;
        particle.style.top = `${posY}px`;
        particle.style.width = `${2 + Math.random() * 8}px`;
        particle.style.height = `${2 + Math.random() * 8}px`;
        particle.style.backgroundColor = Math.random() > 0.3 ? '#ffffff' : (Math.random() > 0.5 ? '#4df' : '#08f');
        particle.style.borderRadius = '50%';
        particle.style.boxShadow = '0 0 8px currentColor, 0 0 16px currentColor';
        
        // Add animation
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 120;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;
        
        particle.style.transform = 'scale(0)';
        particle.style.animation = `particle-burst-enhanced 1.0s ease-out ${Math.random() * 0.3}s`;
        
        // Create custom keyframes for this particle
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes particle-burst-enhanced {
                0% { transform: scale(0) translate(0, 0); opacity: 1; }
                30% { transform: scale(1.5) translate(${endX * 0.3}px, ${endY * 0.3}px); opacity: 1; }
                100% { transform: scale(0.5) translate(${endX}px, ${endY}px); opacity: 0; }
            }
            
            @keyframes explosion-ring {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                50% { transform: translate(-50%, -50%) scale(8); opacity: 0.8; }
                100% { transform: translate(-50%, -50%) scale(15); opacity: 0; }
            }
        `;
        document.head.appendChild(styleElement);
        
        container.appendChild(particle);
        
        // Clean up style element after animation
        setTimeout(() => {
            if (styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }
        }, 1300);
    }
    
    // Add to battlefield
    const battlefield = document.querySelector('.battlefield-grid');
    if (battlefield) {
        battlefield.appendChild(container);
    } else {
        document.body.appendChild(container);
    }
    
    // Remove after animation completes
    setTimeout(() => {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }, 1200);
}

/**
 * Find all Pokemon in an area around a target position
 * @param {Object} centerPos - Center position {x, y}
 * @param {number} size - Size of the area (e.g., 3 for 3x3)
 * @returns {Array} - Array of found Pokemon with their IDs
 */
function findPokemonInArea(centerPos, size) {
    const radius = Math.floor(size / 2);
    const characterPositions = getCharacterPositions();
    const foundPokemon = [];
    
    // Loop through all characters to check if they're in the area
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        
        // Skip if already defeated
        if (pos.isDefeated) continue;
        
        // Check if any part of this Pokemon is in the target area
        let inArea = false;
        
        // Get Pokemon size
        const pokeSize = calculateSizeCategory(pos.character);
        
        // For each tile the Pokemon occupies
        for (let dx = 0; dx < pokeSize; dx++) {
            for (let dy = 0; dy < pokeSize; dy++) {
                // Pokemon position plus offset
                const checkX = pos.x + dx;
                const checkY = pos.y + dy;
                
                // Check if this tile is in the target area
                if (Math.abs(checkX - centerPos.x) <= radius && Math.abs(checkY - centerPos.y) <= radius) {
                    inArea = true;
                    break;
                }
            }
            if (inArea) break;
        }
        
        if (inArea) {
            foundPokemon.push({
                id: charId,
                character: pos.character,
                position: pos
            });
        }
    }
    
    return foundPokemon;
}

/**
 * Try to dodge out of a danger area
 * @param {Object} attacker - The attacking character
 * @param {Object} target - The target character
 * @param {string} targetId - The target's ID
 * @returns {Promise<Object>} - Dodge result {success, message}
 */
async function attemptDodgeFromArea(attacker, target, targetId) {
    // Import dodge system modules
    const { attemptDodge, chooseDodgePosition } = await import('../dodgeSystem.js');
    const { animateDodge } = await import('../animationManager.js');
    const { updatePokemonPosition } = await import('../pokemonOverlay.js');
    
    // Create a mock attack roll for the dodge calculation
    const mockAttackRoll = {
        netSuccesses: 2 // Moderate difficulty to dodge
    };
    
    // Create a mock attack for the dodge calculation
    const mockAttack = {
        type: 'ranged'
    };
    
    // Attempt dodge
    const dodgeResult = attemptDodge(attacker, target, mockAttackRoll, mockAttack);
    
    // If dodge failed, return early
    if (!dodgeResult.success) {
        return { success: false, message: `${target.character.name} kann nicht ausweichen!` };
    }
    
    // Try to find a safe position outside the danger area
    const dodgePos = findSafeDodgePosition(target, 3);
    
    // If no safe position, dodge fails
    if (!dodgePos) {
        return { success: false, message: `${target.character.name} findet keinen sicheren Ort zum Ausweichen!` };
    }
    
    // Animate the dodge movement
    await new Promise(resolve => {
        animateDodge(targetId, dodgePos, () => {
            resolve();
        });
    });
    
    // Update character position in the game state
    target.x = dodgePos.x;
    target.y = dodgePos.y;
    
    // Update visual position in the overlay system
    updatePokemonPosition(targetId, dodgePos.x, dodgePos.y);
    
    return { 
        success: true, 
        message: `${target.character.name} weicht erfolgreich aus!`,
        newPosition: dodgePos
    };
}

/**
 * Find a safe position outside the danger area
 * @param {Object} pokemon - The Pokemon trying to dodge
 * @param {number} dangerSize - Size of the danger area
 * @returns {Object|null} - Safe position {x, y} or null if none found
 */
function findSafeDodgePosition(pokemon, dangerSize) {
    // Get character positions
    const characterPositions = getCharacterPositions();
    
    // Current position
    const currentX = pokemon.x;
    const currentY = pokemon.y;
    
    // Pokemon size (for collision checking)
    const pokemonSize = calculateSizeCategory(pokemon.character);
    
    // Try positions in increasing distance from current position
    // First prioritize moving directly away from center of danger area
    const directions = [
        { dx: -1, dy: 0 }, // Left
        { dx: 1, dy: 0 },  // Right
        { dx: 0, dy: -1 }, // Up
        { dx: 0, dy: 1 },  // Down
        { dx: -1, dy: -1 }, // Up-Left
        { dx: 1, dy: -1 },  // Up-Right
        { dx: -1, dy: 1 },  // Down-Left
        { dx: 1, dy: 1 }    // Down-Right
    ];
    
    // Sort directions by priority (straight directions first, then diagonals)
    // This helps make dodging look more natural
    
    // Try each direction
    for (let distance = 1; distance <= 3; distance++) {
        for (const dir of directions) {
            const newX = currentX + (dir.dx * distance);
            const newY = currentY + (dir.dy * distance);
            
            // Check if position is within grid bounds
            if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) {
                continue;
            }
            
            // Check if position is outside danger area
            const dangerRadius = Math.floor(dangerSize / 2);
            if (Math.abs(newX - currentX) <= dangerRadius && Math.abs(newY - currentY) <= dangerRadius) {
                continue; // Still in danger area
            }
            
            // Check for collisions with other Pokemon
            let hasCollision = false;
            
            // Skip collision check with self
            const selfId = Object.keys(characterPositions).find(id => 
                characterPositions[id] === pokemon);
            
            // Check each tile the Pokemon would occupy
            for (let dx = 0; dx < pokemonSize; dx++) {
                for (let dy = 0; dy < pokemonSize; dy++) {
                    const checkX = newX + dx;
                    const checkY = newY + dy;
                    
                    // Check if any other Pokemon occupies this tile
                    for (const charId in characterPositions) {
                        // Skip if this is the same Pokemon or it's defeated
                        if (charId === selfId || characterPositions[charId].isDefeated) {
                            continue;
                        }
                        
                        const otherPokemon = characterPositions[charId];
                        const otherSize = calculateSizeCategory(otherPokemon.character);
                        
                        // Check if this Pokemon occupies the tile
                        for (let ox = 0; ox < otherSize; ox++) {
                            for (let oy = 0; oy < otherSize; oy++) {
                                const otherX = otherPokemon.x + ox;
                                const otherY = otherPokemon.y + oy;
                                
                                if (checkX === otherX && checkY === otherY) {
                                    hasCollision = true;
                                    break;
                                }
                            }
                            if (hasCollision) break;
                        }
                        
                        if (hasCollision) break;
                    }
                    
                    if (hasCollision) break;
                }
                if (hasCollision) break;
            }
            
            // If no collision, this is a valid position
            if (!hasCollision) {
                return { x: newX, y: newY };
            }
        }
    }
    
    // No valid position found
    return null;
}

/**
 * Check if Donner should be prioritized based on current weather
 * @returns {number} - Priority modifier (positive = higher priority, negative = lower)
 */
export function getDonnerPriorityModifier() {
    const currentWeather = getCurrentWeather();
    
    if (currentWeather.state === WEATHER_TYPES.REGEN) {
        return 3; // Significantly increase priority in rain
    } else if (currentWeather.state === WEATHER_TYPES.SONNE || currentWeather.state === WEATHER_TYPES.SANDSTURM) {
        return -3; // Significantly decrease priority in sun or sandstorm
    }
    
    return 0; // Normal priority in other weather
}