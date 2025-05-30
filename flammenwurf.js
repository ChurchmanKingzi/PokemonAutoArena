/**
 * Flammenwurf (Flamethrower) Attack Implementation
 * Shoots 9 flame projectiles in quick succession with spread pattern
 */

import { TILE_SIZE, GRID_SIZE } from '../config.js';
import { getCharacterPositions } from '../characterPositions.js';
import { followProjectile, stopFollowingProjectile, focusOnCharacter } from '../cameraSystem.js';
import { updateInitiativeHP } from '../initiativeDisplay.js';
import { logBattleEvent } from '../battleLog.js';
import { doesPokemonOccupyTile } from '../pokemonDistanceCalculator.js';
import { calculateSizeCategory } from '../pokemonSizeCalculator.js';
import { calculateFinalDamage, applyDamageAndEffects } from '../damage.js';
import { attemptDodge } from '../dodgeSystem.js';
import { applyOnHitStatusEffects } from '../attackSystem.js';
import { initializeAttackResult } from '../attackSystem.js';
import { getModifiedGena } from '../attackSystem.js';
import { rollAttackDice } from '../diceRoller.js';
import { handleLuckTokensAndForcing } from '../attackSystem.js';
import { getWeatherEvasionThreshold } from '../weather.js';
import { chooseDodgePosition } from '../dodgeSystem.js';
import { animateDodge } from '../animationManager.js';
import { addStatusEffect, checkBurnImmunity } from '../statusEffects.js';
import { isLineOfSightBlockedByAlly } from '../projectileSystem.js';

// Constants for Flammenwurf behavior
const FLAME_COUNT = 50;
const MAX_SPREAD_ANGLE = 15; // ±15 degrees
const FLAME_SPEED = 600; // pixels per second
const FLAME_INTERVAL = 5; // milliseconds between flame shots
const PARTICLE_COUNT = 15; // particles per flame impact

// Global registry to track all Flammenwurf attacks and projectiles for emergency cleanup
const activeFlammenwurfAttacks = new Set();
const activeFlameProjectiles = new Map(); // Maps projectile IDs to their instances

/**
 * Add CSS styles for Flammenwurf visual effects
 */
