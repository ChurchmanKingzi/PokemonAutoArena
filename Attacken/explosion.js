/**
 * Explosion attack implementation
 * Creates a 360° area attack that defeats the user and damages all targets in range
 */

import { TILE_SIZE } from '../config.js';
import { logBattleEvent } from '../battleLog.js';
import { checkCriticalHit, getModifiedGena } from '../attackSystem.js';
import { createDamageNumber, createVolltrefferEffect } from '../damageNumbers.js';
import { updatePokemonHPBar } from '../pokemonOverlay.js';
import { removeDefeatedCharacter, getCharacterPositions } from '../characterPositions.js';
import { rollAttackDice } from '../diceRoller.js';
import { attemptDodge } from '../dodgeSystem.js';
import { animateDodge } from '../animationManager.js';
import { doesPokemonOccupyTile, getOccupiedTiles } from '../pokemonDistanceCalculator.js';
import { calculateSizeCategory } from '../pokemonSizeCalculator.js';
import { GRID_SIZE } from '../config.js';
import { getAvailableDodgePositions } from '../dodgeSystem.js';
import { createConeIndicator, removeConeIndicator, findCharactersInCone} from '../attackCone.js';
import { applyExplosionDamage, calculateAttackDamage, applyExplosionSelfDamage } from '../damage.js';
import { handleCharacterDefeat } from '../defeatHandler.js';
import { notifyExplosionCompleted, notifyExplosionStarted } from '../turnSystem.js';
import { focusOnCharacter } from '../cameraSystem.js';


// Constants
const EXPLOSION_DURATION = 2050; // 3 seconds total duration
const DODGE_PHASE_DURATION = 800; // 0.8 seconds for dodge phase
const ANIMATION_DURATION = 1500; // 1.5 seconds for explosion animation
const DAMAGE_APPLY_TIME = 2000; // Apply damage 2.0 seconds in

addEnhancedExplosionStyles();

/**
 * ExplosionAttack class for handling the explosion attack
 */
export class ExplosionAttack {
    /**
     * Create a new Explosion attack
     * @param {Object} attacker - The Pokémon using the attack
     * @param {Object} target - The target (not used for explosion, but kept for consistency)
     * @param {Object} attack - The attack data
     * @param {boolean} isHit - Whether the attack hits (explosion always hits)
     * @param {Function} callback - Function to call when done
     * @param {Array} activeProjectilesArray - Reference to active projectiles
     */
    constructor(attacker, target, attack, isHit, callback, activeProjectilesArray) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.isHit = true; // Explosion always hits
        this.callback = callback;
        this.activeProjectiles = activeProjectilesArray;
        this.removed = false;
        
        // Explosion specific properties
        this.range = attack.range || 6;
        this.coneAngle = 360; // Always full circle
        
        // FIXED: More generous hitbox calculation for larger Pokemon
        // Instead of 10% increase, use 25% increase with minimum of +1
        this.hitboxRange = Math.max(this.range + 1, Math.ceil(this.range * 1.25));
        
        this.coneElement = null;
        this.explosionElement = null;
        this.coneId = `explosion-cone-${this.id}`;
        this.damage = attack.damage || 0;
        
        // Timing properties
        this.creationTime = Date.now();
        this.dodgePhaseComplete = false;
        this.damageApplied = false;
        this.userDefeated = false;
        
        // Track targets and their dodge results
        this.initialTargets = [];
        this.finalTargets = [];
        this.dodgeResults = new Map();
        
        // ENHANCED: Register with the turn system immediately
        this.explosionId = notifyExplosionStarted();
        console.log(`Explosion ${this.id} started with tracking ID: ${this.explosionId}`);

