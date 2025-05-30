/**
 * Bohrschnabel (Drill Peck) attack implementation
 * A basic melee attack where the Pokemon rams into the target with a spinning drill motion
 */

import { getCharacterPositions } from '../characterPositions.js';

// Animation constants
const ANIMATION_PHASES = {
    SPIN_UP: 300,      // Phase 1: Spin up and charge
    RAM_ATTACK: 200,   // Phase 2: Quick ram motion
    RECOIL: 200,       // Phase 3: Recoil back
    RETURN: 300        // Phase 4: Return to position
};

const DRILL_ROTATIONS = {
    SPIN_UP: 720,      // 2 full rotations
    RAM_ATTACK: 1080,  // 3 full rotations
    FINAL: 1440        // 4 full rotations
};

/**
 * Find the DOM element for a Pokemon character
 * @param {Object} character - The character object to find
 * @returns {HTMLElement|null} - The character's DOM element or null if not found
 */
function findCharacterElement(character) {
    const characterPositions = getCharacterPositions();
    
    for (const charId in characterPositions) {
        if (characterPositions[charId].character === character) {
            return document.querySelector(`[data-character-id="${charId}"]`);
        }
    }
    
    return null;
}

/**
 * Calculate movement vector from attacker to target
 * @param {Object} attacker - Attacker position
 * @param {Object} target - Target position  
 * @param {number} intensity - Movement intensity multiplier
 * @returns {Object} - Movement vector {x, y}
 */
function calculateMovementVector(attacker, target, intensity = 30) {
    const deltaX = target.x - attacker.x;
    const deltaY = target.y - attacker.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    return {
        x: distance > 0 ? (deltaX / distance) * intensity : 0,
        y: distance > 0 ? (deltaY / distance) * intensity : 0
    };
}

/**
 * Animate the Bohrschnabel attack - Pokemon spins like a drill and rams into target
 * @param {Object} attacker - The attacking Pokemon's position data
 * @param {Object} target - The target Pokemon's position data
 * @param {Function} callback - Callback function to execute when animation completes
 */
export function animateBohrschnabel(attacker, target, callback) {
    const attackerElement = findCharacterElement(attacker.character);
    
    if (!attackerElement) {
        console.warn('Attacker element not found for Bohrschnabel animation');
        if (callback) callback();
        return;
    }
    
    // Calculate movement direction
    const movement = calculateMovementVector(attacker, target);
    
    // Store original styles
    const originalTransform = attackerElement.style.transform || '';
    const originalTransition = attackerElement.style.transition || '';
    
    // Animation sequence
    executeAnimationSequence(attackerElement, movement, originalTransform, originalTransition, callback);
}

/**
 * Execute the 4-phase drill animation sequence
 * @param {HTMLElement} element - The Pokemon element to animate
 * @param {Object} movement - Movement vector {x, y}
 * @param {string} originalTransform - Original transform style
 * @param {string} originalTransition - Original transition style
 * @param {Function} callback - Completion callback
 */
function executeAnimationSequence(element, movement, originalTransform, originalTransition, callback) {
    // Phase 1: Spin up and charge toward target
    element.style.transition = `transform ${ANIMATION_PHASES.SPIN_UP}ms ease-in`;
    element.style.transform = `${originalTransform} translateX(${movement.x}px) translateY(${movement.y}px) rotate(${DRILL_ROTATIONS.SPIN_UP}deg)`;
    
    setTimeout(() => {
        // Phase 2: Quick ram motion with additional spin
        element.style.transition = `transform ${ANIMATION_PHASES.RAM_ATTACK}ms ease-out`;
        element.style.transform = `${originalTransform} translateX(${movement.x * 1.5}px) translateY(${movement.y * 1.5}px) rotate(${DRILL_ROTATIONS.RAM_ATTACK}deg)`;
        
        setTimeout(() => {
            // Phase 3: Recoil back slightly
            element.style.transition = `transform ${ANIMATION_PHASES.RECOIL}ms ease-in-out`;
            element.style.transform = `${originalTransform} translateX(${movement.x * 0.5}px) translateY(${movement.y * 0.5}px) rotate(${DRILL_ROTATIONS.RAM_ATTACK}deg)`;
            
            setTimeout(() => {
                // Phase 4: Return to original position with final spin
                element.style.transition = `transform ${ANIMATION_PHASES.RETURN}ms ease-out`;
                element.style.transform = `${originalTransform} rotate(${DRILL_ROTATIONS.FINAL}deg)`;
                
                setTimeout(() => {
                    // Reset to original state
                    element.style.transition = originalTransition;
                    element.style.transform = originalTransform;
                    
                    if (callback) callback();
                }, ANIMATION_PHASES.RETURN);
            });
        });
    });
}

