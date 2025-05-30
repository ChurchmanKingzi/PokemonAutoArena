/**
 * Centralized cone attack hit detection and effect application system
 * Handles damage calculation, status effects, and visual feedback for all cone-based attacks
 */

import { logBattleEvent } from './battleLog.js';
import { hasStatusEffect, hasPokemonAbility } from './statusEffects.js';
import { getCurrentStatValue } from './statChanges.js';
import { updateInitiativeHP } from './initiativeDisplay.js';
import { findCharactersInCone } from './attackCone.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { applyRasierblattEffects } from './Attacken/rasierblatt.js';
import { applyGiftpuderEffects } from './Attacken/giftpuder.js';
import { applySchlafpuderEffects } from './Attacken/schlafpuder.js';
import { applyStachelsporeEffects } from './Attacken/stachelspore.js';
import { applySandwirbelEffects } from './Attacken/sandwirbel.js';
import { applyFadenschussEffects } from './Attacken/fadenschuss.js';
import { applyEissturmEffects } from './Attacken/eissturm.js';
import { applyAromakurEffects } from './Attacken/aromakur.js';
import { focusOnConeAttack } from './cameraSystem.js';

/**
 * Multiplier for cone attack range - easily adjustable
 * 1.0 = no change, 1.1 = 10% further, etc.
 */
const CONE_RANGE_MULTIPLIER = 1.1; // Extends cone range by 10%

/**
 * Multiplier for cone attack angle - easily adjustable
 * 1.0 = no change, 1.1 = 10% wider, etc.
 */
const CONE_ANGLE_MULTIPLIER = 1.1; // Widens cone angle by 10%

/**
 * Apply cone attack effects to all valid targets in the cone
 * @param {Object} attacker - The attacking Pokemon
 * @param {Object} effectiveTarget - The effective target direction (accounting for misses)
 * @param {Object} attack - The attack data
 * @param {number} range - Attack range
 * @param {number} coneAngle - Cone angle in degrees
 * @param {boolean} isHit - Whether the attack was intended to hit
 * @returns {Object} - Results of the cone attack
 */
export function applyConeAttackEffects(attacker, effectiveTarget, attack, range, coneAngle, isHit = true) {
    // If the attack missed entirely, don't apply any effects
    if (!isHit) {
        return {
            targetsHit: 0,
            effects: [],
            messages: []
        };
    }
    
    // Calculate size-based adjustments to match visual cone
    const sizeCategory = calculateSizeCategory(attacker.character) || 1;
    const rangeIncrease = Math.max(0, sizeCategory - 1);  // Size 1: +0, Size 2: +1, Size 3: +2, etc.
    const angleIncrease = (sizeCategory - 1) * 10;  // Size 1: +0°, Size 2: +10°, Size 3: +20°, etc.
    
    // Adjust range and cone angle to match visual cone
    const adjustedRange = Math.round((range + rangeIncrease) * CONE_RANGE_MULTIPLIER);
    const adjustedConeAngle = Math.round((coneAngle + angleIncrease) * CONE_ANGLE_MULTIPLIER);
    
    // Find all valid targets based on attack type using adjusted dimensions
    const validTargets = findValidTargetsForAttack(attacker, effectiveTarget, attack, adjustedRange, adjustedConeAngle);
    
    const results = {
        targetsHit: validTargets.length,
        effects: [],
        messages: []
    };
    
    // Apply effects based on attack type
    const attackName = attack.weaponName.toLowerCase();
    
    switch (attackName) {
        case 'rasierblatt':
            applyRasierblattEffects(attacker, validTargets, attack, results);
            break;
        case 'eissturm':
            applyEissturmEffects(attacker, validTargets, attack, results);
            break;
        case 'giftpuder':
            applyGiftpuderEffects(attacker, validTargets, attack, results);
            break;
        case 'schlafpuder':
            applySchlafpuderEffects(attacker, validTargets, attack, results);
            break;
        case 'stachelspore':
            applyStachelsporeEffects(attacker, validTargets, attack, results);
            break;
        case 'sandwirbel':
            applySandwirbelEffects(attacker, validTargets, attack, results);
            break;
        case 'fadenschuss':
            applyFadenschussEffects(attacker, validTargets, attack, results);
            break;
        case 'aromakur':
            applyAromakurEffects(attacker, validTargets, attack, results);
            break;
    }
    
    // Log results
    results.messages.forEach(message => {
        logBattleEvent(message);
    });
    
    // Update displays
    updateInitiativeHP();
    
    return results;
}

/**
 * Find valid targets for a specific cone attack
 * @param {Object} attacker - The attacking Pokemon
 * @param {Object} effectiveTarget - The effective target direction
 * @param {Object} attack - The attack data
 * @param {number} range - Attack range
 * @param {number} coneAngle - Cone angle in degrees
 * @returns {Array} - Array of valid target objects
 */
