/**
 * Battle log for displaying combat events
 */

// Store battle log element reference
let battleLogElement = null;

/**
 * Create the battle log area
 * @returns {HTMLElement} - The battle log container
 */
export function createBattleLog() {
    const container = document.createElement('div');
    container.className = 'battle-log-container';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'battle-log-header';
    
    const title = document.createElement('div');
    title.className = 'battle-log-title';
    title.textContent = 'Battle Log';
    header.appendChild(title);
    
    container.appendChild(header);
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'battle-log-content';
    content.id = 'battle-log';
    container.appendChild(content);
    
    // Set the global reference
    battleLogElement = content;
    
    return container;
}

/**
 * Add an entry to the battle log
 * @param {string} text - The text to add
 * @param {boolean} isHTML - Whether the text contains HTML
 */
export function logBattleEvent(text, isHTML = false) {
    if (!battleLogElement) {
        battleLogElement = document.getElementById('battle-log');
        if (!battleLogElement) {
            console.error('Battle log element not found!');
            return;
        }
    }
    
    const entry = document.createElement('div');
    entry.className = 'battle-log-entry';
    
    if (isHTML) {
        entry.innerHTML = text;
    } else {
        entry.textContent = text;
    }
    
    battleLogElement.appendChild(entry);
    
    // Scroll to the bottom
    battleLogElement.scrollTop = battleLogElement.scrollHeight;
}

/**
 * Reset the battle log
 */
export function resetBattleLog() {
    if (battleLogElement) {
        battleLogElement.innerHTML = '';
    }
}

/**
 * Get the battle log element
 * @returns {HTMLElement} - The battle log element
 */
export function getBattleLogElement() {
    return battleLogElement;
}