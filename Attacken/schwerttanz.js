import { getCharacterPositions, updateCharacterPosition } from '../characterPositions.js';
import { TILE_SIZE } from '../config.js';

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
        
        // Find the battlefield grid
        const battlefieldElement = document.querySelector('.battlefield-grid');
        if (!battlefieldElement) {
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
                    0% { transform: rotate(0deg) translate(-50%, -50%); }
                    100% { transform: rotate(360deg) translate(-50%, -50%); }
                }
                
                @keyframes schwerttanz-glow-pulse {
                    0% { box-shadow: 0 0 15px 5px rgba(255, 0, 0, 0.4); }
                    50% { box-shadow: 0 0 25px 10px rgba(255, 0, 0, 0.7); }
                    100% { box-shadow: 0 0 15px 5px rgba(255, 0, 0, 0.4); }
                }
                
                .schwerttanz-container {
                    position: absolute;
                    width: ${TILE_SIZE * 3}px;
                    height: ${TILE_SIZE * 3}px;
                    pointer-events: none;
                    z-index: 1000;
                }
                
                .schwerttanz-glow {
                    position: absolute;
                    width: ${TILE_SIZE * 1.5}px;
                    height: ${TILE_SIZE * 1.5}px;
                    background-color: rgba(255, 0, 0, 0.2);
                    border-radius: 50%;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    animation: schwerttanz-glow-pulse 2s infinite;
                }
                
                .schwerttanz-sword {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    left: 50%;
                    top: 50%;
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
        
        // Save the original position for later
        const originalX = position.x;
        const originalY = position.y;
        
        // Calculate position for effects
        const posX = (position.x * TILE_SIZE) + (TILE_SIZE / 2);
        const posY = (position.y * TILE_SIZE) + (TILE_SIZE / 2);
        
        // Create the effect container for swords
        const effectContainer = document.createElement('div');
        effectContainer.className = 'schwerttanz-container';
        effectContainer.style.left = `${posX}px`;
        effectContainer.style.top = `${posY}px`;
        
        // Add glow effect
        const glowEffect = document.createElement('div');
        glowEffect.className = 'schwerttanz-glow';
        effectContainer.appendChild(glowEffect);
        
        // Create sword emoji at four positions around the character
        const swordPositions = [
            { angle: 0, offsetX: 50, offsetY: -50 },
            { angle: 90, offsetX: 50, offsetY: 50 },
            { angle: 180, offsetX: -50, offsetY: 50 },
            { angle: 270, offsetX: -50, offsetY: -50 }
        ];
        
        swordPositions.forEach((pos, index) => {
            const sword = document.createElement('div');
            sword.className = 'schwerttanz-sword';
            sword.innerHTML = '⚔️';
            sword.style.transform = `translate(${pos.offsetX}px, ${pos.offsetY}px) rotate(${pos.angle}deg)`;
            sword.style.animationDelay = `${index * 0.1}s`;
            effectContainer.appendChild(sword);
        });
        
        // Append to battlefield
        battlefieldElement.appendChild(effectContainer);
        
        // Create red flash effect
        const flashEffect = document.createElement('div');
        flashEffect.style.position = 'absolute';
        flashEffect.style.left = `${posX}px`;
        flashEffect.style.top = `${posY}px`;
        flashEffect.style.width = `${TILE_SIZE * 2}px`;
        flashEffect.style.height = `${TILE_SIZE * 2}px`;
        flashEffect.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        flashEffect.style.borderRadius = '50%';
        flashEffect.style.transform = 'translate(-50%, -50%)';
        flashEffect.style.zIndex = '990';
        flashEffect.style.opacity = '0';
        flashEffect.style.animation = 'flash-opacity 0.5s ease-in-out';
        
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
        
        battlefieldElement.appendChild(flashEffect);
        
        // Define a sequence of moves to create the schwerttanz effect
        // This will actually move the Pokemon sprite in the DOM
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
            
            // Update character position in the DOM using the existing system
            // This ensures the Pokemon sprite actually moves
            updateCharacterPosition(charId, { x: newX, y: newY });
            
            currentIndex++;
            
            // If we've finished the sequence, restore original position
            if (currentIndex >= moveSequence.length) {
                // Make sure we end at the original position
                updateCharacterPosition(charId, { x: originalX, y: originalY });
            }
        }, 200); // 200ms between movements
        
        // Clean up after animation completes
        setTimeout(() => {
            // Make sure we're back at the original position
            updateCharacterPosition(charId, { x: originalX, y: originalY });
            
            // Remove effect elements with a fade-out
            effectContainer.style.transition = 'opacity 0.5s';
            effectContainer.style.opacity = '0';
            flashEffect.style.opacity = '0';
            
            // Clear the interval as a safety measure
            clearInterval(moveInterval);
            
            setTimeout(() => {
                if (effectContainer.parentNode) {
                    effectContainer.remove();
                }
                if (flashEffect.parentNode) {
                    flashEffect.remove();
                }
                resolve();
            }, 500);
        }, 2000);
    });
}