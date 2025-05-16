/**
 * Sandwirbel (Sand Attack) implementation
 * Reduces target's accuracy (GENA) by 1
 */

import { TILE_SIZE } from '../config.js';
import { logBattleEvent } from '../battleLog.js';
import { changeStatValue } from '../statChanges.js';
import { hasPokemonAbility } from '../statusEffects.js';
import { getCurrentStatValue } from '../statChanges.js';
import { 
    createConeIndicator, 
    removeConeIndicator, 
    findCharactersInCone,
    isPositionInCone 
} from '../attackCone.js';

// Constants
const DEFAULT_CONE_ANGLE = 60; // The angle of the Sandwirbel cone in degrees
const EFFECT_DURATION = 1500; // 1.5 seconds for the sand to be visible
const SAND_PARTICLE_COUNT = 40; // Number of sand particles to create

/**
 * SandwirbelAttack class for handling the sand attack
 */
export class SandwirbelAttack {
    /**
     * Create a new Sandwirbel attack
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
        
        // The Sandwirbel specific properties
        this.range = attack.range || 3;
        this.coneAngle = attack.cone || DEFAULT_CONE_ANGLE;
        this.particleElements = [];
        this.coneElement = null;
        this.coneId = `sandwirbel-cone-${this.id}`;
        
        // Timing properties
        this.creationTime = Date.now();
        this.effectApplied = false;
        
        // Create the cone and particles
        this.createVisualElements();
        
        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Set timeouts for effect application and cleanup
        this.effectTimeout = setTimeout(() => this.applyGENAReduction(), EFFECT_DURATION - 100);
        this.destroyTimeout = setTimeout(() => this.destroy(), EFFECT_DURATION);
    }
    
    /**
     * Create the visual elements for sand attack
     */
    createVisualElements() {
        // First create the cone indicator
        this.coneElement = createConeIndicator(
            this.attacker, 
            this.target, 
            this.range, 
            this.coneAngle, 
            'sandwirbel',
            this.coneId
        );
        
        // Create sand particles
        this.createSandParticles();
    }
    
