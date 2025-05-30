/**
 * Eissturm (Icy Wind) attack implementation
 * Creates a cone-shaped attack with snowflakes that deals damage
 * and reduces the initiative of affected targets by 1 stage
 */

import { TILE_SIZE } from '../config.js';
import { createConeIndicator, removeConeIndicator } from '../attackCone.js';
import { changeStatValue } from '../statChanges.js';
import { calculateAttackDamage } from '../damage.js';
import { applyVisualHitEffect } from '../coneHits.js';
import { getModifiedGena } from '../attackSystem.js';
import { rollAttackDice } from '../diceRoller.js';
import { checkCriticalHit } from '../attackSystem.js';
import { applyDamageAndEffects } from '../damage.js';
import { createVolltrefferEffect } from '../damageNumbers.js';
import { focusOnConeAttack } from '../cameraSystem.js';

// Constants
const DEFAULT_CONE_ANGLE = 60; // The angle of the Eissturm cone in degrees
const EFFECT_DURATION = 1200; // 1.2 seconds for the effect to be visible
const SNOWFLAKE_PARTICLE_COUNT = 40; // Number of snowflake particles to create

/**
 * EissturmAttack class for handling the icy wind attack
 */
export class EissturmAttack {
    /**
     * Create a new Eissturm attack
     * @param {Object} attacker - The Pokémon using the attack
     * @param {Object} target - The target direction
     * @param {Object} attack - The attack data
     * @param {boolean} isHit - Whether the attack hits (ignored for cone attacks)
     * @param {Function} callback - Function to call when done
     * @param {Array} activeProjectilesArray - Reference to active projectiles
     */
    constructor(attacker, target, attack, isHit, callback, activeProjectilesArray) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.isHit = isHit;
        this.callback = callback;
        this.activeProjectiles = activeProjectilesArray;
        this.removed = false;
        
        // Ensure attack has correct properties for centralized damage system
        this.attack.weaponName = this.attack.weaponName || "Eissturm";
        this.attack.moveType = this.attack.moveType || "eis";
        
        // The Eissturm specific properties
        this.range = attack.range || 5;
        this.coneAngle = attack.cone || DEFAULT_CONE_ANGLE;
        this.particleElements = [];
        this.coneElement = null;
        this.coneId = `eissturm-cone-${this.id}`;
        
        // Timing properties
        this.creationTime = Date.now();
        this.damageApplied = false;
        
        // Handle miss case - calculate a new direction for visual effects only
        if (!this.isHit) {
            // Display miss message over the original target
            import('../damageNumbers.js').then(module => {
                module.createMissMessage(this.attacker);
            });
            
            // Calculate effective target direction (missed angle)
            this.effectiveTarget = this.calculateMissDirection();
        } else {
            // If hit, use the original target direction
            this.effectiveTarget = this.target;
        }
        
