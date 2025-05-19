/**
 * Projectile system for Pokémon attacks 
 * Completely rewritten to handle Pokémon attacks instead of weapons
 * Updated to handle concurrent animations with Pokemon movement
 */

import { TILE_SIZE, GRID_SIZE } from './config.js';
import { getCharacterPositions } from './characterPositions.js';
import { followProjectile, stopFollowingProjectile, focusOnCharacter } from './cameraSystem.js';
import { createDamageNumber } from './damageNumbers.js';
import { rollDamageWithValue } from './diceRoller.js';
import { updateInitiativeHP } from './initiativeDisplay.js';
import { getTeamColor } from './utils.js';
import { logBattleEvent } from './battleLog.js';
import { doesPokemonOccupyTile } from './pokemonDistanceCalculator.js';
import { calculateSizeCategory } from './pokemonSizeCalculator.js';
import { createRankenhieb, addRankenhiebStyles } from './Attacken/rankenhieb.js';
import { createGiftpuder, addGiftpuderStyles } from './Attacken/giftpuder.js';
import { addConeStyles, createConeIndicator, removeConeIndicator, isPositionInCone, findCharactersInCone } from './attackCone.js';
import { createSchlafpuder, addSchlafpuderStyles } from './Attacken/schlafpuder.js';
import { createStachelspore, addStachelsporeStyles } from './Attacken/stachelspore.js';
import { createSandwirbel, addSandwirbelStyles, isValidSandwirbelTarget } from './Attacken/sandwirbel.js';
import { updatePokemonHPBar } from './pokemonOverlay.js';

// Ensure styles are added at initialization
addRankenhiebStyles();
addGiftpuderStyles(); 
addSchlafpuderStyles();
addStachelsporeStyles();
addSandwirbelStyles();
addConeStyles(); 

// Maximum lifetime for area effect attacks in milliseconds
const AREA_EFFECT_MAX_LIFETIME = 800; 
const PARTICLE_CLEANUP_INTERVAL = 300; // Check for stale particles frequently

// Store all active projectiles
let activeProjectiles = [];

// Store the last frame timestamp for delta time calculation
let lastFrameTime = 0;

// Flag to indicate if update is in progress
let updateInProgress = false;

// Projectile speeds in pixels per second
const PROJECTILE_SPEEDS = {
    glut: 350,            // Fire attacks
    aquaknarre: 300,      // Water attacks
    rankenhieb: 500,      // Vine attacks (faster as they're direct)
    donnerschock: 800,    // Electric attacks (very fast)
    steinwurf: 400,       // Rock attacks
    giftpuder: 200,       // Poison powder (slow cloud)
    stachelspore: 200,    // Paralyze powder (slow cloud)
    schlafpuder: 200,     // Sleep powder (slow cloud)
    sandwirbel: 200,      // Sand attack (slow cloud)
    default: 400          // Default speed
};

/**
 * Projectile class representing a Pokémon attack projectile
 */
class Projectile {
    /**
     * Create a new projectile
     * @param {Object} attacker - The Pokémon who used the attack
     * @param {Object} target - The target position/Pokémon
     * @param {Object} attack - The attack data (name, damage, etc.)
     * @param {boolean} isHit - Whether the projectile is intended to hit (false for misses)
     * @param {Function} callback - Function to call when projectile is destroyed
     * @param {number} speedModifier - Optional modifier for projectile speed (default: 1.0)
     * @param {boolean} skipDamage - Whether to skip damage application (for visuals only)
     * @param {number} damageValue - Optional pre-calculated damage value
     */
    constructor(attacker, target, attack, isHit = true, callback = null, speedModifier = 1.0, skipDamage = false, damageValue = null) {
        this.id = Math.random().toString(36).substr(2, 9); // Generate unique ID
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.isHit = isHit;
        this.callback = callback;
        this.attackName = attack.weaponName ? attack.weaponName.toLowerCase() : 'default';
        this.removed = false;
        this.damage = attack.damage || 0;
        this.teamIndex = attacker.teamIndex;
        this.skipDamage = skipDamage; 
        this.damageValue = damageValue;

        // Add initial and maximum speed properties
        this.initialSpeed = this.getProjectileSpeed() * speedModifier;
        this.speed = this.initialSpeed;
        this.maxSpeed = this.initialSpeed * 4.0; // Cap at 4x initial speed
        
        // Add acceleration factor (pixels per second squared)
        this.acceleration = this.initialSpeed * 2.0; // Double speed each second
        
        // Add extra acceleration for misses to clear them from the field faster
        if (!isHit) {
            this.acceleration *= 1.5; // 50% more acceleration for misses
        }
        
        // Calculate start position (center of attacker's tile)
        this.x = attacker.x * TILE_SIZE + TILE_SIZE / 2;
        this.y = attacker.y * TILE_SIZE + TILE_SIZE / 2;
        
        // Calculate target position
        if (isHit) {
            // Aim directly at target's center
            this.targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
            this.targetY = target.y * TILE_SIZE + TILE_SIZE / 2;
        } else {
            // Calculate the straight-line distance between attacker and target
            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Scale deviation based on distance - larger deviation for longer distances
            // Minimum deviation of 1.5 tiles, scaling up with distance
            const baseDeviation = Math.max(1.5, distance * 0.5);
            
            // Add randomness (between 100-150% of base deviation)
            const deviationFactor = baseDeviation * (1.0 + (Math.random() * 0.5));
            
            // Calculate vector from attacker to target
            const vectorX = dx / distance;
            const vectorY = dy / distance;
            
            // Calculate perpendicular vector
            const perpX = -vectorY;
            const perpY = vectorX;
            
            // Randomly choose left or right deviation
            const sideMultiplier = Math.random() < 0.5 ? 1 : -1;
            
            // Add a slight forward/backward random component for natural-looking misses
            // This creates an elliptical pattern of misses around the target
            const forwardDeviation = (Math.random() - 0.3) * (distance * 0.3);
            
            // Calculate miss position with dramatic deviation
            this.targetX = attacker.x * TILE_SIZE + TILE_SIZE / 2 + 
                        (dx + sideMultiplier * perpX * deviationFactor + vectorX * forwardDeviation) * TILE_SIZE;
            this.targetY = attacker.y * TILE_SIZE + TILE_SIZE / 2 + 
                        (dy + sideMultiplier * perpY * deviationFactor + vectorY * forwardDeviation) * TILE_SIZE;
            
            // Double-check that our calculated miss point will actually miss
            // by comparing it to the target's position and size
            const targetSize = calculateSizeCategory(target.character) || 1;
            const targetRadius = (targetSize / 2) * TILE_SIZE;
            
            // Calculate distance from miss point to target center (in grid coordinates)
            const missToTargetX = (this.targetX / TILE_SIZE) - (target.x + 0.5);
            const missToTargetY = (this.targetY / TILE_SIZE) - (target.y + 0.5);
            const missDistance = Math.sqrt(missToTargetX * missToTargetX + missToTargetY * missToTargetY);
            
            // If we're still somehow hitting the target, increase the deviation dramatically
            if (missDistance < (targetRadius / TILE_SIZE) + 0.5) {
                // Force a much larger deviation
                const emergencyDeviation = deviationFactor * 2.5;
                this.targetX = attacker.x * TILE_SIZE + TILE_SIZE / 2 + 
                            (dx + sideMultiplier * perpX * emergencyDeviation) * TILE_SIZE;
                this.targetY = attacker.y * TILE_SIZE + TILE_SIZE / 2 + 
                            (dy + sideMultiplier * perpY * emergencyDeviation) * TILE_SIZE;
            }
        }
        
        // Calculate direction vector
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.dirX = dx / distance;
        this.dirY = dy / distance;
        
        // Determine projectile type and speed
        this.type = this.getProjectileType();
        this.speed = this.getProjectileSpeed() * speedModifier;
        
        // Add lifetime tracking
        this.creationTime = Date.now();
        
        // For area effect attacks (powders), add special max lifetime
        if (this.isAreaEffect()) {
            this.maxLifetime = AREA_EFFECT_MAX_LIFETIME;
            
            // Store the initial position and direction for cone calculations
            this.initialX = this.x;
            this.initialY = this.y;
            this.initialDirX = this.dirX;
            this.initialDirY = this.dirY;
            this.coneEdgeReached = false;
            this.coneAngle = attack.cone || 45; // Default 45 degrees if not specified
            this.range = attack.range || 3; // Default range if not specified
        }
        
        // For rankenhieb (vine whip), store the start position for drawing the vine
        if (this.type === 'rankenhieb') {
            this.startX = this.x;
            this.startY = this.y;
        }
        
        // Create the visual element
        this.element = this.createVisualElement();

        // Follow this projectile with the camera
        followProjectile(this);
        
        // Add to active projectiles
        activeProjectiles.push(this);
    }
    
