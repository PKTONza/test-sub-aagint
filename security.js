// Security Module - Input Validation and XSS Protection
// Comprehensive security utilities for client-side protection

class SecurityModule {
    constructor() {
        this.validator = new InputValidator();
        this.sanitizer = new HTMLSanitizer();
        this.crypto = new CryptoHelper();
        this.csrf = new CSRFProtection();
        
        // Initialize security measures
        this.initializeCSP();
        this.initializeEventListeners();
    }
    
    // Initialize Content Security Policy (where possible)
    initializeCSP() {
        // Add CSP meta tag if not present
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const cspMeta = document.createElement('meta');
            cspMeta.httpEquiv = 'Content-Security-Policy';
            cspMeta.content = this.generateCSPPolicy();
            document.head.appendChild(cspMeta);
        }
    }
    
    generateCSPPolicy() {
        return [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'", // Note: unsafe-inline needed for inline scripts
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.jsonbin.io",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ');
    }
    
    // Initialize security event listeners
    initializeEventListeners() {
        // Prevent common attack vectors
        document.addEventListener('DOMContentLoaded', () => {
            this.preventClickjacking();
            this.addSecurityHeaders();
            this.validateFormInputs();
        });
        
        // Monitor for suspicious activity
        this.monitorSuspiciousActivity();
    }
    
    preventClickjacking() {
        // Add frame-busting code
        if (window.top !== window.self) {
            console.warn('⚠️ Potential clickjacking attempt detected');
            window.top.location = window.self.location;
        }
    }
    
    addSecurityHeaders() {
        // Add security headers where possible
        const meta = document.createElement('meta');
        meta.name = 'referrer';
        meta.content = 'strict-origin-when-cross-origin';
        document.head.appendChild(meta);
    }
    
    validateFormInputs() {
        // Add automatic validation to all form inputs
        document.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', (e) => {
                this.validateInput(e.target);
            });
            
            input.addEventListener('paste', (e) => {
                setTimeout(() => this.validateInput(e.target), 0);
            });
        });
    }
    
    monitorSuspiciousActivity() {
        let suspiciousCount = 0;
        const maxSuspicious = 5;
        
        // Monitor for potential XSS attempts
        document.addEventListener('input', (e) => {
            if (this.detectXSSAttempt(e.target.value)) {
                suspiciousCount++;
                console.warn('⚠️ Potential XSS attempt detected');
                
                if (suspiciousCount > maxSuspicious) {
                    this.handleSecurityViolation('Multiple XSS attempts detected');
                }
            }
        });
    }
    
    detectXSSAttempt(input) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe\b/gi,
            /<object\b/gi,
            /<embed\b/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi
        ];
        
        return xssPatterns.some(pattern => pattern.test(input));
    }
    
    handleSecurityViolation(message) {
        console.error('🚨 Security Violation:', message);
        
        // In a real app, you'd report this to your security team
        // For now, we'll show a warning and temporarily disable functionality
        if (window.showMessage) {
            window.showMessage('Security violation detected. Please refresh the page.', 'error', 10000);
        }
        
        // Temporarily disable form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Form submissions temporarily disabled due to security concerns.');
            });
        });
    }
    
    // Validate individual input
    validateInput(input) {
        if (!input || !input.value) return true;
        
        const value = input.value;
        const inputType = input.type || 'text';
        const fieldName = input.name || input.id || 'field';
        
        try {
            // Apply input-specific validation
            switch (inputType) {
                case 'text':
                    return this.validator.validateText(value, fieldName);
                case 'textarea':
                    return this.validator.validateText(value, fieldName, { multiline: true });
                case 'email':
                    return this.validator.validateEmail(value);
                case 'url':
                    return this.validator.validateURL(value);
                default:
                    return this.validator.validateGeneric(value);
            }
        } catch (error) {
            console.error('Validation error:', error);
            this.markFieldAsInvalid(input, error.message);
            return false;
        }
    }
    
    markFieldAsInvalid(input, message) {
        input.style.borderColor = '#ef4444';
        input.setAttribute('title', message);
        
        // Remove error styling after user starts typing
        input.addEventListener('input', function clearError() {
            input.style.borderColor = '';
            input.removeAttribute('title');
            input.removeEventListener('input', clearError);
        });
    }
    
    // Public API methods
    sanitizeForDisplay(html) {
        return this.sanitizer.sanitizeHTML(html);
    }
    
    sanitizeForStorage(data) {
        if (typeof data === 'string') {
            return this.sanitizer.sanitizeString(data);
        }
        
        if (typeof data === 'object' && data !== null) {
            return this.sanitizeObject(data);
        }
        
        return data;
    }
    
    sanitizeObject(obj) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanKey = this.sanitizer.sanitizeString(key);
            sanitized[cleanKey] = this.sanitizeForStorage(value);
        }
        return sanitized;
    }
    
    encryptSensitiveData(data) {
        return this.crypto.encrypt(JSON.stringify(data));
    }
    
    decryptSensitiveData(encryptedData) {
        try {
            const decrypted = this.crypto.decrypt(encryptedData);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }
    
    generateCSRFToken() {
        return this.csrf.generateToken();
    }
    
    validateCSRFToken(token) {
        return this.csrf.validateToken(token);
    }
}

