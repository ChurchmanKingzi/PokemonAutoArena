/**
 * Weather system for Pokémon battles - Camera-aware version
 */

// Import necessary functions
import { logBattleEvent } from './battleLog.js';
import { GRID_SIZE, TILE_SIZE } from './config.js';
import { updateWeatherAbilities, initializeWeatherAbilities } from './Abilities/weatherAbilityManager.js';
import { getCharacterPositions } from './characterPositions.js';
import { updatePokemonHPBar } from './pokemonOverlay.js';
import { updateInitiativeHP } from './initiativeDisplay.js';
import { checkAndHandleDefeat } from './defeatHandler.js';
import { createDamageNumber } from './damageNumbers.js';
import { changeStatValue, getCurrentStage } from './statChanges.js';

const sandsturmBonuses = new Map(); // pokemonId -> { defense: boolean, specialDefense: boolean }


// Weather states
export const WEATHER_TYPES = {
    NORMAL: "Normal",
    SONNE: "Sonne",
    REGEN: "Regen",
    SANDSTURM: "Sandsturm",
    SCHNEE: "Schnee",
    HAGEL: "Hagel",
    NEBEL: "Nebel"
};

// Local weather state (will be accessed through exported functions)
let battleWeather = {
    state: WEATHER_TYPES.NORMAL,
    timer: 0
};

// Reference to the current weather effect container
let weatherEffectContainer = null;


/**
 * Change the weather to a new state with a specified duration
 * @param {string} state - The new weather state
 * @param {number} timer - Duration in turns
 * @returns {Object} - The new weather object
 */
export async function changeWeather(state, timer) {
    // Store the old weather
    const oldWeather = battleWeather.state;
    
    // Validate the state
    if (!Object.values(WEATHER_TYPES).includes(state)) {
        console.error(`Invalid weather state: ${state}`);
        return battleWeather;
    }
    
    // Remove old weather effects first
    if (oldWeather === WEATHER_TYPES.SANDSTURM) {
        await removeSandsturmBonuses();
    }
    
    // Update the weather
    battleWeather.state = state;
    battleWeather.timer = timer;
    
    // Log the weather change
    if (state === WEATHER_TYPES.NORMAL) {
        logBattleEvent("Das Wetter hat sich normalisiert.");
    } else {
        logBattleEvent(`Das Wetter hat sich geändert! Es ist jetzt ${state} für ${timer} Runden.`);
    }
    
    // Apply new weather effects
    if (state === WEATHER_TYPES.SANDSTURM) {
        await applySandsturmBonuses();
    }
    
    // Update visual effects
    updateWeatherVisuals();
    
    // Update weather-related abilities
    if (oldWeather !== state) {
        updateWeatherAbilities(oldWeather, state);
    }
    
    return battleWeather;
}

/**
 * Reset the weather to Normal
 * @returns {Object} - Reset weather object
 */
export async function resetWeather() {
    // Store the old weather
    const oldWeather = battleWeather.state;
    
    // Remove weather effects from old weather
    if (oldWeather === WEATHER_TYPES.SANDSTURM) {
        await removeSandsturmBonuses();
    }
    
    // Set weather to normal
    battleWeather.state = WEATHER_TYPES.NORMAL;
    battleWeather.timer = 0;
    
    // Log the weather change
    logBattleEvent("Das Wetter hat sich normalisiert.");
    
    // Update visual effects
    updateWeatherVisuals();
    
    // Update weather-related abilities
    if (oldWeather !== WEATHER_TYPES.NORMAL) {
        updateWeatherAbilities(oldWeather, WEATHER_TYPES.NORMAL);
    }
    
    return battleWeather;
}

/**
 * Get the current weather
 * @returns {Object} - Current weather object with state and timer
 */
export function getCurrentWeather() {
    return battleWeather;
}

/**
 * Reduce the weather timer by 1 and reset if it reaches 0
 * @returns {Object} - Updated weather object
 */
export async function reduceWeatherTimer() {
    const oldWeather = battleWeather.state;
    
    if (battleWeather.state !== WEATHER_TYPES.NORMAL && battleWeather.timer > 0) {
        battleWeather.timer--;
        
        // Check if timer has expired
        if (battleWeather.timer <= 0) {
            const result = await resetWeather();
            return result;
        }
        
        // Log the remaining time
        logBattleEvent(`${battleWeather.state} hält noch ${battleWeather.timer} Runden an.`);
    }
    
    return battleWeather;
}

/**
 * Update the visual effects based on current weather
 */
function updateWeatherVisuals() {
    // Clear any existing weather effects
    clearWeatherVisuals();
    
    // If normal weather, no visuals needed
    if (battleWeather.state === WEATHER_TYPES.NORMAL) {
        return;
    }
    
    // Get the battlefield grid (the element that's transformed by the camera)
    const battlefieldGrid = document.querySelector('.battlefield-grid');
    if (!battlefieldGrid) {
        console.error('Battlefield grid element not found for weather effects');
        return;
    }
    
    // Create the weather effect container that will be positioned inside the grid
    weatherEffectContainer = document.createElement('div');
    weatherEffectContainer.className = 'weather-effect-container';
    
    // Size the container to match the entire battlefield grid
    const battlefieldWidth = GRID_SIZE * TILE_SIZE;
    const battlefieldHeight = GRID_SIZE * TILE_SIZE;
    
    // Set up container styling to cover the entire battlefield
    weatherEffectContainer.style.position = 'absolute';
    weatherEffectContainer.style.top = '0';
    weatherEffectContainer.style.left = '0';
    weatherEffectContainer.style.width = `${battlefieldWidth}px`;
    weatherEffectContainer.style.height = `${battlefieldHeight}px`;
    weatherEffectContainer.style.pointerEvents = 'none';
    weatherEffectContainer.style.zIndex = '10'; // Above battlefield elements but below UI
    weatherEffectContainer.style.overflow = 'hidden';
    
    // Apply specific weather effect
    switch (battleWeather.state) {
        case WEATHER_TYPES.REGEN:
            createRainEffect(weatherEffectContainer, battlefieldWidth, battlefieldHeight);
            break;
        case WEATHER_TYPES.SCHNEE:
            createSnowEffect(weatherEffectContainer, battlefieldWidth, battlefieldHeight);
            break;
        case WEATHER_TYPES.HAGEL:
            createHailEffect(weatherEffectContainer, battlefieldWidth, battlefieldHeight);
            break;
        case WEATHER_TYPES.SANDSTURM:
            createSandstormEffect(weatherEffectContainer, battlefieldWidth, battlefieldHeight);
            break;
        case WEATHER_TYPES.SONNE:
            createSunnyEffect(weatherEffectContainer, battlefieldWidth, battlefieldHeight);
            break;
        case WEATHER_TYPES.NEBEL:
            createFogEffect(weatherEffectContainer, battlefieldWidth, battlefieldHeight);
            break;
        // Other weather effects will be added here later
        default:
            console.log(`Visual effect for ${battleWeather.state} not implemented yet`);
    }
    
    // Add the container to the battlefield grid (which is transformed by the camera)
    battlefieldGrid.appendChild(weatherEffectContainer);
}

