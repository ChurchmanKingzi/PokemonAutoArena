/**
 * Hagelsturm (Hailstorm) attack implementation - File: hagensturm.js
 * The user performs violent jerky movements while creating hail effects, then changes weather to hail
 */

import { updatePokemonPosition } from '../pokemonOverlay.js';
import { getCharacterPositions } from '../characterPositions.js';
import { changeWeather, getCurrentWeather, WEATHER_TYPES } from '../weather.js';
import { logBattleEvent } from '../battleLog.js';
import { GRID_SIZE, TILE_SIZE } from '../config.js';
import { unhighlightActiveCharacter } from '../animationManager.js';

/**
 * Create visual hail effects on the battlefield during the animation
 * @param {string} charId - Character ID for positioning
 */
function createHailEffects(charId) {
    const characterPositions = getCharacterPositions();
    const charPos = characterPositions[charId];
    if (!charPos) return null;
    
    // Get battlefield for positioning
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (!battlefieldGrid) return null;
    
    // Create hail effect container
    const hailContainer = document.createElement('div');
    hailContainer.className = 'hagelsturm-hail-effects';
    hailContainer.style.position = 'absolute';
    hailContainer.style.left = `${(charPos.x - 3) * TILE_SIZE}px`;
    hailContainer.style.top = `${(charPos.y - 3) * TILE_SIZE}px`;
    hailContainer.style.width = `${7 * TILE_SIZE}px`;
    hailContainer.style.height = `${7 * TILE_SIZE}px`;
    hailContainer.style.pointerEvents = 'none';
    hailContainer.style.zIndex = '1000';
    hailContainer.style.overflow = 'hidden';
    
    // Create multiple hailstones
    for (let i = 0; i < 35; i++) {
        const hailstone = document.createElement('div');
        hailstone.style.position = 'absolute';
        hailstone.style.backgroundColor = '#B8E6FF';
        hailstone.style.border = '1px solid #87CEEB';
        hailstone.style.borderRadius = '30% 70% 60% 40%'; // Irregular ice shape
        hailstone.style.boxShadow = '0 0 4px rgba(255, 255, 255, 0.8), inset 0 0 3px rgba(173, 216, 230, 0.6)';
        hailstone.style.pointerEvents = 'none';
        
        // Random size for hailstones (bigger than snowflakes)
        const size = 4 + Math.random() * 8; // 4-12px
        hailstone.style.width = `${size}px`;
        hailstone.style.height = `${size}px`;
        
        // Random starting position
        hailstone.style.left = `${Math.random() * (7 * TILE_SIZE)}px`;
        hailstone.style.top = `${-30}px`;
        
        // Fast, violent falling (much faster than snow)
        const fallDuration = 400 + Math.random() * 600; // 0.4-1.0 seconds (fast!)
        const horizontalJerk = (Math.random() - 0.5) * 80; // -40 to +40px violent movement
        const rotation = Math.random() * 720; // 0-720 degrees rotation
        
        hailstone.style.transition = `all ${fallDuration}ms cubic-bezier(0.25, 0.1, 0.9, 1.2)`; // Sharp easing
        
        setTimeout(() => {
            hailstone.style.top = `${7 * TILE_SIZE + 30}px`;
            hailstone.style.left = `${parseFloat(hailstone.style.left) + horizontalJerk}px`;
            hailstone.style.transform = `rotate(${rotation}deg)`;
            hailstone.style.opacity = '0.2';
        }, 50 + i * 30); // Faster staggering for more chaos
        
        hailContainer.appendChild(hailstone);
    }
    
    // Add some impact flashes when hail "hits"
    setTimeout(() => {
        for (let i = 0; i < 8; i++) {
            const flash = document.createElement('div');
            flash.style.position = 'absolute';
            flash.style.left = `${Math.random() * (7 * TILE_SIZE)}px`;
            flash.style.top = `${(6 * TILE_SIZE) + Math.random() * TILE_SIZE}px`;
            flash.style.width = '8px';
            flash.style.height = '8px';
            flash.style.backgroundColor = '#E0F6FF';
            flash.style.borderRadius = '50%';
            flash.style.boxShadow = '0 0 12px rgba(224, 246, 255, 0.9)';
            flash.style.animation = 'hail-impact-flash 0.3s ease-out forwards';
            
            hailContainer.appendChild(flash);
            
            setTimeout(() => flash.remove(), 300);
        }
    }, 800);
    
    // Add CSS for impact flash animation
    if (!document.getElementById('hail-impact-animation')) {
        const style = document.createElement('style');
        style.id = 'hail-impact-animation';
        style.textContent = `
            @keyframes hail-impact-flash {
                0% { transform: scale(0); opacity: 1; }
                50% { transform: scale(2); opacity: 0.8; }
                100% { transform: scale(0); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    battlefieldGrid.appendChild(hailContainer);
    
    // Remove after animation
    setTimeout(() => {
        if (hailContainer.parentNode) {
            hailContainer.remove();
        }
    }, 3000);
    
    return hailContainer;
}

/**
 * Animate the violent jerky movements for Hagelsturm
 * @param {string} charId - Character ID
 * @param {Object} character - Character data
 * @returns {Promise} - Resolves when animation completes
 */
export async function animateHagelsturm(charId, character) {
    return new Promise(async (resolve) => {
        const characterPositions = getCharacterPositions();
        const charPos = characterPositions[charId];
        
        if (!charPos) {
            resolve();
            return;
        }
        
        const startX = charPos.x;
        const startY = charPos.y;
        
        // Create hail effects around the Pokemon
        createHailEffects(charId);
        
        // Create violent, chaotic movement pattern representing the fury of a hailstorm
        const violentPath = [];
        
        // Phase 1: Aggressive back-and-forth movements (building fury)
        const aggressiveBuildup = [
            { x: startX + 1, y: startY },     // East (sharp)
            { x: startX - 1, y: startY },     // West (sharp)
            { x: startX, y: startY + 1 },     // South (sharp)
            { x: startX, y: startY - 1 },     // North (sharp)
            { x: startX + 1, y: startY + 1 }, // Southeast (sharp)
            { x: startX - 1, y: startY - 1 }, // Northwest (sharp)
        ];
        
        // Phase 2: Chaotic storm pattern (peak fury)
        const chaosStorm = [
            { x: startX + 1, y: startY - 1 }, // Northeast
            { x: startX - 1, y: startY + 1 }, // Southwest
            { x: startX + 1, y: startY + 1 }, // Southeast
            { x: startX - 1, y: startY - 1 }, // Northwest
            { x: startX + 2, y: startY },     // Far East
            { x: startX - 2, y: startY },     // Far West
            { x: startX, y: startY + 2 },     // Far South
            { x: startX, y: startY - 2 },     // Far North
        ];
        
        // Phase 3: Sharp return to center (storm dissipation)
        const sharptReturn = [
            { x: startX + 1, y: startY },     // East
            { x: startX, y: startY + 1 },     // South
            { x: startX - 1, y: startY },     // West
            { x: startX, y: startY - 1 },     // North
            { x: startX, y: startY },         // Center (final)
        ];
        
        // Combine all movements
        violentPath.push(...aggressiveBuildup, ...chaosStorm, ...sharptReturn);
        
        // Filter out invalid positions and clamp to bounds
        const validPath = violentPath.map(pos => ({
            x: Math.max(0, Math.min(GRID_SIZE - 1, pos.x)),
            y: Math.max(0, Math.min(GRID_SIZE - 1, pos.y))
        }));
        
        // Ensure we end at starting position
        validPath.push({ x: startX, y: startY });
        
        let currentIndex = 0;
        
        // Animate through each position with violent, jerky timing
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
            
            // Variable timing for different phases
            let stepDelay = 90; // Fast, violent base timing
            
            if (currentIndex <= aggressiveBuildup.length) {
                stepDelay = 110; // Slightly slower for buildup
            } else if (currentIndex <= aggressiveBuildup.length + chaosStorm.length) {
                stepDelay = 75;  // Fastest for chaos phase
            } else {
                stepDelay = 100; // Medium for return phase
            }
            
            setTimeout(animateStep, stepDelay);
        };
        
        // Start the animation
        animateStep();
    });
}

/**
 * Handle the complete Hagelsturm attack sequence
 * @param {string} attackerCharId - Attacker character ID
 * @param {Object} attacker - Attacker character data
 * @returns {Promise} - Resolves when attack completes
 */
export async function handleHagelsturm(attackerCharId, attacker) {
    // Log the start of the attack
    logBattleEvent(`${attacker.character.name} führt Hagelsturm aus und tobt wild umher, während Eisbrocken vom Himmel fallen!`);
    
    // Perform the violent jerky movement animation
    await animateHagelsturm(attackerCharId, attacker.character);
    
    // Check if the user has Eisbrocken item for extended duration
    let duration = 5; // Default duration
    
    if (attacker.character.selectedItem && 
        (attacker.character.selectedItem.name === "Eisbrocken")) {
        duration = 8;
        logBattleEvent(`${attacker.character.name}'s Eisbrocken verstärkt den Sturm und verlängert die Hageldauer!`);
    }
    
    // Change weather to Hagel
    await changeWeather(WEATHER_TYPES.HAGEL, duration);
    
    logBattleEvent(`${attacker.character.name} entfesselt einen vernichtenden Hagelsturm!`);
}

