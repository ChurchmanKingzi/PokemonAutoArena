/**
 * Special attack implementation for Fadenschuss (String Shot)
 * Creates a tether that reduces target's Initiative and restricts movement
 */

import { TILE_SIZE } from '../config.js';
import { getCharacterPositions } from '../characterPositions.js';
import { createDamageNumber } from '../damageNumbers.js';
import { rollDamageWithValue } from '../diceRoller.js';
import { updateInitiativeHP } from '../initiativeDisplay.js';
import { logBattleEvent } from '../battleLog.js';
import { changeInitiative } from '../initiativeChanges.js';
import { addStatusEffect } from '../statusEffects.js';
import { applyVisualHitEffect } from '../coneHits.js';

/**
 * Special class for Fadenschuss (String Shot) attacks
 */
export class FadenschussAttack {
    /**
     * Create a new Fadenschuss attack
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
        this.attackName = "fadenschuss";
        this.removed = false;
        this.damage = attack.damage || 0; // Default damage is 0 - status move
        this.teamIndex = attacker.teamIndex;
        
        // Store reference to the active projectiles array
        this.activeProjectiles = activeProjectilesArray;
        
        // Store tile positions directly
        this.attackerX = attacker.x;
        this.attackerY = attacker.y;
        this.targetX = target.x;
        this.targetY = target.y;
        
        // Store creation time for animation timing
        this.creationTime = Date.now();
        
        // Flag to track if effects have been applied
        this.effectsApplied = false;
        this.fadingOut = false;
        
        // Create the visual element
        this.element = this.createVisualElement();
        
        // Track if target has been hit
        this.targetHit = false;
        
        // Add to active projectiles
        this.activeProjectiles.push(this);
        
        // Apply effects after 300ms
        this.effectsTimeout = setTimeout(() => this.applyEffects(), 300);
        
        // Start fade after 600ms
        this.fadeTimeout = setTimeout(() => this.startFadeOut(), 600);
        
        // Destroy after 1000ms total
        this.destroyTimeout = setTimeout(() => this.destroy(), 1000);
    }
    
    /**
     * Create visual element for Fadenschuss
     * @returns {HTMLElement} - The tether DOM element
     */
    createVisualElement() {
        // Find the battlefield for positioning reference
        const battlefield = document.querySelector('.battlefield-grid');
        if (!battlefield) {
            console.error('Battlefield element not found for Fadenschuss positioning');
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
        
        // Create wrapper container
        const wrapperElement = document.createElement('div');
        wrapperElement.className = 'projectile fadenschuss';
        wrapperElement.dataset.projectileId = this.id;
        wrapperElement.style.position = 'absolute';
        wrapperElement.style.left = `${attackerCenterX}px`;
        wrapperElement.style.top = `${attackerCenterY}px`;
        wrapperElement.style.width = '0';
        wrapperElement.style.height = '0';
        wrapperElement.style.zIndex = '100';
        wrapperElement.style.transformOrigin = 'left center';
        
        // Create the main string element (thinner than Rankenhieb)
        const stringElement = document.createElement('div');
        stringElement.className = 'fadenschuss-string';
        stringElement.style.position = 'absolute';
        stringElement.style.width = `${length}px`;
        stringElement.style.height = '3px'; // Thinner than Rankenhieb
        stringElement.style.backgroundColor = '#c5e04a'; // Yellow-green color
        stringElement.style.boxShadow = '0 0 4px rgba(197, 224, 74, 0.7)';
        stringElement.style.borderRadius = '2px';
        stringElement.style.zIndex = '100';
        stringElement.style.transformOrigin = 'left center';
        stringElement.style.transition = 'opacity 0.5s ease-out';
        stringElement.style.setProperty('--angle', `${angle}deg`);
        
        // Apply the rotation
        stringElement.style.transform = `rotate(${angle}deg)`;
        
        // Add the string to the wrapper
        wrapperElement.appendChild(stringElement);
        
        // Add small dots along the string
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            dot.className = 'fadenschuss-dot';
            dot.style.position = 'absolute';
            dot.style.left = `${(length / 6) * (i + 1)}px`;
            dot.style.top = '0';
            dot.style.width = '4px';
            dot.style.height = '4px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = '#dce85a'; // Lighter yellow-green
            dot.style.transform = 'translate(-50%, -50%)';
            dot.style.zIndex = '101';
            
            stringElement.appendChild(dot);
        }
        
        // Add to the battlefield
        battlefield.appendChild(wrapperElement);
        
        // Force a reflow and apply animation
        void stringElement.offsetWidth;
        stringElement.style.animation = 'fadenschussGrow 0.2s ease-out forwards';
        
        return wrapperElement;
    }
    