export function addFlammenwurfStyles() {
    const styleId = 'flammenwurf-styles';
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Flammenwurf projectile styles */
        .projectile.flammenwurf {
            width: 24px;
            height: 8px;
            background: linear-gradient(90deg, #ff4500 0%, #ff8c00 50%, #ffff00 100%);
            border-radius: 50%;
            box-shadow: 
                0 0 10px #ff4500,
                0 0 20px #ff4500,
                0 0 30px #ff8c00;
            animation: flameFlicker 0.1s infinite alternate;
            z-index: 100;
            pointer-events: none;
        }
        
        .projectile.flammenwurf.size-2 {
            width: 32px;
            height: 10px;
        }
        
        .projectile.flammenwurf.size-3 {
            width: 42px;
            height: 14px;
        }
        
        .projectile.flammenwurf.size-4 {
            width: 54px;
            height: 18px;
        }
        
        .projectile.flammenwurf.size-5 {
            width: 68px;
            height: 22px;
        }
        
        @keyframes flameFlicker {
            0% { 
                box-shadow: 
                    0 0 10px #ff4500,
                    0 0 20px #ff4500,
                    0 0 30px #ff8c00;
            }
            100% { 
                box-shadow: 
                    0 0 15px #ff6500,
                    0 0 25px #ff6500,
                    0 0 35px #ffa500;
            }
        }
        
        /* Flame impact particles */
        .flame-particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: radial-gradient(circle, #ff4500 0%, #ff8c00 70%, transparent 100%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 99;
            animation: flameParticle 0.8s ease-out forwards;
        }
        
        /* Size scaling for flame particles */
        .flame-particle.size-2 {
            width: 6px;
            height: 6px;
        }
        
        .flame-particle.size-3 {
            width: 8px;
            height: 8px;
        }
        
        .flame-particle.size-4 {
            width: 10px;
            height: 10px;
        }
        
        .flame-particle.size-5 {
            width: 12px;
            height: 12px;
        }
        
        @keyframes flameParticle {
            0% {
                opacity: 1;
                transform: scale(1);
            }
            100% {
                opacity: 0;
                transform: scale(0.2);
            }
        }
        
        /* Flame impact burst */
        .flame-impact-burst {
            position: absolute;
            width: 40px;
            height: 40px;
            background: radial-gradient(circle, #ff4500 0%, #ff8c00 30%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 98;
            animation: flameImpactBurst 0.3s ease-out forwards;
        }
        
        /* Size scaling for impact bursts */
        .flame-impact-burst.size-2 {
            width: 50px;
            height: 50px;
        }
        
        .flame-impact-burst.size-3 {
            width: 60px;
            height: 60px;
        }
        
        .flame-impact-burst.size-4 {
            width: 70px;
            height: 70px;
        }
        
        .flame-impact-burst.size-5 {
            width: 80px;
            height: 80px;
        }
        
        @keyframes flameImpactBurst {
            0% {
                opacity: 1;
                transform: scale(0.2);
            }
            50% {
                opacity: 0.8;
                transform: scale(1);
            }
            100% {
                opacity: 0;
                transform: scale(1.5);
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Flammenwurf projectile class - individual flame
 */
class FlammenwurfProjectile {
    constructor(attacker, target, attack, angle, isFirstFlame, flammenwurfAttack, index) {
        this.id = `flammenwurf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.angle = angle; // in degrees
        this.isFirstFlame = isFirstFlame;
        this.flammenwurfAttack = flammenwurfAttack;
        this.index = index;
        this.removed = false;
        this.hasHitTarget = false;
        this.markedForDeletion = false;

        // Calculate size category for scaling
        this.sizeCategory = calculateSizeCategory(attacker.character) || 1;
        
        // Calculate start position (center of attacker's tile)
        this.x = attacker.x * TILE_SIZE + TILE_SIZE / 2;
        this.y = attacker.y * TILE_SIZE + TILE_SIZE / 2;
        
        // Calculate direction based on angle
        const angleRad = (angle * Math.PI) / 180;
        this.dirX = Math.cos(angleRad);
        this.dirY = Math.sin(angleRad);
        
        // Speed and movement
        this.speed = FLAME_SPEED;
        this.creationTime = Date.now();
        this.maxLifetime = 3000; // 3 seconds max
        
        // Create visual element
        this.element = this.createVisualElement();
        
        // Track this projectile in both attack instance and global registry
        this.flammenwurfAttack.activeProjectiles.push(this);
        activeFlameProjectiles.set(this.id, this);
        followProjectile(this);
    }
    
    /**
     * Create the visual element for this flame
     */
    createVisualElement() {
        const element = document.createElement('div');
        element.className = `projectile flammenwurf size-${this.sizeCategory}`;
        element.dataset.projectileId = this.id;
        element.dataset.creationTime = Date.now();
        element.dataset.flammenwurfAttackId = this.flammenwurfAttack.id;
        
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) {
            console.error('Battlefield element not found for flammenwurf projectile');
            return element;
        }
        
        // Position and rotate the element
        element.style.position = 'absolute';
        element.style.left = `${this.x}px`;
        element.style.top = `${this.y}px`;
        element.style.transform = `translate(-50%, -50%) rotate(${this.angle}deg)`;
        element.style.zIndex = '100';
        
        battlefield.appendChild(element);
        return element;
    }
    
    /**
     * Update the flame's position and check for collisions
     */
    update(deltaTime) {
        if (this.removed || this.markedForDeletion) return false;
        
        // Check age-based destruction
        const age = Date.now() - this.creationTime;
        if (age > this.maxLifetime) {
            this.markedForDeletion = true;
            this.destroy();
            return false;
        }
        
        // Move the flame
        const moveDistance = this.speed * deltaTime;
        this.x += this.dirX * moveDistance;
        this.y += this.dirY * moveDistance;
        
        // Check bounds
        if (this.isOutOfBounds()) {
            this.markedForDeletion = true;
            this.destroy();
            return false;
        }
        
        // Update visual position
        if (this.element && !this.removed) {
            try {
                this.element.style.left = `${this.x}px`;
                this.element.style.top = `${this.y}px`;
            } catch (error) {
                console.warn("Error updating flame position:", error);
                this.markedForDeletion = true;
                this.destroy();
                return false;
            }
        } else if (!this.element) {
            this.markedForDeletion = true;
            this.destroy();
            return false;
        }
        
        // Check for collisions
        const collision = this.checkCollisions();
        if (collision) {
            this.handleCollision(collision);
            this.markedForDeletion = true;
            this.destroy();
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if flame is out of bounds
     */
    isOutOfBounds() {
        const gridPixelSize = GRID_SIZE * TILE_SIZE;
        const buffer = gridPixelSize * 0.2;
        
        return (this.x < -buffer || this.x >= gridPixelSize + buffer || 
                this.y < -buffer || this.y >= gridPixelSize + buffer);
    }
    
    /**
     * Check for collisions with characters
     */
    checkCollisions() {
        if (this.removed || this.hasHitTarget || this.markedForDeletion) return null;
        
        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        const characterPositions = getCharacterPositions();
        
        for (const charId in characterPositions) {
            const charPos = characterPositions[charId];
            
            // Skip if character is defeated or is the attacker
            if (charPos.isDefeated || charPos === this.attacker) continue;
            
            // Skip if character is dodging (only matters for first flame)
            if (this.isFirstFlame && charPos.isDodging) continue;
            
            // Check if flame is within any tile occupied by the Pokemon
            if (doesPokemonOccupyTile(charPos, gridX, gridY)) {
                return {
                    id: charId,
                    character: charPos.character,
                    position: charPos,
                    teamIndex: charPos.teamIndex
                };
            }
        }
        
        return null;
    }
    
    /**
     * Handle collision with a character
     */
    handleCollision(collision) {
        if (this.hasHitTarget || this.markedForDeletion) return;
        this.hasHitTarget = true;
        
        // Create impact effects
        this.createImpactEffects();
        
        // Register hit with the main flammenwurf attack
        this.flammenwurfAttack.registerHit(collision, this.isFirstFlame);
    }
    
    /**
     * Apply burn status to a character
     */
    applyBurnStatus(character) {
        // Use the status effects system to apply burn
        return addStatusEffect(character, 'burned', {
            sourceId: this.attacker.character.uniqueId,
            sourceName: this.attacker.character.name
        });
    }

    /**
     * Create visual impact effects when flame hits
     */
    createImpactEffects() {
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        // Create impact burst
        const burst = document.createElement('div');
        burst.className = `flame-impact-burst size-${this.sizeCategory}`;
        burst.style.position = 'absolute';
        burst.style.left = `${this.x}px`;
        burst.style.top = `${this.y}px`;
        burst.style.transform = 'translate(-50%, -50%)';
        
        battlefield.appendChild(burst);
        
        // Remove burst after animation
        setTimeout(() => {
            if (burst.parentNode) {
                burst.parentNode.removeChild(burst);
            }
        }, 300);
        
        // Create particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const particle = document.createElement('div');
            particle.className = `flame-particle size-${this.sizeCategory}`;
            
            // Random position around impact point
            const offsetX = (Math.random() - 0.5) * 40 * (this.sizeCategory / 2);
            const offsetY = (Math.random() - 0.5) * 40 * (this.sizeCategory / 2);
            
            particle.style.position = 'absolute';
            particle.style.left = `${this.x + offsetX}px`;
            particle.style.top = `${this.y + offsetY}px`;
            particle.style.transform = 'translate(-50%, -50%)';
            
            // Random movement direction
            const moveX = (Math.random() - 0.5) * 30 * (this.sizeCategory / 2);
            const moveY = (Math.random() - 0.5) * 30 * (this.sizeCategory / 2);
            
            particle.style.setProperty('--moveX', `${moveX}px`);
            particle.style.setProperty('--moveY', `${moveY}px`);
            
            battlefield.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 800);
        }
    }
    
    /**
     * Destroy the flame projectile
     */
    destroy() {
        if (this.removed) return;
        this.removed = true;
        
        // Remove visual element
        try {
            if (this.element) {
                if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                } else {
                    // Try to find by ID as fallback
                    const elementById = document.querySelector(`.projectile[data-projectile-id="${this.id}"]`);
                    if (elementById && elementById.parentNode) {
                        elementById.parentNode.removeChild(elementById);
                    } else {
                        // If all else fails, find all flame elements and check for this one
                        const allFlameElements = document.querySelectorAll('.projectile.flammenwurf');
                        for (const el of allFlameElements) {
                            if (el.dataset.projectileId === this.id && el.parentNode) {
                                el.parentNode.removeChild(el);
                                break;
                            }
                        }
                    }
                }
                this.element = null;
            }
        } catch (error) {
            console.warn("Error removing flame element:", error);
        }
        
        // REMOVE THIS SECTION - Let the main update loop handle array removal
        // This prevents the double-removal race condition
        /*
        try {
            const index = this.flammenwurfAttack.activeProjectiles.findIndex(p => p.id === this.id);
            if (index !== -1) {
                this.flammenwurfAttack.activeProjectiles.splice(index, 1);
            }
        } catch (error) {
            console.warn("Error removing flame from attack tracking:", error);
        }
        */
        
        // Keep the global registry cleanup
        activeFlameProjectiles.delete(this.id);
    }
}

/**
 * Main Flammenwurf attack class that manages all 9 flames
 */
class FlammenwurfAttack {
    constructor(attacker, target, attack, callback, attackSuccesses = 0) {
        this.id = `flammenwurf_attack_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.callback = callback;
        this.activeProjectiles = [];
        this.hitTargets = new Set(); // Track which targets have been hit
        this.flamesFired = 0;
        this.removed = false;
        this.updateInterval = null;
        this.lastUpdateTime = 0;
        this.allFlamesFired = false;
        this.attackComplete = false;
        this.callbackExecuted = false;
        this.attackSuccesses = attackSuccesses;
        
        // Calculate base direction to target
        this.baseAngle = this.calculateBaseAngle();
        
        // Add to global registry
        activeFlammenwurfAttacks.add(this);
        
        // Flag that animation is in progress to prevent movement
        if (this.attacker.character) {
            this.attacker.character.animationInProgress = true;
            this.attacker.character.isUsingFlammenwurf = true;
            
            // Add special property to the attacker position object too
            // This ensures the turn system will see and respect it
            this.attacker.isUsingFlammenwurf = true;
            this.attacker.cannotMove = true;
            this.attacker.attackAnimationActive = true;
        }
        
        // Start the update loop immediately
        this.startUpdateLoop();
        
        // Start firing flames
        this.startFiring();
        
        // Set up a master safety timeout
        this.safetyTimeout = setTimeout(() => {
            this.emergencyCleanup();
        }, 15000); // 15 seconds absolute maximum
    }
    
    /**
     * Calculate the base angle from attacker to target
     */
    calculateBaseAngle() {
        const dx = this.target.x - this.attacker.x;
        const dy = this.target.y - this.attacker.y;
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }
    
    /**
     * Start firing the 9 flames in sequence
     */
    startFiring() {
        this.fireNextFlame();
    }
    
    /**
     * Fire the next flame in the sequence
     */
    fireNextFlame() {
        if (this.removed || this.flamesFired >= FLAME_COUNT) {
            this.allFlamesFired = true;
            return;
        }
        
        let angle;
        const isFirstFlame = this.flamesFired === 0;
        
        if (isFirstFlame) {
            // First flame goes straight to target
            angle = this.baseAngle;
        } else {
            // Other flames have random spread of ±15°
            const spreadAngle = (Math.random() - 0.5) * 2 * MAX_SPREAD_ANGLE;
            angle = this.baseAngle + spreadAngle;
        }
        
        // Create and fire the flame with attack successes
        try {
            const flame = new FlammenwurfProjectile(
                this.attacker, this.target, this.attack, 
                angle, isFirstFlame, this, this.flamesFired, this.attackSuccesses  // Pass attackSuccesses
            );
            
            this.flamesFired++;
            
            // Schedule next flame
            if (this.flamesFired < FLAME_COUNT) {
                setTimeout(() => {
                    this.fireNextFlame();
                }, FLAME_INTERVAL);
            } else {
                this.allFlamesFired = true;
            }
        } catch (error) {
            console.error("Error creating flame projectile:", error);
            this.flamesFired++;
            if (this.flamesFired >= FLAME_COUNT) {
                this.allFlamesFired = true;
            } else {
                // Try to continue with next flame
                setTimeout(() => {
                    this.fireNextFlame();
                }, FLAME_INTERVAL);
            }
        }
    }
    
    /**
     * Start the update loop for all projectiles (called immediately in constructor)
     */
    startUpdateLoop() {
        if (this.updateInterval) return;
        
        this.lastUpdateTime = performance.now();
        this.updateInterval = setInterval(() => {
            this.updateProjectiles();
        }, 16); // ~60 FPS
        
        // Safety timeout to prevent infinite loops
        setTimeout(() => {
            if (this.updateInterval && !this.removed) {
                console.warn(`Flammenwurf attack ${this.id} hit safety timeout - forcing cleanup`);
                this.finishAttack();
            }
        }, 10000); // 10 second safety timeout
    }
    
    /**
     * Update all active flame projectiles
     */
    updateProjectiles() {
        if (this.removed) {
            this.cleanup();
            return;
        }
        
        try {
            const now = performance.now();
            const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1); // Cap deltaTime at 0.1s
            this.lastUpdateTime = now;
            
            // Update all active flames
            for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
                try {
                    const projectile = this.activeProjectiles[i];
                    
                    // Skip null or already removed projectiles
                    if (!projectile || projectile.removed || projectile.markedForDeletion) {
                        this.activeProjectiles.splice(i, 1);
                        continue;
                    }
                    
                    // Verify DOM element is still valid
                    if (projectile.element && (!projectile.element.parentNode || !document.contains(projectile.element))) {
                        console.warn("Flame element detached from DOM, marking for deletion:", projectile.id);
                        projectile.markedForDeletion = true;
                        projectile.destroy();
                        this.activeProjectiles.splice(i, 1);
                        continue;
                    }
                    
                    // Update the projectile
                    if (!projectile.update(deltaTime)) {
                        // Projectile was destroyed, remove from array
                        this.activeProjectiles.splice(i, 1);
                    }
                } catch (error) {
                    console.error("Error updating projectile at index", i, error);
                    // Remove problematic projectile to prevent repeated errors
                    this.activeProjectiles.splice(i, 1);
                }
            }
            
            // Check if all flames are done
            if (this.activeProjectiles.length === 0 && this.allFlamesFired && !this.attackComplete) {
                this.attackComplete = true;
                this.finishAttack();
            }
        } catch (error) {
            console.error("Error in Flammenwurf update loop:", error);
            // Try to continue instead of failing completely
        }
        this.preventFlameCollisions();
    }
    
    /**
     * Register a hit on a target
     */
    registerHit(collision, isFirstFlame) {
        const targetId = collision.character.uniqueId;
        
        // If this target hasn't been hit yet, apply damage and effects
        if (!this.hitTargets.has(targetId)) {
            this.hitTargets.add(targetId);
            this.applyDamageAndEffects(collision, isFirstFlame);
        }
    }
    
    /**
     * Apply damage and effects to a target
     */
    applyDamageAndEffects(collision, isFirstFlame) {
        const targetCharId = collision.id;
        
        // Calculate damage
        const damageData = calculateFinalDamage(this.attack, collision.position, this.attacker, {netSuccesses: Math.max(this.attackSuccesses, 3)});
        
        // Apply damage through the damage system
        applyDamageAndEffects(
            collision.position, 
            this.attacker, 
            this.attack, 
            damageData, 
            { log: [] }, 
            targetCharId, 
            this.getAttackerCharId(), 
            {netSuccesses: Math.max(this.attackSuccesses, 3)}
        );
        
        // Apply burn status if 3+ successes and target can be burned
        if (this.attackSuccesses >= 3) {
            const isImmuneToBurn = checkBurnImmunity(collision.position.character);  // This returns TRUE if immune
            if (!isImmuneToBurn) {  // Only apply burn if NOT immune
                const burnApplied = addStatusEffect(collision.position.character, 'burned', {
                    sourceId: this.attacker.character.uniqueId,
                    sourceName: this.attacker.character.name
                });
                if (burnApplied) {
                    logBattleEvent(`${this.attacker.character.name}s Flammenwurf verbrennt ${collision.position.character.name}!`);
                }
            }
        }
        
        // Log the hit
        logBattleEvent(`${this.attacker.character.name}s Flammenwurf trifft ${collision.character.name}!`);
        
        // Update HP displays
        updateInitiativeHP();
    }

    
    /**
     * Get the attacker's character ID
     */
    getAttackerCharId() {
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId] === this.attacker) {
                return charId;
            }
        }
        return null;
    }
    
    /**
     * Handle dodge attempt for the first flame only
     */
    handleDodgeAttempt(attackRoll) {
        if (!this.target || !this.target.character) return { success: false };
        
        // Only the first flame can be dodged
        return attemptDodge(this.attacker, this.target, attackRoll, this.attack);
    }
    
    /**
     * Finish the attack and call callback
     */
    finishAttack() {
        if (this.removed || this.callbackExecuted) return; // Prevent double execution
        
        this.cleanup();
        
        // Execute callback only once
        if (this.callback && typeof this.callback === 'function' && !this.callbackExecuted) {
            this.callbackExecuted = true;
            try {
                this.callback(true);
            } catch (error) {
                console.error("Error in Flammenwurf callback:", error);
            }
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.removed) return;
        this.removed = true;
        
        /**
     * Clear animation in progress flag*/
     if (this.attacker.character) {
            this.attacker.character.animationInProgress = false;
            this.attacker.character.isUsingFlammenwurf = false;
            
            // Clear flags on attacker position object too
            if (this.attacker) {
                this.attacker.isUsingFlammenwurf = false;
                this.attacker.cannotMove = false;
                this.attacker.attackAnimationActive = false;
            }
        }
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.safetyTimeout) {
            clearTimeout(this.safetyTimeout);
            this.safetyTimeout = null;
        }
        
        // Destroy any remaining projectiles
        for (const projectile of [...this.activeProjectiles]) { // Use spread to avoid modification during iteration
            if (projectile && !projectile.removed) {
                projectile.destroy();
            }
        }
        this.activeProjectiles = [];
        
        // Remove from global registry
        activeFlammenwurfAttacks.delete(this);
        
        // Clean up any orphaned flame elements
        this.cleanupOrphanedFlames();
        
        // Stop following projectiles
        stopFollowingProjectile();
        
        // Refocus on attacker
        const characterPositions = getCharacterPositions();
        for (const charId in characterPositions) {
            if (characterPositions[charId] === this.attacker) {
                setTimeout(() => {
                    focusOnCharacter(charId);
                }, 100);
                break;
            }
        }
    }
    
    /**
     * Clean up any orphaned flame elements from this attack
     */
    cleanupOrphanedFlames() {
        try {
            // Find and remove all flame elements with this attack ID
            const orphanedElements = document.querySelectorAll(`.projectile[data-flammenwurf-attack-id="${this.id}"]`);
            orphanedElements.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            // Also try with more generic selector as fallback
            const allFlames = document.querySelectorAll('.projectile.flammenwurf');
            allFlames.forEach(element => {
                // Check if this flame belongs to a deleted projectile
                const id = element.dataset.projectileId;
                if (!id || !activeFlameProjectiles.has(id)) {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }
            });
        } catch (error) {
            console.warn("Error during flame cleanup:", error);
        }
    }
    
    /**
     * Emergency cleanup if something goes catastrophically wrong
     */
    emergencyCleanup() {
        console.warn(`Emergency cleanup for Flammenwurf attack ${this.id}`);
        
        // Clear animation in progress flag
        if (this.attacker.character) {
            this.attacker.character.animationInProgress = false;
            this.attacker.character.isUsingFlammenwurf = false;
            
            // Clear flags on attacker position object too
            if (this.attacker) {
                this.attacker.isUsingFlammenwurf = false;
                this.attacker.cannotMove = false;
                this.attacker.attackAnimationActive = false;
            }
        }
        
        // Force cleanup of all resources
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Remove all flame elements from DOM
        try {
            const allFlames = document.querySelectorAll('.projectile.flammenwurf');
            allFlames.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            // Also clean up any impact effects
            const allImpacts = document.querySelectorAll('.flame-impact-burst, .flame-particle');
            allImpacts.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        } catch (error) {
            console.error("Error during emergency cleanup:", error);
        }
        
        // Execute callback if not already done
        if (this.callback && typeof this.callback === 'function' && !this.callbackExecuted) {
            this.callbackExecuted = true;
            try {
                this.callback(true);
            } catch (error) {
                console.error("Error in emergency callback:", error);
            }
        }
        
        // Remove from global registry
        activeFlammenwurfAttacks.delete(this);
    }

    /**
     * Prevent collisions between flames by adjusting their positions slightly
     */
    preventFlameCollisions() {
        // This function prevents flames from occupying the exact same spot
        // which can cause rendering issues and collision detection problems
        const flamesCount = this.activeProjectiles.length;
        
        // Only process if we have multiple flames
        if (flamesCount <= 1) return;
        
        // Check each flame against others
        for (let i = 0; i < flamesCount; i++) {
            const flame1 = this.activeProjectiles[i];
            if (!flame1 || flame1.removed || flame1.markedForDeletion) continue;
            
            for (let j = i + 1; j < flamesCount; j++) {
                const flame2 = this.activeProjectiles[j];
                // FIX: Change 'markedForDeleation' to 'markedForDeletion'
                if (!flame2 || flame2.removed || flame2.markedForDeletion) continue;
                
                // Calculate distance between flames
                const dx = flame2.x - flame1.x;
                const dy = flame2.y - flame1.y;
                const distSquared = dx * dx + dy * dy;
                
                // If flames are too close (less than 10 pixels apart)
                if (distSquared < 100) {
                    // Calculate push vector (normalized)
                    const dist = Math.sqrt(distSquared);
                    const pushX = dx / dist;
                    const pushY = dy / dist;
                    
                    // Push flames apart slightly
                    const pushAmount = 5; // 5 pixels
                    
                    // Move the second flame away (only if it has a valid element)
                    if (flame2.element && !flame2.removed) {
                        flame2.x += pushX * pushAmount;
                        flame2.y += pushY * pushAmount;
                        
                        // Update visual position
                        flame2.element.style.left = `${flame2.x}px`;
                        flame2.element.style.top = `${flame2.y}px`;
                    }
                }
            }
        }
    }
}

