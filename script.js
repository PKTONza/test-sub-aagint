// JSONBin.io Configuration - Now handled by SecureConfig
// const API_KEY = '$2a$10$YOUR_API_KEY_HERE'; // REMOVED - Security risk!
// const BIN_ID = 'YOUR_BIN_ID_HERE'; // REMOVED - Security risk!
// const BASE_URL = 'https://api.jsonbin.io/v3'; // REMOVED - Security risk!

// Secure configuration access
function getSecureConfig() {
    return window.SecureConfig || {
        get: () => null,
        getSecureHeaders: () => ({ 'Content-Type': 'application/json' }),
        checkRateLimit: () => true
    };
}

// Global variables
let currentData = [];
let filteredData = [];
let isLoading = false;
let currentEditId = null;
let currentDeleteId = null;

// DOM Elements
const form = document.getElementById('dataForm');
const dataListDiv = document.getElementById('dataList');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const messageContainer = document.getElementById('messageContainer');
const submitBtn = document.getElementById('submitBtn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Wait for security modules to initialize
        await waitForSecurityModules();
        
        // Check authentication first
        if (!window.AuthModule || !window.AuthModule.isAuthenticated()) {
            console.log('Authentication required');
            return; // Auth module will handle UI
        }
        
        // Initialize event listeners only after authentication
        initializeEventListeners();
        
        // Load initial data
        await loadData();
        
        // Show security status
        showSecurityStatus();
        
    } catch (error) {
        console.error('App initialization failed:', error);
        showMessage('เกิดข้อผิดพลาดในการเริ่มต้นระบบ', 'error');
    }
}

async function waitForSecurityModules() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    while (attempts < maxAttempts) {
        if (window.SecurityModule && window.SecureConfig && window.DataEncryption) {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (attempts >= maxAttempts) {
        throw new Error('Security modules failed to load');
    }
}

function initializeEventListeners() {
    // Event listeners
    form.addEventListener('submit', handleSubmit);
    searchInput.addEventListener('input', handleSearch);
    sortSelect.addEventListener('change', handleSort);
    
    // Modal event listeners
    document.getElementById('saveEditBtn').addEventListener('click', handleSaveEdit);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });
}

function showSecurityStatus() {
    const encStatus = window.DataEncryption.getEncryptionStatus();
    console.log('🔐 Security Status:', {
        encryption: encStatus,
        authentication: window.AuthModule ? window.AuthModule.isAuthenticated() : false,
        user: window.AuthModule ? window.AuthModule.getCurrentUser() : null
    });
}

// Enhanced message system with toast notifications
function showMessage(text, type = 'success', duration = 5000) {
    const messageId = 'msg-' + Date.now();
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.id = messageId;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    messageElement.innerHTML = `
        <div style="font-size: 1.2em;">${icon}</div>
        <div>${text}</div>
        <button onclick="closeMessage('${messageId}')" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto; font-size: 1.2em;">&times;</button>
    `;
    
    messageContainer.appendChild(messageElement);
    
    // Auto-remove after duration
    setTimeout(() => {
        closeMessage(messageId);
    }, duration);
}

function closeMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }
}

