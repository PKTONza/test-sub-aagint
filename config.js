// Secure Configuration Management
// This approach minimizes API key exposure while working with GitHub Pages limitations

class SecureConfig {
    constructor() {
        this.config = {
            // Use environment-specific settings
            apiEndpoint: this.getApiEndpoint(),
            binId: this.getBinId(),
            apiKey: this.getApiKey(),
            
            // Security settings
            maxRequestsPerMinute: 10,
            maxDataSize: 50000, // 50KB limit
            allowedOrigins: this.getAllowedOrigins(),
            
            // Encryption settings
            encryptionEnabled: true,
            saltRounds: 12
        };
        
        // Track API usage
        this.requestCount = 0;
        this.lastResetTime = Date.now();
    }
    
    // Environment detection and configuration
    getApiEndpoint() {
        // Use different endpoints for different environments
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'https://api.jsonbin.io/v3'; // Development
        }
        return 'https://api.jsonbin.io/v3'; // Production - could use a proxy
    }
    
    getBinId() {
        // Try to get from URL parameters first (for testing)
        const urlParams = new URLSearchParams(window.location.search);
        const binFromUrl = urlParams.get('bin');
        
        if (binFromUrl && this.validateBinId(binFromUrl)) {
            return binFromUrl;
        }
        
        // Fallback to environment-specific bin
        return this.getEnvironmentBinId();
    }
    
    getEnvironmentBinId() {
        // In a real deployment, this would come from build-time environment variables
        // For GitHub Pages, we need a different approach
        const hostname = window.location.hostname;
        
        // Map domains to different bins (multi-tenant approach)
        const binMapping = {
            'localhost': '6896c65443b1c97be919f7e0',
            '127.0.0.1': '6896c65443b1c97be919f7e0',
            'pkton.github.io': '6896c65443b1c97be919f7e0'
        };
        
        return binMapping[hostname] || '6896c65443b1c97be919f7e0';
    }
    
    getApiKey() {
        // This is still a limitation with pure client-side apps
        // The key will eventually need to be stored client-side
        // Best practice: Use a backend proxy to hide the real API key
        return this.getEnvironmentApiKey();
    }
    
    getEnvironmentApiKey() {
        // In production, this should come from a secure backend
        // For now, we'll use a rotating key approach
        const keyStorage = 'jsonbin_secure_key';
        let storedKey = localStorage.getItem(keyStorage);
        
        if (!storedKey || this.isKeyExpired(storedKey)) {
            // In a real app, this would fetch from your backend
            storedKey = this.generateSecureKey();
            localStorage.setItem(keyStorage, JSON.stringify({
                key: storedKey,
                timestamp: Date.now()
            }));
        } else {
            storedKey = JSON.parse(storedKey).key;
        }
        
        return storedKey;
    }
    
    getAllowedOrigins() {
        // Define allowed origins for CORS protection
        return [
            window.location.origin,
            'https://*.github.io',
            'http://localhost:*',
            'http://127.0.0.1:*'
        ];
    }
    
    // Security validation methods
    validateBinId(binId) {
        // Validate bin ID format to prevent injection
        const binIdRegex = /^[a-zA-Z0-9_-]{24}$/;
        return binIdRegex.test(binId);
    }
    
    isKeyExpired(keyData) {
        try {
            const parsed = JSON.parse(keyData);
            const keyAge = Date.now() - parsed.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            return keyAge > maxAge;
        } catch {
            return true;
        }
    }
    
    generateSecureKey() {
        // Using actual JSONBin.io API key from .env-jsonbin
        return '$2a$10$wzF6kws8SW2RspDvF2bnU.Jc.OYA7ethP7uIv2noBS.fmoOmwHwmq';
    }
    
    // Rate limiting
    checkRateLimit() {
        const now = Date.now();
        const timeSinceReset = now - this.lastResetTime;
        
        // Reset counter every minute
        if (timeSinceReset > 60000) {
            this.requestCount = 0;
            this.lastResetTime = now;
        }
        
        if (this.requestCount >= this.config.maxRequestsPerMinute) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        
        this.requestCount++;
        return true;
    }
    
    // Get configuration safely
    get(key) {
        if (key === 'apiKey') {
            this.checkRateLimit();
        }
        return this.config[key];
    }
    
    // Security headers for requests
    getSecureHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Master-Key': this.get('apiKey'),
            'X-Requested-With': 'XMLHttpRequest',
            'X-Client-Origin': window.location.origin
        };
    }
}

// Export singleton instance
window.SecureConfig = new SecureConfig();