    /**
     * Apply effects to the target (initiative reduction and snared status)
     */
    applyEffects() {
        // If effects already applied, removed, or miss is intended, don't apply effects
        if (this.effectsApplied || this.removed || !this.isHit) return;
        
        // Mark effects as applied
        this.effectsApplied = true;
        
        // Get all character positions
        const characterPositions = getCharacterPositions();
        
        // First, find the target by uniqueId instead of by position
        // This ensures we find them even if they've moved
        const targetId = Object.keys(characterPositions).find(id => 
            characterPositions[id].character && 
            characterPositions[id].character.uniqueId === this.target.character.uniqueId
        );
        
        if (!targetId || !this.target.character) {
            return; // Target not found
        }
        
        // Get the target's current position
        const currentPos = characterPositions[targetId];
        
        // Check if target has moved from the original target position (dodged)
        // This compares current position to original target position
        if (currentPos.x !== this.targetX || currentPos.y !== this.targetY) {
            // Target has moved from original position - dodge was successful
            logBattleEvent(`${this.target.character.name} ist dem Faden ausgewichen!`);
            return;
        }
        
        // Apply damage if any (typically 0 for Fadenschuss)
        if (this.damage > 0) {
            const damageRoll = rollDamageWithValue(this.damage);
            
            // Show damage number
            createDamageNumber(damageRoll.total, this.target, false);
            
            // Apply damage to target's health
            const oldKP = parseInt(this.target.character.currentKP, 10);
            this.target.character.currentKP = Math.max(0, oldKP - damageRoll.total);
            
            // Update initiative HP display
            updateInitiativeHP();
            
            logBattleEvent(`${this.attacker.character.name}'s Fadenschuss trifft ${this.target.character.name} für ${damageRoll.total} Schaden!`);
        } else {
            logBattleEvent(`${this.attacker.character.name}'s Fadenschuss trifft ${this.target.character.name}!`);
        }
        
        // Reduce initiative by 1 stage
        const initiativeChange = changeInitiative(
            this.target.character.uniqueId, 
            -1, 
            "Fadenschuss"
        );
        
        // Log initiative change
        logBattleEvent(`${this.target.character.name}'s Initiative wurde reduziert!`);
        
        // Apply snared status effect
        const statusEffect = {
            id: 'snared',
            name: 'Verstrickt',
            effect: 'Kann sich nicht bewegen oder ausweichen bis zum Ende des nächsten Zuges.',
            duration: 1, // 1 turn
            cssClass: 'status-snared',
            htmlSymbol: '🕸️',
            preventMovement: true,
            preventDodge: true,
            canBeRemoved: true,
            hidden: true // Hidden status effect
        };
        
        // Add status effect with source information
        const statusAdded = addStatusEffect(
            this.target.character, 
            'snared', 
            {
                sourceId: this.attacker.character.uniqueId,
                sourceName: this.attacker.character.name,
                duration: 1, // Duration at top level
                customEffect: statusEffect
            }
        );
        
        if (statusAdded) {
            logBattleEvent(`${this.target.character.name} wurde verstrickt und kann sich nicht mehr bewegen!`);
            this.targetHit = true;
        }
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
        
        // Check if it's time to apply effects if not yet applied
        const currentTime = Date.now();
        const age = currentTime - this.creationTime;
        
        // Apply effects after 300ms
        if (age >= 300 && !this.effectsApplied) {
            this.applyEffects();
        }
        
        // Start fade after 600ms
        if (age >= 600 && !this.fadingOut) {
            this.startFadeOut();
        }
        
        // Destroy after 1000ms total
        if (age >= 1000) {
            this.destroy();
            return false;
        }
        
        return true;
    }
    
    /**
     * Destroy the Fadenschuss attack
     */
    destroy() {
        // If already marked as removed, avoid duplicate processing
        if (this.removed) return;
        
        // Mark as removed
        this.removed = true;
        
        // Clear timeouts
        if (this.effectsTimeout) clearTimeout(this.effectsTimeout);
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
                console.error("Error in Fadenschuss callback:", error);
            }
        }
    }
}

/**
 * Create a new Fadenschuss attack
 * @param {Object} attacker - The attacker Pokémon
 * @param {Object} target - The target Pokémon/position
 * @param {Object} attack - The attack data
 * @param {boolean} isHit - Whether the attack should hit or miss
 * @param {Function} callback - Function to call when attack is complete
 * @param {Array} activeProjectiles - Reference to the active projectiles array
 * @returns {FadenschussAttack} - The created Fadenschuss attack
 */