function findValidTargetsForAttack(attacker, effectiveTarget, attack, range, coneAngle) {
    // Get all characters in the cone
    const charactersInCone = findCharactersInCone(attacker, effectiveTarget, range, coneAngle);
    
    // Filter based on attack-specific rules
    const attackName = attack.weaponName.toLowerCase();
    
    return charactersInCone.filter(target => {
        // Always skip the attacker
        if (target.character === attacker.character) return false;
        
        // Skip defeated Pokemon
        if (target.character.currentKP <= 0) return false;
        
        // Apply attack-specific filters
        switch (attackName) {
            case 'giftpuder':
                return isValidGiftpuderTarget(target);
            case 'schlafpuder':
                return isValidSchlafpuderTarget(target);
            case 'stachelspore':
                return isValidStachelsporeTarget(target);
            case 'sandwirbel':
                return isValidSandwirbelTarget(target);
            case 'fadenschuss':
                return isValidFadenschussTarget(target);
            default:
                // For damage-dealing attacks, no special filtering needed
                return true;
        }
    });
}

/**
 * Apply visual hit effect to a target
 * @param {string} targetId - Target character ID
 * @param {string} effectType - Type of visual effect
 */
export function applyVisualHitEffect(targetId, effectType) {
    const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${targetId}"]`);
    
    const effectClass = {
        'rasierblatt': 'rasierblatt-hit-effect',
        'eissturm': 'eissturm-hit-effect',
        'poison': 'poison-flash-effect',
        'sleep': 'sleep-flash-effect',
        'paralysis': 'paralysis-flash-effect',
        'sand': 'sand-flash-effect',
        'web': 'web-flash-effect'
    }[effectType] || 'generic-hit-effect';
    
    characterEls.forEach(charEl => {
        charEl.classList.add(effectClass);
        setTimeout(() => {
            charEl.classList.remove(effectClass);
        }, 500);
    });
}

// Validation functions for different attack types
function isValidGiftpuderTarget(target) {
    if (hasStatusEffect(target.character, 'poisoned') || hasStatusEffect(target.character, 'badly-poisoned')) {
        return false;
    }
    
    const pokemon = target.character;
    if (pokemon.pokemonTypes) {
        const types = pokemon.pokemonTypes.map(type => typeof type === 'string' ? type.toLowerCase() : "");
        if (types.includes('poison') || types.includes('gift') || types.includes('steel') || 
            types.includes('stahl') || types.includes('grass') || types.includes('pflanze')) {
            return false;
        }
    }
    
    return !hasPokemonAbility(pokemon, ['immunität', 'immunity']);
}

function isValidSchlafpuderTarget(target) {
    if (hasStatusEffect(target.character, 'asleep')) {
        return false;
    }
    
    const pokemon = target.character;
    if (pokemon.pokemonTypes) {
        const types = pokemon.pokemonTypes.map(type => typeof type === 'string' ? type.toLowerCase() : "");
        if (types.includes('grass') || types.includes('pflanze')) {
            return false;
        }
    }
    
    return !hasPokemonAbility(pokemon, ['insomnia', 'vital spirit', 'munterkeit']);
}

function isValidStachelsporeTarget(target) {
    if (hasStatusEffect(target.character, 'paralyzed')) {
        return false;
    }
    
    const pokemon = target.character;
    if (pokemon.pokemonTypes) {
        const types = pokemon.pokemonTypes.map(type => typeof type === 'string' ? type.toLowerCase() : "");
        if (types.includes('grass') || types.includes('pflanze')) {
            return false;
        }
    }
    
    return !hasPokemonAbility(pokemon, ['flexibilität', 'limber']);
}

function isValidSandwirbelTarget(target) {
    const pokemon = target.character;
    
    // Check for Flying type immunity
    if (pokemon.pokemonTypes) {
        const types = pokemon.pokemonTypes.map(type => typeof type === 'string' ? type.toLowerCase() : "");
        if (types.includes('flying') || types.includes('fliegend')) {
            return false;
        }
    }
    
    // Check for flying terrain attribute
    if (pokemon.terrainAttributes && pokemon.terrainAttributes.fliegend) {
        return false;
    }
    
    // Check if GENA is already at minimum
    const currentGena = getCurrentStatValue(pokemon, 'gena');
    if (currentGena <= 2) {
        return false;
    }
    
    return !hasPokemonAbility(pokemon, ['adlerauge', 'keen eye', 'neutraltorso', 'clear body', 'pulverrauch', 'white smoke']);
}

function isValidFadenschussTarget(target) {
    const pokemon = target.character;
    
    // Check if initiative is already at minimum (-6 stages)
    // This would need to be implemented based on your stat change system
    const currentStage = getCurrentStatValue(pokemon, 'init') || 0;
    if (currentStage <= -6) {
        return false;
    }
    
    return true;
}

/**
 * Check if an attack is a cone-based attack
 * @param {Object} attack - Attack to check
 * @returns {boolean} - Whether the attack is cone-based
 */
export function isConeAttack(attack) {
    return attack && attack.cone !== undefined;
}