/**
 * Check if Hagelsturm should be selected based on current weather conditions
 * @returns {boolean} - Whether Hagelsturm should be used
 */
export function shouldSelectHagelsturm() {
    const currentWeather = getCurrentWeather();
    
    // Never select if weather is already Hagel
    if (currentWeather.state === WEATHER_TYPES.HAGEL) {
        return false;
    }
    
    // 33% chance if weather is Normal
    if (currentWeather.state === WEATHER_TYPES.NORMAL) {
        return Math.random() < 0.15;
    }
    
    // 66% chance if weather is anything else (but not Hagel, already checked above)
    return Math.random() < 0.25;
}

/**
 * Check if character has Hagelsturm and if it should be used this turn
 * @param {Object} character - Character data
 * @returns {Object|null} - Hagelsturm attack object if it should be used, null otherwise
 */
export function findHagelsturm(character) {
    // Check if character has Hagelsturm attack with available PP
    const hagelsturm = character.attacks && character.attacks.find(attack => 
        attack.weaponName === "Hagelsturm" && 
        (attack.currentPP === undefined || attack.currentPP > 0)
    );
    
    if (!hagelsturm) {
        return null; // Character doesn't have Hagelsturm or no PP left
    }
    
    // Check if Hagelsturm should be selected based on weather
    if (!shouldSelectHagelsturm()) {
        return null; // Weather conditions don't favor using Hagelsturm
    }
    
    return hagelsturm;
}

