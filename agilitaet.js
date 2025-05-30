import { getCharacterPositions, updateCharacterPosition } from '../characterPositions.js';
import { GRID_SIZE } from '../config.js';
import { getPokemonSprite } from '../pokemonOverlay.js';

/**
 * Animate the Agilität move with rapid training movements around empty tiles
 * @param {string} charId - The character ID
 * @param {Object} character - The character object
 * @returns {Promise<void>} - Promise that resolves when animation completes
 */
export function animateAgilitaet(charId, character) {
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
            console.error("Pokemon sprite not found for Agilität animation");
            resolve();
            return;
        }
        
        // Find the battlefield grid
        const battlefieldGrid = document.querySelector('.battlefield-grid');
        if (!battlefieldGrid) {
            console.error("Battlefield grid not found for Agilität animation");
            resolve();
        }
        
        // Create style for agilität animations if not already present
        if (!document.getElementById('agilitaet-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'agilitaet-styles';
            styleElement.textContent = `
                @keyframes agilitaet-speed-lines {
                    0% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.5); 
                    }
                    50% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1); 
                    }
                    100% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(1.2); 
                    }
                }
                
                @keyframes agilitaet-glow-pulse {
                    0% { box-shadow: 0 0 10px 3px rgba(0, 255, 255, 0.3); }
                    50% { box-shadow: 0 0 20px 8px rgba(0, 255, 255, 0.6); }
                    100% { box-shadow: 0 0 10px 3px rgba(0, 255, 255, 0.3); }
                }
                
                .agilitaet-overlay {
                    position: absolute;
                    pointer-events: none;
                    z-index: 2000;
                    transform-origin: center center;
                }
                
                .agilitaet-glow {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 255, 255, 0.15);
                    border-radius: 50%;
                    animation: agilitaet-glow-pulse 1.5s infinite;
                }
                
                .agilitaet-speed-line {
                    position: absolute;
                    width: 20px;
                    height: 3px;
                    background: linear-gradient(to right, transparent, rgba(0, 255, 255, 0.8), transparent);
                    animation: agilitaet-speed-lines 0.3s linear infinite;
                }
                
                .agilitaet-training-mode {
                    filter: brightness(1.2) hue-rotate(180deg);
                    transition: all 0.1s ease;
                }
            `;
            document.head.appendChild(styleElement);
        }
        
        // Save the original position
        const originalX = position.x;
        const originalY = position.y;
        
        // Get the exact size and position of the Pokemon sprite
        const spriteBounds = pokemonSprite.getBoundingClientRect();
        const spriteWidth = spriteBounds.width;
        const spriteHeight = spriteBounds.height;
        
        // Create the effect overlay
        const effectOverlay = document.createElement('div');
        effectOverlay.className = 'agilitaet-overlay';
        effectOverlay.style.width = `${spriteWidth}px`;
        effectOverlay.style.height = `${spriteHeight}px`;
        effectOverlay.style.left = pokemonSprite.style.left;
        effectOverlay.style.top = pokemonSprite.style.top;
        effectOverlay.style.transform = pokemonSprite.style.transform;
        
        // Add glow effect
        const glowEffect = document.createElement('div');
        glowEffect.className = 'agilitaet-glow';
        effectOverlay.appendChild(glowEffect);
        
        // Create speed lines around the Pokemon
        const speedLinePositions = [
            { top: '20%', left: '10%', rotation: '15deg' },
            { top: '30%', left: '80%', rotation: '-20deg' },
            { top: '70%', left: '15%', rotation: '25deg' },
            { top: '60%', left: '85%', rotation: '-15deg' },
            { top: '10%', left: '50%', rotation: '0deg' },
            { top: '90%', left: '50%', rotation: '0deg' }
        ];
        
        speedLinePositions.forEach((pos, index) => {
            const speedLine = document.createElement('div');
            speedLine.className = 'agilitaet-speed-line';
            speedLine.style.top = pos.top;
            speedLine.style.left = pos.left;
            speedLine.style.transform = `translate(-50%, -50%) rotate(${pos.rotation})`;
            speedLine.style.animationDelay = `${index * 0.05}s`;
            effectOverlay.appendChild(speedLine);
        });
        
        // Append overlay to the battlefield grid
        if (battlefieldGrid) {
            battlefieldGrid.appendChild(effectOverlay);
        }
        
        // Apply visual training mode to the Pokemon sprite
        pokemonSprite.classList.add('agilitaet-training-mode');
        
        // Find empty tiles around the Pokemon for training movement
        const emptyTiles = findEmptyTilesAround(originalX, originalY, characterPositions, 2);
        
        // Create a rapid movement sequence for training
        const trainingSequence = createTrainingSequence(originalX, originalY, emptyTiles);
        
        // Execute the rapid training movement
        let currentIndex = 0;
        const moveInterval = setInterval(() => {
            if (currentIndex >= trainingSequence.length) {
                clearInterval(moveInterval);
                return;
            }
            
            const move = trainingSequence[currentIndex];
            
            // Update character position in the DOM
            updateCharacterPosition(charId, { x: move.x, y: move.y });
            
            // Update the effect overlay position to match
            effectOverlay.style.left = pokemonSprite.style.left;
            effectOverlay.style.top = pokemonSprite.style.top;
            effectOverlay.style.transform = pokemonSprite.style.transform;
            
            currentIndex++;
            
            // If we've finished the sequence, restore original position
            if (currentIndex >= trainingSequence.length) {
                updateCharacterPosition(charId, { x: originalX, y: originalY });
                effectOverlay.style.left = pokemonSprite.style.left;
                effectOverlay.style.top = pokemonSprite.style.top;
            }
        }, 100); // 100ms between movements for rapid training effect
        
        // Clean up after animation completes
        setTimeout(() => {
            // Make sure we're back at the original position
            updateCharacterPosition(charId, { x: originalX, y: originalY });
            
            // Remove training mode styling
            pokemonSprite.classList.remove('agilitaet-training-mode');
            
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
        }, 1500); // Total animation duration: 2 seconds
    });
}