/**
 * Create visual drill effect particles around the attacking Pokemon
 * @param {HTMLElement} attackerElement - The attacker's DOM element
 * @param {number} duration - Duration of the particle effect in milliseconds
 */
function createDrillParticles(attackerElement, duration = 1000) {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'drill-particles-container';
    
    // Style the particle container
    Object.assign(particleContainer.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '1000'
    });
    
    attackerElement.appendChild(particleContainer);
    
    // Create swirling debris particles
    const particleCount = 8;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = createDrillParticle(i, particleCount, duration);
        particleContainer.appendChild(particle);
        particles.push(particle);
    }
    
    // Clean up container after animation completes
    setTimeout(() => {
        if (particleContainer.parentNode) {
            particleContainer.parentNode.removeChild(particleContainer);
        }
    }, duration + 100);
}

/**
 * Create a single drill particle with spiral animation
 * @param {number} index - Particle index
 * @param {number} total - Total number of particles
 * @param {number} duration - Animation duration
 * @returns {HTMLElement} - The particle element
 */
function createDrillParticle(index, total, duration) {
    const particle = document.createElement('div');
    
    // Style the particle
    Object.assign(particle.style, {
        position: 'absolute',
        width: '4px',
        height: '4px',
        backgroundColor: '#8B4513', // Brown color for dirt/debris
        borderRadius: '50%',
        opacity: '0.8'
    });
    
    // Position particle in circle around Pokemon
    const angle = (index / total) * 2 * Math.PI;
    const radius = 20;
    const startX = 50 + Math.cos(angle) * radius;
    const startY = 50 + Math.sin(angle) * radius;
    
    particle.style.left = startX + '%';
    particle.style.top = startY + '%';
    particle.style.transform = 'translate(-50%, -50%)';
    
    // Animate particle in expanding spiral
    const animation = particle.animate([
        {
            transform: `translate(-50%, -50%) rotate(0deg) translateX(${radius}px) rotate(0deg)`,
            opacity: 0.8
        },
        {
            transform: `translate(-50%, -50%) rotate(360deg) translateX(${radius * 1.5}px) rotate(-360deg)`,
            opacity: 0.2
        },
        {
            transform: `translate(-50%, -50%) rotate(720deg) translateX(${radius * 2}px) rotate(-720deg)`,
            opacity: 0
        }
    ], {
        duration: duration,
        easing: 'ease-out'
    });
    
    // Clean up particle when animation finishes
    animation.addEventListener('finish', () => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    });
    
    return particle;
}

/**
 * Enhanced Bohrschnabel animation with particle effects (main export function)
 * @param {Object} attacker - The attacking Pokemon's position data
 * @param {Object} target - The target Pokemon's position data  
 * @param {Function} callback - Callback function to execute when animation completes
 */
export function animateBohrschnabelWithEffects(attacker, target, callback) {
    const attackerElement = findCharacterElement(attacker.character);
    
    if (!attackerElement) {
        console.warn('Attacker element not found for Bohrschnabel animation');
        if (callback) callback();
        return;
    }
    
    // Start particle effect synchronized with animation
    createDrillParticles(attackerElement, 1000);
    
    // Execute the main drill animation
    animateBohrschnabel(attacker, target, callback);
}