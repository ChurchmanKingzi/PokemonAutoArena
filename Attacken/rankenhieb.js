/**
 * Special attack implementation for Rankenhieb (Vine Whip)
 * Can hit up to 2 targets in a line
 */

import { TILE_SIZE } from '../config.js';
import { getCharacterPositions } from '../characterPositions.js';
import { createDamageNumber } from '../damageNumbers.js';
import { rollDamageWithValue } from '../diceRoller.js';
import { updateInitiativeHP } from '../initiativeDisplay.js';
import { getTeamColor } from '../utils.js';
import { logBattleEvent } from '../battleLog.js';

/**
 * Special class for Rankenhieb (Vine Whip) attacks
 */
export class RankenhiebAttack {
    /**
     * Create a new Rankenhieb attack
     * @param {Object} attacker - The Pokémon who used the attack
     * @param {Object} target - The target position/Pokémon
     * @param {Object} attack - The attack data (name, damage, etc.)
     * @param {boolean} isHit - Whether the projectile is intended to hit
     * @param {Function} callback - Function to call when destroyed
     * @param {Array} activeProjectilesArray - Reference to the active projectiles array
     */
    constructor(attacker, target, attack, isHit = true, callback = null, activeProjectilesArray) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.attacker = attacker;
        this.target = target;
        this.attack = attack;
        this.isHit = isHit;
        this.callback = callback;
        this.attackName = "rankenhieb";
        this.removed = false;
        this.damage = attack.damage || 5; // Default damage for Rankenhieb is 5d6
        this.teamIndex = attacker.teamIndex;
        
        // Store reference to the active projectiles array
        this.activeProjectiles = activeProjectilesArray;
        
        // Store tile positions directly
        this.attackerX = attacker.x;
        this.attackerY = attacker.y;
        this.targetX = target.x;
        this.targetY = target.y;
        
