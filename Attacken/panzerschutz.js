import { getCharacterPositions } from '../characterPositions.js';
import { getPokemonSprite } from '../pokemonOverlay.js';

/**
 * Animate the Panzerschutz move (Defense Up) with constricting/expanding animation
 * @param {string} charId - The character ID
 * @param {Object} character - The character object
 * @returns {Promise<void>} - Promise that resolves when animation completes
 */
export function animatePanzerschutz(charId, character) {
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
            console.error("Pokemon sprite not found for Panzerschutz animation");
            resolve();
            return;
        }
        
        // Find the battlefield grid
        const battlefieldElement = document.querySelector('.battlefield-grid');
        if (!battlefieldElement) {
            console.error("Battlefield grid not found for Panzerschutz animation");
            resolve();
            return;
        }
        
        // Create style for shield animations if not already present
        if (!document.getElementById('panzerschutz-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'panzerschutz-styles';
            styleElement.textContent = `
                @keyframes panzerschutz-shield-pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 0.9; }
                    100% { opacity: 0.4; }
                }
                
                @keyframes panzerschutz-glow-pulse {
                    0% { box-shadow: 0 0 15px 5px rgba(0, 100, 255, 0.4); }
                    50% { box-shadow: 0 0 25px 10px rgba(0, 100, 255, 0.7); }
                    100% { box-shadow: 0 0 15px 5px rgba(0, 100, 255, 0.4); }
                }
                
                .panzerschutz-overlay {
                    position: absolute;
                    pointer-events: none;
                    z-index: 2000;
                    transform-origin: center center;
                }
                
                .panzerschutz-glow {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 100, 255, 0.2);
                    border-radius: 50%;
                    animation: panzerschutz-glow-pulse 2s infinite;
                }
                
                .panzerschutz-shield {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    font-size: 24px;
                    line-height: 30px;
                    text-align: center;
                    color: blue;
                    text-shadow: 0 0 5px white, 0 0 10px cyan;
                    animation: panzerschutz-shield-pulse 2s infinite;
                    z-index: 2001;
                    transform: translate(-50%, -50%);
                }
            `;
            document.head.appendChild(styleElement);
        }
        
        // Get sprite dimensions and position
        const spriteBounds = pokemonSprite.getBoundingClientRect();
        const spriteWidth = spriteBounds.width;
        const spriteHeight = spriteBounds.height;
        
        // Create the effect overlay that will attach to the Pokemon sprite
        const effectOverlay = document.createElement('div');
        effectOverlay.className = 'panzerschutz-overlay';
        
        // Position overlay exactly on top of the Pokemon sprite
        effectOverlay.style.width = `${spriteWidth}px`;
        effectOverlay.style.height = `${spriteHeight}px`;
        effectOverlay.style.left = pokemonSprite.style.left;
        effectOverlay.style.top = pokemonSprite.style.top;
        effectOverlay.style.transform = pokemonSprite.style.transform;
        
        // Add glow effect
        const glowEffect = document.createElement('div');
        glowEffect.className = 'panzerschutz-glow';
        effectOverlay.appendChild(glowEffect);
        
        // Create shields that remain attached to the Pokemon
        // Updated positions to keep shields closer to the Pokemon sprite
        const shieldPositions = [
            { top: '0%', left: '50%' },      // top (closer)
            { top: '50%', left: '100%' },    // right (closer)
            { top: '100%', left: '50%' },    // bottom (closer)
            { top: '50%', left: '0%' }       // left (closer)
        ];
        
        shieldPositions.forEach((pos, index) => {
            const shield = document.createElement('div');
            shield.className = 'panzerschutz-shield';
            shield.innerHTML = '🛡️';
            shield.style.top = pos.top;
            shield.style.left = pos.left;
            shield.style.animationDelay = `${index * 0.2}s`;
            effectOverlay.appendChild(shield);
        });
        
        // Create a single larger shield in the center for the flash effect
        const centerShield = document.createElement('div');
        centerShield.className = 'panzerschutz-shield';
        centerShield.innerHTML = '🛡️';
        centerShield.style.top = '50%';
        centerShield.style.left = '50%';
        centerShield.style.fontSize = '36px';
        centerShield.style.width = '40px';
        centerShield.style.height = '40px';
        centerShield.style.opacity = '0';
        centerShield.style.animation = 'flash-opacity 0.5s ease-in-out';
        effectOverlay.appendChild(centerShield);
        
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
        
        // Add the overlay to the battlefield
        battlefieldElement.appendChild(effectOverlay);
        
        // Save original transform and transition for restoration later
        const originalTransform = pokemonSprite.style.transform;
        const originalTransition = pokemonSprite.style.transition;
        
        // Set up smooth transitions for scaling
        pokemonSprite.style.transition = 'transform 0.3s ease-in-out';
        
        // Define the constrict/expand sequence (3 times)
        // Each entry is a scale factor - we'll alternate between constricting and expanding
        const scaleSequence = [
            0.8,  // Constrict
            1.1,  // Expand
            0.8,  // Constrict
            1.1,  // Expand
            0.8,  // Constrict
            1.1,  // Expand
            1.0   // Back to normal
        ];
        
        // Execute the scaling sequence
        let currentIndex = 0;
        
        function executeNextScale() {
            if (currentIndex >= scaleSequence.length) {
                // We're done with the sequence
                // Restore original transform while preserving translation
                pokemonSprite.style.transform = originalTransform;
                pokemonSprite.style.transition = originalTransition;
                
                // Clean up effects
                effectOverlay.style.transition = 'opacity 0.5s';
                effectOverlay.style.opacity = '0';
                
                // Wait for fade-out to complete
                setTimeout(() => {
                    if (effectOverlay.parentNode) {
                        effectOverlay.remove();
                    }
                    
                    // Animation is now fully complete
                    resolve();
                }, 500);
                
                return;
            }
            
            // Get the current scale value
            const scale = scaleSequence[currentIndex];
            
            // Extract the original translation part (the -50%, -50% part)
            let translatePart = 'translate(-50%, -50%)';
            if (originalTransform && originalTransform.includes('translate')) {
                const translateMatch = originalTransform.match(/translate\([^)]+\)/);
                if (translateMatch) {
                    translatePart = translateMatch[0];
                }
            }
            
            // Apply the scale transformation while preserving the translation
            pokemonSprite.style.transform = `${translatePart} scale(${scale})`;
            
            // Also scale the effect overlay to match
            effectOverlay.style.transform = pokemonSprite.style.transform;
            
            // Move to the next scale after a delay
            currentIndex++;
            setTimeout(executeNextScale, 300);
        }
        
        // Start the sequence
        executeNextScale();
    });
}