/**
 * Global cleanup function for Flammenwurf - can be called from outside to force cleanup
 */
export function cleanupAllFlammenwurfEffects() {    
    // Clean up all active attacks
    for (const attack of [...activeFlammenwurfAttacks]) {
        if (attack) {
            attack.emergencyCleanup();
        }
    }
    activeFlammenwurfAttacks.clear();
    
    // Clean up all active projectiles
    for (const [id, projectile] of activeFlameProjectiles.entries()) {
        if (projectile && !projectile.removed) {
            projectile.destroy();
        }
    }
    activeFlameProjectiles.clear();
    
    // Final DOM cleanup
    try {
        const allFlames = document.querySelectorAll('.projectile.flammenwurf');
        allFlames.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        const allImpacts = document.querySelectorAll('.flame-impact-burst, .flame-particle');
        allImpacts.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    } catch (error) {
        console.error("Error during global Flammenwurf cleanup:", error);
    }
}

/**
 * Create and execute a Flammenwurf attack
 * @param {Object} attacker - The attacking Pokemon
 * @param {Object} target - The target Pokemon
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits (for dodge calculation)
 * @param {Function} callback - Callback when attack completes
 * @param {Array} activeProjectiles - Array to track projectiles (for compatibility)
 * @returns {FlammenwurfAttack} - The created attack instance
 */