// Add CSS for slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Enhanced form submission with loading states and security
async function handleSubmit(e) {
    e.preventDefault();
    
    if (isLoading) return;
    
    // Check authentication and permissions
    if (!window.AuthModule || !window.AuthModule.isAuthenticated()) {
        showMessage('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    
    if (!window.AuthModule.hasPermission('write')) {
        showMessage('คุณไม่มีสิทธิ์ในการเพิ่มข้อมูล', 'error');
        return;
    }
    
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    
    if (!title || !content) {
        showMessage('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }
    
    // Validate input using security module
    try {
        window.SecurityModule.validateInput(document.getElementById('title'));
        window.SecurityModule.validateInput(document.getElementById('content'));
    } catch (error) {
        showMessage('ข้อมูลไม่ผ่านการตรวจสอบความปลอดภัย: ' + error.message, 'error');
        return;
    }
    
    // Show loading state
    setLoading(true);
    const originalBtnText = submitBtn.querySelector('.btn-text').textContent;
    submitBtn.querySelector('.btn-text').innerHTML = '<span class="loading-spinner"></span> กำลังบันทึก...';
    submitBtn.disabled = true;
    
    const newItem = {
        id: Date.now().toString(),
        title: window.SecurityModule.sanitizeForStorage(title),
        content: window.SecurityModule.sanitizeForStorage(content),
        timestamp: new Date().toLocaleString('th-TH'),
        created: new Date().toISOString(),
        author: window.AuthModule.getCurrentUser(),
        csrf_token: window.AuthModule.getCSRFToken()
    };
    
    try {
        await addData(newItem);
        form.reset();
        showMessage('บันทึกข้อมูลสำเร็จ! 🎉', 'success');
    } catch (error) {
        console.error('Error in form submission:', error);
        showMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message, 'error');
    } finally {
        // Reset loading state
        setLoading(false);
        submitBtn.querySelector('.btn-text').textContent = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Loading state management
function setLoading(loading) {
    isLoading = loading;
    if (loading) {
        document.body.style.cursor = 'wait';
    } else {
        document.body.style.cursor = 'default';
    }
}

// Enhanced add data with optimistic updates and encryption
async function addData(newItem) {
    try {
        // Get secure configuration
        const config = getSecureConfig();
        
        // Check rate limiting
        config.checkRateLimit();
        
        // Encrypt sensitive data
        const encryptedItem = await window.DataEncryption.encryptSensitiveFields(newItem);
        
        // Optimistic update with encrypted data
        currentData.unshift(encryptedItem);
        renderData();
        
        // Prepare encrypted data for storage
        const encryptedData = await window.DataEncryption.encryptArray(currentData);
        
        const response = await fetch(`${config.get('apiEndpoint')}/b/${config.get('binId')}`, {
            method: 'PUT',
            headers: {
                ...config.getSecureHeaders(),
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-Token': window.AuthModule ? window.AuthModule.getCSRFToken() : ''
            },
            body: JSON.stringify(encryptedData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('Error adding data:', error);
        
        // Rollback optimistic update
        currentData.shift();
        renderData();
        
        // Enhanced error handling
        let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
        
        if (error.message.includes('rate limit')) {
            errorMessage = 'คำขอเกินขีดจำกัด กรุณารอสักครู่';
        } else if (error.message.includes('401')) {
            errorMessage = 'ไม่มีสิทธิ์เข้าถึงข้อมูล';
        } else if (error.message.includes('403')) {
            errorMessage = 'การเข้าถึงถูกปฏิเสธ';
        } else if (error.message.includes('404')) {
            errorMessage = 'ไม่พบข้อมูลที่ต้องการ';
        }
        
        throw new Error(errorMessage);
    }
}

// Enhanced load data with better error handling and decryption
async function loadData() {
    try {
        showLoadingState();
        
        // Get secure configuration
        const config = getSecureConfig();
        
        const response = await fetch(`${config.get('apiEndpoint')}/b/${config.get('binId')}/latest`, {
            headers: {
                ...config.getSecureHeaders(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        const encryptedData = data.record || [];
        
        // Decrypt data before using
        currentData = await window.DataEncryption.decryptArray(encryptedData);
        filteredData = [...currentData];
        
        renderData();
        
    } catch (error) {
        console.error('Error loading data:', error);
        
        // Check if configuration is not set
        const config = getSecureConfig();
        if (!config.get('apiKey') || config.get('apiKey').includes('YOUR_') || 
            !config.get('binId') || config.get('binId').includes('YOUR_')) {
            showSetupMessage();
        } else {
            let errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
            
            if (error.message.includes('401')) {
                errorMessage = 'ไม่มีสิทธิ์เข้าถึงข้อมูล กรุณาตรวจสอบ API Key';
            } else if (error.message.includes('404')) {
                errorMessage = 'ไม่พบข้อมูล กรุณาตรวจสอบ Bin ID';
            } else if (error.message.includes('rate limit')) {
                errorMessage = 'คำขอเกินขีดจำกัด กรุณารอสักครู่';
            }
            
            showErrorState(errorMessage);
        }
    }
}

// Enhanced rendering with modern card layout
function renderData() {
    const dataToRender = filteredData.length > 0 || searchInput.value.trim() ? filteredData : currentData;
    
    if (dataToRender.length === 0) {
        if (searchInput.value.trim()) {
            showEmptySearchState();
        } else {
            showEmptyState();
        }
        return;
    }
    
    const html = dataToRender.map(item => `
        <div class="data-card" data-id="${item.id}">
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
            </div>
            <div class="card-content">
                ${window.SecurityModule ? window.SecurityModule.sanitizeForDisplay(item.content).replace(/\n/g, '<br>') : escapeHtml(item.content).replace(/\n/g, '<br>')}
            </div>
            <div class="card-meta">
                <span>📅 ${item.timestamp}</span>
                <span>🆔 ${item.id}</span>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary" onclick="openEditModal('${item.id}')">
                    ✏️ แก้ไข
                </button>
                <button class="btn btn-danger" onclick="openDeleteModal('${item.id}')">
                    🗑️ ลบ
                </button>
            </div>
        </div>
    `).join('');
    
    dataListDiv.innerHTML = html;
}

// Modal-based edit functionality
function openEditModal(id) {
    const item = currentData.find(item => item.id === id);
    if (!item) return;
    
    currentEditId = id;
    document.getElementById('editTitle').value = item.title;
    document.getElementById('editContent').value = item.content;
    
    showModal('editModal');
}

async function handleSaveEdit() {
    if (!currentEditId) return;
    
    const newTitle = document.getElementById('editTitle').value.trim();
    const newContent = document.getElementById('editContent').value.trim();
    
    if (!newTitle || !newContent) {
        showMessage('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('saveEditBtn');
    const originalText = saveBtn.textContent;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> กำลังบันทึก...';
    saveBtn.disabled = true;
    
    try {
        const itemIndex = currentData.findIndex(item => item.id === currentEditId);
        const originalItem = {...currentData[itemIndex]};
        
        // Optimistic update
        currentData[itemIndex] = {
            ...originalItem,
            title: newTitle,
            content: newContent,
            timestamp: new Date().toLocaleString('th-TH') + ' (แก้ไข)',
            lastModified: new Date().toISOString()
        };
        
        renderData();
        closeModal('editModal');
        
        const response = await fetch(`${BASE_URL}/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(currentData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showMessage('แก้ไขข้อมูลสำเร็จ! ✨', 'success');
        
    } catch (error) {
        console.error('Error updating data:', error);
        showMessage('เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        currentEditId = null;
    }
}

// Modal-based delete functionality
function openDeleteModal(id) {
    const item = currentData.find(item => item.id === id);
    if (!item) return;
    
    currentDeleteId = id;
    document.getElementById('deletePreview').innerHTML = `
        <div style="background: var(--background); padding: 16px; border-radius: 8px; margin-top: 16px;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">${escapeHtml(item.title)}</h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">${escapeHtml(item.content.substring(0, 100))}${item.content.length > 100 ? '...' : ''}</p>
        </div>
    `;
    
    showModal('deleteModal');
}

async function handleConfirmDelete() {
    if (!currentDeleteId) return;
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const originalText = confirmBtn.textContent;
    confirmBtn.innerHTML = '<span class="loading-spinner"></span> กำลังลบ...';
    confirmBtn.disabled = true;
    
    try {
        const originalData = [...currentData];
        
        // Optimistic update
        currentData = currentData.filter(item => item.id !== currentDeleteId);
        filteredData = filteredData.filter(item => item.id !== currentDeleteId);
        
        renderData();
        closeModal('deleteModal');
        
        const response = await fetch(`${BASE_URL}/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify(currentData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showMessage('ลบข้อมูลสำเร็จ! 🗑️', 'success');
        
    } catch (error) {
        console.error('Error deleting data:', error);
        
        // Rollback on error
        currentData = originalData;
        filteredData = [...currentData];
        renderData();
        
        showMessage('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    } finally {
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
        currentDeleteId = null;
    }
}

// Search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredData = [...currentData];
    } else {
        filteredData = currentData.filter(item => 
            item.title.toLowerCase().includes(searchTerm) ||
            item.content.toLowerCase().includes(searchTerm)
        );
    }
    
    renderData();
}

// Sort functionality
function handleSort() {
    const sortValue = sortSelect.value;
    
    let dataToSort = [...filteredData];
    
    switch (sortValue) {
        case 'newest':
            dataToSort.sort((a, b) => new Date(b.created || b.id) - new Date(a.created || a.id));
            break;
        case 'oldest':
            dataToSort.sort((a, b) => new Date(a.created || a.id) - new Date(b.created || b.id));
            break;
        case 'title':
            dataToSort.sort((a, b) => a.title.localeCompare(b.title, 'th'));
            break;
        default:
            break;
    }
    
    filteredData = dataToSort;
    renderData();
}

// Modal management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus management
        const firstInput = modal.querySelector('input, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Clear form data
        if (modalId === 'editModal') {
            document.getElementById('editTitle').value = '';
            document.getElementById('editContent').value = '';
            currentEditId = null;
        }
        if (modalId === 'deleteModal') {
            document.getElementById('deletePreview').innerHTML = '';
            currentDeleteId = null;
        }
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // ESC to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            closeModal(modal.id);
        });
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Enter in modals to confirm action
    if (e.key === 'Enter' && e.target.closest('.modal')) {
        const modal = e.target.closest('.modal-overlay');
        if (modal.id === 'editModal') {
            handleSaveEdit();
        } else if (modal.id === 'deleteModal') {
            handleConfirmDelete();
        }
    }
}

// State display functions
function showLoadingState() {
    dataListDiv.innerHTML = `
        <div class="loading-container">
            <div class="loading-content">
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        </div>
    `;
}

function showEmptyState() {
    dataListDiv.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <h3>ยังไม่มีข้อมูล</h3>
            <p>เริ่มต้นเพิ่มข้อมูลใหม่ด้วยการกรอกฟอร์มด้านบน</p>
        </div>
    `;
}

function showEmptySearchState() {
    dataListDiv.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3>ไม่พบข้อมูลที่ค้นหา</h3>
            <p>ลองค้นหาด้วยคำอื่น หรือล้างการค้นหา</p>
            <button class="btn btn-secondary" onclick="clearSearch()">ล้างการค้นหา</button>
        </div>
    `;
}

function showErrorState(message) {
    dataListDiv.innerHTML = `
        <div class="empty-state" style="color: var(--error-color);">
            <div class="empty-state-icon">⚠️</div>
            <h3>เกิดข้อผิดพลาด</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="loadData()">ลองใหม่อีกครั้ง</button>
        </div>
    `;
}

function showSetupMessage() {
    dataListDiv.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚙️</div>
            <h3>ยังไม่ได้ตั้งค่า JSONBin.io</h3>
            <p>กรุณาทำตามขั้นตอนดังนี้:</p>
            <ol style="text-align: left; display: inline-block; margin-top: 16px;">
                <li>สมัครสมาชิกที่ <a href="https://jsonbin.io" target="_blank" rel="noopener">JSONBin.io</a></li>
                <li>สร้าง API Key ใหม่</li>
                <li>สร้าง Bin ใหม่</li>
                <li>แทนที่ API_KEY และ BIN_ID ในไฟล์ script.js</li>
            </ol>
        </div>
    `;
}

// Utility functions
function clearSearch() {
    searchInput.value = '';
    handleSearch();
    searchInput.focus();
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Export functionality (bonus feature)
function exportData() {
    const dataStr = JSON.stringify(currentData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `jsonbin-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Performance optimization: Update handleSearch to use debouncing
let searchTimeout;
const originalHandleSearch = handleSearch;
handleSearch = function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(originalHandleSearch, 300);
};