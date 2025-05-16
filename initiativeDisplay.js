/**
 * Initiative display system - revised tooltip implementation
 */

import { getTeamColor, getCurrentKP } from './utils.js';
import { createCharacterTooltip } from './tooltip.js';

// Global tooltip container
let globalTooltip = null;
let currentHoveredElement = null;
let tooltipHideTimeout = null;

/**
 * Initialize the global tooltip container
 */
function initializeGlobalTooltip() {
    // Only create if it doesn't exist yet
    if (!globalTooltip) {
        // Create a single global tooltip container that will be reused
        globalTooltip = document.createElement('div');
        globalTooltip.id = 'global-character-tooltip';
        globalTooltip.className = 'character-tooltip';
        globalTooltip.style.position = 'fixed';
        globalTooltip.style.zIndex = '10000';
        globalTooltip.style.display = 'none';
        globalTooltip.style.pointerEvents = 'none'; // Prevent it from interfering with mouse events
        
        // Add to the body
        document.body.appendChild(globalTooltip);
        
        // Add the tooltip styles
        addTooltipStyles();
    }
}

/**
 * Position the tooltip next to an element
 * @param {HTMLElement} element - Element to position the tooltip next to
 * @param {Object} character - Character data
 */
function showTooltipForElement(element, character) {
    if (!globalTooltip) {
        initializeGlobalTooltip();
    }
    
    // Clear any pending hide timeout
    if (tooltipHideTimeout) {
        clearTimeout(tooltipHideTimeout);
        tooltipHideTimeout = null;
    }
    
    // Update the tooltip content
    globalTooltip.innerHTML = '';
    const tooltipContent = createCharacterTooltip(character);
    
    // Move the content from the created tooltip to our global one
    while (tooltipContent.firstChild) {
        globalTooltip.appendChild(tooltipContent.firstChild);
    }
    
    // Get element position
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Show the tooltip to measure it
    globalTooltip.style.display = 'block';
    globalTooltip.style.visibility = 'hidden'; // Hide while positioning
    
    // Get tooltip dimensions
    const tooltipRect = globalTooltip.getBoundingClientRect();
    
    // Determine the best position (prioritize right side, then left, then above, then below)
    let leftPos, topPos;
    
    // First try positioning to the right
    leftPos = rect.right + 10;
    if (leftPos + tooltipRect.width > windowWidth - 10) {
        // If too far right, try left
        leftPos = rect.left - tooltipRect.width - 10;
        
        // If too far left, try below
        if (leftPos < 10) {
            leftPos = Math.min(
                windowWidth - tooltipRect.width - 10,
                Math.max(10, rect.left)
            );
            
            // Try below
            topPos = rect.bottom + 10;
            
            // If too far down, position above
            if (topPos + tooltipRect.height > windowHeight - 10) {
                topPos = rect.top - tooltipRect.height - 10;
                
                // If also too far up, center as best we can
                if (topPos < 10) {
                    topPos = Math.max(10, (windowHeight - tooltipRect.height) / 2);
                }
            }
        } else {
            // Left positioning works, vertically center with element
            topPos = rect.top + (rect.height - tooltipRect.height) / 2;
            
            // Adjust if offscreen
            if (topPos < 10) {
                topPos = 10;
            } else if (topPos + tooltipRect.height > windowHeight - 10) {
                topPos = windowHeight - tooltipRect.height - 10;
            }
        }
    } else {
        // Right positioning works, vertically center with element
        topPos = rect.top + (rect.height - tooltipRect.height) / 2;
        
        // Adjust if offscreen
        if (topPos < 10) {
            topPos = 10;
        } else if (topPos + tooltipRect.height > windowHeight - 10) {
            topPos = windowHeight - tooltipRect.height - 10;
        }
    }
    
    // Set the final position
    globalTooltip.style.left = `${leftPos}px`;
    globalTooltip.style.top = `${topPos}px`;
    
    // Make visible with a fade-in effect
    globalTooltip.style.visibility = 'visible';
    globalTooltip.style.opacity = '0';
    
    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
        globalTooltip.style.transition = 'opacity 0.2s ease-in-out';
        globalTooltip.style.opacity = '1';
    });
    
    // Store reference to current element
    currentHoveredElement = element;
}

/**
 * Hide the tooltip
 * @param {boolean} immediate - Whether to hide immediately or with a fade-out effect
 */