export function createFlammenwurf(attacker, target, attack, isHit, callback, activeProjectiles, attackSuccesses = 0) {
    // Add styles if not already added
    addFlammenwurfStyles();
    
    // Log the attack
    logBattleEvent(`${attacker.character.name} speit eine Kette von Flammen aus!`);
    
    // Create the Flammenwurf attack with attack successes
    const flammenwurfAttack = new FlammenwurfAttack(attacker, target, attack, callback, attackSuccesses);
    
    // Handle dodge attempt for first flame only
    if (isHit) {
        const attackRoll = { netSuccesses: Math.max(attackSuccesses, 3) }; // Use actual successes or minimum 3
        const dodgeResult = flammenwurfAttack.handleDodgeAttempt(attackRoll);
        
        if (dodgeResult.success) {
            logBattleEvent(`${target.character.name} weicht der ersten Flamme aus, aber andere Flammen können trotzdem treffen!`);
            // Mark target as dodging so first flame will miss
            if (target.character) {
                const characterPositions = getCharacterPositions();
                for (const charId in characterPositions) {
                    if (characterPositions[charId].character === target.character) {
                        characterPositions[charId].isDodging = true;
                        // Remove dodge flag after a short time
                        setTimeout(() => {
                            if (characterPositions[charId]) {
                                characterPositions[charId].isDodging = false;
                            }
                        }, 500);
                        break;
                    }
                }
            }
        }
    }
    
    // Follow the first projectile with camera
    followProjectile(flammenwurfAttack);
    
    return flammenwurfAttack;
}

