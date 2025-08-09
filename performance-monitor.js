/**
 * Performance Monitor for Multi-Collection CRUD System
 * Tracks API usage, cache efficiency, and system performance
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            apiCalls: {
                total: 0,
                successful: 0,
                failed: 0,
                cached: 0,
                startTime: Date.now()
            },
            cache: {
                hits: 0,
                misses: 0,
                size: 0,
                totalRequests: 0
            },
            collections: {
                loadTimes: new Map(),
                sizes: new Map(),
                lastUpdated: new Map()
            },
            performance: {
                loadTime: 0,
                renderTime: 0,
                searchTime: 0
            }
        };
        
        // Thresholds for warnings
        this.thresholds = {
            apiCallsPerHour: 150, // Warning at 150 calls/hour (leave buffer)
            cacheHitRatio: 0.6, // Warning if cache hit ratio < 60%
            loadTime: 2000, // Warning if load time > 2 seconds
            renderTime: 1000 // Warning if render time > 1 second
        };
        
        this.indicators = new Map();
        this.isMonitoring = false;
        
        this.initialize();
    }

    initialize() {
        this.createIndicatorContainer();
        this.startMonitoring();
        this.bindEvents();
        
        // Load persisted metrics
        this.loadPersistedMetrics();
        
        // Start periodic updates
        setInterval(() => this.updateIndicators(), 5000);
        setInterval(() => this.persistMetrics(), 30000);
    }

    createIndicatorContainer() {
        // Remove existing container if present
        const existing = document.getElementById('performanceIndicators');
        if (existing) existing.remove();
        
        const container = document.createElement('div');
        container.id = 'performanceIndicators';
        container.className = 'performance-indicators';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
        return container;
    }

    startMonitoring() {
        this.isMonitoring = true;
        
        // Hook into CollectionManager if available
        if (window.CollectionManager) {
            this.hookCollectionManager();
        } else {
            // Wait for CollectionManager to load
            const checkManager = () => {
                if (window.CollectionManager) {
                    this.hookCollectionManager();
                } else {
                    setTimeout(checkManager, 100);
                }
            };
            checkManager();
        }
        
        // Monitor page performance
        this.monitorPagePerformance();
    }

    hookCollectionManager() {
        const manager = window.CollectionManager;
        const originalMakeApiRequest = manager.makeApiRequest.bind(manager);
        
        // Override makeApiRequest to track metrics
        manager.makeApiRequest = async (url, options = {}) => {
            const startTime = Date.now();
            this.metrics.apiCalls.total++;
            
            // Check if this is a cache hit first
            const cacheKey = `${url}_${JSON.stringify(options)}`;
            const cached = manager.cache.get(cacheKey);
            const isCacheHit = cached && Date.now() - cached.timestamp < manager.cacheConfig.defaultTTL;
            
            if (isCacheHit) {
                this.metrics.apiCalls.cached++;
                this.metrics.cache.hits++;
            } else {
                this.metrics.cache.misses++;
            }
            
            this.metrics.cache.totalRequests++;
            
            try {
                const result = await originalMakeApiRequest(url, options);
                const duration = Date.now() - startTime;
                
                this.metrics.apiCalls.successful++;
                this.recordApiCall(url, options, duration, true, isCacheHit);
                
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                
                this.metrics.apiCalls.failed++;
                this.recordApiCall(url, options, duration, false, isCacheHit);
                
                throw error;
            }
        };
        
        // Hook collection loading
        const originalLoadCollection = manager.loadCollection.bind(manager);
        manager.loadCollection = async (collectionName) => {
            const startTime = Date.now();
            
            try {
                const result = await originalLoadCollection(collectionName);
                const duration = Date.now() - startTime;
                
                this.metrics.collections.loadTimes.set(collectionName, duration);
                this.metrics.collections.sizes.set(collectionName, result.length);
                this.metrics.collections.lastUpdated.set(collectionName, Date.now());
                
                if (duration > this.thresholds.loadTime) {
                    this.showWarning(`Slow load time for ${collectionName}: ${duration}ms`);
                }
                
                return result;
            } catch (error) {
                this.metrics.collections.loadTimes.set(collectionName, -1); // Error indicator
                throw error;
            }
        };
    }

    recordApiCall(url, options, duration, success, cached) {
        // Log detailed metrics for analysis
        if (window.console && window.console.groupCollapsed) {
            console.groupCollapsed(`API Call: ${success ? '✅' : '❌'} ${cached ? '🔄' : '🌐'} ${duration}ms`);
            console.log('URL:', url);
            console.log('Options:', options);
            console.log('Duration:', duration + 'ms');
            console.log('Success:', success);
            console.log('From Cache:', cached);
            console.groupEnd();
        }
    }

    monitorPagePerformance() {
        // Monitor initial page load
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            this.metrics.performance.loadTime = timing.loadEventEnd - timing.navigationStart;
        }
        
        // Monitor DOM mutations (for render time estimation)
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                // Simple heuristic for render time
                if (mutations.length > 10) {
                    const startTime = Date.now();
                    requestAnimationFrame(() => {
                        this.metrics.performance.renderTime = Date.now() - startTime;
                    });
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false
            });
        }
    }

    bindEvents() {
        // Monitor search performance
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('search-input')) {
                const startTime = Date.now();
                
                // Use setTimeout to measure after search is performed
                setTimeout(() => {
                    this.metrics.performance.searchTime = Date.now() - startTime;
                }, 0);
            }
        });
        
        // Monitor collection switches
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('collection-card')) {
                this.recordUserAction('collection_switch');
            }
        });
    }

    recordUserAction(action) {
        if (!this.metrics.userActions) {
            this.metrics.userActions = {};
        }
        
        this.metrics.userActions[action] = (this.metrics.userActions[action] || 0) + 1;
    }

    updateIndicators() {
        if (!this.isMonitoring) return;
        
        const container = document.getElementById('performanceIndicators');
        if (!container) return;
        
        // Clear existing indicators
        container.innerHTML = '';
        
        // API Usage Indicator
        this.updateApiUsageIndicator(container);
        
        // Cache Efficiency Indicator
        this.updateCacheIndicator(container);
        
        // Performance Indicators
        this.updatePerformanceIndicators(container);
        
        // Collection Status
        this.updateCollectionStatus(container);
    }

    updateApiUsageIndicator(container) {
        const hoursSinceStart = (Date.now() - this.metrics.apiCalls.startTime) / (1000 * 60 * 60);
        const callsPerHour = Math.round(this.metrics.apiCalls.total / Math.max(hoursSinceStart, 0.1));
        
        const isWarning = callsPerHour > this.thresholds.apiCallsPerHour;
        
        const indicator = this.createIndicator(
            'API Usage',
            `${this.metrics.apiCalls.total} calls (${callsPerHour}/hr)`,
            isWarning ? 'warning' : 'info'
        );
        
        if (isWarning) {
            indicator.title = `High API usage: ${callsPerHour} calls/hour. Consider optimizing.`;
        }
        
        container.appendChild(indicator);
    }

    updateCacheIndicator(container) {
        const totalRequests = this.metrics.cache.totalRequests;
        const hitRatio = totalRequests > 0 ? this.metrics.cache.hits / totalRequests : 0;
        
        const isWarning = hitRatio < this.thresholds.cacheHitRatio;
        
        const indicator = this.createIndicator(
            'Cache',
            `${Math.round(hitRatio * 100)}% hit ratio`,
            isWarning ? 'warning' : 'success'
        );
        
        if (isWarning) {
            indicator.title = `Low cache hit ratio: ${Math.round(hitRatio * 100)}%. Data might be changing frequently.`;
        }
        
        container.appendChild(indicator);
    }

    updatePerformanceIndicators(container) {
        const loadTime = this.metrics.performance.loadTime;
        if (loadTime > 0) {
            const isSlowLoad = loadTime > this.thresholds.loadTime;
            
            const indicator = this.createIndicator(
                'Load Time',
                `${loadTime}ms`,
                isSlowLoad ? 'warning' : 'success'
            );
            
            container.appendChild(indicator);
        }
    }

    updateCollectionStatus(container) {
        const collectionCount = this.metrics.collections.sizes.size;
        if (collectionCount > 0) {
            const totalItems = Array.from(this.metrics.collections.sizes.values()).reduce((a, b) => a + b, 0);
            
            const indicator = this.createIndicator(
                'Collections',
                `${collectionCount} collections, ${totalItems} items`,
                'info'
            );
            
            container.appendChild(indicator);
        }
    }

    createIndicator(label, value, type = 'info') {
        const indicator = document.createElement('div');
        indicator.className = `performance-indicator ${type}`;
        indicator.style.cssText = `
            background: ${this.getIndicatorColor(type)};
            color: ${type === 'warning' ? '#fff' : '#666'};
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            pointer-events: auto;
            cursor: help;
            border: 1px solid ${this.getIndicatorBorderColor(type)};
        `;
        
        indicator.innerHTML = `<strong>${label}:</strong> ${value}`;
        
        // Add click handler for detailed view
        indicator.addEventListener('click', () => this.showDetailedMetrics());
        
        return indicator;
    }

    getIndicatorColor(type) {
        switch (type) {
            case 'warning': return '#f59e0b';
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            default: return '#ffffff';
        }
    }

    getIndicatorBorderColor(type) {
        switch (type) {
            case 'warning': return '#d97706';
            case 'success': return '#059669';
            case 'error': return '#dc2626';
            default: return '#e5e7eb';
        }
    }

    showWarning(message) {
        if (window.console) {
            console.warn('Performance Warning:', message);
        }
        
        // Show temporary warning indicator
        const container = document.getElementById('performanceIndicators');
        if (container) {
            const warning = this.createIndicator('Warning', message, 'warning');
            warning.style.animation = 'pulse 2s infinite';
            container.appendChild(warning);
            
            // Remove after 10 seconds
            setTimeout(() => {
                if (warning.parentElement) {
                    warning.remove();
                }
            }, 10000);
        }
    }

    showDetailedMetrics() {
        const stats = this.getDetailedStats();
        
        // Create modal or console output
        if (window.console && window.console.table) {
            console.group('📊 Performance Metrics');
            console.table(stats.apiCalls);
            console.table(stats.cache);
            console.table(stats.collections);
            console.groupEnd();
        }
        
        // Could also show a modal with detailed charts
        this.showMetricsModal(stats);
    }

    showMetricsModal(stats) {
        // Create a simple modal with metrics
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        `;
        
        content.innerHTML = `
            <h3>Performance Metrics</h3>
            <div style="margin-bottom: 16px;">
                <h4>API Calls</h4>
                <p>Total: ${stats.apiCalls.total}</p>
                <p>Successful: ${stats.apiCalls.successful}</p>
                <p>Failed: ${stats.apiCalls.failed}</p>
                <p>Cached: ${stats.apiCalls.cached}</p>
            </div>
            <div style="margin-bottom: 16px;">
                <h4>Cache Performance</h4>
                <p>Hit Ratio: ${Math.round((stats.cache.hits / Math.max(stats.cache.totalRequests, 1)) * 100)}%</p>
                <p>Total Requests: ${stats.cache.totalRequests}</p>
            </div>
            <div style="margin-bottom: 16px;">
                <h4>Collections</h4>
                ${Array.from(this.metrics.collections.sizes.entries()).map(([name, size]) => 
                    `<p>${name}: ${size} items</p>`
                ).join('')}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Close
            </button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    getDetailedStats() {
        return {
            apiCalls: {
                'Total Calls': this.metrics.apiCalls.total,
                'Successful': this.metrics.apiCalls.successful,
                'Failed': this.metrics.apiCalls.failed,
                'From Cache': this.metrics.apiCalls.cached,
                'Success Rate': `${Math.round((this.metrics.apiCalls.successful / Math.max(this.metrics.apiCalls.total, 1)) * 100)}%`
            },
            cache: {
                'Hit Ratio': `${Math.round((this.metrics.cache.hits / Math.max(this.metrics.cache.totalRequests, 1)) * 100)}%`,
                'Total Requests': this.metrics.cache.totalRequests,
                'Cache Hits': this.metrics.cache.hits,
                'Cache Misses': this.metrics.cache.misses
            },
            collections: Object.fromEntries(this.metrics.collections.sizes.entries())
        };
    }

    persistMetrics() {
        try {
            const persistData = {
                apiCalls: this.metrics.apiCalls,
                cache: this.metrics.cache,
                timestamp: Date.now()
            };
            
            localStorage.setItem('performance_metrics', JSON.stringify(persistData));
        } catch (error) {
            console.warn('Failed to persist performance metrics:', error);
        }
    }

    loadPersistedMetrics() {
        try {
            const stored = localStorage.getItem('performance_metrics');
            if (stored) {
                const data = JSON.parse(stored);
                
                // Only load if data is from today
                const daysSinceData = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
                if (daysSinceData < 1) {
                    this.metrics.apiCalls = { ...this.metrics.apiCalls, ...data.apiCalls };
                    this.metrics.cache = { ...this.metrics.cache, ...data.cache };
                }
            }
        } catch (error) {
            console.warn('Failed to load persisted metrics:', error);
        }
    }

    // Public API for external monitoring
    trackCustomMetric(name, value) {
        if (!this.metrics.custom) {
            this.metrics.custom = {};
        }
        
        this.metrics.custom[name] = value;
    }

    getMetrics() {
        return { ...this.metrics };
    }

    reset() {
        this.metrics = {
            apiCalls: { total: 0, successful: 0, failed: 0, cached: 0, startTime: Date.now() },
            cache: { hits: 0, misses: 0, size: 0, totalRequests: 0 },
            collections: { loadTimes: new Map(), sizes: new Map(), lastUpdated: new Map() },
            performance: { loadTime: 0, renderTime: 0, searchTime: 0 }
        };
        
        localStorage.removeItem('performance_metrics');
    }

    stop() {
        this.isMonitoring = false;
        
        const container = document.getElementById('performanceIndicators');
        if (container) {
            container.remove();
        }
    }
}

// Auto-initialize when dependencies are available
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize performance monitor
    window.PerformanceMonitor = new PerformanceMonitor();
});