/**
 * Find empty tiles around a position for training movement
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {Object} characterPositions - Current character positions
 * @param {number} radius - Search radius
 * @returns {Array} - Array of empty tile coordinates
 */
function findEmptyTilesAround(centerX, centerY, characterPositions, radius = 2) {
    const emptyTiles = [];
    
    // Search in a radius around the center position
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            const x = centerX + dx;
            const y = centerY + dy;
            
            // Skip the center position itself
            if (dx === 0 && dy === 0) continue;
            
            // Skip positions outside the grid
            if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
            
            // Check if tile is empty (no Pokemon on it)
            const isOccupied = Object.values(characterPositions).some(pos => 
                pos.x === x && pos.y === y && !pos.isDefeated
            );
            
            if (!isOccupied) {
                emptyTiles.push({ x, y });
            }
        }
    }
    
    return emptyTiles;
}

/**
 * Create a training sequence that moves rapidly between empty tiles
 * @param {number} originalX - Original X coordinate
 * @param {number} originalY - Original Y coordinate
 * @param {Array} emptyTiles - Available empty tiles
 * @returns {Array} - Training movement sequence
 */
function createTrainingSequence(originalX, originalY, emptyTiles) {
    const sequence = [];
    
    // If no empty tiles are available, create a basic training pattern
    if (emptyTiles.length === 0) {
        // Simple back-and-forth training if no space
        sequence.push(
            { x: originalX, y: originalY }, // Start
            { x: originalX + 1, y: originalY }, // Right (if possible)
            { x: originalX, y: originalY }, // Center
            { x: originalX - 1, y: originalY }, // Left (if possible)
            { x: originalX, y: originalY }, // Center
            { x: originalX, y: originalY + 1 }, // Down (if possible)
            { x: originalX, y: originalY }, // Center
            { x: originalX, y: originalY - 1 }, // Up (if possible)
            { x: originalX, y: originalY }  // End at center
        );
    } else {
        // Create a more complex training pattern using available empty tiles
        sequence.push({ x: originalX, y: originalY }); // Start at center
        
        // Shuffle empty tiles for random training pattern
        const shuffledTiles = [...emptyTiles].sort(() => Math.random() - 0.5);
        
        // Visit up to 8 tiles for rapid training (or all available if fewer)
        const tilesToVisit = shuffledTiles.slice(0, Math.min(8, shuffledTiles.length));
        
        tilesToVisit.forEach(tile => {
            sequence.push(tile);
            // Return to center briefly between each training location
            sequence.push({ x: originalX, y: originalY });
        });
        
        // Add some rapid movements between tiles for intensive training effect
        if (tilesToVisit.length >= 2) {
            for (let i = 0; i < 3; i++) {
                const tile1 = tilesToVisit[i % tilesToVisit.length];
                const tile2 = tilesToVisit[(i + 1) % tilesToVisit.length];
                sequence.push(tile1, tile2);
            }
        }
        
        // End at original position
        sequence.push({ x: originalX, y: originalY });
    }
    
    return sequence;
}