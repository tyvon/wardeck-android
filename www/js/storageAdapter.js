/**
 * Storage Adapter - Provides a consistent interface for storage operations using localStorage.
 */

/**
 * Gets a value from storage
 * @param {string} key - The key to retrieve
 * @param {any} defaultValue - The default value to return if the key doesn't exist
 * @returns {Promise<any>} The stored value or defaultValue
 */
export async function getItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item !== null ? JSON.parse(item) : defaultValue;
    } catch (error) {
        // Error getting item from localStorage
        return defaultValue;
    }
}

/**
 * Sets a value in storage
 * @param {string} key - The key to set
 * @param {any} value - The value to store
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function setItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        // Error setting item in localStorage
        return false;
    }
}

/**
 * Removes a value from storage
 * @param {string} key - The key to remove
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function removeItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        // Error removing item from localStorage
        return false;
    }
}

/**
 * Checks if a key exists in storage
 * @param {string} key - The key to check
 * @returns {Promise<boolean>} Whether the key exists
 */
export async function hasItem(key) {
    return localStorage.getItem(key) !== null;
}

/**
 * Clears all items from storage
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function clear() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        // Error clearing localStorage
        return false;
    }
}