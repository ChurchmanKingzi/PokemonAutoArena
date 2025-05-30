/**
 * Battle Reset System
 * Provides a comprehensive reset of all battle state when returning to team builder
 */

import { resetTurn } from './turnSystem.js';
import { resetBattleLog } from './battleLog.js';
import { resetCamera } from './cameraSystem.js';
import { cleanupMinimapSystem } from './minimapSystem.js';
import { resetSwimmingRegistry } from './terrainEffects.js';
import { resetWeather, cleanupWeatherSystem } from './weather.js';
import { resetDoubleTurnSystem } from './doubleTurnSystem.js';
import { getCharacterPositions, setCharacterPositions } from './characterPositions.js';
import { resetTakenTurnsTracker } from './initiativeChanges.js';
import { resetStatModifications } from './statChanges.js';
import { removeAllStatusEffects } from './statusEffects.js';
import { resetSandAttackCounter } from './Abilities/sandgewalt.js';
import { handleTurnChainBreaking } from './Attacken/walzer.js';

/**
 * Reset all battle state
 * This function is called when returning to the character selection screen
 * @returns {Promise<void>} - Promise that resolves when all reset operations are complete
 */
export async function resetBattle() {
    try {
        console.log("Performing comprehensive battle reset...");
        
        // 1. CRITICAL: Clear all projectiles and their callbacks FIRST
        try {
            const { clearAllProjectiles } = await import('./projectileSystem.js');
            clearAllProjectiles();
            
            // Wait a moment to ensure all projectiles are cleared
            await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
            console.error("Error clearing projectiles:", error);
        }
        
        // 2. Reset turn-related state (this will also reset the endTurn flags)
        resetTurn();
        resetTakenTurnsTracker();
        resetDoubleTurnSystem();
        
        // 3. Reset UI elements
        resetBattleLog();
        resetCamera();
        cleanupMinimapSystem();
        
        // 4. Reset environmental effects
        resetSwimmingRegistry();
        resetWeather();
        cleanupWeatherSystem();
        resetSandAttackCounter();
        
        // 5. Reset character-specific state
        await resetAllCharacterState();
        
        // 6. Clean up visual elements
        cleanupBattlefieldElements();
        
        // 7. Clear character positions
        setCharacterPositions({});
        
        // 8. Additional cleanup - remove any orphaned event listeners
        cleanupOrphanedEventListeners();

        try {
            const { clearActiveAttackCallbacks } = await import('./attackSystem.js');
            clearActiveAttackCallbacks();
        } catch (error) {
            console.warn("Could not clear attack callbacks:", error);
        }
        
        // 9. Wait to ensure everything is properly cleaned up
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log("Battle reset completed successfully");
        return true;
    } catch (error) {
        console.error("Error during battle reset:", error);
        
        // Emergency cleanup
        try {
            setCharacterPositions({});
            cleanupBattlefieldElements();
            
            // Emergency projectile cleanup
            try {
                const { clearAllProjectiles } = await import('./projectileSystem.js');
                clearAllProjectiles();
            } catch (e) {
                console.warn("Emergency projectile cleanup failed:", e);
            }
        } catch (e) {
            console.error("Failed even basic cleanup:", e);
        }
        return false;
    }
}

/**
 * Reset all character-specific state
 * @returns {Promise<void>} - Promise that resolves when all character state is reset
 */
async function resetAllCharacterState() {
    // Get character positions before clearing them to reset stats
    const characterPositions = getCharacterPositions();
    const allCharacters = [];
    
    // Collect all characters and their IDs
    for (const charId in characterPositions) {
        const position = characterPositions[charId];
        if (position.character) {
            allCharacters.push({
                id: charId,
                character: position.character
            });
        }
    }
    
    // Reset each character's state
    for (const { id, character } of allCharacters) {
        try {
            // 1. Reset KP to max
            resetCharacterKP(character);
            
            // 2. Remove all status effects
            removeAllStatusEffects(character);
            
            // 3. Reset stat modifications
            await resetStatModifications(character);
            
            // 4. Reset PP for all attacks
            resetAttackPP(character);
            
            // 5. Reset special flags
            resetCharacterFlags(character);
            
            // 6. Break any move chains (like Walzer)
            handleTurnChainBreaking(character, 'reset');
            
        } catch (error) {
            console.error(`Error resetting character ${character.name}:`, error);
        }
    }
}

/**
 * Reset a character's KP to maximum
 * @param {Object} character - The character to reset
 */
function resetCharacterKP(character) {
    if (!character) return;
    
    // Determine max KP from various possible sources
    let maxKP = 0;
    
    if (character.maxKP) {
        maxKP = character.maxKP;
    } else if (character.combatStats && character.combatStats.kp) {
        maxKP = character.combatStats.kp;
    } else if (character.stats && character.stats.hp) {
        maxKP = character.stats.hp;
    }
    
    // Set current KP to max
    if (maxKP > 0) {
        character.currentKP = maxKP;
    }
}

/**
 * Reset PP for all character attacks
 * @param {Object} character - The character to reset
 */
