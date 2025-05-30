/**
 * Sandspeier ability system - Triggers sandstorm when hit by damage-dealing attacks
 */

import { logBattleEvent } from '../battleLog.js';
import { changeWeather, WEATHER_TYPES } from '../weather.js';
import { getPokemonSprite } from '../pokemonOverlay.js';
import { TILE_SIZE } from '../config.js';

/**
 * Check if a Pokemon has the Sandspeier ability
 * @param {Object} pokemon - The Pokemon to check
 * @returns {boolean} - True if Pokemon has Sandspeier ability
 */
export function hasSandspeierAbility(pokemon) {
    if (!pokemon || !pokemon.statsDetails?.abilities) {
        return false;
    }
    
    return pokemon.statsDetails.abilities.some(ability => 
        ability.name === "Sandspeier" || ability.englishName === "sand-spit"
    );
}

/**
 * Create sand animation effect around a Pokemon
 * @param {string} charId - Character ID
 * @param {Object} pokemonPosition - Pokemon position data
 * @returns {Promise<void>} - Promise that resolves when animation completes
 */
export function createSandAnimationEffect(charId, pokemonPosition) {
    return new Promise((resolve) => {
        // Get the Pokemon sprite
        const sprite = getPokemonSprite(charId);
        if (!sprite) {
            console.warn('Pokemon sprite not found for Sandspeier animation');
            resolve();
            return;
        }
        
        // Get battlefield grid for positioning
        const battlefieldGrid = document.querySelector('.battlefield-grid');
        if (!battlefieldGrid) {
            console.warn('Battlefield grid not found for Sandspeier animation');
            resolve();
            return;
        }
        
        // Add sand animation CSS if not already present
        if (!document.getElementById('sandspeier-animation-style')) {
            const style = document.createElement('style');
            style.id = 'sandspeier-animation-style';
            style.textContent = `
                .sandspeier-container {
                    position: absolute;
                    pointer-events: none;
                    z-index: 2500;
                }
                
                .sandspeier-particle {
                    position: absolute;
                    background: radial-gradient(circle, rgba(210,180,140,0.9) 0%, rgba(160,130,95,0.8) 60%, rgba(139,119,101,0.7) 100%);
                    border-radius: 50%;
                    opacity: 0.8;
                    animation: sandspeier-burst ease-out forwards;
                }
                
                .sandspeier-particle.large {
                    background: radial-gradient(circle, rgba(194,154,108,0.9) 0%, rgba(160,130,95,0.9) 50%, rgba(139,119,101,0.8) 100%);
                }
                
                .sandspeier-particle.small {
                    background: radial-gradient(circle, rgba(222,184,135,0.8) 0%, rgba(205,175,149,0.7) 100%);
                }
                
                @keyframes sandspeier-burst {
                    0% {
                        transform: translate(-50%, -50%) scale(0) rotate(0deg);
                        opacity: 0;
                    }
                    10% {
                        transform: translate(-50%, -50%) scale(0.3) rotate(var(--rotation));
                        opacity: 0.9;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1) rotate(var(--rotation));
                        opacity: 0.8;
                    }
                    100% {
                        transform: translate(-50%, -50%) translate(var(--end-x), var(--end-y)) scale(0.2) rotate(var(--rotation));
                        opacity: 0;
                    }
                }
                
                .sandspeier-wave {
                    position: absolute;
                    border: 3px solid rgba(210,180,140,0.6);
                    border-radius: 50%;
                    animation: sandspeier-wave 1s ease-out forwards;
                }
                
                @keyframes sandspeier-wave {
                    0% {
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 0.8;
                        border-width: 3px;
                    }
                    50% {
                        opacity: 0.4;
                        border-width: 2px;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(3);
                        opacity: 0;
                        border-width: 1px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Calculate Pokemon center position in pixels
        const pokemonCenterX = (pokemonPosition.x * TILE_SIZE) + (TILE_SIZE / 2);
        const pokemonCenterY = (pokemonPosition.y * TILE_SIZE) + (TILE_SIZE / 2);
        
        // Get Pokemon size for scaling the effect
        const sizeCategory = parseInt(sprite.dataset.sizeCategory) || 1;
        const effectScale = Math.max(1, sizeCategory * 0.8);
        
        // Create main animation container
        const animationContainer = document.createElement('div');
        animationContainer.className = 'sandspeier-container';
        animationContainer.style.left = `${pokemonCenterX}px`;
        animationContainer.style.top = `${pokemonCenterY}px`;
        animationContainer.style.width = `${TILE_SIZE * 3 * effectScale}px`;
        animationContainer.style.height = `${TILE_SIZE * 3 * effectScale}px`;
        animationContainer.style.transform = 'translate(-50%, -50%)';
        
        // Create expanding wave effect
        const wave = document.createElement('div');
        wave.className = 'sandspeier-wave';
        wave.style.left = '50%';
        wave.style.top = '50%';
        wave.style.width = `${TILE_SIZE * effectScale}px`;
        wave.style.height = `${TILE_SIZE * effectScale}px`;
        animationContainer.appendChild(wave);
        
        // Create sand particles bursting out
        const numberOfParticles = Math.max(20, Math.round(25 * effectScale));
        
        for (let i = 0; i < numberOfParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'sandspeier-particle';
            
            // Randomize particle size
            const size = (2 + Math.random() * 6) * effectScale;
            
            // Add size class for visual variety
            if (size > 4 * effectScale) {
                particle.classList.add('large');
            } else if (size < 3 * effectScale) {
                particle.classList.add('small');
            }
            
            // Random angle for burst direction
            const angle = (Math.PI * 2 * i) / numberOfParticles + (Math.random() - 0.5) * 0.5;
            const distance = (30 + Math.random() * 40) * effectScale;
            
            // Calculate end position
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;
            
            // Random rotation
            const rotation = Math.random() * 360;
            
            // Set particle properties
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.setProperty('--end-x', `${endX}px`);
            particle.style.setProperty('--end-y', `${endY}px`);
            particle.style.setProperty('--rotation', `${rotation}deg`);
            
            // Random animation duration and delay
            const duration = 0.8 + Math.random() * 0.4; // 0.8-1.2s
            const delay = Math.random() * 0.2; // 0-0.2s delay
            
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            animationContainer.appendChild(particle);
        }
        
        // Add to battlefield
        battlefieldGrid.appendChild(animationContainer);
        
        // Clean up after animation
        setTimeout(() => {
            if (animationContainer.parentNode) {
                animationContainer.remove();
            }
            resolve();
        }, 1500); // Allow time for all animations to complete
    });
}

/**
 * Handle Sandspeier ability trigger when Pokemon is hit by damage
 * @param {Object} pokemon - The Pokemon with Sandspeier ability
 * @param {string} charId - Character ID
 * @param {Object} pokemonPosition - Pokemon position data
 * @returns {Promise<void>} - Promise that resolves when ability effect completes
 */
export async function triggerSandspeierAbility(pokemon, charId, pokemonPosition) {
    // Log ability activation
    logBattleEvent(`${pokemon.name}'s Sandspeier wird ausgelöst!`);
    
    // Play sand animation effect
    await createSandAnimationEffect(charId, pokemonPosition);
    
    // Check for weather-extending item (Glattbrocken)
    const hasGlattbrocken = pokemon.selectedItem && 
        pokemon.selectedItem.name === 'Glattbrocken';
    
    const duration = hasGlattbrocken ? 8 : 5;
    
    // Change weather to Sandsturm
    await changeWeather(WEATHER_TYPES.SANDSTURM, duration);
    logBattleEvent(`${pokemon.name}'s Sandspeier entfacht einen Sandsturm!`);
    
    if (hasGlattbrocken) {
        logBattleEvent(`${pokemon.name}'s Glattbrocken verlängert den Sandsturm!`);
    }
}

/**
 * Check and handle Sandspeier ability when a Pokemon takes damage
 * This function should be called from the attack system when damage is dealt
 * @param {Object} damagedPokemon - The Pokemon that took damage
 * @param {string} charId - Character ID of the damaged Pokemon
 * @param {Object} pokemonPosition - Position data of the damaged Pokemon
 * @param {number} damageDealt - Amount of damage dealt
 * @returns {Promise<boolean>} - Promise that resolves to true if ability was triggered
 */
export async function checkAndHandleSandspeier(damagedPokemon, charId, pokemonPosition, damageDealt) {
    // Only trigger if damage was actually dealt
    if (!damageDealt || damageDealt <= 0) {
        return false;
    }
    
    // Check if Pokemon has Sandspeier ability
    if (!hasSandspeierAbility(damagedPokemon)) {
        return false;
    }
    
    // Check if Pokemon is still alive (ability doesn't trigger if Pokemon faints)
    if (damagedPokemon.currentKP <= 0) {
        return false;
    }
    
    // Trigger the ability
    await triggerSandspeierAbility(damagedPokemon, charId, pokemonPosition);
    
    return true;
}