function hideTooltip(immediate = false) {
    if (!globalTooltip) return;
    
    // Clear any pending hide timeout
    if (tooltipHideTimeout) {
        clearTimeout(tooltipHideTimeout);
        tooltipHideTimeout = null;
    }
    
    if (immediate) {
        globalTooltip.style.display = 'none';
        currentHoveredElement = null;
    } else {
        // Fade out
        globalTooltip.style.transition = 'opacity 0.2s ease-in-out';
        globalTooltip.style.opacity = '0';
        
        // Hide after animation completes
        tooltipHideTimeout = setTimeout(() => {
            globalTooltip.style.display = 'none';
            currentHoveredElement = null;
        }, 200);
    }
}

/**
 * Add CSS styles for the tooltip
 */
function addTooltipStyles() {
    // Check if the styles already exist
    if (document.getElementById('character-tooltip-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'character-tooltip-styles';
    
    // Define styles for tooltips
    styleElement.textContent = `
        .character-tooltip {
            background-color: #333;
            color: #fff;
            padding: 15px;
            border-radius: 5px;
            width: 350px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            font-size: 14px;
            line-height: 1.4;
        }
        
        .tooltip-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #555;
            padding-bottom: 5px;
        }
        
        .tooltip-section {
            margin-bottom: 8px;
        }
        
        .tooltip-label {
            font-weight: bold;
            color: #ccc;
        }
        
        .tooltip-value {
            margin-left: 5px;
        }
        
        .tooltip-list {
            margin-left: 15px;
            margin-top: 5px;
        }
        
        .tooltip-separator {
            height: 1px;
            background-color: #555;
            margin: 10px 0;
        }
        
        .tooltip-spell, .tooltip-item {
            margin-bottom: 5px;
            padding-left: 15px;
        }
        
        .tooltip-spell-name, .tooltip-item-name {
            font-weight: bold;
        }
        
        .tooltip-spell-info, .tooltip-item-effect {
            font-size: 12px;
            color: #aaa;
            margin-top: 2px;
        }
        
        .attack-section {
            margin-left: 15px;
        }

        .tooltip-stats-container {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .tooltip-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }

        .tooltip-stat-name {
            color: #aaa;
            font-size: 12px;
        }

        .tooltip-stat-value {
            color: #fff;
            font-weight: bold;
        }

        .tooltip-mini-separator {
            height: 1px;
            background-color: #444;
            margin: 8px 0;
            opacity: 0.5;
        }
        
        /* Terrain attribute styles */
        .terrain-attribute {
            display: inline-block;
            margin-right: 5px;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
        }
        
        .terrain-attribute.fliegend {
            background-color: #e0f7fa;
            color: #006064;
            border: 1px solid #4dd0e1;
        }
        
        .terrain-attribute.schwimmend {
            background-color: #bbdefb;
            color: #0d47a1;
            border: 1px solid #64b5f6;
        }
    `;
    
    // Add style element to head
    document.head.appendChild(styleElement);
}

/**
 * Display the initiative order in the Arena, with data attributes for character identification
 * @param {Array} sortedCharacterList - The sorted list of characters
 */
export function displayInitiativeOrder(sortedCharacterList) {
    // Initialize global tooltip
    initializeGlobalTooltip();
    
    // Find the layout container
    const layoutContainer = document.querySelector('.battlefield-layout');
    
    if (!layoutContainer) {
        console.error("Battlefield layout container not found!");
        return;
    }
    
    // Create initiative order container
    const initiativeContainer = document.createElement('div');
    initiativeContainer.className = 'initiative-order';
    
    // Create heading
    const heading = document.createElement('h3');
    heading.textContent = 'Initiative-Reihenfolge';
    initiativeContainer.appendChild(heading);
    
    // Create list
    const initiativeList = document.createElement('div');
    initiativeList.className = 'initiative-list';
    
    // Add each character to the list
    sortedCharacterList.forEach((entry) => {
        // Create character item container
        const characterItem = document.createElement('div');
        characterItem.className = 'initiative-item';
        characterItem.dataset.character = entry.character.uniqueId;
        
        // Initialize current KP if not set
        if (!entry.character.currentKP && entry.character.currentKP !== 0) {
            entry.character.currentKP = (entry.character.combatStats && entry.character.combatStats.kp) 
                ? parseInt(entry.character.combatStats.kp, 10) 
                : 10; // Default
        }
        
        // Set max HP if not already set
        if (!entry.character.maxKP) {
            entry.character.maxKP = (entry.character.combatStats && entry.character.combatStats.kp) 
                ? parseInt(entry.character.combatStats.kp, 10) 
                : 10; // Default
        }
        
        // Create HP bar section
        const hpSection = document.createElement('div');
        hpSection.className = 'initiative-hp-section';
        
        // Create HP container with background that will show when HP is reduced
        const hpContainer = document.createElement('div');
        hpContainer.className = 'initiative-hp-container';
        hpContainer.style.backgroundColor = '#333'; // Dark background for the container
        
        // Create HP bar that shows actual health
        const hpBar = document.createElement('div');
        hpBar.className = 'initiative-hp-bar';
        
        // Calculate percent of HP remaining
        const maxHP = parseInt(entry.character.maxKP, 10);
        const currentHP = parseInt(entry.character.currentKP, 10);
        const hpPercent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
        
        // Set the bar width based on HP percentage
        hpBar.style.width = `${hpPercent}%`;
        
        // Determine color based on health percentage
        if (hpPercent <= 25) {
            hpBar.style.backgroundColor = '#e74c3c'; // Red for critical health
        } else if (hpPercent <= 50) {
            hpBar.style.backgroundColor = '#f39c12'; // Orange for half health
        } else {
            hpBar.style.backgroundColor = getTeamColor(entry.teamIndex); // Team color for good health
        }
        
        // Create HP text element that shows current/max HP
        const hpText = document.createElement('div');
        hpText.className = 'initiative-hp-text';
        hpText.textContent = `${currentHP}/${maxHP}`;
        
        // Add HP bar and text to container
        hpContainer.appendChild(hpBar);
        hpContainer.appendChild(hpText);
        hpSection.appendChild(hpContainer);
        
        // Add HP section to character item
        characterItem.appendChild(hpSection);
        
        // Create character info container for name, sprite, etc.
        const infoContainer = document.createElement('div');
        infoContainer.className = 'initiative-info-container';
        
        // Add team color indicator
        const teamIndicator = document.createElement('div');
        teamIndicator.className = 'team-indicator';
        teamIndicator.style.backgroundColor = getTeamColor(entry.teamIndex);
        infoContainer.appendChild(teamIndicator);
        
        // Add character sprite
        const spriteImg = document.createElement('img');
        spriteImg.src = entry.character.spriteUrl || `Sprites/spr_mage${entry.character.spriteNum || 1}.png`;
        spriteImg.alt = entry.character.name || 'Character';
        spriteImg.className = 'initiative-sprite';
        infoContainer.appendChild(spriteImg);
        
        // Add character name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'initiative-name';
        nameSpan.textContent = entry.character.name;
        infoContainer.appendChild(nameSpan);

        // Add status effects if character has them
        if (entry.character.statusEffects && entry.character.statusEffects.length > 0) {
            // Create status icons container
            const statusIconsContainer = document.createElement('div');
            statusIconsContainer.className = 'initiative-status-icons';
            
            // Add each status effect icon
            entry.character.statusEffects.forEach(effect => {
                const iconEl = document.createElement('div');
                iconEl.className = `status-effect-icon ${effect.cssClass}`;
                iconEl.title = `${effect.name}: ${effect.effect}`;
                
                // Special handling for certain status effects
                if (effect.id === 'burned') {
                    iconEl.innerHTML = '🔥';
                    iconEl.style.fontSize = '8px';
                    iconEl.style.color = 'yellow';
                    iconEl.style.textShadow = '0 0 2px #ff0, 0 0 3px #ff0';
                } else {
                    iconEl.textContent = effect.htmlSymbol;
                }
                
                statusIconsContainer.appendChild(iconEl);
            });
            
            // Add to name span
            nameSpan.appendChild(statusIconsContainer);
        }
        
        // Add initiative roll result
        const initiativeSpan = document.createElement('span');
        initiativeSpan.className = 'initiative-roll';
        initiativeSpan.textContent = `(${entry.initiativeRoll})`;
        infoContainer.appendChild(initiativeSpan);
        
        // Add info container to character item
        characterItem.appendChild(infoContainer);
        
        // Add event listeners for tooltips - the new way
        characterItem.addEventListener('mouseenter', () => {
            showTooltipForElement(characterItem, entry.character);
        });
        
        characterItem.addEventListener('mouseleave', () => {
            hideTooltip();
        });
        
        // For touch devices, handle tap/click
        characterItem.addEventListener('click', (e) => {
            // Toggle the tooltip
            if (currentHoveredElement === characterItem) {
                hideTooltip(true);
            } else {
                showTooltipForElement(characterItem, entry.character);
                
                // Prevent event bubbling to document
                e.stopPropagation();
            }
        });
        
        // Add to initiative list
        initiativeList.appendChild(characterItem);
    });
    
    // Add click handler to document to close tooltip when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (currentHoveredElement && !currentHoveredElement.contains(e.target)) {
            hideTooltip(true);
        }
    });
    
    // Add initiative list to container
    initiativeContainer.appendChild(initiativeList);
    
    // Check if there's an existing initiative order and remove it
    const existingInitiativeOrder = layoutContainer.querySelector('.initiative-order');
    if (existingInitiativeOrder) {
        layoutContainer.removeChild(existingInitiativeOrder);
    }
    
    // Insert at the beginning of the layout container
    layoutContainer.insertBefore(initiativeContainer, layoutContainer.firstChild);
    
    // Make sure we also update the associated CSS
    updateInitiativeStyles();
}

