import { logBattleEvent } from '../battleLog.js';
import { getCharacterPositions } from '../characterPositions.js';
import { getTrainers } from '../teamManager.js';
import { findValidSwapTargets, executeSwap } from '../swapAllies.js';

/**
 * Handle Jongleur class effect - swap Pokemon positions
 * @param {Object} activeCharacter - The Pokemon that just completed its turn
 * @param {string} activeCharId - The character ID
 */
export async function handleJongleurSwap(activeCharacter, activeCharId) {
    const trainers = getTrainers();
    
    // Get character positions
    const characterPositions = getCharacterPositions();
    const charData = characterPositions[activeCharId];
    
    if (!charData) return;
    
    // Check if this Pokemon's trainer is a Jongleur
    const trainer = trainers[charData.teamIndex];
    if (!trainer || trainer.class !== 'jongleur') {
        return;
    }
    
    // Find all valid teammates for swapping
    const validSwapTargets = findValidSwapTargets(activeCharId, characterPositions);
    
    if (validSwapTargets.length === 0) {
        logBattleEvent(`${activeCharacter.character.name} findet keinen Partner zum Tauschen.`);
        return;
    }
    
    // Randomly select a teammate to swap with
    const targetCharId = validSwapTargets[Math.floor(Math.random() * validSwapTargets.length)];
    const targetData = characterPositions[targetCharId];
    
    // Log the swap
    logBattleEvent(`🎪 ${trainer.name} tauscht ${activeCharacter.character.name} und ${targetData.character.name}!`);
    
    // Execute the swap with animations and camera movement using the shared module
    await executeSwap(activeCharId, targetCharId, {
        showFlash: true,
        moveCameraToFirst: true,
        moveCameraToBoth: true,
        swapReason: `🎪 ${trainer.name}`
    });
}