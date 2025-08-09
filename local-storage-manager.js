// Local Storage Manager for Collections
// This provides a working CRUD system using browser localStorage
// Can be easily migrated to JSONBin.io later when API issues are resolved

class LocalStorageManager {
    constructor() {
        this.storagePrefix = 'game_collections_';
        this.collections = this.getCollectionsConfig();
        this.initializeCollections();
    }
    
    getCollectionsConfig() {
        return [
            {
                name: 'animals',
                displayName: 'Animals',
                icon: '🐺',
                description: 'Game animals with stats and drops',
                fields: ['name', 'type', 'rarity', 'health', 'damage', 'location', 'drops', 'behavior']
            },
            {
                name: 'weapons',
                displayName: 'Weapons', 
                icon: '⚔️',
                description: 'Weapon stats and abilities',
                fields: ['name', 'type', 'damage_type', 'keyword_type', 'desc_en', 'desc_th', 'img']
            },
            {
                name: 'armor',
                displayName: 'Armor',
                icon: '🛡️', 
                description: 'Armor pieces and defense stats',
                fields: ['name', 'type', 'defense', 'durability', 'weight', 'material']
            },
            {
                name: 'food',
                displayName: 'Food',
                icon: '🍖',
                description: 'Food items and nutritional values', 
                fields: ['name', 'type', 'nutrition', 'effects', 'preparation', 'shelf_life']
            },
            {
                name: 'mods',
                displayName: 'Modifications',
                icon: '🔧',
                description: 'Equipment modifications and upgrades',
                fields: ['name', 'type', 'effect', 'requirements', 'compatibility', 'rarity']
            },
            {
                name: 'seasonal_challenges',
                displayName: 'Seasonal Challenges',
                icon: '🎯',
                description: 'Time-limited challenges and rewards',
                fields: ['name', 'description', 'reward', 'difficulty', 'duration', 'requirements']
            }
        ];
    }
    
