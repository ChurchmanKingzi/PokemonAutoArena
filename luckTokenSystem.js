/**
 * Luck Token (Glücks-Token) system for combat checks
 */

import { rollAttackDice } from './diceRoller.js';
import { logBattleEvent } from './battleLog.js';
import { getCharacterPositions } from './characterPositions.js';
import { TILE_SIZE } from './config.js';

/**
 * Check if a character has luck tokens available
 * @param {Object} character - The character to check
 * @returns {number} - Number of available luck tokens
 */
export function getAvailableLuckTokens(character) {
    if (!character) return 0;
    
    // Check if character has luck tokens defined in combat stats
    if (character.combatStats && typeof character.combatStats.luckTokens !== 'undefined') {
        return parseInt(character.combatStats.luckTokens, 10) || 0;
    }
    
    return 0;
}

/**
 * Use a luck token to reroll a check
 * @param {Object} character - The character using the luck token
 * @param {Object} originalRoll - The original roll result
 * @param {number} diceCount - Number of dice for the reroll
 * @param {string|null} charId - Optional character ID for visual effects
 * @returns {Object} - The new roll result, or original if no tokens available
 */
export function useLuckToken(character, originalRoll, diceCount, charId = null) {
    // Check if character has luck tokens available
    const availableTokens = getAvailableLuckTokens(character);
    
    if (availableTokens <= 0) {
        return {
            success: false,
            roll: originalRoll,
            message: `${character.name} hat keine Glücks-Tokens mehr.`
        };
    }
    
    // Use a luck token
    character.combatStats.luckTokens = Math.max(0, availableTokens - 1);
    
    // Show the clover icon if we have a character ID
    if (charId) {
        showCloverIcon(charId);
    } else {
        // Try to find character ID by name
        const characterPositions = getCharacterPositions();
        const foundCharId = Object.keys(characterPositions).find(id => 
            characterPositions[id].character === character);
        
        if (foundCharId) {
            showCloverIcon(foundCharId);
        }
    }
    
    // Perform the reroll without any penalties from previous forcing
    const newRoll = rollAttackDice(diceCount);
    
    // Determine which roll is better (higher net successes)
    const betterRoll = newRoll.netSuccesses > originalRoll.netSuccesses ? newRoll : originalRoll;
    
    // Create result message
    const resultMessage = `${character.name} setzt einen Glücks-Token ein! ` +
        `Erster Wurf: [${originalRoll.rolls.join(', ')}] = ${originalRoll.netSuccesses} Netto. ` +
        `Neuer Wurf: [${newRoll.rolls.join(', ')}] = ${newRoll.netSuccesses} Netto. ` +
        `${betterRoll === newRoll ? 'Der bessere neue Wurf zählt!' : 'Der ursprüngliche Wurf war besser und zählt!'}`;
    
    return {
        success: true,
        roll: betterRoll,
        originalRoll: originalRoll,
        newRoll: newRoll,
        message: resultMessage
    };
}

/**
 * Determine if a character should use a luck token based on the situation
 * @param {Object} character - The character to check
 * @param {Object} rollResult - The roll result that might trigger luck token use
 * @param {boolean} isCriticalSituation - Whether this is a critical situation (dodge vs crit)
 * @returns {boolean} - Whether to use a luck token
 */
export function shouldUseLuckToken(character, rollResult, isCriticalSituation = false) {
    const availableTokens = getAvailableLuckTokens(character);
    
    // No tokens available
    if (availableTokens <= 0) return false;
    
    // Always use if critically failed (net success <= -3)
    if (rollResult.netSuccesses <= -3) return true;
    
    // Determine base chance based on situation
    let baseChance = 0.3; // 30% base chance to use luck token on failed rolls
    
    // Increase chance for certain situations
    if (isCriticalSituation) {
        baseChance = 0.75; // 75% chance in critical situations
    } else if (rollResult.netSuccesses === -2) {
        baseChance = 0.5; // 50% chance on moderate failures
    } else if (rollResult.netSuccesses === -1) {
        baseChance = 0.4; // 40% chance on minor failures
    } else if (rollResult.netSuccesses === 0) {
        baseChance = 0.25; // 25% chance on neutral results
    } else if (rollResult.netSuccesses > 0) {
        return false; // Don't use on successful rolls
    }
    
    // Random chance based on situation
    return Math.random() < baseChance;
}

