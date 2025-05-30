/**
 * Toxin attack module
 * Applies the "Schwer vergiftet" (badly poisoned) status effect to the target
 */
import { addStatusEffect, hasStatusImmunity } from '../statusEffects.js';
import { logBattleEvent } from '../battleLog.js';
import { getWeatherEvasionThreshold } from '../weather.js';

// Add CSS for Toxin animation
function addToxinStyles() {
    // Check if styles already exist
    if (document.getElementById('toxin-styles')) {
        return;
    }
    
    // Create style element
    const style = document.createElement('style');
    style.id = 'toxin-styles';
    style.textContent = `
        .toxin-projectile {
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: radial-gradient(circle, #9b59b6 0%, #8e44ad 70%, #4a235a 100%);
            box-shadow: 0 0 10px #9b59b6;
            filter: drop-shadow(0 0 5px #8e44ad);
            pointer-events: none;
            will-change: transform;
            transform: translate(-50%, -50%);
        }
        
        .toxin-impact {
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(155, 89, 182, 0.8) 0%, rgba(142, 68, 173, 0.6) 50%, rgba(74, 35, 90, 0) 100%);
            pointer-events: none;
            will-change: transform;
            animation: toxin-impact 0.5s ease-out forwards;
        }
        
        .toxin-droplet {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #9b59b6;
            pointer-events: none;
            will-change: transform;
            animation: toxin-droplet 0.5s ease-out forwards;
        }
        
        @keyframes toxin-impact {
            0% {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) scale(2);
                opacity: 0;
            }
        }
        
        @keyframes toxin-droplet {
            0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
        }
    `;
    
    // Add to document
    document.head.appendChild(style);
}

/**
 * Animate the Toxin attack
 * @param {string} attackerId - The ID of the attacker character
 * @param {string} targetId - The ID of the target character
 * @param {boolean} hit - Whether the attack hit
 * @param {Object} targetPosition - The position of the target
 * @returns {Promise<void>} - Promise that resolves when the animation is complete
 */
