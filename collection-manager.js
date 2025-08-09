/**
 * Multi-Collection Manager for JSONBin.io
 * Handles multiple JSON collections with optimized caching and API management
 */

class CollectionManager {
    constructor() {
        this.collections = new Map();
        this.cache = new Map();
        this.config = window.SecureConfig;
        this.apiCallCount = 0;
        this.lastApiReset = Date.now();
        this.maxApiCalls = 200; // Conservative limit per hour
        
        // Collection definitions with separate bin IDs
        this.collectionDefinitions = {
            animals: {
                binId: '6896c65443b1c97be919f7e0', // Main bin for now
                schema: {
                    id: 'string',
                    name: 'string',
                    type: 'string',
                    rarity: 'string',
                    health: 'number',
                    damage: 'number',
                    location: 'array',
                    drops: 'array',
                    behavior: 'string'
                },
                searchFields: ['name', 'type', 'rarity', 'location', 'behavior']
            },
            weapons: {
                binId: '6896c65543b1c97be919f7e1', // Need separate bins
                schema: {
                    id: 'number',
                    name: 'string',
                    type: 'string',
                    damage_type: 'string',
                    keyword_type: 'string',
                    desc_en: 'string',
                    desc_th: 'string',
                    img: 'string'
                },
                searchFields: ['name', 'type', 'damage_type', 'keyword_type']
            },
            armor: {
                binId: '6896c65643b1c97be919f7e2',
                schema: {
                    id: 'string',
                    name: 'string',
                    type: 'string',
                    defense: 'number',
                    durability: 'number',
                    effects: 'array'
                },
                searchFields: ['name', 'type', 'effects']
            },
            food: {
                binId: '6896c65743b1c97be919f7e3',
                schema: {
                    id: 'string',
                    name: 'string',
                    type: 'string',
                    rarity: 'string',
                    hunger_restore: 'number',
                    health_restore: 'number',
                    effects: 'array',
                    spoilage_time: 'string',
                    ingredients: 'array'
                },
                searchFields: ['name', 'type', 'rarity', 'effects']
            },
            mods: {
                binId: '6896c65843b1c97be919f7e4',
                schema: {
                    id: 'string',
                    name: 'string',
                    description: 'string',
                    category: 'string',
                    compatibility: 'array'
                },
                searchFields: ['name', 'description', 'category']
            },
            seasonal_challenges: {
                binId: '6896c65943b1c97be919f7e5',
                schema: {
                    id: 'string',
                    name: 'string',
                    description: 'string',
                    season: 'string',
                    difficulty: 'string',
                    rewards: 'array',
                    requirements: 'array'
                },
                searchFields: ['name', 'description', 'season', 'difficulty']
            }
        };
        
        // Cache configuration
        this.cacheConfig = {
            defaultTTL: 5 * 60 * 1000, // 5 minutes
            maxCacheSize: 10 * 1024 * 1024, // 10MB
            enablePersistentCache: true
        };
        
        this.initializeCache();
    }