/**
 * Reset luck tokens when a character defeats an enemy
 * @param {string} charId - Character ID of the victor
 */
export function handleKillLuckTokenReset(charId) {
    const characterPositions = getCharacterPositions();
    const character = characterPositions[charId]?.character;
    
    if (!character) return;
    
    // Calculate maximum tokens: 1 token for every 80 full points the base stat total is below 600
    const baseStatTotal = character.statsDetails?.baseStatTotal || 500; // Default if not available
    const maxTokens = Math.max(1, Math.floor((600 - baseStatTotal) / 80) + 1);
    
    // Reset tokens to maximum
    if (character.combatStats) {
        character.combatStats.luckTokens = maxTokens;
        
        // Don't log here - we'll handle that in the main attack flow
    }
}

/**
 * Add a golden aura effect to a character
 * @param {string} charId - ID of the character to add the effect to
 */
function addGoldenAuraEffect(charId) {
    const characterPositions = getCharacterPositions();
    const charData = characterPositions[charId];
    
    if (!charData) return;
    
    // Find the character element in the DOM
    const characterTile = document.querySelector(`.battlefield-tile[data-x="${charData.x}"][data-y="${charData.y}"]`);
    if (!characterTile) return;
    
    const characterElement = characterTile.querySelector(`.battlefield-character[data-character-id="${charId}"]`);
    if (!characterElement) return;
    
    // Add the golden aura class
    characterElement.classList.add('golden-aura');
    
    // Remove the class after the animation duration (2 seconds)
    setTimeout(() => {
        characterElement.classList.remove('golden-aura');
    }, 2000);
}

function showCloverIcon(charId) {
    const characterPositions = getCharacterPositions();
    const charData = characterPositions[charId];
    
    if (!charData) return;
    
    // Find the battlefield element for positioning
    const battlefield = document.querySelector('.battlefield-grid');
    if (!battlefield) return;
    
    // Position clover exactly where damage numbers appear
    // Create the clover icon element
    const cloverIcon = document.createElement('div');
    cloverIcon.className = 'luck-token-clover';
    
    // Calculate position (similar to damage numbers)
    const posX = (charData.x * TILE_SIZE) + (TILE_SIZE / 2);
    const posY = (charData.y * TILE_SIZE) + (TILE_SIZE * 0.3) - 35;
    
    cloverIcon.style.left = `${posX}px`;
    cloverIcon.style.top = `${posY}px`;
    
    // Create the SVG for the four-leaf clover with darker colors
    cloverIcon.innerHTML = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Four leaves with darker colors -->
            <ellipse class="clover-leaf" cx="50" cy="30" rx="20" ry="20" />
            <ellipse class="clover-leaf" cx="70" cy="50" rx="20" ry="20" />
            <ellipse class="clover-leaf" cx="50" cy="70" rx="20" ry="20" />
            <ellipse class="clover-leaf" cx="30" cy="50" rx="20" ry="20" />
            <!-- Stem -->
            <path class="clover-stem" d="M50,70 Q45,85 50,100" stroke-width="4" />
        </svg>
    `;
    
    // Add the clover icon to the battlefield (not document.body)
    battlefield.appendChild(cloverIcon);
    
    // Remove the clover icon after the animation duration (1.5 seconds)
    setTimeout(() => {
        if (cloverIcon.parentNode) {
            cloverIcon.parentNode.removeChild(cloverIcon);
        }
    }, 1500);
}