        // Create the initial cone and start the process
        this.startExplosion();
        
        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Set up the explosion timeline
        this.setupExplosionTimeline();
    }
    
    /**
     * Start the explosion process
     */
    startExplosion() {                
        // Find all initial targets in range
        this.findInitialTargets();
        
        // Start dodge phase immediately
        this.processDodgePhase();
    }
    
    /**
     * Find all targets initially in range
     */
    findInitialTargets() {
        // Find all characters in the explosion range (360° circle)
        const charactersInRange = findCharactersInCone(
            this.attacker, 
            { x: this.attacker.x + 1, y: this.attacker.y },
            this.hitboxRange,
            360
        );

        // Filter out the attacker itself and defeated Pokemon
        this.initialTargets = charactersInRange.filter(target => {
            return target.character !== this.attacker.character && 
                   target.character.currentKP > 0;
        });
    }
    
    /**
     * Process the dodge phase for all targets
     */
    async processDodgePhase() {
        if (this.initialTargets.length === 0) {
            this.dodgePhaseComplete = true;
            this.finalTargets = [];
            return;
        }
                
        // Process dodge attempts for each target
        const dodgePromises = this.initialTargets.map(target => this.processSingleDodge(target));
        
        // Wait for all dodge attempts to complete
        await Promise.all(dodgePromises);
        
        this.finalTargets = [...this.initialTargets];

        
        this.dodgePhaseComplete = true;
        
        if (this.finalTargets.length < this.initialTargets.length) {
            const escapedCount = this.initialTargets.length - this.finalTargets.length;
        }
    }
    
    /**
     * Process dodge attempt for a single target
     * @param {Object} target - Target to process dodge for
     * @returns {Promise} - Promise that resolves when dodge is complete
     */
    async processSingleDodge(target) {
        return new Promise((resolve) => {
            // Create a mock attack roll (explosion always hits, but we need this for dodge calculation)
            const genaValue = getModifiedGena(this.attacker, this.attack);
            const mockAttackRoll = rollAttackDice(genaValue);
            
            // Attempt dodge
            const dodgeResult = attemptDodge(this.attacker, target, mockAttackRoll, this.attack);
            
            this.dodgeResults.set(target.id, dodgeResult);
            
            if (dodgeResult.success) {
                // Calculate escape position (move away from explosion center)
                const escapePosition = this.calculateEscapePosition(target);
                
                if (escapePosition) {                    
                    // Animate the dodge movement
                    animateDodge(target.id, escapePosition, () => {
                        resolve();
                    });
                } else {
                    // Couldn't find escape position
                    dodgeResult.success = false; // Override success
                    this.dodgeResults.set(target.id, dodgeResult);
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }
    
    /**
     * Calculate escape position for a target trying to dodge
     * @param {Object} target - Target trying to escape
     * @returns {Object|null} - Escape position or null if none available
     */
    calculateEscapePosition(target) {
        // Get the target's position and size
        const targetPos = target.position || target;
        const targetSize = calculateSizeCategory(target.character) || 1;
        
        // First, try to use standard dodge positions (1-2 tiles away)
        const standardDodgePositions = getAvailableDodgePositions(
            targetPos,
            { x: this.attacker.x, y: this.attacker.y },
            true // treat explosion as ranged attack
        );
        
        // Filter positions that are outside explosion range AND can fit the Pokemon
        const safePositions = standardDodgePositions.filter(pos => {
            // Check if position is outside explosion range
            const distanceFromExplosion = Math.sqrt(
                (pos.x - this.attacker.x) ** 2 + (pos.y - this.attacker.y) ** 2
            );
            
            if (distanceFromExplosion <= this.range) {
                return false; // Still in explosion range
            }
            
            // Check if the Pokemon can fit at this position
            // For multi-tile Pokemon, we need to check all tiles they would occupy
            if (targetSize > 1) {
                const occupiedTiles = getOccupiedTiles({ ...pos, character: target.character });
                
                // Check each tile the Pokemon would occupy
                for (const tile of occupiedTiles) {
                    // Check bounds
                    if (tile.x < 0 || tile.x >= GRID_SIZE || tile.y < 0 || tile.y >= GRID_SIZE) {
                        return false; // Out of bounds
                    }
                    
                    // Check occupation (excluding the current Pokemon's position)
                    const positions = getCharacterPositions();
                    for (const charId in positions) {
                        const otherPos = positions[charId];
                        if (otherPos === targetPos) continue; // Skip self
                        
                        if (doesPokemonOccupyTile(otherPos, tile.x, tile.y)) {
                            return false; // Tile is occupied
                        }
                    }
                }
            }
            
            return true; // Position is safe and valid
        });
        
        // If we found safe positions, return a random one
        if (safePositions.length > 0) {
            return safePositions[Math.floor(Math.random() * safePositions.length)];
        }
        
        // If no safe positions with standard movement, try positions closer but still valid
        // This represents Pokemon that try to dodge but can't get fully out of range
        const partialEscapePositions = standardDodgePositions.filter(pos => {
            // Check if the Pokemon can fit at this position
            if (targetSize > 1) {
                const occupiedTiles = getOccupiedTiles({ ...pos, character: target.character });
                
                for (const tile of occupiedTiles) {
                    if (tile.x < 0 || tile.x >= GRID_SIZE || tile.y < 0 || tile.y >= GRID_SIZE) {
                        return false;
                    }
                    
                    const positions = getCharacterPositions();
                    for (const charId in positions) {
                        const otherPos = positions[charId];
                        if (otherPos === targetPos) continue;
                        
                        if (doesPokemonOccupyTile(otherPos, tile.x, tile.y)) {
                            return false;
                        }
                    }
                }
            }
            
            // At least try to move away from the explosion center
            const currentDistance = Math.sqrt(
                (targetPos.x - this.attacker.x) ** 2 + (targetPos.y - this.attacker.y) ** 2
            );
            const newDistance = Math.sqrt(
                (pos.x - this.attacker.x) ** 2 + (pos.y - this.attacker.y) ** 2
            );
            
            return newDistance > currentDistance; // Must be moving away
        });
        
        if (partialEscapePositions.length > 0) {
            return partialEscapePositions[Math.floor(Math.random() * partialEscapePositions.length)];
        }
        
        // No valid escape position
        return null;
    }
    
    /**
     * Check if a position is valid for escaping
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - Whether position is valid
     */
    isValidEscapePosition(x, y) {        
        // Check bounds
        if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) {
            return false;
        }
        
        // Check if tile is occupied
        try {
            const { isTileOccupied } = require('../characterPositions.js');
            if (isTileOccupied(x, y)) {
                return false;
            }
        } catch (error) {
            // Fallback if import fails
            console.warn('Could not check tile occupation for escape position');
        }
        
        // Check if position is outside explosion range
        const distanceFromExplosion = Math.sqrt(
            (x - this.attacker.x) ** 2 + (y - this.attacker.y) ** 2
        );
        
        return distanceFromExplosion > this.range;
    }
    
    /**
     * Setup the explosion timeline
     */
    setupExplosionTimeline() {
        // Start explosion animation after dodge phase
        this.animationTimeout = setTimeout(() => {
            if (!this.removed) {
                this.startExplosionAnimation();
            }
        }, DODGE_PHASE_DURATION);
        
        // Apply damage near the end
        this.damageTimeout = setTimeout(() => {
            if (!this.removed) {
                this.applyExplosionDamage();
            }
        }, DAMAGE_APPLY_TIME);
        
        // Defeat user and cleanup
        this.destroyTimeout = setTimeout(() => {
            if (!this.removed) {
                this.defeatUserAndCleanup();
            }
        }, EXPLOSION_DURATION);
        
        // SAFETY TIMEOUT: Force cleanup if explosion takes too long
        this.safetyTimeout = setTimeout(() => {
            if (!this.removed) {
                console.warn(`Explosion ${this.id} safety timeout triggered - forcing cleanup`);
                this.destroy();
            }
        }, EXPLOSION_DURATION + 2000); // 2 seconds after normal duration
    }
    
    /**
     * Start the explosion animation
     */
    startExplosionAnimation() {
        if (this.removed) return;
        
        logBattleEvent(`${this.attacker.character.name} explodiert!`);
        
        // Get the Pokemon sprite element for the red flash
        const pokemonSprite = this.getPokemonSpriteElement();
        
        // Focus camera on the exploding Pokemon
        const attackerId = this.findAttackerId();
        if (attackerId) {
            // Focus with a very short duration for quick response
            focusOnCharacter(attackerId, 300);
        }
        
        // Start the enhanced explosion sequence
        this.createEnhancedExplosionSequence(pokemonSprite);
    }
    
    /**
     * Create the explosion animation
     */
    createExplosionAnimation() {
        const pokemonSprite = this.getPokemonSpriteElement();
        this.createEnhancedExplosionSequence(pokemonSprite);
    }

    getPokemonSpriteElement() {
        // Try to find the Pokemon sprite element
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return null;
        
        // Look for sprite by character ID or position
        const characterPositions = getCharacterPositions();
        const attackerId = Object.keys(characterPositions).find(id => 
            characterPositions[id].character === this.attacker.character);
        
        if (attackerId) {
            return document.querySelector(`[data-character-id="${attackerId}"]`);
        }
        
        return null;
    }

    createEnhancedExplosionSequence(pokemonSprite) {
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        // Get Pokemon size category for scaling
        const sizeCategory = pokemonSprite ? 
            (parseInt(pokemonSprite.dataset.sizeCategory) || 1) : 1;
        
        // Calculate explosion center and size
        const centerX = this.attacker.x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = this.attacker.y * TILE_SIZE + TILE_SIZE / 2;
        
        // Base explosion size scales with both range and Pokemon size
        const baseSize = Math.max(TILE_SIZE * 2, ((this.range + 0.5) * 2 * TILE_SIZE));
        const explosionSize = baseSize * Math.max(1, sizeCategory * 0.8);
        
        // Initialize cleanup array
        if (!this.explosionElements) this.explosionElements = [];
        
        // Stage 1: Pokemon Red Flash (100ms)
        this.createPokemonFlash(pokemonSprite);
        
        // Stage 2: Expanding Fireball (200ms delay, 800ms duration)
        setTimeout(() => {
            this.createExpandingFireball(battlefield, centerX, centerY, explosionSize, sizeCategory);
        }, 200);
        
        // Stage 3: Shockwave (400ms delay, 1000ms duration) 
        setTimeout(() => {
            this.createShockwave(battlefield, centerX, centerY, explosionSize * 1.5, sizeCategory);
        }, 400);
        
        // Stage 4: Fire Particles (300ms delay, 1500ms duration)
        setTimeout(() => {
            this.createFireParticles(battlefield, centerX, centerY, explosionSize, sizeCategory);
        }, 300);
        
        // Stage 5: Steam/Smoke (600ms delay, 2000ms duration)
        setTimeout(() => {
            this.createSteamEffect(battlefield, centerX, centerY, explosionSize * 0.8, sizeCategory);
        }, 600);
    }

    createPokemonFlash(pokemonSprite) {
        if (!pokemonSprite) return;
        
        // Add flash class
        pokemonSprite.classList.add('explosion-flash');
        
        // Remove flash class after animation
        setTimeout(() => {
            if (pokemonSprite) {
                pokemonSprite.classList.remove('explosion-flash');
            }
        }, 200);
    }

    createExpandingFireball(container, centerX, centerY, maxSize, sizeCategory) {
        // Main fireball container
        const fireballContainer = document.createElement('div');
        fireballContainer.className = 'explosion-fireball-container';
        fireballContainer.dataset.attackId = this.id;
        
        // Position container
        fireballContainer.style.position = 'absolute';
        fireballContainer.style.left = `${centerX}px`;
        fireballContainer.style.top = `${centerY}px`;
        fireballContainer.style.width = '0px';
        fireballContainer.style.height = '0px';
        fireballContainer.style.zIndex = '100';
        fireballContainer.style.pointerEvents = 'none';
        fireballContainer.style.transform = 'translate(-50%, -50%)';
        
        // Create multiple fireball layers for depth
        for (let i = 0; i < 3; i++) {
            const fireball = document.createElement('div');
            fireball.className = `explosion-fireball explosion-fireball-${i + 1}`;
            fireball.style.position = 'absolute';
            fireball.style.width = '100%';
            fireball.style.height = '100%';
            fireball.style.borderRadius = '50%';
            fireball.style.left = '50%';
            fireball.style.top = '50%';
            fireball.style.transform = 'translate(-50%, -50%)';
            fireball.style.opacity = 0.3;
            
            // Layer-specific styling
            if (i === 0) {
                // Core - white hot center
                fireball.style.background = 'radial-gradient(circle, #ffffff 0%, #ffff00 30%, #ff8c00 70%, #ff4500 100%)';
                fireball.style.boxShadow = '0 0 20px #ffffff, 0 0 40px #ffff00, 0 0 60px #ff4500';
            } else if (i === 1) {
                // Middle - orange flame
                fireball.style.background = 'radial-gradient(circle, #ff8c00 0%, #ff4500 50%, #dc143c 100%)';
                fireball.style.boxShadow = '0 0 30px #ff4500, 0 0 50px #dc143c';
                fireball.style.animationDelay = '0.1s';
            } else {
                // Outer - red/dark flame
                fireball.style.background = 'radial-gradient(circle, #ff4500 0%, #dc143c 50%, #8b0000 100%)';
                fireball.style.boxShadow = '0 0 40px #dc143c, 0 0 60px #8b0000';
                fireball.style.animationDelay = '0.2s';
            }
            
            fireballContainer.appendChild(fireball);
        }
        
        container.appendChild(fireballContainer);
        
        // Animate expansion
        const startSize = Math.max(10, TILE_SIZE * 0.3 * sizeCategory);
        const endSize = maxSize;
        
        // Set CSS custom properties for animation
        fireballContainer.style.setProperty('--start-size', `${startSize}px`);
        fireballContainer.style.setProperty('--end-size', `${endSize}px`);
        
        // Trigger animation
        requestAnimationFrame(() => {
            fireballContainer.classList.add('explosion-fireball-expand');
        });
        
        // Store reference for cleanup
        this.explosionElements.push(fireballContainer);
        
        // Auto-cleanup
        setTimeout(() => {
            if (fireballContainer.parentNode) {
                fireballContainer.remove();
            }
        }, 1000);
    }

    createShockwave(container, centerX, centerY, maxSize, sizeCategory) {
        const shockwaveContainer = document.createElement('div');
        shockwaveContainer.className = 'explosion-shockwave-container';
        shockwaveContainer.dataset.attackId = this.id;
        
        shockwaveContainer.style.position = 'absolute';
        shockwaveContainer.style.left = `${centerX}px`;
        shockwaveContainer.style.top = `${centerY}px`;
        shockwaveContainer.style.width = '0px';
        shockwaveContainer.style.height = '0px';
        shockwaveContainer.style.zIndex = '95';
        shockwaveContainer.style.pointerEvents = 'none';
        shockwaveContainer.style.transform = 'translate(-50%, -50%)';
        
        // Create multiple shockwave rings
        for (let i = 0; i < 4; i++) {
            const ring = document.createElement('div');
            ring.className = `explosion-shockwave-ring explosion-shockwave-ring-${i + 1}`;
            ring.style.position = 'absolute';
            ring.style.width = '100%';
            ring.style.height = '100%';
            ring.style.borderRadius = '50%';
            ring.style.left = '50%';
            ring.style.top = '50%';
            ring.style.transform = 'translate(-50%, -50%)';
            ring.style.border = `${Math.max(2, 4 - i)}px solid rgba(255, 255, 255, ${0.8 - i * 0.15})`;
            ring.style.animationDelay = `${i * 0.15}s`;
            
            shockwaveContainer.appendChild(ring);
        }
        
        container.appendChild(shockwaveContainer);
        
        // Set animation properties
        shockwaveContainer.style.setProperty('--max-size', `${maxSize}px`);
        
        // Trigger animation
        requestAnimationFrame(() => {
            shockwaveContainer.classList.add('explosion-shockwave-expand');
        });
        
        // Store reference for cleanup
        this.explosionElements.push(shockwaveContainer);
        
        // Auto-cleanup
        setTimeout(() => {
            if (shockwaveContainer.parentNode) {
                shockwaveContainer.remove();
            }
        }, 1500);
    }

    createFireParticles(container, centerX, centerY, baseSize, sizeCategory) {
        const particleCount = Math.min(50, 20 + sizeCategory * 8);
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-fire-particle';
            particle.dataset.attackId = this.id;
            
            // Random size and position
            const particleSize = Math.random() * Math.max(8, TILE_SIZE * 0.3) + Math.max(4, TILE_SIZE * 0.1);
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const distance = Math.random() * baseSize * 0.4 + baseSize * 0.1;
            const startX = centerX + Math.cos(angle) * distance * 0.3;
            const startY = centerY + Math.sin(angle) * distance * 0.3;
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;
            
            particle.style.position = 'absolute';
            particle.style.left = `${startX}px`;
            particle.style.top = `${startY}px`;
            particle.style.width = `${particleSize}px`;
            particle.style.height = `${particleSize}px`;
            particle.style.borderRadius = '50%';
            particle.style.zIndex = '98';
            particle.style.pointerEvents = 'none';
            particle.style.transform = 'translate(-50%, -50%)';
            
            // Random fire colors
            const colors = [
                'radial-gradient(circle, #ffff00, #ff8c00)',
                'radial-gradient(circle, #ff8c00, #ff4500)', 
                'radial-gradient(circle, #ff4500, #dc143c)',
                'radial-gradient(circle, #dc143c, #8b0000)'
            ];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.boxShadow = `0 0 ${particleSize}px rgba(255, 69, 0, 0.8)`;
            
            // Set custom properties for animation
            particle.style.setProperty('--end-x', `${endX}px`);
            particle.style.setProperty('--end-y', `${endY}px`);
            particle.style.setProperty('--duration', `${800 + Math.random() * 400}ms`);
            particle.style.animationDelay = `${Math.random() * 200}ms`;
            
            container.appendChild(particle);
            particles.push(particle);
        }
        
        // Trigger animation
        requestAnimationFrame(() => {
            particles.forEach(p => p.classList.add('explosion-fire-particle-animate'));
        });
        
        // Store references for cleanup
        this.explosionElements.push(...particles);
        
        // Auto-cleanup
        setTimeout(() => {
            particles.forEach(p => {
                if (p.parentNode) p.remove();
            });
        }, 2000);
    }

    createSteamEffect(container, centerX, centerY, baseSize, sizeCategory) {
        const steamCount = Math.min(12, 6 + sizeCategory * 2);
        const steamClouds = [];
        
        for (let i = 0; i < steamCount; i++) {
            const steam = document.createElement('div');
            steam.className = 'explosion-steam-cloud';
            steam.dataset.attackId = this.id;
            
            // Random position around center
            const angle = (Math.PI * 2 * i) / steamCount + (Math.random() - 0.5) * 0.3;
            const distance = Math.random() * baseSize * 0.3 + baseSize * 0.2;
            const startX = centerX + Math.cos(angle) * distance * 0.5;
            const startY = centerY + Math.sin(angle) * distance * 0.5;
            
            const steamSize = Math.random() * baseSize * 0.3 + baseSize * 0.2;
            
            steam.style.position = 'absolute';
            steam.style.left = `${startX}px`;
            steam.style.top = `${startY}px`;
            steam.style.width = `${steamSize}px`;
            steam.style.height = `${steamSize}px`;
            steam.style.borderRadius = '50%';
            steam.style.zIndex = '96';
            steam.style.pointerEvents = 'none';
            steam.style.transform = 'translate(-50%, -50%)';
            steam.style.background = `radial-gradient(circle, 
                rgba(200, 200, 200, 0.8) 0%, 
                rgba(150, 150, 150, 0.6) 50%, 
                rgba(100, 100, 100, 0.3) 100%)`;
            steam.style.filter = 'blur(2px)';
            steam.style.animationDelay = `${Math.random() * 400}ms`;
            
            container.appendChild(steam);
            steamClouds.push(steam);
        }
        
        // Trigger animation
        requestAnimationFrame(() => {
            steamClouds.forEach(s => s.classList.add('explosion-steam-animate'));
        });
        
        // Store references for cleanup
        this.explosionElements.push(...steamClouds);
        
        // Auto-cleanup
        setTimeout(() => {
            steamClouds.forEach(s => {
                if (s.parentNode) s.remove();
            });
        }, 2500);
    }
    
    /**
     * Apply damage to all valid targets in range
     */
    async applyExplosionDamage() {
        if (this.damageApplied || this.removed) return;
        this.damageApplied = true;
        
        console.log(`Explosion ${this.id} applying damage...`);
        
        // Re-check who's actually in range at the time of damage
        const charactersCurrentlyInRange = findCharactersInCone(
            this.attacker, 
            { x: this.attacker.x + 1, y: this.attacker.y },
            this.hitboxRange, // Use hitbox range for damage detection
            360
        );
        
        // Filter out the attacker and defeated Pokemon
        const actualTargets = charactersCurrentlyInRange.filter(target => {
            return target.character !== this.attacker.character && 
                target.character.currentKP > 0;
        });
        
        if (actualTargets.length === 0) {
            logBattleEvent("Die Explosion trifft keine Ziele!");
            return;
        }
        
        let totalDamage = 0;
        let targetsHit = 0;
        
        // Process each target in the explosion radius
        for (const target of actualTargets) {
            try {
                // Check for critical hit (explosion can crit but never misses)
                const genaValue = getModifiedGena(this.attacker, this.attack);
                const critRoll = rollAttackDice(genaValue);
                const isCritical = checkCriticalHit(this.attacker.character, this.attack, critRoll.netSuccesses);
                
                // Calculate damage using the centralized damage system
                const damageResult = calculateAttackDamage(this.attacker, target, this.attack, {
                    isCritical: isCritical
                });
                
                // Skip if no damage would be dealt
                if (damageResult.finalDamage <= 0 || damageResult.baseDamage === 0) {
                    // Even 0-damage attacks can have visual effects
                    this.applyExplosionHitEffect(target.id);
                    continue;
                }
                
                // Log critical hit if applicable
                if (isCritical) {
                    logBattleEvent(`Explosions-Volltreffer gegen ${target.character.name}!`);
                }
                
                // Apply damage using the centralized explosion damage system
                const applicationResult = await applyExplosionDamage(
                    this.attacker, 
                    target, 
                    this.attack, 
                    damageResult.finalDamage,
                    {
                        isCritical: isCritical,
                        attackerId: this.findAttackerId(),
                        targetId: target.id,
                        onDamageComplete: () => {
                            // Apply visual hit effect
                            this.applyExplosionHitEffect(target.id);
                        }
                    }
                );
                
                if (applicationResult.applied) {
                    totalDamage += applicationResult.damage;
                    targetsHit++;
                }
            } catch (error) {
                console.error(`Error applying explosion damage to ${target.character.name}:`, error);
                // Continue processing other targets even if one fails
            }
        }
        
        console.log(`Explosion ${this.id} damaged ${targetsHit} targets for total ${totalDamage} damage`);
                
        // Finally, defeat the user immediately
        await this.defeatAttackerFromExplosion();
    }

    /**
     * Helper method to find the attacker's ID
     */
    findAttackerId() {
        const characterPositions = getCharacterPositions();
        return Object.keys(characterPositions).find(id => 
            characterPositions[id].character === this.attacker.character);
    }

    /**
     * Defeat the attacker using centralized damage system
     */
    async defeatAttackerFromExplosion() {
        if (this.userDefeated || this.removed) return;
        
        console.log(`Explosion ${this.id} defeating attacker...`);
                
        // Find attacker ID
        const attackerId = this.findAttackerId();
        
        if (attackerId) {
            try {
                // Apply fatal damage to the attacker using centralized system
                await applyExplosionSelfDamage(
                    this.attacker, 
                    this.attack,
                    { attackerId: attackerId }
                );
                
                this.userDefeated = true;
                console.log(`Explosion ${this.id} successfully defeated attacker`);
            } catch (error) {
                console.error(`Error defeating attacker in explosion ${this.id}:`, error);
                // Force defeat as fallback
                this.attacker.character.currentKP = 0;
                this.userDefeated = true;
            }
        }
        
        // Clean up and finish after a brief delay
        setTimeout(() => {
            this.destroy();
        }, 500);
    }
    
    /**
     * Apply damage to a single target
     * @param {Object} target - Target to damage
     * @param {number} damage - Damage amount
     */
    async applyDamageToTarget(target, damage) {
        if (damage <= 0) return;
        
        // Show damage number
        createDamageNumber(damage, target.position, damage >= 8, 'explosion');
        
        // Apply damage
        const oldKP = parseInt(target.character.currentKP, 10);
        target.character.currentKP = Math.max(0, oldKP - damage);
        
        // Update HP bar
        updatePokemonHPBar(target.id, target.character);
        
        // Handle defeat with centralized handler
        if (target.character.currentKP <= 0) {            
            logBattleEvent(`${target.character.name} wurde durch die Explosion besiegt!`);
            
            // Use centralized defeat handler with explosion source info
            await handleCharacterDefeat(
                target.character,
                target.id,
                this.attacker.character,  // Explosion creator as attacker
                null,                     // No attacker ID for explosion
                { isExplosionDeath: true }
            );
        }
    }
    
    /**
     * Apply visual hit effect
     * @param {string} targetId - Target character ID
     */
    applyExplosionHitEffect(targetId) {
        const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${targetId}"]`);
        
        characterEls.forEach(charEl => {
            charEl.classList.add('explosion-hit-effect');
            setTimeout(() => {
                charEl.classList.remove('explosion-hit-effect');
            }, 500);
        });
    }
    
    /**
     * Defeat the user and cleanup
     */
    defeatUserAndCleanup() {
        if (this.userDefeated || this.removed) return;
        
        console.log(`Explosion ${this.id} cleanup phase...`);
        
        // Defeat the user immediately (ignoring any protective effects)
        this.attacker.character.currentKP = 0;
        
        // Find attacker ID for removal
        const characterPositions = getCharacterPositions();
        const attackerId = Object.keys(characterPositions).find(id => 
            characterPositions[id].character === this.attacker.character);
        
        if (attackerId) {
            updatePokemonHPBar(attackerId, this.attacker.character);
            logBattleEvent(`${this.attacker.character.name} wurde durch seine eigene Explosion besiegt!`);
            removeDefeatedCharacter(attackerId);
        }
        
        this.userDefeated = true;
        
        // Clean up and finish
        setTimeout(() => {
            this.destroy();
        }, 100);
    }
    
    /**
     * Update method called each frame
     * @param {number} deltaTime - Time since last update
     * @returns {boolean} - Whether to keep updating
     */
    update(deltaTime) {
        if (this.removed) return false;
        
        const elapsedTime = Date.now() - this.creationTime;
        
        // Check phases
        if (elapsedTime >= DAMAGE_APPLY_TIME && !this.damageApplied) {
            this.applyExplosionDamage().catch(error => {
                console.error(`Error in explosion ${this.id} damage application:`, error);
            });
        }
        
        if (elapsedTime >= EXPLOSION_DURATION) {
            if (!this.userDefeated) {
                this.defeatUserAndCleanup();
            } else {
                this.destroy();
            }
            return false;
        }
        
        return true;
    }
    
    /**
     * Destroy the attack and clean up
     */
    destroy() {
        if (this.removed) return;
        this.removed = true;
        
        console.log(`Explosion ${this.id} destroying...`);
        
        // Clear all timeouts
        if (this.animationTimeout) clearTimeout(this.animationTimeout);
        if (this.damageTimeout) clearTimeout(this.damageTimeout);
        if (this.destroyTimeout) clearTimeout(this.destroyTimeout);
        if (this.safetyTimeout) clearTimeout(this.safetyTimeout);
        
        // Ensure damage and user defeat happened
        if (!this.damageApplied) {
            console.log(`Explosion ${this.id} applying damage during cleanup...`);
            this.applyExplosionDamage().catch(error => {
                console.error(`Error applying damage during cleanup for explosion ${this.id}:`, error);
            });
        }
        if (!this.userDefeated) {
            console.log(`Explosion ${this.id} defeating user during cleanup...`);
            this.defeatUserAndCleanup();
        }
        
        // Remove visual elements
        removeConeIndicator(this.coneId);
        
        // Clean up enhanced explosion elements
        if (this.explosionElements) {
            this.explosionElements.forEach(element => {
                if (element && element.parentNode) {
                    element.remove();
                }
            });
            this.explosionElements = [];
        }
        
        // Remove old explosion element if it exists
        if (this.explosionElement && this.explosionElement.parentNode) {
            this.explosionElement.parentNode.removeChild(this.explosionElement);
        }
        
        // Remove from active projectiles
        const index = this.activeProjectiles.findIndex(p => p.id === this.id);
        if (index !== -1) {
            this.activeProjectiles.splice(index, 1);
        }
        
        // CRITICAL: Notify the turn system that this explosion is complete
        notifyExplosionCompleted(this.explosionId);
        console.log(`Explosion ${this.id} completed and notified turn system`);

        // Call callback
        if (this.callback) {
            try {
                this.callback();
            } catch (error) {
                console.error(`Error in Explosion ${this.id} callback:`, error);
            }
        }
    }
}

/**
 * Create a new Explosion attack
 * @param {Object} attacker - The attacker
 * @param {Object} target - The target (unused for explosion)
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits (always true for explosion)
 * @param {Function} callback - Function to call when done
 * @param {Array} activeProjectiles - Reference to active projectiles
 * @returns {ExplosionAttack} - The created attack
 */
export function createExplosion(attacker, target, attack, isHit, callback, activeProjectiles) {
    console.log(`Creating explosion for ${attacker.character.name}`);
    
    // Enhanced callback that ensures proper sequencing
    const enhancedCallback = () => {
        console.log(`Explosion callback triggered for ${attacker.character.name}`);
        
        // Small delay to ensure all visual effects are cleaned up
        setTimeout(() => {
            if (callback) {
                try {
                    callback();
                } catch (error) {
                    console.error('Error in explosion callback:', error);
                }
            }
        }, 100);
    };
    
    return new ExplosionAttack(attacker, target, attack, true, enhancedCallback, activeProjectiles);
}

/**
 * Check if Explosion should be randomly selected
 * @param {Object} character - Character to check
 * @returns {boolean} - Whether explosion should be selected
 */
export function shouldSelectExplosion(character) {
    if (!character.attacks || character.attacks.length === 0) {
        return false;
    }
    
    // Count non-Verzweifler attacks
    const nonVerzweiflerAttacks = character.attacks.filter(attack => 
        attack.weaponName !== "Verzweifler" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (nonVerzweiflerAttacks.length === 0) {
        return false;
    }
    
    // Check if character has Explosion
    const hasExplosion = character.attacks.some(attack => 
        attack.weaponName === "Explosion" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (!hasExplosion) {
        return false;
    }
    
    // 1 in X chance where X = number of non-Verzweifler attacks
    const chance = 1 / nonVerzweiflerAttacks.length;
    return Math.random() < chance;
}

/**
 * Check if Explosion usage should be aborted due to ally/enemy ratio
 * @param {Object} attacker - Attacker position and data
 * @param {number} range - Explosion range
 * @returns {boolean} - Whether to abort explosion
 */
export function shouldAbortExplosion(attacker, range) {
    // Calculate hitbox range (10% larger than visual range)
    const hitboxRange = Math.round(range * 1.1);
    
    // Find all characters in explosion range using hitbox range
    const charactersInRange = findCharactersInCone(
        attacker, 
        { x: attacker.x + 1, y: attacker.y }, 
        hitboxRange,
        360
    );
    
    let allies = 0;
    let enemies = 0;
    
    charactersInRange.forEach(target => {
        // Skip the attacker itself and defeated Pokemon
        if (target.character === attacker.character || target.character.currentKP <= 0) {
            return;
        }
        
        if (target.position.teamIndex === attacker.teamIndex) {
            allies++;
        } else {
            enemies++;
        }
    });
    
    // Abort if allies >= enemies
    return allies >= enemies;
}

/**
 * Add CSS styles for Explosion
 */
export function addExplosionStyles() {
    // Check if styles already exist
    if (document.getElementById('enhanced-explosion-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'enhanced-explosion-styles';
    
    // Define the enhanced CSS
    styleElement.textContent = `
        /* Pokemon Red Flash Effect */
        .explosion-flash {
            animation: pokemon-explosion-flash 200ms ease-out !important;
        }
        
        @keyframes pokemon-explosion-flash {
            0% { 
                filter: brightness(1) hue-rotate(0deg);
            }
            50% { 
                filter: brightness(3) hue-rotate(0deg) drop-shadow(0 0 20px #ff0000);
                background-color: rgba(255, 0, 0, 0.3) !important;
            }
            100% { 
                filter: brightness(1.2) hue-rotate(0deg);
            }
        }
        
        /* Expanding Fireball */
        .explosion-fireball-container {
            animation: fireball-container-expand 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .explosion-fireball-container.explosion-fireball-expand {
            animation-play-state: running;
        }
        
        @keyframes fireball-container-expand {
            0% {
                width: var(--start-size);
                height: var(--start-size);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            70% {
                width: var(--end-size);
                height: var(--end-size);
                opacity: 1;
            }
            100% {
                width: var(--end-size);
                height: var(--end-size);
                opacity: 0;
            }
        }
        
        .explosion-fireball {
            animation: fireball-layer-pulse 800ms ease-out forwards;
        }
        
        @keyframes fireball-layer-pulse {
            0% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 0;
            }
            20% {
                transform: translate(-50%, -50%) scale(1.1);
                opacity: 1;
            }
            60% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.9;
            }
            100% {
                transform: translate(-50%, -50%) scale(1.2);
                opacity: 0;
            }
        }
        
        /* Shockwave Effect */
        .explosion-shockwave-container {
            animation: shockwave-container-expand 1000ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .explosion-shockwave-container.explosion-shockwave-expand {
            animation-play-state: running;
        }
        
        @keyframes shockwave-container-expand {
            0% {
                width: 20px;
                height: 20px;
            }
            100% {
                width: var(--max-size);
                height: var(--max-size);
            }
        }
        
        .explosion-shockwave-ring {
            animation: shockwave-ring-expand 1000ms ease-out forwards;
        }
        
        @keyframes shockwave-ring-expand {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
                border-width: 4px;
            }
            30% {
                transform: translate(-50%, -50%) scale(0.3);
                opacity: 0.9;
                border-width: 3px;
            }
            70% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 0.4;
                border-width: 2px;
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0;
                border-width: 1px;
            }
        }
        
        /* Fire Particles */
        .explosion-fire-particle {
            animation: fire-particle-fly var(--duration, 1000ms) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .explosion-fire-particle.explosion-fire-particle-animate {
            animation-play-state: running;
        }
        
        @keyframes fire-particle-fly {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
            50% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
                left: calc(var(--end-x) * 0.7);
                top: calc(var(--end-y) * 0.7);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5) rotate(360deg);
                left: var(--end-x);
                top: var(--end-y);
            }
        }
        
        /* Steam/Smoke Effect */
        .explosion-steam-cloud {
            animation: steam-cloud-rise 2000ms ease-out forwards;
        }
        
        .explosion-steam-cloud.explosion-steam-animate {
            animation-play-state: running;
        }
        
        @keyframes steam-cloud-rise {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
                filter: blur(1px);
            }
            20% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scale(0.8);
                filter: blur(2px);
            }
            80% {
                opacity: 0.4;
                transform: translate(-50%, -50%) scale(1.5) translateY(-50px);
                filter: blur(4px);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(2) translateY(-100px);
                filter: blur(6px);
            }
        }
        
        /* Enhanced warning cone for explosion */
        .attack-cone.explosion-cone.explosion-warning {
            animation: explosion-warning-intense-pulse 0.8s ease-in-out infinite alternate;
        }

        .attack-cone.explosion-cone.explosion-warning path {
            fill: rgba(255, 69, 0, 0.5);
            stroke: rgba(255, 0, 0, 1);
            stroke-width: 4;
            filter: drop-shadow(0 0 15px rgba(255, 69, 0, 0.8)) drop-shadow(0 0 30px rgba(255, 0, 0, 0.6));
        }

        @keyframes explosion-warning-intense-pulse {
            0% { 
                opacity: 0.7;
                transform: scale(1);
                filter: drop-shadow(0 0 15px rgba(255, 69, 0, 0.8));
            }
            100% { 
                opacity: 1;
                transform: scale(1.08);
                filter: drop-shadow(0 0 25px rgba(255, 69, 0, 1)) drop-shadow(0 0 40px rgba(255, 0, 0, 0.8));
            }
        }
        
        /* Hit effect for targets - more dramatic */
        .explosion-hit-effect {
            animation: explosion-hit-flash-enhanced 0.6s ease-in-out forwards;
        }

        @keyframes explosion-hit-flash-enhanced {
            0% { 
                filter: brightness(1) saturate(1);
            }
            15% { 
                filter: brightness(3) saturate(2) drop-shadow(0 0 15px rgba(255, 255, 255, 1)) hue-rotate(0deg);
            }
            40% { 
                filter: brightness(2.5) saturate(1.8) drop-shadow(0 0 20px rgba(255, 69, 0, 0.9)) hue-rotate(15deg);
            }
            70% {
                filter: brightness(1.8) saturate(1.4) drop-shadow(0 0 10px rgba(255, 0, 0, 0.7)) hue-rotate(30deg);
            }
            100% { 
                filter: brightness(1) saturate(1);
            }
        }
        
        /* Cleanup - ensure no background interference */
        .explosion-fireball-container,
        .explosion-shockwave-container {
            background: none !important;
            border: none !important;
            box-shadow: none !important;
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

export function addEnhancedExplosionStyles() {
    // Check if styles already exist
    if (document.getElementById('enhanced-explosion-styles-v2')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'enhanced-explosion-styles-v2';
    
    // Add enhanced styles for better visual feedback
    styleElement.textContent = `
        /* Enhanced explosion warning indicator */
        .explosion-processing-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 69, 0, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 10000;
            animation: explosion-indicator-pulse 1s ease-in-out infinite alternate;
            box-shadow: 0 0 20px rgba(255, 69, 0, 0.8);
        }
        
        @keyframes explosion-indicator-pulse {
            0% { 
                opacity: 0.8;
                transform: scale(1);
            }
            100% { 
                opacity: 1;
                transform: scale(1.05);
            }
        }
        
        /* Turn blocking overlay */
        .explosion-turn-block {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 69, 0, 0.1);
            z-index: 9999;
            pointer-events: none;
            animation: explosion-block-pulse 2s ease-in-out infinite;
        }
        
        @keyframes explosion-block-pulse {
            0%, 100% { 
                opacity: 0.05;
            }
            50% { 
                opacity: 0.15;
            }
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}