/**
 * Clear all weather visual effects
 */
function clearWeatherVisuals() {
    if (weatherEffectContainer) {
        weatherEffectContainer.remove();
        weatherEffectContainer = null;
    }
}

/**
 * Create rain effect
 * @param {HTMLElement} container - Container to add the rain effect to
 * @param {number} width - Width of the battlefield
 * @param {number} height - Height of the battlefield
 */
function createRainEffect(container, width, height) {
    // Add rain styling
    const styleId = 'rain-effect-style';
    let style = document.getElementById(styleId);
    
    // Only create style element if it doesn't exist
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .raindrop {
                position: absolute;
                background: linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(160,216,239,0.5));
                width: 2px;
                height: 15px;
                pointer-events: none;
                border-radius: 0;
                opacity: 0.7;
                animation: rain-fall linear infinite;
            }
            
            @keyframes rain-fall {
                0% {
                    transform: translateY(var(--start-y));
                }
                100% {
                    transform: translateY(${height + 50}px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create raindrops
    const numberOfDrops = 200; // Increased for better density
    
    for (let i = 0; i < numberOfDrops; i++) {
        const raindrop = document.createElement('div');
        raindrop.className = 'raindrop';
        
        // Randomize position across the whole battlefield (not just viewport)
        const posX = Math.random() * width; // Random position across width
        
        // Randomize the initial vertical position - spread drops throughout the entire height
        // This creates the continuous rainfall effect from the beginning
        const initialY = -100 - Math.random() * height; // Start above the visible area, distributed vertically
        
        const delay = Math.random() * 0.1; // Very small random delay for natural effect
        const duration = 0.7 + Math.random() * 0.5; // Random duration between 0.7-1.2s
        
        // Set custom property for initial Y position
        raindrop.style.setProperty('--start-y', `${initialY}px`);
        
        // Position in pixels, not percentage
        raindrop.style.left = `${posX}px`;
        raindrop.style.top = '0px'; // Starting at top of container
        raindrop.style.animationDelay = `${delay}s`;
        raindrop.style.animationDuration = `${duration}s`;
        
        container.appendChild(raindrop);
    }
}

/**
 * Create snow effect
 * @param {HTMLElement} container - Container to add the snow effect to
 * @param {number} width - Width of the battlefield
 * @param {number} height - Height of the battlefield
 */
function createSnowEffect(container, width, height) {
    // Add snow styling
    const styleId = 'snow-effect-style';
    let style = document.getElementById(styleId);
    
    // Only create style element if it doesn't exist
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .snowflake {
                position: absolute;
                background-color: white;
                border-radius: 50%;
                pointer-events: none;
                opacity: 0.8;
                animation: snowfall linear infinite;
            }
            
            @keyframes snowfall {
                0% {
                    transform: translateY(-15px) translateX(-10px);
                }
                25% {
                    transform: translateY(${height * 0.25}px) translateX(10px);
                }
                50% {
                    transform: translateY(${height * 0.5}px) translateX(-7px);
                }
                75% {
                    transform: translateY(${height * 0.75}px) translateX(-15px);
                }
                100% {
                    transform: translateY(${height + 15}px) translateX(-5px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create snowflakes
    const numberOfFlakes = 100; // Adjust as needed for density
    
    for (let i = 0; i < numberOfFlakes; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        
        // Randomize size, position and animation
        const size = 2 + Math.random() * 5; // Random size between 2-7px
        const posX = Math.random() * width; // Random position across battlefield width
        const delay = Math.random() * 5; // Random delay up to 5s
        const fallDuration = 7 + Math.random() * 10; // Random duration between 7-17s
        
        snowflake.style.width = `${size}px`;
        snowflake.style.height = `${size}px`;
        snowflake.style.left = `${posX}px`; // Position in pixels, not percentage
        snowflake.style.animationDelay = `-${delay}s`;
        snowflake.style.animationDuration = `${fallDuration}s`;
        
        container.appendChild(snowflake);
    }
}

/**
 * Create hail effect
 * @param {HTMLElement} container - Container to add the hail effect to
 * @param {number} width - Width of the battlefield
 * @param {number} height - Height of the battlefield
 */
function createHailEffect(container, width, height) {
    // Add hail styling
    const styleId = 'hail-effect-style';
    let style = document.getElementById(styleId);
    
    // Only create style element if it doesn't exist
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .hailstone {
                position: absolute;
                background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(200,230,255,0.8) 50%, rgba(180,220,255,0.7) 100%);
                border: 1px solid rgba(200,230,255,0.6);
                border-radius: 30% 70% 60% 40%;
                pointer-events: none;
                opacity: 0.85;
                animation: hailfall linear infinite;
                box-shadow: 0 0 3px rgba(255,255,255,0.5);
            }
            
            @keyframes hailfall {
                0% {
                    transform: translateY(-25px) rotateZ(0deg);
                }
                25% {
                    transform: translateY(${height * 0.25}px) rotateZ(90deg) translateX(2px);
                }
                50% {
                    transform: translateY(${height * 0.5}px) rotateZ(180deg) translateX(-1px);
                }
                75% {
                    transform: translateY(${height * 0.75}px) rotateZ(270deg) translateX(1px);
                }
                100% {
                    transform: translateY(${height + 25}px) rotateZ(360deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create hailstones
    const numberOfStones = 80; // Fewer than rain/snow since hail is typically less dense
    
    for (let i = 0; i < numberOfStones; i++) {
        const hailstone = document.createElement('div');
        hailstone.className = 'hailstone';
        
        // Randomize size, position and animation
        const size = 3 + Math.random() * 6; // Random size between 3-9px (larger than raindrops)
        const posX = Math.random() * width; // Random position across battlefield width
        const delay = Math.random() * 3; // Random delay up to 3s
        const fallDuration = 1 + Math.random() * 1.5; // Random duration between 1-2.5s (faster than snow)
        
        // Slightly randomize the shape for variety
        const borderRadius1 = 20 + Math.random() * 20; // 20-40%
        const borderRadius2 = 60 + Math.random() * 20; // 60-80%
        const borderRadius3 = 50 + Math.random() * 20; // 50-70%
        const borderRadius4 = 30 + Math.random() * 20; // 30-50%
        
        hailstone.style.width = `${size}px`;
        hailstone.style.height = `${size}px`;
        hailstone.style.left = `${posX}px`;
        hailstone.style.borderRadius = `${borderRadius1}% ${borderRadius2}% ${borderRadius3}% ${borderRadius4}%`;
        hailstone.style.animationDelay = `-${delay}s`;
        hailstone.style.animationDuration = `${fallDuration}s`;
        
        container.appendChild(hailstone);
    }
}

/**
 * Create sandstorm effect
 * @param {HTMLElement} container - Container to add the sandstorm effect to
 * @param {number} width - Width of the battlefield
 * @param {number} height - Height of the battlefield
 */
function createSandstormEffect(container, width, height) {
    // Add sandstorm styling
    const styleId = 'sandstorm-effect-style';
    let style = document.getElementById(styleId);
    
    // Only create style element if it doesn't exist
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .sand-grain {
                position: absolute;
                background: radial-gradient(circle, rgba(210,180,140,0.9) 0%, rgba(160,130,95,0.8) 60%, rgba(139,119,101,0.7) 100%);
                border-radius: 50%;
                pointer-events: none;
                opacity: 0.75;
                animation: sandstorm-blow linear infinite;
            }
            
            .sand-grain.large {
                opacity: 0.9;
                background: radial-gradient(circle, rgba(194,154,108,0.9) 0%, rgba(160,130,95,0.9) 50%, rgba(139,119,101,0.8) 100%);
            }
            
            .sand-grain.small {
                opacity: 0.6;
                background: radial-gradient(circle, rgba(222,184,135,0.7) 0%, rgba(205,175,149,0.6) 100%);
            }
            
            @keyframes sandstorm-blow {
                0% {
                    transform: translateX(-30px) translateY(0px);
                }
                15% {
                    transform: translateX(${width * 0.15}px) translateY(-8px);
                }
                35% {
                    transform: translateX(${width * 0.35}px) translateY(12px);
                }
                55% {
                    transform: translateX(${width * 0.55}px) translateY(-6px);
                }
                75% {
                    transform: translateX(${width * 0.75}px) translateY(15px);
                }
                90% {
                    transform: translateX(${width * 0.9}px) translateY(-10px);
                }
                100% {
                    transform: translateX(${width + 30}px) translateY(5px);
                }
            }
            
            @keyframes sandstorm-blow-fast {
                0% {
                    transform: translateX(-20px) translateY(0px);
                }
                20% {
                    transform: translateX(${width * 0.2}px) translateY(-12px);
                }
                40% {
                    transform: translateX(${width * 0.4}px) translateY(8px);
                }
                60% {
                    transform: translateX(${width * 0.6}px) translateY(-15px);
                }
                80% {
                    transform: translateX(${width * 0.8}px) translateY(10px);
                }
                100% {
                    transform: translateX(${width + 20}px) translateY(-5px);
                }
            }
            
            @keyframes sandstorm-blow-slow {
                0% {
                    transform: translateX(-40px) translateY(0px);
                }
                25% {
                    transform: translateX(${width * 0.25}px) translateY(-5px);
                }
                50% {
                    transform: translateX(${width * 0.5}px) translateY(8px);
                }
                75% {
                    transform: translateX(${width * 0.75}px) translateY(-3px);
                }
                100% {
                    transform: translateX(${width + 40}px) translateY(6px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create sand grains
    const numberOfGrains = 500; // Lots of sand particles for a dense storm
    
    for (let i = 0; i < numberOfGrains; i++) {
        const sandGrain = document.createElement('div');
        sandGrain.className = 'sand-grain';
        
        // Randomize size and appearance
        const size = 1 + Math.random() * 8; // Random size between 1-5px
        const posY = Math.random() * height; // Random Y position across battlefield height
        const delay = Math.random() * 6; // Random delay up to 6s
        
        // Add size class for visual variety
        if (size > 3.5) {
            sandGrain.classList.add('large');
        } else if (size < 2) {
            sandGrain.classList.add('small');
        }
        
        // Randomize animation speed for variety
        const speedType = Math.random();
        let animationName, duration;
        
        if (speedType < 0.3) {
            // 30% fast particles
            animationName = 'sandstorm-blow-fast';
            duration = 1.5 + Math.random() * 1; // 1.5-2.5s
        } else if (speedType < 0.6) {
            // 30% slow particles  
            animationName = 'sandstorm-blow-slow';
            duration = 4 + Math.random() * 2; // 4-6s
        } else {
            // 40% medium speed particles
            animationName = 'sandstorm-blow';
            duration = 2.5 + Math.random() * 1.5; // 2.5-4s
        }
        
        sandGrain.style.width = `${size}px`;
        sandGrain.style.height = `${size}px`;
        sandGrain.style.top = `${posY}px`;
        sandGrain.style.animationName = animationName;
        sandGrain.style.animationDelay = `-${delay}s`;
        sandGrain.style.animationDuration = `${duration}s`;
        
        container.appendChild(sandGrain);
    }
}

/**
 * Create sunny weather effect
 * @param {HTMLElement} container - Container to add the sunny effect to
 * @param {number} width - Width of the battlefield
 * @param {number} height - Height of the battlefield
 */
function createSunnyEffect(container, width, height) {
    // Add sunny weather styling
    const styleId = 'sunny-effect-style';
    let style = document.getElementById(styleId);
    
    // Only create style element if it doesn't exist
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .sunny-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle at 30% 20%, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.08) 40%, transparent 70%);
                pointer-events: none;
                animation: sunny-pulse 4s ease-in-out infinite;
                z-index: 1;
            }
            
            .sun-ray {
                position: absolute;
                background: linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.4) 50%, transparent 100%);
                pointer-events: none;
                transform-origin: top left;
                animation: sun-ray-shine linear infinite;
                z-index: 2;
            }
            
            .heat-shimmer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    0deg,
                    transparent 0px,
                    rgba(255,255,255,0.03) 2px,
                    transparent 4px
                );
                pointer-events: none;
                animation: heat-wave 2s ease-in-out infinite;
                z-index: 3;
            }
            
            .light-sparkle {
                position: absolute;
                background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,215,0,0.6) 30%, transparent 70%);
                border-radius: 50%;
                pointer-events: none;
                animation: sparkle-twinkle ease-in-out infinite;
                z-index: 4;
            }
            
            @keyframes sunny-pulse {
                0%, 100% {
                    opacity: 0.8;
                }
                50% {
                    opacity: 1;
                }
            }
            
            @keyframes sun-ray-shine {
                0% {
                    opacity: 0.3;
                    transform: translateX(-20px) scale(1);
                }
                25% {
                    opacity: 0.6;
                    transform: translateX(0px) scale(1.1);
                }
                50% {
                    opacity: 0.4;
                    transform: translateX(10px) scale(1);
                }
                75% {
                    opacity: 0.7;
                    transform: translateX(5px) scale(1.05);
                }
                100% {
                    opacity: 0.3;
                    transform: translateX(-20px) scale(1);
                }
            }
            
            @keyframes heat-wave {
                0%, 100% {
                    transform: skewX(0deg);
                    filter: blur(0px);
                }
                25% {
                    transform: skewX(0.5deg);
                    filter: blur(0.5px);
                }
                50% {
                    transform: skewX(-0.3deg);
                    filter: blur(0.3px);
                }
                75% {
                    transform: skewX(0.7deg);
                    filter: blur(0.7px);
                }
            }
            
            @keyframes sparkle-twinkle {
                0%, 100% {
                    opacity: 0;
                    transform: scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.2);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create the warm overlay
    const overlay = document.createElement('div');
    overlay.className = 'sunny-overlay';
    container.appendChild(overlay);
    
    // Create sun rays
    const numberOfRays = 12;
    for (let i = 0; i < numberOfRays; i++) {
        const ray = document.createElement('div');
        ray.className = 'sun-ray';
        
        // Randomize ray properties
        const rayWidth = 40 + Math.random() * 80; // 40-120px wide
        const rayHeight = 3 + Math.random() * 4; // 3-7px thick
        const angle = -45 + Math.random() * 90; // -45 to 45 degrees (roughly downward)
        const startX = Math.random() * width * 0.8; // Start within 80% of width
        const startY = -20 - Math.random() * 50; // Start above the battlefield
        const animationDelay = Math.random() * 4; // Random delay up to 4s
        const animationDuration = 6 + Math.random() * 4; // 6-10s duration
        
        ray.style.width = `${rayWidth}px`;
        ray.style.height = `${rayHeight}px`;
        ray.style.left = `${startX}px`;
        ray.style.top = `${startY}px`;
        ray.style.transform = `rotate(${angle}deg)`;
        ray.style.animationDelay = `${animationDelay}s`;
        ray.style.animationDuration = `${animationDuration}s`;
        
        container.appendChild(ray);
    }
    
    // Create heat shimmer effect
    const shimmer = document.createElement('div');
    shimmer.className = 'heat-shimmer';
    container.appendChild(shimmer);
    
    // Create light sparkles
    const numberOfSparkles = 25;
    for (let i = 0; i < numberOfSparkles; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'light-sparkle';
        
        // Randomize sparkle properties
        const size = 2 + Math.random() * 4; // 2-6px size
        const posX = Math.random() * width;
        const posY = Math.random() * height;
        const animationDelay = Math.random() * 5; // Random delay up to 5s
        const animationDuration = 2 + Math.random() * 3; // 2-5s duration
        
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.left = `${posX}px`;
        sparkle.style.top = `${posY}px`;
        sparkle.style.animationDelay = `${animationDelay}s`;
        sparkle.style.animationDuration = `${animationDuration}s`;
        
        container.appendChild(sparkle);
    }
}

/**
 * Create fog effect
 * @param {HTMLElement} container - Container to add the fog effect to
 * @param {number} width - Width of the battlefield
 * @param {number} height - Height of the battlefield
 */
function createFogEffect(container, width, height) {
    // Add fog styling
    const styleId = 'fog-effect-style';
    let style = document.getElementById(styleId);
    
    // Only create style element if it doesn't exist
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .fog-cloud {
                position: absolute;
                background: radial-gradient(ellipse 70% 130% at 40% 60%, rgba(255,255,255,0.85) 0%, rgba(240,248,255,0.65) 35%, rgba(220,230,240,0.45) 65%, transparent 100%);
                pointer-events: none;
                filter: blur(3px);
                animation: fog-drift linear infinite;
            }
            
            .fog-cloud.thick {
                background: radial-gradient(ellipse 80% 120% at 30% 70%, rgba(255,255,255,0.95) 0%, rgba(240,248,255,0.85) 25%, rgba(220,230,240,0.7) 50%, rgba(200,210,220,0.4) 75%, transparent 100%);
                filter: blur(4px);
                z-index: 4;
            }
            
            .fog-cloud.medium {
                background: radial-gradient(ellipse 90% 110% at 60% 40%, rgba(255,255,255,0.8) 0%, rgba(240,248,255,0.6) 40%, rgba(220,230,240,0.4) 70%, transparent 100%);
                filter: blur(3px);
                z-index: 3;
            }
            
            .fog-cloud.light {
                background: radial-gradient(ellipse 60% 140% at 50% 30%, rgba(255,255,255,0.65) 0%, rgba(240,248,255,0.45) 50%, rgba(220,230,240,0.25) 80%, transparent 100%);
                filter: blur(2px);
                z-index: 2;
            }
            
            @keyframes fog-drift {
                0% {
                    transform: translateX(-100px) translateY(0px) scale(0.8);
                }
                25% {
                    transform: translateX(${width * 0.25}px) translateY(-15px) scale(1.1);
                }
                50% {
                    transform: translateX(${width * 0.5}px) translateY(10px) scale(0.9);
                }
                75% {
                    transform: translateX(${width * 0.75}px) translateY(-8px) scale(1.05);
                }
                100% {
                    transform: translateX(${width + 100}px) translateY(5px) scale(0.8);
                }
            }
            
            @keyframes fog-drift-slow {
                0% {
                    transform: translateX(-150px) translateY(0px) scale(0.7) rotate(0deg);
                }
                20% {
                    transform: translateX(${width * 0.2}px) translateY(-10px) scale(1.2) rotate(5deg);
                }
                40% {
                    transform: translateX(${width * 0.4}px) translateY(8px) scale(0.9) rotate(-3deg);
                }
                60% {
                    transform: translateX(${width * 0.6}px) translateY(-12px) scale(1.1) rotate(7deg);
                }
                80% {
                    transform: translateX(${width * 0.8}px) translateY(6px) scale(0.85) rotate(-2deg);
                }
                100% {
                    transform: translateX(${width + 150}px) translateY(-5px) scale(0.7) rotate(0deg);
                }
            }
            
            @keyframes fog-drift-fast {
                0% {
                    transform: translateX(-80px) translateY(0px) scale(1);
                }
                30% {
                    transform: translateX(${width * 0.3}px) translateY(-20px) scale(1.15);
                }
                60% {
                    transform: translateX(${width * 0.6}px) translateY(15px) scale(0.85);
                }
                100% {
                    transform: translateX(${width + 80}px) translateY(-10px) scale(1);
                }
            }
            
            @keyframes fog-billow {
                0%, 100% {
                    transform: scale(1) rotate(0deg);
                }
                25% {
                    transform: scale(1.1) rotate(2deg);
                }
                50% {
                    transform: scale(0.9) rotate(-1deg);
                }
                75% {
                    transform: scale(1.05) rotate(3deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create different layers of fog clouds - much denser fog
    const totalClouds = 100; // Significantly more clouds for realistic density
    
    for (let i = 0; i < totalClouds; i++) {
        const fogCloud = document.createElement('div');
        fogCloud.className = 'fog-cloud';
        
        // Determine cloud type and properties - favor thicker fog
        const cloudType = Math.random();
        let cloudSize, animationType, duration, thickness;
        
        if (cloudType < 0.4) {
            // 40% thick fog banks (large, slow) - increased from 20%
            thickness = 'thick';
            cloudSize = {
                width: 150 + Math.random() * 250, // 150-400px - larger clouds
                height: 100 + Math.random() * 180  // 100-280px
            };
            animationType = 'fog-drift-slow';
            duration = 15 + Math.random() * 10; // 15-25s
        } else if (cloudType < 0.75) {
            // 35% medium fog clouds - increased from 30%
            thickness = 'medium';
            cloudSize = {
                width: 100 + Math.random() * 180, // 100-280px - larger
                height: 80 + Math.random() * 120  // 80-200px
            };
            animationType = 'fog-drift';
            duration = 10 + Math.random() * 8; // 10-18s
        } else {
            // 25% light mist patches - decreased from 50%
            thickness = 'light';
            cloudSize = {
                width: 60 + Math.random() * 100, // 60-160px - larger
                height: 50 + Math.random() * 80  // 50-130px
            };
            animationType = Math.random() < 0.5 ? 'fog-drift-fast' : 'fog-drift';
            duration = 6 + Math.random() * 6; // 6-12s
        }
        
        // Add thickness class
        fogCloud.classList.add(thickness);
        
        // Create irregular, misshapen fog clouds instead of perfect ovals
        const borderRadius1 = 30 + Math.random() * 40; // 30-70%
        const borderRadius2 = 20 + Math.random() * 50; // 20-70%
        const borderRadius3 = 25 + Math.random() * 45; // 25-70%
        const borderRadius4 = 35 + Math.random() * 35; // 35-70%
        const borderRadius5 = 15 + Math.random() * 55; // 15-70%
        const borderRadius6 = 40 + Math.random() * 30; // 40-70%
        const borderRadius7 = 20 + Math.random() * 40; // 20-60%
        const borderRadius8 = 30 + Math.random() * 40; // 30-70%
        
        // Apply complex border-radius for natural, misshapen look
        fogCloud.style.borderRadius = `${borderRadius1}% ${borderRadius2}% ${borderRadius3}% ${borderRadius4}% / ${borderRadius5}% ${borderRadius6}% ${borderRadius7}% ${borderRadius8}%`;
        
        // Position and size the cloud
        const startY = Math.random() * (height + 100) - 50; // Allow some clouds to start above/below visible area
        const delay = Math.random() * 25; // Random delay up to 25s - longer for more variation
        
        // More clouds have billowing animation for organic movement
        const hasBillowing = Math.random() < 0.6; // 60% chance - increased from 30%
        
        fogCloud.style.width = `${cloudSize.width}px`;
        fogCloud.style.height = `${cloudSize.height}px`;
        fogCloud.style.top = `${startY}px`;
        fogCloud.style.left = '-250px'; // Start further off-screen for larger clouds
        
        // Set up main drift animation
        fogCloud.style.animationName = animationType;
        fogCloud.style.animationDuration = `${duration}s`;
        fogCloud.style.animationDelay = `-${delay}s`;
        
        // Add billowing effect for more clouds
        if (hasBillowing) {
            const billowDuration = 6 + Math.random() * 6; // 6-12s - faster billowing
            const billowDelay = Math.random() * 3; // 0-3s
            fogCloud.style.animation += `, fog-billow ${billowDuration}s ease-in-out infinite ${billowDelay}s`;
        }
        
        container.appendChild(fogCloud);
    }
}

/**
 * Initialize weather system - call this when battle starts
 */
export function initializeWeatherSystem() {
    // Set up any initial weather visuals based on current state
    updateWeatherVisuals();
    
    // Initialize weather abilities
    initializeWeatherAbilities();
}

/**
 * Clean up weather system - call this when battle ends
 */
export async function cleanupWeatherSystem() {
    clearWeatherVisuals();
    
    // Clear any active Sandsturm bonuses
    if (battleWeather.state === WEATHER_TYPES.SANDSTURM) {
        await removeSandsturmBonuses();
    }
    
    // Reset weather to normal
    battleWeather.state = WEATHER_TYPES.NORMAL;
    battleWeather.timer = 0;
}


/**
 * Apply weather effects to all Pokemon at the end of a round
 * @returns {Promise<void>} - Promise that resolves when all effects are applied
 */
export async function applyWeatherEffects() {
    // Get current weather
    const currentWeather = getCurrentWeather();
    
    // If normal weather, no effects to apply
    if (currentWeather.state === WEATHER_TYPES.NORMAL) {
        return;
    }
    
    // Get character positions to find all Pokemon
    const characterPositions = getCharacterPositions();
    
    // Apply weather effects based on current weather
    if (currentWeather.state === WEATHER_TYPES.HAGEL) {
        await applyHailEffects(characterPositions);
    } else if (currentWeather.state === WEATHER_TYPES.SANDSTURM) {
        await applySandstormEffects(characterPositions);
    } else if (currentWeather.state === WEATHER_TYPES.REGEN) {
        await applyRainEffects(characterPositions);
    } else if (currentWeather.state === WEATHER_TYPES.SONNE) {
        await applySunEffects(characterPositions);
    }
}

/**
 * Apply sun effects to all Pokemon
 * @param {Object} characterPositions - All character positions
 * @returns {Promise<void>} - Promise that resolves when all effects are applied
 */
async function applySunEffects(characterPositions) {
    logBattleEvent(`Die Sonne wirkt sich auf Pokémon mit speziellen Fähigkeiten aus.`);
    
    // Process each Pokemon sequentially to avoid race conditions with defeat handling
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        if (pos.isDefeated) continue;
        
        const pokemon = pos.character;
        if (!pokemon) continue;
        
        // Check if Pokemon has Trockenheit ability
        const hasTrockenheit = pokemon.statsDetails?.abilities?.some(ability => 
            ability.name === "Trockenheit" || ability.englishName === "drought"
        );
        
        if (hasTrockenheit) {
            // Damage Pokemon with Trockenheit by 12.5% of max KP in sun
            const maxKP = pokemon.maxKP || pokemon.combatStats.kp;
            const damageAmount = Math.ceil(maxKP * 0.125);
            
            // Apply damage
            const oldKP = pokemon.currentKP;
            pokemon.currentKP = Math.max(0, oldKP - damageAmount);
            
            logBattleEvent(`${pokemon.name} nimmt ${damageAmount} Schaden durch Trockenheit bei Sonnenschein!`);
            createDamageNumber(damageAmount, pos, false, 'weather');
            
            // Update HP bar and displays
            updatePokemonHPBar(charId, pokemon);
            
            // Check if Pokemon fainted
            if (pokemon.currentKP <= 0) {
                logBattleEvent(`${pokemon.name} wurde durch die Sonne besiegt!`);
                
                // Use the centralized defeat handler
                await checkAndHandleDefeat(
                    pokemon,
                    charId,
                    null, // No attacker for weather deaths
                    null,
                    { isWeatherDeath: true }
                );
            }
        }
    }
    
    // Update initiative HP display
    updateInitiativeHP();
}

/**
 * Apply rain effects to all Pokemon
 * @param {Object} characterPositions - All character positions
 * @returns {Promise<void>} - Promise that resolves when all effects are applied
 */
async function applyRainEffects(characterPositions) {
    logBattleEvent(`Der Regen wirkt sich auf Pokémon mit speziellen Fähigkeiten aus.`);
    
    // Process each Pokemon sequentially to avoid race conditions with defeat handling
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        if (pos.isDefeated) continue;
        
        const pokemon = pos.character;
        if (!pokemon) continue;
        
        // Check if Pokemon has Regengenuss ability
        const hasRegengenuss = pokemon.statsDetails?.abilities?.some(ability => 
            ability.name === "Regengenuss" || ability.englishName === "rain-dish"
        );
        
        // Check if Pokemon has Trockenheit ability
        const hasTrockenheit = pokemon.statsDetails?.abilities?.some(ability => 
            ability.name === "Trockenheit" || ability.englishName === "drought"
        );
        
        // Calculate healing amounts based on ability
        const maxKP = pokemon.maxKP || pokemon.combatStats.kp;
        let healAmount = 0;
        let healMessage = "";
        
        if (hasRegengenuss) {
            // Heal Pokemon with Regengenuss by 10% of max KP
            healAmount = Math.ceil(maxKP * 0.1);
            healMessage = `${pokemon.name} wird durch Regengenuss geheilt und erhält ${healAmount} KP zurück!`;
        } else if (hasTrockenheit) {
            // Heal Pokemon with Trockenheit by 12.5% of max KP in rain
            healAmount = Math.ceil(maxKP * 0.125);
            healMessage = `${pokemon.name} wird durch Trockenheit im Regen geheilt und erhält ${healAmount} KP zurück!`;
        }
        
        // Apply healing if applicable
        if (healAmount > 0) {
            const oldKP = pokemon.currentKP;
            pokemon.currentKP = Math.min(maxKP, oldKP + healAmount);
            
            logBattleEvent(healMessage);
            createDamageNumber(-healAmount, pos, false, 'heal');
            
            // Update HP bar and displays
            updatePokemonHPBar(charId, pokemon);
        }
    }
    
    // Update initiative HP display
    updateInitiativeHP();
}

/**
 * Apply hail effects to all Pokemon
 * @param {Object} characterPositions - All character positions
 * @returns {Promise<void>} - Promise that resolves when all effects are applied
 */
async function applyHailEffects(characterPositions) {
    logBattleEvent(`Der Hagel verursacht Schaden bei nicht-Wasser/Eis-Pokémon!`);
    
    // Process each Pokemon sequentially to avoid race conditions with defeat handling
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        if (pos.isDefeated) continue;
        
        const pokemon = pos.character;
        if (!pokemon) continue;
        
        // Check if Pokemon has Eis or Wasser type
        const hasImmunity = pokemon.pokemonTypes && 
            pokemon.pokemonTypes.some(type => 
                type.toLowerCase() === 'ice' || 
                type.toLowerCase() === 'eis' || 
                type.toLowerCase() === 'water' || 
                type.toLowerCase() === 'wasser'
            );
        
        // Check if Pokemon has Eishaut ability
        const hasEishaut = pokemon.statsDetails?.abilities?.some(ability => 
            ability.name === "Eishaut" || ability.englishName === "ice-body"
        );
        
        // Calculate 10% of max KP
        const maxKP = pokemon.maxKP || pokemon.combatStats.kp;
        const effectValue = Math.ceil(maxKP * 0.1);
        
        if (hasEishaut) {
            // Heal Pokemon with Eishaut ability
            const oldKP = pokemon.currentKP;
            pokemon.currentKP = Math.min(maxKP, oldKP + effectValue);
            
            logBattleEvent(`${pokemon.name} wird durch seine Eishaut geheilt und erhält ${effectValue} KP zurück!`);
            createDamageNumber(-effectValue, pos, false, 'heal');
            
            // Update HP bar and displays
            updatePokemonHPBar(charId, pokemon);
        } else if (!hasImmunity) {
            // Damage non-immune Pokemon
            const oldKP = pokemon.currentKP;
            pokemon.currentKP = Math.max(0, oldKP - effectValue);
            
            logBattleEvent(`${pokemon.name} nimmt ${effectValue} Schaden durch den Hagel!`);
            createDamageNumber(effectValue, pos, false, 'weather');
            
            // Update HP bar and displays
            updatePokemonHPBar(charId, pokemon);
            
            // Check if Pokemon fainted
            if (pokemon.currentKP <= 0) {
                logBattleEvent(`${pokemon.name} wurde durch den Hagel besiegt!`);
                
                // Use the centralized defeat handler
                await checkAndHandleDefeat(
                    pokemon,
                    charId,
                    null, // No attacker for weather deaths
                    null,
                    { isWeatherDeath: true }
                );
            }
        }
    }
    
    // Update initiative HP display
    updateInitiativeHP();
}

/**
 * Apply sandstorm effects to all Pokemon
 * @param {Object} characterPositions - All character positions
 * @returns {Promise<void>} - Promise that resolves when all effects are applied
 */
async function applySandstormEffects(characterPositions) {
    logBattleEvent(`Der Sandsturm verursacht Schaden bei nicht-Gestein/Stahl/Boden-Pokémon!`);
    
    // Process each Pokemon sequentially to avoid race conditions with defeat handling
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        if (pos.isDefeated) continue;
        
        const pokemon = pos.character;
        if (!pokemon) continue;
        
        // Check if Pokemon has Rock, Steel or Ground type
        const hasImmunity = pokemon.pokemonTypes && 
            pokemon.pokemonTypes.some(type => 
                type.toLowerCase() === 'rock' || 
                type.toLowerCase() === 'gestein' || 
                type.toLowerCase() === 'steel' || 
                type.toLowerCase() === 'stahl' || 
                type.toLowerCase() === 'ground' || 
                type.toLowerCase() === 'boden'
            );
        
        if (!hasImmunity) {
            // Calculate 10% of max KP
            const maxKP = pokemon.maxKP || pokemon.combatStats.kp;
            const damageValue = Math.ceil(maxKP * 0.1);
            
            // Damage non-immune Pokemon
            const oldKP = pokemon.currentKP;
            pokemon.currentKP = Math.max(0, oldKP - damageValue);
            
            logBattleEvent(`${pokemon.name} nimmt ${damageValue} Schaden durch den Sandsturm!`);
            createDamageNumber(damageValue, pos, false, 'weather');
            
            // Update HP bar and displays
            updatePokemonHPBar(charId, pokemon);
            
            // Check if Pokemon fainted
            if (pokemon.currentKP <= 0) {
                logBattleEvent(`${pokemon.name} wurde durch den Sandsturm besiegt!`);
                
                // Use the centralized defeat handler
                await checkAndHandleDefeat(
                    pokemon,
                    charId,
                    null, // No attacker for weather deaths
                    null,
                    { isWeatherDeath: true }
                );
            }
        }
    }
    
    // Update initiative HP display
    updateInitiativeHP();
}

/**
 * Check if target has evasion boost from weather abilities
 * @param {Object} target - Target character data
 * @returns {number} - Minimum successes required to hit (1 for normal, 3 for weather boost)
 */
export function getWeatherEvasionThreshold(target) {
    const currentWeather = getCurrentWeather();
    
    // Check if target has relevant abilities
    const hasAbilities = target.character.statsDetails?.abilities;
    if (!hasAbilities) return 1;
    
    const abilities = target.character.statsDetails.abilities;
    
    // Check for Sandschleier in Sandsturm
    const hasSandschleier = abilities.some(ability => 
        ability.name === "Sandschleier" || ability.englishName === "sand-veil"
    );
    
    if (hasSandschleier && currentWeather.state === WEATHER_TYPES.SANDSTURM) {
        return 3;
    }
    
    // Check for Schneemantel in Hagel or Schnee
    const hasSchneemantel = abilities.some(ability => 
        ability.name === "Schneemantel" || ability.englishName === "snow-cloak"
    );
    
    if (hasSchneemantel && (currentWeather.state === WEATHER_TYPES.HAGEL || currentWeather.state === WEATHER_TYPES.SCHNEE)) {
        return 3;
    }
    
    return 1; // Normal threshold
}

/**
 * Apply Sandsturm stat bonuses to all Gestein (Rock) type Pokemon
 * +1 stage to Defense and Special Defense (only if not already at +6)
 */
async function applySandsturmBonuses() {
    const characterPositions = getCharacterPositions();
    
    for (const charId in characterPositions) {
        const pos = characterPositions[charId];
        if (pos.isDefeated) continue;
        
        const pokemon = pos.character;
        if (!pokemon) continue;
        
        // Check if Pokemon has Rock/Gestein type
        const hasRockType = pokemon.pokemonTypes && 
            pokemon.pokemonTypes.some(type => 
                type.toLowerCase() === 'rock' || 
                type.toLowerCase() === 'gestein'
            );
        
        if (hasRockType) {
            // Track what bonuses we actually apply
            const bonusRecord = { defense: false, specialDefense: false };
            
            // Try to apply +1 Defense
            const currentDefenseStage = getCurrentStage(pokemon, 'verteidigung');
            if (currentDefenseStage < 6) {
                const defenseResult = await changeStatValue(pokemon, 'verteidigung', 1);
                if (defenseResult.success) {
                    bonusRecord.defense = true;
                    logBattleEvent(`${pokemon.name}'s Verteidigung steigt durch den Sandsturm!`);
                }
            }
            
            // Try to apply +1 Special Defense
            const currentSpecialDefenseStage = getCurrentStage(pokemon, 'spezialverteidigung');
            if (currentSpecialDefenseStage < 6) {
                const specialDefenseResult = await changeStatValue(pokemon, 'spezialverteidigung', 1);
                if (specialDefenseResult.success) {
                    bonusRecord.specialDefense = true;
                    logBattleEvent(`${pokemon.name}'s Spezial-Verteidigung steigt durch den Sandsturm!`);
                }
            }
            
            // Only store the record if we actually applied any bonuses
            if (bonusRecord.defense || bonusRecord.specialDefense) {
                sandsturmBonuses.set(pokemon.uniqueId, bonusRecord);
            }
        }
    }
}

/**
 * Remove Sandsturm stat bonuses from all Pokemon that received them
 * Only removes bonuses that were actually applied
 */
async function removeSandsturmBonuses() {
    const characterPositions = getCharacterPositions();
    
    // Process each Pokemon that received bonuses
    for (const [pokemonId, bonusRecord] of sandsturmBonuses.entries()) {
        // Find the Pokemon in current positions
        let pokemon = null;
        for (const charId in characterPositions) {
            const pos = characterPositions[charId];
            if (pos.character && pos.character.uniqueId === pokemonId) {
                pokemon = pos.character;
                break;
            }
        }
        
        // If Pokemon is still in battle, remove the bonuses we applied
        if (pokemon) {
            // Remove Defense bonus if we applied it
            if (bonusRecord.defense) {
                const defenseResult = await changeStatValue(pokemon, 'verteidigung', -1);
                if (defenseResult.success) {
                    logBattleEvent(`${pokemon.name}'s Verteidigung sinkt, da der Sandsturm vorbei ist.`);
                }
            }
            
            // Remove Special Defense bonus if we applied it
            if (bonusRecord.specialDefense) {
                const specialDefenseResult = await changeStatValue(pokemon, 'spezialverteidigung', -1);
                if (specialDefenseResult.success) {
                    logBattleEvent(`${pokemon.name}'s Spezial-Verteidigung sinkt, da der Sandsturm vorbei ist.`);
                }
            }
        }
    }
    
    // Clear all tracked bonuses
    sandsturmBonuses.clear();
}

/**
 * Apply Sandsturm bonuses to a specific Pokemon (for when Pokemon enters during Sandsturm)
 * @param {Object} pokemon - The Pokemon to apply bonuses to
 */
export async function applySandsturmBonusToNewPokemon(pokemon) {
    // Only apply if Sandsturm is currently active
    if (battleWeather.state !== WEATHER_TYPES.SANDSTURM) {
        return;
    }
    
    // Check if Pokemon has Rock/Gestein type
    const hasRockType = pokemon.pokemonTypes && 
        pokemon.pokemonTypes.some(type => 
            type.toLowerCase() === 'rock' || 
            type.toLowerCase() === 'gestein'
        );
    
    if (hasRockType) {
        // Track what bonuses we actually apply
        const bonusRecord = { defense: false, specialDefense: false };
        
        // Try to apply +1 Defense
        const currentDefenseStage = getCurrentStage(pokemon, 'verteidigung');
        if (currentDefenseStage < 6) {
            const defenseResult = await changeStatValue(pokemon, 'verteidigung', 1);
            if (defenseResult.success) {
                bonusRecord.defense = true;
                logBattleEvent(`${pokemon.name}'s Verteidigung steigt durch den Sandsturm!`);
            }
        }
        
        // Try to apply +1 Special Defense
        const currentSpecialDefenseStage = getCurrentStage(pokemon, 'spezialverteidigung');
        if (currentSpecialDefenseStage < 6) {
            const specialDefenseResult = await changeStatValue(pokemon, 'spezialverteidigung', 1);
            if (specialDefenseResult.success) {
                bonusRecord.specialDefense = true;
                logBattleEvent(`${pokemon.name}'s Spezial-Verteidigung steigt durch den Sandsturm!`);
            }
        }
        
        // Only store the record if we actually applied any bonuses
        if (bonusRecord.defense || bonusRecord.specialDefense) {
            sandsturmBonuses.set(pokemon.uniqueId, bonusRecord);
        }
    }
}