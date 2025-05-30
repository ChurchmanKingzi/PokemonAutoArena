/**
 * Stachelspore (Stun Spore) attack implementation
 * Applies paralysis status effect in a cone
 */

import { TILE_SIZE } from '../config.js';
import { hasStatusEffect, hasStatusImmunity } from '../statusEffects.js';
import { createConeIndicator, removeConeIndicator, findCharactersInCone,isPositionInCone } from '../attackCone.js';
import { addStatusEffect } from '../statusEffects.js';
import { applyVisualHitEffect } from '../coneHits.js';

// Constants
const DEFAULT_CONE_ANGLE = 45; // The angle of the Stachelspore cone in degrees
const EFFECT_DURATION = 1500; // 1.5 seconds for the powder to be visible
const POWDER_PARTICLE_COUNT = 40; // Number of dust particles to create

/**
 * StachelsporeAttack class for handling the stun spore attack
 */
export class StachelsporeAttack {
    /**
     * Create a new Stachelspore attack
     * @param {Object} attacker - The Pokémon using the attack
     * @param {Object} target - The target direction
     * @param {Object} attack - The attack data
     * @param {boolean} isHit - Whether the attack hits
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
        
        // The Stachelspore specific properties
        this.range = attack.range || 3;
        this.coneAngle = attack.cone || DEFAULT_CONE_ANGLE;
        this.particleElements = [];
        this.coneElement = null;
        this.coneId = `stachelspore-cone-${this.id}`;
        
        // Timing properties
        this.creationTime = Date.now();
        this.statusApplied = false;
        
        // Handle miss case - calculate a new direction
        if (!this.isHit) {
            // Display miss message over the original target
            import('../damageNumbers.js').then(module => {
                module.createMissMessage(this.target);
            });
            
            // Calculate effective target direction (missed angle)
            this.effectiveTarget = this.calculateMissDirection();
        } else {
            // If hit, use the original target direction
            this.effectiveTarget = this.target;
        }
        
        // Create the cone and particles
        this.createVisualElements();
        
        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Set timeouts for status application and cleanup
        this.statusTimeout = setTimeout(() => this.applyParalysisStatus(), EFFECT_DURATION - 100);
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
    
    // Update createVisualElements to use effectiveTarget
    createVisualElements() {
        // First create the cone indicator
        this.coneElement = createConeIndicator(
            this.attacker, 
            this.effectiveTarget, // Use effective target
            this.range, 
            this.coneAngle, 
            'stachelspore',
            this.coneId
        );
        
        // Create powder particles
        this.createPowderParticles();
    }
    
    /**
     * Create powder particle effects within the cone
     */
    createPowderParticles() {
        // Find the battlefield for positioning
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'stachelspore-particles-container';
        particleContainer.dataset.attackId = this.id;
        particleContainer.style.position = 'absolute';
        particleContainer.style.top = '0';
        particleContainer.style.left = '0';
        particleContainer.style.width = '100%';
        particleContainer.style.height = '100%';
        particleContainer.style.pointerEvents = 'none';
        particleContainer.style.zIndex = '96'; // Above cone but below characters
        
        // Create the particles
        for (let i = 0; i < POWDER_PARTICLE_COUNT; i++) {
            // Create a particle with random position within the cone
            const particle = document.createElement('div');
            particle.className = 'stachelspore-particle';
            
            // Generate a random position in the cone
            const randomPosition = this.getRandomPositionInCone();
            
            // Position the particle
            particle.style.position = 'absolute';
            particle.style.left = `${randomPosition.x * TILE_SIZE}px`;
            particle.style.top = `${randomPosition.y * TILE_SIZE}px`;
            
            // Random size (3-6 pixels)
            const size = 3 + Math.random() * 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Yellow color with random opacity
            const opacity = 0.4 + Math.random() * 0.6;
            particle.style.backgroundColor = `rgba(255, 230, 50, ${opacity})`;
            particle.style.borderRadius = '50%';
            
            // Add animation
            particle.style.animation = `stachelsporeFloat ${0.8 + Math.random() * 1.5}s ease-in-out infinite alternate`;
            
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
     * Generate a random position within the cone
     * @returns {Object} - Random {x, y} position in the cone
     */
    getRandomPositionInCone() {
        const attacker = this.attacker;
        const targetDirection = this.effectiveTarget;
        const range = this.range;
        
        // Try random positions until we find one in the cone
        let attempts = 0;
        while (attempts < 50) { // Limit attempts to avoid infinite loop
            // Random distance from attacker (0 to range)
            const distance = Math.random() * range;
            
            // Random angle within the cone
            const coneHalfAngle = this.coneAngle / 2;
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
            
            // Verify position is in cone (with partial tile position)
            const checkPos = { x, y };
            if (isPositionInCone(attacker, targetDirection, checkPos, range, this.coneAngle)) {
                // Return with sub-tile precision for smoother particle distribution
                return { x, y };
            }
            
            attempts++;
        }
        
        // Fallback to attacker position if we couldn't find a valid position
        return { x: attacker.x + 0.5, y: attacker.y + 0.5 };
    }
    
    /**
     * Find all valid targets in the cone
     * @returns {Promise<Array>} - Array of valid targets
     */
    async findValidTargets() {
        // Get all characters in the cone
        const charactersInCone = findCharactersInCone(
            this.attacker, 
            this.effectiveTarget, 
            this.range, 
            this.coneAngle
        );
        
        // Filter out invalid targets using the new status immunity system
        const validTargets = [];
        
        for (const target of charactersInCone) {
            // Skip attacker
            if (target.character === this.attacker.character) continue;
            
            // Check immunity using the comprehensive immunity system
            const isImmune = await hasStatusImmunity(target.character, 'paralyzed', {
                attacker: this.attacker.character,
                targetPosition: { x: target.x, y: target.y },
                attackerPosition: { x: this.attacker.x, y: this.attacker.y }
            });
            
            if (!isImmune && !(types.includes('grass') || types.includes('pflanze'))) {
                validTargets.push(target);
            }
        }
        
        return validTargets;
    }
    
    /**
     * Apply paralysis status to valid targets
     */
    async applyParalysisStatus() {
        if (this.statusApplied || this.removed) return;
        
        // Mark status as applied
        this.statusApplied = true;
        
        // Find valid targets
        const validTargets = await this.findValidTargets();
        
        // Apply paralysis to each valid target
        validTargets.forEach(target => {
            const applied = addStatusEffect(target.character, 'paralyzed', {
                sourceId: this.attacker.character.uniqueId,
                sourceName: this.attacker.character.name
            });
            
            if (applied) {
                // Apply visual hit effect
                applyVisualHitEffect(target.id, 'paralysis');
                
                // Apply paralysis flash effect
                this.applyParalysisFlashEffect(target.id);
            }
        });
    }
    
    /**
     * Apply a yellow flash effect to a target Pokémon
     * @param {string} targetId - Character ID of the target
     */
    applyParalysisFlashEffect(targetId) {
        // Find all character elements with this ID (there could be multiple in different places)
        const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${targetId}"]`);
        
        characterEls.forEach(charEl => {
            // Add the paralysis flash class
            charEl.classList.add('paralysis-flash-effect');
            
            // Remove the class after 500ms (half a second)
            setTimeout(() => {
                charEl.classList.remove('paralysis-flash-effect');
            }, 500);
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
        
        // Check if it's time to apply status
        const elapsedTime = Date.now() - this.creationTime;
        if (elapsedTime >= EFFECT_DURATION - 100 && !this.statusApplied) {
            this.applyParalysisStatus();
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
        if (this.statusTimeout) clearTimeout(this.statusTimeout);
        if (this.destroyTimeout) clearTimeout(this.destroyTimeout);
        
        // Apply status if not already applied
        if (!this.statusApplied) {
            this.applyParalysisStatus();
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
                console.error('Error in Stachelspore callback:', error);
            }
        }
    }
}

/**
 * Create a new Stachelspore attack
 * @param {Object} attacker - The attacker
 * @param {Object} target - The target direction
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits
 * @param {Function} callback - Function to call when done
 * @param {Array} activeProjectiles - Reference to active projectiles
 * @returns {StachelsporeAttack} - The created attack
 */
export function createStachelspore(attacker, target, attack, isHit, callback, activeProjectiles) {
    return new StachelsporeAttack(attacker, target, attack, isHit, callback, activeProjectiles);
}

/**
 * Add CSS styles for Stachelspore
 */
export function addStachelsporeStyles() {
    // Check if styles already exist
    if (document.getElementById('stachelspore-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'stachelspore-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Stachelspore particle styling */
        .stachelspore-particle {
            position: absolute;
            background-color: rgba(255, 230, 50, 0.7);
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(255, 230, 50, 0.5);
            pointer-events: none;
        }
        
        /* Ensure the SVG container has no background or border */
        .attack-cone.stachelspore-cone {
            background: none !important;
            border: none !important;
        }
        
        /* Style for Stachelspore cone - target only path and circle elements */
        .attack-cone.stachelspore-cone path,
        .attack-cone.stachelspore-cone circle {
            fill: rgba(144, 238, 144, 0.3);
            stroke: rgba(144, 238, 144, 0.6);
        }
        
        /* Floating animation for particles */
        @keyframes stachelsporeFloat {
            0% {
                transform: translate(0, 0) scale(1);
                opacity: 0.4;
            }
            50% {
                transform: translate(${Math.random() > 0.5 ? '+' : '-'}${Math.random() * 5}px, -${Math.random() * 5}px) scale(1.2);
                opacity: 0.7;
            }
            100% {
                transform: translate(${Math.random() > 0.5 ? '+' : '-'}${Math.random() * 8}px, -${Math.random() * 8}px) scale(0.8);
                opacity: 0.3;
            }
        }
        
        /* Yellow flash effect for paralyzed Pokemon */
        @keyframes paralysisFlash {
            0% { filter: brightness(1) saturate(1); }
            50% { filter: brightness(1.5) saturate(1) drop-shadow(0 0 5px rgba(255, 230, 50, 0.9)) hue-rotate(60deg); }
            100% { filter: brightness(1) saturate(1); }
        }
        
        /* Class to apply the paralysis flash effect */
        .paralysis-flash-effect {
            animation: paralysisFlash 0.5s ease-in-out forwards;
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

/**
 * Check if target is valid for Stachelspore
 * @param {Object} target - Target to check
 * @param {Object} attacker - The attacking Pokemon (optional)
 * @param {Object} targetPosition - Position of the target (optional)
 * @param {Object} attackerPosition - Position of the attacker (optional)
 * @returns {Promise<boolean>} - Whether target is valid
 */
export async function isValidStachelsporeTarget(target, attacker = null, targetPosition = null, attackerPosition = null) {
    // If target doesn't exist, it's not valid
    if (!target || !target.character) return false;
    
    // Use the comprehensive immunity system
    const isImmune = await hasStatusImmunity(target.character, 'paralyzed', {
        attacker: attacker,
        targetPosition: targetPosition,
        attackerPosition: attackerPosition
    });
    
    return !isImmune;
}

/**
 * Apply Stachelspore effects (paralysis status)
 */
export async function applyStachelsporeEffects(attacker, validTargets, attack, results) {
    let successfulTargets = 0;
    
    // Filter targets again for immunity (in case this is called independently)
    const finalTargets = [];
    for (const target of validTargets) {
        const isImmune = await hasStatusImmunity(target.character, 'paralyzed', {
            attacker: attacker.character,
            targetPosition: { x: target.x, y: target.y },
            attackerPosition: { x: attacker.x, y: attacker.y }
        });
        
        if (!isImmune) {
            finalTargets.push(target);
        }
    }
    
    finalTargets.forEach(target => {
        const applied = addStatusEffect(target.character, 'paralyzed', {
            sourceId: attacker.character.uniqueId,
            sourceName: attacker.character.name
        });
        
        if (applied) {
            successfulTargets++;
            applyVisualHitEffect(target.id, 'paralysis');
            results.messages.push(`${target.character.name} wurde durch Stachelspore von ${attacker.character.name} paralysiert!`);
            
            results.effects.push({
                targetId: target.id,
                type: 'status',
                status: 'paralyzed'
            });
        }
    });
    
    if (successfulTargets === 0) {
        results.messages.push(`Stachelspore von ${attacker.character.name} hat keine Wirkung!`);
    }
}