    /**
     * Determine the projectile type based on attack name
     * @returns {string} - Type of projectile
     */
    getProjectileType() {
        const attackLower = this.attackName.toLowerCase();
        
        // Check for specific attack types
        if (attackLower.includes('glut')) {
            return 'glut';
        } else if (attackLower.includes('aquaknarre')) {
            return 'aquaknarre';
        } else if (attackLower.includes('rankenhieb')) {
            return 'rankenhieb';
        } else if (attackLower.includes('donnerschock')) {
            return 'donnerschock';
        } else if (attackLower.includes('steinwurf')) {
            return 'steinwurf';
        } else if (attackLower.includes('giftpuder')) {
            return 'giftpuder';
        } else if (attackLower.includes('stachelspore')) {
            return 'stachelspore';
        } else if (attackLower.includes('schlafpuder')) {
            return 'schlafpuder';
        } else if (attackLower.includes('sandwirbel')) {
            return 'sandwirbel';
    }
        
        return 'default';
    }
    
    /**
     * Check if this attack is an area effect (powder)
     * @returns {boolean} - Is this an area effect attack
     */
    isAreaEffect() {
        return (this.attack && this.attack.cone !== undefined);
    }
    
    /**
     * Get the projectile speed based on its type
     * @returns {number} - Speed in pixels per second
     */
    getProjectileSpeed() {
        return PROJECTILE_SPEEDS[this.type] || PROJECTILE_SPEEDS.default;
    }
    
    /**
     * Create the visual element for the projectile
     * @returns {HTMLElement} - The projectile DOM element
     */
    createVisualElement() {
        const element = document.createElement('div');
        element.className = `projectile ${this.type}`;
        
        // Add data attribute with unique ID for easier cleanup
        element.dataset.projectileId = this.id;
        element.dataset.creationTime = Date.now();
        
        // Find the battlefield for positioning
        const battlefield = document.querySelector('.battlefield-grid');
        
        if (!battlefield) {
            console.error('Battlefield element not found for projectile positioning');
            return element;
        }
        
        // Position the element relative to the battlefield, not the viewport
        element.style.position = 'absolute';
        element.style.left = `${this.x}px`;
        element.style.top = `${this.y}px`;
        
        // For rankenhieb (vine), create a special element that connects attacker and target
        if (this.type === 'rankenhieb') {
            // Calculate the length and angle of the vine
            const dx = this.targetX - this.startX;
            const dy = this.targetY - this.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Set the width to the distance and transform
            element.style.width = `${distance}px`;
            element.style.transformOrigin = 'left center';
            element.style.transform = `translate(0, -50%) rotate(${angle}deg)`;
        } else {
            // Calculate angle for rotation (in degrees)
            const angle = Math.atan2(this.dirY, this.dirX) * 180 / Math.PI;
            element.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        }
        
        // Set z-index to ensure it's above the battlefield but below UI
        element.style.zIndex = '100';
        
        // Add the element to the battlefield instead of document.body
        battlefield.appendChild(element);
        
        return element;
    }


    /**
     * Update the projectile's logical state (not DOM)
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} - Whether the projectile should be kept (false if destroyed)
     */
    update(deltaTime) {
        // If already marked as removed, stop updating immediately
        if (this.removed) return false;
        
        // Check age-based destruction for area effects first
        if (this.maxLifetime) {
            const age = Date.now() - this.creationTime;
            if (age > this.maxLifetime) {
                this.coneEdgeReached = true; // Consider timeout as reaching edge for visual effect
                this.destroy();
                return false;
            }
        }
        
        // Apply acceleration to speed
        this.speed = Math.min(this.speed + this.acceleration * deltaTime, this.maxSpeed);
        
        // Move the projectile with the updated speed
        const moveDistance = this.speed * deltaTime;
        this.x += this.dirX * moveDistance;
        this.y += this.dirY * moveDistance;
        
        // Check if projectile went off the battlefield
        if (this.isOutOfBounds()) {
            this.coneEdgeReached = true; // Consider out of bounds as reaching edge
            this.destroy();
            return false;
        }
        
        // For area effect attacks, check if they've exceeded their range or left the cone
        if (this.isAreaEffect()) {
            // Calculate distance traveled from starting point
            const distTraveled = Math.sqrt(Math.pow(this.x - this.initialX, 2) + Math.pow(this.y - this.initialY, 2));
            
            // Convert range from tiles to pixels
            const rangeInPixels = this.range * TILE_SIZE;
            
            // Destroy if exceeds range
            if (distTraveled > rangeInPixels) {
                this.coneEdgeReached = true;
                this.destroy();
                return false;
            }
            
            // Check if the particle has left the cone angle
            // Calculate angle between current direction and original direction
            const currentDirX = this.x - this.initialX;
            const currentDirY = this.y - this.initialY;
            const currentDist = Math.sqrt(currentDirX * currentDirX + currentDirY * currentDirY);
            
            if (currentDist > 0) {
                const normalizedCurrentX = currentDirX / currentDist;
                const normalizedCurrentY = currentDirY / currentDist;
                
                // Calculate dot product with INITIAL direction
                const dotProduct = normalizedCurrentX * this.initialDirX + normalizedCurrentY * this.initialDirY;
                
                // Convert cone angle to radians
                const coneHalfAngle = (this.coneAngle / 2) * (Math.PI / 180);
                
                // If angle is too wide (cos value too small), destroy the projectile
                if (dotProduct < Math.cos(coneHalfAngle)) {
                    this.coneEdgeReached = true;
                    this.destroy();
                    return false;
                }
            }
        }
        
        // Check for collisions with characters
        const collision = this.checkCollisions();
        if (collision) {
            // Handle the collision
            this.handleCollision(collision);
            
            // For non-area effects, destroy after handling collision
            // This ensures proper cleanup while preventing multiple hits
            if (!this.isAreaEffect()) {
                this.destroy();
                return false;
            }
            // Area effects continue processing
        }
        
        return true;
    }
    
