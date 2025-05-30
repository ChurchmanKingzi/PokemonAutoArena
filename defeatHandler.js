/**
 * Centralized character defeat handling system
 * Handles all defeat-related effects in one place
 */

import { logBattleEvent } from './battleLog.js';
import { removeDefeatedCharacter, getCharacterPositions } from './characterPositions.js';
import { updateInitiativeHP, displayInitiativeOrder } from './initiativeDisplay.js';
import { removeDefeatedFromLogic, markDefeatedInDisplay } from './initiative.js';
import { handleKillLuckTokenReset } from './luckTokenSystem.js';
import { handleDefeatChainBreaking } from './Attacken/walzer.js';
import { getSortedCharactersDisplay } from './initiative.js';
import { updatePokemonHPBar } from './pokemonOverlay.js';

import { shouldApplyDiebEffect, applyDiebEffect } from './Klassen/dieb.js';
import { shouldTriggerNinjajungeExplosion, triggerNinjajungeExplosion } from './Klassen/ninjajunge.js';
import { areExplosionsInProgress } from './turnSystem.js';

/**
 * Central function to handle ALL character defeats
 * @param {Object} defeatedCharacter - The defeated character object
 * @param {string} defeatedCharId - The defeated character's ID
 * @param {Object} attacker - The attacking character (null for status/environmental deaths)
 * @param {string} attackerCharId - The attacker's character ID (null for status/environmental deaths)
 * @param {Object} options - Additional options
 * @param {boolean} options.isStatusDeath - Whether death was from status effects
 * @param {boolean} options.skipDiebCheck - Whether to skip Dieb stealing (e.g., for explosions)
 * @returns {Promise<boolean>} - Whether the character was actually defeated (false if stolen by Dieb)
 */
export async function handleCharacterDefeat(defeatedCharacter, defeatedCharId, attacker = null, attackerCharId = null, options = {}) {
    const { isStatusDeath = false, skipDiebCheck = false } = options;
    
    // Ensure HP is 0
    defeatedCharacter.currentKP = 0;
    
    // Get character positions for position data
    const characterPositions = getCharacterPositions();
    const defeatedPosition = characterPositions[defeatedCharId];
    
    if (!defeatedPosition) {
        return true;
    }
    
    // Step 1: Handle Walzer chain breaking (always happens first)
    handleDefeatChainBreaking(defeatedCharacter);
    
    // Step 2: Check for Dieb effect (if applicable)
    if (!skipDiebCheck && attacker && shouldApplyDiebEffect(attacker, defeatedCharacter, true)) {
        // Apply the Dieb effect
        const stealSuccessful = await applyDiebEffect(attacker, defeatedCharacter, defeatedCharId);
        
        if (stealSuccessful) {
            // Pokemon was stolen, not defeated
            logBattleEvent(`${attacker.trainer.name} stiehlt ${defeatedCharacter.name} und fügt es seinem Team hinzu!`);
            logBattleEvent(`${defeatedCharacter.name} überlebt mit ${defeatedCharacter.currentKP} KP!`);
            
            // Update HP displays to show the Pokemon is still alive
            updateInitiativeHP();
            updatePokemonHPBar(defeatedCharId, defeatedCharacter);
            
            return false; // Character was not actually defeated
        }
    }
    
    // Step 3: Log defeat message
    if (isStatusDeath) {
        logBattleEvent(`${defeatedCharacter.name} wurde besiegt!`);
    } else if (attacker) {
        logBattleEvent(`${defeatedCharacter.name} ist besiegt und verlässt den Kampf!`);
    } else {
        logBattleEvent(`${defeatedCharacter.name} wurde besiegt!`);
    }
    
    // Step 4: Handle attacker benefits (luck token reset)
    if (attacker && attackerCharId) {
        handleKillLuckTokenReset(attackerCharId);
        
        const baseStatTotal = attacker.statsDetails?.baseStatTotal || 500;
        const maxTokens = Math.max(1, Math.floor((600 - baseStatTotal) / 80) + 1);
        
        logBattleEvent(`${attacker.name} hat einen Gegner besiegt und erhält alle Glücks-Tokens zurück! (${maxTokens})`);
    }
    
    // Step 5: Check for Ninjajunge explosion
    let explosionTriggered = false;
    if (shouldTriggerNinjajungeExplosion(defeatedCharacter)) {
        explosionTriggered = true;
        
        console.log(`Triggering Ninjajunge explosion for ${defeatedCharacter.name}`);
        
        try {
            // Trigger explosion and wait for it to complete
            await triggerNinjajungeExplosion(defeatedCharacter, defeatedPosition);
            
            console.log(`Ninjajunge explosion completed for ${defeatedCharacter.name}`);
        } catch (error) {
            console.error('Error during Ninjajunge explosion:', error);
        }
    }
    
    // Step 6: Remove from initiative system
    removeDefeatedFromLogic(defeatedCharacter.uniqueId);
    markDefeatedInDisplay(defeatedCharacter.uniqueId);
    
    // Step 7: Update displays
    updateInitiativeHP();
    displayInitiativeOrder(getSortedCharactersDisplay());
    
    // Step 8: Remove from battlefield (this should be last)
    removeDefeatedCharacter(defeatedCharId);
    
    // Step 9: WAIT for any remaining explosions to complete before returning
    if (explosionTriggered) {
        // Add a small delay to ensure all explosion effects are fully processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check that explosions are actually complete
        let waitCount = 0;
        while (areExplosionsInProgress() && waitCount < 50) { // Max 5 second wait
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        
        if (waitCount >= 50) {
            console.warn('Timeout waiting for explosions to complete in defeat handler');
        }
    }

    return true; // Character was actually defeated
}

/**
 * Simple wrapper to check if a character should be defeated and handle it
 * @param {Object} character - The character to check
 * @param {string} charId - The character's ID
 * @param {Object} attacker - The attacker (if any)
 * @param {string} attackerCharId - The attacker's ID (if any)
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} - Whether the character was defeated
 */
export async function checkAndHandleDefeat(character, charId, attacker = null, attackerCharId = null, options = {}) {
    if (character.currentKP <= 0) {
        return await handleCharacterDefeat(character, charId, attacker, attackerCharId, options);
    }
    return false;
}