/**
 * Schneelandschaft (Snow Landscape) attack implementation
 * The user performs a graceful flowing dance while creating snow effects, then changes weather to snow
 */

import { updatePokemonPosition } from '../pokemonOverlay.js';
import { getCharacterPositions } from '../characterPositions.js';
import { changeWeather, getCurrentWeather, WEATHER_TYPES } from '../weather.js';
import { logBattleEvent } from '../battleLog.js';
import { GRID_SIZE, TILE_SIZE } from '../config.js';
import { unhighlightActiveCharacter } from '../animationManager.js';

/**
 * Create visual snow effects on the battlefield during the animation
 * @param {string} charId - Character ID for positioning
 */
function createSnowEffects(charId) {
    const characterPositions = getCharacterPositions();
    const charPos = characterPositions[charId];
    if (!charPos) return null;
    
    // Get battlefield for positioning
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (!battlefieldGrid) return null;
    
    // Create snow effect container
    const snowContainer = document.createElement('div');
    snowContainer.className = 'schneelandschaft-snow-effects';
    snowContainer.style.position = 'absolute';
    snowContainer.style.left = `${(charPos.x - 2) * TILE_SIZE}px`;
    snowContainer.style.top = `${(charPos.y - 2) * TILE_SIZE}px`;
    snowContainer.style.width = `${5 * TILE_SIZE}px`;
    snowContainer.style.height = `${5 * TILE_SIZE}px`;
    snowContainer.style.pointerEvents = 'none';
    snowContainer.style.zIndex = '1000';
    snowContainer.style.overflow = 'hidden';
    
    // Create multiple snowflakes
    for (let i = 0; i < 20; i++) {
        const snowflake = document.createElement('div');
        snowflake.style.position = 'absolute';
        snowflake.style.color = '#E6F3FF';
        snowflake.style.fontSize = `${8 + Math.random() * 12}px`;
        snowflake.style.textShadow = '0 0 3px rgba(255, 255, 255, 0.8)';
        snowflake.style.pointerEvents = 'none';
        snowflake.style.userSelect = 'none';
        snowflake.textContent = ['❄', '❅', '❆'][Math.floor(Math.random() * 3)];
        
        // Random starting position
        snowflake.style.left = `${Math.random() * (5 * TILE_SIZE)}px`;
        snowflake.style.top = `${-20}px`;
        
        // Animate falling
        const fallDuration = 1500 + Math.random() * 1000; // 1.5-2.5 seconds
        const horizontalDrift = (Math.random() - 0.5) * 60; // -30 to +30px drift
        
        snowflake.style.transition = `all ${fallDuration}ms ease-out`;
        
        setTimeout(() => {
            snowflake.style.top = `${5 * TILE_SIZE + 20}px`;
            snowflake.style.left = `${parseFloat(snowflake.style.left) + horizontalDrift}px`;
            snowflake.style.opacity = '0';
        }, 100 + i * 50); // Stagger the falling
        
        snowContainer.appendChild(snowflake);
    }
    
    battlefieldGrid.appendChild(snowContainer);
    
    // Remove after animation
    setTimeout(() => {
        if (snowContainer.parentNode) {
            snowContainer.remove();
        }
    }, 3000);
    
    return snowContainer;
}

/**
 * Animate the graceful flowing dance for Schneelandschaft
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 * @returns {Promise} - Resolves when animation completes
 */
export async function animateSchneelandschaft(charId, character) {
    return new Promise(async (resolve) => {
        const characterPositions = getCharacterPositions();
        const charPos = characterPositions[charId];
        
        if (!charPos) {
            resolve();
            return;
        }
        
        const startX = charPos.x;
        const startY = charPos.y;
        
        // Create snow effects around the Pokemon
        createSnowEffects(charId);
        
        // Create a graceful figure-8 pattern that represents the flowing beauty of snow
        const gracefulPath = [];
        
        // First half of figure-8 (top loop)
        const topLoop = [
            { x: startX, y: startY - 1 },     // North
            { x: startX + 1, y: startY - 1 }, // Northeast
            { x: startX + 1, y: startY },     // East  
            { x: startX + 1, y: startY + 1 }, // Southeast
            { x: startX, y: startY },         // Center
            { x: startX - 1, y: startY + 1 }, // Southwest
            { x: startX - 1, y: startY },     // West
            { x: startX - 1, y: startY - 1 }, // Northwest
            { x: startX, y: startY - 1 },     // North again
        ];
        
        // Second half of figure-8 (bottom loop, mirrored)
        const bottomLoop = [
            { x: startX, y: startY },         // Center
            { x: startX + 1, y: startY },     // East
            { x: startX + 1, y: startY + 1 }, // Southeast  
            { x: startX, y: startY + 1 },     // South
            { x: startX - 1, y: startY + 1 }, // Southwest
            { x: startX - 1, y: startY },     // West
            { x: startX, y: startY },         // Center
        ];
        
        // Gentle swaying finale
        const swayingFinale = [
            { x: startX, y: startY - 1 },     // North
            { x: startX, y: startY },         // Center
            { x: startX, y: startY + 1 },     // South
            { x: startX, y: startY },         // Center (final position)
        ];
        
        // Combine all movements
        gracefulPath.push(...topLoop, ...bottomLoop, ...swayingFinale);
        
        // Filter out invalid positions and clamp to bounds
        const validPath = gracefulPath.map(pos => ({
            x: Math.max(0, Math.min(GRID_SIZE - 1, pos.x)),
            y: Math.max(0, Math.min(GRID_SIZE - 1, pos.y))
        }));
        
        // Ensure we end at starting position
        validPath.push({ x: startX, y: startY });
        
        let currentIndex = 0;
        
        // Animate through each position with graceful timing
        const animateStep = () => {
            if (currentIndex >= validPath.length) {
                // Animation complete - ensure we're back at original position
                charPos.x = startX;
                charPos.y = startY;
                updatePokemonPosition(charId, startX, startY);
                resolve();
                return;
            }
            
            const nextPos = validPath[currentIndex];
            
            // Update position
            charPos.x = nextPos.x;
            charPos.y = nextPos.y;
            updatePokemonPosition(charId, nextPos.x, nextPos.y);
            
            currentIndex++;
            
            // Gentle, flowing timing (120ms per step for graceful movement)
            setTimeout(animateStep, 120);
        };
        
        // Start the animation
        animateStep();
    });
}

