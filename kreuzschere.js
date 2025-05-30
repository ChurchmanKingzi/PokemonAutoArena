/**
 * Kreuzschere (Cross Scissor) attack animation implementation
 * Creates an X-shaped slash with a light green color
 */

import { TILE_SIZE } from '../config.js';
import { calculateFinalDamage, applyDamageAndEffects } from '../damage.js';
import { animateMeleeAttack } from '../animationManager.js';
import { calculateSizeCategory } from '../pokemonSizeCalculator.js';
import { getModifiedGena, handleLuckTokensAndForcing } from '../attackSystem.js';
import { rollAttackDice } from '../diceRoller.js';
import { getCurrentWeather, WEATHER_TYPES, getWeatherEvasionThreshold } from '../weather.js';
import { createMissMessage } from '../damageNumbers.js';
import { attemptDodge, chooseDodgePosition } from '../dodgeSystem.js';
import { animateDodge } from '../animationManager.js';

/**
 * Handle the Kreuzschere attack animation and effects
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {string} charId - Attacker character ID
 * @param {string} targetId - Target character ID
 * @returns {Promise<Object>} - Attack results
 */
export async function handleKreuzschereAttack(attacker, target, selectedAttack, charId, targetId) {
    // Initialize attack result
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
    if (selectedAttack.pp !== undefined) {
        if (selectedAttack.currentPP === undefined) {
            selectedAttack.currentPP = selectedAttack.pp;
        }
        selectedAttack.currentPP = Math.max(0, selectedAttack.currentPP - 1);
        attackResult.log.push(`${attacker.character.name} benutzt ${selectedAttack.weaponName} (${selectedAttack.currentPP}/${selectedAttack.pp} AP übrig).`);
    } else {
        attackResult.log.push(`${attacker.character.name} benutzt ${selectedAttack.weaponName}.`);
    }
    
    // Calculate size categories for animation
    const attackerSize = calculateSizeCategory(attacker.character);
    const targetSize = calculateSizeCategory(target.character);
    
    const genaValue = getModifiedGena(attacker, selectedAttack);
    
    // Execute attack roll
    let attackRoll = rollAttackDice(genaValue);
    attackResult.attackRolls.push(attackRoll);
    attackResult.log.push(`${attacker.character.name} greift ${target.character.name} mit ${selectedAttack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses} Netto.`);
    
    // Handle luck tokens and forcing
    attackRoll = await handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult);
    
    const hitThreshold = getWeatherEvasionThreshold(target);
    
    // Check for miss
    if (attackRoll.netSuccesses < hitThreshold) {
        if (hitThreshold > 1) {
            // Find which ability is providing the boost
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
        
        // Miss animation
        createMissMessage(attacker);
        
        const attackAnimPromise = new Promise((resolveAnim) => {
            animateMeleeAttack(charId, attacker, target, attackerSize, targetSize, () => {
                resolveAnim();
            });
        });
        
        await attackAnimPromise;
        return attackResult;
    }
    
    // Attack hits, attempt dodge
    attackResult.log.push(`${attacker.character.name}s Angriff trifft mit ${attackRoll.netSuccesses} Erfolgen.`);
    
    const dodgeResult = attemptDodge(attacker, target, attackRoll, selectedAttack);
    
    if (dodgeResult.roll) {
        attackResult.defenseRolls.push(dodgeResult.roll);
    }
    
    // Handle dodge success
    if (dodgeResult.success) {
        const dodgePos = chooseDodgePosition(target, attacker, false);
        
        if (dodgePos) {
            attackResult.log.push(`${target.character.name} weicht dem Kreuzschere-Angriff aus!`);
            
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
            return attackResult;
        } else {
            attackResult.log.push(`${target.character.name} versucht auszuweichen, hat aber keinen Platz!`);
        }
    }
    
    // Attack hits, handle dodge failure bonus
    if (!dodgeResult.success && dodgeResult.roll && dodgeResult.roll.netSuccesses < 0) {
        const dodgeFailureBonus = Math.abs(dodgeResult.roll.netSuccesses);
        attackRoll.netSuccesses += dodgeFailureBonus;
        attackResult.log.push(`${target.character.name} verschlechtert seine Position durch den Ausweichversuch! ${attacker.character.name} erhält +${dodgeFailureBonus} Erfolge.`);
    }
    
    // Execute the melee attack animation
    const attackPromise = new Promise((resolveAttack) => {
        // First perform the standard melee attack animation
        animateMeleeAttack(charId, attacker, target, attackerSize, targetSize, () => {
            // After melee animation, apply the X-shaped slash effect
            animateKreuzschereSlash(target, () => {
                attackResult.log.push(`${attacker.character.name}s Kreuzschere durchschneidet ${target.character.name} kreuzförmig!`);
                
                // Calculate damage
                const damageData = calculateFinalDamage(selectedAttack, target, attacker, attackRoll);
                
                // Apply damage and effects
                applyDamageAndEffects(target, attacker, selectedAttack, damageData, attackResult, targetId, charId, attackRoll);
                
                // Set attack as successful
                attackResult.success = true;
                
                resolveAttack();
            });
        });
    });
    
    await attackPromise;
    return attackResult;
}

/**
 * Create and animate an X-shaped slash effect for Kreuzschere
 * @param {Object} target - Target position information
 * @param {Function} callback - Function to call when animation completes
 */