        // Create the cone and particles
        this.createVisualElements();
        this.followWithCamera();

        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Set timeouts for damage application and cleanup
        this.damageTimeout = setTimeout(() => this.applyDamage(), EFFECT_DURATION - 200);
        this.destroyTimeout = setTimeout(() => this.destroy(), EFFECT_DURATION);
    }

    applyDamage() {
    if (this.damageApplied || this.removed) return;
    
    // Mark damage as applied
    this.damageApplied = true;
    
    // Use centralized cone attack system - always hits all targets in cone
    import('./coneHits.js').then(module => {
        const results = module.applyConeAttackEffects(
            this.attacker, 
            this.effectiveTarget, 
            this.attack, 
            this.range, 
            this.coneAngle, 
            true // Always hit for cone attacks - ignore original GENA check result
        );
    }).catch(error => {
        console.error('Error applying attack effects:', error);
    });
}
    
    /**
     * Calculate a random direction for a missed cone attack
     * that ensures the original target is NOT in the cone
     * @returns {Object} - New target direction {x, y}
     */
    calculateMissDirection() {
        // Original direction vector from attacker to target
        const dx = this.target.x - this.attacker.x;
        const dy = this.target.y - this.attacker.y;
        const originalDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Original angle (in radians)
        const originalAngle = Math.atan2(dy, dx);
        
        // Cone half-angle in radians
        const coneHalfAngle = (this.coneAngle / 2) * (Math.PI / 180);
        
        // Generate a random angle that's outside the cone angle
        // to ensure the original target is NOT in the new cone
        let offsetAngle;
        if (Math.random() < 0.5) {
            // Miss to the left
            offsetAngle = coneHalfAngle + (Math.random() * Math.PI / 4); // 0-45 degrees outside cone
        } else {
            // Miss to the right
            offsetAngle = -coneHalfAngle - (Math.random() * Math.PI / 4); // 0-45 degrees outside cone
        }
        
        // Calculate new direction
        const newAngle = originalAngle + offsetAngle;
        
        // Calculate new target position at the same distance
        const newX = this.attacker.x + Math.cos(newAngle) * originalDistance;
        const newY = this.attacker.y + Math.sin(newAngle) * originalDistance;
        
        return { x: newX, y: newY };
    }
    
    /**
     * Create the visual elements for icy wind
     */
    createVisualElements() {
        // First create the cone indicator
        this.coneElement = createConeIndicator(
            this.attacker, 
            this.effectiveTarget, 
            this.range, 
            this.coneAngle, 
            'eissturm',
            this.coneId
        );
        
        // Create snowflake particles
        this.createSnowflakeParticles();
    }

    /**
     * Create snowflake particle effects within the cone
     */
    createSnowflakeParticles() {
        // Find the battlefield for positioning
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'eissturm-particles-container';
        particleContainer.dataset.attackId = this.id;
        particleContainer.style.position = 'absolute';
        particleContainer.style.top = '0';
        particleContainer.style.left = '0';
        particleContainer.style.width = '100%';
        particleContainer.style.height = '100%';
        particleContainer.style.pointerEvents = 'none';
        particleContainer.style.zIndex = '96'; // Above cone but below characters
        
        // Create the particles
        for (let i = 0; i < SNOWFLAKE_PARTICLE_COUNT; i++) {
            // Create a particle with random position within the cone
            const particle = document.createElement('div');
            particle.className = 'eissturm-particle';
            
            // Generate a random position in the cone - start closer to the attacker
            const startPosition = this.getRandomPositionInCone(0.2); // Start in first 20% of cone
            
            // Position the particle
            particle.style.position = 'absolute';
            particle.style.left = `${startPosition.x * TILE_SIZE}px`;
            particle.style.top = `${startPosition.y * TILE_SIZE}px`;
            
            // Random size (3-7 pixels)
            const size = 3 + Math.random() * 4;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random initial rotation for the snowflake
            const rotation = Math.random() * 360;
            particle.style.transform = `rotate(${rotation}deg)`;
            
            // Random z-index variation for layering effect (all above cone but varied)
            particle.style.zIndex = `${96 + Math.floor(Math.random() * 3)}`;
            
            // Add custom animation properties
            const spinDuration = 2 + Math.random() * 1; // 2-3s spin (slow, gentle spin)
            const moveDuration = 0.6 + Math.random() * 0.4; // 0.6-1.0s movement
            const delay = Math.random() * 0.4; // Random start delay
            
            // Get a random target position further along the cone
            const endPosition = this.getRandomPositionInCone(0.8); // End in last portion of cone
            
            // Calculate the movement distance for this particle
            const moveX = (endPosition.x - startPosition.x) * TILE_SIZE;
            const moveY = (endPosition.y - startPosition.y) * TILE_SIZE;
            
            // Create custom keyframes for this specific snowflake
            const moveKeyframes = this.createDriftingPathKeyframes(moveX, moveY);
            
            // Apply the animations with custom keyframes
            particle.style.animation = `
                eissturmSpin ${spinDuration}s linear infinite,
                ${moveKeyframes.name} ${moveDuration}s ${delay}s cubic-bezier(0.4, 0.0, 0.6, 1) forwards
            `;
            
            // Add random pulsing/twinkling effect for some snowflakes
            if (Math.random() > 0.6) {
                particle.style.animation += `, eissturmTwinkle ${0.5 + Math.random() * 0.5}s alternate infinite`;
            }
            
            // Add keyframes to document
            if (!document.getElementById(moveKeyframes.id)) {
                const keyframeStyle = document.createElement('style');
                keyframeStyle.id = moveKeyframes.id;
                keyframeStyle.textContent = moveKeyframes.css;
                document.head.appendChild(keyframeStyle);
            }
            
            // Add particle to container
            particleContainer.appendChild(particle);
            
            // Store reference
            this.particleElements.push(particle);
        }
        
        // Add the container to the battlefield
        battlefield.appendChild(particleContainer);
        
        // Store reference
        this.particleContainer = particleContainer;
    }
    
    /**
     * Generate a random position within the cone, optionally constrained to a portion of the cone
     * @param {number} depthFactor - How far into the cone (0-1), where 0 is attacker, 1 is edge
     * @returns {Object} - Random {x, y} position in the cone
     */
    getRandomPositionInCone(depthFactor = null) {
        const attacker = this.attacker;
        const targetDirection = this.effectiveTarget;
        const range = this.range;
        
        // Convert depthFactor to min/max distance
        let minDistance = 0;
        let maxDistance = range;
        
        if (depthFactor !== null) {
            if (depthFactor <= 0.5) {
                // First half of cone
                maxDistance = range * depthFactor * 2;
            } else {
                // Second half of cone
                minDistance = range * (depthFactor - 0.5) * 2;
            }
        }
        
        // Try random positions until we find one in the cone
        let attempts = 0;
        while (attempts < 50) { // Limit attempts to avoid infinite loop
            // Random distance from attacker within the specified range
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            // Random angle within the cone, with slightly more uniform distribution
            const coneHalfAngle = this.coneAngle / 2;
            
            // Distribute more evenly for snowflakes
            const randomAngleOffset = (Math.random() * 2 - 1) * coneHalfAngle;
            
            // Calculate direction vector from attacker to target
            const dx = targetDirection.x - attacker.x;
            const dy = targetDirection.y - attacker.y;
            const baseAngle = Math.atan2(dy, dx);
            
            // Apply random angle offset
            const angle = baseAngle + (randomAngleOffset * Math.PI / 180);
            
            // Calculate position at this distance and angle
            const x = attacker.x + Math.cos(angle) * distance;
            const y = attacker.y + Math.sin(angle) * distance;
            
            // Return with sub-tile precision for smoother particle distribution
            return { x, y };
        }
        
        // Fallback to attacker position if we couldn't find a valid position
        return { x: attacker.x + 0.5, y: attacker.y + 0.5 };
    }

    followWithCamera() {
        if (this.isHit) {
            focusOnConeAttack(
                this.attacker, 
                this.effectiveTarget, 
                this.range, 
                this.coneAngle, 
                600
            ).catch(error => {
                console.warn('Could not follow cone attack with camera:', error);
            });
        }
    }

    /**
     * Create custom keyframes for drifting snowflake movement
     * @param {number} moveX - X distance to move
     * @param {number} moveY - Y distance to move
     * @returns {Object} - Object with keyframe info
     */
    createDriftingPathKeyframes(moveX, moveY) {
        // Create a unique ID for this keyframe
        const id = `snow-move-${Math.floor(Math.random() * 10000)}`;
        const name = `eissturmMove${id}`;
        
        // Generate 4-6 intermediate waypoints for the drifting path
        const waypoints = Math.floor(4 + Math.random() * 3);
        let keyframeCSS = `@keyframes ${name} {\n`;
        keyframeCSS += `  0% { transform: translate(0, 0) rotate(0deg); }\n`;
        
        // Create intermediate waypoints with gentle swaying motion
        for (let i = 1; i < waypoints; i++) {
            const percent = Math.floor((i / waypoints) * 100);
            const progress = i / waypoints;
            
            // Calculate position at this waypoint - base path plus gentle swaying
            const baseX = moveX * progress;
            const baseY = moveY * progress;
            
            // Add gentle swaying - more pronounced horizontally than vertically
            // This creates the gentle side-to-side drifting of snowflakes
            const swayMagnitude = Math.sin(progress * Math.PI) * 15; // Max sway of 15px
            const swayX = (Math.random() * 2 - 1) * swayMagnitude;
            const swayY = (Math.random() * 0.5 - 0.25) * swayMagnitude; // Less vertical sway
            
            // Random rotation for each waypoint - gentle rotation for snowflakes
            const rotate = Math.floor(Math.random() * 180 - 90); // -90 to 90 degrees
            
            keyframeCSS += `  ${percent}% { transform: translate(${baseX + swayX}px, ${baseY + swayY}px) rotate(${rotate}deg); }\n`;
        }
        
        // End position
        keyframeCSS += `  100% { transform: translate(${moveX}px, ${moveY}px) rotate(${Math.floor(Math.random() * 180 - 90)}deg); }\n`;
        keyframeCSS += `}`;
        
        return {
            id: `style-${id}`,
            name: name,
            css: keyframeCSS
        };
    }
    
    /**
     * Update method called each frame
     * @param {number} deltaTime - Time since last update
     * @returns {boolean} - Whether to keep updating
     */
    update(deltaTime) {
        // If already removed, don't update
        if (this.removed) return false;
        
        // Check if it's time to apply damage
        const elapsedTime = Date.now() - this.creationTime;
        
        // Check if it's time to destroy
        if (elapsedTime >= EFFECT_DURATION) {
            this.destroy();
            return false;
        }
        
        return true;
    }
    
    /**
     * Destroy the attack and clean up
     */
    destroy() {
        // If already removed, don't process again
        if (this.removed) return;
        
        // Mark as removed
        this.removed = true;
        
        // Clear timeouts
        if (this.damageTimeout) clearTimeout(this.damageTimeout);
        if (this.destroyTimeout) clearTimeout(this.destroyTimeout);
        
        // Apply damage if not already applied
        if (!this.damageApplied) {
            this.applyDamage();
        }
        
        // Remove the cone
        removeConeIndicator(this.coneId);
        
        // Remove the particle container
        if (this.particleContainer && this.particleContainer.parentNode) {
            this.particleContainer.parentNode.removeChild(this.particleContainer);
        }
        
        // Remove from active projectiles
        const index = this.activeProjectiles.findIndex(p => p.id === this.id);
        if (index !== -1) {
            this.activeProjectiles.splice(index, 1);
        }
        
        // Call callback if provided
        if (this.callback) {
            try {
                this.callback();
            } catch (error) {
                console.error('Error in Eissturm callback:', error);
            }
        }
    }
}

