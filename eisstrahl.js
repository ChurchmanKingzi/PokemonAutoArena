/**
 * Eisstrahl (Ice Beam) attack implementation
 * A powerful ice attack that hits all targets in a straight line
 */

import { TILE_SIZE, GRID_SIZE } from '../config.js';
import { getCharacterPositions } from '../characterPositions.js';
import { calculateSizeCategory } from '../pokemonSizeCalculator.js';
import { doesPokemonOccupyTile } from '../pokemonDistanceCalculator.js';
import { focusOnCharacter } from '../cameraSystem.js';
import { attemptDodge, chooseDodgePosition } from '../dodgeSystem.js';
import { animateDodge } from '../animationManager.js';
import { applyAttackDamage } from '../damage.js';
import { hasStatusImmunity, addStatusEffect } from '../statusEffects.js';
import { logBattleEvent } from '../battleLog.js';
import { updatePokemonPosition } from '../pokemonOverlay.js';
import { rollAttackDice } from '../diceRoller.js';
import { getModifiedGena, handleLuckTokensAndForcing } from '../attackSystem.js';

// Animation constants
const INITIAL_LINE_WIDTH = 3;
const EXPANDED_LINE_WIDTH_BASE = 24;
const BEAM_EXPAND_DELAY = 1000; // 1 second
const CAMERA_RETURN_DELAY = 200; // 0.2 seconds
const SNOW_PARTICLE_COUNT = 60;
const FREEZE_SUCCESS_THRESHOLD = 4;

/**
 * Add CSS styles for Eisstrahl animation
 */