        // Calculate direction vector for potential second target
        const dx = this.targetX - this.attackerX;
        const dy = this.targetY - this.attackerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.dirX = dx / distance;
            this.dirY = dy / distance;
        } else {
            this.dirX = 0;
            this.dirY = 0;
        }
        
        // Store creation time for animation timing
        this.creationTime = Date.now();
        
        // Flag to track if damage has been applied
        this.damageApplied = false;
        this.fadingOut = false;
        
        // Track hit targets to avoid hitting the same target twice
        this.hitTargets = new Set();
        
        // Create the visual element
        this.element = this.createVisualElement();
        
        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Apply damage after 300ms
        this.damageTimeout = setTimeout(() => this.applyDamage(), 300);
        
        // Start fade after 300ms
        this.fadeTimeout = setTimeout(() => this.startFadeOut(), 300);
        
        // Destroy after 800ms total (300ms to hit + 500ms to fade)
        this.destroyTimeout = setTimeout(() => this.destroy(), 800);
    }
    
    /**
     * Create visual element for Rankenhieb
     * @returns {HTMLElement} - The tether DOM element
     */
    createVisualElement() {
        // Find the battlefield for positioning reference
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) {
            console.error('Battlefield element not found for Rankenhieb positioning');
            return document.createElement('div'); // Return empty div to prevent errors
        }
        
        // Calculate the center points of attacker and target tiles
        const attackerCenterX = (this.attackerX + 0.5) * TILE_SIZE;
        const attackerCenterY = (this.attackerY + 0.5) * TILE_SIZE;
        const targetCenterX = (this.targetX + 0.5) * TILE_SIZE;
        const targetCenterY = (this.targetY + 0.5) * TILE_SIZE;
        
        // Get distance between centers
        const dx = targetCenterX - attackerCenterX;
        const dy = targetCenterY - attackerCenterY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate the angle from attacker to target
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Create the main vine element
        const vineElement = document.createElement('div');
        vineElement.className = 'rankenhieb-vine';
        vineElement.style.position = 'absolute';
        vineElement.style.width = `${length}px`;
        vineElement.style.height = '6px';
        vineElement.style.backgroundColor = '#4CAF50';
        vineElement.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.7)';
        vineElement.style.borderRadius = '3px';
        vineElement.style.zIndex = '100';
        vineElement.style.transformOrigin = 'left center';
        vineElement.style.transition = 'opacity 0.5s ease-out';
        
        // Create a wrapper div to position the vine and handle animation
        const wrapperElement = document.createElement('div');
        wrapperElement.className = 'projectile rankenhieb';
        wrapperElement.dataset.projectileId = this.id;
        wrapperElement.style.position = 'absolute';
        wrapperElement.style.left = `${attackerCenterX}px`;
        wrapperElement.style.top = `${attackerCenterY}px`;
        wrapperElement.style.width = '0';
        wrapperElement.style.height = '0';
        wrapperElement.style.zIndex = '100';
        wrapperElement.style.transformOrigin = 'left center';
        
        // Add the vine to the wrapper
        wrapperElement.appendChild(vineElement);
        
        // Apply the rotation and position
        vineElement.style.transform = `rotate(${angle}deg)`;
        
        // Add to the battlefield
        battlefield.appendChild(wrapperElement);
        
        // Add bulbs at start and end of vine
        const startBulb = document.createElement('div');
        startBulb.className = 'rankenhieb-bulb start-bulb';
        startBulb.style.position = 'absolute';
        startBulb.style.left = '0';
        startBulb.style.top = '0';
        startBulb.style.width = '10px';
        startBulb.style.height = '10px';
        startBulb.style.borderRadius = '50%';
        startBulb.style.backgroundColor = '#4CAF50';
        startBulb.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.7)';
        startBulb.style.transform = 'translate(-50%, -50%)';
        startBulb.style.zIndex = '101';
        
        const endBulb = document.createElement('div');
        endBulb.className = 'rankenhieb-bulb end-bulb';
        endBulb.style.position = 'absolute';
        endBulb.style.left = `${length}px`;
        endBulb.style.top = '0';
        endBulb.style.width = '10px';
        endBulb.style.height = '10px';
        endBulb.style.borderRadius = '50%';
        endBulb.style.backgroundColor = '#4CAF50';
        endBulb.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.7)';
        endBulb.style.transform = 'translate(-50%, -50%)';
        endBulb.style.zIndex = '101';
        
        vineElement.appendChild(startBulb);
        vineElement.appendChild(endBulb);
        
        // Force a reflow and apply animation 
        void vineElement.offsetWidth;
        vineElement.style.animation = 'rankenhiebGrow 0.2s ease-out forwards';
        
        return wrapperElement;
    }
    
    /**
     * Apply damage to targets in the line
     */
    applyDamage() {
        if (this.damageApplied || this.removed) return;
        
        // Mark damage as applied
        this.damageApplied = true;
        
        // Find targets in line (up to 2)
        const targets = this.findTargetsInLine();
        
        // Apply damage to each target
        targets.forEach(target => {
            // Skip if already hit
            if (this.hitTargets.has(target.id)) return;
            
            // Mark as hit
            this.hitTargets.add(target.id);
            
            // Calculate damage
            const damageRoll = this.calculateDamage(target);
            
            // Apply damage
            this.applyDamageToTarget(target, damageRoll);
            
            // Log hit message
            logBattleEvent(`${this.attacker.character.name}'s Rankenhieb trifft ${target.character.name} für ${damageRoll.total} Schaden!`);
        });
    }
    
    /**
     * Find targets in line from attacker through target point (up to 2)
     * @returns {Array} - Array of targets in the line
     */
    findTargetsInLine() {
        const characterPositions = getCharacterPositions();
        const targets = [];
        
        // Exclude the attacker
        const attacker = this.attacker;
        
        // Calculate the line from attacker to target and beyond
        const lineLength = 3; // Check up to 3 tiles for 2 potential targets
        
        // Find the closest candidates first
        for (const charId in characterPositions) {
            const charPos = characterPositions[charId];
            
            // Skip if character is defeated or dodging
            if (charPos.isDefeated || charPos.isDodging) continue;
            
            // Skip the attacker
            if (charPos === attacker) continue;
            
            // Check if this character is close to the line
            if (this.isPositionNearLine(charPos, lineLength)) {
                // Calculate distance from attacker
                const dx = charPos.x - this.attackerX;
                const dy = charPos.y - this.attackerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Add to potential targets with distance
                targets.push({
                    id: charId,
                    character: charPos.character,
                    position: charPos,
                    teamIndex: charPos.teamIndex,
                    distance: distance
                });
            }
        }
        
        // Sort by distance from attacker and limit to 2 targets
        return targets
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 2);
    }
    
    /**
     * Check if a position is near the line from attacker to target
     * @param {Object} position - Position to check
     * @param {number} maxDistance - Maximum distance to check along the line
     * @returns {boolean} - Whether the position is near the line
     */
    isPositionNearLine(position, maxDistance) {
        // Get position in tile coordinates
        const posX = position.x;
        const posY = position.y;
        
        // Calculate displacement vector from attacker to position
        const dx = posX - this.attackerX;
        const dy = posY - this.attackerY;
        
        // Project this vector onto the line direction
        const projection = dx * this.dirX + dy * this.dirY;
        
        // If projection is negative or too far, point is not on the line segment
        if (projection < 0 || projection > maxDistance) {
            return false;
        }
        
        // Calculate the closest point on the line
        const lineX = this.attackerX + projection * this.dirX;
        const lineY = this.attackerY + projection * this.dirY;
        
        // Calculate perpendicular distance to the line
        const perpDx = posX - lineX;
        const perpDy = posY - lineY;
        const distance = Math.sqrt(perpDx * perpDx + perpDy * perpDy);
        
        // Check if within threshold (0.75 tile width is generous enough to hit)
        return distance <= 0.75;
    }
    
    /**
     * Calculate damage for a target
     * @param {Object} target - Target data
     * @returns {Object} - Damage roll result
     */
    calculateDamage(target) {
        // Use basic damage roll for simplicity
        return rollDamageWithValue(this.damage);
    }
    
    /**
     * Apply damage to a specific target
     * @param {Object} target - Target data
     * @param {Object} damageRoll - Damage roll data
     */
    applyDamageToTarget(target, damageRoll) {
        // Skip if character is already defeated
        if (target.character.currentKP <= 0) {
            return;
        }
        
        // Show damage number
        createDamageNumber(damageRoll.total, target.position, damageRoll.total >= 8);
        
        // Apply damage to target's health
        const oldKP = parseInt(target.character.currentKP, 10);
        const damageAmount = parseInt(damageRoll.total, 10);
        target.character.currentKP = Math.max(0, oldKP - damageAmount);
        
        // Update HP bar visually
        const targetTile = document.querySelector(`.battlefield-tile[data-x="${target.position.x}"][data-y="${target.position.y}"]`);
        if (targetTile) {
            const hpBar = targetTile.querySelector(`.character-hp-bar-container[data-character-id="${target.id}"] .character-hp-bar`);
            if (hpBar) {
                const maxHP = target.character.maxKP || target.character.combatStats.kp || 10;
                const currentHP = target.character.currentKP;
                const hpPercent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
                
                // Update width to show current health percentage
                hpBar.style.width = `${hpPercent}%`;
                
                // Update color based on remaining HP
                if (currentHP <= 0) {
                    // Character defeated
                    hpBar.style.width = '0%';
                    hpBar.style.backgroundColor = '#7f0000'; // Dark red for defeated
                    
                    // Mark character as defeated
                    target.position.isDefeated = true;
                    
                    // Log defeat
                    logBattleEvent(`${target.character.name} is defeated and leaves the battle!`);
                    
                    // Handle defeated character removal
                    import('../characterPositions.js').then(module => {
                        module.removeDefeatedCharacter(target.id);
                    });
                } else if (currentHP <= maxHP * 0.25) {
                    hpBar.style.backgroundColor = '#e74c3c'; // Red for low HP
                } else if (currentHP <= maxHP * 0.5) {
                    hpBar.style.backgroundColor = '#f39c12'; // Orange for medium HP
                } else {
                    hpBar.style.backgroundColor = getTeamColor(target.teamIndex); // Team color for healthy
                }
            }
        }
        
        // Update initiative HP display
        updateInitiativeHP();
    }
    
    /**
     * Start the fade out animation
     */
    startFadeOut() {
        if (this.removed) return;
        
        this.fadingOut = true;
        
        // Gradually reduce opacity to create fade out effect
        if (this.element) {
            this.element.style.opacity = '0';
        }
    }
    
    /**
     * Update method (called each frame)
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} - Whether the projectile should be kept
     */
    update(deltaTime) {
        // If already marked as removed, stop updating
        if (this.removed) return false;
        
        // The update for Rankenhieb just checks if it's time to apply damage if not yet applied
        const currentTime = Date.now();
        const age = currentTime - this.creationTime;
        
        // Apply damage after 300ms
        if (age >= 300 && !this.damageApplied) {
            this.applyDamage();
        }
        
        // Start fade after 300ms
        if (age >= 300 && !this.fadingOut) {
            this.startFadeOut();
        }
        
        // Destroy after 800ms total
        if (age >= 800) {
            this.destroy();
            return false;
        }
        
        return true;
    }
    
    /**
     * Destroy the Rankenhieb attack
     */
    destroy() {
        // If already marked as removed, avoid duplicate processing
        if (this.removed) return;
        
        // Mark as removed
        this.removed = true;
        
        // Clear timeouts
        if (this.damageTimeout) clearTimeout(this.damageTimeout);
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        if (this.destroyTimeout) clearTimeout(this.destroyTimeout);
        
        // Remove visual element
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        // Remove from active projectiles array
        const index = this.activeProjectiles.findIndex(p => p.id === this.id);
        if (index !== -1) {
            this.activeProjectiles.splice(index, 1);
        }
        
        // Call the callback if provided
        if (this.callback) {
            try {
                this.callback();
            } catch (error) {
                console.error("Error in Rankenhieb callback:", error);
            }
        }
    }
}

