/**
 * Character card creation system
 */

import { STRATEGY_OPTIONS, FORCING_MODE_OPTIONS } from './charakterAuswahlConfig.js';
import { createCharacterTooltip } from './tooltip.js';
import { getTeamAssignments } from './teamManager.js';

// Track if we're currently dragging
let isDragging = false;
// Store the currently dragged character index
let draggedCharacterIndex = -1;

/**
 * Creates a character card DOM element
 * @param {Object} character - The character data
 * @param {number} index - The index of the character in the array
 * @returns {HTMLElement} - The character card element
 */
export function createCharacterCard(character, index) {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.index = index;
    
    // Make the card draggable
    card.draggable = true;
    card.addEventListener('dragstart', handleDragStart);
    
    // Use the character's assigned sprite number
    const spriteNum = character.spriteNum || 1; // Fallback to 1 if not set
    const spriteImg = document.createElement('img');
    spriteImg.src = `Sprites/spr_mage${spriteNum}.png`;
    spriteImg.alt = character.name || 'Character Sprite';
    spriteImg.className = 'character-sprite-img';
    
    // Create sprite container
    const sprite = document.createElement('div');
    sprite.className = 'character-sprite';
    sprite.appendChild(spriteImg);
    
    // Character name container with name and attributes
    const nameContainer = document.createElement('div');
    nameContainer.className = 'character-name-wrapper';
    
    // Character name
    const name = document.createElement('div');
    name.className = 'character-name';
    name.textContent = character.name || 'Unbekannter Charakter';
    nameContainer.appendChild(name);
    
    // Add terrain attributes badges if they exist
    if (character.terrainAttributes) {
        const terrainBadges = document.createElement('div');
        terrainBadges.className = 'terrain-badges';
        
        if (character.terrainAttributes.fliegend) {
            const flyingBadge = document.createElement('span');
            flyingBadge.className = 'terrain-badge flying';
            flyingBadge.title = 'Fliegend';
            flyingBadge.textContent = '✈';
            terrainBadges.appendChild(flyingBadge);
        }
        
        if (character.terrainAttributes.schwimmend) {
            const swimmingBadge = document.createElement('span');
            swimmingBadge.className = 'terrain-badge swimming';
            swimmingBadge.title = 'Schwimmend';
            swimmingBadge.textContent = '🌊';
            terrainBadges.appendChild(swimmingBadge);
        }
        
        nameContainer.appendChild(terrainBadges);
    }
    
    // Create tooltip
    const tooltip = createCharacterTooltip(character);
    
    // Add elements to card
    card.appendChild(sprite);
    card.appendChild(nameContainer);
    card.appendChild(tooltip);
    
    // Add click event listener for sprite selection
    card.addEventListener('click', (e) => {
        // Prevent click when dragging
        if (isDragging) return;
        
        // Stop propagation to prevent immediate closing of the menu
        e.stopPropagation();
        
        if (typeof selectCharacter === 'function') {
            selectCharacter(index);
        } else {
            console.warn('selectCharacter function not defined');
        }
    });
    
    return card;
}

/**
 * Creates a character card for a team slot
 * @param {Object} character - The character data
 * @param {number} teamIndex - The team index
 * @param {number} slotIndex - The slot index
 * @returns {HTMLElement} - The character card
 */
