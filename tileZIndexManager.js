/**
 * Utility for managing tile z-indices when Pokémon move on/off tiles
 */

/**
 * Updates the z-index of a tile based on whether it has a Pokémon on it
 * @param {HTMLElement} tile - The tile element to update
 * @param {boolean} hasCharacter - Whether the tile now has a character on it
 */
export function updateTileZIndex(tile, hasCharacter) {
  if (!tile) return;
  
  // Store the original z-index if not already stored
  if (!tile.dataset.originalZIndex && tile.style.zIndex) {
    tile.dataset.originalZIndex = tile.style.zIndex;
  }
  
  if (hasCharacter) {
    // Increase z-index by 1000 when a Pokémon is placed on the tile
    tile.style.zIndex = '1000';
  } else {
    // Reset to original z-index (or default) when the Pokémon leaves
    tile.style.zIndex = tile.dataset.originalZIndex || '1';
    // Clean up the data attribute
    delete tile.dataset.originalZIndex;
  }
}