export function animateToxin(attackerId, targetId, hit, targetPosition) {
    // Ensure styles are added
    addToxinStyles();
    
    return new Promise(async (resolve) => {
        try {
            // Import required modules for proper positioning
            const { getPokemonSprite } = await import('../pokemonOverlay.js');
            const { TILE_SIZE } = await import('../config.js');
            const { getCharacterPositions } = await import('../characterPositions.js');
            const { getCurrentBattleZoom } = await import('../cameraSystem.js');
            
            // Get character positions
            const characterPositions = getCharacterPositions();
            const attackerPos = characterPositions[attackerId];
            const targetPos = characterPositions[targetId];
            
            if (!attackerPos) {
                console.error('Attacker position not found');
                resolve();
                return;
            }
            
            // Get the battlefield grid and overlay container
            const battlefieldGrid = document.querySelector('.battlefield-grid');
            if (!battlefieldGrid) {
                console.error('Battlefield grid not found');
                resolve();
                return;
            }
            
            // Create the toxin projectile
            const toxinProjectile = document.createElement('div');
            toxinProjectile.className = 'toxin-projectile';
            toxinProjectile.style.zIndex = '2000'; // High z-index to appear above Pokemon
            
            // Add the projectile to the battlefield
            battlefieldGrid.appendChild(toxinProjectile);
            
            // Get Pokemon sprites from overlay
            const attackerSprite = getPokemonSprite(attackerId);
            const targetSprite = getPokemonSprite(targetId);
            
            // Get the current zoom level
            const currentZoom = getCurrentBattleZoom();
            
            // Calculate grid-based positions (more reliable than getBoundingClientRect)
            // Starting position (center of attacker's tile)
            const startX = (attackerPos.x + 0.5) * TILE_SIZE; 
            const startY = (attackerPos.y + 0.5) * TILE_SIZE;
            
            // Set initial position
            toxinProjectile.style.left = `${startX}px`;
            toxinProjectile.style.top = `${startY}px`;
            toxinProjectile.style.transform = 'translate(-50%, -50%)'; // Center the projectile
            
            // Determine end position based on whether attack hit
            let endX, endY;
            
            if (hit && targetPos) {
                // If hit, go to the target
                endX = (targetPos.x + 0.5) * TILE_SIZE;
                endY = (targetPos.y + 0.5) * TILE_SIZE;
            } else if (targetPosition) {
                // If missed or target not found, go to the target position (empty tile)
                endX = (targetPosition.x + 0.5) * TILE_SIZE;
                endY = (targetPosition.y + 0.5) * TILE_SIZE;
            } else {
                // Fallback if no target position is provided
                endX = startX + TILE_SIZE * 2; // Move 2 tiles forward
                endY = startY;
            }
            
            // Animate the projectile
            const animationDuration = 500; // 500ms
            const startTime = performance.now();
            
            function animateProjectile(timestamp) {
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / animationDuration, 1);
                
                // Calculate current position with slight arc
                const currentX = startX + (endX - startX) * progress;
                const arcHeight = TILE_SIZE * 0.5; // Arc height scales with tile size
                const arcY = Math.sin(progress * Math.PI) * arcHeight;
                const currentY = startY + (endY - startY) * progress - arcY;
                
                // Update projectile position
                toxinProjectile.style.left = `${currentX}px`;
                toxinProjectile.style.top = `${currentY}px`;
                
                // Add pulsing effect during travel
                const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.2;
                toxinProjectile.style.transform = `translate(-50%, -50%) scale(${scale})`;
                
                // Continue animation if not complete
                if (progress < 1) {
                    requestAnimationFrame(animateProjectile);
                } else {
                    // Animation complete - show impact
                    showToxinImpact(toxinProjectile, hit, targetId, endX, endY);
                    
                    // Remove the projectile after impact
                    setTimeout(() => {
                        if (toxinProjectile.parentNode) {
                            toxinProjectile.parentNode.removeChild(toxinProjectile);
                        }
                        resolve();
                    }, 500);
                }
            }
            
            // Start animation
            requestAnimationFrame(animateProjectile);
            
        } catch (error) {
            console.error('Error in Toxin animation:', error);
            resolve(); // Resolve even on error to prevent battle from hanging
        }
    });
}

/**
 * Show the impact effect of Toxin
 * @param {HTMLElement} toxinProjectile - The toxin projectile element
 * @param {boolean} hit - Whether the attack hit
 * @param {string} targetId - The ID of the target character
 * @param {number} impactX - X coordinate of impact in battlefield coordinates
 * @param {number} impactY - Y coordinate of impact in battlefield coordinates
 */
function showToxinImpact(toxinProjectile, hit, targetId, impactX, impactY) {
    // Create impact element
    const impact = document.createElement('div');
    impact.className = 'toxin-impact';
    impact.style.zIndex = '1999'; // Just below the projectile
    
    // Position impact at the provided coordinates
    impact.style.left = `${impactX}px`;
    impact.style.top = `${impactY}px`;
    impact.style.transform = 'translate(-50%, -50%)'; // Center the impact
    
    // Add to the same parent as the projectile
    toxinProjectile.parentNode.appendChild(impact);
    
    // Create droplets for splatter effect
    for (let i = 0; i < 8; i++) {
        const droplet = document.createElement('div');
        droplet.className = 'toxin-droplet';
        droplet.style.zIndex = '1998'; // Just below the impact
        
        // Random position relative to impact
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 30;
        const posX = impactX + Math.cos(angle) * distance;
        const posY = impactY + Math.sin(angle) * distance;
        
        droplet.style.left = `${posX}px`;
        droplet.style.top = `${posY}px`;
        droplet.style.transform = 'translate(-50%, -50%)'; // Center the droplet
        
        // Add to the same parent
        toxinProjectile.parentNode.appendChild(droplet);
        
        // Animate and remove droplet
        setTimeout(() => {
            if (droplet.parentNode) {
                droplet.parentNode.removeChild(droplet);
            }
        }, 500 + Math.random() * 200);
    }
    
    // If hit, make the target flash purple
    if (hit) {
        import('../pokemonOverlay.js').then(({ getPokemonSprite }) => {
            const targetSprite = getPokemonSprite(targetId);
            if (targetSprite) {
                // Flash purple 3 times
                let flashCount = 0;
                const flashInterval = setInterval(() => {
                    targetSprite.style.filter = flashCount % 2 === 0 ? 
                        'drop-shadow(0 0 10px #9b59b6) brightness(1.3) hue-rotate(270deg)' : '';
                    flashCount++;
                    
                    if (flashCount >= 6) {
                        clearInterval(flashInterval);
                        targetSprite.style.filter = '';
                    }
                }, 100);
            }
        }).catch(err => {
            console.error('Error flashing target sprite:', err);
        });
    }
    
    // Remove impact after animation
    setTimeout(() => {
        if (impact.parentNode) {
            impact.parentNode.removeChild(impact);
        }
    }, 500);
}