function resetAttackPP(character) {
    if (!character || !character.attacks) return;
    
    // Reset PP for all attacks
    character.attacks.forEach(attack => {
        if (attack.pp !== undefined && attack.currentPP !== undefined) {
            attack.currentPP = attack.pp;
        }
        if (attack.ammo !== undefined && attack.currentAmmo !== undefined) {
            attack.currentAmmo = attack.ammo;
        }
    });
}

/**
 * Reset character flags that might affect battle behavior
 * @param {Object} character - The character to reset
 */
function resetCharacterFlags(character) {
    if (!character) return;
    
    // Reset battle-specific flags
    character.skipTurn = false;
    character.skipTurnThisRound = false;
    character.isConfused = false;
    character.isDefeated = false;
    character.hasUsedDodge = false;
    character.hasUsedLuckToken = false;
    character.hasPassedSwimmingCheck = false;
    character.attackAllies = false;
    
    // Reset any other flags that might be set during battle
    character.usedEinigler = false;
    
    // Clear any temporary buffs array
    if (character.buffs) {
        character.buffs = [];
    }
}

/**
 * Clean up all battlefield visual elements
 */
/**
 * Enhanced cleanupBattlefieldElements with callback prevention
 */
function cleanupBattlefieldElements() {
    // Remove battlefield grid
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (battlefieldGrid) {
        battlefieldGrid.remove();
    }
    
    // Remove initiative display
    const initiativeOrder = document.querySelector('.initiative-order');
    if (initiativeOrder) {
        initiativeOrder.remove();
    }
    
    // Remove battle log
    const battleLog = document.querySelector('.battle-log-container');
    if (battleLog) {
        battleLog.remove();
    }
    
    // Remove any active character highlighting
    const activeCharacters = document.querySelectorAll('.battlefield-character.active');
    activeCharacters.forEach(char => {
        char.classList.remove('active');
    });
    
    // ENHANCED: More thorough cleanup of animation elements
    const animationSelectors = [
        '.battlefield-character',
        '.damage-number',
        '.projectile', // CRITICAL: Remove all projectiles
        '.impact-effect',
        '.dodge-animation-wrapper',
        '.melee-attack-animation-wrapper',
        '.status-effect-indicator',
        '.stat-boost-bounce',
        '.stat-arrow',
        '.cone-indicator',
        '.area-effect-particle',
        '.animation-wrapper',
        '.giftpuder',
        '.stachelspore',
        '.schlafpuder',
        '.sandwirbel',
        '.rankenhieb',
        '.glut',
        '.aquaknarre',
        '.donnerschock',
        '.steinwurf',
        '.pokemon-overlay',
        '.hp-bar-container',
        '.status-icons-container',
        '.awake-text',
        '.weather-effect-container',
        '.orphaned-projectile',
        '[data-projectile-id]', // Any element with projectile ID
        '[data-batch-id]' // Area effect batches
    ];
    
    // Remove all animation elements with better error handling
    animationSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                try {
                    // Clear any potential callbacks or references
                    if (el.callback) el.callback = null;
                    if (el.onclick) el.onclick = null;
                    
                    // Remove from DOM
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                } catch (removeError) {
                    console.warn(`Failed to remove element:`, removeError);
                }
            });
        } catch (selectorError) {
            console.warn(`Error with selector ${selector}:`, selectorError);
        }
    });

    clearStrategyDisplayCache();
    
    // Clear known intervals and timeouts
    const knownIntervals = [
        'particleCleanupInterval',
        'animationLoopWatchdog'
    ];
    
    knownIntervals.forEach(intervalName => {
        if (window[intervalName]) {
            clearInterval(window[intervalName]);
            window[intervalName] = null;
        }
    });
    
    // Clear particle cleanup intervals
    for (const key in window) {
        if (key.startsWith('particleCleanup_')) {
            clearInterval(window[key]);
            window[key] = null;
        }
    }
    
    console.log("Enhanced battlefield cleanup completed");
}

/**
 * Clear strategy buff display cache for a character
 * This fixes the issue where tooltips show old strategy values after battle
 * @param {Object} character - The character to clear cache for
 */
export function clearStrategyDisplayCache(character) {
    if (!character) return;
    
    // Clear the cached "original" values that the tooltip system uses
    // This forces the tooltip to recalculate the true base values when strategies are next applied
    delete character.originalStatsBeforeStrategyBuff;
    delete character.originalBaseStatsBeforeStrategyBuff;
    
    console.log(`Cleared strategy display cache for ${character.name}`);
}

/**
 * Clean up orphaned event listeners that might cause issues
 */
function cleanupOrphanedEventListeners() {
    // Remove any orphaned projectile-related event listeners
    // This is a more aggressive approach to ensure no callbacks remain
    
    try {
        // Find and remove any elements that might have orphaned listeners
        const orphanedElements = document.querySelectorAll('[data-projectile-id], .projectile, .animation-wrapper');
        orphanedElements.forEach(element => {
            // Clone and replace to remove all event listeners
            const newElement = element.cloneNode(true);
            if (element.parentNode) {
                element.parentNode.replaceChild(newElement, element);
            }
        });
        
        console.log("Cleaned up orphaned event listeners");
    } catch (error) {
        console.warn("Error cleaning up orphaned event listeners:", error);
    }
}