/**
 * Handle the complete Schneelandschaft attack sequence
 * @param {string} attackerCharId - Attacker character ID
 * @param {Object} attacker - Attacker character data
 * @returns {Promise} - Resolves when attack completes
 */
export async function handleSchneelandschaft(attackerCharId, attacker) {
    // Log the start of the attack
    logBattleEvent(`${attacker.character.name} führt Schneelandschaft aus und tanzt anmutig inmitten fallender Schneeflocken!`);
    
    // Perform the graceful flowing dance animation
    await animateSchneelandschaft(attackerCharId, attacker.character);
    
    // Check if the user has Eisbrocken item for extended duration
    let duration = 5; // Default duration
    
    if (attacker.character.selectedItem && 
        (attacker.character.selectedItem.name === "Eisbrocken")) {
        duration = 8;
        logBattleEvent(`${attacker.character.name}'s Eisbrocken verstärkt den Tanz und verlängert die Schneedauer!`);
    }
    
    // Change weather to Schnee
    await changeWeather(WEATHER_TYPES.SCHNEE, duration);
    
    logBattleEvent(`${attacker.character.name} hüllt das Schlachtfeld in eine wunderschöne Schneelandschaft!`);
}

/**
 * Check if Schneelandschaft should be selected based on current weather conditions
 * @returns {boolean} - Whether Schneelandschaft should be used
 */
export function shouldSelectSchneelandschaft() {
    const currentWeather = getCurrentWeather();
    
    // Never select if weather is already Schnee
    if (currentWeather.state === WEATHER_TYPES.SCHNEE) {
        return false;
    }
    
    // 33% chance if weather is Normal
    if (currentWeather.state === WEATHER_TYPES.NORMAL) {
        return Math.random() < 0.33;
    }
    
    // 66% chance if weather is anything else (but not Schnee, already checked above)
    return Math.random() < 0.66;
}

/**
 * Check if character has Schneelandschaft and if it should be used this turn
 * @param {Object} character - Character data
 * @returns {Object|null} - Schneelandschaft attack object if it should be used, null otherwise
 */
export function findSchneelandschaft(character) {
    // Check if character has Schneelandschaft attack with available PP
    const schneelandschaft = character.attacks && character.attacks.find(attack => 
        attack.weaponName === "Schneelandschaft" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (!schneelandschaft) {
        return null; // Character doesn't have Schneelandschaft or no PP left
    }
    
    // Check if Schneelandschaft should be selected based on weather
    if (!shouldSelectSchneelandschaft()) {
        return null; // Weather conditions don't favor using Schneelandschaft
    }
    
    return schneelandschaft;
}

/**
 * Check and handle Schneelandschaft move for a character's turn
 * This should be called before other attack selection logic
 * @param {string} charId - Character ID
 * @param {Object} activeCharacter - Active character data
 * @returns {Promise<boolean>} - True if Schneelandschaft was used, false otherwise
 */
export async function checkAndHandleSchneelandschaft(charId, activeCharacter) {
    const schneelandschaft = findSchneelandschaft(activeCharacter.character);
    
    if (!schneelandschaft) {
        return false; // Schneelandschaft not available or not selected
    }
    
    // Reduce PP for the move
    if (schneelandschaft.pp !== undefined && schneelandschaft.currentPP !== undefined) {
        schneelandschaft.currentPP = Math.max(0, schneelandschaft.currentPP - 1);
        logBattleEvent(`${schneelandschaft.weaponName} (${schneelandschaft.currentPP}/${schneelandschaft.pp} AP übrig).`);
    }
    
    // Handle the Schneelandschaft attack
    await handleSchneelandschaft(charId, activeCharacter);
    
    // End turn after using Schneelandschaft
    setTimeout(() => {
        unhighlightActiveCharacter();
        // Import endTurn dynamically to avoid circular dependency
        import('../turnSystem.js').then(module => {
            module.endTurn(activeCharacter);
        });
    }, 100);
    
    return true; // Schneelandschaft was used, turn should end
}