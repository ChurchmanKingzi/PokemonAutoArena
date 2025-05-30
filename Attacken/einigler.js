import { getCharacterPositions } from '../characterPositions.js';
import { getPokemonSprite } from '../pokemonOverlay.js';

/**
 * Animate the Einigler move (Defense Up) with curling/rotating animation
 * @param {string} charId - The character ID
 * @param {Object} character - The character object
 * @returns {Promise<void>} - Promise that resolves when animation completes
 */
export function animateEinigler(charId, character) {
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
            console.error("Pokemon sprite not found for Einigler animation");
            resolve();
            return;
        }
        
        // Find the battlefield grid
        const battlefieldElement = document.querySelector('.battlefield-grid');
        if (!battlefieldElement) {
            console.error("Battlefield grid not found for Einigler animation");
            resolve();
            return;
        }
        
        // Create style for shield animations if not already present
        if (!document.getElementById('einigler-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'einigler-styles';
            styleElement.textContent = `
                @keyframes einigler-shield-pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 0.9; }
                    100% { opacity: 0.4; }
                }
                
                @keyframes einigler-glow-pulse {
                    0% { box-shadow: 0 0 15px 5px rgba(139, 69, 19, 0.4); }
                    50% { box-shadow: 0 0 25px 10px rgba(139, 69, 19, 0.7); }
                    100% { box-shadow: 0 0 15px 5px rgba(139, 69, 19, 0.4); }
                }
                
                .einigler-overlay {
                    position: absolute;
                    pointer-events: none;
                    z-index: 2000;
                    transform-origin: center center;
                }
                
                .einigler-glow {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(139, 69, 19, 0.2);
                    border-radius: 50%;
                    animation: einigler-glow-pulse 2s infinite;
                }
                
                .einigler-shield {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    font-size: 24px;
                    line-height: 30px;
                    text-align: center;
                    color: #8B4513;
                    text-shadow: 0 0 5px white, 0 0 10px #D2691E;
                    animation: einigler-shield-pulse 2s infinite;
                    z-index: 2001;
                    transform: translate(-50%, -50%);
                }
                
                .einigler-ripple {
                    position: absolute;
                    border: 2px solid rgba(139, 69, 19, 0.7);
                    border-radius: 50%;
                    opacity: 1;
                    width: 100%;
                    height: 100%;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    transform: scale(0);
                    animation: einigler-ripple-effect 1s cubic-bezier(0, 0.2, 0.8, 1);
                }
                
                @keyframes einigler-ripple-effect {
                    0% {
                        transform: scale(0.3);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1.2);
                        opacity: 0;
                    }
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
        effectOverlay.className = 'einigler-overlay';
        
        // Position overlay exactly on top of the Pokemon sprite
        effectOverlay.style.width = `${spriteWidth}px`;
        effectOverlay.style.height = `${spriteHeight}px`;
        effectOverlay.style.left = pokemonSprite.style.left;
        effectOverlay.style.top = pokemonSprite.style.top;
        effectOverlay.style.transform = pokemonSprite.style.transform;
        
        // Add glow effect
        const glowEffect = document.createElement('div');
        glowEffect.className = 'einigler-glow';
        effectOverlay.appendChild(glowEffect);
        
        // Create shields that remain attached to the Pokemon
        const shieldPositions = [
            { top: '0%', left: '50%' },      // top
            { top: '50%', left: '100%' },    // right
            { top: '100%', left: '50%' },    // bottom
            { top: '50%', left: '0%' }       // left
        ];
        
        shieldPositions.forEach((pos, index) => {
            const shield = document.createElement('div');
            shield.className = 'einigler-shield';
            shield.innerHTML = '🌰'; // Chestnut emoji for "curled up" look
            shield.style.top = pos.top;
            shield.style.left = pos.left;
            shield.style.animationDelay = `${index * 0.2}s`;
            effectOverlay.appendChild(shield);
        });
        
        // Create a single larger shield in the center for the flash effect
        const centerShield = document.createElement('div');
        centerShield.className = 'einigler-shield';
        centerShield.innerHTML = '🌰';
        centerShield.style.top = '50%';
        centerShield.style.left = '50%';
        centerShield.style.fontSize = '36px';
        centerShield.style.width = '40px';
        centerShield.style.height = '40px';
        centerShield.style.opacity = '0';
        centerShield.style.animation = 'flash-opacity 0.5s ease-in-out';
        effectOverlay.appendChild(centerShield);
        
        // Add the overlay to the battlefield
        battlefieldElement.appendChild(effectOverlay);
        
        // Save original transform and transition for restoration later
        const originalTransform = pokemonSprite.style.transform;
        const originalTransition = pokemonSprite.style.transition;
        
        // Set up smooth transitions for scaling and rotation
        pokemonSprite.style.transition = 'transform 0.4s ease-in-out';
        
        // Define the rotation sequence for curling up with slightly longer durations
        const rotationSequence = [
            { rotation: 45, scale: 0.9 },    // Start curling
            { rotation: 90, scale: 0.8 },    // More curled
            { rotation: 180, scale: 0.7 },   // Fully curled
            { rotation: 270, scale: 0.8 },   // Rotating while curled
            { rotation: 360, scale: 0.9 },   // Completing rotation
            { rotation: 0, scale: 1.0 }      // Back to normal
        ];
        
        // Add ripple effects during animation for visual emphasis
        let rippleIndex = 0;
        const createRipple = () => {
            if (rippleIndex < 3 && effectOverlay.parentNode) {
                const ripple = document.createElement('div');
                ripple.className = 'einigler-ripple';
                effectOverlay.appendChild(ripple);
                
                // Remove ripple after animation
                setTimeout(() => {
                    if (ripple.parentNode) {
                        ripple.remove();
                    }
                }, 1000);
                
                rippleIndex++;
                setTimeout(createRipple, 400); // Stagger ripples
            }
        };
        
        // Start ripple effect
        createRipple();
        
        // Execute the rotation sequence with explicit promises
        let currentIndex = 0;
        
        // Function to apply a single step of the animation
        function applyRotationStep(index) {
            return new Promise(stepResolve => {
                // Get the current rotation and scale values
                const config = rotationSequence[index];
                
                // Extract the original translation part
                let translatePart = 'translate(-50%, -50%)';
                if (originalTransform && originalTransform.includes('translate')) {
                    const translateMatch = originalTransform.match(/translate\([^)]+\)/);
                    if (translateMatch) {
                        translatePart = translateMatch[0];
                    }
                }
                
                // Apply the rotation and scale transformations
                pokemonSprite.style.transform = `${translatePart} rotate(${config.rotation}deg) scale(${config.scale})`;
                
                // Also transform the effect overlay to match
                effectOverlay.style.transform = pokemonSprite.style.transform;
                
                // Wait for the animation to complete
                setTimeout(stepResolve, 300); // Slightly longer duration (was 300ms)
            });
        }
        
        // Run the entire animation sequence explicitly
        async function runAnimationSequence() {
            for (let i = 0; i < rotationSequence.length; i++) {
                await applyRotationStep(i);
            }
            
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
        }
        
        // Start the animation sequence
        runAnimationSequence();
    });
}