/**
 * Update CSS styles for initiative display
 */
function updateInitiativeStyles() {
    // Check if the styles already exist
    if (document.getElementById('initiative-styles')) return;
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'initiative-styles';
    
    // Define improved styles
    styleElement.textContent = `
        .initiative-order {
            flex: 0 0 250px;
            min-width: 250px;
            height: 100%;
            max-height: none;
            overflow-y: auto;
            background-color: #fff;
            border-radius: 5px;
            border: 1px solid #ddd;
            padding: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            align-self: stretch;
            display: flex;
            flex-direction: column;
        }
        
        .initiative-order h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 16px;
            text-align: center;
            color: #444;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
            flex-shrink: 0;
        }
        
        .initiative-list {
            display: flex;
            flex-direction: column;
            gap: 5px;
            flex-grow: 1;
            overflow-y: auto;
            padding-right: 5px;
        }
        
        .initiative-hp-section {
            margin-bottom: 5px;
            width: 100%;
        }
        
        .initiative-hp-container {
            position: relative;
            width: 100%;
            height: 16px;
            background-color: #333;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #555;
        }
        
        .initiative-hp-bar {
            height: 100%;
            transition: width 0.3s ease, background-color 0.3s ease;
        }
        
        .initiative-hp-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 10px;
            font-weight: bold;
            text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.8);
            z-index: 5;
            pointer-events: none;
        }
        
        .initiative-info-container {
            display: flex;
            align-items: center;
            width: 100%;
        }
        
        .initiative-item {
            padding: 8px;
            margin-bottom: 5px;
            background-color: #f5f5f5;
            border-radius: 4px;
            border: 1px solid #ddd;
            transition: all 0.2s ease;
            cursor: pointer;
        }
        
        .initiative-item:hover {
            background-color: #e9e9e9;
            transform: translateY(-2px);
            box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1);
        }
        
        .initiative-item.active {
            background-color: #fff9db;
            border-color: #ffd700;
            box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
            transform: translateX(5px);
        }
        
        .initiative-item.defeated {
            opacity: 0.6;
            text-decoration: line-through;
            background-color: #f0f0f0;
        }
        
        .team-indicator {
            width: 6px;
            height: 26px;
            border-radius: 3px;
            margin-right: 8px;
        }
        
        .initiative-sprite {
            width: 24px;
            height: 24px;
            object-fit: contain;
            margin-right: 8px;
        }
        
        .initiative-name {
            flex: 1;
            font-weight: bold;
            font-size: 12px;
        }
        
        .initiative-roll {
            color: #777;
            font-size: 11px;
            margin-left: 4px;
        }
    `;
    
    // Add style element to head
    document.head.appendChild(styleElement);
}