/**
 * Handle Flammenwurf attack execution
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {string} charId - Attacker character ID
 * @param {string} targetId - Target character ID
 * @param {Function} callback - Safe callback function
 * @returns {Promise<Object>} - Attack results
 */
export async function handleFlammenwurfAttack(attacker, target, selectedAttack, charId, targetId, callback) {
    // MODIFICATION 1: Check if ally blocks line of sight - block attack if so
    const isAllyBlocking = isLineOfSightBlockedByAlly(attacker, target);  // Use correct function name
    if (isAllyBlocking) {
        logBattleEvent(`${attacker.character.name} kann Flammenwurf nicht einsetzen - ein Verbündeter blockiert die Schusslinie!`);
        
        // Clear animation flags
        if (attacker.character) {
            attacker.character.animationInProgress = false;
            attacker.character.isUsingFlammenwurf = false;
            attacker.isUsingFlammenwurf = false;
            attacker.cannotMove = false;
            attacker.attackAnimationActive = false;
        }
        
        // Return failed attack result
        const attackResult = {
            attacker: attacker.character.name,
            target: target.character.name,
            success: false,
            attackRolls: [],
            defenseRolls: [],
            damage: 0,
            log: [`${attacker.character.name} kann Flammenwurf nicht einsetzen - Verbündeter im Weg!`]
        };
        
        // Execute callback immediately
        if (callback) {
            setTimeout(() => callback(false), 100);
        }
        
        return attackResult;
    }

    // Set animation in progress flag to prevent movement
    if (attacker.character) {
        attacker.character.animationInProgress = true;
        attacker.character.isUsingFlammenwurf = true;
        
        // Also set flags on the attacker position object
        attacker.isUsingFlammenwurf = true;
        attacker.cannotMove = true;
        attacker.attackAnimationActive = true;
    }
    
    const attackResult = initializeAttackResult(attacker, target, selectedAttack);
    const genaValue = getModifiedGena(attacker, selectedAttack);
    
    // Execute attack roll
    let attackRoll = rollAttackDice(genaValue);
    attackResult.attackRolls.push(attackRoll);
    
    attackResult.log.push(`${attacker.character.name} greift ${target.character.name} mit ${selectedAttack.weaponName} an und würfelt: [${attackRoll.rolls.join(', ')}] - ${attackRoll.successes} Erfolge, ${attackRoll.failures} Fehlschläge = ${attackRoll.netSuccesses} Netto.`);
    
    // Handle luck tokens and forcing
    attackRoll = await handleLuckTokensAndForcing(attacker, attackRoll, genaValue, charId, attackResult);
    
    // MODIFICATION 2: Store the final attack roll successes for burn status application
    const finalAttackSuccesses = attackRoll.netSuccesses;
    
    // Get weather evasion threshold
    const hitThreshold = getWeatherEvasionThreshold(target);
    
    // Check for miss
    if (attackRoll.netSuccesses < hitThreshold) {
        if (hitThreshold > 1) {
            attackResult.log.push(`${target.character.name}s Wetterreaktion hilft beim Ausweichen! Mindestens ${hitThreshold} Erfolge erforderlich.`);
        }
        
        // Return promise for missed attack
        return new Promise(resolve => {
            createFlammenwurf(attacker, target, selectedAttack, false, () => {
                resolve(attackResult);
            }, [], finalAttackSuccesses);
        });
    }
    
    // Attack hits, attempt dodge
    attackResult.success = true;
    attackResult.log.push(`${attacker.character.name}s Angriff trifft mit ${attackRoll.netSuccesses} Erfolgen.`);
    
    // MODIFICATION 3: Store original target position before dodge attempt
    const originalTargetPosition = {
        x: target.x,
        y: target.y,
        character: target.character
    };
    
    // Check if target can dodge
    const dodgeResult = attemptDodge(attacker, target, attackRoll, selectedAttack);
    
    // If dodge is successful, execute dodge animation and retarget to original position
    if (dodgeResult.success) {
        attackResult.log.push(`${target.character.name} versucht dem Flammenwurf auszuweichen!`);
        
        // Get a dodge position
        const dodgePos = chooseDodgePosition(target, attacker, true); // true for ranged attack
        
        if (dodgePos) {
            // Execute dodge and wait for it to complete
            return new Promise(resolve => {
                // Mark as dodging
                const characterPositions = getCharacterPositions();
                characterPositions[targetId].isDodging = true;
                
                // Extend dodge flag duration
                setTimeout(() => {
                    if (characterPositions[targetId]) {
                        characterPositions[targetId].isDodging = false;
                    }
                }, 2000);
                
                // First animate the dodge
                animateDodge(targetId, dodgePos, () => {
                    // Update character position after dodge animation
                    if (characterPositions[targetId]) {
                        characterPositions[targetId].x = dodgePos.x;
                        characterPositions[targetId].y = dodgePos.y;
                    }
                    
                    // MODIFICATION 3: Create Flammenwurf attack targeting the original position
                    attackResult.log.push(`${attacker.character.name}s Flammenwurf zielt nun auf die vorherige Position des Ziels!`);
                    createFlammenwurf(attacker, originalTargetPosition, selectedAttack, true, () => {
                        resolve(attackResult);
                    }, [], finalAttackSuccesses);
                });
            });
        }
    }
    
    // If no dodge or no valid dodge position, just create the Flammenwurf attack
    return new Promise(resolve => {
        createFlammenwurf(attacker, target, selectedAttack, true, () => {
            resolve(attackResult);
        }, [], finalAttackSuccesses);
    });
}