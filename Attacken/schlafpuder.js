/**
 * Schlafpuder (Sleep Powder) attack implementation
 * Applies sleep status effect in a cone
 */

import { TILE_SIZE } from '../config.js';
import { addStatusEffect, hasStatusEffect } from '../statusEffects.js';
import { logBattleEvent } from '../battleLog.js';
import { 
    createConeIndicator, 
    removeConeIndicator, 
    findCharactersInCone,
    isPositionInCone 
} from '../attackCone.js';

// Constants
const DEFAULT_CONE_ANGLE = 45;
const EFFECT_DURATION = 1500; // 1.5 seconds for the powder to be visible
const POWDER_PARTICLE_COUNT = 40; // Number of dust particles to create

/**
 * SchlafpuderAttack class for handling the sleep powder attack
 */
export class SchlafpuderAttack {
    /**
     * Create a new Schlafpuder attack
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
        
        // The Schlafpuder specific properties
        this.range = attack.range || 3;
        this.coneAngle = attack.cone || DEFAULT_CONE_ANGLE;
        this.particleElements = [];
        this.coneElement = null;
        this.coneId = `schlafpuder-cone-${this.id}`;
        
        // Timing properties
        this.creationTime = Date.now();
        this.statusApplied = false;
        
        // Create the cone and particles
        this.createVisualElements();
        
        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Set timeouts for status application and cleanup
        this.statusTimeout = setTimeout(() => this.applySleepStatus(), EFFECT_DURATION - 100);
        this.destroyTimeout = setTimeout(() => this.destroy(), EFFECT_DURATION);
    }
    
    /**
     * Create the visual elements for sleep powder
     */
    createVisualElements() {
        // First create the cone indicator
        this.coneElement = createConeIndicator(
            this.attacker, 
            this.target, 
            this.range, 
            this.coneAngle, 
            'schlafpuder',
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
        particleContainer.className = 'schlafpuder-particles-container';
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
            particle.className = 'schlafpuder-particle';
            
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
            
            // Green color with random opacity
            const opacity = 0.4 + Math.random() * 0.6;
            particle.style.backgroundColor = `rgba(100, 200, 100, ${opacity})`;
            particle.style.borderRadius = '50%';
            
            // Add animation
            particle.style.animation = `schlafpuderFloat ${0.8 + Math.random() * 1.5}s ease-in-out infinite alternate`;
            
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
        const targetDirection = this.target;
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
     * @returns {Array} - Array of valid targets
     */
    findValidTargets() {
        // Get all characters in the cone
        const charactersInCone = findCharactersInCone(
            this.attacker, 
            this.target, 
            this.range, 
            this.coneAngle
        );
        
        // Filter out invalid targets:
        // - Attacker (self)
        // - Grass-type Pokemon
        // - Already sleeping Pokemon
        // - Pokemon with Insomnia or Vital Spirit abilities
        const validTargets = charactersInCone.filter(target => {
            // Skip attacker
            if (target.character === this.attacker.character) return false;
            
            // Check if already has the sleep status
            if (hasStatusEffect(target.character, 'asleep')) {
                return false;
            }
            
            const pokemon = target.character;
            
            // Check for Grass type immunity
            if (pokemon.pokemonTypes) {
                const types = pokemon.pokemonTypes.map(type => 
                    typeof type === 'string' ? type.toLowerCase() : ""
                );
                
                // Grass types are immune
                if (types.includes('grass') || types.includes('pflanze')) {
                    return false;
                }
            }
            
            // Check for insomnia or vital spirit abilities
            if (this.hasSleepImmunityAbility(pokemon)) {
                return false;
            }
            
            return true;
        });
        
        return validTargets;
    }
    
    /**
     * Check if a Pokemon has an ability that makes it immune to sleep
     * @param {Object} pokemon - Pokemon to check
     * @returns {boolean} - Whether the Pokemon is immune to sleep
     */
    hasSleepImmunityAbility(pokemon) {
        if (!pokemon) return false;
        
        const immuneAbilities = ['insomnia', 'vital spirit', 'munterkeit'];
        
        // Check in abilities array
        if (pokemon.abilities && Array.isArray(pokemon.abilities)) {
            for (const ability of pokemon.abilities) {
                if (ability && ability.name) {
                    const lowerName = ability.name.toLowerCase();
                    if (immuneAbilities.some(a => lowerName.includes(a))) {
                        return true;
                    }
                }
                
                if (ability && ability.description) {
                    const lowerDesc = ability.description.toLowerCase();
                    if (immuneAbilities.some(a => lowerDesc.includes(a))) {
                        return true;
                    }
                }
            }
        }
        
        // Check in ability property
        if (pokemon.ability) {
            if (typeof pokemon.ability === 'string') {
                const lowerName = pokemon.ability.toLowerCase();
                if (immuneAbilities.some(a => lowerName.includes(a))) {
                    return true;
                }
            } else if (pokemon.ability.name) {
                const lowerName = pokemon.ability.name.toLowerCase();
                if (immuneAbilities.some(a => lowerName.includes(a))) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Apply sleep status to valid targets
     */
    applySleepStatus() {
        if (this.statusApplied || this.removed) return;
        
        // Mark status as applied
        this.statusApplied = true;
        
        // Find valid targets
        const validTargets = this.findValidTargets();
        
        // Apply sleep status to each valid target
        validTargets.forEach(target => {
            const applied = addStatusEffect(target.character, 'asleep', {
                sourceId: this.attacker.character.uniqueId,
                sourceName: this.attacker.character.name
            });
            
            if (applied) {
                // Apply visual flash effect to the target
                this.applySleepFlashEffect(target.id);
                
                logBattleEvent(`${target.character.name} wurde durch Schlafpuder von ${this.attacker.character.name} eingeschläfert!`);
            }
        });
        
        // If no valid targets were found, log that
        if (validTargets.length === 0) {
            logBattleEvent(`Schlafpuder von ${this.attacker.character.name} hat keine Wirkung!`);
        }
    }
    
    /**
     * Apply a green flash effect to a target Pokémon
     * @param {string} targetId - Character ID of the target
     */
    applySleepFlashEffect(targetId) {
        // Find all character elements with this ID (there could be multiple in different places)
        const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${targetId}"]`);
        
        characterEls.forEach(charEl => {
            // Add the sleep flash class
            charEl.classList.add('sleep-flash-effect');
            
            // Remove the class after 500ms (half a second)
            setTimeout(() => {
                charEl.classList.remove('sleep-flash-effect');
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
            this.applySleepStatus();
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
            this.applySleepStatus();
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
                console.error('Error in Schlafpuder callback:', error);
            }
        }
    }
}

/**
 * Create a new Schlafpuder attack
 * @param {Object} attacker - The attacker
 * @param {Object} target - The target direction
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits
 * @param {Function} callback - Function to call when done
 * @param {Array} activeProjectiles - Reference to active projectiles
 * @returns {SchlafpuderAttack} - The created attack
 */
export function createSchlafpuder(attacker, target, attack, isHit, callback, activeProjectiles) {
    return new SchlafpuderAttack(attacker, target, attack, isHit, callback, activeProjectiles);
}

/**
 * Add CSS styles for Schlafpuder
 */
export function addSchlafpuderStyles() {
    // Check if styles already exist
    if (document.getElementById('schlafpuder-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'schlafpuder-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Schlafpuder particle styling */
        .schlafpuder-particle {
            position: absolute;
            background-color: rgba(100, 200, 100, 0.7);
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(100, 200, 100, 0.5);
            pointer-events: none;
        }
        
        /* Floating animation for particles */
        @keyframes schlafpuderFloat {
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
        
        /* Green flash effect for sleeping Pokemon */
        @keyframes sleepFlash {
            0% { filter: brightness(1) saturate(1); }
            50% { filter: brightness(1.5) saturate(1) drop-shadow(0 0 5px rgba(100, 200, 100, 0.9)) hue-rotate(120deg); }
            100% { filter: brightness(1) saturate(1); }
        }
        
        /* Class to apply the sleep flash effect */
        .sleep-flash-effect {
            animation: sleepFlash 0.5s ease-in-out forwards;
        }
        
        /* Awake text animation */
        @keyframes awakeTextFade {
            0% { opacity: 0; transform: translateY(0); }
            20% { opacity: 1; transform: translateY(-5px); }
            80% { opacity: 1; transform: translateY(-15px); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
        
        /* Class for "Aufgewacht!" text */
        .awake-text {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-weight: bold;
            text-shadow: 0 0 2px black, 0 0 4px black, 0 0 6px black;
            font-size: 14px;
            pointer-events: none;
            z-index: 200;
            animation: awakeTextFade 1s ease-out forwards;
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

/**
 * Check if target is valid for Schlafpuder
 * @param {Object} target - Target to check
 * @returns {boolean} - Whether target is valid
 */
export function isValidSchlafpuderTarget(target) {
    // If target doesn't exist, it's not valid
    if (!target || !target.character) return false;
    
    // Check if target already has sleep status
    if (hasStatusEffect(target.character, 'asleep')) {
        return false;
    }
    
    // Check for Grass type immunity
    if (target.character.pokemonTypes) {
        const types = target.character.pokemonTypes.map(type => 
            typeof type === 'string' ? type.toLowerCase() : ""
        );
        
        // Grass types are immune
        if (types.includes('grass') || types.includes('pflanze')) {
            return false;
        }
    }
    
    // Check for immunity abilities
    const pokemon = target.character;
    const immuneAbilities = ['insomnia', 'vital spirit', 'munterkeit'];
    
    // Check in abilities array
    if (pokemon.abilities && Array.isArray(pokemon.abilities)) {
        for (const ability of pokemon.abilities) {
            if (ability && ability.name) {
                const lowerName = ability.name.toLowerCase();
                if (immuneAbilities.some(a => lowerName.includes(a))) {
                    return false;
                }
            }
            
            if (ability && ability.description) {
                const lowerDesc = ability.description.toLowerCase();
                if (immuneAbilities.some(a => lowerDesc.includes(a))) {
                    return false;
                }
            }
        }
    }
    
    // Check in ability property
    if (pokemon.ability) {
        if (typeof pokemon.ability === 'string') {
            const lowerName = pokemon.ability.toLowerCase();
            if (immuneAbilities.some(a => lowerName.includes(a))) {
                return false;
            }
        } else if (pokemon.ability.name) {
            const lowerName = pokemon.ability.name.toLowerCase();
            if (immuneAbilities.some(a => lowerName.includes(a))) {
                return false;
            }
        }
    }
    
    return true;
}