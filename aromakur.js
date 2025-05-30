/**
 * Aromakur (Aromatherapy) implementation
 * A supportive attack that removes all negative status effects from all Pokémon in range
 */

import { TILE_SIZE } from '../config.js';
import { createConeIndicator, removeConeIndicator } from '../attackCone.js';
import { removeAllStatusEffects, hasStatusEffect } from '../statusEffects.js';
import { findCharactersInCone } from '../attackCone.js';
import { logBattleEvent } from '../battleLog.js';
import { getCharacterPositions } from '../characterPositions.js';

// CSS class names
const AROMAKUR_CONTAINER_CLASS = 'aromakur-particles-container';
const AROMAKUR_PARTICLE_CLASS = 'aromakur-particle';

/**
 * Create Aromakur attack effect
 * @param {Object} attacker - The attacking Pokémon
 * @param {Object} target - The target position (for direction)
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits (always true for Aromakur)
 * @param {Function} callback - Function to call when the attack is complete
 * @param {Array} activeProjectiles - Array of active projectiles
 * @returns {Object} - The created attack object
 */
export function createAromakur(attacker, target, attack, isHit = true, callback = null, activeProjectiles = []) {
    // Create a new AromakurAttack instance
    const aromakurAttack = new AromakurAttack(attacker, target, attack, true, callback, activeProjectiles);
    
    // Start the particle system
    aromakurAttack.createParticleSystem();
    
    return aromakurAttack;
}

/**
 * Add CSS styles for Aromakur attack
 */
