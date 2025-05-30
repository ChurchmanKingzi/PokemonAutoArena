import { forceCompleteAllAttacks } from './turnSystem.js';
import { resetReactionSystem, forceCompleteAllReactions, waitForReactionsToComplete } from './reactionSystem.js';

/**
 * Store the initial battle state when combat begins
 * This captures the state after battle initialization but before any angler effects
 */
export async function storeBattleStateForReset() {
    try {
        // Import necessary modules dynamically to avoid circular dependencies
        const [classManager, teamManager, characterPositions, initiative] = await Promise.all([
            import('./classManager.js'),
            import('./teamManager.js'), 
            import('./characterPositions.js'),
            import('./initiative.js')
        ]);
        
        const battleState = {
            teamAssignments: teamManager.getTeamAssignments(),
            characterPositions: characterPositions.getCharacterPositions(),
            sortedCharactersLogic: initiative.getSortedCharacters(),
            sortedCharactersDisplay: initiative.getSortedCharactersDisplay()
        };
        
        // Store in class manager
        classManager.storeOriginalBattleState(battleState);
        return true;
        
    } catch (error) {
        return false;
    }
}

/**
 * Reset battle to original state (remove angler-caught Pokemon)
 * Returns the teams to their original composition before any angler catches
 */
export async function resetBattleToOriginal() {
    try {
        // Import necessary modules INCLUDING attackSystem for cleanup
        const [classManager, characterPositions, initiative, pokemonOverlay, initiativeDisplay, attackSystem] = await Promise.all([
            import('./classManager.js'),
            import('./characterPositions.js'),
            import('./initiative.js'),
            import('./pokemonOverlay.js'),
            import('./initiativeDisplay.js'),
            import('./attackSystem.js') // ADD THIS
        ]);
        
        // CLEAR ALL ACTIVE ATTACKS AND PROJECTILES FIRST
        await attackSystem.completeAllActiveAttacks();

        // CLEAR ALL ACTIVE REACTIONS
        console.log("Waiting for reactions to complete before reset...");
        await waitForReactionsToComplete(3000); // Wait up to 3 seconds
        forceCompleteAllReactions(); // Force clear any remaining
        resetReactionSystem(); // Reset the reaction system state
        
        forceCompleteAllAttacks();
        
        // Get the original battle state
        const originalState = classManager.resetToOriginalBattleState();
        
        if (!originalState) {
            console.warn('No original state to reset to');
            return false;
        }
                
        // Clear any remaining visual effects (cones, particles, etc.)
        const battlefield = document.querySelector('.battlefield-grid');
        if (battlefield) {
            // Remove any lingering attack effects
            const attackEffects = battlefield.querySelectorAll('.attack-cone, .projectile, .eissturm-particles-container, .tile-highlights-container');
            attackEffects.forEach(effect => {
                if (effect.parentNode) {
                    effect.parentNode.removeChild(effect);
                }
            });
        }
        
        // 1. Reset character positions (removes angler Pokemon from battlefield data)
        characterPositions.setCharacterPositions(originalState.characterPositions);
        
        // 2. Reset initiative lists (removes angler Pokemon from turn order)
        initiative.setSortedCharacters(originalState.sortedCharactersLogic);
        initiative.setSortedCharactersDisplay(originalState.sortedCharactersDisplay);
        
        // 3. Clear and rebuild Pokemon overlay (removes angler Pokemon visually)
        pokemonOverlay.clearPokemonOverlay();
        
        // 4. Recreate Pokemon sprites for original Pokemon only
        for (const charId in originalState.characterPositions) {
            const charData = originalState.characterPositions[charId];
            pokemonOverlay.addPokemonToOverlay(charId, charData, charData.teamIndex);
        }
        
        // 5. Update initiative display to show only original Pokemon
        initiativeDisplay.displayInitiativeOrder();
        return true;
        
    } catch (error) {
        console.error('Error resetting battle state:', error);
        return false;
    }
}

/**
 * Check if there are any angler-caught Pokemon in the current battle
 * @returns {boolean} - True if angler Pokemon are present
 */
export async function hasAnglerPokemon() {
    try {
        const characterPositions = await import('./characterPositions.js');
        const positions = characterPositions.getCharacterPositions();
        
        // Check if any Pokemon are marked as angler catches
        for (const charId in positions) {
            const charData = positions[charId];
            if (charData.character && charData.character.isAnglerCatch) {
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('Error checking for angler Pokemon:', error);
        return false;
    }
}

/**
 * Get count of angler-caught Pokemon currently in battle
 * @returns {number} - Number of angler Pokemon
 */
export async function getAnglerPokemonCount() {
    try {
        const characterPositions = await import('./characterPositions.js');
        const positions = characterPositions.getCharacterPositions();
        
        let count = 0;
        
        // Count Pokemon marked as angler catches
        for (const charId in positions) {
            const charData = positions[charId];
            if (charData.character && charData.character.isAnglerCatch && !charData.isDefeated) {
                count++;
            }
        }
        
        return count;
        
    } catch (error) {
        console.error('Error counting angler Pokemon:', error);
        return 0;
    }
}

/**
 * Get list of angler-caught Pokemon currently in battle
 * @returns {Array} - Array of angler Pokemon data
 */
export async function getAnglerPokemonList() {
    try {
        const characterPositions = await import('./characterPositions.js');
        const positions = characterPositions.getCharacterPositions();
        
        const anglerPokemon = [];
        
        // Collect Pokemon marked as angler catches
        for (const charId in positions) {
            const charData = positions[charId];
            if (charData.character && charData.character.isAnglerCatch) {
                anglerPokemon.push({
                    charId: charId,
                    character: charData.character,
                    teamIndex: charData.teamIndex,
                    position: { x: charData.x, y: charData.y },
                    isDefeated: charData.isDefeated,
                    caughtByTrainer: charData.character.caughtByTrainer
                });
            }
        }
        
        return anglerPokemon;
        
    } catch (error) {
        console.error('Error getting angler Pokemon list:', error);
        return [];
    }
}