    /**
     * Check if the projectile is out of the battlefield bounds
     * @returns {boolean} - Whether the projectile is out of bounds
     */
    isOutOfBounds() {
        // Grid size in pixels
        const gridPixelSize = GRID_SIZE * TILE_SIZE;
        
        // Add a buffer zone outside the visible grid (20% of grid size)
        const buffer = gridPixelSize * 0.2;
        
        // If projectile coordinates are beyond the buffer zone, it's out of bounds
        if (this.x < -buffer || this.x >= gridPixelSize + buffer || 
            this.y < -buffer || this.y >= gridPixelSize + buffer) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check for collisions with characters, considering dodge state
     * @returns {Object|null} - Collided character data or null if no collision
     */
    checkCollisions() {
        // If projectile is already marked as removed, don't check for collisions
        if (this.removed) return null;
        
        // Convert pixel position to grid coordinates
        const gridX = Math.floor(this.x / TILE_SIZE);
        const gridY = Math.floor(this.y / TILE_SIZE);
        
        // Get all character positions
        const characterPositions = getCharacterPositions();
        
        // Track the closest collision
        let closestCollision = null;
        let minDistance = Infinity;
        
        // Check if there's any character at this position
        for (const charId in characterPositions) {
            const charPos = characterPositions[charId];
            
            // Skip if character is already defeated
            if (charPos.isDefeated) continue;
            
            // Skip characters that are successfully dodging
            if (charPos.isDodging) continue;
            
            // Skip the attacker (can't hit yourself)
            if (charPos === this.attacker) continue;
            
            // Use doesPokemonOccupyTile to check if projectile is within any tile occupied by the Pokémon
            if (doesPokemonOccupyTile(charPos, gridX, gridY)) {
                // Calculate distance from projectile start to collision
                const dx = charPos.x - this.attacker.x;
                const dy = charPos.y - this.attacker.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // If this is closer than our current closest collision, use this one
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCollision = {
                        id: charId,
                        character: charPos.character,
                        position: charPos,
                        teamIndex: charPos.teamIndex
                    };
                }
            }
        }
        
        return closestCollision;
    }
    
    /**
     * Handle collision with a character
     * @param {Object} collision - Collision data
     */
    handleCollision(collision) {
        // Skip if character is already defeated
        if (collision.position.isDefeated) {
            return;
        }
        
        // Check if this is the intended target
        const isIntendedTarget = collision.position.x === this.target.x && 
                                collision.position.y === this.target.y;
        
        // Check if the hit character is on the same team (friendly fire)
        const isFriendlyFire = collision.teamIndex === this.teamIndex;
        
        // Always allow friendly fire for misses or area effects
        if (isFriendlyFire && !this.isHit && !this.isAreaEffect()) {
            // Log team hit specifically for misses
            logBattleEvent(`${this.attacker.character.name}'s ${this.attackName} missed its target and hit teammate ${collision.character.name}!`);
        } else if (isFriendlyFire && this.isAreaEffect()) {
            logBattleEvent(`${this.attacker.character.name}'s ${this.attackName} trifft Teammitglied ${collision.character.name}!`);
        } else if (!isIntendedTarget && !isFriendlyFire) {
            // Log hit on unintended enemy target
            logBattleEvent(`${this.attacker.character.name}'s ${this.attackName} missed its target but hit ${collision.character.name} instead!`);
        }
        
        // Calculate damage
        const damageRoll = this.calculateDamage(collision);
        
        // Apply damage to the character
        this.applyDamage(collision, damageRoll);
    }
    
    /**
     * Calculate damage for this projectile
     * @param {Object} target - Target character data
     * @returns {Object} - Damage roll results
     */
    calculateDamage(target) {
        // Standard damage calculation for all attacks
        return rollDamageWithValue(this.damage);
    }
    
    /**
     * Apply damage with a pre-calculated value
     * @param {Object} target - Target data
     * @param {number} damageValue - Pre-calculated damage value
     */
    async applyDamageWithValue(target, damageValue) {
        // Skip if character is already defeated
        if (target.character.currentKP <= 0) {
            return;
        }
        
        // Show damage number
        createDamageNumber(damageValue, target.position, damageValue >= 8);
        
        // Apply damage to target's health
        const oldKP = parseInt(target.character.currentKP, 10);
        target.character.currentKP = Math.max(0, oldKP - damageValue);
        
        // Update HP bar immediately using the overlay system
        try {
            updatePokemonHPBar(target.id, target.character);
        } catch (error) {
            console.error('Failed to update HP bar:', error);
        }
        
        // Update initiative HP display
        updateInitiativeHP();
    }
    
    /**
     * Apply damage to a character
     * @param {Object} target - Target character data
     * @param {Object} damageRoll - Damage roll results
     */
    applyDamage(target, damageRoll) {
        // Skip if character is already defeated
        if (target.character.currentKP <= 0) {
            return;
        }
        
        // Get total damage
        const damageAmount = parseInt(damageRoll.total, 10);
        
        // Only show damage number and update visuals if damage is greater than zero
        if (damageAmount > 0) {
            // Show damage number
            createDamageNumber(damageRoll.total, target.position, damageRoll.total >= 8);
            
            // Apply damage to target's health
            const oldKP = parseInt(target.character.currentKP, 10);
            target.character.currentKP = Math.max(0, oldKP - damageAmount);
            
            // Update HP bar immediately using the overlay system
            try {
                updatePokemonHPBar(target.id, target.character);
            } catch (error) {
                console.error('Failed to update HP bar:', error);
            }
            
            // Handle defeat logic
            if (target.character.currentKP <= 0) {
                // Mark character as defeated
                target.position.isDefeated = true;
                
                // Log defeat
                logBattleEvent(`${target.character.name} is defeated and leaves the battle!`);
                
                // Import and call the function to handle a defeated character
                import('./characterPositions.js').then(module => {
                    module.removeDefeatedCharacter(target.id);
                }).catch(error => {
                    console.error("Error importing module to handle defeated character:", error);
                });
            }
        }
        
        // Update initiative HP display
        updateInitiativeHP();
    }
    
