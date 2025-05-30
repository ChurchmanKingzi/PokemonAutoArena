import { getCharacterPositions, updateCharacterPosition } from '../characterPositions.js';
import { getPokemonSprite } from '../pokemonOverlay.js';

/**
 * Animate the Schwerttanz move with actual Pokemon movement
 * @param {string} charId - The character ID
 * @param {Object} character - The character object
 * @returns {Promise<void>} - Promise that resolves when animation completes
 */
export function animateSchwerttanz(charId, character) {
    return new Promise(async (resolve) => {
        // Get character position information
        const characterPositions = getCharacterPositions();
        const position = characterPositions[charId];
        
        if (!position) {
            resolve();
            return;
        }
        
        // Get the Pokemon sprite from the overlay system
        const pokemonSprite = getPokemonSprite(charId);
        if (!pokemonSprite) {
            console.error("Pokemon sprite not found for Schwerttanz animation");
            resolve();
            return;
        }
        
        // Find the battlefield grid
        const battlefieldGrid = document.querySelector('.battlefield-grid');
        if (!battlefieldGrid) {
            console.error("Battlefield grid not found for Schwerttanz animation");
            resolve();
            return;
        }
        
        // Create style for sword animations if not already present
        if (!document.getElementById('schwerttanz-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'schwerttanz-styles';
            styleElement.textContent = `
                @keyframes schwerttanz-sword-spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                
                @keyframes schwerttanz-glow-pulse {
                    0% { box-shadow: 0 0 15px 5px rgba(255, 0, 0, 0.4); }
                    50% { box-shadow: 0 0 25px 10px rgba(255, 0, 0, 0.7); }
                    100% { box-shadow: 0 0 15px 5px rgba(255, 0, 0, 0.4); }
                }
                
                .schwerttanz-overlay {
                    position: absolute;
                    pointer-events: none;
                    z-index: 2000;
                    transform-origin: center center;
                }
                
                .schwerttanz-glow {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(255, 0, 0, 0.2);
                    border-radius: 50%;
                    animation: schwerttanz-glow-pulse 2s infinite;
                }
                
                .schwerttanz-sword {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    font-size: 24px;
                    line-height: 30px;
                    text-align: center;
                    color: red;
                    text-shadow: 0 0 5px white, 0 0 10px yellow;
                    animation: schwerttanz-sword-spin 2s linear;
                }
            `;
            document.head.appendChild(styleElement);
        }
        
        // Save the original position and sprite properties
        const originalX = position.x;
        const originalY = position.y;
        const originalTransform = pokemonSprite.style.transform;
        const originalTransition = pokemonSprite.style.transition;
        
        // Get the exact size and position of the Pokemon sprite
        const spriteBounds = pokemonSprite.getBoundingClientRect();
        const spriteWidth = spriteBounds.width;
        const spriteHeight = spriteBounds.height;
        
        // Create the effect overlay that will be positioned exactly like the Pokemon sprite
        const effectOverlay = document.createElement('div');
        effectOverlay.className = 'schwerttanz-overlay';
        effectOverlay.style.width = `${spriteWidth}px`;
        effectOverlay.style.height = `${spriteHeight}px`;
        effectOverlay.style.left = pokemonSprite.style.left;
        effectOverlay.style.top = pokemonSprite.style.top;
        
        // Copy the transform exactly from the Pokemon sprite
        effectOverlay.style.transform = originalTransform;
        
        // Add glow effect
        const glowEffect = document.createElement('div');
        glowEffect.className = 'schwerttanz-glow';
        effectOverlay.appendChild(glowEffect);
        
        // Create sword emojis at positions around the center
        const swordPositions = [
            { top: '0%', left: '50%' },      // top
            { top: '50%', left: '100%' },    // right
            { top: '100%', left: '50%' },    // bottom
            { top: '50%', left: '0%' }       // left
        ];
        
        swordPositions.forEach((pos, index) => {
            const sword = document.createElement('div');
            sword.className = 'schwerttanz-sword';
            sword.innerHTML = '⚔️';
            sword.style.top = pos.top;
            sword.style.left = pos.left;
            sword.style.transform = 'translate(-50%, -50%)';
            sword.style.animationDelay = `${index * 0.1}s`;
            effectOverlay.appendChild(sword);
        });
        
        // Add red flash effect
        const flashEffect = document.createElement('div');
        flashEffect.style.position = 'absolute';
        flashEffect.style.top = '50%';
        flashEffect.style.left = '50%';
        flashEffect.style.transform = 'translate(-50%, -50%)';
        flashEffect.style.width = '100%';
        flashEffect.style.height = '100%';
        flashEffect.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        flashEffect.style.borderRadius = '50%';
        flashEffect.style.zIndex = '1990';
        flashEffect.style.opacity = '0';
        flashEffect.style.animation = 'flash-opacity 0.5s ease-in-out';
        effectOverlay.appendChild(flashEffect);
        
        // Add flash animation if not present
        if (!document.querySelector('style[data-flash-animation]')) {
            const flashStyle = document.createElement('style');
            flashStyle.setAttribute('data-flash-animation', 'true');
            flashStyle.textContent = `
                @keyframes flash-opacity {
                    0% { opacity: 0; }
                    50% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(flashStyle);
        }
        
        // Append overlay to the battlefield grid
        battlefieldGrid.appendChild(effectOverlay);
        
        // Define a sequence of moves to create the schwerttanz effect
        // This sequence is now relative to the Pokemon's original position
        const moveSequence = [
            { dx: -1, dy: -1 }, // top-left
            { dx: 1, dy: 1 },   // bottom-right
            { dx: -1, dy: 1 },  // bottom-left
            { dx: 1, dy: -1 },  // top-right
            { dx: -1, dy: 0 },  // left
            { dx: 1, dy: 0 },   // right
            { dx: 0, dy: -1 },  // up
            { dx: 0, dy: 1 },   // down
            { dx: 0, dy: 0 }    // center (original position)
        ];
        
        // Execute the movement sequence
        let currentIndex = 0;
        const moveInterval = setInterval(() => {
            if (currentIndex >= moveSequence.length) {
                clearInterval(moveInterval);
                return;
            }
            
            const move = moveSequence[currentIndex];
            const newX = originalX + move.dx;
            const newY = originalY + move.dy;
            
            // Update character position in the DOM
            updateCharacterPosition(charId, { x: newX, y: newY });
            
            // Update the effect overlay position to match
            effectOverlay.style.left = pokemonSprite.style.left;
            effectOverlay.style.top = pokemonSprite.style.top;
            effectOverlay.style.transform = pokemonSprite.style.transform;
            
            currentIndex++;
            
            // If we've finished the sequence, restore original position
            if (currentIndex >= moveSequence.length) {
                // Make sure we end at the original position
                updateCharacterPosition(charId, { x: originalX, y: originalY });
                effectOverlay.style.left = pokemonSprite.style.left;
                effectOverlay.style.top = pokemonSprite.style.top;
            }
        }, 200); // 200ms between movements
        
        // Clean up after animation completes
        setTimeout(() => {
            // Make sure we're back at the original position
            updateCharacterPosition(charId, { x: originalX, y: originalY });
            
            // Remove effect elements with a fade-out
            effectOverlay.style.transition = 'opacity 0.5s';
            effectOverlay.style.opacity = '0';
            
            // Clear the interval as a safety measure
            clearInterval(moveInterval);
            
            // Wait for fade-out to complete
            setTimeout(() => {
                if (effectOverlay.parentNode) {
                    effectOverlay.remove();
                }
                
                // Animation is now fully complete
                resolve();
            }, 500);
        }, 2000);
    });
}