/**
 * Apply the badly poisoned status effect to the target
 * @param {Object} target - The target character
 * @param {Object} source - The source character
 * @returns {boolean} - Whether the status effect was applied
 */
export function applyToxinEffect(target, source) {
    if (!target || !source) {
        console.error('Invalid parameters for applyToxinEffect');
        return false;
    }
    
    // Check again if target is already poisoned (defensive check)
    if (target.statusEffects && 
        target.statusEffects.some(effect => 
            effect.id === 'poisoned' || effect.id === 'badly-poisoned')) {
        console.log(`${target.name} is already poisoned, can't apply Toxin effect`);
        return false;
    }
    
    // Apply the badly poisoned status effect
    const applied = addStatusEffect(target, 'badly-poisoned', {
        sourceId: source.uniqueId,
        sourceName: source.name
    });
    
    if (applied) {
        console.log(`Successfully applied badly-poisoned to ${target.name}`);
    } else {
        console.log(`Failed to apply badly-poisoned to ${target.name}`);
    }
    
    return applied;
}

/**
 * Check if a target is valid for Toxin (not immune to poison)
 * @param {Object} target - The target character
 * @returns {Promise<boolean>} - Whether the target is valid for Toxin
 */
export async function isValidToxinTarget(target) {
    // Check if the target is already poisoned
    if (target.character.statusEffects && 
        target.character.statusEffects.some(effect => 
            effect.id === 'poisoned' || effect.id === 'badly-poisoned')) {
        return false;
    }
    
    // Check if the target is immune to poison
    try {
        const isImmune = await hasStatusImmunity(target.character, 'badly-poisoned');
        return !isImmune;
    } catch (error) {
        console.error('Error checking poison immunity:', error);
        return false;
    }
}

/**
 * Check if Toxin should be randomly selected based on available moves
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @returns {Promise<boolean>} - Whether Toxin should be selected
 */
