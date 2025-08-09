// Authentication Module
// Basic client-side authentication for JSONBin.io database access

class AuthenticationModule {
    constructor() {
        this.sessionKey = 'jsonbin_auth_session';
        this.maxAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutes
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        
        // Simple credential store (in production, use proper backend authentication)
        this.credentials = {
            // Hash these passwords in production
            'admin': this.hashPassword('admin123'),
            'user': this.hashPassword('user123'),
            // Add more users as needed
        };
        
        this.initializeAuth();
    }
    
    initializeAuth() {
        // Check for existing session
        this.checkExistingSession();
        
        // Add authentication UI
        this.createAuthUI();
        
        // Add logout timer
        this.startSessionTimer();
    }
    
    checkExistingSession() {
        const session = this.getSession();
        if (session && this.isValidSession(session)) {
            this.currentUser = session.username;
            this.showMainApp();
        } else {
            this.clearSession();
            this.showAuthForm();
        }
    }
    
    createAuthUI() {
        // Create authentication modal
        const authHTML = `
            <div id="authModal" class="modal-overlay active" style="z-index: 2000;">
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">🔐 เข้าสู่ระบบ</h3>
                    </div>
                    <div class="modal-body">
                        <div id="authError" class="message error" style="display: none; margin-bottom: 16px;">
                            <div>❌</div>
                            <div id="authErrorText"></div>
                        </div>
                        
                        <form id="authForm" class="form-grid">
                            <div class="form-group">
                                <label for="username" class="form-label">ชื่อผู้ใช้</label>
                                <input type="text" id="username" class="form-input" required autocomplete="username">
                            </div>
                            <div class="form-group">
                                <label for="password" class="form-label">รหัสผ่าน</label>
                                <input type="password" id="password" class="form-input" required autocomplete="current-password">
                            </div>
                            
                            <div class="form-group">
                                <div style="font-size: 0.875rem; color: var(--text-secondary); background: var(--background); padding: 12px; border-radius: 6px;">
                                    <strong>ข้อมูลสำหรับทดสอบ:</strong><br>
                                    • admin / admin123 (สิทธิ์ผู้ดูแล)<br>
                                    • user / user123 (สิทธิ์ผู้ใช้ทั่วไป)
                                </div>
                            </div>
                            
                            <div class="form-actions" style="margin-top: 20px;">
                                <button type="submit" class="btn btn-primary" id="loginBtn" style="width: 100%;">
                                    เข้าสู่ระบบ
                                </button>
                            </div>
                        </form>
                        
                        <div id="lockoutMessage" style="display: none; text-align: center; margin-top: 16px; color: var(--error-color);">
                            <strong>บัญชีถูกล็อค</strong><br>
                            กรุณารอ <span id="lockoutTimer">15:00</span> ก่อนลองใหม่
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to page if not exists
        if (!document.getElementById('authModal')) {
            document.body.insertAdjacentHTML('beforeend', authHTML);
            this.bindAuthEvents();
        }
    }
    
    bindAuthEvents() {
        const form = document.getElementById('authForm');
        const loginBtn = document.getElementById('loginBtn');
        
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Add enter key support
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
        
        // Clear errors on input
        ['username', 'password'].forEach(field => {
            const input = document.getElementById(field);
            if (input) {
                input.addEventListener('input', () => {
                    this.clearAuthError();
                });
            }
        });
    }
    
    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        
        if (!username || !password) {
            this.showAuthError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }
        
        // Check for lockout
        if (this.isAccountLocked()) {
            this.showLockoutMessage();
            return;
        }
        
        // Show loading
        const originalText = loginBtn.textContent;
        loginBtn.innerHTML = '<span class="loading-spinner"></span> กำลังเข้าสู่ระบบ...';
        loginBtn.disabled = true;
        
        try {
            // Simulate network delay for better UX
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const isValid = await this.validateCredentials(username, password);
            
            if (isValid) {
                this.createSession(username);
                this.clearFailedAttempts();
                this.currentUser = username;
                this.showMainApp();
                this.hideAuthForm();
                
                if (window.showMessage) {
                    window.showMessage(`ยินดีต้อนรับ ${username}! 🎉`, 'success');
                }
            } else {
                this.recordFailedAttempt();
                this.showAuthError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                
                const attempts = this.getFailedAttempts();
                if (attempts >= this.maxAttempts) {
                    this.lockAccount();
                } else {
                    this.showAuthError(`ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลือ ${this.maxAttempts - attempts} ครั้ง)`);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        } finally {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    }
    
    async validateCredentials(username, password) {
        // Prevent timing attacks with constant-time comparison
        const hashedInput = this.hashPassword(password);
        const storedHash = this.credentials[username];
        
        if (!storedHash) {
            // Simulate hash computation even for non-existent users
            this.hashPassword('dummy_password');
            return false;
        }
        
        return this.constantTimeCompare(hashedInput, storedHash);
    }
    
    hashPassword(password) {
        // Simple hash function for demo - use proper bcrypt/scrypt in production
        let hash = 0;
        if (password.length === 0) return hash.toString();
        
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(36);
    }
    
    constantTimeCompare(a, b) {
        if (a.length !== b.length) return false;
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        
        return result === 0;
    }
    
    createSession(username) {
        const session = {
            username: username,
            timestamp: Date.now(),
            csrf_token: this.generateCSRFToken(),
            permissions: this.getUserPermissions(username)
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
    
    getUserPermissions(username) {
        const permissions = {
            'admin': ['read', 'write', 'delete', 'export'],
            'user': ['read', 'write']
        };
        
        return permissions[username] || ['read'];
    }
    
    getSession() {
        try {
            const session = localStorage.getItem(this.sessionKey);
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.error('Session parse error:', error);
            return null;
        }
    }
    
    isValidSession(session) {
        if (!session || !session.timestamp) return false;
        
        const age = Date.now() - session.timestamp;
        return age < this.sessionTimeout;
    }
    
    clearSession() {
        localStorage.removeItem(this.sessionKey);
        this.currentUser = null;
    }
    
    // Failed attempt tracking
    recordFailedAttempt() {
        const attempts = this.getFailedAttempts() + 1;
        localStorage.setItem('auth_failed_attempts', attempts.toString());
        localStorage.setItem('auth_last_attempt', Date.now().toString());
    }
    
    getFailedAttempts() {
        return parseInt(localStorage.getItem('auth_failed_attempts') || '0');
    }
    
    clearFailedAttempts() {
        localStorage.removeItem('auth_failed_attempts');
        localStorage.removeItem('auth_last_attempt');
        localStorage.removeItem('auth_locked_until');
    }
    
    lockAccount() {
        const lockUntil = Date.now() + this.lockoutTime;
        localStorage.setItem('auth_locked_until', lockUntil.toString());
        this.showLockoutMessage();
    }
    
    isAccountLocked() {
        const lockUntil = localStorage.getItem('auth_locked_until');
        if (!lockUntil) return false;
        
        return Date.now() < parseInt(lockUntil);
    }
    
    // UI Methods
    showAuthForm() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('username').focus();
        }
        
        // Hide main app
        const mainApp = document.querySelector('.app-container');
        if (mainApp) {
            mainApp.style.display = 'none';
        }
    }
    
    hideAuthForm() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    showMainApp() {
        const mainApp = document.querySelector('.app-container');
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        // Add logout button if not exists
        this.addLogoutButton();
        
        // Update UI based on permissions
        this.updateUIForPermissions();
    }
    
    addLogoutButton() {
        if (document.getElementById('logoutBtn')) return;
        
        const header = document.querySelector('.header');
        if (header) {
            const logoutBtn = document.createElement('div');
            logoutBtn.innerHTML = `
                <div style="position: absolute; top: 20px; right: 20px;">
                    <span style="color: rgba(255,255,255,0.8); margin-right: 12px; font-size: 0.875rem;">
                        สวัสดี ${this.currentUser}
                    </span>
                    <button id="logoutBtn" class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 6px 12px; font-size: 0.875rem;">
                        ออกจากระบบ
                    </button>
                </div>
            `;
            
            header.style.position = 'relative';
            header.appendChild(logoutBtn);
            
            document.getElementById('logoutBtn').addEventListener('click', () => {
                this.logout();
            });
        }
    }
    
    updateUIForPermissions() {
        const session = this.getSession();
        if (!session || !session.permissions) return;
        
        const permissions = session.permissions;
        
        // Hide delete buttons if user doesn't have delete permission
        if (!permissions.includes('delete')) {
            document.querySelectorAll('.btn-danger').forEach(btn => {
                btn.style.display = 'none';
            });
        }
        
        // Hide export button if user doesn't have export permission
        if (!permissions.includes('export')) {
            const exportBtn = document.querySelector('[onclick="exportData()"]');
            if (exportBtn) {
                exportBtn.style.display = 'none';
            }
        }
        
        // Make form read-only if user doesn't have write permission
        if (!permissions.includes('write')) {
            document.querySelectorAll('input, textarea, button[type="submit"]').forEach(element => {
                element.disabled = true;
            });
            
            if (window.showMessage) {
                window.showMessage('คุณมีสิทธิ์ในการดูข้อมูลเท่านั้น', 'warning');
            }
        }
    }
    
    showAuthError(message) {
        const errorDiv = document.getElementById('authError');
        const errorText = document.getElementById('authErrorText');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'flex';
        }
    }
    
    clearAuthError() {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    showLockoutMessage() {
        document.getElementById('authForm').style.display = 'none';
        document.getElementById('lockoutMessage').style.display = 'block';
        
        this.startLockoutTimer();
    }
    
    startLockoutTimer() {
        const timerElement = document.getElementById('lockoutTimer');
        if (!timerElement) return;
        
        const lockUntil = parseInt(localStorage.getItem('auth_locked_until') || '0');
        
        const updateTimer = () => {
            const remaining = lockUntil - Date.now();
            
            if (remaining <= 0) {
                // Lockout expired
                document.getElementById('authForm').style.display = 'block';
                document.getElementById('lockoutMessage').style.display = 'none';
                this.clearFailedAttempts();
                return;
            }
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            setTimeout(updateTimer, 1000);
        };
        
        updateTimer();
    }
    
    startSessionTimer() {
        // Auto-logout on session expiry
        setInterval(() => {
            const session = this.getSession();
            if (session && !this.isValidSession(session)) {
                this.logout(true);
            }
        }, 60000); // Check every minute
    }
    
    logout(autoLogout = false) {
        this.clearSession();
        this.hideMainApp();
        this.showAuthForm();
        this.removeLogoutButton();
        
        if (window.showMessage) {
            const message = autoLogout ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : 'ออกจากระบบเรียบร้อยแล้ว';
            window.showMessage(message, autoLogout ? 'warning' : 'success');
        }
    }
    
    hideMainApp() {
        const mainApp = document.querySelector('.app-container');
        if (mainApp) {
            mainApp.style.display = 'none';
        }
    }
    
    removeLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn && logoutBtn.parentElement) {
            logoutBtn.parentElement.remove();
        }
    }
    
    generateCSRFToken() {
        return Math.random().toString(36).substr(2) + Date.now().toString(36);
    }
    
    // Public API
    isAuthenticated() {
        return this.currentUser !== null && this.currentUser !== undefined;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    hasPermission(permission) {
        const session = this.getSession();
        return session && session.permissions && session.permissions.includes(permission);
    }
    
    getCSRFToken() {
        const session = this.getSession();
        return session ? session.csrf_token : null;
    }
}

// Initialize Authentication Module
window.AuthModule = new AuthenticationModule();