// Input Validator Class
class InputValidator {
    constructor() {
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            url: /^https?:\/\/([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            sqlInjection: /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
            noScript: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
        };
        
        this.limits = {
            maxLength: 10000,
            maxWordCount: 2000,
            maxLines: 100
        };
    }
    
    validateText(text, fieldName = 'text', options = {}) {
        const { multiline = false, maxLength = this.limits.maxLength } = options;
        
        // Check length
        if (text.length > maxLength) {
            throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
        }
        
        // Check for SQL injection patterns
        if (this.patterns.sqlInjection.test(text)) {
            throw new Error(`${fieldName} contains potentially dangerous content`);
        }
        
        // Check for script tags
        if (this.patterns.noScript.test(text)) {
            throw new Error(`${fieldName} contains forbidden script tags`);
        }
        
        // Check line count for multiline text
        if (multiline) {
            const lines = text.split('\n');
            if (lines.length > this.limits.maxLines) {
                throw new Error(`${fieldName} exceeds maximum line count of ${this.limits.maxLines}`);
            }
        }
        
        return true;
    }
    
    validateEmail(email) {
        if (!this.patterns.email.test(email)) {
            throw new Error('Invalid email format');
        }
        return true;
    }
    
    validateURL(url) {
        if (!this.patterns.url.test(url)) {
            throw new Error('Invalid URL format');
        }
        return true;
    }
    
    validateGeneric(input) {
        // Generic validation for any input
        if (typeof input !== 'string') {
            throw new Error('Input must be a string');
        }
        
        if (input.length > this.limits.maxLength) {
            throw new Error(`Input exceeds maximum length of ${this.limits.maxLength} characters`);
        }
        
        return true;
    }
}

// HTML Sanitizer Class
class HTMLSanitizer {
    constructor() {
        this.allowedTags = ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span'];
        this.forbiddenPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /<iframe\b[^>]*>/gi,
            /<object\b[^>]*>/gi,
            /<embed\b[^>]*>/gi,
            /on\w+\s*=/gi,
            /javascript:/gi,
            /data:text\/html/gi
        ];
    }
    
    sanitizeHTML(html) {
        if (!html || typeof html !== 'string') return '';
        
        // Remove forbidden patterns
        let sanitized = html;
        this.forbiddenPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        
        // Escape remaining HTML
        return this.escapeHTML(sanitized);
    }
    
    sanitizeString(str) {
        if (!str || typeof str !== 'string') return '';
        
        // Remove control characters
        let sanitized = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        
        // Limit length
        sanitized = sanitized.substring(0, 10000);
        
        // Remove potentially dangerous sequences
        sanitized = sanitized.replace(/\0/g, '');
        
        return sanitized.trim();
    }
    
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Basic Crypto Helper
class CryptoHelper {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
    }
    
    async generateKey() {
        return await window.crypto.subtle.generateKey(
            { name: this.algorithm, length: this.keyLength },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    async encrypt(data) {
        if (!window.crypto || !window.crypto.subtle) {
            console.warn('Web Crypto API not available, using base64 encoding');
            return btoa(unescape(encodeURIComponent(data)));
        }
        
        try {
            const key = await this.generateKey();
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(data);
            
            const encrypted = await window.crypto.subtle.encrypt(
                { name: this.algorithm, iv: iv },
                key,
                encoded
            );
            
            return {
                data: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv)
            };
        } catch (error) {
            console.warn('Encryption failed, using fallback:', error);
            return btoa(unescape(encodeURIComponent(data)));
        }
    }
    
    async decrypt(encryptedData) {
        if (!window.crypto || !window.crypto.subtle) {
            console.warn('Web Crypto API not available, using base64 decoding');
            return decodeURIComponent(escape(atob(encryptedData)));
        }
        
        // Implementation would need stored key - simplified for demo
        console.warn('Full decryption not implemented in demo');
        return encryptedData;
    }
}

// CSRF Protection Class
class CSRFProtection {
    constructor() {
        this.tokenKey = 'csrf_token';
        this.tokenLifetime = 3600000; // 1 hour
    }
    
    generateToken() {
        const timestamp = Date.now();
        const randomBytes = new Uint8Array(32);
        window.crypto.getRandomValues(randomBytes);
        const token = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
        
        const tokenData = {
            token: token,
            timestamp: timestamp
        };
        
        sessionStorage.setItem(this.tokenKey, JSON.stringify(tokenData));
        return token;
    }
    
    validateToken(token) {
        try {
            const stored = JSON.parse(sessionStorage.getItem(this.tokenKey));
            if (!stored) return false;
            
            const age = Date.now() - stored.timestamp;
            if (age > this.tokenLifetime) {
                sessionStorage.removeItem(this.tokenKey);
                return false;
            }
            
            return stored.token === token;
        } catch (error) {
            return false;
        }
    }
}

// Initialize Security Module
window.SecurityModule = new SecurityModule();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityModule;
}