export function animateKreuzschereSlash(target, callback) {
    // Find the battlefield grid for positioning
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (!battlefieldGrid) {
        if (callback) callback();
        return;
    }
    
    // Get the target's size category for scaling
    const sizeCategory = calculateSizeCategory(target.character) || 1;
    
    // Try to find the actual sprite element for more accurate positioning
    const characterId = Object.keys(window.characterPositions || {}).find(
        id => window.characterPositions[id].character === target.character
    );
    
    let targetElement = null;
    let centerX, centerY;
    
    // Try to get the target element using the pokemonOverlay system first (newer approach)
    try {
        const { getPokemonSprite } = window.pokemonOverlayModule || {};
        if (typeof getPokemonSprite === 'function' && characterId) {
            targetElement = getPokemonSprite(characterId);
        }
    } catch (e) {
        console.log("Could not find Pokemon sprite via overlay:", e);
    }
    
    // If we found the element, use its actual position
    if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const gridRect = battlefieldGrid.getBoundingClientRect();
        
        // Calculate position relative to the battlefield grid
        centerX = rect.left + (rect.width / 2) - gridRect.left;
        centerY = rect.top + (rect.height / 2) - gridRect.top;
    } else {
        // Fallback to grid-based positioning
        centerX = (target.x * TILE_SIZE) + (TILE_SIZE / 2);
        centerY = (target.y * TILE_SIZE) + (TILE_SIZE / 2);
    }
    
    // Scale the animation based on target size
    const baseSize = TILE_SIZE * 2.5; // Base size for size category 1
    const scaledSize = baseSize * Math.max(1, sizeCategory * 0.8); // Scale with size, but not linearly
    
    // Create slash container
    const slashContainer = document.createElement('div');
    slashContainer.className = 'kreuzschere-slash-container';
    slashContainer.style.position = 'absolute';
    slashContainer.style.left = `${centerX}px`;
    slashContainer.style.top = `${centerY}px`;
    slashContainer.style.transform = 'translate(-50%, -50%)';
    slashContainer.style.width = `${scaledSize}px`;
    slashContainer.style.height = `${scaledSize}px`;
    slashContainer.style.pointerEvents = 'none';
    slashContainer.style.zIndex = '2000';
    
    // Calculate slash thickness based on size
    const slashThickness = Math.max(3, Math.min(8, 3 + sizeCategory));
    
    // Add CSS if not present
    if (!document.getElementById('kreuzschere-slash-animation-style')) {
        const slashStyle = document.createElement('style');
        slashStyle.id = 'kreuzschere-slash-animation-style';
        slashStyle.textContent = `
            @keyframes kreuzschere-slash-animation-1 {
                0% { transform: translate(-50%, -50%) rotate(45deg) scale(0); opacity: 0; }
                15% { transform: translate(-50%, -50%) rotate(45deg) scale(0.2); opacity: 1; }
                70% { transform: translate(-50%, -50%) rotate(45deg) scale(1); opacity: 0.9; }
                100% { transform: translate(-50%, -50%) rotate(45deg) scale(1.1); opacity: 0; }
            }
            
            @keyframes kreuzschere-slash-animation-2 {
                0% { transform: translate(-50%, -50%) rotate(-45deg) scale(0); opacity: 0; }
                15% { transform: translate(-50%, -50%) rotate(-45deg) scale(0.2); opacity: 1; }
                70% { transform: translate(-50%, -50%) rotate(-45deg) scale(1); opacity: 0.9; }
                100% { transform: translate(-50%, -50%) rotate(-45deg) scale(1.1); opacity: 0; }
            }
        `;
        document.head.appendChild(slashStyle);
    }
    
    // Create first slash (top-left to bottom-right)
    const slash1 = document.createElement('div');
    slash1.className = 'kreuzschere-slash';
    slash1.style.position = 'absolute';
    slash1.style.top = '50%';
    slash1.style.left = '50%';
    slash1.style.width = '100%';
    slash1.style.height = `${slashThickness}px`;
    slash1.style.backgroundColor = 'rgba(144, 238, 144, 0.9)'; // Light green color
    slash1.style.boxShadow = '0 0 10px rgba(144, 238, 144, 0.8)';
    slash1.style.borderRadius = '2px';
    slash1.style.transformOrigin = 'center center';
    slash1.style.animation = 'kreuzschere-slash-animation-1 0.6s forwards';
    
    // Create second slash (top-right to bottom-left)
    const slash2 = document.createElement('div');
    slash2.className = 'kreuzschere-slash';
    slash2.style.position = 'absolute';
    slash2.style.top = '50%';
    slash2.style.left = '50%';
    slash2.style.width = '100%';
    slash2.style.height = `${slashThickness}px`;
    slash2.style.backgroundColor = 'rgba(144, 238, 144, 0.9)'; // Light green color
    slash2.style.boxShadow = '0 0 10px rgba(144, 238, 144, 0.8)';
    slash2.style.borderRadius = '2px';
    slash2.style.transformOrigin = 'center center';
    slash2.style.animation = 'kreuzschere-slash-animation-2 0.6s 0.1s forwards'; // Slight delay for second slash
    
    // Add slashes to container
    slashContainer.appendChild(slash1);
    slashContainer.appendChild(slash2);
    
    // Add to battlefield
    battlefieldGrid.appendChild(slashContainer);
    
    // Remove after animation
    setTimeout(() => {
        if (slashContainer.parentNode) {
            slashContainer.remove();
        }
        if (callback) callback();
    }, 800);
}