/**
 * Check and handle Hagelsturm move for a character's turn
 * This should be called before other attack selection logic
 * @param {string} charId - Character ID
 * @param {Object} activeCharacter - Active character data
 * @returns {Promise<boolean>} - True if Hagelsturm was used, false otherwise
 */
export async function checkAndHandleHagelsturm(charId, activeCharacter) {
    const hagelsturm = findHagelsturm(activeCharacter.character);
    
    if (!hagelsturm) {
        return false; // Hagelsturm not available or not selected
    }
    
    // Reduce PP for the move
    if (hagelsturm.pp !== undefined && hagelsturm.currentPP !== undefined) {
        hagelsturm.currentPP = Math.max(0, hagelsturm.currentPP - 1);
        logBattleEvent(`${hagelsturm.weaponName} (${hagelsturm.currentPP}/${hagelsturm.pp} AP übrig).`);
    }
    
    // Handle the Hagelsturm attack
    await handleHagelsturm(charId, activeCharacter);
    
    // End turn after using Hagelsturm
    setTimeout(() => {
        unhighlightActiveCharacter();
        // Import endTurn dynamically to avoid circular dependency
        import('../turnSystem.js').then(module => {
            module.endTurn(activeCharacter);
        });
    }, 100);
    
    return true; // Hagelsturm was used, turn should end
}