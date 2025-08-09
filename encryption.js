// Data Encryption Module
// Client-side encryption for sensitive data before JSONBin.io storage

class DataEncryption {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.tagLength = 16;
        this.keyStorageKey = 'jsonbin_encryption_key';
        
        // Initialize encryption
        this.initializeEncryption();
    }
    
    async initializeEncryption() {
        try {
            // Check if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle) {
                console.warn('Web Crypto API not available. Falling back to basic encoding.');
                this.fallbackMode = true;
                return;
            }
            
            // Generate or retrieve encryption key
            await this.initializeKey();
            
            console.log('🔒 Encryption module initialized successfully');
        } catch (error) {
            console.error('Encryption initialization failed:', error);
            this.fallbackMode = true;
        }
    }
    
    async initializeKey() {
        try {
            // Check if key exists in sessionStorage
            const storedKey = sessionStorage.getItem(this.keyStorageKey);
            
            if (storedKey) {
                // Import existing key
                const keyData = JSON.parse(storedKey);
                this.encryptionKey = await window.crypto.subtle.importKey(
                    'raw',
                    new Uint8Array(keyData),
                    { name: this.algorithm, length: this.keyLength },
                    false,
                    ['encrypt', 'decrypt']
                );
            } else {
                // Generate new key
                this.encryptionKey = await window.crypto.subtle.generateKey(
                    { name: this.algorithm, length: this.keyLength },
                    true,
                    ['encrypt', 'decrypt']
                );
                
                // Export and store key for session
                const exportedKey = await window.crypto.subtle.exportKey('raw', this.encryptionKey);
                sessionStorage.setItem(this.keyStorageKey, JSON.stringify(Array.from(new Uint8Array(exportedKey))));
            }
        } catch (error) {
            console.error('Key initialization failed:', error);
            this.fallbackMode = true;
        }
    }
    
    async encryptData(data) {
        if (!data) return data;
        
        try {
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            
            if (this.fallbackMode) {
                return this.fallbackEncrypt(dataString);
            }
            
            // Generate random IV
            const iv = window.crypto.getRandomValues(new Uint8Array(this.ivLength));
            
            // Encode data
            const encodedData = new TextEncoder().encode(dataString);
            
            // Encrypt
            const encrypted = await window.crypto.subtle.encrypt(
                { name: this.algorithm, iv: iv },
                this.encryptionKey,
                encodedData
            );
            
            // Combine IV and encrypted data
            const encryptedArray = new Uint8Array(encrypted);
            const result = new Uint8Array(iv.length + encryptedArray.length);
            result.set(iv);
            result.set(encryptedArray, iv.length);
            
            // Return as base64 string with metadata
            return {
                encrypted: this.arrayBufferToBase64(result),
                algorithm: this.algorithm,
                timestamp: Date.now(),
                version: '1.0'
            };
            
        } catch (error) {
            console.error('Encryption failed:', error);
            return this.fallbackEncrypt(typeof data === 'string' ? data : JSON.stringify(data));
        }
    }
    
    async decryptData(encryptedData) {
        if (!encryptedData) return encryptedData;
        
        try {
            // Handle different data formats
            if (typeof encryptedData === 'string') {
                // Fallback encrypted data
                return this.fallbackDecrypt(encryptedData);
            }
            
            if (!encryptedData.encrypted) {
                // Data is not encrypted
                return encryptedData;
            }
            
            if (this.fallbackMode) {
                return this.fallbackDecrypt(encryptedData.encrypted);
            }
            
            // Convert base64 back to array buffer
            const combinedArray = this.base64ToArrayBuffer(encryptedData.encrypted);
            
            // Extract IV and encrypted data
            const iv = combinedArray.slice(0, this.ivLength);
            const encrypted = combinedArray.slice(this.ivLength);
            
            // Decrypt
            const decrypted = await window.crypto.subtle.decrypt(
                { name: this.algorithm, iv: iv },
                this.encryptionKey,
                encrypted
            );
            
            // Decode result
            const decryptedString = new TextDecoder().decode(decrypted);
            
            // Try to parse as JSON, fallback to string
            try {
                return JSON.parse(decryptedString);
            } catch {
                return decryptedString;
            }
            
        } catch (error) {
            console.error('Decryption failed:', error);
            // Try fallback decryption
            if (typeof encryptedData === 'object' && encryptedData.encrypted) {
                return this.fallbackDecrypt(encryptedData.encrypted);
            }
            return encryptedData; // Return as-is if decryption fails
        }
    }
    
    // Fallback encryption using simple obfuscation
    fallbackEncrypt(data) {
        try {
            const key = this.getFallbackKey();
            let encrypted = '';
            
            for (let i = 0; i < data.length; i++) {
                const char = data.charCodeAt(i);
                const keyChar = key.charCodeAt(i % key.length);
                encrypted += String.fromCharCode(char ^ keyChar);
            }
            
            return btoa(unescape(encodeURIComponent(encrypted)));
        } catch (error) {
            console.error('Fallback encryption failed:', error);
            return data;
        }
    }
    
    fallbackDecrypt(encryptedData) {
        try {
            const key = this.getFallbackKey();
            const data = decodeURIComponent(escape(atob(encryptedData)));
            let decrypted = '';
            
            for (let i = 0; i < data.length; i++) {
                const char = data.charCodeAt(i);
                const keyChar = key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(char ^ keyChar);
            }
            
            return decrypted;
        } catch (error) {
            console.error('Fallback decryption failed:', error);
            return encryptedData;
        }
    }
    
    getFallbackKey() {
        // Generate a simple key based on session
        const sessionId = sessionStorage.getItem('jsonbin_session_id') || 
                          Date.now().toString();
        
        if (!sessionStorage.getItem('jsonbin_session_id')) {
            sessionStorage.setItem('jsonbin_session_id', sessionId);
        }
        
        return 'fallback_key_' + sessionId;
    }
    
    // Utility functions
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    
    // Public API for selective encryption
    async encryptSensitiveFields(data) {
        if (!data || typeof data !== 'object') return data;
        
        const sensitiveFields = ['content', 'title', 'notes', 'description'];
        const result = { ...data };
        
        for (const field of sensitiveFields) {
            if (result[field]) {
                result[field] = await this.encryptData(result[field]);
            }
        }
        
        return result;
    }
    
    async decryptSensitiveFields(data) {
        if (!data || typeof data !== 'object') return data;
        
        const sensitiveFields = ['content', 'title', 'notes', 'description'];
        const result = { ...data };
        
        for (const field of sensitiveFields) {
            if (result[field]) {
                result[field] = await this.decryptData(result[field]);
            }
        }
        
        return result;
    }
    
    // Encrypt array of items
    async encryptArray(dataArray) {
        if (!Array.isArray(dataArray)) return dataArray;
        
        const encrypted = [];
        for (const item of dataArray) {
            encrypted.push(await this.encryptSensitiveFields(item));
        }
        
        return encrypted;
    }
    
    // Decrypt array of items
    async decryptArray(encryptedArray) {
        if (!Array.isArray(encryptedArray)) return encryptedArray;
        
        const decrypted = [];
        for (const item of encryptedArray) {
            decrypted.push(await this.decryptSensitiveFields(item));
        }
        
        return decrypted;
    }
    
    // Generate data integrity hash
    async generateHash(data) {
        try {
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataString);
            
            if (window.crypto && window.crypto.subtle) {
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
                return this.arrayBufferToBase64(hashBuffer);
            } else {
                // Simple hash fallback
                let hash = 0;
                for (let i = 0; i < dataString.length; i++) {
                    const char = dataString.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return Math.abs(hash).toString(36);
            }
        } catch (error) {
            console.error('Hash generation failed:', error);
            return null;
        }
    }
    
    // Verify data integrity
    async verifyHash(data, expectedHash) {
        if (!expectedHash) return true; // No hash to verify
        
        const actualHash = await this.generateHash(data);
        return actualHash === expectedHash;
    }
    
    // Clear encryption key (for logout)
    clearEncryptionKey() {
        sessionStorage.removeItem(this.keyStorageKey);
        sessionStorage.removeItem('jsonbin_session_id');
        this.encryptionKey = null;
    }
    
    // Check if encryption is available
    isEncryptionAvailable() {
        return !this.fallbackMode && this.encryptionKey !== null;
    }
    
    // Get encryption status
    getEncryptionStatus() {
        return {
            available: this.isEncryptionAvailable(),
            fallbackMode: this.fallbackMode,
            algorithm: this.fallbackMode ? 'XOR' : this.algorithm,
            keyLength: this.keyLength
        };
    }
}

