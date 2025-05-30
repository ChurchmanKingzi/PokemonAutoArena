/**
 * Blubbstrahl (Bubble Beam) Attack Implementation
 * Shoots blue bubbles that can randomly pop and slow targets on hit
 * 
 * To integrate this attack, you need to update:
 * 1. attackSystem.js - Add import and handling case for Blubbstrahl
 * 2. projectileSystem.js - Add import for styles and handling case
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
import { changeInitiative } from '../initiativeChanges.js';
import { isLineOfSightBlockedByAlly } from '../projectileSystem.js';

// Constants for Blubbstrahl behavior
const BUBBLE_COUNT = 50;
const MAX_SPREAD_ANGLE = 15; // ±15 degrees
const BUBBLE_SPEED = 200; // Much slower than flames (200 vs 600)
const BUBBLE_INTERVAL = 8; // milliseconds between bubble shots
const PARTICLE_COUNT = 12; // particles per bubble impact
const POP_CHANCE_PER_FRAME = 0.02; // 2% chance per frame to randomly pop

// Global registry to track all Blubbstrahl attacks and projectiles for emergency cleanup
const activeBlubbstrahlAttacks = new Set();
const activeBubbleProjectiles = new Map();

/**
 * Add CSS styles for Blubbstrahl visual effects
 */