export async function shouldSelectToxin(attacker, target) {
    // Log for debugging
    console.log(`Checking if ${attacker.character.name} should use Toxin on ${target.character.name}`);
    
    // Count the number of different moves (excluding Verzweifler)
    const uniqueMoves = attacker.character.attacks.filter(attack => 
        attack.weaponName !== "Verzweifler"
    );
    
    // Get the total number of different moves
    const moveCount = uniqueMoves.length;
    console.log(`${attacker.character.name} has ${moveCount} unique moves (excluding Verzweifler)`);
    
    // If no moves or only Verzweifler, don't select Toxin
    if (moveCount === 0) {
        console.log(`${attacker.character.name} has no moves, skipping Toxin`);
        return false;
    }
    
    // Check if Toxin is available
    const hasToxin = attacker.character.attacks.some(attack => 
        attack.weaponName === "Toxin" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (!hasToxin) {
        console.log(`${attacker.character.name} doesn't have Toxin or it's out of PP`);
        return false;
    }
    
    // 1/X chance of selecting Toxin
    const random = Math.random();
    const probability = 1 / moveCount;
    const shouldRoll = random < probability;
    
    console.log(`Toxin roll: ${random.toFixed(3)} < ${probability.toFixed(3)}? ${shouldRoll}`);
    
    if (!shouldRoll) {
        return false;
    }
    
    // Check if the target is valid for Toxin (not immune to poison)
    const isValidTarget = await isValidToxinTarget(target);
    
    console.log(`Is ${target.character.name} a valid target for Toxin? ${isValidTarget}`);
    
    // If target is immune, don't select Toxin even if it was rolled
    return isValidTarget;
}

/**
 * Handle Toxin attack execution
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {string} charId - Attacker character ID
 * @param {string} targetId - Target character ID
 * @returns {Promise<Object>} - Attack result
 */
export async function handleToxinAttack(attacker, target, selectedAttack, charId, targetId) {
    // Import required modules
    const { 
        initializeAttackResult, 
        getModifiedGena, 
        handleLuckTokensAndForcing 
    } = await import('../attackSystem.js');
    
    const { rollAttackDice } = await import('../diceRoller.js');
    const { attemptDodge, chooseDodgePosition } = await import('../dodgeSystem.js');
    const { animateDodge } = await import('../animationManager.js');
    const { getCharacterPositions } = await import('../characterPositions.js');
    
    // Initialize attack result
    const attackResult = initializeAttackResult(attacker, target, selectedAttack);
    const genaValue = getModifiedGena(attacker, selectedAttack);
    
    // Execute attack roll
    let attackRoll = rollAttackDice(genaValue);
    attackResult.attackRolls.push(attackRoll);
    attackResult.log.push(`${attacker.character.name} greift ${target.character.name} mit ${selectedAttack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses} Netto.`);
    
    // Handle luck tokens and forcing
    attackRoll = await handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult);
    
    // Get weather evasion threshold
    const hitThreshold = getWeatherEvasionThreshold(target);
    
    // Check for miss
    if (attackRoll.netSuccesses < hitThreshold) {
        if (hitThreshold > 1) {
            attackResult.log.push(`${target.character.name}s Wetterreaktion erhöht die benötigten Erfolge auf ${hitThreshold}!`);
        }
        
        attackResult.log.push(`${attacker.character.name}s ${selectedAttack.weaponName} verfehlt das Ziel!`);
        
        // Get character positions for targeting
        const characterPositions = getCharacterPositions();
        
        // Animate the miss
        const targetPosition = {
            x: characterPositions[targetId].x,
            y: characterPositions[targetId].y
        };
        
        await animateToxin(charId, targetId, false, targetPosition);
        
        return attackResult;
    }
    
    // Attack hits, attempt dodge
    attackResult.log.push(`${attacker.character.name}s Angriff trifft mit ${attackRoll.netSuccesses} Erfolgen.`);
    
    const dodgeResult = attemptDodge(attacker, target, attackRoll, selectedAttack);
    
    if (dodgeResult.roll) {
        attackResult.defenseRolls.push(dodgeResult.roll);
    }
    
    // Handle successful dodge
    if (dodgeResult.success) {
        const dodgePos = chooseDodgePosition(target, attacker, true);
        
        if (dodgePos) {
            attackResult.log.push(`${target.character.name} weicht dem Angriff aus!`);
            
            // Get character positions for targeting
            const characterPositions = getCharacterPositions();
            
            // Animate dodge and Toxin miss
            const oldPosition = {
                x: characterPositions[targetId].x,
                y: characterPositions[targetId].y
            };
            
            await Promise.all([
                animateDodge(targetId, dodgePos, () => {}),
                animateToxin(charId, targetId, false, oldPosition)
            ]);
            
            return attackResult;
        } else {
            attackResult.log.push(`${target.character.name} versucht auszuweichen, hat aber keinen Platz!`);
        }
    }
    
    // Attack hits target
    attackResult.success = true;
    attackResult.log.push(`${target.character.name} konnte nicht ausweichen!`);
    
    // Animate Toxin hit
    await animateToxin(charId, targetId, true, null);
    
    // Apply badly poisoned status effect
    const statusApplied = applyToxinEffect(target.character, attacker.character);
    
    if (statusApplied) {
        attackResult.log.push(`${target.character.name} wurde schwer vergiftet!`);
    } else {
        attackResult.log.push(`${target.character.name} ist gegen Gift immun!`);
    }
    
    return attackResult;
}