/**
 * Create a new Rankenhieb attack
 * @param {Object} attacker - The attacker Pokémon
 * @param {Object} target - The target Pokémon/position
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack should hit or miss
 * @param {Function} callback - Function to call when attack is complete
 * @param {Array} activeProjectiles - Reference to the active projectiles array
 * @returns {RankenhiebAttack} - The created Rankenhieb attack
 */
export function createRankenhieb(attacker, target, attack, isHit, callback, activeProjectiles) {
    return new RankenhiebAttack(attacker, target, attack, isHit, callback, activeProjectiles);
}

/**
 * Add the Rankenhieb CSS to the document
 */
export function addRankenhiebStyles() {
    // Check if styles already exist
    if (document.getElementById('rankenhieb-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'rankenhieb-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Rankenhieb (Vine Whip) styling */
        .rankenhieb-vine {
            background: linear-gradient(to right, #4CAF50, #8BC34A);
            height: 6px;
            border-radius: 3px;
            box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
            position: absolute;
            left: 0;
            top: 0;
            transform-origin: left center;
        }

        /* Styling for the Rankenhieb growth animation */
        @keyframes rankenhiebGrow {
            0% { transform: scaleX(0) rotate(var(--angle)); }
            100% { transform: scaleX(1) rotate(var(--angle)); }
        }
        
        /* Faster fade-out for rankenhieb */
        .projectile.rankenhieb {
            transition: opacity 0.5s ease-out;
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}