    /**
     * Destroy the projectile
     */
    destroy() {
        // If already marked as removed, avoid duplicate processing
        if (this.removed) return;
        
        // Mark as pending removal, but don't set fully removed yet
        this.pendingRemoval = true;
        
        // Create impact effect if this is an area effect attack reaching the edge
        if (this.isAreaEffect && this.isAreaEffect() && this.coneEdgeReached) {
            this.createImpactEffect();
        }
        
        // Remove the visual element with enhanced error handling
        let elementRemoved = false;
        try {
            if (this.element) {
                // Force removal from DOM regardless of parent node
                if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                    elementRemoved = true;
                } else {
                    try {
                        document.body.removeChild(this.element);
                        elementRemoved = true;
                    } catch (e) {
                        console.warn("Failed to remove element directly from document.body, trying alternative removal");
                        // Try to find the element in the DOM and remove it
                        const elementInDOM = document.querySelector(`.projectile.${this.type}[data-projectile-id="${this.id}"]`);
                        if (elementInDOM) {
                            elementInDOM.parentNode.removeChild(elementInDOM);
                            elementRemoved = true;
                        }
                    }
                }
                
                if (!elementRemoved) {
                    // As a last resort, hide the element and mark for later cleanup
                    console.warn(`Failed direct removal of projectile ${this.id}, hiding and queuing for cleanup`);
                    if (this.element) {
                        this.element.style.display = 'none';
                        this.element.dataset.orphaned = 'true';
                        this.element.dataset.timestamp = Date.now();
                        // Add special class for easy querying later
                        this.element.classList.add('orphaned-projectile');
                        // Don't set elementRemoved to true since we need cleanup later
                    }
                }
                
                // Null out the reference regardless
                this.element = null;
            }
        } catch (error) {
            console.error("Critical error removing projectile element:", error);
            // Try emergency hiding as a fallback
            try {
                if (this.element) {
                    this.element.style.display = 'none';
                    this.element.classList.add('orphaned-projectile');
                    this.element = null;
                }
            } catch (e) {
                console.error("Failed emergency hiding of projectile:", e);
            }
        }

        // Stop following this projectile
        stopFollowingProjectile();
        
        // Refocus on attacker if they're still active
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
        
        // Only mark as fully removed if the element was successfully removed
        // or we've hidden it and nulled the reference
        if (elementRemoved || this.element === null) {
            this.removed = true;
            
            // Remove from active projectiles - force splice by index to ensure removal
            const index = activeProjectiles.findIndex(p => p.id === this.id);
            if (index !== -1) {
                activeProjectiles.splice(index, 1);
            }
            
            // Call the callback if provided
            if (this.callback) {
                try {
                    this.callback(this.coneEdgeReached);
                } catch (error) {
                    console.error("Error in projectile callback:", error);
                }
            }
        } else {
            // If we couldn't remove the element, schedule for cleanup by the safety system
            scheduleOrphanedProjectileCleanup();
        }
    }

    /**
     * Create a visual impact effect when a projectile reaches the edge
     */
    createImpactEffect() {
        try {
            // Find the battlefield for positioning
            const battlefield = document.querySelector('.battlefield-grid') || 
                                document.querySelector('.battlefield-container');
            
            if (!battlefield) return;
            
            // Create impact element
            const impactElement = document.createElement('div');
            impactElement.className = `impact-effect ${this.type}-impact`;
            
            // Position at current projectile location
            impactElement.style.position = 'absolute';
            impactElement.style.left = `${this.x}px`;
            impactElement.style.top = `${this.y}px`;
            impactElement.style.transform = 'translate(-50%, -50%)';
            
            // Add to battlefield
            battlefield.appendChild(impactElement);
            
            // Remove after animation completes
            setTimeout(() => {
                if (impactElement.parentNode) {
                    impactElement.parentNode.removeChild(impactElement);
                }
            }, 300); // Match animation duration
        } catch (error) {
            console.error("Failed to create impact effect:", error);
        }
    }
}

/**
 * Create and fire a projectile for a Pokémon attack
 * @param {Object} attacker - The Pokémon using the attack
 * @param {Object} target - The target Pokémon/position
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack hits or misses
 * @param {Function} callback - Function to call when projectile is destroyed
 * @param {boolean} skipDamage - Whether to skip damage application (visual effect only)
 * @param {number} damageValue - Optional pre-calculated damage value
 * @returns {Projectile} - The created projectile
 */
export function fireProjectile(attacker, target, attack, isHit = true, callback = null, damageValue = null) {
    // Check if line of sight is blocked by an ally (skip for Rankenhieb which can curve)
    if (attack.weaponName?.toLowerCase() !== 'rankenhieb' && isLineOfSightBlockedByAlly(attacker, target)) {
        logBattleEvent(`${attacker.character.name} can't get a clear shot at ${target.character.name} - an ally is in the way.`);
        if (callback) callback();
        return null;
    }

    // Special handling for Rankenhieb (Vine Whip)
    if (attack.weaponName && attack.weaponName.toLowerCase() === 'rankenhieb') {
        return createRankenhieb(attacker, target, attack, isHit, callback, activeProjectiles);
    }
    
    // Special handling for Giftpuder (Poison Powder)
    if (attack.weaponName && attack.weaponName.toLowerCase() === 'giftpuder') {
        return createGiftpuder(attacker, target, attack, isHit, callback, activeProjectiles);
    }
    
    // Special handling for Schlafpuder (Sleep Powder)
    if (attack.weaponName && attack.weaponName.toLowerCase() === 'schlafpuder') {
        return createSchlafpuder(attacker, target, attack, isHit, callback, activeProjectiles);
    }
    
    // Special handling for Stachelspore (Stun Spore)
    if (attack.weaponName && attack.weaponName.toLowerCase() === 'stachelspore') {
        return createStachelspore(attacker, target, attack, isHit, callback, activeProjectiles);
    }
    
    // Special handling for Sandwirbel (Sand Attack)
    if (attack.weaponName && attack.weaponName.toLowerCase() === 'sandwirbel') {
        return createSandwirbel(attacker, target, attack, isHit, callback, activeProjectiles);
    }
    
    // For all other projectiles, use standard implementation
    return new Projectile(attacker, target, attack, isHit, callback, 1.0, false, damageValue);
}

/**
 * Fire a cone-based area effect attack
 * @param {Object} attacker - The Pokémon using the attack
 * @param {Object} targetDirection - The target direction
 * @param {Object} attack - The attack data
 * @param {Function} callback - Function to call when all particles are destroyed
 * @returns {Array} - The created particles
 */