export function addAromakurStyles() {
    // Check if styles already exist
    if (document.getElementById('aromakur-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'aromakur-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Container for Aromakur particles */
        .${AROMAKUR_CONTAINER_CLASS} {
            position: absolute;
            pointer-events: none;
            z-index: 95;
        }
        
        /* Aromakur particle styling */
        .${AROMAKUR_PARTICLE_CLASS} {
            position: absolute;
            background-color: rgba(144, 238, 144, 0.7);
            width: 10px;
            height: 10px;
            border-radius: 50%;
            box-shadow: 0 0 5px rgba(50, 205, 50, 0.8);
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 96;
        }
        
        /* Leaf particle */
        .${AROMAKUR_PARTICLE_CLASS}.leaf {
            background-color: transparent;
            box-shadow: none;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 10px solid rgba(60, 179, 113, 0.9);
            border-radius: 0;
        }
        
        /* Petal particle */
        .${AROMAKUR_PARTICLE_CLASS}.petal {
            background-color: rgba(255, 192, 203, 0.8);
            box-shadow: 0 0 3px rgba(255, 105, 180, 0.6);
            width: 8px;
            height: 4px;
            border-radius: 50%;
        }
        
        /* Healing flash effect */
        .healing-flash-effect {
            animation: healing-flash 0.5s ease-out;
        }
        
        @keyframes healing-flash {
            0% { filter: brightness(1); }
            50% { filter: brightness(1.5) drop-shadow(0 0 10px rgba(144, 238, 144, 0.8)); }
            100% { filter: brightness(1); }
        }
        
        /* Aromakur cone styling */
        .aromakur-cone path, .aromakur-highlight {
            fill: rgba(144, 238, 144, 0.2);
            stroke: rgba(50, 205, 50, 0.5);
        }
        
        .aromakur-highlight {
            animation: aromakur-pulse 1.5s infinite;
        }
        
        @keyframes aromakur-pulse {
            0% { background-color: rgba(144, 238, 144, 0.1); }
            50% { background-color: rgba(144, 238, 144, 0.3); }
            100% { background-color: rgba(144, 238, 144, 0.1); }
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

/**
 * Check if Aromakur should be used
 * @param {Object} attacker - The attacking Pokémon
 * @param {number} range - Range of the attack
 * @returns {boolean} - Whether Aromakur should be used
 */
export function shouldUseAromakur(attacker, range = 6) {
    // Get all characters in range (use 360° cone since Aromakur affects in all directions)
    const charactersInRange = findCharactersInCone(attacker, attacker, range, 360);
    
    let alliesWithStatusEffects = 0;
    let enemiesWithStatusEffects = 0;
    let hasAffectedAlly = false;
    
    // Count allies and enemies with status effects
    charactersInRange.forEach(charData => {
        // Skip the character if it's defeated
        if (charData.position && charData.position.isDefeated) return;
        
        // Check if the character has any status effects
        const hasEffects = charData.character && 
                         charData.character.statusEffects && 
                         charData.character.statusEffects.length > 0;
        
        if (hasEffects) {
            // Check if ally or enemy
            if (charData.position && charData.position.teamIndex === attacker.teamIndex) {
                alliesWithStatusEffects++;
                hasAffectedAlly = true;
            } else {
                enemiesWithStatusEffects++;
            }
        }
    });
    
    // Check if the attacker itself has status effects
    if (attacker.character && 
        attacker.character.statusEffects && 
        attacker.character.statusEffects.length > 0) {
        alliesWithStatusEffects++;
        hasAffectedAlly = true;
    }
    
    // Aromakur should be used if:
    // 1. There's at least one friendly target with status effects
    // 2. There are more allies with status effects than enemies
    return hasAffectedAlly && (alliesWithStatusEffects > enemiesWithStatusEffects);
}

/**
 * Check if a Pokémon is a valid Aromakur user
 * @param {Object} pokemon - The Pokémon to check
 * @returns {boolean} - Whether the Pokémon can use Aromakur
 */
export function isValidAromakurUser(pokemon) {
    // Check if the Pokémon has the Aromakur attack
    if (!pokemon.attacks) return false;
    
    return pokemon.attacks.some(attack => 
        attack.weaponName && attack.weaponName.toLowerCase() === 'aromakur' &&
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
}

/**
 * Apply Aromakur effects to all Pokémon in range
 * @param {Object} attacker - The attacking Pokémon
 * @param {Array} targets - Array of target Pokémon
 * @returns {Object} - Results of the attack
 */
export function applyAromakurEffects(attacker, targets) {
    const results = {
        targetsHealed: 0,
        effectsRemoved: [],
        messages: []
    };
    
    // Get character positions to find character IDs
    const characterPositions = getCharacterPositions();
    
    // Process each target
    targets.forEach(target => {
        // Skip defeated Pokémon
        if (target.character.currentKP <= 0) return;
        
        // Remove all status effects
        const removedEffects = removeAllStatusEffects(target.character);
        
        // If any effects were removed, log and count
        if (removedEffects.length > 0) {
            results.targetsHealed++;
            
            // Find the character ID for visual effects
            let targetId = null;
            for (const id in characterPositions) {
                if (characterPositions[id].character === target.character) {
                    targetId = id;
                    break;
                }
            }
            
            // Apply visual healing effect
            if (targetId) {
                applyHealingVisualEffect(targetId);
            }
            
            // Add to results
            results.effectsRemoved.push({
                target: target.character.name,
                effects: removedEffects
            });
            
            // Log the effect
            results.messages.push(`${target.character.name} wurde von allen Statuseffekten geheilt!`);
        }
    });
    
    // Log summary
    if (results.targetsHealed > 0) {
        results.messages.unshift(`${attacker.character.name}'s Aromakur heilt ${results.targetsHealed} Pokémon von Statuseffekten!`);
    } else {
        results.messages.push(`${attacker.character.name}'s Aromakur hatte keine Wirkung.`);
    }
    
    return results;
}

/**
 * Apply a healing visual effect to a target
 * @param {string} targetId - Target character ID
 */
function applyHealingVisualEffect(targetId) {
    const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${targetId}"]`);
    
    characterEls.forEach(charEl => {
        // Add healing flash effect
        charEl.classList.add('healing-flash-effect');
        
        // Remove the effect after animation completes
        setTimeout(() => {
            charEl.classList.remove('healing-flash-effect');
        }, 500);
    });
}

/**
 * AromakurAttack class for managing the Aromakur attack
 */
class AromakurAttack {
    /**
     * Create a new Aromakur attack instance
     * @param {Object} attacker - The attacking Pokémon
     * @param {Object} target - The target position (for direction)
     * @param {Object} attack - The attack data
     * @param {boolean} isHit - Whether the attack hits (always true for Aromakur)
     * @param {Function} callback - Function to call when the attack is complete
     * @param {Array} activeProjectiles - Array of active projectiles
     */
    constructor(attacker, target, attack, isHit = true, callback = null, activeProjectiles = []) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.attacker = attacker;
        this.target = target; // Not really used for Aromakur since it's 360°
        this.attack = attack;
        this.isHit = true; // Aromakur always hits
        this.callback = callback;
        this.activeProjectiles = activeProjectiles;
        this.removed = false;
        
        this.range = attack.range || 6;
        this.coneAngle = 360; // Aromakur is always 360°
        this.coneId = `aromakur-cone-${this.id}`;
        
        this.creationTime = Date.now();
        this.effectApplied = false;
        this.particleContainer = null;
        this.particles = [];
        
        // Duration of the effect in milliseconds
        this.effectDuration = 2500; // 2.5 seconds
        
        // Create visual elements
        this.createVisualElements();
        
        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Set timeouts
        this.effectTimeout = setTimeout(() => this.applyEffects(), this.effectDuration - 500);
        this.destroyTimeout = setTimeout(() => this.destroy(), this.effectDuration);
    }
    
    /**
     * Create visual elements for the Aromakur attack
     */
    createVisualElements() {
        // Create the cone indicator with green color
        import('../attackCone.js').then(module => {
            // Override to green color scheme for support move
            const overrideAttackType = 'aromakur';
            
            this.coneElement = module.createConeIndicator(
                this.attacker, 
                this.attacker, // Use attacker as target for 360° effect
                this.range, 
                this.coneAngle, 
                overrideAttackType,
                this.coneId
            );
        });
    }
    
    /**
     * Create the particle system for Aromakur's visual effects
     */
    createParticleSystem() {
        // Find the battlefield
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        // Create particle container
        this.particleContainer = document.createElement('div');
        this.particleContainer.className = AROMAKUR_CONTAINER_CLASS;
        this.particleContainer.dataset.attackId = this.id;
        
        // Position container at attacker's location
        const attackerCenterX = this.attacker.x * TILE_SIZE + TILE_SIZE / 2;
        const attackerCenterY = this.attacker.y * TILE_SIZE + TILE_SIZE / 2;
        this.particleContainer.style.left = `${attackerCenterX}px`;
        this.particleContainer.style.top = `${attackerCenterY}px`;
        
        // Add to battlefield
        battlefield.appendChild(this.particleContainer);
        
        // Create particles
        this.createParticles();
        
        // Start particle animation
        this.animateParticles();
    }
    
    /**
     * Create individual particles for the effect
     */
    createParticles() {
        // Create 30-50 particles
        const particleCount = 30 + Math.floor(Math.random() * 20);
        
        for (let i = 0; i < particleCount; i++) {
            // Create particle element
            const particle = document.createElement('div');
            
            // Determine particle type (regular, leaf, or petal)
            const particleType = Math.random();
            if (particleType < 0.4) {
                particle.className = `${AROMAKUR_PARTICLE_CLASS} leaf`;
            } else if (particleType < 0.7) {
                particle.className = `${AROMAKUR_PARTICLE_CLASS} petal`;
            } else {
                particle.className = AROMAKUR_PARTICLE_CLASS;
            }
            
            // Set initial position at center
            particle.style.left = '0px';
            particle.style.top = '0px';
            
            // Add custom properties for animation
            particle.dataset.angle = Math.random() * Math.PI * 2; // Random direction
            particle.dataset.speed = 0.5 + Math.random() * 1.5; // Random speed
            particle.dataset.distance = 0; // Initial distance from center
            particle.dataset.maxDistance = (this.range * TILE_SIZE) * (0.6 + Math.random() * 0.5); // Max distance
            particle.dataset.rotationSpeed = (Math.random() - 0.5) * 8; // Random rotation
            particle.dataset.rotation = Math.random() * 360; // Initial rotation
            particle.dataset.scale = 0.6 + Math.random() * 0.8; // Random size
            
            // Apply initial rotation and scale
            particle.style.transform = `translate(-50%, -50%) rotate(${particle.dataset.rotation}deg) scale(${particle.dataset.scale})`;
            
            // Add to container and store reference
            this.particleContainer.appendChild(particle);
            this.particles.push(particle);
        }
    }
    
    /**
     * Animate the particles
     */
    animateParticles() {
        // Set up animation interval
        this.particleInterval = setInterval(() => {
            // Skip if attack is removed
            if (this.removed) {
                clearInterval(this.particleInterval);
                return;
            }
            
            // Update each particle
            this.particles.forEach(particle => {
                // Increase distance
                const speed = parseFloat(particle.dataset.speed);
                let distance = parseFloat(particle.dataset.distance) + speed;
                const maxDistance = parseFloat(particle.dataset.maxDistance);
                
                // Cap at max distance
                if (distance >= maxDistance) {
                    // Remove particle that reached max distance
                    particle.remove();
                    // Remove from array
                    const index = this.particles.indexOf(particle);
                    if (index !== -1) {
                        this.particles.splice(index, 1);
                    }
                    return;
                }
                
                // Update distance
                particle.dataset.distance = distance;
                
                // Calculate new position
                const angle = parseFloat(particle.dataset.angle);
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                // Update position
                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;
                
                // Update rotation
                const rotationSpeed = parseFloat(particle.dataset.rotationSpeed);
                let rotation = parseFloat(particle.dataset.rotation) + rotationSpeed;
                particle.dataset.rotation = rotation;
                
                // Update opacity based on distance
                const distanceRatio = distance / maxDistance;
                const opacity = Math.max(0, 1 - distanceRatio * 0.7);
                particle.style.opacity = opacity;
                
                // Apply transform
                particle.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${particle.dataset.scale})`;
            });
            
            // Create new particles if needed to maintain effect
            if (this.particles.length < 20 && !this.effectApplied) {
                // Add 3-5 new particles
                const newCount = 3 + Math.floor(Math.random() * 3);
                for (let i = 0; i < newCount; i++) {
                    // Create particle element
                    const particle = document.createElement('div');
                    
                    // Determine particle type (regular, leaf, or petal)
                    const particleType = Math.random();
                    if (particleType < 0.4) {
                        particle.className = `${AROMAKUR_PARTICLE_CLASS} leaf`;
                    } else if (particleType < 0.7) {
                        particle.className = `${AROMAKUR_PARTICLE_CLASS} petal`;
                    } else {
                        particle.className = AROMAKUR_PARTICLE_CLASS;
                    }
                    
                    // Set initial position at center
                    particle.style.left = '0px';
                    particle.style.top = '0px';
                    
                    // Add custom properties for animation
                    particle.dataset.angle = Math.random() * Math.PI * 2; // Random direction
                    particle.dataset.speed = 0.5 + Math.random() * 1.5; // Random speed
                    particle.dataset.distance = 0; // Initial distance from center
                    particle.dataset.maxDistance = (this.range * TILE_SIZE) * (0.6 + Math.random() * 0.5); // Max distance
                    particle.dataset.rotationSpeed = (Math.random() - 0.5) * 8; // Random rotation
                    particle.dataset.rotation = Math.random() * 360; // Initial rotation
                    particle.dataset.scale = 0.6 + Math.random() * 0.8; // Random size
                    
                    // Apply initial rotation and scale
                    particle.style.transform = `translate(-50%, -50%) rotate(${particle.dataset.rotation}deg) scale(${particle.dataset.scale})`;
                    
                    // Add to container and store reference
                    this.particleContainer.appendChild(particle);
                    this.particles.push(particle);
                }
            }
        }, 16); // ~60fps
    }
    
    /**
     * Apply the effects of Aromakur to all Pokémon in range
     */
    applyEffects() {
        if (this.effectApplied || this.removed) return;
        this.effectApplied = true;
        
        // Find all characters in range
        const charactersInRange = findCharactersInCone(this.attacker, this.attacker, this.range, this.coneAngle);
        
        // Add the attacker itself to the targets
        charactersInRange.push({
            id: null, // Will be found when applying effects
            character: this.attacker.character,
            position: this.attacker
        });
        
        // Apply the Aromakur effects
        const results = applyAromakurEffects(this.attacker, charactersInRange);
        
        // Log results
        results.messages.forEach(message => {
            logBattleEvent(message);
        });
    }
    
    /**
     * Update method required for projectile system
     * @param {number} deltaTime - Time since last update
     * @returns {boolean} - Whether to keep the projectile
     */
    update(deltaTime) {
        if (this.removed) return false;
        
        const elapsedTime = Date.now() - this.creationTime;
        if (elapsedTime >= this.effectDuration - 500 && !this.effectApplied) {
            this.applyEffects();
        }
        
        if (elapsedTime >= this.effectDuration) {
            this.destroy();
            return false;
        }
        
        return true;
    }
    
    /**
     * Destroy the Aromakur attack
     */
    destroy() {
        if (this.removed) return;
        this.removed = true;
        
        // Clear timeouts
        if (this.effectTimeout) clearTimeout(this.effectTimeout);
        if (this.destroyTimeout) clearTimeout(this.destroyTimeout);
        if (this.particleInterval) clearInterval(this.particleInterval);
        
        // Apply effects if not already done
        if (!this.effectApplied) {
            this.applyEffects();
        }
        
        // Remove cone indicator
        import('../attackCone.js').then(module => {
            module.removeConeIndicator(this.coneId);
        });
        
        // Remove particle container
        if (this.particleContainer && this.particleContainer.parentNode) {
            this.particleContainer.parentNode.removeChild(this.particleContainer);
        }
        
        // Remove from active projectiles
        const index = this.activeProjectiles.findIndex(p => p.id === this.id);
        if (index !== -1) {
            this.activeProjectiles.splice(index, 1);
        }
        
        // Call callback
        if (this.callback) {
            try {
                this.callback();
            } catch (error) {
                console.error('Error in Aromakur attack callback:', error);
            }
        }
    }
}