export function createTeamCharacterCard(character, teamIndex, slotIndex) {
    const card = document.createElement('div');
    card.className = 'character-card team-character';
    card.dataset.team = teamIndex;
    card.dataset.slot = slotIndex;
    
    // Make the card draggable
    card.draggable = true;
    card.addEventListener('dragstart', handleTeamDragStart);
    
    // Use the character's assigned sprite number
    const spriteNum = character.spriteNum || 1; // Fallback to 1 if not set
    const spriteImg = document.createElement('img');
    spriteImg.src = `Sprites/spr_mage${spriteNum}.png`;
    spriteImg.alt = character.name || 'Character Sprite';
    spriteImg.className = 'character-sprite-img';
    
    // Create sprite container
    const sprite = document.createElement('div');
    sprite.className = 'character-sprite';
    sprite.appendChild(spriteImg);
    
    // Character name container with name and attributes
    const nameContainer = document.createElement('div');
    nameContainer.className = 'character-name-wrapper';
    
    // Character name
    const name = document.createElement('div');
    name.className = 'character-name';
    name.textContent = character.name || 'Unbekannter Charakter';
    nameContainer.appendChild(name);
    
    // Add terrain attributes badges if they exist
    if (character.terrainAttributes) {
        const terrainBadges = document.createElement('div');
        terrainBadges.className = 'terrain-badges';
        
        if (character.terrainAttributes.fliegend) {
            const flyingBadge = document.createElement('span');
            flyingBadge.className = 'terrain-badge flying';
            flyingBadge.title = 'Fliegend';
            flyingBadge.textContent = '✈';
            terrainBadges.appendChild(flyingBadge);
        }
        
        if (character.terrainAttributes.schwimmend) {
            const swimmingBadge = document.createElement('span');
            swimmingBadge.className = 'terrain-badge swimming';
            swimmingBadge.title = 'Schwimmend';
            swimmingBadge.textContent = '🌊';
            terrainBadges.appendChild(swimmingBadge);
        }
        
        nameContainer.appendChild(terrainBadges);
    }
    
    // Create strategy dropdown
    const strategyContainer = document.createElement('div');
    strategyContainer.className = 'strategy-container';
    
    const strategyLabel = document.createElement('label');
    strategyLabel.textContent = 'Strategie:';
    strategyLabel.className = 'strategy-label';
    strategyLabel.htmlFor = `strategy-${teamIndex}-${slotIndex}`;
    
    const strategySelect = document.createElement('select');
    strategySelect.className = 'strategy-select';
    strategySelect.id = `strategy-${teamIndex}-${slotIndex}`;
    
    // Add strategy options
    STRATEGY_OPTIONS.forEach(strategy => {
        const option = document.createElement('option');
        option.value = strategy.value;
        option.textContent = strategy.text;
        
        // Select the character's current strategy if set, otherwise default to 'aggressive'
        if ((character.strategy && character.strategy === strategy.value) || 
            (!character.strategy && strategy.value === 'aggressive')) {
            option.selected = true;
        }
        
        strategySelect.appendChild(option);
    });
    
    // Add change event listener
    strategySelect.addEventListener('change', (e) => {
        // Update character's strategy
        const teamAssignments = getTeamAssignments();
        teamAssignments[teamIndex][slotIndex].strategy = e.target.value;
        console.log(`Set ${character.name}'s strategy to ${e.target.value}`);
    });
    
    strategyContainer.appendChild(strategyLabel);
    strategyContainer.appendChild(strategySelect);

    //Forcieren Modi
    const forceModeContainer = document.createElement('div');
    forceModeContainer.className = 'strategy-container';

    const forceModeLabel = document.createElement('label');
    forceModeLabel.textContent = 'Forcieren-Modus:';
    forceModeLabel.className = 'strategy-label';
    forceModeLabel.htmlFor = `force-mode-${teamIndex}-${slotIndex}`;

    const forceModeSelect = document.createElement('select');
    forceModeSelect.className = 'strategy-select';
    forceModeSelect.id = `force-mode-${teamIndex}-${slotIndex}`;

    // Add forcing mode options
    FORCING_MODE_OPTIONS.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode.value;
        option.textContent = mode.text;
        
        // Select the character's current forcing mode if set, otherwise default to 'always'
        if ((character.forcingMode && character.forcingMode === mode.value) || 
            (!character.forcingMode && mode.value === 'always')) {
            option.selected = true;
        }
        
        forceModeSelect.appendChild(option);
    });

    // Add change event listener
    forceModeSelect.addEventListener('change', (e) => {
        // Update character's forcing mode
        const teamAssignments = getTeamAssignments();
        teamAssignments[teamIndex][slotIndex].forcingMode = e.target.value;
        console.log(`Set ${character.name}'s forcing mode to ${e.target.value}`);
    });

    forceModeContainer.appendChild(forceModeLabel);
    forceModeContainer.appendChild(forceModeSelect);
    
    // Create tooltip
    const tooltip = createCharacterTooltip(character);
    
    // Add elements to card in the correct order
    card.appendChild(sprite);
    card.appendChild(nameContainer);
    card.appendChild(strategyContainer);
    card.appendChild(forceModeContainer);
    card.appendChild(tooltip);
    
    // Add click event listener for sprite selection
    card.addEventListener('click', (e) => {
        // Prevent click when dragging
        if (isDragging) return;
        
        // Don't trigger if clicking on the strategy dropdown
        if (e.target.closest('.strategy-container')) return;
        
        // Stop propagation to prevent immediate closing of the menu
        e.stopPropagation();
        
        if (typeof selectTeamCharacter === 'function') {
            selectTeamCharacter(teamIndex, slotIndex);
        } else {
            console.warn('selectTeamCharacter function not defined');
        }
    });
    
    return card;
}

/**
 * Handle drag start from character list
 * @param {DragEvent} e - The drag event
 */
export function handleDragStart(e) {
    isDragging = true;
    const card = e.target.closest('.character-card');
    draggedCharacterIndex = parseInt(card.dataset.index);
    
    // Set drag image and data
    e.dataTransfer.setData('text/plain', draggedCharacterIndex);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a class to the card to indicate it's being dragged
    card.classList.add('dragging');
    
    // Reset drop handled flag
    import('./teamManager.js').then(module => {
        module.resetDropHandledFlag();
    });
    
    // Clear the drag state after a short delay
    setTimeout(() => {
        card.classList.remove('dragging');
    }, 0);
}

/**
 * Handle drag start from team slot
 * @param {DragEvent} e - The drag event
 */
export function handleTeamDragStart(e) {
    isDragging = true;
    const card = e.target.closest('.character-card');
    const teamIndex = parseInt(card.dataset.team);
    const slotIndex = parseInt(card.dataset.slot);
    
    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify({
        source: 'team',
        teamIndex: teamIndex,
        slotIndex: slotIndex
    }));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a class to the card to indicate it's being dragged
    card.classList.add('dragging');
    
    // Reset drop handled flag
    import('./teamManager.js').then(module => {
        module.resetDropHandledFlag();
    });
    
    // Clear the drag state after a short delay
    setTimeout(() => {
        card.classList.remove('dragging');
    }, 0);
}

/**
 * Reset drag state
 */
export function resetDragState() {
    isDragging = false;
    draggedCharacterIndex = -1;
}