    /**
     * Create sand particle effects within the cone
     */
    createSandParticles() {
        // Find the battlefield for positioning
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'sandwirbel-particles-container';
        particleContainer.dataset.attackId = this.id;
        particleContainer.style.position = 'absolute';
        particleContainer.style.top = '0';
        particleContainer.style.left = '0';
        particleContainer.style.width = '100%';
        particleContainer.style.height = '100%';
        particleContainer.style.pointerEvents = 'none';
        particleContainer.style.zIndex = '96'; // Above cone but below characters
        
        // Create the particles
        for (let i = 0; i < SAND_PARTICLE_COUNT; i++) {
            // Create a particle with random position within the cone
            const particle = document.createElement('div');
            particle.className = 'sandwirbel-particle';
            
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
            
            // Sand color with random opacity
            const opacity = 0.4 + Math.random() * 0.6;
            particle.style.backgroundColor = `rgba(210, 180, 140, ${opacity})`;
            particle.style.borderRadius = '50%';
            
            // Add animation
            particle.style.animation = `sandwirbelFloat ${0.8 + Math.random() * 1.5}s ease-in-out infinite alternate`;
            
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
        
        // Filter out invalid targets based on immunities
        const validTargets = charactersInCone.filter(target => {
            // Skip attacker
            if (target.character === this.attacker.character) return false;
            
            const pokemon = target.character;
            
            // Check for Flying type immunity
            if (pokemon.pokemonTypes) {
                const types = pokemon.pokemonTypes.map(type => 
                    typeof type === 'string' ? type.toLowerCase() : ""
                );
                
                // Flying types are immune
                if (types.includes('flying') || types.includes('fliegend')) {
                    return false;
                }
            }

            // Check for flying terrain attribute - CORRECTED
            if (pokemon.terrainAttributes && pokemon.terrainAttributes.fliegend) {
                // The terrainAttributes is an object with boolean properties
                // Directly check the fliegend property
                return false;
            }
            
            // Check for minimum GENA - can't reduce below 2
            const currentGena = getCurrentStatValue(pokemon, 'gena');
            if (currentGena <= 2) {
                return false;
            }
            
            // Check for abilities that grant immunity
            if (this.hasImmunityAbility(pokemon)) {
                return false;
            }
            
            return true;
        });
        
        return validTargets;
    }
    
    /**
     * Check if a Pokemon has abilities that grant immunity to accuracy reduction
     * @param {Object} pokemon - Pokemon to check
     * @returns {boolean} - Whether the Pokemon has immunity
     */
    hasImmunityAbility(pokemon) {
        if (!pokemon) return false;
        
        // List of abilities that provide immunity
        const immuneAbilities = [
            'adlerauge', 'keen eye',
            'neutraltorso', 'clear body',
            'pulverrauch', 'white smoke',
            'metallprotektor', 'full metal body',
            'spiegelrüstung', 'mirror armor'
        ];
        
        return hasPokemonAbility(pokemon, immuneAbilities);
    }
    
    /**
     * Apply GENA reduction to valid targets
     */
    applyGENAReduction() {
        if (this.effectApplied || this.removed) return;
        
        // Mark effect as applied
        this.effectApplied = true;
        
        // Find valid targets
        const validTargets = this.findValidTargets();
        
        // Apply GENA reduction to each valid target
        let successfulTargets = 0;
        validTargets.forEach(target => {
            const result = changeStatValue(
                target.character, 
                'gena', 
                -1, // Reduce GENA by 1
                this.attacker.character // Source of the effect
            );
            
            if (result.success) {
                // Apply visual flash effect to the target
                this.applySandFlashEffect(target.id);
                successfulTargets++;
            } else if (result.prevented && result.ability) {
                // Log that the ability prevented the stat reduction
                logBattleEvent(result.message);
            } else if (result.atMinimum) {
                // Log that the stat is already at minimum
                logBattleEvent(result.message);
            }
        });
        
        // Log the attack result
        if (successfulTargets > 0) {
            logBattleEvent(`${this.attacker.character.name}'s Sandwirbel senkt die Genauigkeit von ${successfulTargets} Pokémon!`);
        } else if (validTargets.length === 0) {
            logBattleEvent(`Sandwirbel von ${this.attacker.character.name} hat keine Wirkung!`);
        }
    }
    
    /**
     * Apply a sand flash effect to a target Pokémon
     * @param {string} targetId - Character ID of the target
     */
    applySandFlashEffect(targetId) {
        // Find all character elements with this ID
        const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${targetId}"]`);
        
        characterEls.forEach(charEl => {
            // Add the sand flash class
            charEl.classList.add('sand-flash-effect');
            
            // Remove the class after 500ms
            setTimeout(() => {
                charEl.classList.remove('sand-flash-effect');
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
        
        // Check if it's time to apply effect
        const elapsedTime = Date.now() - this.creationTime;
        if (elapsedTime >= EFFECT_DURATION - 100 && !this.effectApplied) {
            this.applyGENAReduction();
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
        if (this.effectTimeout) clearTimeout(this.effectTimeout);
        if (this.destroyTimeout) clearTimeout(this.destroyTimeout);
        
        // Apply effect if not already applied
        if (!this.effectApplied) {
            this.applyGENAReduction();
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
                console.error('Error in Sandwirbel callback:', error);
            }
        }
    }
}

/**
 * Create a new Sandwirbel attack
 * @param {Object} attacker - The attacker
 * @param {Object} target - The target direction
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits
 * @param {Function} callback - Function to call when done
 * @param {Array} activeProjectiles - Reference to active projectiles
 * @returns {SandwirbelAttack} - The created attack
 */
export function createSandwirbel(attacker, target, attack, isHit, callback, activeProjectiles) {
    return new SandwirbelAttack(attacker, target, attack, isHit, callback, activeProjectiles);
}

/**
 * Add CSS styles for Sandwirbel
 */
export function addSandwirbelStyles() {
    // Check if styles already exist
    if (document.getElementById('sandwirbel-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'sandwirbel-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Sandwirbel particle styling */
        .sandwirbel-particle {
            position: absolute;
            background-color: rgba(210, 180, 140, 0.7);
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(210, 180, 140, 0.5);
            pointer-events: none;
        }
        
        /* Floating animation for particles */
        @keyframes sandwirbelFloat {
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
        
        /* Sand flash effect for affected Pokemon */
        @keyframes sandFlash {
            0% { filter: brightness(1) saturate(1); }
            50% { filter: brightness(1.2) saturate(0.8) drop-shadow(0 0 5px rgba(210, 180, 140, 0.9)); }
            100% { filter: brightness(1) saturate(1); }
        }
        
        /* Class to apply the sand flash effect */
        .sand-flash-effect {
            animation: sandFlash 0.5s ease-in-out forwards;
        }
        
        /* Style for Sandwirbel cone */
        .attack-cone.sandwirbel-cone {
            background-color: rgba(210, 180, 140, 0.25);
            border: 1px solid rgba(210, 180, 140, 0.5);
            animation: sandwirbel-cone-pulse 1.5s infinite;
        }
        
        @keyframes sandwirbel-cone-pulse {
            0% { 
                background-color: rgba(210, 180, 140, 0.2);
                border-color: rgba(210, 180, 140, 0.4);
            }
            50% { 
                background-color: rgba(210, 180, 140, 0.3);
                border-color: rgba(210, 180, 140, 0.6);
            }
            100% { 
                background-color: rgba(210, 180, 140, 0.2);
                border-color: rgba(210, 180, 140, 0.4);
            }
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

/**
 * Check if target is valid for Sandwirbel
 * @param {Object} target - Target to check
 * @returns {boolean} - Whether target is valid
 */
export function isValidSandwirbelTarget(target) {
    // If target doesn't exist, it's not valid
    if (!target || !target.character) return false;
    
    const pokemon = target.character;
    
    // Check for Flying type immunity
    if (pokemon.pokemonTypes) {
        const types = pokemon.pokemonTypes.map(type => 
            typeof type === 'string' ? type.toLowerCase() : ""
        );
        
        // Flying types are immune
        if (types.includes('flying') || types.includes('fliegend')) {
            return false;
        }
    }

    // Check for flying terrain attribute
    if (pokemon.terrainAttributes && pokemon.terrainAttributes.fliegend) {
        // Directly check the fliegend property
        return false;
    }
    
    // Check if GENA is already at minimum (2)
    const currentGena = getCurrentStatValue(pokemon, 'gena');
    if (currentGena <= 2) {
        return false;
    }
    
    // Check for abilities that grant immunity
    const immuneAbilities = [
        'adlerauge', 'keen eye',
        'neutraltorso', 'clear body',
        'pulverrauch', 'white smoke',
        'metallprotektor', 'full metal body',
        'spiegelrüstung', 'mirror armor'
    ];
    
    if (hasPokemonAbility(pokemon, immuneAbilities)) {
        return false;
    }
    
    return true;
}