export function addEisstrahlStyles() {
    const styleId = 'eisstrahl-styles';
    
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .eisstrahl-beam {
            position: absolute;
            background: linear-gradient(90deg, 
                rgba(173, 216, 230, 0.7) 0%,
                rgba(135, 206, 235, 0.95) 25%,
                rgba(176, 224, 230, 1) 50%,
                rgba(135, 206, 235, 0.95) 75%,
                rgba(173, 216, 230, 0.7) 100%
            );
            box-shadow: 
                0 0 8px rgba(135, 206, 235, 0.9),
                0 0 16px rgba(173, 216, 230, 0.7),
                0 0 24px rgba(176, 224, 230, 0.5),
                inset 0 0 8px rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(176, 224, 230, 0.8);
            transform-origin: left center;
            z-index: 200;
            transition: height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
                        box-shadow 0.4s ease-out,
                        background 0.4s ease-out;
        }
        
        .eisstrahl-beam.expanded {
            background: linear-gradient(90deg, 
                rgba(173, 216, 230, 0.9) 0%,
                rgba(135, 206, 235, 1) 15%,
                rgba(176, 224, 230, 1) 35%,
                rgba(200, 230, 255, 1) 50%,
                rgba(176, 224, 230, 1) 65%,
                rgba(135, 206, 235, 1) 85%,
                rgba(173, 216, 230, 0.9) 100%
            );
            box-shadow: 
                0 0 20px rgba(135, 206, 235, 1),
                0 0 40px rgba(173, 216, 230, 0.9),
                0 0 60px rgba(176, 224, 230, 0.7),
                0 0 80px rgba(200, 230, 255, 0.5),
                inset 0 0 15px rgba(255, 255, 255, 0.4);
        }
        
        .eisstrahl-snow-particle {
            position: absolute;
            background: white;
            border-radius: 50%;
            pointer-events: none;
            z-index: 190;
            box-shadow: 0 0 3px rgba(176, 224, 230, 0.8);
        }
        
        .eisstrahl-snow-particle.small {
            width: 3px;
            height: 3px;
            animation: eisstrahlSnowfallSmall 2.5s linear infinite;
        }
        
        .eisstrahl-snow-particle.medium {
            width: 5px;
            height: 5px;
            animation: eisstrahlSnowfallMedium 2s linear infinite;
        }
        
        .eisstrahl-snow-particle.large {
            width: 7px;
            height: 7px;
            animation: eisstrahlSnowfallLarge 1.8s linear infinite;
        }
        
        @keyframes eisstrahlSnowfallSmall {
            0% {
                opacity: 1;
                transform: translateY(0) translateX(0) rotate(0deg) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(40px) translateX(15px) rotate(180deg) scale(0.5);
            }
        }
        
        @keyframes eisstrahlSnowfallMedium {
            0% {
                opacity: 1;
                transform: translateY(0) translateX(0) rotate(0deg) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(50px) translateX(25px) rotate(270deg) scale(0.3);
            }
        }
        
        @keyframes eisstrahlSnowfallLarge {
            0% {
                opacity: 1;
                transform: translateY(0) translateX(0) rotate(0deg) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(60px) translateX(35px) rotate(360deg) scale(0.2);
            }
        }
        
        .eisstrahl-impact-effect {
            position: absolute;
            background: radial-gradient(circle, 
                rgba(200, 230, 255, 1) 0%,
                rgba(176, 224, 230, 0.9) 30%,
                rgba(135, 206, 235, 0.7) 60%,
                transparent 100%
            );
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 180;
            animation: eisstrahlImpact 1s ease-out forwards;
            border: 2px solid rgba(176, 224, 230, 0.6);
            box-shadow: 
                0 0 20px rgba(176, 224, 230, 0.8),
                inset 0 0 10px rgba(255, 255, 255, 0.5);
        }
        
        @keyframes eisstrahlImpact {
            0% {
                width: 20px;
                height: 20px;
                opacity: 1;
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
            }
            30% {
                width: 50px;
                height: 50px;
                opacity: 0.9;
                transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
            }
            70% {
                width: 70px;
                height: 70px;
                opacity: 0.6;
                transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
            }
            100% {
                width: 90px;
                height: 90px;
                opacity: 0;
                transform: translate(-50%, -50%) scale(2) rotate(270deg);
            }
        }
        
        .eisstrahl-charge-effect {
            position: absolute;
            width: 40px;
            height: 40px;
            background: radial-gradient(circle, 
                rgba(200, 230, 255, 0.8) 0%,
                rgba(176, 224, 230, 0.6) 50%,
                transparent 100%
            );
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 150;
            animation: eisstrahlCharge 0.8s ease-in-out;
        }
        
        @keyframes eisstrahlCharge {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 0;
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Calculate all targets in a straight line from attacker to target and beyond
 * @param {Object} attacker - Attacker position data
 * @param {Object} target - Target position data
 * @returns {Object} - Object containing line info and targets
 */
function calculateLineTargets(attacker, target) {
    const characterPositions = getCharacterPositions();
    
    // Calculate direction vector
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    
    // Handle case where target is same as attacker (shouldn't happen)
    if (dx === 0 && dy === 0) {
        return { linePositions: [], targets: [], furthestTarget: null, lineEnd: target };
    }
    
    // Normalize direction to unit steps
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const stepX = distance > 0 ? dx / distance : 0;
    const stepY = distance > 0 ? dy / distance : 0;
    
    const linePositions = [];
    const targets = [];
    let furthestTarget = null;
    let maxDistance = 0;
    let lineEnd = target;
    
    // Trace the line from attacker to edge of battlefield
    for (let step = 1; step <= GRID_SIZE * 2; step++) {
        const lineX = Math.round(attacker.x + stepX * step);
        const lineY = Math.round(attacker.y + stepY * step);
        
        // Stop if we're out of bounds
        if (lineX < 0 || lineX >= GRID_SIZE || lineY < 0 || lineY >= GRID_SIZE) {
            break;
        }
        
        linePositions.push({ x: lineX, y: lineY });
        lineEnd = { x: lineX, y: lineY };
        
        // Check for Pokemon at this position
        for (const charId in characterPositions) {
            const charPos = characterPositions[charId];
            
            // Skip if same as attacker
            if (charPos === attacker) continue;
            
            // Skip if defeated
            if (charPos.isDefeated) continue;
            
            // Check if Pokemon is on this line position
            if (isOnLine(charPos, lineX, lineY)) {
                // Avoid duplicates
                if (!targets.find(t => t.id === charId)) {
                    const distanceFromAttacker = Math.abs(charPos.x - attacker.x) + Math.abs(charPos.y - attacker.y);
                    
                    targets.push({
                        id: charId,
                        character: charPos.character,
                        position: charPos,
                        distanceFromAttacker: distanceFromAttacker
                    });
                    
                    // Track furthest target
                    if (distanceFromAttacker > maxDistance) {
                        maxDistance = distanceFromAttacker;
                        furthestTarget = { x: charPos.x, y: charPos.y };
                    }
                }
            }
        }
    }
    
    return { linePositions, targets, furthestTarget, lineEnd };
}

/**
 * Check if a Pokemon is on the line (accounting for size)
 * @param {Object} pokemonPos - Pokemon position data
 * @param {number} lineX - Line position X
 * @param {number} lineY - Line position Y
 * @returns {boolean} - Whether Pokemon is on the line
 */
function isOnLine(pokemonPos, lineX, lineY) {
    const pokemonSize = calculateSizeCategory(pokemonPos.character) || 1;
    
    // For size 1 Pokemon, simple tile check
    if (pokemonSize === 1) {
        return pokemonPos.x === lineX && pokemonPos.y === lineY;
    }
    
    // For larger Pokemon, check if any of their occupied tiles are on the line
    for (let dx = 0; dx < pokemonSize; dx++) {
        for (let dy = 0; dy < pokemonSize; dy++) {
            const tileX = pokemonPos.x + dx;
            const tileY = pokemonPos.y + dy;
            
            if (tileX === lineX && tileY === lineY) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Create the visual beam element
 * @param {Object} attacker - Attacker position
 * @param {Object} lineEnd - End position of the line
 * @param {number} attackerSize - Size category of attacker
 * @returns {HTMLElement} - Beam element
 */
function createBeamElement(attacker, lineEnd, attackerSize) {
    const battlefield = document.querySelector('.battlefield-grid');
    if (!battlefield) return null;
    
    // Calculate beam dimensions
    const startX = (attacker.x + 0.5) * TILE_SIZE;
    const startY = (attacker.y + 0.5) * TILE_SIZE;
    const endX = (lineEnd.x + 0.5) * TILE_SIZE;
    const endY = (lineEnd.y + 0.5) * TILE_SIZE;
    
    const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
    
    // Create beam element
    const beam = document.createElement('div');
    beam.className = 'eisstrahl-beam';
    beam.style.position = 'absolute';
    beam.style.left = `${startX}px`;
    beam.style.top = `${startY}px`;
    beam.style.width = `${length}px`;
    beam.style.height = `${INITIAL_LINE_WIDTH * Math.max(1, attackerSize * 0.8)}px`;
    beam.style.transform = `rotate(${angle}deg)`;
    beam.style.transformOrigin = 'left center';
    
    battlefield.appendChild(beam);
    
    return beam;
}

/**
 * Create charging effect at attacker position
 * @param {Object} attacker - Attacker position
 */
function createChargeEffect(attacker) {
    const battlefield = document.querySelector('.battlefield-grid');
    if (!battlefield) return null;
    
    const effect = document.createElement('div');
    effect.className = 'eisstrahl-charge-effect';
    effect.style.left = `${(attacker.x + 0.5) * TILE_SIZE}px`;
    effect.style.top = `${(attacker.y + 0.5) * TILE_SIZE}px`;
    
    battlefield.appendChild(effect);
    
    // Remove after animation
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 800);
    
    return effect;
}

/**
 * Create snow particle effects along the beam
 * @param {Object} attacker - Attacker position data
 * @param {Object} lineEnd - End position of the line
 * @param {number} particleCount - Number of particles
 * @returns {Array} - Array of particle elements
 */
function createSnowParticles(attacker, lineEnd, particleCount = SNOW_PARTICLE_COUNT) {
    const battlefield = document.querySelector('.battlefield-grid');
    if (!battlefield) return [];
    
    const particles = [];
    
    // Calculate beam start and end positions in pixels
    const startX = (attacker.x + 0.5) * TILE_SIZE;
    const startY = (attacker.y + 0.5) * TILE_SIZE;
    const endX = (lineEnd.x + 0.5) * TILE_SIZE;
    const endY = (lineEnd.y + 0.5) * TILE_SIZE;
    
    // Calculate beam direction and length
    const beamDx = endX - startX;
    const beamDy = endY - startY;
    const beamLength = Math.sqrt(beamDx * beamDx + beamDy * beamDy);
    
    // Calculate perpendicular direction for spread
    const perpX = -beamDy / beamLength; // Perpendicular X (rotated 90 degrees)
    const perpY = beamDx / beamLength;  // Perpendicular Y (rotated 90 degrees)
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'eisstrahl-snow-particle';
        
        // Random size class
        const sizeClasses = ['small', 'medium', 'large'];
        const sizeWeights = [0.5, 0.3, 0.2]; // More small particles
        let randomValue = Math.random();
        let sizeClass = 'small';
        
        for (let j = 0; j < sizeClasses.length; j++) {
            if (randomValue < sizeWeights[j]) {
                sizeClass = sizeClasses[j];
                break;
            }
            randomValue -= sizeWeights[j];
        }
        
        particle.classList.add(sizeClass);
        
        // Random position along the beam (0 = start, 1 = end)
        const progress = Math.random();
        
        // Calculate base position along the beam line
        const baseX = startX + (beamDx * progress);
        const baseY = startY + (beamDy * progress);
        
        // Add perpendicular spread (particles spread around the beam width)
        const spreadAmount = (Math.random() - 0.5) * 30; // 30px spread on each side
        const finalX = baseX + (perpX * spreadAmount);
        const finalY = baseY + (perpY * spreadAmount);
        
        particle.style.left = `${finalX}px`;
        particle.style.top = `${finalY}px`;
        particle.style.animationDelay = `${Math.random() * 2}s`;
        
        battlefield.appendChild(particle);
        particles.push(particle);
    }
    
    return particles;
}

/**
 * Handle dodge attempts for targets on the line
 * @param {Array} targets - Array of target data
 * @param {Object} attacker - Attacker data
 * @param {Object} attackRoll - Attack roll result
 * @returns {Promise<Array>} - Array of targets that remain on the line
 */
async function handleDodgeAttempts(targets, attacker, attackRoll) {
    const remainingTargets = [];
    
    for (const target of targets) {
        // Attempt dodge
        const dodgeResult = attemptDodge(attacker, target.position, attackRoll, { type: 'ranged' });
        
        if (dodgeResult.success) {
            // Find a position out of the line
            const dodgePos = chooseDodgePosition(target.position, attacker, true);
            
            if (dodgePos) {
                logBattleEvent(`${target.character.name} weicht dem Eisstrahl aus!`);
                
                // Animate dodge
                await new Promise(resolve => {
                    animateDodge(target.id, dodgePos, () => {
                        // Update position
                        updatePokemonPosition(target.id, dodgePos.x, dodgePos.y);
                        resolve();
                    });
                });
            } else {
                logBattleEvent(`${target.character.name} versucht auszuweichen, hat aber keinen Platz!`);
                remainingTargets.push(target);
            }
        } else {
            logBattleEvent(`${target.character.name} kann dem Eisstrahl nicht ausweichen!`);
            remainingTargets.push(target);
        }
    }
    
    return remainingTargets;
}

/**
 * Apply damage and effects to remaining targets
 * @param {Array} targets - Array of remaining targets
 * @param {Object} attacker - Attacker data
 * @param {Object} attack - Attack data
 * @param {Object} attackRoll - Attack roll result
 * @param {string} attackerId - Attacker character ID
 */
async function applyEisstrahlEffects(targets, attacker, attack, attackRoll, attackerId) {
    const shouldFreeze = attackRoll.netSuccesses >= FREEZE_SUCCESS_THRESHOLD;
    
    for (const target of targets) {
        // Create impact effect first
        createImpactEffect(target.position);
        
        // Apply damage
        const damageResult = await applyAttackDamage(
            attacker,
            target.position,
            attack,
            null, // Let it calculate damage
            {
                attackerId: attackerId,
                targetId: target.id,
                isCritical: false // Ice Beam doesn't typically crit
            }
        );
        
        // Apply freeze effect if conditions are met
        if (shouldFreeze && damageResult.applied && !damageResult.defeated) {
            const isImmune = await hasStatusImmunity(target.character, 'frozen', {
                attacker: attacker.character,
                targetPosition: target.position,
                attackerPosition: attacker
            });
            
            if (!isImmune) {
                const freezeApplied = addStatusEffect(target.character, 'frozen', {
                    sourceId: attacker.character.uniqueId,
                    sourceName: attacker.character.name
                });
                
                if (freezeApplied) {
                    logBattleEvent(`${target.character.name} wurde eingefroren!`);
                    
                    // Add visual freeze effect
                    const targetSprite = document.querySelector(`[data-character-id="${target.id}"]`);
                    if (targetSprite) {
                        targetSprite.classList.add('frozen-effect');
                    }
                }
            } else {
                logBattleEvent(`${target.character.name} ist gegen Einfrieren immun!`);
            }
        }
    }
}

/**
 * Create impact effect at target position
 * @param {Object} position - Target position
 */
function createImpactEffect(position) {
    const battlefield = document.querySelector('.battlefield-grid');
    if (!battlefield) return;
    
    const effect = document.createElement('div');
    effect.className = 'eisstrahl-impact-effect';
    effect.style.left = `${(position.x + 0.5) * TILE_SIZE}px`;
    effect.style.top = `${(position.y + 0.5) * TILE_SIZE}px`;
    
    battlefield.appendChild(effect);
    
    // Remove after animation
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 1000);
}

/**
 * Main Eisstrahl attack function
 * @param {Object} attacker - Attacker position data
 * @param {Object} target - Target position data
 * @param {Object} attack - Attack data
 * @param {boolean} isHit - Whether the attack hits
 * @param {Function} callback - Callback when attack completes
 * @param {Array} activeProjectiles - Active projectiles array
 * @returns {Object} - Attack object with cleanup method
 */
export function createEisstrahl(attacker, target, attack, isHit, callback, activeProjectiles) {
    // Find attacker character ID
    const characterPositions = getCharacterPositions();
    let attackerId = null;
    for (const charId in characterPositions) {
        if (characterPositions[charId] === attacker) {
            attackerId = charId;
            break;
        }
    }
    
    if (!attackerId) {
        console.error('Attacker character ID not found for Eisstrahl');
        if (callback) callback();
        return null;
    }
    
    const attackerSize = calculateSizeCategory(attacker.character) || 1;
    
    // Calculate attack roll for this specific attack
    const genaValue = getModifiedGena(attacker, attack);
    let attackRoll = rollAttackDice(genaValue);
    
    logBattleEvent(`${attacker.character.name} greift mit ${attack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses} Netto.`);
    
    // Calculate line and targets
    const lineData = calculateLineTargets(attacker, target);
    
    if (lineData.targets.length === 0) {
        logBattleEvent(`${attacker.character.name}s Eisstrahl trifft keine Ziele!`);
        if (callback) callback();
        return null;
    }
    
    logBattleEvent(`${attacker.character.name} lädt einen mächtigen Eisstrahl auf!`);
    
    const eisstrahlAttack = {
        id: `eisstrahl_${Date.now()}_${Math.random()}`,
        beam: null,
        particles: [],
        targets: lineData.targets,
        completed: false,
        
        async execute() {
            try {
                // Handle luck tokens and forcing
                attackRoll = await handleLuckTokensAndForcing(attacker, attackRoll, genaValue, attackerId, { log: [] });
                
                // Create charging effect
                createChargeEffect(attacker);
                await new Promise(resolve => setTimeout(resolve, 400));
                
                // Create initial thin beam
                this.beam = createBeamElement(attacker, lineData.lineEnd, attackerSize);
                // Create particles along the beam line
                this.particles = createSnowParticles(attacker, lineData.lineEnd);
                
                // Move camera to furthest target
                if (lineData.furthestTarget) {
                    const furthestTargetId = lineData.targets
                        .sort((a, b) => b.distanceFromAttacker - a.distanceFromAttacker)[0]?.id;
                    
                    if (furthestTargetId) {
                        await focusOnCharacter(furthestTargetId);
                    }
                } else {
                    // Focus on the end of the line if no targets
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Handle dodge attempts
                const remainingTargets = await handleDodgeAttempts(lineData.targets, attacker, attackRoll);
                
                // Wait for beam expansion
                await new Promise(resolve => setTimeout(resolve, BEAM_EXPAND_DELAY));
                
                // Expand beam with dramatic effect
                if (this.beam) {
                    const expandedWidth = EXPANDED_LINE_WIDTH_BASE * Math.max(1, attackerSize);
                    this.beam.style.height = `${expandedWidth}px`;
                    this.beam.classList.add('expanded');
                    
                    // Add more particles for the expanded beam
                    const expandedParticles = createSnowParticles(attacker, lineData.lineEnd, SNOW_PARTICLE_COUNT);
                    this.particles.push(...expandedParticles);
                }
                
                logBattleEvent(`Der Eisstrahl entfesselt seine volle Kraft!`);
                
                // Apply effects to remaining targets
                if (remainingTargets.length > 0) {
                    await applyEisstrahlEffects(remainingTargets, attacker, attack, attackRoll, attackerId);
                } else {
                    logBattleEvent(`Alle Ziele konnten dem Eisstrahl ausweichen!`);
                }
                
                // Move camera back to attacker
                await focusOnCharacter(attackerId);
                await new Promise(resolve => setTimeout(resolve, CAMERA_RETURN_DELAY));
                
            } catch (error) {
                console.error('Error in Eisstrahl execution:', error);
            } finally {
                this.cleanup();
                this.completed = true;
                if (callback) callback();
            }
        },
        
        cleanup() {
            // Remove beam
            if (this.beam && this.beam.parentNode) {
                this.beam.parentNode.removeChild(this.beam);
            }
            
            // Remove particles
            this.particles.forEach(particle => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            });
        }
    };
    
    // Start execution
    eisstrahlAttack.execute();
    
    return eisstrahlAttack;
}