export function fireAreaEffect(attacker, targetDirection, attack, callback = null) {
    // Number of particles for area effect
    const numParticles = 25;
    
    // Create projectiles array
    const projectiles = [];
    const projectileIds = new Set(); // To track IDs explicitly
    
    // Create counters for tracking projectiles
    let destroyedCount = 0;
    let reachedEdgeCount = 0;
    let callbackExecuted = false;
    
    // Calculate size-based adjustments
    const sizeCategory = calculateSizeCategory(attacker.character) || 1;
    const rangeIncrease = sizeCategory - 1;  // Size 1: +0, Size 2: +1, Size 3: +2, Size 4: +3
    const angleIncrease = (sizeCategory - 1) * 10;  // Size 1: +0°, Size 2: +10°, Size 3: +20°, Size 4: +30°
    
    // Adjust range and cone angle based on size
    const adjustedRange = attack.range + rangeIncrease;
    const adjustedConeAngle = (attack.cone || 45) + angleIncrease;
    
    // Create a cone indicator first using the imported function from attackCone.js with adjusted values
    createConeIndicator(attacker, targetDirection, adjustedRange, adjustedConeAngle, attack.weaponName.toLowerCase());
    
    // Create a unique identifier for this area effect batch
    const batchId = `area_effect_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Multiple safetyTimeouts to ensure callback happens
    const safetyTimeouts = [];
    
    // First safety timeout - should catch most cases
    safetyTimeouts.push(setTimeout(() => {
        if (!callbackExecuted) {
            finalizeAreaEffect();
        }
    }, AREA_EFFECT_MAX_LIFETIME + 300)); // Slightly longer than max particle lifetime
    
    // Second safety timeout - absolute fallback
    safetyTimeouts.push(setTimeout(() => {
        if (!callbackExecuted) {
            console.warn(`Using secondary safety timeout for area effect batch ${batchId} - first one failed`);
            finalizeAreaEffect();
        }
    }, AREA_EFFECT_MAX_LIFETIME * 1.5)); // Much longer timeout as ultimate fallback
    
    // Last resort safety timeout
    safetyTimeouts.push(setTimeout(() => {
        if (!callbackExecuted) {
            console.error(`Using FINAL safety timeout for area effect batch ${batchId} - all others failed`);
            finalizeAreaEffect(true); // Force cleanup
        }
    }, AREA_EFFECT_MAX_LIFETIME * 2)); // Double the max lifetime as absolute last resort
    
    // Helper function to finalize the area effect, clean up, and call callback
    function finalizeAreaEffect(forceCleanup = false) {
        // Only execute once
        if (callbackExecuted) return;
        callbackExecuted = true;
        
        // Clear all safety timeouts
        safetyTimeouts.forEach(timeout => clearTimeout(timeout));
        
        // Force clear any remaining particles
        if (forceCleanup) {
            // Aggressive cleanup - remove all projectiles from this batch
            for (let i = activeProjectiles.length - 1; i >= 0; i--) {
                const projectile = activeProjectiles[i];
                if (projectileIds.has(projectile.id)) {
                    try {
                        projectile.destroy();
                    } catch (e) {
                        console.error(`Failed to destroy projectile ${projectile.id} during forced cleanup:`, e);
                        // Remove directly from array as last resort
                        activeProjectiles.splice(i, 1);
                    }
                }
            }
        } else {
            clearAllAreaEffectParticles();
        }
        
        // Cleanup orphaned projectiles as a precaution
        cleanupOrphanedProjectiles();
        
        // Add a small delay before removing the cone to make it visible a bit longer
        setTimeout(() => {
            // Use imported removeConeIndicator function
            removeConeIndicator();
            
            // Wait a tiny bit more to ensure the cone is gone before callback
            setTimeout(() => {
                if (callback) callback();
            }, 50);
        }, 250); // 0.25 seconds additional display time
    }
    
    // Function to call when a projectile is destroyed
    const onProjectileDestroyed = (reachedEdge = false) => {
        destroyedCount++;
        if (reachedEdge) reachedEdgeCount++;
        
        // Only execute callback once when all projectiles are destroyed
        if (destroyedCount >= numParticles && !callbackExecuted) {
            finalizeAreaEffect();
        }
    };
    
    // Calculate base direction vector
    let dirX = targetDirection.x - attacker.x;
    let dirY = targetDirection.y - attacker.y;
    let distance = Math.sqrt(dirX * dirX + dirY * dirY);
    
    // Safeguard against zero distance
    if (distance === 0) {
        // Use a default direction if target is same as attacker (shouldn't happen)
        dirX = 1;
        dirY = 0;
    } else {
        dirX = dirX / distance;
        dirY = dirY / distance;
    }
    
    // For each particle
    for (let i = 0; i < numParticles; i++) {
        try {
            // Calculate the angle within the cone for this particle
            // Distribute angles evenly across the cone with some randomness
            const coneWidth = adjustedConeAngle * (Math.PI / 180); // Convert to radians
            
            // Base angle distribution (from -coneWidth/2 to +coneWidth/2)
            let particleAngle;
            
            if (i === 0) {
                // Center particle goes straight ahead
                particleAngle = 0;
            } else {
                // Distribute particles across the cone with slight randomness
                const normalizedPos = (i / (numParticles - 1)) * 2 - 1; // -1 to 1
                particleAngle = normalizedPos * (coneWidth / 2);
                
                // Add small random variation
                particleAngle += (Math.random() - 0.5) * (coneWidth / 10);
            }
            
            // Calculate particle direction by rotating the base direction vector
            const rotatedDirX = dirX * Math.cos(particleAngle) - dirY * Math.sin(particleAngle);
            const rotatedDirY = dirX * Math.sin(particleAngle) + dirY * Math.cos(particleAngle);
            
            // Calculate endpoint within range using adjusted range
            const rangeVariation = 0.9 + Math.random() * 0.2; // 90% to 110% of range
            const endpointDistance = Math.min(adjustedRange, adjustedRange * rangeVariation);
            
            // Create modified target position for this particle
            const particleTarget = {
                x: attacker.x + rotatedDirX * endpointDistance,
                y: attacker.y + rotatedDirY * endpointDistance,
                character: targetDirection.character
            };
            
            // Slightly randomize particle speed
            const speedVariation = 0.9 + Math.random() * 0.3; // 90% to 120% of normal speed
            
            // Create the particle projectile
            const particleProjectile = new Projectile(
                attacker, 
                particleTarget, 
                attack, 
                true, 
                onProjectileDestroyed,
                speedVariation,
                false,  // Don't skip damage for area effects
                null    // No pre-calculated damage
            );
            
            // Add to tracking
            projectiles.push(particleProjectile);
            projectileIds.add(particleProjectile.id);
            
            // Tag the element with batch ID for easier cleanup
            if (particleProjectile.element) {
                particleProjectile.element.dataset.batchId = batchId;
            }
        } catch (error) {
            console.error(`Error creating particle ${i}:`, error);
            // Count this as a destroyed particle to not block completion
            destroyedCount++;
        }
    }
    
    // Set up the periodic cleanup to catch any stray particles
    setupParticleCleanupInterval(batchId, projectileIds);
    
    // Start the projectile update loop
    startProjectileSystem();
    
    // If somehow we created zero projectiles, just execute the callback directly
    if (projectiles.length === 0) {
        console.warn("No particles created, executing callback directly");
        finalizeAreaEffect();
    }
    
    return projectiles;
}

/**
 * Count enemies and teammates in an area effect cone
 * @param {Object} attacker - The attacker position {x, y, teamIndex}
 * @param {Object} targetDirection - The target position defining the cone direction
 * @param {number} range - The range of the area effect
 * @param {number} coneAngle - The angle of the cone in degrees
 * @returns {Object} - Counts {enemies, teammates}
 */
export function countCharactersInCone(attacker, targetDirection, range, coneAngle = 45) {
    // Get all character positions
    const characterPositions = getCharacterPositions();
    
    // Initialize counters
    let enemyCount = 0;
    let teammateCount = 0;
    
    // Check each character
    for (const charId in characterPositions) {
        const charPos = characterPositions[charId];
        
        // Skip if it's the attacker
        if (charPos === attacker) continue;
        
        // Skip if character is already defeated
        if (charPos.isDefeated) continue;
        
        // Check if the character is in the cone - use the imported function
        if (isPositionInCone(attacker, targetDirection, charPos, range, coneAngle)) {
            // Count as enemy or teammate
            if (charPos.teamIndex === attacker.teamIndex) {
                teammateCount++;
            } else {
                enemyCount++;
            }
        }
    }
    
    return { enemies: enemyCount, teammates: teammateCount };
}

/**
 * Check if area effect should be used based on enemies vs teammates in cone
 * @param {Object} attacker - The attacker Pokémon
 * @param {Object} target - The target direction
 * @param {Object} attack - The attack data
 * @returns {boolean} - Whether the area effect should be used
 */
export function shouldUseAreaEffect(attacker, target, attack) {
    // Calculate size-based adjustments
    const sizeCategory = calculateSizeCategory(attacker.character) || 1;
    const rangeIncrease = sizeCategory - 1;
    const angleIncrease = (sizeCategory - 1) * 10;
    
    // Adjust range and cone angle based on size
    const adjustedRange = attack.range + rangeIncrease;
    const adjustedConeAngle = (attack.cone || 45) + angleIncrease;
    
    // Count characters in cone using adjusted values
    const counts = countCharactersInCone(attacker, target, adjustedRange, adjustedConeAngle);
    
    // Only use area effect if more enemies than teammates in cone
    return counts.enemies > counts.teammates;
}

/**
 * Force removal of all area effect particles from the board
 * @returns {number} - Number of particles removed
 */
function clearAllAreaEffectParticles() {
    let removedCount = 0;
    
    // First remove all powder elements from the DOM directly
    const particleTypes = ['giftpuder', 'stachelspore', 'schlafpuder'];
    const particleSelectors = particleTypes.map(type => `.projectile.${type}`).join(', ');
    
    const particleElements = document.querySelectorAll(particleSelectors);
    particleElements.forEach(element => {
        try {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            } else {
                document.body.removeChild(element);
            }
            removedCount++;
        } catch (error) {
            // If direct removal fails, hide the element
            try {
                element.style.display = 'none';
                removedCount++;
            } catch (e) {
                console.error("Failed to remove or hide area effect particle element:", e);
            }
        }
    });
    
    // Then clear all area effect projectiles from the active projectiles array
    const projectileCount = activeProjectiles.length;
    
    // Filter out all area effect projectiles
    activeProjectiles = activeProjectiles.filter(projectile => {
        if (projectile.isAreaEffect && projectile.isAreaEffect()) {
            // Mark as removed so any callbacks know it's gone
            projectile.removed = true;
            
            // Execute callback if it exists to ensure proper cleanup
            if (typeof projectile.callback === 'function') {
                try {
                    projectile.callback(true);
                } catch (error) {
                    console.error("Error in projectile callback during cleanup:", error);
                }
            }
            
            return false; // Remove from array
        }
        return true; // Keep non-area effect projectiles
    });
    
    // Add to the count any projectiles we removed from the array
    removedCount += (projectileCount - activeProjectiles.length);
    
    return removedCount;
}

/**
 * Check if a dodge position is outside the attack cone
 * @param {Object} attacker - The attacker position
 * @param {Object} targetDirection - The target direction
 * @param {Object} dodgePos - The potential dodge position
 * @param {number} range - The attack range
 * @param {number} coneAngle - The angle of the cone in degrees
 * @returns {boolean} - Whether the position is outside the cone
 */
export function isDodgePositionOutsideCone(attacker, targetDirection, dodgePos, range, coneAngle = 45) {
    // Calculate size-based adjustments
    const sizeCategory = calculateSizeCategory(attacker.character) || 1;
    const rangeIncrease = sizeCategory - 1;
    const angleIncrease = (sizeCategory - 1) * 10;
    
    // Adjust range and cone angle based on size
    const adjustedRange = range + rangeIncrease;
    const adjustedConeAngle = coneAngle + angleIncrease;
    
    // Simply reverse the result of isPositionInCone (using the imported function)
    return !isPositionInCone(attacker, targetDirection, dodgePos, adjustedRange, adjustedConeAngle);
}

/**
 * Check if line of sight between attacker and target is blocked by an ally
 * @param {Object} attacker - Attacker position {x, y, teamIndex}
 * @param {Object} target - Target position {x, y}
 * @returns {boolean} - Whether line of sight is blocked
 */
export function isLineOfSightBlockedByAlly(attacker, target) {
    // Skip line of sight check for Rankenhieb (vine whip) - it can curve around allies
    if (attacker.character && attacker.character.attacks) {
        const hasRankenhieb = attacker.character.attacks.some(attack => 
            attack.weaponName && attack.weaponName.toLowerCase().includes('rankenhieb'));
        
        if (hasRankenhieb) {
            return false;
        }
    }
    
    // Get all character positions
    const characterPositions = getCharacterPositions();
    
    // Calculate direction vector
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    
    // Get distance (in grid cells)
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Normalized direction
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
    
    // Check each tile along the line
    for (let i = 1; i < distance; i++) {
        // Calculate the position to check
        const checkX = Math.round(attacker.x + stepX * i);
        const checkY = Math.round(attacker.y + stepY * i);
        
        // Skip checking the attacker and target positions
        if ((checkX === attacker.x && checkY === attacker.y) || 
            (checkX === target.x && checkY === target.y)) {
            continue;
        }
        
        // Check if there's an ally at this position
        for (const charId in characterPositions) {
            const charPos = characterPositions[charId];
            
            // Skip defeated characters
            if (charPos.isDefeated) continue;
            
            // Check if position matches and it's an ally
            if (charPos.x === checkX && charPos.y === checkY && charPos.teamIndex === attacker.teamIndex) {
                return true; // Line of sight is blocked by an ally
            }
        }
    }
    
    return false; // Line of sight is not blocked
}

/**
 * Set up a periodic check for stale particles
 * @param {string} batchId - ID for this batch of particles
 * @param {Set} projectileIds - Set of projectile IDs in this batch
 */
export function setupParticleCleanupInterval(batchId, projectileIds) {
    // Create a unique interval ID for this batch
    const intervalId = `particleCleanup_${batchId}`;
    
    // Clear any existing interval with this ID
    if (window[intervalId]) {
        clearInterval(window[intervalId]);
    }
    
    // Set up new interval with more aggressive cleanup
    window[intervalId] = setInterval(() => {
        const now = Date.now();
        let cleanupCount = 0;
        let forceCleanAll = false;
        let batchStillActive = false;
        
        // Check if any batch projectiles are still active
        for (let i = activeProjectiles.length - 1; i >= 0; i--) {
            const projectile = activeProjectiles[i];
            
            // Skip if not in this batch
            if (!projectileIds.has(projectile.id)) continue;
            
            batchStillActive = true;
            
            // Check if it's an area effect
            if (projectile.isAreaEffect && projectile.isAreaEffect()) {
                const age = now - projectile.creationTime;
                
                // If a particle is more than 1.5x the max lifetime, something's wrong - force clean all
                if (age > AREA_EFFECT_MAX_LIFETIME * 1.5) {
                    forceCleanAll = true;
                    break;
                }
                
                // Destroy if too old (normal case)
                if (age > AREA_EFFECT_MAX_LIFETIME) {
                    projectile.coneEdgeReached = true; // Mark as reached edge for visual effect
                    projectile.destroy();
                    cleanupCount++;
                }
            }
        }
        
        // If no particles from this batch remain, clean up
        if (!batchStillActive) {
            clearInterval(window[intervalId]);
            window[intervalId] = null;
            return;
        }
        
        // If we need to force clean all, do it now
        if (forceCleanAll) {
            console.warn(`Force cleaning all area effect particles for batch ${batchId} due to stuck projectiles`);
            
            // First try to use the destroy method
            let destroyCount = 0;
            for (let i = activeProjectiles.length - 1; i >= 0; i--) {
                const projectile = activeProjectiles[i];
                if (projectileIds.has(projectile.id)) {
                    try {
                        projectile.destroy();
                        destroyCount++;
                    } catch (error) {
                        console.error(`Error destroying projectile ${projectile.id} during forced cleanup:`, error);
                        // Remove from array anyway to prevent it hanging around
                        activeProjectiles.splice(i, 1);
                    }
                }
            }
            
            if (destroyCount > 0) {
                cleanupCount += destroyCount;
            }
            
            // Then try to clean up any orphaned DOM elements
            setTimeout(() => {
                try {
                    // Find elements with this batch ID
                    const orphanedElements = document.querySelectorAll(`.projectile[data-batch-id="${batchId}"]`);
                    let orphanCount = 0;
                    
                    orphanedElements.forEach(element => {
                        try {
                            if (element.parentNode) {
                                element.parentNode.removeChild(element);
                            } else {
                                document.body.removeChild(element);
                            }
                            orphanCount++;
                        } catch (e) {
                            console.error(`Failed to remove orphaned element from batch ${batchId}:`, e);
                            // Last resort - hide it
                            element.style.display = 'none';
                        }
                    });
                } catch (error) {
                    console.error(`Error during orphaned DOM element cleanup for batch ${batchId}:`, error);
                }
                
                // Finally, clear the interval
                clearInterval(window[intervalId]);
                window[intervalId] = null;
            }, 100);
        }
    }, PARTICLE_CLEANUP_INTERVAL);
    
    // As a precaution, set a timeout to clear the interval after a maximum lifetime
    setTimeout(() => {
        if (window[intervalId]) {
            clearInterval(window[intervalId]);
            window[intervalId] = null;
            
            // Run one final cleanup
            cleanupOrphanedProjectiles();
        }
    }, AREA_EFFECT_MAX_LIFETIME * 3); // 3x the max lifetime as absolute maximum
}

/**
 * Clear all active projectiles
 */
export function clearAllProjectiles() {
    // Create a copy of the array to prevent modification issues during iteration
    const projectilesToDestroy = [...activeProjectiles];
    
    // Clear the original array first to prevent any new updates
    const totalCount = activeProjectiles.length;
    activeProjectiles = [];
    
    // Now destroy each projectile
    let destroyedCount = 0;
    for (const projectile of projectilesToDestroy) {
        try {
            // Remove visual elements
            if (projectile.element && projectile.element.parentNode) {
                projectile.element.parentNode.removeChild(projectile.element);
            } else if (projectile.element) {
                // Try removing from document.body as fallback
                try {
                    document.body.removeChild(projectile.element);
                } catch (e) {
                    console.warn(`Failed to remove projectile element for ${projectile.id}:`, e);
                    // Hide as last resort
                    if (projectile.element) {
                        projectile.element.style.display = 'none';
                    }
                }
            }
            
            // Mark as removed
            projectile.removed = true;
            
            // Execute callback if exists
            if (projectile.callback && typeof projectile.callback === 'function') {
                try {
                    projectile.callback();
                } catch (callbackError) {
                    console.error("Error in projectile callback during cleanup:", callbackError);
                }
            }
            
            destroyedCount++;
        } catch (error) {
            console.error("Error destroying projectile during cleanup:", error);
        }
    }
    
    // Clear all cleanup intervals
    for (const key in window) {
        if (key.startsWith('particleCleanup_')) {
            clearInterval(window[key]);
            window[key] = null;
        }
    }
    
    // Clear the main safety interval if it exists
    if (window.particleCleanupInterval) {
        clearInterval(window.particleCleanupInterval);
        window.particleCleanupInterval = null;
    }
    
    // Reset animation frame variables
    lastFrameTime = 0;
    updateInProgress = false;
    
    // Run final DOM cleanup to catch any orphaned elements
    setTimeout(() => {
        const extraCleanup = cleanupOrphanedProjectiles();
    }, 100);
}

/**
 * Get all active projectiles
 * @returns {Array} - Array of active projectiles
 */
export function getActiveProjectiles() {
    return activeProjectiles;
}

/**
 * Update all active projectiles
 * @param {number} timestamp - Current frame timestamp
 */
export function updateProjectiles(timestamp) {
    // If already updating, prevent overlap
    if (updateInProgress) {
        requestAnimationFrame(updateProjectiles);
        return;
    }
    
    // Set flag to indicate we're processing updates
    updateInProgress = true;
    
    try {
        // Calculate delta time (in seconds)
        if (lastFrameTime === 0) {
            lastFrameTime = timestamp;
            requestAnimationFrame(updateProjectiles);
            updateInProgress = false;
            return;
        }
        
        const deltaTime = (timestamp - lastFrameTime) / 1000;
        lastFrameTime = timestamp;
        
        // Only run the orphaned projectile check every 2 seconds 
        // to avoid excessive DOM queries
        const now = Date.now();
        if (!window.lastOrphanCheckTime || (now - window.lastOrphanCheckTime > 2000)) {
            cleanupOrphanedProjectiles();
            window.lastOrphanCheckTime = now;
        }
        
        // Check for stale projectiles that might be frozen
        checkForStaleProjectiles(now);
        
        // Get battlefield for batch DOM updates
        const battlefield = document.querySelector('.battlefield-grid');
        
        if (!battlefield) {
            if (activeProjectiles.length > 0) {
                requestAnimationFrame(updateProjectiles);
            }
            updateInProgress = false;
            return;
        }
        
        // Collect DOM updates to perform in batch
        const updates = [];
        
        // Update all projectiles' logical state
        for (let i = activeProjectiles.length - 1; i >= 0; i--) {
            try {
                const projectile = activeProjectiles[i];
                
                // Skip already removed projectiles
                if (projectile.removed) {
                    activeProjectiles.splice(i, 1);
                    continue;
                }
                
                // Update the projectile logic
                if (!projectile.update(deltaTime)) {
                    activeProjectiles.splice(i, 1);
                    continue;
                }
                
                // For projectiles that are still active, queue a visual update
                if (projectile.element && !projectile.removed) {
                    if (projectile.type === 'rankenhieb') {
                        // Vines don't move, so don't queue updates for them
                        continue;
                    }
                    
                    // Queue DOM update (using battlefield coordinates)
                    updates.push({
                        element: projectile.element,
                        x: projectile.x,
                        y: projectile.y,
                        dirX: projectile.dirX,
                        dirY: projectile.dirY
                    });
                }
            } catch (error) {
                console.error("Error updating projectile:", error);
                
                // Remove the problematic projectile
                if (i < activeProjectiles.length) {
                    activeProjectiles.splice(i, 1);
                }
            }
        }
        
        // Now batch-apply all DOM updates
        updates.forEach(update => {
            try {
                // Update position directly (relative to the battlefield)
                update.element.style.left = `${update.x}px`;
                update.element.style.top = `${update.y}px`;
                
                // Update rotation
                const angle = Math.atan2(update.dirY, update.dirX) * 180 / Math.PI;
                update.element.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            } catch (error) {
                console.error("Error updating projectile DOM element:", error);
            }
        });
        
        // Always continue the animation loop if we have active projectiles
        if (activeProjectiles.length > 0) {
            requestAnimationFrame(updateProjectiles);
        } else {
            // Reset animation variables if no more projectiles
            lastFrameTime = 0;
            
            // Do one more clean-up pass
            setTimeout(cleanupOrphanedProjectiles, 100);
        }
    } catch (error) {
        console.error("Error in projectile update loop:", error);
        
        // Ensure the animation continues
        if (activeProjectiles.length > 0) {
            requestAnimationFrame(updateProjectiles);
        }
    }
    
    // Clear the update in progress flag
    updateInProgress = false;
}

/**
 * Check for stale projectiles that haven't been moving properly
 * @param {number} now - Current timestamp
 */
function checkForStaleProjectiles(now) {
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const projectile = activeProjectiles[i];
        
        // Skip area effects which have their own lifecycle
        if (projectile.isAreaEffect && projectile.isAreaEffect()) continue;
        
        // For normal projectiles, check how long they've been alive
        const age = now - projectile.creationTime;
        
        // If a projectile has been alive too long (10 seconds), it's probably stuck
        // Most projectiles should hit or go off screen in 1-2 seconds
        if (age > 10000) {
            console.warn(`Projectile ${projectile.id} (${projectile.type}) has been alive for ${age}ms - likely stuck. Destroying.`);
            projectile.coneEdgeReached = true; // For visual effects
            projectile.destroy();
        }
    }
}

/**
 * Start the projectile update loop if not already running
 */
export function startProjectileSystem() {
    // Check if animation loop is currently running
    const isLoopRunning = lastFrameTime !== 0;
    
    if (activeProjectiles.length > 0 && !isLoopRunning) {
        // Reset last frame time to ensure accurate first delta
        lastFrameTime = 0;
        updateInProgress = false;
        
        // Start the animation loop
        requestAnimationFrame(updateProjectiles);
        
        // As a precaution, set a global timeout to check for a stalled animation loop
        if (!window.animationLoopWatchdog) {
            window.animationLoopWatchdog = setTimeout(() => {
                // Check if we have active projectiles but the animation loop isn't running
                if (activeProjectiles.length > 0 && lastFrameTime === 0) {
                    console.warn("Animation loop appears stalled - restarting projectile system");
                    lastFrameTime = 0;
                    updateInProgress = false;
                    requestAnimationFrame(updateProjectiles);
                }
                
                // Clean up the watchdog
                window.animationLoopWatchdog = null;
            }, 1000); // Check after 1 second
        }
    }
}

/**
 * Check if line of sight between attacker and target is blocked
 * @param {Object} attacker - Attacker position {x, y, teamIndex}
 * @param {Object} target - Target position {x, y}
 * @returns {Promise<boolean>} - Whether line of sight is blocked
 */
export async function isLineOfSightBlocked(attacker, target) {
    // For rankenhieb (vine whip), never blocked
    if (attacker.character && attacker.character.attacks) {
        const hasRankenhieb = attacker.character.attacks.some(attack => 
            attack.weaponName && attack.weaponName.toLowerCase().includes('rankenhieb'));
        
        if (hasRankenhieb) {
            return false;
        }
    }
    
    // First check if blocked by an ally
    const allyBlocking = isLineOfSightBlockedByAlly(attacker, target);
    if (allyBlocking) {
        return true;
    }
    
    try {
        // Import the terrain effects module
        const terrainEffects = await import('./terrainEffects.js');
        
        // Get the terrain at attacker's position to check if they're on a mountain
        const isAttackerOnMountain = terrainEffects.getTerrainAt(attacker.x, attacker.y) === 'mountain';
        
        // If attacker is on a mountain, they can see over other mountains
        if (isAttackerOnMountain) {
            return false;
        }
        
        // Otherwise, check if mountains block line of sight
        return terrainEffects.isLineOfSightBlockedByMountain(
            attacker.x, attacker.y, 
            target.x, target.y, 
            isAttackerOnMountain
        );
    } catch (error) {
        console.error('Error checking terrain line of sight:', error);
        return false; // Default to not blocked if there's an error
    }
}

/**
 * Schedule a cleanup of orphaned projectiles
 */
function scheduleOrphanedProjectileCleanup() {
    // If there's already a cleanup scheduled, don't schedule another
    if (window.orphanedProjectileCleanupScheduled) return;
    window.orphanedProjectileCleanupScheduled = true;
    
    // Schedule an immediate cleanup
    setTimeout(() => {
        cleanupOrphanedProjectiles();
        window.orphanedProjectileCleanupScheduled = false;
    }, 50); // Short timeout to batch potential multiple cleanups
}

/**
 * Clean up any orphaned projectile DOM elements
 * @returns {number} Number of orphaned projectiles cleaned
 */
function cleanupOrphanedProjectiles() {
    let count = 0;
    
    // First, check for elements with the orphaned-projectile class
    const orphanedElements = document.querySelectorAll('.orphaned-projectile');
    orphanedElements.forEach(element => {
        try {
            element.parentNode.removeChild(element);
            count++;
        } catch (error) {
            console.error("Error removing orphaned projectile:", error);
        }
    });
    
    // Also look for any projectile elements that might be orphaned
    // without the class (more aggressive cleanup)
    try {
        const allProjectileElements = document.querySelectorAll('.projectile');
        
        // Convert activeProjectiles IDs to a Set for faster lookup
        const activeIds = new Set(activeProjectiles.map(p => p.id));
        
        allProjectileElements.forEach(element => {
            const id = element.dataset.projectileId;
            
            // If this element has an ID but it's not in the active projectiles,
            // or it doesn't have an ID at all, it's orphaned
            if (!id || !activeIds.has(id)) {
                try {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                        count++;
                    } else {
                        document.body.removeChild(element);
                        count++;
                    }
                } catch (e) {
                    // Last resort: hide it
                    try {
                        element.style.display = 'none';
                        element.style.pointerEvents = 'none'; 
                        element.style.opacity = '0';
                        element.classList.add('pending-removal');
                        count++;
                    } catch (finalError) {
                        console.error("Failed all attempts to clean orphaned projectile:", finalError);
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error during aggressive orphaned projectile cleanup:", error);
    }
    
    return count;
}

// Export the main functions
export { Projectile };