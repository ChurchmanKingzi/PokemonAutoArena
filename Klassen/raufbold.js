
import { getCharacterPositions } from '../characterPositions.js';
import { createDamageNumber } from '../damageNumbers.js';
import { logBattleEvent } from '../battleLog.js';

/**
 * Initialize protection charges for Raufbold trainer's Pokemon
 * @param {number} teamIndex - Index of the team with Raufbold trainer
 * @param {Object} trainer - Trainer object
 */
export async function initializeRaufboldProtection(teamIndex, trainer) {
    try {
        const characterPositions = getCharacterPositions();
        
        // Log the Raufbold effect activation
        logBattleEvent(`<div class="log-raufbold-message">👊 ${trainer.name} gibt seinen Pokémon Schutz!</div>`, true);
        
        // Counter for Pokemon affected
        let protectedCount = 0;
        
        // Go through all characters and apply protection to Raufbold's team
        for (const charId in characterPositions) {
            const charData = characterPositions[charId];
            
            // Only apply to Pokemon on the Raufbold's team
            if (charData.teamIndex !== teamIndex) continue;
            
            // Skip defeated Pokemon
            if (charData.isDefeated) continue;
            
            // Skip Pokemon with 0 or negative KP
            if (charData.character && charData.character.currentKP <= 0) continue;
            
            // Add protection charges
            if (charData.character) {
                // Initialize protection charges
                charData.character.raufboldProtection = 2;
                protectedCount++;
                
                // Add visual indicator
                updateRaufboldProtectionVisual(charId, charData.character);
            }
        }
        
        // Log summary of effect
        if (protectedCount > 0) {
            logBattleEvent(`<div class="log-raufbold-message">👊 ${trainer.name} hat ${protectedCount} Pokémon mit Schutz ausgestattet!</div>`, true);
        }
        
    } catch (error) {
        console.error('Error in initializeRaufboldProtection:', error);
        logBattleEvent(`<div class="log-raufbold-message">💥 ${trainer.name}'s Schutz konnte nicht aktiviert werden!</div>`, true);
    }
}

/**
 * Update visual indicator for Raufbold protection
 * @param {string} charId - Character ID
 * @param {Object} pokemon - Pokemon object
 */
export function updateRaufboldProtectionVisual(charId, pokemon) {
    // Skip if Pokemon has no protection or protection is depleted
    if (!pokemon.raufboldProtection) return;
    
    // Find character elements on battlefield
    const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${charId}"]`);
    
    characterEls.forEach(charEl => {
        // Remove any existing protection indicators
        const existingIndicator = charEl.querySelector('.raufbold-protection');
        if (existingIndicator) {
            charEl.removeChild(existingIndicator);
        }
        
        // Create new protection indicator
        const protectionIndicator = document.createElement('div');
        protectionIndicator.className = 'raufbold-protection';
        protectionIndicator.innerHTML = `<span>${pokemon.raufboldProtection}</span>`;
        
        // Add to character element
        charEl.appendChild(protectionIndicator);
    });
}

/**
 * Check if a Pokemon has Raufbold protection and use it if present
 * @param {Object} target - The target Pokemon
 * @param {Object} attacker - The attacking Pokemon
 * @returns {boolean} - Whether protection was used
 */
export function checkAndUseRaufboldProtection(target, attacker) {
    // Skip if target is not from a Raufbold team or has no protection
    if (!target || !target.raufboldProtection) return false;
    
    // Protection doesn't apply to self-attacks
    if (target === attacker) return false;
    
    // Protection is active - use one charge
    target.raufboldProtection--;
    
    // Update visual indicator
    setTimeout(() => {
        // Find character ID using Pokemon's uniqueId
        import('../characterPositions.js').then(module => {
            const { getCharacterPositions } = module;
            const characterPositions = getCharacterPositions();
            
            for (const charId in characterPositions) {
                if (characterPositions[charId].character && 
                    characterPositions[charId].character.uniqueId === target.uniqueId) {
                    
                    updateRaufboldProtectionVisual(charId, target);
                    break;
                }
            }
        }).catch(err => {
            console.error("Error finding character ID:", err);
        });
    }, 0);
    
    return true;
}

/**
 * Create a visual protection effect when Raufbold protection is used
 * @param {Object} target - Target data
 */
export function createProtectionEffect(target) {
    // Find character elements on battlefield
    const targetId = Object.keys(getCharacterPositions()).find(id => 
        getCharacterPositions()[id].character === target.character);
    
    if (!targetId) return;
    
    const characterEls = document.querySelectorAll(`.battlefield-character[data-character-id="${targetId}"]`);
    
    characterEls.forEach(charEl => {
        // Create protection flash effect
        const protectionFlash = document.createElement('div');
        protectionFlash.className = 'raufbold-protection-flash';
        
        // Add to character element
        charEl.appendChild(protectionFlash);
        
        // Remove after animation completes
        setTimeout(() => {
            if (protectionFlash.parentNode === charEl) {
                charEl.removeChild(protectionFlash);
            }
        }, 500);
    });
    
    // Also create a floating text indicator
    createDamageNumber("GESCHÜTZT!", target, false, 'protected');
}