export function createFadenschuss(attacker, target, attack, isHit, callback, activeProjectiles) {
    return new FadenschussAttack(attacker, target, attack, isHit, callback, activeProjectiles);
}

/**
 * Add the Fadenschuss CSS to the document
 */
export function addFadenschussStyles() {
    // Check if styles already exist
    if (document.getElementById('fadenschuss-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'fadenschuss-styles';
    
    // Define the CSS
    styleElement.textContent = `
        /* Fadenschuss (String Shot) styling */
        .fadenschuss-string {
            background: linear-gradient(to right, #c5e04a, #a4c51e);
            height: 3px; /* Thinner than Rankenhieb */
            border-radius: 2px;
            box-shadow: 0 0 6px rgba(197, 224, 74, 0.5);
            position: absolute;
            left: 0;
            top: 0;
            transform-origin: left center;
            opacity: 0.8;
        }

        /* Styling for the Fadenschuss growth animation */
        @keyframes fadenschussGrow {
            0% { transform: scaleX(0) rotate(var(--angle)); }
            100% { transform: scaleX(1) rotate(var(--angle)); }
        }
        
        /* Web effect animations */
        @keyframes fadenschussWebAppear {
            0% { opacity: 0; transform: rotate(var(--angle)) translateY(-50%) scaleX(0.3); }
            70% { opacity: 0.9; transform: rotate(var(--angle)) translateY(-50%) scaleX(1.1); }
            100% { opacity: 0.8; transform: rotate(var(--angle)) translateY(-50%) scaleX(1); }
        }
        
        @keyframes fadenschussTextAppear {
            0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
            70% { opacity: 1; transform: translateX(-50%) translateY(-5px); }
            100% { opacity: 0.9; transform: translateX(-50%) translateY(0); }
        }
        
        /* Snared status effect styling */
        .status-snared {
            background-color: #c5e04a;
            color: #5d7c21;
        }
        
        /* Fadenschuss projectile transition */
        .projectile.fadenschuss {
            transition: opacity 0.5s ease-out;
        }
        
        /* Fadenschuss web effect - the wrapped strings around target */
        .fadenschuss-web-effect {
            pointer-events: none;
            transition: opacity 0.8s ease-out;
        }
        
        .fadenschuss-web-string {
            box-shadow: 0 0 3px rgba(197, 224, 74, 0.6);
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleElement);
}

/**
 * Check if Fadenschuss can be used on a target
 * @param {Object} target - Target character data
 * @returns {boolean} - Whether the target can be affected by Fadenschuss
 */
export function isValidFadenschussTarget(target) {
    if (!target || !target.character) return false;
    
    // We need to find the character in the initiative system to check its stage
    // Import the initiative module synchronously to avoid async issues
    try {
        // This is a workaround to access the initiative system without async imports
        const initiativeModule = window.gameModules?.initiative;
        if (initiativeModule && initiativeModule.getSortedCharactersDisplay) {
            const characters = initiativeModule.getSortedCharactersDisplay();
            
            // Find the character in the initiative list
            const characterEntry = characters.find(entry => 
                entry.character && entry.character.uniqueId === target.character.uniqueId
            );
            
            // If found and initiative stage is already at minimum (-6), Fadenschuss shouldn't be used
            if (characterEntry && characterEntry.initiativeStage <= -6) {
                return false;
            }
        }
        
        // If we couldn't access the initiative system or character wasn't found, or if the stage is > -6
        // Default to allowing the attack
        return true;
    } catch (error) {
        // If there's any error in the check, default to allowing the attack
        console.error("Error checking Fadenschuss validity:", error);
        return true;
    }
}

/**
 * Apply Fadenschuss effects (initiative reduction)
 */
export function applyFadenschussEffects(attacker, validTargets, attack, results) {
    let successfulTargets = 0;
    
    validTargets.forEach(target => {
        const result = changeStatValue(target.character, 'init', -1, attacker.character);
        
        if (result.success) {
            successfulTargets++;
            applyVisualHitEffect(target.id, 'web');
            
            results.effects.push({
                targetId: target.id,
                type: 'stat',
                statChange: { stat: 'init', change: -1 }
            });
        }
    });
    
    if (successfulTargets > 0) {
        results.messages.push(`${attacker.character.name}'s Fadenschuss verlangsamt ${successfulTargets} Pokémon!`);
    } else {
        results.messages.push(`Fadenschuss von ${attacker.character.name} hat keine Wirkung!`);
    }
}