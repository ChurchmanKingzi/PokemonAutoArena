import { getCharacterPositions } from '../characterPositions.js';
import { getPokemonSprite } from '../pokemonOverlay.js';

/**
 * Animate the Härtner move (Defense Up) with metallic sheen and sparkle effects
 * @param {string} charId - The character ID
 * @param {Object} character - The character object
 * @returns {Promise<void>} - Promise that resolves when animation completes
 */
export function animateHärtner(charId, character) {
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
            console.error("Pokemon sprite not found for Härtner animation");
            resolve();
            return;
        }
        
        // Find the battlefield grid
        const battlefieldElement = document.querySelector('.battlefield-grid');
        if (!battlefieldElement) {
            console.error("Battlefield grid not found for Härtner animation");
            resolve();
            return;
        }
        
        // Create style for härtner animations if not already present
        if (!document.getElementById('hartner-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'hartner-styles';
            styleElement.textContent = `
                @keyframes hartner-metallic-sheen {
                    0% { 
                        background: linear-gradient(90deg, transparent 0%, transparent 30%, rgba(192, 192, 192, 0.9) 50%, transparent 70%, transparent 100%);
                        transform: translateX(-100%);
                    }
                    50% { 
                        background: linear-gradient(90deg, transparent 0%, transparent 30%, rgba(255, 255, 255, 1) 50%, transparent 70%, transparent 100%);
                        transform: translateX(0%);
                    }
                    100% { 
                        background: linear-gradient(90deg, transparent 0%, transparent 30%, rgba(192, 192, 192, 0.9) 50%, transparent 70%, transparent 100%);
                        transform: translateX(100%);
                    }
                }
                
                @keyframes hartner-metallic-glow {
                    0% { 
                        box-shadow: 0 0 20px 5px rgba(192, 192, 192, 0.3);
                        filter: brightness(1) contrast(1) saturate(1);
                    }
                    25% { 
                        box-shadow: 0 0 30px 8px rgba(255, 255, 255, 0.6);
                        filter: brightness(1.3) contrast(1.2) saturate(0.8);
                    }
                    50% { 
                        box-shadow: 0 0 35px 10px rgba(220, 220, 220, 0.8);
                        filter: brightness(1.5) contrast(1.4) saturate(0.6);
                    }
                    75% { 
                        box-shadow: 0 0 30px 8px rgba(255, 255, 255, 0.6);
                        filter: brightness(1.3) contrast(1.2) saturate(0.8);
                    }
                    100% { 
                        box-shadow: 0 0 20px 5px rgba(192, 192, 192, 0.3);
                        filter: brightness(1) contrast(1) saturate(1);
                    }
                }
                
                @keyframes hartner-sparkle {
                    0% { 
                        opacity: 0; 
                        transform: scale(0) rotate(0deg); 
                    }
                    20% { 
                        opacity: 1; 
                        transform: scale(1) rotate(90deg); 
                    }
                    80% { 
                        opacity: 1; 
                        transform: scale(1) rotate(270deg); 
                    }
                    100% { 
                        opacity: 0; 
                        transform: scale(0) rotate(360deg); 
                    }
                }
                
                @keyframes hartner-float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                
                .hartner-overlay {
                    position: absolute;
                    pointer-events: none;
                    z-index: 2000;
                    transform-origin: center center;
                }
                
                .hartner-metallic-glow {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(192, 192, 192, 0.1);
                    border-radius: 50%;
                    animation: hartner-metallic-glow 3s ease-in-out;
                }
                
                .hartner-sheen {
                    position: absolute;
                    width: 200%;
                    height: 100%;
                    top: 0;
                    left: -50%;
                    background: linear-gradient(90deg, transparent 30%, rgba(255, 255, 255, 0.8) 50%, transparent 70%);
                    animation: hartner-metallic-sheen 1.5s ease-in-out;
                    border-radius: 50%;
                    overflow: hidden;
                }
                
                .hartner-sparkle {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    color: #fff;
                    text-shadow: 0 0 6px #fff, 0 0 12px #silver, 0 0 18px #silver;
                    font-size: 10px;
                    line-height: 8px;
                    text-align: center;
                    animation: hartner-sparkle 2s ease-in-out;
                    z-index: 2001;
                }
                
                .hartner-float-effect {
                    animation: hartner-float 0.8s ease-in-out;
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
        effectOverlay.className = 'hartner-overlay';
        
        // Position overlay exactly on top of the Pokemon sprite
        effectOverlay.style.width = `${spriteWidth}px`;
        effectOverlay.style.height = `${spriteHeight}px`;
        effectOverlay.style.left = pokemonSprite.style.left;
        effectOverlay.style.top = pokemonSprite.style.top;
        effectOverlay.style.transform = pokemonSprite.style.transform;
        
        // Add metallic glow effect
        const metallicGlow = document.createElement('div');
        metallicGlow.className = 'hartner-metallic-glow';
        effectOverlay.appendChild(metallicGlow);
        
        // Add sheen effect
        const sheenEffect = document.createElement('div');
        sheenEffect.className = 'hartner-sheen';
        effectOverlay.appendChild(sheenEffect);
        
        // Create sparkles around the Pokemon
        const sparkleCount = 12;
        const sparkleSymbols = ['✦', '✧', '✨', '⭐', '💎', '◆'];
        
        for (let i = 0; i < sparkleCount; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'hartner-sparkle';
            sparkle.innerHTML = sparkleSymbols[Math.floor(Math.random() * sparkleSymbols.length)];
            
            // Position sparkles randomly around the Pokemon
            const angle = (i / sparkleCount) * 2 * Math.PI;
            const radius = Math.min(spriteWidth, spriteHeight) * 0.7;
            const randomOffset = (Math.random() - 0.5) * 20; // Add some randomness
            
            const x = 50 + (Math.cos(angle) * 35) + (Math.random() - 0.5) * 20; // 35% from center + randomness
            const y = 50 + (Math.sin(angle) * 35) + (Math.random() - 0.5) * 20;
            
            sparkle.style.left = `${x}%`;
            sparkle.style.top = `${y}%`;
            sparkle.style.animationDelay = `${i * 0.1}s`;
            sparkle.style.transform = 'translate(-50%, -50%)';
            
            effectOverlay.appendChild(sparkle);
        }
        
        // Add the overlay to the battlefield
        battlefieldElement.appendChild(effectOverlay);
        
        // Apply floating effect to the Pokemon sprite
        pokemonSprite.classList.add('hartner-float-effect');
        
        // Save original transform and transition for restoration later
        const originalTransform = pokemonSprite.style.transform;
        const originalTransition = pokemonSprite.style.transition;
        const originalFilter = pokemonSprite.style.filter || '';
        
        // Set up smooth transitions for scaling
        pokemonSprite.style.transition = 'transform 0.3s ease-in-out, filter 0.3s ease-in-out';
        
        // Apply temporary metallic filter to the Pokemon during animation
        pokemonSprite.style.filter = 'brightness(1.2) contrast(1.1) saturate(0.8) hue-rotate(10deg)';
        
        // Define the constrict/expand sequence (3 times) - same as Panzerschutz
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
                pokemonSprite.style.filter = originalFilter;
                pokemonSprite.classList.remove('hartner-float-effect');
                
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