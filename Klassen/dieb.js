import { getTeamColor } from '../charakterAuswahlUtils.js';
import { logBattleEvent } from '../battleLog.js';
import { getTeamAssignments } from '../teamManager.js';

/**
 * Dieb class implementation for the Pokemon battle system
 * This file contains the core implementation of the Dieb class mechanics
 */

// Add function to check if a Pokemon's trainer has the Dieb class
export function hasTrainerWithDiebClass(character) {
    // Skip if character has no trainer
    console.log(character);
    if (!character || !character.trainer) return false;
    
    return character.trainer.class === 'thief';
}

/**
 * Check if the Dieb effect should be applied when a Pokemon is defeated
 * @param {Object} attacker - The attacking Pokemon
 * @param {Object} target - The target Pokemon that was defeated
 * @param {boolean} directAttack - Whether this was a direct attack (not poison, etc.)
 * @returns {boolean} - Whether the Dieb effect should be applied
 */
export function shouldApplyDiebEffect(attacker, target, directAttack = true) {
    // Condition 1: Attacker must have a trainer with Dieb class
    if (!hasTrainerWithDiebClass(attacker)) return false;
    
    // Condition 2: Must be a direct attack (not poison, etc.)
    if (!directAttack) return false;
    
    // Condition 3: Target must be from a different team
    if (attacker.trainer && target.trainer && attacker.teamIndex === target.teamIndex) {
        return false;
    }
    
    const diebChance = 0.50;//50% Chance
    
    // Random roll to determine if effect triggers
    return Math.random() < diebChance;
}

