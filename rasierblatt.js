/**
 * Rasierblatt (Razor Leaf) attack implementation
 * Creates a cone-shaped attack with flying leaves that deals damage
 */

import { TILE_SIZE } from '../config.js';
import { createConeIndicator, removeConeIndicator } from '../attackCone.js';
import { applyVisualHitEffect } from '../coneHits.js';
import { rollAttackDice } from '../diceRoller.js';
import { checkCriticalHit } from '../attackSystem.js';
import { calculateAttackDamage } from '../damage.js';
import { getModifiedGena } from '../attackSystem.js';
import { createVolltrefferEffect } from '../damageNumbers.js';
import { applyDamageAndEffects } from '../damage.js';
import { focusOnConeAttack } from '../cameraSystem.js';

// Constants
const DEFAULT_CONE_ANGLE = 60; // The angle of the Rasierblatt cone in degrees
const EFFECT_DURATION = 1200; // 1.2 seconds for the leaves to be visible
const LEAF_PARTICLE_COUNT = 30; // Number of leaf particles to create

/**
 * RasierblattAttack class for handling the razor leaf attack
 */
export class RasierblattAttack {
    /**
     * Create a new Rasierblatt attack
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
        this.attack.weaponName = this.attack.weaponName || "Rasierblatt";
        this.attack.moveType = this.attack.moveType || "pflanze";
        
        // The Rasierblatt specific properties
        this.range = attack.range || 5;
        this.coneAngle = attack.cone || DEFAULT_CONE_ANGLE;
        this.particleElements = [];
        this.coneElement = null;
        this.coneId = `rasierblatt-cone-${this.id}`;
        
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

    followWithCamera() {
        if (this.isHit) {
            focusOnConeAttack(
                this.attacker, 
                this.effectiveTarget, 
                this.range, 
                this.coneAngle, 
                500
            ).catch(error => {
                console.warn('Could not follow cone attack with camera:', error);
            });
        }
    }
    
    /**
     * Create the visual elements for razor leaf
     */
    createVisualElements() {
        // First create the cone indicator
        this.coneElement = createConeIndicator(
            this.attacker, 
            this.effectiveTarget, 
            this.range, 
            this.coneAngle, 
            'rasierblatt',
            this.coneId
        );
        
        // Create leaf particles
        this.createLeafParticles();
    }