// Secure Storage Wrapper
class SecureStorage {
    constructor() {
        this.encryption = new DataEncryption();
        this.initializeStorage();
    }
    
    async initializeStorage() {
        // Wait for encryption to initialize
        while (!this.encryption.encryptionKey && !this.encryption.fallbackMode) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    async setItem(key, value, encrypt = true) {
        try {
            const data = encrypt ? await this.encryption.encryptData(value) : value;
            const storageItem = {
                data: data,
                encrypted: encrypt,
                timestamp: Date.now(),
                hash: await this.encryption.generateHash(value)
            };
            
            localStorage.setItem(key, JSON.stringify(storageItem));
            return true;
        } catch (error) {
            console.error('SecureStorage.setItem failed:', error);
            return false;
        }
    }
    
    async getItem(key, decrypt = true) {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;
            
            const storageItem = JSON.parse(stored);
            
            // Verify data integrity if hash exists
            if (storageItem.hash && decrypt) {
                const decryptedData = storageItem.encrypted ? 
                    await this.encryption.decryptData(storageItem.data) : 
                    storageItem.data;
                    
                const isValid = await this.encryption.verifyHash(decryptedData, storageItem.hash);
                if (!isValid) {
                    console.warn('Data integrity check failed for key:', key);
                }
            }
            
            if (decrypt && storageItem.encrypted) {
                return await this.encryption.decryptData(storageItem.data);
            }
            
            return storageItem.data;
        } catch (error) {
            console.error('SecureStorage.getItem failed:', error);
            return null;
        }
    }
    
    removeItem(key) {
        localStorage.removeItem(key);
    }
    
    clear() {
        // Only clear items that we created
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('jsonbin_') || key.startsWith('auth_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
}

// Initialize modules
window.DataEncryption = new DataEncryption();
window.SecureStorage = new SecureStorage();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataEncryption, SecureStorage };
}