export function addBlubbstrahlStyles() {
    const styleId = 'blubbstrahl-styles';
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Blubbstrahl projectile styles */
        .projectile.blubbstrahl {
            width: 20px;
            height: 20px;
            background: radial-gradient(circle at 30% 30%, #87ceeb 0%, #4682b4 50%, #1e90ff 100%);
            border-radius: 50%;
            box-shadow: 
                0 0 10px #4682b4,
                0 0 20px #1e90ff,
                inset -5px -5px 10px rgba(0, 0, 0, 0.2),
                inset 2px 2px 5px rgba(255, 255, 255, 0.7);
            animation: bubbleFloat 0.8s infinite alternate ease-in-out;
            z-index: 100;
            pointer-events: none;
            opacity: 0.85;
        }
        
        .projectile.blubbstrahl.size-2 {
            width: 28px;
            height: 28px;
        }
        
        .projectile.blubbstrahl.size-3 {
            width: 36px;
            height: 36px;
        }
        
        .projectile.blubbstrahl.size-4 {
            width: 46px;
            height: 46px;
        }
        
        .projectile.blubbstrahl.size-5 {
            width: 58px;
            height: 58px;
        }
        
        @keyframes bubbleFloat {
            0% { 
                transform: translate(-50%, -50%) scale(1) translateY(0px);
            }
            100% { 
                transform: translate(-50%, -50%) scale(1.05) translateY(-3px);
            }
        }
        
        /* Bubble pop particles */
        .bubble-particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: radial-gradient(circle, #87ceeb 0%, #4682b4 70%, transparent 100%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 99;
            animation: bubbleParticle 0.6s ease-out forwards;
        }
        
        /* Size scaling for bubble particles */
        .bubble-particle.size-2 {
            width: 5px;
            height: 5px;
        }
        
        .bubble-particle.size-3 {
            width: 6px;
            height: 6px;
        }
        
        .bubble-particle.size-4 {
            width: 7px;
            height: 7px;
        }
        
        .bubble-particle.size-5 {
            width: 8px;
            height: 8px;
        }
        
        @keyframes bubbleParticle {
            0% {
                opacity: 0.8;
                transform: scale(1);
            }
            100% {
                opacity: 0;
                transform: scale(0.3);
            }
        }
        
        /* Bubble pop burst */
        .bubble-pop-burst {
            position: absolute;
            width: 40px;
            height: 40px;
            border: 2px solid #4682b4;
            border-radius: 50%;
            pointer-events: none;
            z-index: 98;
            animation: bubblePopBurst 0.4s ease-out forwards;
        }
        
        /* Size scaling for pop bursts */
        .bubble-pop-burst.size-2 {
            width: 50px;
            height: 50px;
        }
        
        .bubble-pop-burst.size-3 {
            width: 60px;
            height: 60px;
        }
        
        .bubble-pop-burst.size-4 {
            width: 70px;
            height: 70px;
        }
        
        .bubble-pop-burst.size-5 {
            width: 80px;
            height: 80px;
        }
        
        @keyframes bubblePopBurst {
            0% {
                opacity: 0.6;
                transform: scale(0.2);
            }
            50% {
                opacity: 0.4;
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
 * Blubbstrahl projectile class - individual bubble
 */
class BlubbstrahlProjectile {
    constructor(attacker, target, attack, angle, isFirstBubble, blubbstrahlAttack, index, attackSuccesses) {
        this.id = `blubbstrahl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.angle = angle; // in degrees
        this.isFirstBubble = isFirstBubble;
        this.blubbstrahlAttack = blubbstrahlAttack;
        this.index = index;
        this.attackSuccesses = attackSuccesses;
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
        
        // Speed and movement (slower than flames for bubble effect)
        this.speed = BUBBLE_SPEED;
        this.creationTime = Date.now();
        this.maxLifetime = 5000; // 5 seconds max (longer than flames due to slower speed)
        
        // Create visual element
        this.element = this.createVisualElement();
        
        // Track this projectile in both attack instance and global registry
        this.blubbstrahlAttack.activeProjectiles.push(this);
        activeBubbleProjectiles.set(this.id, this);
        followProjectile(this);
    }
    
    /**
     * Create the visual element for this bubble
     */
    createVisualElement() {
        const element = document.createElement('div');
        element.className = `projectile blubbstrahl size-${this.sizeCategory}`;
        element.dataset.projectileId = this.id;
        element.dataset.creationTime = Date.now();
        element.dataset.blubbstrahlAttackId = this.blubbstrahlAttack.id;
        
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) {
            console.error('Battlefield element not found for blubbstrahl projectile');
            return element;
        }
        
        // Position the element
        element.style.position = 'absolute';
        element.style.left = `${this.x}px`;
        element.style.top = `${this.y}px`;
        element.style.transform = `translate(-50%, -50%)`;
        element.style.zIndex = '100';
        
        battlefield.appendChild(element);
        return element;
    }
    
    /**
     * Update the bubble's position and check for collisions
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
        
        // Random pop chance - bubbles can spontaneously pop!
        if (Math.random() < POP_CHANCE_PER_FRAME) {
            logBattleEvent(`Eine Blase von ${this.attacker.character.name}s Blubbstrahl ist geplatzt!`);
            this.markedForDeletion = true;
            this.createImpactEffects(); // Show pop effect
            this.destroy();
            return false;
        }
        
        // Move the bubble
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
                console.warn("Error updating bubble position:", error);
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
     * Check if bubble is out of bounds
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
            
            // Skip if character is dodging (only matters for first bubble)
            if (this.isFirstBubble && charPos.isDodging) continue;
            
            // Check if bubble is within any tile occupied by the Pokemon
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
        
        // Register hit with the main blubbstrahl attack
        this.blubbstrahlAttack.registerHit(collision, this.isFirstBubble);
    }

    /**
     * Create visual impact effects when bubble hits or pops
     */
    createImpactEffects() {
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        // Create pop burst
        const burst = document.createElement('div');
        burst.className = `bubble-pop-burst size-${this.sizeCategory}`;
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
        }, 400);
        
        // Create particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const particle = document.createElement('div');
            particle.className = `bubble-particle size-${this.sizeCategory}`;
            
            // Random position around impact point
            const offsetX = (Math.random() - 0.5) * 30 * (this.sizeCategory / 2);
            const offsetY = (Math.random() - 0.5) * 30 * (this.sizeCategory / 2);
            
            particle.style.position = 'absolute';
            particle.style.left = `${this.x + offsetX}px`;
            particle.style.top = `${this.y + offsetY}px`;
            particle.style.transform = 'translate(-50%, -50%)';
            
            // Random movement direction
            const moveX = (Math.random() - 0.5) * 25 * (this.sizeCategory / 2);
            const moveY = (Math.random() - 0.5) * 25 * (this.sizeCategory / 2);
            
            particle.style.setProperty('--moveX', `${moveX}px`);
            particle.style.setProperty('--moveY', `${moveY}px`);
            
            battlefield.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 600);
        }
    }
    
    /**
     * Destroy the bubble projectile
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
                        // If all else fails, find all bubble elements and check for this one
                        const allBubbleElements = document.querySelectorAll('.projectile.blubbstrahl');
                        for (const el of allBubbleElements) {
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
            console.warn("Error removing bubble element:", error);
        }
        
        // Keep the global registry cleanup
        activeBubbleProjectiles.delete(this.id);
    }
}

/**
 * Main Blubbstrahl attack class that manages all bubbles
 */
class BlubbstrahlAttack {
    constructor(attacker, target, attack, callback, attackSuccesses = 0) {
        this.id = `blubbstrahl_attack_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.callback = callback;
        this.activeProjectiles = [];
        this.hitTargets = new Set(); // Track which targets have been hit
        this.bubblesFired = 0;
        this.removed = false;
        this.updateInterval = null;
        this.lastUpdateTime = 0;
        this.allBubblesFired = false;
        this.attackComplete = false;
        this.callbackExecuted = false;
        this.attackSuccesses = attackSuccesses;
        
        // Calculate base direction to target
        this.baseAngle = this.calculateBaseAngle();
        
        // Add to global registry
        activeBlubbstrahlAttacks.add(this);
        
        // Flag that animation is in progress to prevent movement
        if (this.attacker.character) {
            this.attacker.character.animationInProgress = true;
            this.attacker.character.isUsingBlubbstrahl = true;
            
            // Add special property to the attacker position object too
            this.attacker.isUsingBlubbstrahl = true;
            this.attacker.cannotMove = true;
            this.attacker.attackAnimationActive = true;
        }
        
        // Start the update loop immediately
        this.startUpdateLoop();
        
        // Start firing bubbles
        this.startFiring();
        
        // Set up a master safety timeout
        this.safetyTimeout = setTimeout(() => {
            this.emergencyCleanup();
        }, 20000); // 20 seconds absolute maximum (longer due to slower bubbles)
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
     * Start firing bubbles in sequence
     */
    startFiring() {
        this.fireNextBubble();
    }
    
    /**
     * Fire the next bubble in the sequence
     */
    fireNextBubble() {
        if (this.removed || this.bubblesFired >= BUBBLE_COUNT) {
            this.allBubblesFired = true;
            return;
        }
        
        let angle;
        const isFirstBubble = this.bubblesFired === 0;
        
        if (isFirstBubble) {
            // First bubble goes straight to target
            angle = this.baseAngle;
        } else {
            // Other bubbles have random spread of ±15°
            const spreadAngle = (Math.random() - 0.5) * 2 * MAX_SPREAD_ANGLE;
            angle = this.baseAngle + spreadAngle;
        }
        
        // Create and fire the bubble
        try {
            const bubble = new BlubbstrahlProjectile(
                this.attacker, this.target, this.attack, 
                angle, isFirstBubble, this, this.bubblesFired, this.attackSuccesses
            );
            
            this.bubblesFired++;
            
            // Schedule next bubble
            if (this.bubblesFired < BUBBLE_COUNT) {
                setTimeout(() => {
                    this.fireNextBubble();
                }, BUBBLE_INTERVAL);
            } else {
                this.allBubblesFired = true;
            }
        } catch (error) {
            console.error("Error creating bubble projectile:", error);
            this.bubblesFired++;
            if (this.bubblesFired >= BUBBLE_COUNT) {
                this.allBubblesFired = true;
            } else {
                // Try to continue with next bubble
                setTimeout(() => {
                    this.fireNextBubble();
                }, BUBBLE_INTERVAL);
            }
        }
    }
    
    /**
     * Start the update loop for all projectiles
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
                console.warn(`Blubbstrahl attack ${this.id} hit safety timeout - forcing cleanup`);
                this.finishAttack();
            }
        }, 15000); // 15 second safety timeout
    }
    
    /**
     * Update all active bubble projectiles
     */
    updateProjectiles() {
        if (this.removed) {
            this.cleanup();
            return;
        }
        
        try {
            const now = performance.now();
            const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1);
            this.lastUpdateTime = now;
            
            // Update all active bubbles
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
                        console.warn("Bubble element detached from DOM, marking for deletion:", projectile.id);
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
            
            // Check if all bubbles are done
            if (this.activeProjectiles.length === 0 && this.allBubblesFired && !this.attackComplete) {
                this.attackComplete = true;
                this.finishAttack();
            }
        } catch (error) {
            console.error("Error in Blubbstrahl update loop:", error);
        }
    }
    
    /**
     * Register a hit on a target
     */
    registerHit(collision, isFirstBubble) {
        const targetId = collision.character.uniqueId;
        
        // If this target hasn't been hit yet, apply damage and effects
        if (!this.hitTargets.has(targetId)) {
            this.hitTargets.add(targetId);
            this.applyDamageAndEffects(collision, isFirstBubble);
        }
    }
    
    /**
     * Apply damage and effects to a target
     */
    async applyDamageAndEffects(collision, isFirstBubble) {
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
        
        // Apply initiative penalty if 3+ successes
        if (this.attackSuccesses >= 3) {
            try {
                const initiativeResult = await changeInitiative(
                    collision.character.uniqueId,
                    -1, // -1 stage penalty
                    `${this.attacker.character.name}s Blubbstrahl`
                );
                
                if (initiativeResult.success) {
                    logBattleEvent(`${this.attacker.character.name}s Blubbstrahl verlangsamt ${collision.position.character.name}!`);
                } else if (initiativeResult.message) {
                    logBattleEvent(initiativeResult.message);
                }
            } catch (error) {
                console.error("Error applying initiative penalty:", error);
            }
        }
        
        // Log the hit
        logBattleEvent(`${this.attacker.character.name}s Blubbstrahl trifft ${collision.character.name}!`);
        
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
     * Handle dodge attempt for the first bubble only
     */
    handleDodgeAttempt(attackRoll) {
        if (!this.target || !this.target.character) return { success: false };
        
        // Only the first bubble can be dodged
        return attemptDodge(this.attacker, this.target, attackRoll, this.attack);
    }
    
    /**
     * Finish the attack and call callback
     */
    finishAttack() {
        if (this.removed || this.callbackExecuted) return;
        
        this.cleanup();
        
        // Execute callback only once
        if (this.callback && typeof this.callback === 'function' && !this.callbackExecuted) {
            this.callbackExecuted = true;
            try {
                this.callback(true);
            } catch (error) {
                console.error("Error in Blubbstrahl callback:", error);
            }
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.removed) return;
        this.removed = true;
        
        // Clear animation in progress flag
        if (this.attacker.character) {
            this.attacker.character.animationInProgress = false;
            this.attacker.character.isUsingBlubbstrahl = false;
            
            // Clear flags on attacker position object too
            if (this.attacker) {
                this.attacker.isUsingBlubbstrahl = false;
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
        for (const projectile of [...this.activeProjectiles]) {
            if (projectile && !projectile.removed) {
                projectile.destroy();
            }
        }
        this.activeProjectiles = [];
        
        // Remove from global registry
        activeBlubbstrahlAttacks.delete(this);
        
        // Clean up any orphaned bubble elements
        this.cleanupOrphanedBubbles();
        
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
     * Clean up any orphaned bubble elements from this attack
     */
    cleanupOrphanedBubbles() {
        try {
            // Find and remove all bubble elements with this attack ID
            const orphanedElements = document.querySelectorAll(`.projectile[data-blubbstrahl-attack-id="${this.id}"]`);
            orphanedElements.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            // Also try with more generic selector as fallback
            const allBubbles = document.querySelectorAll('.projectile.blubbstrahl');
            allBubbles.forEach(element => {
                // Check if this bubble belongs to a deleted projectile
                const id = element.dataset.projectileId;
                if (!id || !activeBubbleProjectiles.has(id)) {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }
            });
        } catch (error) {
            console.warn("Error during bubble cleanup:", error);
        }
    }
    
    /**
     * Emergency cleanup if something goes catastrophically wrong
     */
    emergencyCleanup() {
        console.warn(`Emergency cleanup for Blubbstrahl attack ${this.id}`);
        
        // Clear animation in progress flag
        if (this.attacker.character) {
            this.attacker.character.animationInProgress = false;
            this.attacker.character.isUsingBlubbstrahl = false;
            
            // Clear flags on attacker position object too
            if (this.attacker) {
                this.attacker.isUsingBlubbstrahl = false;
                this.attacker.cannotMove = false;
                this.attacker.attackAnimationActive = false;
            }
        }
        
        // Force cleanup of all resources
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Remove all bubble elements from DOM
        try {
            const allBubbles = document.querySelectorAll('.projectile.blubbstrahl');
            allBubbles.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            // Also clean up any impact effects
            const allImpacts = document.querySelectorAll('.bubble-pop-burst, .bubble-particle');
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
        activeBlubbstrahlAttacks.delete(this);
    }
}

/**
 * Global cleanup function for Blubbstrahl - can be called from outside to force cleanup
 */
export function cleanupAllBlubbstrahlEffects() {    
    // Clean up all active attacks
    for (const attack of [...activeBlubbstrahlAttacks]) {
        if (attack) {
            attack.emergencyCleanup();
        }
    }
    activeBlubbstrahlAttacks.clear();
    
    // Clean up all active projectiles
    for (const [id, projectile] of activeBubbleProjectiles.entries()) {
        if (projectile && !projectile.removed) {
            projectile.destroy();
        }
    }
    activeBubbleProjectiles.clear();
    
    // Final DOM cleanup
    try {
        const allBubbles = document.querySelectorAll('.projectile.blubbstrahl');
        allBubbles.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        const allImpacts = document.querySelectorAll('.bubble-pop-burst, .bubble-particle');
        allImpacts.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    } catch (error) {
        console.error("Error during global Blubbstrahl cleanup:", error);
    }
}

/**
 * Create and execute a Blubbstrahl attack
 * @param {Object} attacker - The attacking Pokemon
 * @param {Object} target - The target Pokemon
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits (for dodge calculation)
 * @param {Function} callback - Callback when attack completes
 * @param {Array} activeProjectiles - Array to track projectiles (for compatibility)
 * @returns {BlubbstrahlAttack} - The created attack instance
 */
export function createBlubbstrahl(attacker, target, attack, isHit, callback, activeProjectiles, attackSuccesses = 0) {
    // Add styles if not already added
    addBlubbstrahlStyles();
    
    // Log the attack
    logBattleEvent(`${attacker.character.name} spuckt eine Kette von Blasen aus!`);
    
    // Create the Blubbstrahl attack with attack successes
    const blubbstrahlAttack = new BlubbstrahlAttack(attacker, target, attack, callback, attackSuccesses);
    
    // Handle dodge attempt for first bubble only
    if (isHit) {
        const attackRoll = { netSuccesses: Math.max(attackSuccesses, 3) }; // Use actual successes or minimum 3
        const dodgeResult = blubbstrahlAttack.handleDodgeAttempt(attackRoll);
        
        if (dodgeResult.success) {
            logBattleEvent(`${target.character.name} weicht der ersten Blase aus, aber andere Blasen können trotzdem treffen!`);
            // Mark target as dodging so first bubble will miss
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
    followProjectile(blubbstrahlAttack);
    
    return blubbstrahlAttack;
}

/**
 * Handle Blubbstrahl attack execution
 * @param {Object} attacker - Attacker character data
 * @param {Object} target - Target character data
 * @param {Object} selectedAttack - The selected attack
 * @param {string} charId - Attacker character ID
 * @param {string} targetId - Target character ID
 * @param {Function} callback - Safe callback function
 * @returns {Promise<Object>} - Attack results
 */
export async function handleBlubbstrahlAttack(attacker, target, selectedAttack, charId, targetId, callback) {
    // Check if ally blocks line of sight - block attack if so
    const isAllyBlocking = isLineOfSightBlockedByAlly(attacker, target);
    if (isAllyBlocking) {
        logBattleEvent(`${attacker.character.name} kann Blubbstrahl nicht einsetzen - ein Verbündeter blockiert die Schusslinie!`);
        
        // Clear animation flags
        if (attacker.character) {
            attacker.character.animationInProgress = false;
            attacker.character.isUsingBlubbstrahl = false;
            attacker.isUsingBlubbstrahl = false;
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
            log: [`${attacker.character.name} kann Blubbstrahl nicht einsetzen - Verbündeter im Weg!`]
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
        attacker.character.isUsingBlubbstrahl = true;
        
        // Also set flags on the attacker position object
        attacker.isUsingBlubbstrahl = true;
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
    
    // Store the final attack roll successes for initiative penalty application
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
            createBlubbstrahl(attacker, target, selectedAttack, false, () => {
                resolve(attackResult);
            }, [], finalAttackSuccesses);
        });
    }
    
    // Attack hits, attempt dodge
    attackResult.success = true;
    attackResult.log.push(`${attacker.character.name}s Angriff trifft mit ${attackRoll.netSuccesses} Erfolgen.`);
    
    // Store original target position before dodge attempt
    const originalTargetPosition = {
        x: target.x,
        y: target.y,
        character: target.character
    };
    
    // Check if target can dodge
    const dodgeResult = attemptDodge(attacker, target, attackRoll, selectedAttack);
    
    // If dodge is successful, execute dodge animation and retarget to original position
    if (dodgeResult.success) {
        attackResult.log.push(`${target.character.name} versucht dem Blubbstrahl auszuweichen!`);
        
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
                    
                    // Create Blubbstrahl attack targeting the original position
                    attackResult.log.push(`${attacker.character.name}s Blubbstrahl zielt nun auf die vorherige Position des Ziels!`);
                    createBlubbstrahl(attacker, originalTargetPosition, selectedAttack, true, () => {
                        resolve(attackResult);
                    }, [], finalAttackSuccesses);
                });
            });
        }
    }
    
    // If no dodge or no valid dodge position, just create the Blubbstrahl attack
    return new Promise(resolve => {
        createBlubbstrahl(attacker, target, selectedAttack, true, () => {
            resolve(attackResult);
        }, [], finalAttackSuccesses);
    });
}