/**
 * Create a new Eissturm attack
 * @param {Object} attacker - The attacker
 * @param {Object} target - The target direction
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits (ignored for cone attacks)
 * @param {Function} callback - Function to call when done
 * @param {Array} activeProjectiles - Reference to active projectiles
 * @returns {EissturmAttack} - The created attack
 */
export function createEissturm(attacker, target, attack, isHit, callback, activeProjectiles) {
    return new EissturmAttack(attacker, target, attack, isHit, callback, activeProjectiles);
}

/**
 * Add CSS styles for Eissturm
 */
export function addEissturmStyles() {
    // Check if styles already exist
    if (document.getElementById('eissturm-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'eissturm-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Eissturm particle styling */
        .eissturm-particle {
            position: absolute;
            pointer-events: none;
            width: 6px;
            height: 6px;
            clip-path: polygon(
                50% 0%, 65% 35%, 100% 50%, 
                65% 65%, 50% 100%, 35% 65%, 
                0% 50%, 35% 35%
            );
            background: linear-gradient(to bottom right, #e0f7fa, #b2ebf2, #80deea);
            box-shadow: 0 0 6px rgba(178, 235, 242, 0.7);
            opacity: 0.8;
        }
        
        /* Spinning animation for snowflake particles */
        @keyframes eissturmSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Twinkling animation for snowflakes */
        @keyframes eissturmTwinkle {
            0% { opacity: 0.6; transform: scale(0.9); }
            50% { opacity: 1.0; transform: scale(1.1); }
            100% { opacity: 0.7; transform: scale(0.95); }
        }
        
        /* Icy blue flash effect for hit Pokemon */
        @keyframes eissturmHit {
            0% { filter: brightness(1) saturate(1); }
            30% { filter: brightness(1.4) saturate(0.8) drop-shadow(0 0 8px rgba(135, 206, 250, 0.9)) hue-rotate(180deg); }
            60% { filter: brightness(1.2) saturate(0.7) drop-shadow(0 0 5px rgba(135, 206, 250, 0.7)) hue-rotate(200deg); }
            100% { filter: brightness(1) saturate(1); }
        }
        
        /* Class to apply the hit flash effect */
        .eissturm-hit-effect {
            animation: eissturmHit 0.8s ease-in-out forwards;
        }
        
        /* Style for Eissturm cone - target only the path and circle elements */
        .attack-cone.eissturm-cone path,
        .attack-cone.eissturm-cone circle {
            fill: rgba(176, 224, 230, 0.3);
            stroke: rgba(135, 206, 235, 0.5);
            animation: eissturm-cone-pulse 1.5s infinite;
        }
        
        /* Ensure the SVG container has no background or border */
        .attack-cone.eissturm-cone {
            background: none !important;
            border: none !important;
        }
        
        /* Add snow effect to tile highlights */
        .tile-highlight.eissturm-highlight {
            background-image: radial-gradient(circle at 30% 30%, 
                rgba(255, 255, 255, 0.4) 2px, 
                rgba(176, 224, 230, 0.2) 4px, 
                transparent 5px),
                radial-gradient(circle at 70% 60%, 
                rgba(255, 255, 255, 0.4) 1px, 
                rgba(176, 224, 230, 0.2) 2px, 
                transparent 3px);
        }
        
        /* Updated animation for path and circle elements (not the container) */
        @keyframes eissturm-cone-pulse {
            0% { 
                fill: rgba(176, 224, 230, 0.2);
                stroke: rgba(135, 206, 235, 0.4);
            }
            50% { 
                fill: rgba(176, 224, 230, 0.3);
                stroke: rgba(135, 206, 235, 0.6);
            }
            100% { 
                fill: rgba(176, 224, 230, 0.2);
                stroke: rgba(135, 206, 235, 0.4);
            }
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

/**
 * Apply Eissturm effects (damage + initiative reduction)
 */
export function applyEissturmEffects(attacker, validTargets, attack, results) {
    let totalDamage = 0;
    
    validTargets.forEach(target => {
        // Calculate damage using the centralized system
        const damageRoll = calculateAttackDamage(attacker, target, attack);
        const shouldDealDamage = damageRoll.total > 0 && damageRoll.baseDamage > 0;
        
        let finalDamage = 0;
        let isCritical = false;
        let critRoll = null;
        
        // Only process damage if the attack is supposed to deal damage
        if (shouldDealDamage) {
            // Roll individual GENA check for this target to determine critical hit
            const genaValue = getModifiedGena(attacker, attack);
            critRoll = rollAttackDice(genaValue);
            isCritical = checkCriticalHit(attacker.character, attack, critRoll.netSuccesses);
            
            finalDamage = damageRoll.total;
            
            if (isCritical) {
                finalDamage *= 2;
                createVolltrefferEffect(target);
            }
            
            // Apply damage using the centralized system
            applyDamageAndEffects(target, attacker, attack, {
                finalDamage: finalDamage,
                isCritical: isCritical,
                shouldDealDamage: true,
                effectivenessType: damageRoll.effectiveness
            }, results, target.id, null, critRoll);
            
            totalDamage += finalDamage;
            
            // Log individual crit roll for this target
            if (isCritical) {
                results.messages.push(`Eissturm-Volltreffer gegen ${target.character.name}! [Kritisch-Wurf: ${critRoll.netSuccesses} Erfolge]`);
            }
        }
        
        // Apply initiative reduction (this happens regardless of damage)
        const statChangeResult = changeStatValue(target.character, 'init', -1, attacker.character);
        if (statChangeResult.success) {
            results.messages.push(`${target.character.name}'s Initiative wurde durch Eissturm gesenkt!`);
        }
        
        // Apply visual hit effect
        applyVisualHitEffect(target.id, 'eissturm');
        
        results.effects.push({
            targetId: target.id,
            type: shouldDealDamage ? 'damage_and_stat' : 'stat_only',
            damage: finalDamage,
            statChange: { stat: 'init', change: -1 },
            critical: isCritical,
            critRoll: critRoll // Store the crit roll for logging
        });
    });
    
    if (validTargets.length > 0) {
        if (totalDamage > 0) {
            results.messages.push(`Eissturm von ${attacker.character.name} trifft ${validTargets.length} Pokémon, verursacht ${totalDamage} Schaden und senkt deren Initiative!`);
        } else {
            results.messages.push(`Eissturm von ${attacker.character.name} trifft ${validTargets.length} Pokémon und senkt deren Initiative!`);
        }
    } else {
        results.messages.push(`Eissturm von ${attacker.character.name} trifft keine Ziele!`);
    }
}