/**
 * Blitzkanone (Lightning Cannon) Attack Implementation - FIXED VERSION
 * A high-velocity piercing lightning projectile that hits all targets in its path
 */

import { TILE_SIZE, GRID_SIZE } from '../config.js';
import { getCharacterPositions } from '../characterPositions.js';
import { doesPokemonOccupyTile } from '../pokemonDistanceCalculator.js';
import { addStatusEffect } from '../statusEffects.js';
import { updateInitiativeHP } from '../initiativeDisplay.js';
import { logBattleEvent } from '../battleLog.js';
import { applyDamageAndEffects, calculateFinalDamage } from '../damage.js';
import { followProjectile, stopFollowingProjectile, focusOnCharacter } from '../cameraSystem.js';
import { calculateSizeCategory } from '../pokemonSizeCalculator.js';

/**
 * Add CSS styles for Blitzkanone visual effects
 */
export function addBlitzkannoneStyles() {
    const styleId = 'blitzkanone-styles';
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Blitzkanone projectile styling */
        .projectile.blitzkanone {
            width: 24px;
            height: 24px;
            background: radial-gradient(circle, #fff 0%, #4FC3F7 30%, #1976D2 70%, #0D47A1 100%);
            border-radius: 50%;
            box-shadow: 
                0 0 20px #4FC3F7,
                0 0 40px #1976D2,
                inset 0 0 10px #fff;
            animation: lightning-pulse 0.1s infinite alternate;
            z-index: 150;
            filter: brightness(1.5);
        }
        
        /* Size scaling classes for projectiles */
        .projectile.blitzkanone.size-1 {
            width: 24px;
            height: 24px;
        }
        .projectile.blitzkanone.size-2 {
            width: 32px;
            height: 32px;
        }
        .projectile.blitzkanone.size-3 {
            width: 42px;
            height: 42px;
        }
        .projectile.blitzkanone.size-4 {
            width: 54px;
            height: 54px;
        }
        .projectile.blitzkanone.size-5 {
            width: 68px;
            height: 68px;
        }
        
        /* Lightning pulse animation for the projectile */
        @keyframes lightning-pulse {
            0% { 
                box-shadow: 
                    0 0 20px #4FC3F7,
                    0 0 40px #1976D2,
                    inset 0 0 10px #fff;
                transform: translate(-50%, -50%) scale(1);
            }
            100% { 
                box-shadow: 
                    0 0 30px #4FC3F7,
                    0 0 60px #1976D2,
                    0 0 80px #0D47A1,
                    inset 0 0 15px #fff;
                transform: translate(-50%, -50%) scale(1.1);
            }
        }
        
        /* Lightning aura around the caster */
        .lightning-aura {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            animation: lightning-aura 1s ease-out forwards;
            pointer-events: none;
            z-index: 120;
        }
        
        @keyframes lightning-aura {
            0% {
                box-shadow: 
                    0 0 0 0 rgba(79, 195, 247, 0.8),
                    0 0 0 0 rgba(25, 118, 210, 0.6);
                opacity: 1;
            }
            50% {
                box-shadow: 
                    0 0 30px 15px rgba(79, 195, 247, 0.6),
                    0 0 60px 30px rgba(25, 118, 210, 0.4);
                opacity: 0.9;
            }
            100% {
                box-shadow: 
                    0 0 60px 30px rgba(79, 195, 247, 0),
                    0 0 120px 60px rgba(25, 118, 210, 0);
                opacity: 0;
            }
        }
        
        /* Lightning trail particles - also scale with size */
        .lightning-trail {
            position: absolute;
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, #fff 0%, #4FC3F7 50%, transparent 100%);
            border-radius: 50%;
            animation: trail-fade 0.8s ease-out forwards;
            pointer-events: none;
            z-index: 140;
        }
        
        .lightning-trail.size-2 {
            width: 12px;
            height: 12px;
        }
        .lightning-trail.size-3 {
            width: 16px;
            height: 16px;
        }
        .lightning-trail.size-4 {
            width: 20px;
            height: 20px;
        }
        .lightning-trail.size-5 {
            width: 24px;
            height: 24px;
        }
        
        @keyframes trail-fade {
            0% {
                opacity: 1;
                transform: scale(1);
                box-shadow: 0 0 10px #4FC3F7;
            }
            100% {
                opacity: 0;
                transform: scale(0.3);
                box-shadow: 0 0 5px transparent;
            }
        }
        
        /* Lightning crackling effect around caster */
        .lightning-crackle {
            position: absolute;
            width: 2px;
            height: 20px;
            background: linear-gradient(to bottom, transparent, #fff, #4FC3F7, transparent);
            animation: crackle 0.1s infinite alternate;
            pointer-events: none;
            z-index: 130;
            transform-origin: bottom center;
        }
        
        @keyframes crackle {
            0% { 
                opacity: 0.8;
                transform: rotate(0deg) scaleY(1);
            }
            100% { 
                opacity: 1;
                transform: rotate(5deg) scaleY(1.2);
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Blitzkanone Projectile Class - extends basic projectile with piercing behavior
 */
class BlitzkannoneProjectile {
    constructor(attacker, target, attack, isHit = true, callback = null, activeProjectiles = []) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.isHit = isHit;
        this.callback = callback;
        this.removed = false;
        this.creationTime = Date.now();
        this.type = 'blitzkanone'; // Add type for projectile system compatibility
        
        // Calculate size category for scaling
        this.sizeCategory = calculateSizeCategory(attacker.character) || 1;
        
        // High velocity for Blitzkanone (reduced slightly for better camera following)
        this.speed = 800; // Very fast but followable
        this.initialSpeed = this.speed;
        
        // Track hit targets to avoid hitting the same target multiple times
        this.hitTargets = new Set();
        
        // FIXED: Add maximum travel distance to prevent infinite travel
        this.maxTravelDistance = GRID_SIZE * TILE_SIZE * 1.2; // 1.2x grid size (tighter limit)
        this.traveledDistance = 0;
        
        // Calculate start position (center of attacker's tile)
        this.x = attacker.x * TILE_SIZE + TILE_SIZE / 2;
        this.y = attacker.y * TILE_SIZE + TILE_SIZE / 2;
        this.startX = this.x;
        this.startY = this.y;
        
        // Calculate target position and direction
        if (isHit) {
            this.targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
            this.targetY = target.y * TILE_SIZE + TILE_SIZE / 2;
        } else {
            // For misses, calculate a point beyond the target
            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Miss by deviating the angle slightly
            const angle = Math.atan2(dy, dx);
            const missAngle = angle + (Math.random() - 0.5) * 0.5; // Up to 0.25 radians deviation
            
            // FIXED: More conservative extended distance for misses
            const extendedDistance = Math.max(6, distance + 3);
            this.targetX = attacker.x * TILE_SIZE + TILE_SIZE / 2 + Math.cos(missAngle) * extendedDistance * TILE_SIZE;
            this.targetY = attacker.y * TILE_SIZE + TILE_SIZE / 2 + Math.sin(missAngle) * extendedDistance * TILE_SIZE;
        }
        
        // Calculate direction vector
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.dirX = dx / distance;
        this.dirY = dy / distance;
        
        // Create visual element
        this.element = this.createVisualElement();
        
        // Add to active projectiles
        activeProjectiles.push(this);
        
        // Follow this projectile with the camera
        followProjectile(this);
        
        // Start trail particle generation
        this.startTrailGeneration();
    }
    
    /**
     * Create the visual element for the Blitzkanone projectile
     */
    createVisualElement() {
        const element = document.createElement('div');
        element.className = `projectile blitzkanone size-${this.sizeCategory}`;
        element.dataset.projectileId = this.id;
        element.dataset.creationTime = Date.now();
        
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) {
            console.error('Battlefield element not found for Blitzkanone positioning');
            return element;
        }
        
        element.style.position = 'absolute';
        element.style.left = `${this.x}px`;
        element.style.top = `${this.y}px`;
        element.style.zIndex = '150';
        
        battlefield.appendChild(element);
        return element;
    }
    
    /**
     * Start generating trail particles behind the projectile
     */
    startTrailGeneration() {
        this.trailInterval = setInterval(() => {
            if (this.removed) {
                clearInterval(this.trailInterval);
                return;
            }
            
            this.createTrailParticle();
        }, 30); // Create a trail particle every 30ms
    }
    
    /**
     * Create a trail particle at the current position
     */
    createTrailParticle() {
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) return;
        
        const particle = document.createElement('div');
        particle.className = `lightning-trail size-${this.sizeCategory}`;
        particle.style.position = 'absolute';
        particle.style.left = `${this.x}px`;
        particle.style.top = `${this.y}px`;
        particle.style.transform = 'translate(-50%, -50%)';
        
        battlefield.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 800);
    }
    
    /**
     * Update the projectile's position and check for collisions
     */
    update(deltaTime) {
        if (this.removed) return false;
        
        // Move the projectile
        const moveDistance = this.speed * deltaTime;
        this.x += this.dirX * moveDistance;
        this.y += this.dirY * moveDistance;
        
        // FIXED: Track traveled distance
        this.traveledDistance += moveDistance;
        
        // FIXED: Check if traveled too far (prevents infinite travel)
        if (this.traveledDistance > this.maxTravelDistance) {
            this.destroy();
            return false;
        }
        
        // FIXED: Tighter bounds checking for high-speed projectiles
        if (this.isOutOfBounds()) {
            this.destroy();
            return false;
        }
        
        // Check for collisions (but don't destroy on collision)
        const collision = this.checkCollisions();
        if (collision) {
            this.handleCollision(collision);
        }
        
        return true;
    }
    
    /**
     * FIXED: Tighter bounds checking for high-speed projectiles
     */
    isOutOfBounds() {
        const gridPixelSize = GRID_SIZE * TILE_SIZE;
        // FIXED: Very tight buffer for high-speed projectiles
        const buffer = Math.min(gridPixelSize * 0.05, 50); // Max 50px buffer or 5% of grid
        
        return (this.x < -buffer || this.x >= gridPixelSize + buffer || 
                this.y < -buffer || this.y >= gridPixelSize + buffer);
    }
    
    /**
     * Check for collisions with characters
     */
    checkCollisions() {
        if (this.removed) return null;
        
        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        const characterPositions = getCharacterPositions();
        
        for (const charId in characterPositions) {
            const charPos = characterPositions[charId];
            
            // Skip if already hit, defeated, dodging, or is the attacker
            if (this.hitTargets.has(charId) || charPos.isDefeated || 
                charPos.isDodging || charPos === this.attacker) {
                continue;
            }
            
            // Check if projectile hits this character
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
     * Handle collision with a character (piercing - don't destroy projectile)
     */
    handleCollision(collision) {
        if (collision.position.isDefeated || this.hitTargets.has(collision.id)) {
            return;
        }
        
        // Mark this target as hit to prevent multiple hits
        this.hitTargets.add(collision.id);
        
        // Log the hit
        const isFriendlyFire = collision.teamIndex === this.attacker.teamIndex;
        const attackName = this.attack.weaponName || 'Blitzkanone';
        
        if (isFriendlyFire) {
            logBattleEvent(`${this.attacker.character.name}s ${attackName} durchbohrt Teammitglied ${collision.character.name}!`);
        } else {
            logBattleEvent(`${this.attacker.character.name}s ${attackName} durchbohrt ${collision.character.name}!`);
        }
        
        // Calculate and apply damage
        const damageData = calculateFinalDamage(this.attack, collision.position, this.attacker, { netSuccesses: 2 });
        
        // Apply damage and effects
        const attackResult = { log: [] };
        applyDamageAndEffects(
            collision.position, 
            this.attacker, 
            this.attack, 
            damageData, 
            attackResult, 
            collision.id, 
            null,
            { netSuccesses: 2 }
        );
        
        // Apply paralysis effect
        const paralysisApplied = addStatusEffect(collision.character, 'paralyzed', {
            sourceId: this.attacker.character.uniqueId,
            sourceName: this.attacker.character.name
        });
        
        if (paralysisApplied) {
            logBattleEvent(`${collision.character.name} wurde durch den Blitz paralysiert!`);
        }
        
        // Update HP display
        updateInitiativeHP();
        
        // Log any additional effects
        attackResult.log.forEach(message => {
            logBattleEvent(message);
        });
    }
    
    /**
     * FIXED: Destroy the projectile and return camera to attacker
     */
    destroy() {
        if (this.removed) return;
        this.removed = true;
        
        // FIXED: Stop following this projectile
        stopFollowingProjectile();
        
        // FIXED: Refocus on attacker if they're still active (same logic as regular projectiles)
        if (this.attacker && !this.attacker.isDefeated) {
            // Find the attacker's character ID
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
        
        // Clear trail generation
        if (this.trailInterval) {
            clearInterval(this.trailInterval);
        }
        
        // Remove visual element
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        // Call callback
        if (this.callback) {
            this.callback();
        }
    }
}

/**
 * Create lightning crackling effect around the attacker
 */
function createLightningAura(attackerId) {
    const characterElements = document.querySelectorAll(`[data-character-id="${attackerId}"]`);
    
    characterElements.forEach(charEl => {
        // Create aura effect
        const aura = document.createElement('div');
        aura.className = 'lightning-aura';
        charEl.appendChild(aura);
        
        // Create crackling lightning bolts around the character
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const crackle = document.createElement('div');
                crackle.className = 'lightning-crackle';
                
                // Random position around the character
                const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
                const distance = 20 + Math.random() * 15;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                crackle.style.left = `${50 + (x / TILE_SIZE) * 100}%`;
                crackle.style.top = `${50 + (y / TILE_SIZE) * 100}%`;
                crackle.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
                
                charEl.appendChild(crackle);
                
                // Remove after animation
                setTimeout(() => {
                    if (crackle.parentNode) {
                        crackle.parentNode.removeChild(crackle);
                    }
                }, 200);
            }, i * 20); // Stagger the crackling effects
        }
        
        // Remove aura after animation
        setTimeout(() => {
            if (aura.parentNode) {
                aura.parentNode.removeChild(aura);
            }
        }, 1000);
    });
}

/**
 * Create and fire a Blitzkanone projectile
 */
export function createBlitzkanone(attacker, target, attack, isHit = true, callback = null, activeProjectiles = []) {
    // Find attacker's character ID for visual effects
    const characterPositions = getCharacterPositions();
    let attackerId = null;
    
    for (const charId in characterPositions) {
        if (characterPositions[charId] === attacker) {
            attackerId = charId;
            break;
        }
    }
    
    // Create lightning aura around the attacker (non-blocking)
    if (attackerId) {
        createLightningAura(attackerId);
    }
    
    // Create the projectile immediately
    const projectile = new BlitzkannoneProjectile(attacker, target, attack, isHit, callback, activeProjectiles);
    
    return projectile;
}

/**
 * Apply GENA penalty for Blitzkanone (-2 successes)
 * This should be called from the attack system before rolling dice
 */
export function applyBlitzkanoneGENAPenalty(attackRoll) {
    if (attackRoll && typeof attackRoll.netSuccesses === 'number') {
        attackRoll.netSuccesses = Math.max(-10, attackRoll.netSuccesses - 2);
        return attackRoll;
    }
    return attackRoll;
}