export async function applyDiebEffect(attacker, target, targetId) {
    try {
        if(target.teamIndex && null || attacker.teamIndex == null)return;
        
        // Set target HP to 25% of max (increased from 10%)
        const maxHP = target.maxKP || target.combatStats.kp;
        target.currentKP = Math.max(1, Math.floor(maxHP * 0.25));
        
        // Clear all status effects from the stolen Pokemon using the dedicated function
        const { removeAllStatusEffects } = await import('../statusEffects.js');
        const removedEffects = removeAllStatusEffects(target);
        
        if (removedEffects.length > 0) {
            console.log(`Removed status effects from ${target.name}:`, removedEffects);
        }
        
        const teamAssignments = getTeamAssignments();
                
        // Get position information
        const { getCharacterPositions } = await import('../characterPositions.js');
        const characterPositions = getCharacterPositions();
        
        // Get team indices
        const attackerTeamIndex = attacker.teamIndex;
        const targetTeamIndex = target.teamIndex;
        
        // Log the theft
        logBattleEvent(`<div class="log-dieb-message">⚡ ${attacker.trainer.name} stiehlt ${target.name} vom gegnerischen Team!</div>`, true);
        

        // Remove from old team in team assignments (find the slot)
        let removedFromOldTeam = false;
        
        // Check if the target team exists in team assignments
        if (!teamAssignments || !Array.isArray(teamAssignments)) {
            console.error("Team assignments is not an array:", teamAssignments);
            return false;
        }
        
        // Make sure targetTeamIndex is within bounds
        if (targetTeamIndex < 0 || targetTeamIndex >= teamAssignments.length || !teamAssignments[targetTeamIndex]) {
            console.error("Target team index out of bounds:", targetTeamIndex, "available teams:", teamAssignments.length);
            
            // Try to find the Pokemon in any team
            let foundTeamIndex = -1;
            let foundSlotIndex = -1;
            
            for (let teamIdx = 0; teamIdx < teamAssignments.length; teamIdx++) {
                if (!teamAssignments[teamIdx]) continue;
                
                for (let slotIdx = 0; slotIdx < teamAssignments[teamIdx].length; slotIdx++) {
                    const slotPokemon = teamAssignments[teamIdx][slotIdx];
                    if (slotPokemon && slotPokemon.uniqueId === target.uniqueId) {
                        foundTeamIndex = teamIdx;
                        foundSlotIndex = slotIdx;
                        break;
                    }
                }
                
                if (foundTeamIndex !== -1) break;
            }
            
            if (foundTeamIndex !== -1) {
                console.log("Found Pokemon in team", foundTeamIndex, "slot", foundSlotIndex);
                teamAssignments[foundTeamIndex][foundSlotIndex] = null;
                removedFromOldTeam = true;
            } else {
                console.error("Could not find Pokemon in any team");
            }
        } else {
            // Search for the Pokemon in the original team assignments
            for (let slotIndex = 0; slotIndex < teamAssignments[targetTeamIndex].length; slotIndex++) {
                const slotPokemon = teamAssignments[targetTeamIndex][slotIndex];
                if (slotPokemon && slotPokemon.uniqueId === target.uniqueId) {
                    // Found the Pokemon - remove it from the slot
                    teamAssignments[targetTeamIndex][slotIndex] = null;
                    removedFromOldTeam = true;
                    break;
                }
            }
        }
        
        // Check if attacker team exists
        if (attackerTeamIndex < 0 || attackerTeamIndex >= teamAssignments.length || !teamAssignments[attackerTeamIndex]) {
            console.error("Attacker team index out of bounds:", attackerTeamIndex);
            return false;
        }
        
        // Find an empty slot in the new team
        let addedToNewTeam = false;
        
        // Find the first empty slot in the attacker's team
        for (let slotIndex = 0; slotIndex < teamAssignments[attackerTeamIndex].length; slotIndex++) {
            if (!teamAssignments[attackerTeamIndex][slotIndex]) {
                // Found an empty slot - add the Pokemon
                teamAssignments[attackerTeamIndex][slotIndex] = target;
                addedToNewTeam = true;
                break;
            }
        }
        
        // If no empty slot found, add a new slot
        if (!addedToNewTeam) {
            teamAssignments[attackerTeamIndex].push(target);
            addedToNewTeam = true;
        }
        
        // Update the target's trainer reference
        target.trainer = attacker.trainer;
        
        // Update position data to reflect the new team
        if (characterPositions[targetId]) {
            characterPositions[targetId].teamIndex = attackerTeamIndex;
            characterPositions[targetId].isDefeated = false; // Ensure it's not marked defeated
            
            // Change the color of the character on the battlefield
            const teamColor = getTeamColor(attackerTeamIndex);
            
            const characterElement = document.querySelector(`[data-character-id="${targetId}"]`);
            if (characterElement) {
                // Update the border color directly (this is how team colors are shown)
                characterElement.style.borderColor = teamColor;
                
                // Also try to find Pokemon sprite elements that might use different selectors
                const pokemonSprite = characterElement.querySelector('.pokemon-sprite') || 
                                     (characterElement.classList.contains('pokemon-sprite') ? characterElement : null);
                if (pokemonSprite) {
                    pokemonSprite.style.borderColor = teamColor;
                }
                
                // Also try battlefield character elements
                const battlefieldChar = characterElement.querySelector('.battlefield-character') ||
                                       (characterElement.classList.contains('battlefield-character') ? characterElement : null);
                if (battlefieldChar) {
                    battlefieldChar.style.borderColor = teamColor;
                }
                
                // Add a visual effect to show the steal
                characterElement.classList.add('stolen-pokemon');
                setTimeout(() => {
                    characterElement.classList.remove('stolen-pokemon');
                }, 2000);
            }
            
            // Update any HP bars with the new team color
            const hpBars = document.querySelectorAll(`[data-character-id="${targetId}"] .hp-bar`);
            hpBars.forEach(hpBar => {
                hpBar.style.backgroundColor = teamColor;
            });
        }
        
        // Update the initiative display to reflect the change
        const { displayInitiativeOrder, updateInitiativeHP } = await import('../initiativeDisplay.js');
        const { getSortedCharactersDisplay } = await import('../initiative.js');
        
        // Ensure the character is not marked as defeated in the initiative order
        const sortedCharactersDisplay = getSortedCharactersDisplay();
        sortedCharactersDisplay.forEach(entry => {
            if (entry.character && entry.character.uniqueId === target.uniqueId) {
                entry.isDefeated = false;
                entry.teamIndex = attackerTeamIndex;
                
                // Clear status effects from the initiative display entry as well
                if (entry.character.statusEffects) {
                    entry.character.statusEffects = [];
                }
            }
        });
        
        // Update the initiative display
        displayInitiativeOrder();
        updateInitiativeHP();
        
        // Apply a visual "stolen" effect with CSS
        addDiebClassStyles();
        
        // Log success
        console.log("Successfully stole Pokemon:", target.name);
        console.log("Restored Pokemon to 25% HP and cleared all status effects");
        return true;
    } catch (error) {
        console.error("Error applying Dieb effect:", error);
        return false;
    }
}

/**
 * Add CSS styles for Dieb class effects
 */
function addDiebClassStyles() {
    // Skip if styles already exist
    if (document.getElementById('dieb-class-styles')) return;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'dieb-class-styles';
    styleEl.textContent = `
        .log-dieb-message {
            color: #8e44ad;
            font-weight: bold;
            margin: 5px 0;
            padding: 5px;
            background-color: rgba(142, 68, 173, 0.1);
            border-left: 3px solid #8e44ad;
            animation: dieb-message-glow 1.5s ease-in-out;
        }
        
        @keyframes dieb-message-glow {
            0% { box-shadow: 0 0 5px rgba(142, 68, 173, 0.3); }
            50% { box-shadow: 0 0 15px rgba(142, 68, 173, 0.8); }
            100% { box-shadow: 0 0 5px rgba(142, 68, 173, 0.3); }
        }
        
        .stolen-pokemon {
            animation: stolen-effect 2s ease-in-out;
            z-index: 100;
        }
        
        @keyframes stolen-effect {
            0% { transform: scale(1); filter: none; }
            25% { transform: scale(1.2); filter: drop-shadow(0 0 10px #8e44ad); }
            50% { transform: scale(0.8); filter: drop-shadow(0 0 15px #8e44ad); }
            75% { transform: scale(1.1); filter: drop-shadow(0 0 10px #8e44ad); }
            100% { transform: scale(1); filter: none; }
        }
    `;
    
    document.head.appendChild(styleEl);
}