    async initializeCollections() {
        console.log('🔧 Initializing Collections Manager...');
        
        // Load data from JSON files if not already in localStorage
        for (const collection of this.collections) {
            const existingData = this.getCollection(collection.name);
            
            if (!existingData || existingData.length === 0) {
                try {
                    const response = await fetch(`crud_data/${collection.name}.json`);
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Handle different JSON structures
                        let items = [];
                        if (Array.isArray(data)) {
                            items = data;
                        } else if (data[collection.name]) {
                            items = data[collection.name];
                        } else {
                            // Take the first array property
                            const firstArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
                            if (firstArrayKey) {
                                items = data[firstArrayKey];
                            }
                        }
                        
                        if (items.length > 0) {
                            this.saveCollection(collection.name, items);
                            console.log(`✅ Loaded ${items.length} items for ${collection.displayName}`);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not load ${collection.name}.json:`, error.message);
                }
            } else {
                console.log(`📦 Using cached data for ${collection.displayName} (${existingData.length} items)`);
            }
        }
        
        console.log('🎉 Collections Manager initialized successfully!');
    }
    
    // CRUD Operations
    
    // Create - Add new item to collection
    createItem(collectionName, item) {
        const items = this.getCollection(collectionName);
        
        // Generate ID if not provided
        if (!item.id) {
            item.id = this.generateId(collectionName);
        }
        
        // Add timestamp
        item.created_at = new Date().toISOString();
        item.updated_at = item.created_at;
        
        items.push(item);
        this.saveCollection(collectionName, items);
        
        this.updateCollectionStats(collectionName);
        return item;
    }
    
    // Read - Get all items from collection
    getCollection(collectionName) {
        const key = this.storagePrefix + collectionName;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }
    
    // Read - Get single item by ID
    getItem(collectionName, itemId) {
        const items = this.getCollection(collectionName);
        return items.find(item => item.id == itemId);
    }
    
    // Update - Update existing item
    updateItem(collectionName, itemId, updatedItem) {
        const items = this.getCollection(collectionName);
        const index = items.findIndex(item => item.id == itemId);
        
        if (index === -1) {
            throw new Error(`Item with ID ${itemId} not found in ${collectionName}`);
        }
        
        // Preserve creation date, update modification date
        updatedItem.created_at = items[index].created_at;
        updatedItem.updated_at = new Date().toISOString();
        updatedItem.id = itemId; // Ensure ID doesn't change
        
        items[index] = updatedItem;
        this.saveCollection(collectionName, items);
        
        this.updateCollectionStats(collectionName);
        return updatedItem;
    }
    
    // Delete - Remove item from collection
    deleteItem(collectionName, itemId) {
        const items = this.getCollection(collectionName);
        const index = items.findIndex(item => item.id == itemId);
        
        if (index === -1) {
            throw new Error(`Item with ID ${itemId} not found in ${collectionName}`);
        }
        
        const deletedItem = items.splice(index, 1)[0];
        this.saveCollection(collectionName, items);
        
        this.updateCollectionStats(collectionName);
        return deletedItem;
    }
    
    // Search items in collection
    searchItems(collectionName, query, fields = null) {
        const items = this.getCollection(collectionName);
        
        if (!query) return items;
        
        const searchQuery = query.toLowerCase();
        
        return items.filter(item => {
            const searchFields = fields || this.getCollectionConfig(collectionName).fields;
            
            return searchFields.some(field => {
                const value = item[field];
                if (!value) return false;
                
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(searchQuery);
                }
                
                if (Array.isArray(value)) {
                    return value.some(v => v.toString().toLowerCase().includes(searchQuery));
                }
                
                return value.toString().toLowerCase().includes(searchQuery);
            });
        });
    }
    
    // Helper methods
    
    saveCollection(collectionName, items) {
        const key = this.storagePrefix + collectionName;
        localStorage.setItem(key, JSON.stringify(items));
    }
    
    generateId(collectionName) {
        const items = this.getCollection(collectionName);
        const existingIds = items.map(item => {
            const id = item.id;
            return typeof id === 'number' ? id : parseInt(id) || 0;
        });
        
        return Math.max(0, ...existingIds) + 1;
    }
    
    getCollectionConfig(collectionName) {
        return this.collections.find(c => c.name === collectionName);
    }
    
    updateCollectionStats(collectionName) {
        const items = this.getCollection(collectionName);
        const collection = this.getCollectionConfig(collectionName);
        
        if (collection) {
            collection.count = items.length;
            collection.size = new Blob([JSON.stringify(items)]).size;
            collection.lastUpdated = new Date().toISOString();
        }
    }
    
    // Get collection statistics
    getCollectionStats(collectionName) {
        const items = this.getCollection(collectionName);
        const collection = this.getCollectionConfig(collectionName);
        
        return {
            name: collectionName,
            displayName: collection ? collection.displayName : collectionName,
            icon: collection ? collection.icon : '📄',
            description: collection ? collection.description : '',
            count: items.length,
            size: new Blob([JSON.stringify(items)]).size,
            lastUpdated: collection ? collection.lastUpdated : null
        };
    }
    
    // Get all collection statistics
    getAllStats() {
        return this.collections.map(c => this.getCollectionStats(c.name));
    }
    
    // Export collection as JSON
    exportCollection(collectionName) {
        const items = this.getCollection(collectionName);
        const collection = this.getCollectionConfig(collectionName);
        
        const exportData = {
            collection: collectionName,
            displayName: collection ? collection.displayName : collectionName,
            exported_at: new Date().toISOString(),
            count: items.length,
            data: items
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${collectionName}_export.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return exportData;
    }
    
    // Import collection from JSON
    async importCollection(collectionName, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    let items = [];
                    if (Array.isArray(data)) {
                        items = data;
                    } else if (data.data && Array.isArray(data.data)) {
                        items = data.data;
                    } else if (data[collectionName] && Array.isArray(data[collectionName])) {
                        items = data[collectionName];
                    } else {
                        // Find first array property
                        const firstArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
                        if (firstArrayKey) {
                            items = data[firstArrayKey];
                        } else {
                            throw new Error('No valid array data found in JSON file');
                        }
                    }
                    
                    // Validate and clean items
                    items = items.map((item, index) => {
                        if (!item.id) {
                            item.id = index + 1;
                        }
                        item.imported_at = new Date().toISOString();
                        return item;
                    });
                    
                    this.saveCollection(collectionName, items);
                    this.updateCollectionStats(collectionName);
                    
                    resolve({
                        collection: collectionName,
                        imported: items.length,
                        data: items
                    });
                    
                } catch (error) {
                    reject(new Error(`Import failed: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('File reading failed'));
            reader.readAsText(file);
        });
    }
    
    // Clear all data (for development/testing)
    clearAllData() {
        this.collections.forEach(collection => {
            const key = this.storagePrefix + collection.name;
            localStorage.removeItem(key);
        });
        console.log('🗑️ All collection data cleared');
    }
    
    // Bulk operations
    bulkImport(operations) {
        const results = [];
        
        operations.forEach(op => {
            try {
                switch (op.action) {
                    case 'create':
                        results.push(this.createItem(op.collection, op.data));
                        break;
                    case 'update':
                        results.push(this.updateItem(op.collection, op.id, op.data));
                        break;
                    case 'delete':
                        results.push(this.deleteItem(op.collection, op.id));
                        break;
                }
            } catch (error) {
                results.push({ error: error.message, operation: op });
            }
        });
        
        return results;
    }
}

// Create global instance
window.CollectionsManager = new LocalStorageManager();

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalStorageManager;
}