    /**
     * Initialize caching system
     */
    initializeCache() {
        // Load persistent cache from localStorage
        if (this.cacheConfig.enablePersistentCache) {
            try {
                const persistedCache = localStorage.getItem('collection_cache');
                if (persistedCache) {
                    const parsed = JSON.parse(persistedCache);
                    // Validate cache entries aren't expired
                    for (const [key, value] of Object.entries(parsed)) {
                        if (value.timestamp && Date.now() - value.timestamp < this.cacheConfig.defaultTTL) {
                            this.cache.set(key, value);
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to load cache from localStorage:', error);
            }
        }
        
        // Set up cache cleanup interval
        setInterval(() => this.cleanupExpiredCache(), 60000); // Clean every minute
    }

    /**
     * Check API rate limits
     */
    checkApiLimit() {
        const now = Date.now();
        const hoursSinceReset = (now - this.lastApiReset) / (60 * 60 * 1000);
        
        if (hoursSinceReset >= 1) {
            this.apiCallCount = 0;
            this.lastApiReset = now;
        }
        
        if (this.apiCallCount >= this.maxApiCalls) {
            throw new Error(`API limit reached (${this.maxApiCalls}/hour). Please wait.`);
        }
    }

    /**
     * Make API request with caching and error handling
     */
    async makeApiRequest(url, options = {}) {
        this.checkApiLimit();
        
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        
        // Return cached data if available and not expired
        if (cached && Date.now() - cached.timestamp < this.cacheConfig.defaultTTL) {
            console.log(`Cache hit for: ${cacheKey}`);
            return cached.data;
        }
        
        // Make API request
        try {
            this.apiCallCount++;
            const response = await fetch(url, {
                headers: this.config.getSecureHeaders(),
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache the response
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            // Persist to localStorage
            this.persistCache();
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * Load collection data with smart caching
     */
    async loadCollection(collectionName) {
        if (!this.collectionDefinitions[collectionName]) {
            throw new Error(`Unknown collection: ${collectionName}`);
        }
        
        const definition = this.collectionDefinitions[collectionName];
        const url = `${this.config.get('apiEndpoint')}/bins/${definition.binId}`;
        
        try {
            const response = await this.makeApiRequest(url);
            let data;
            
            // Handle different response formats from JSONBin.io
            if (response.record) {
                data = response.record;
            } else if (response[collectionName]) {
                data = response[collectionName];
            } else {
                data = response;
            }
            
            // Ensure data is an array
            if (!Array.isArray(data)) {
                if (data[collectionName] && Array.isArray(data[collectionName])) {
                    data = data[collectionName];
                } else {
                    console.warn(`Collection ${collectionName} data is not an array:`, data);
                    data = [];
                }
            }
            
            this.collections.set(collectionName, data);
            return data;
        } catch (error) {
            console.error(`Failed to load collection ${collectionName}:`, error);
            // Return cached data as fallback
            return this.collections.get(collectionName) || [];
        }
    }

    /**
     * Save collection data to JSONBin.io
     */
    async saveCollection(collectionName, data) {
        if (!this.collectionDefinitions[collectionName]) {
            throw new Error(`Unknown collection: ${collectionName}`);
        }
        
        const definition = this.collectionDefinitions[collectionName];
        const url = `${this.config.get('apiEndpoint')}/bins/${definition.binId}`;
        
        // Prepare data in the expected format
        const payload = {
            [collectionName]: Array.isArray(data) ? data : [data]
        };
        
        try {
            await this.makeApiRequest(url, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            
            // Update local cache
            this.collections.set(collectionName, payload[collectionName]);
            
            // Clear related cache entries
            this.clearCollectionCache(collectionName);
            
            return true;
        } catch (error) {
            console.error(`Failed to save collection ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Search within a collection
     */
    searchCollection(collectionName, searchTerm, options = {}) {
        const data = this.collections.get(collectionName) || [];
        if (!searchTerm || searchTerm.trim() === '') {
            return data;
        }
        
        const definition = this.collectionDefinitions[collectionName];
        const searchFields = options.fields || definition.searchFields;
        const caseSensitive = options.caseSensitive || false;
        
        const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();
        
        return data.filter(item => {
            return searchFields.some(field => {
                const value = this.getNestedValue(item, field);
                if (value == null) return false;
                
                if (Array.isArray(value)) {
                    return value.some(v => {
                        const str = String(v);
                        return caseSensitive ? str.includes(term) : str.toLowerCase().includes(term);
                    });
                }
                
                const str = String(value);
                return caseSensitive ? str.includes(term) : str.toLowerCase().includes(term);
            });
        });
    }

    /**
     * Filter collection with advanced criteria
     */
    filterCollection(collectionName, filters) {
        const data = this.collections.get(collectionName) || [];
        
        return data.filter(item => {
            return Object.entries(filters).every(([field, criteria]) => {
                const value = this.getNestedValue(item, field);
                
                if (criteria.exact !== undefined) {
                    return value === criteria.exact;
                }
                
                if (criteria.in !== undefined) {
                    return Array.isArray(criteria.in) && criteria.in.includes(value);
                }
                
                if (criteria.range !== undefined) {
                    const num = Number(value);
                    return num >= criteria.range.min && num <= criteria.range.max;
                }
                
                if (criteria.contains !== undefined) {
                    if (Array.isArray(value)) {
                        return value.some(v => String(v).toLowerCase().includes(String(criteria.contains).toLowerCase()));
                    }
                    return String(value).toLowerCase().includes(String(criteria.contains).toLowerCase());
                }
                
                return true;
            });
        });
    }

    /**
     * Sort collection data
     */
    sortCollection(collectionName, sortField, direction = 'asc') {
        const data = this.collections.get(collectionName) || [];
        
        return [...data].sort((a, b) => {
            const aVal = this.getNestedValue(a, sortField);
            const bVal = this.getNestedValue(b, sortField);
            
            // Handle different data types
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return direction === 'asc' 
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            
            // Fallback to string comparison
            const aStr = String(aVal || '');
            const bStr = String(bVal || '');
            return direction === 'asc' 
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        });
    }

    /**
     * Add item to collection
     */
    async addItem(collectionName, item) {
        const data = this.collections.get(collectionName) || [];
        
        // Validate item against schema
        this.validateItem(collectionName, item);
        
        // Generate ID if not provided
        if (!item.id) {
            item.id = this.generateId(collectionName);
        }
        
        // Check for duplicate IDs
        if (data.some(existing => existing.id === item.id)) {
            throw new Error(`Item with ID ${item.id} already exists`);
        }
        
        const newData = [...data, item];
        await this.saveCollection(collectionName, newData);
        
        return item;
    }

    /**
     * Update item in collection
     */
    async updateItem(collectionName, itemId, updates) {
        const data = this.collections.get(collectionName) || [];
        const index = data.findIndex(item => item.id === itemId);
        
        if (index === -1) {
            throw new Error(`Item with ID ${itemId} not found`);
        }
        
        const updatedItem = { ...data[index], ...updates, id: itemId };
        
        // Validate updated item
        this.validateItem(collectionName, updatedItem);
        
        const newData = [...data];
        newData[index] = updatedItem;
        
        await this.saveCollection(collectionName, newData);
        
        return updatedItem;
    }

    /**
     * Delete item from collection
     */
    async deleteItem(collectionName, itemId) {
        const data = this.collections.get(collectionName) || [];
        const filtered = data.filter(item => item.id !== itemId);
        
        if (filtered.length === data.length) {
            throw new Error(`Item with ID ${itemId} not found`);
        }
        
        await this.saveCollection(collectionName, filtered);
        
        return true;
    }

    /**
     * Bulk operations for better performance
     */
    async bulkUpdate(collectionName, operations) {
        const data = this.collections.get(collectionName) || [];
        let newData = [...data];
        
        for (const operation of operations) {
            switch (operation.type) {
                case 'add':
                    if (!operation.item.id) {
                        operation.item.id = this.generateId(collectionName);
                    }
                    this.validateItem(collectionName, operation.item);
                    newData.push(operation.item);
                    break;
                    
                case 'update':
                    const updateIndex = newData.findIndex(item => item.id === operation.id);
                    if (updateIndex !== -1) {
                        newData[updateIndex] = { ...newData[updateIndex], ...operation.updates };
                        this.validateItem(collectionName, newData[updateIndex]);
                    }
                    break;
                    
                case 'delete':
                    newData = newData.filter(item => item.id !== operation.id);
                    break;
            }
        }
        
        await this.saveCollection(collectionName, newData);
        return newData;
    }

    /**
     * Export collection data
     */
    exportCollection(collectionName, format = 'json') {
        const data = this.collections.get(collectionName) || [];
        
        switch (format) {
            case 'json':
                return JSON.stringify({ [collectionName]: data }, null, 2);
                
            case 'csv':
                return this.convertToCSV(data);
                
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Import collection data
     */
    async importCollection(collectionName, data, options = {}) {
        const { merge = false, validate = true } = options;
        
        let importData;
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                importData = parsed[collectionName] || parsed;
            } catch (error) {
                throw new Error('Invalid JSON data');
            }
        } else {
            importData = data;
        }
        
        if (!Array.isArray(importData)) {
            throw new Error('Import data must be an array');
        }
        
        // Validate each item if enabled
        if (validate) {
            importData.forEach(item => this.validateItem(collectionName, item));
        }
        
        let finalData;
        if (merge) {
            const existing = this.collections.get(collectionName) || [];
            const existingIds = new Set(existing.map(item => item.id));
            
            // Add non-duplicate items
            const newItems = importData.filter(item => !existingIds.has(item.id));
            finalData = [...existing, ...newItems];
        } else {
            finalData = importData;
        }
        
        await this.saveCollection(collectionName, finalData);
        return finalData;
    }

    // Utility methods
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    validateItem(collectionName, item) {
        const definition = this.collectionDefinitions[collectionName];
        if (!definition || !definition.schema) return true;
        
        // Basic type validation
        for (const [field, type] of Object.entries(definition.schema)) {
            const value = item[field];
            if (value !== undefined && value !== null) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== type) {
                    console.warn(`Type mismatch for ${field}: expected ${type}, got ${actualType}`);
                }
            }
        }
        
        return true;
    }

    generateId(collectionName) {
        return `${collectionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const values = headers.map(header => {
                const value = item[header];
                if (Array.isArray(value)) {
                    return `"${value.join('; ')}"`;
                }
                return `"${String(value || '').replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    clearCollectionCache(collectionName) {
        const keysToDelete = [];
        for (const [key] of this.cache) {
            if (key.includes(collectionName)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    cleanupExpiredCache() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, value] of this.cache) {
            if (now - value.timestamp > this.cacheConfig.defaultTTL) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        
        if (keysToDelete.length > 0) {
            this.persistCache();
        }
    }

    persistCache() {
        if (!this.cacheConfig.enablePersistentCache) return;
        
        try {
            const cacheObj = {};
            for (const [key, value] of this.cache) {
                cacheObj[key] = value;
            }
            localStorage.setItem('collection_cache', JSON.stringify(cacheObj));
        } catch (error) {
            console.warn('Failed to persist cache:', error);
        }
    }

    // Get statistics about collections
    getStats() {
        const stats = {};
        for (const [name, data] of this.collections) {
            stats[name] = {
                count: Array.isArray(data) ? data.length : 0,
                lastUpdated: this.cache.get(`stats_${name}`)?.timestamp || null
            };
        }
        
        stats.cache = {
            size: this.cache.size,
            apiCallsUsed: this.apiCallCount,
            apiCallsRemaining: this.maxApiCalls - this.apiCallCount
        };
        
        return stats;
    }
}

// Export singleton instance
window.CollectionManager = new CollectionManager();