/**
 * Get list of all cone attack names
 * @returns {Array} - Array of cone attack names
 */
export function getConeAttackNames() {
    return [
        'rasierblatt', 'eissturm', 'giftpuder', 'schlafpuder', 
        'stachelspore', 'sandwirbel', 'fadenschuss', 'aromakur'
    ];
}

/**
 * Generic ConeAttack class for cone attacks that don't have specialized visual classes
 */
export class ConeAttack {
    constructor(attacker, target, attack, isHit, callback, activeProjectilesArray) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.isHit = isHit;
        this.callback = callback;
        this.activeProjectiles = activeProjectilesArray;
        this.removed = false;
        
        this.range = attack.range || 3;
        this.coneAngle = attack.cone || 45;
        this.coneId = `generic-cone-${this.id}`;
        
        this.creationTime = Date.now();
        this.effectApplied = false;
        
        // Handle miss case
        if (!this.isHit) {
            import('./damageNumbers.js').then(module => {
                module.createMissMessage(this.attacker);
            });
            this.effectiveTarget = this.calculateMissDirection();
        } else {
            this.effectiveTarget = this.target;
        }
        
        // Create visual elements
        this.createVisualElements();
        
        this.followWithCamera();

        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Set timeouts
        this.effectTimeout = setTimeout(() => this.applyCentralizedEffects(), 1200);
        this.destroyTimeout = setTimeout(() => this.destroy(), 1500);
    }
    
    followWithCamera() {
        if (this.isHit) {
            import('./cameraSystem.js').then(module => {
                module.focusOnConeAttack(
                    this.attacker, 
                    this.effectiveTarget, 
                    this.range, 
                    this.coneAngle, 
                    700
                ).catch(error => {
                    console.warn('Could not follow cone attack with camera:', error);
                });
            });
        }
    }

    calculateMissDirection() {
        const dx = this.target.x - this.attacker.x;
        const dy = this.target.y - this.attacker.y;
        const originalDistance = Math.sqrt(dx * dx + dy * dy);
        const originalAngle = Math.atan2(dy, dx);
        const coneHalfAngle = (this.coneAngle / 2) * (Math.PI / 180);
        
        let offsetAngle;
        if (Math.random() < 0.5) {
            offsetAngle = coneHalfAngle + (Math.random() * Math.PI / 4);
        } else {
            offsetAngle = -coneHalfAngle - (Math.random() * Math.PI / 4);
        }
        
        const newAngle = originalAngle + offsetAngle;
        const newX = this.attacker.x + Math.cos(newAngle) * originalDistance;
        const newY = this.attacker.y + Math.sin(newAngle) * originalDistance;
        
        return { x: newX, y: newY };
    }
    
    createVisualElements() {
        import('./attackCone.js').then(module => {
            this.coneElement = module.createConeIndicator(
                this.attacker, 
                this.effectiveTarget, 
                this.range, 
                this.coneAngle, 
                'default',
                this.coneId
            );
        });
    }
    
    applyCentralizedEffects() {
        if (this.effectApplied || this.removed) return;
        this.effectApplied = true;
        
        // Calculate size-based adjustments to match visual cone
        const sizeCategory = calculateSizeCategory(this.attacker.character) || 1;
        const rangeIncrease = Math.max(0, sizeCategory - 1);
        const angleIncrease = (sizeCategory - 1) * 10;
        
        // Adjust range and cone angle to match visual cone
        const adjustedRange = Math.round((this.range + rangeIncrease) * CONE_RANGE_MULTIPLIER);
        const adjustedConeAngle = Math.round((this.coneAngle + angleIncrease) * CONE_ANGLE_MULTIPLIER);
        
        const results = applyConeAttackEffects(
            this.attacker, 
            this.effectiveTarget, 
            this.attack, 
            adjustedRange,  // Use adjusted range
            adjustedConeAngle,  // Use adjusted angle
            this.isHit
        );
    }
    
    update(deltaTime) {
        if (this.removed) return false;
        
        const elapsedTime = Date.now() - this.creationTime;
        if (elapsedTime >= 1200 && !this.effectApplied) {
            this.applyCentralizedEffects();
        }
        
        if (elapsedTime >= 1500) {
            this.destroy();
            return false;
        }
        
        return true;
    }
    
    destroy() {
        if (this.removed) return;
        this.removed = true;
        
        if (this.effectTimeout) clearTimeout(this.effectTimeout);
        if (this.destroyTimeout) clearTimeout(this.destroyTimeout);
        
        if (!this.effectApplied) {
            this.applyCentralizedEffects();
        }
        
        import('./attackCone.js').then(module => {
            module.removeConeIndicator(this.coneId);
        });
        
        const index = this.activeProjectiles.findIndex(p => p.id === this.id);
        if (index !== -1) {
            this.activeProjectiles.splice(index, 1);
        }
        
        if (this.callback) {
            try {
                this.callback();
            } catch (error) {
                console.error('Error in cone attack callback:', error);
            }
        }
    }
}