/**
 * Update the initiative display to show current HP
 */
export async function updateInitiativeHP() {
    // Find all initiative items
    const initiativeItems = document.querySelectorAll('.initiative-item');
    
    // Import to avoid circular dependency
    const { getSortedCharacters } = await import('./initiative.js');
    const sortedCharacters = getSortedCharacters();
    
    // Get character positions for updating battlefield HP bars too
    const { getCharacterPositions } = await import('./characterPositions.js');
    const characterPositions = getCharacterPositions();
    
    // Update each item's HP display
    initiativeItems.forEach(item => {
        const characterId = item.dataset.character;
        if (!characterId) return;
        
        // Find this character in the sortedCharacters array using uniqueId
        const character = sortedCharacters.find(entry => entry.character.uniqueId === characterId);
        if (!character) return;
        
        // Get the HP container and bar
        const hpContainer = item.querySelector('.initiative-hp-container');
        const hpBar = item.querySelector('.initiative-hp-bar');
        const hpText = item.querySelector('.initiative-hp-text');
        if (!hpContainer || !hpBar || !hpText) return;
        
        // Get current KP and make sure maxKP is set
        const currentKP = getCurrentKP(character.character);
        let maxKP = character.character.maxKP;
        
        // If maxKP is not set, initialize it from combatStats
        if (maxKP === undefined || maxKP === null) {
            if (character.character.combatStats && character.character.combatStats.kp) {
                maxKP = parseInt(character.character.combatStats.kp, 10);
                character.character.maxKP = maxKP;
            } else {
                maxKP = 10; // Default
                character.character.maxKP = maxKP;
            }
        }
        
        // Calculate percent of HP remaining
        const hpPercent = Math.max(0, Math.min(100, (currentKP / maxKP) * 100));
        
        // Update the HP bar width
        hpBar.style.width = `${hpPercent}%`;
        
        // Update the HP text
        hpText.textContent = `${currentKP}/${maxKP}`;
        
        // Update color based on HP percentage
        if (hpPercent <= 25) {
            hpBar.style.backgroundColor = '#e74c3c'; // Red for critical health
        } else if (hpPercent <= 50) {
            hpBar.style.backgroundColor = '#f39c12'; // Orange for half health
        } else {
            hpBar.style.backgroundColor = getTeamColor(character.teamIndex); // Team color for good health
        }
    });
}

