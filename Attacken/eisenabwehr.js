import { getCharacterPositions } from '../characterPositions.js';
import { getPokemonSprite } from '../pokemonOverlay.js';

/**
 * Animate the Eisenabwehr move (Defense Up +2) with metallize animation
 * @param {string} charId - The character ID
 * @param {Object} character - The character object
 * @returns {Promise<void>} - Promise that resolves when animation completes
 */
export function animateEisenabwehr(charId, character) {
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
            console.error("Pokemon sprite not found for Eisenabwehr animation");
            resolve();
            return;
        }
        
        // Find the battlefield grid
        const battlefieldElement = document.querySelector('.battlefield-grid');
        if (!battlefieldElement) {
            console.error("Battlefield grid not found for Eisenabwehr animation");
            resolve();
            return;
        }
        
        // Create style for metal animations if not already present
        if (!document.getElementById('eisenabwehr-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'eisenabwehr-styles';
            styleElement.textContent = `
                @keyframes eisenabwehr-metal-pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 0.9; }
                    100% { opacity: 0.4; }
                }
                
                @keyframes eisenabwehr-metal-shine {
                    0% { background-position: -100% 0; }
                    100% { background-position: 200% 0; }
                }
                
                @keyframes eisenabwehr-metal-glow {
                    0% { box-shadow: 0 0 15px 5px rgba(192, 192, 192, 0.4); }
                    50% { box-shadow: 0 0 25px 10px rgba(192, 192, 192, 0.7); }
                    100% { box-shadow: 0 0 15px 5px rgba(192, 192, 192, 0.4); }
                }
                
                .eisenabwehr-overlay {
                    position: absolute;
                    pointer-events: none;
                    z-index: 2000;
                    transform-origin: center center;
                }
                
                .eisenabwehr-metal-layer {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(45deg, 
                        rgba(192, 192, 192, 0.1), 
                        rgba(220, 220, 220, 0.6), 
                        rgba(192, 192, 192, 0.1));
                    background-size: 200% 100%;
                    border-radius: 50%;
                    animation: 
                        eisenabwehr-metal-glow 2s infinite,
                        eisenabwehr-metal-shine 1.5s infinite;
                }
                
                .eisenabwehr-metal-particle {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background-color: silver;
                    border-radius: 2px;
                    z-index: 2001;
                    filter: drop-shadow(0 0 3px white);
                    opacity: 0.8;
                    transform-origin: center center;
                    transform: translate(-50%, -50%);
                }
                
                .eisenabwehr-armor-icon {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    font-size: 24px;
                    line-height: 30px;
                    text-align: center;
                    color: silver;
                    text-shadow: 0 0 5px white, 0 0 10px gray;
                    animation: eisenabwehr-metal-pulse 2s infinite;
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
        effectOverlay.className = 'eisenabwehr-overlay';
        
        // Position overlay exactly on top of the Pokemon sprite
        effectOverlay.style.width = `${spriteWidth}px`;
        effectOverlay.style.height = `${spriteHeight}px`;
        effectOverlay.style.left = pokemonSprite.style.left;
        effectOverlay.style.top = pokemonSprite.style.top;
        effectOverlay.style.transform = pokemonSprite.style.transform;
        
        // Add metallic layer effect
        const metalLayer = document.createElement('div');
        metalLayer.className = 'eisenabwehr-metal-layer';
        effectOverlay.appendChild(metalLayer);
        
        // Create metal armor icons that orbit around the Pokemon
        // Updated positions to keep shields closer to the Pokemon
        const armorPositions = [
            { top: '0%', left: '50%' },      // top (closer)
            { top: '50%', left: '100%' },    // right (closer)
            { top: '100%', left: '50%' },    // bottom (closer)
            { top: '50%', left: '0%' }       // left (closer)
        ];
        
        armorPositions.forEach((pos, index) => {
            const armor = document.createElement('div');
            armor.className = 'eisenabwehr-armor-icon';
            armor.innerHTML = '🛡️';  // Shield emoji
            armor.style.top = pos.top;
            armor.style.left = pos.left;
            armor.style.animationDelay = `${index * 0.2}s`;
            effectOverlay.appendChild(armor);
        });
        
        // Add metal particles that appear and disappear
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                if (!effectOverlay.parentNode) return; // Check if overlay still exists
                
                const particle = document.createElement('div');
                particle.className = 'eisenabwehr-metal-particle';
                
                // Random position within the sprite
                const randomX = Math.random() * 100;
                const randomY = Math.random() * 100;
                particle.style.left = `${randomX}%`;
                particle.style.top = `${randomY}%`;
                
                // Random rotation and size
                const randomRotation = Math.random() * 360;
                const randomSize = 6 + Math.random() * 8;
                particle.style.transform = `translate(-50%, -50%) rotate(${randomRotation}deg)`;
                particle.style.width = `${randomSize}px`;
                particle.style.height = `${randomSize}px`;
                
                effectOverlay.appendChild(particle);
                
                // Fade out and remove after animation
                setTimeout(() => {
                    particle.style.transition = 'opacity 0.5s';
                    particle.style.opacity = '0';
                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.remove();
                        }
                    }, 500);
                }, 1000 + Math.random() * 1000);
            }, i * 100);
        }
        
        // Create a metallic flash effect in the center
        const centerArmor = document.createElement('div');
        centerArmor.className = 'eisenabwehr-armor-icon';
        centerArmor.innerHTML = '⚙️';  // Gear emoji for metallic feel
        centerArmor.style.top = '50%';
        centerArmor.style.left = '50%';
        centerArmor.style.fontSize = '36px';
        centerArmor.style.width = '40px';
        centerArmor.style.height = '40px';
        centerArmor.style.opacity = '0';
        centerArmor.style.animation = 'flash-opacity 0.5s ease-in-out';
        effectOverlay.appendChild(centerArmor);
        
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
        
        // Add the effect overlay to the battlefield
        battlefieldElement.appendChild(effectOverlay);
        
        // Save original transform and transition for restoration later
        const originalTransform = pokemonSprite.style.transform;
        const originalTransition = pokemonSprite.style.transition;
        
        // Set up smooth transitions for scaling
        pokemonSprite.style.transition = 'transform 0.3s ease-in-out, filter 0.3s ease-in-out';
        
        // Apply metallic filter to the Pokemon sprite temporarily
        const originalFilter = pokemonSprite.style.filter || '';
        
        // Define the animation sequence with scale + metallic effects
        // Each entry is a configuration object
        const animationSequence = [
            { scale: 0.8, filter: 'brightness(1.2) contrast(1.2) saturate(0.5)' },
            { scale: 1.1, filter: 'brightness(1.5) contrast(1.5) saturate(0.3)' },
            { scale: 0.8, filter: 'brightness(1.8) contrast(1.8) saturate(0.2)' },
            { scale: 1.1, filter: 'brightness(2.0) contrast(2.0) saturate(0.1)' }, 
            { scale: 0.9, filter: 'brightness(1.5) contrast(1.5) saturate(0.3)' },
            { scale: 1.0, filter: originalFilter }  // Back to normal
        ];
        
        // Execute the animation sequence
        let currentIndex = 0;
        
        function executeNextAnimation() {
            if (currentIndex >= animationSequence.length) {
                // We're done with the sequence
                // Restore original transform and filter while preserving translation
                pokemonSprite.style.transform = originalTransform;
                pokemonSprite.style.filter = originalFilter;
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
            
            // Get the current animation configuration
            const config = animationSequence[currentIndex];
            
            // Extract the original translation part (the -50%, -50% part)
            let translatePart = 'translate(-50%, -50%)';
            if (originalTransform && originalTransform.includes('translate')) {
                const translateMatch = originalTransform.match(/translate\([^)]+\)/);
                if (translateMatch) {
                    translatePart = translateMatch[0];
                }
            }
            
            // Apply the scale transformation while preserving the translation
            pokemonSprite.style.transform = `${translatePart} scale(${config.scale})`;
            
            // Apply metallic filter effect
            pokemonSprite.style.filter = config.filter;
            
            // Also scale the effect overlay to match
            effectOverlay.style.transform = pokemonSprite.style.transform;
            
            // Move to the next step after a delay
            currentIndex++;
            setTimeout(executeNextAnimation, 300);
        }
        
        // Start the animation sequence
        executeNextAnimation();
    });
}