    /**
     * Create leaf particle effects within the cone
     */
    createLeafParticles() {
        // Find the battlefield for positioning
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'rasierblatt-particles-container';
        particleContainer.dataset.attackId = this.id;
        particleContainer.style.position = 'absolute';
        particleContainer.style.top = '0';
        particleContainer.style.left = '0';
        particleContainer.style.width = '100%';
        particleContainer.style.height = '100%';
        particleContainer.style.pointerEvents = 'none';
        particleContainer.style.zIndex = '96'; // Above cone but below characters
        
        // Create the particles
        for (let i = 0; i < LEAF_PARTICLE_COUNT; i++) {
            // Create a particle with random position within the cone
            const particle = document.createElement('div');
            particle.className = 'rasierblatt-particle';
            
            // Generate a random position in the cone - start closer to the attacker
            const startPosition = this.getRandomPositionInCone(0.3); // Start in first 30% of cone
            
            // Position the particle
            particle.style.position = 'absolute';
            particle.style.left = `${startPosition.x * TILE_SIZE}px`;
            particle.style.top = `${startPosition.y * TILE_SIZE}px`;
            
            // Random size (5-8 pixels)
            const size = 5 + Math.random() * 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random initial rotation for the leaf
            const rotation = Math.random() * 360;
            particle.style.transform = `rotate(${rotation}deg)`;
            
            // Random z-index variation for layering effect (all above cone but varied)
            particle.style.zIndex = `${96 + Math.floor(Math.random() * 3)}`;
            
            // Add custom animation properties
            const spinDuration = 0.3 + Math.random() * 0.2; // 0.3-0.5s spin
            const moveDuration = 0.4 + Math.random() * 0.3; // 0.4-0.7s movement
            const delay = Math.random() * 0.3; // Random start delay
            
            // Get a random target position further along the cone
            const endPosition = this.getRandomPositionInCone(0.7); // End in last 70% of cone
            
            // Calculate the movement distance for this particle
            const moveX = (endPosition.x - startPosition.x) * TILE_SIZE;
            const moveY = (endPosition.y - startPosition.y) * TILE_SIZE;
            
            // Create custom keyframes for this specific leaf
            const moveKeyframes = this.createErraticPathKeyframes(moveX, moveY);
            
            // Apply the animations with custom keyframes
            particle.style.animation = `
                rasierblattSpin ${spinDuration}s linear infinite,
                ${moveKeyframes.name} ${moveDuration}s ${delay}s cubic-bezier(0.2, 0.8, 0.7, 0.2) forwards
            `;
            
            // Add random pulsing effect for some leaves
            if (Math.random() > 0.7) {
                particle.style.animation += `, rasierblattPulse ${0.2 + Math.random() * 0.3}s alternate infinite`;
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
            
            // Random angle within the cone, with more variance near the edges
            const coneHalfAngle = this.coneAngle / 2;
            
            // More erratic angle distribution - higher chance of being near the edges
            let randomAngleOffset;
            if (Math.random() < 0.7) {
                // 70% chance of being closer to the edges
                const edgeBias = Math.random() < 0.5 ? 1 : -1;
                randomAngleOffset = edgeBias * (coneHalfAngle * 0.6 + Math.random() * (coneHalfAngle * 0.4));
            } else {
                // 30% chance of being more central
                randomAngleOffset = (Math.random() * 2 - 1) * (coneHalfAngle * 0.5);
            }
            
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

    /**
     * Create custom keyframes for erratic leaf movement
     * @param {number} moveX - X distance to move
     * @param {number} moveY - Y distance to move
     * @returns {Object} - Object with keyframe info
     */
    createErraticPathKeyframes(moveX, moveY) {
        // Create a unique ID for this keyframe
        const id = `leaf-move-${Math.floor(Math.random() * 10000)}`;
        const name = `rasierblattMove${id}`;
        
        // Generate 3-5 intermediate waypoints for the erratic path
        const waypoints = Math.floor(3 + Math.random() * 3);
        let keyframeCSS = `@keyframes ${name} {\n`;
        keyframeCSS += `  0% { transform: translate(0, 0) rotate(0deg); }\n`;
        
        // Create intermediate waypoints with random offsets
        for (let i = 1; i < waypoints; i++) {
            const percent = Math.floor((i / waypoints) * 100);
            const progress = i / waypoints;
            
            // Calculate position at this waypoint - base path plus random deviation
            const baseX = moveX * progress;
            const baseY = moveY * progress;
            
            // Add random deviation - more extreme in the middle of the path
            const deviation = Math.sin(progress * Math.PI) * 20; // Max deviation of 20px
            const deviationX = (Math.random() * 2 - 1) * deviation;
            const deviationY = (Math.random() * 2 - 1) * deviation;
            
            // Random rotation for each waypoint
            const rotate = Math.floor(Math.random() * 360);
            
            keyframeCSS += `  ${percent}% { transform: translate(${baseX + deviationX}px, ${baseY + deviationY}px) rotate(${rotate}deg); }\n`;
        }
        
        // End position
        keyframeCSS += `  100% { transform: translate(${moveX}px, ${moveY}px) rotate(${Math.floor(Math.random() * 360)}deg); }\n`;
        keyframeCSS += `}`;
        
        return {
            id: `style-${id}`,
            name: name,
            css: keyframeCSS
        };
    }
    
    /**
     * Apply damage to all valid targets using centralized system
     * Cone attacks always hit all targets in the cone regardless of GENA check or dodge results
     */
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
     * Update method called each frame
     * @param {number} deltaTime - Time since last update
     * @returns {boolean} - Whether to keep updating
     */
    update(deltaTime) {
        // If already removed, don't update
        if (this.removed) return false;
        
        // Check if it's time to apply damage
        const elapsedTime = Date.now() - this.creationTime;
        if (elapsedTime >= EFFECT_DURATION - 200 && !this.damageApplied) {
            this.applyDamage();
        }
        
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
                console.error('Error in Rasierblatt callback:', error);
            }
        }
    }
}

/**
 * Create a new Rasierblatt attack
 * @param {Object} attacker - The attacker
 * @param {Object} target - The target direction
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits (ignored for cone attacks)
 * @param {Function} callback - Function to call when done
 * @param {Array} activeProjectiles - Reference to active projectiles
 * @returns {RasierblattAttack} - The created attack
 */
export function createRasierblatt(attacker, target, attack, isHit, callback, activeProjectiles) {
    return new RasierblattAttack(attacker, target, attack, isHit, callback, activeProjectiles);
}

/**
 * Add CSS styles for Rasierblatt
 */
export function addRasierblattStyles() {
    // Check if styles already exist
    if (document.getElementById('rasierblatt-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'rasierblatt-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Rasierblatt particle styling */
        .rasierblatt-particle {
            position: absolute;
            background-color: rgba(50, 205, 50, 0);
            pointer-events: none;
            width: 8px;
            height: 8px;
            clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
            background: linear-gradient(to bottom right, #4caf50, #2e7d32);
            box-shadow: 0 0 5px rgba(76, 175, 80, 0.6);
        }
        
        /* Ensure the SVG container has no background or border */
        .attack-cone.rasierblatt-cone {
            background: none !important;
            border: none !important;
        }
        
        /* Style for Rasierblatt cone - target only path and circle elements */
        .attack-cone.rasierblatt-cone path,
        .attack-cone.rasierblatt-cone circle {
            fill: rgba(76, 175, 80, 0.3);
            stroke: rgba(76, 175, 80, 0.6);
            animation: rasierblatt-path-pulse 1.5s infinite;
        }
        
        /* Spinning animation for leaf particles */
        @keyframes rasierblattSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Pulsing animation for leaf particles */
        @keyframes rasierblattPulse {
            0% { opacity: 0.6; transform: scale(0.9); }
            50% { opacity: 1.0; transform: scale(1.1); }
            100% { opacity: 0.7; transform: scale(0.95); }
        }
        
        /* Green flash effect for hit Pokemon */
        @keyframes rasierblattHit {
            0% { filter: brightness(1) saturate(1); }
            30% { filter: brightness(1.4) saturate(1.2) drop-shadow(0 0 8px rgba(76, 175, 80, 0.9)) hue-rotate(90deg); }
            100% { filter: brightness(1) saturate(1); }
        }
        
        /* Class to apply the hit flash effect */
        .rasierblatt-hit-effect {
            animation: rasierblattHit 0.5s ease-in-out forwards;
        }
        
        /* Updated animation for path and circle elements (not the container) */
        @keyframes rasierblatt-path-pulse {
            0% { 
                fill: rgba(76, 175, 80, 0.2);
                stroke: rgba(76, 175, 80, 0.4);
            }
            50% { 
                fill: rgba(76, 175, 80, 0.3);
                stroke: rgba(76, 175, 80, 0.6);
            }
            100% { 
                fill: rgba(76, 175, 80, 0.2);
                stroke: rgba(76, 175, 80, 0.4);
            }
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

/**
 * Apply Rasierblatt effects (damage with increased crit rate)
 */
export function applyRasierblattEffects(attacker, validTargets, attack, results) {
    let totalDamage = 0;
    
    validTargets.forEach(target => {
        // Calculate damage using the centralized system
        const damageRoll = calculateAttackDamage(attacker, target, attack);
        
        // Skip all damage-related processing if the attack deals 0 damage
        if (damageRoll.total <= 0 || damageRoll.baseDamage === 0) {
            // Still apply visual hit effect for 0-damage moves
            applyVisualHitEffect(target.id, 'rasierblatt');
            
            results.effects.push({
                targetId: target.id,
                type: 'no_damage',
                value: 0,
                critical: false
            });
            return; // Skip to next target
        }
        
        // Roll individual GENA check for this target to determine critical hit
        const genaValue = getModifiedGena(attacker, attack);
        const critRoll = rollAttackDice(genaValue);
        const isCritical = checkCriticalHit(attacker.character, attack, critRoll.netSuccesses);
        
        let finalDamage = damageRoll.total;
        
        if (isCritical) {
            finalDamage *= 2;
            createVolltrefferEffect(target);
        }
        
        // Apply damage using the centralized system
        applyDamageAndEffects(target, attacker, attack, {
            finalDamage: finalDamage,
            isCritical: isCritical,
            shouldDealDamage: true,
            effectivenessType: 'super' // Rasierblatt is typically super effective
        }, results, target.id, null, critRoll);
        
        totalDamage += finalDamage;
        
        // Apply visual hit effect
        applyVisualHitEffect(target.id, 'rasierblatt');
        
        results.effects.push({
            targetId: target.id,
            type: 'damage',
            value: finalDamage,
            critical: isCritical,
            critRoll: critRoll // Store the crit roll for logging
        });
        
        // Log individual crit roll for this target
        if (isCritical) {
            results.messages.push(`Rasierblatt-Volltreffer gegen ${target.character.name}! [Kritisch-Wurf: ${critRoll.netSuccesses} Erfolge]`);
        }
    });
    
    if (validTargets.length > 0) {
        if (totalDamage > 0) {
            results.messages.push(`Rasierblatt von ${attacker.character.name} trifft ${validTargets.length} Pokémon und verursacht insgesamt ${totalDamage} Schaden!`);
        } else {
            results.messages.push(`Rasierblatt von ${attacker.character.name} trifft ${validTargets.length} Pokémon, verursacht aber keinen Schaden!`);
        }
    } else {
        results.messages.push(`Rasierblatt von ${attacker.character.name} trifft keine Ziele!`);
    }
}