/**
 * Mark a character as defeated in the initiative list
 * @param {string} characterId - UniqueId of the defeated character
 */
export async function markDefeatedInInitiative(characterId) {
    // Find the initiative item for this character
    const initiativeItem = document.querySelector(`.initiative-item[data-character="${characterId}"]`);
    if (initiativeItem) {
        initiativeItem.classList.add('defeated');
        
        // Update the HP bar to show zero health
        const hpBar = initiativeItem.querySelector('.initiative-hp-bar');
        if (hpBar) {
            hpBar.style.width = '0%';
        }
        
        // Update the text to show 0 HP
        const hpText = initiativeItem.querySelector('.initiative-hp-text');
        if (hpText) {
            // Get max KP value
            const maxKP = await getMaxKP(characterId);
            hpText.textContent = `0/${maxKP}`;
        }
    }
}

/**
 * Helper function to get maximum KP for a character
 * @param {string} characterId - Character uniqueId
 * @returns {number} - Max KP value
 */
async function getMaxKP(characterId) {
    // Import to avoid circular dependency
    const { getSortedCharacters } = await import('./initiative.js');
    const sortedCharacters = getSortedCharacters();
    
    const character = sortedCharacters.find(entry => entry.character.uniqueId === characterId);
    
    if (character && character.character.maxKP) {
        return character.character.maxKP;
    } else if (character && character.character.combatStats && character.character.combatStats.kp) {
        return character.character.combatStats.kp;
    }
    
    return 10; // Default value
}

/**
 * Update status effect icons for a character in the initiative display
 * @param {string} characterId - UniqueId of the character to update
 */
export function updateStatusIconsInInitiative(characterId) {
    // Find the initiative item for this character
    const initiativeItem = document.querySelector(`.initiative-item[data-character="${characterId}"]`);
    if (!initiativeItem) return;
    
    // Find the name area where we'll add status icons
    const nameContainer = initiativeItem.querySelector('.initiative-info-container');
    if (!nameContainer) return;
    
    // Find existing status container and remove it if it exists
    const existingStatusContainer = nameContainer.querySelector('.initiative-status-icons');
    if (existingStatusContainer) {
        existingStatusContainer.remove();
    }
    
    // Get the character object to check for status effects
    import('./initiative.js').then(module => {
        const { getSortedCharacters } = module;
        const sortedCharacters = getSortedCharacters();
        
        // Find character by uniqueId
        const character = sortedCharacters.find(entry => entry.character.uniqueId === characterId);
        if (!character || !character.character) return;
        
        // If character has status effects, create and add icons
        if (character.character.statusEffects && character.character.statusEffects.length > 0) {
            // Create status icons container
            const statusIconsContainer = document.createElement('div');
            statusIconsContainer.className = 'initiative-status-icons';
            
            // Add each status effect icon
            character.character.statusEffects.forEach(effect => {
                const iconEl = document.createElement('div');
                iconEl.className = `status-effect-icon ${effect.cssClass}`;
                iconEl.title = `${effect.name}: ${effect.effect}`;
                
                // Special handling for certain status effects
                if (effect.id === 'burned') {
                    iconEl.innerHTML = '🔥';
                    iconEl.style.fontSize = '8px';
                    iconEl.style.color = 'yellow';
                    iconEl.style.textShadow = '0 0 2px #ff0, 0 0 3px #ff0';
                } else {
                    iconEl.textContent = effect.htmlSymbol;
                }
                
                statusIconsContainer.appendChild(iconEl);
            });
            
            // Insert after the name but before the initiative roll
            const nameSpan = nameContainer.querySelector('.initiative-name');
            if (nameSpan) {
                nameSpan.appendChild(statusIconsContainer);
            } else {
                // Fallback - add to the end of the container
                nameContainer.appendChild(statusIconsContainer);
            }
        }
    });
}