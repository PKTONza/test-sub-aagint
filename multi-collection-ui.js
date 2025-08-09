/**
 * Multi-Collection CRUD User Interface
 * Provides a unified interface for managing multiple JSON collections
 */

class MultiCollectionUI {
    constructor() {
        this.manager = window.CollectionManager;
        this.currentCollection = null;
        this.currentData = [];
        this.filteredData = [];
        this.currentEditItem = null;
        
        // UI Elements
        this.elements = {
            collectionSelect: null,
            searchInput: null,
            sortSelect: null,
            dataContainer: null,
            itemModal: null,
            deleteModal: null,
            importModal: null,
            exportModal: null
        };
        
        // Collection display configurations
        this.collectionConfigs = {
            animals: {
                displayName: 'สัตว์ในเกม',
                icon: '🦊',
                primaryField: 'name',
                secondaryFields: ['type', 'rarity', 'health', 'damage'],
                cardColor: '#10b981'
            },
            weapons: {
                displayName: 'อาวุธ',
                icon: '🗡️',
                primaryField: 'name',
                secondaryFields: ['type', 'damage_type', 'keyword_type'],
                cardColor: '#ef4444'
            },
            armor: {
                displayName: 'เกราะ',
                icon: '🛡️',
                primaryField: 'name',
                secondaryFields: ['type', 'defense', 'durability'],
                cardColor: '#6366f1'
            },
            food: {
                displayName: 'อาหาร',
                icon: '🍖',
                primaryField: 'name',
                secondaryFields: ['type', 'rarity', 'hunger_restore', 'health_restore'],
                cardColor: '#f59e0b'
            },
            mods: {
                displayName: 'การปรับแต่ง',
                icon: '⚙️',
                primaryField: 'name',
                secondaryFields: ['category', 'description'],
                cardColor: '#8b5cf6'
            },
            seasonal_challenges: {
                displayName: 'ภารกิจตามฤดูกาล',
                icon: '🏆',
                primaryField: 'name',
                secondaryFields: ['season', 'difficulty', 'description'],
                cardColor: '#06b6d4'
            }
        };
        
        this.initialize();
    }

    async initialize() {
        this.createUI();
        this.bindEvents();
        await this.loadCollections();
    }

    createUI() {
        const app = document.querySelector('.app-container');
        if (!app) return;

        // Clear existing content and create new structure
        app.innerHTML = this.getUITemplate();
        
        // Cache DOM elements
        this.cacheElements();
    }

    getUITemplate() {
        return `
            <div class="main-content">
                <!-- Header Section -->
                <div class="header">
                    <h1>🗂️ Multi-Collection Data Manager</h1>
                    <p>จัดการข้อมูล JSON หลายประเภทบน JSONBin.io</p>
                </div>

                <!-- Collection Selector -->
                <div class="content-section">
                    <h2 class="section-title">เลือกประเภทข้อมูล</h2>
                    <div class="collection-grid" id="collectionGrid">
                        <!-- Collection cards will be generated here -->
                    </div>
                </div>

                <!-- Main Interface (hidden initially) -->
                <div class="content-section" id="mainInterface" style="display: none;">
                    <!-- Collection Header -->
                    <div class="collection-header">
                        <div class="collection-info">
                            <h2 class="collection-title" id="collectionTitle">
                                <span class="collection-icon" id="collectionIcon">📋</span>
                                <span id="collectionName">Collection</span>
                            </h2>
                            <p class="collection-stats" id="collectionStats">0 items</p>
                        </div>
                        <button class="btn btn-secondary" onclick="this.showCollectionSelector()" id="backBtn">
                            ← กลับ
                        </button>
                    </div>

                    <!-- Controls Bar -->
                    <div class="controls-bar">
                        <div class="search-container">
                            <div class="search-icon">🔍</div>
                            <input type="text" id="searchInput" class="search-input" placeholder="ค้นหา...">
                        </div>
                        
                        <div class="controls-actions">
                            <select id="sortSelect" class="btn btn-secondary">
                                <option value="">เรียงตาม...</option>
                                <option value="name:asc">ชื่อ A-Z</option>
                                <option value="name:desc">ชื่อ Z-A</option>
                                <option value="id:asc">ID น้อย-มาก</option>
                                <option value="id:desc">ID มาก-น้อย</option>
                            </select>
                            
                            <div class="btn-group">
                                <button class="btn btn-primary" onclick="multiUI.showAddModal()">
                                    ➕ เพิ่ม
                                </button>
                                <button class="btn btn-secondary" onclick="multiUI.showImportModal()">
                                    📥 นำเข้า
                                </button>
                                <button class="btn btn-secondary" onclick="multiUI.showExportModal()">
                                    📤 ส่งออก
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Data Display -->
                    <div id="dataContainer" class="data-grid">
                        <!-- Data cards will be generated here -->
                    </div>

                    <!-- Loading State -->
                    <div id="loadingState" class="loading-container" style="display: none;">
                        <div class="loading-content">
                            <div class="loading-dots">
                                <div class="loading-dot"></div>
                                <div class="loading-dot"></div>
                                <div class="loading-dot"></div>
                            </div>
                            <p>กำลังโหลดข้อมูล...</p>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div id="emptyState" class="empty-state" style="display: none;">
                        <div class="empty-state-icon">📭</div>
                        <h3>ไม่มีข้อมูล</h3>
                        <p>เริ่มต้นโดยการเพิ่มข้อมูลแรกของคุณ</p>
                        <button class="btn btn-primary" onclick="multiUI.showAddModal()">
                            ➕ เพิ่มข้อมูลแรก
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modals -->
            ${this.getModalTemplates()}
            
            <!-- Toast Container -->
            <div id="messageContainer" class="message-container"></div>
        `;
    }

    getModalTemplates() {
        return `
            <!-- Add/Edit Item Modal -->
            <div id="itemModal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title" id="itemModalTitle">เพิ่มข้อมูล</h3>
                        <button class="modal-close" onclick="multiUI.closeModal('itemModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="itemForm">
                            <div id="formFields">
                                <!-- Dynamic form fields will be generated here -->
                            </div>
                        </form>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="multiUI.closeModal('itemModal')">ยกเลิก</button>
                        <button class="btn btn-primary" id="saveItemBtn">บันทึก</button>
                    </div>
                </div>
            </div>

            <!-- Delete Confirmation Modal -->
            <div id="deleteModal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">ยืนยันการลบ</h3>
                        <button class="modal-close" onclick="multiUI.closeModal('deleteModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>คุณต้องการลบข้อมูลนี้หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
                        <div class="data-preview" id="deletePreview"></div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="multiUI.closeModal('deleteModal')">ยกเลิก</button>
                        <button class="btn btn-danger" id="confirmDeleteBtn">ลบข้อมูล</button>
                    </div>
                </div>
            </div>

            <!-- Import Modal -->
            <div id="importModal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">นำเข้าข้อมูล</h3>
                        <button class="modal-close" onclick="multiUI.closeModal('importModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">เลือกไฟล์ JSON</label>
                            <input type="file" id="importFile" class="form-input" accept=".json">
                        </div>
                        <div class="form-group">
                            <label class="form-label">หรือวาง JSON</label>
                            <textarea id="importText" class="form-textarea" rows="10" placeholder='{"collection": [...]}'>
                            </textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-checkbox">
                                <input type="checkbox" id="mergeImport"> รวมกับข้อมูลเดิม
                            </label>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="multiUI.closeModal('importModal')">ยกเลิก</button>
                        <button class="btn btn-primary" id="importBtn">นำเข้า</button>
                    </div>
                </div>
            </div>

            <!-- Export Modal -->
            <div id="exportModal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">ส่งออกข้อมูล</h3>
                        <button class="modal-close" onclick="multiUI.closeModal('exportModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">รูปแบบ</label>
                            <select id="exportFormat" class="form-input">
                                <option value="json">JSON</option>
                                <option value="csv">CSV</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">ตัวอย่างข้อมูล</label>
                            <textarea id="exportPreview" class="form-textarea" rows="10" readonly>
                            </textarea>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="multiUI.closeModal('exportModal')">ยกเลิก</button>
                        <button class="btn btn-primary" id="downloadBtn">ดาวน์โหลด</button>
                    </div>
                </div>
            </div>
        `;
    }

    cacheElements() {
        this.elements = {
            collectionGrid: document.getElementById('collectionGrid'),
            mainInterface: document.getElementById('mainInterface'),
            collectionTitle: document.getElementById('collectionTitle'),
            collectionIcon: document.getElementById('collectionIcon'),
            collectionName: document.getElementById('collectionName'),
            collectionStats: document.getElementById('collectionStats'),
            searchInput: document.getElementById('searchInput'),
            sortSelect: document.getElementById('sortSelect'),
            dataContainer: document.getElementById('dataContainer'),
            loadingState: document.getElementById('loadingState'),
            emptyState: document.getElementById('emptyState'),
            backBtn: document.getElementById('backBtn')
        };
    }

    async loadCollections() {
        this.renderCollectionGrid();
    }

    renderCollectionGrid() {
        if (!this.elements.collectionGrid) return;

        const html = Object.entries(this.collectionConfigs).map(([key, config]) => `
            <div class="collection-card" onclick="multiUI.selectCollection('${key}')" 
                 style="border-left-color: ${config.cardColor}">
                <div class="collection-card-icon">${config.icon}</div>
                <div class="collection-card-content">
                    <h3 class="collection-card-title">${config.displayName}</h3>
                    <p class="collection-card-desc" id="stats-${key}">กำลังโหลด...</p>
                </div>
                <div class="collection-card-arrow">→</div>
            </div>
        `).join('');

        this.elements.collectionGrid.innerHTML = html;

        // Load stats for each collection
        this.loadCollectionStats();
    }

    async loadCollectionStats() {
        for (const collectionName of Object.keys(this.collectionConfigs)) {
            try {
                const data = await this.manager.loadCollection(collectionName);
                const statsEl = document.getElementById(`stats-${collectionName}`);
                if (statsEl) {
                    statsEl.textContent = `${data.length} รายการ`;
                }
            } catch (error) {
                const statsEl = document.getElementById(`stats-${collectionName}`);
                if (statsEl) {
                    statsEl.textContent = 'ไม่สามารถโหลดได้';
                }
            }
        }
    }

    async selectCollection(collectionName) {
        if (!this.collectionConfigs[collectionName]) return;

        this.currentCollection = collectionName;
        const config = this.collectionConfigs[collectionName];

        // Update UI
        this.elements.collectionIcon.textContent = config.icon;
        this.elements.collectionName.textContent = config.displayName;
        
        // Show main interface
        this.elements.collectionGrid.parentElement.style.display = 'none';
        this.elements.mainInterface.style.display = 'block';

        // Load data
        await this.loadCollectionData();
    }

    showCollectionSelector() {
        this.elements.mainInterface.style.display = 'none';
        this.elements.collectionGrid.parentElement.style.display = 'block';
        this.currentCollection = null;
    }

    async loadCollectionData() {
        if (!this.currentCollection) return;

        this.showLoading(true);

        try {
            this.currentData = await this.manager.loadCollection(this.currentCollection);
            this.filteredData = [...this.currentData];
            
            this.updateStats();
            this.renderData();
        } catch (error) {
            this.showMessage('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message, 'error');
            this.currentData = [];
            this.filteredData = [];
        }

        this.showLoading(false);
    }

    renderData() {
        if (!this.elements.dataContainer) return;

        if (this.filteredData.length === 0) {
            this.elements.dataContainer.style.display = 'none';
            this.elements.emptyState.style.display = 'block';
            return;
        }

        this.elements.emptyState.style.display = 'none';
        this.elements.dataContainer.style.display = 'grid';

        const config = this.collectionConfigs[this.currentCollection];
        const html = this.filteredData.map(item => this.renderItemCard(item, config)).join('');
        
        this.elements.dataContainer.innerHTML = html;
    }

    renderItemCard(item, config) {
        const primaryValue = item[config.primaryField] || 'ไม่มีชื่อ';
        const secondaryInfo = config.secondaryFields.map(field => {
            const value = item[field];
            if (Array.isArray(value)) {
                return `${field}: ${value.join(', ')}`;
            }
            return `${field}: ${value || '-'}`;
        }).join(' • ');

        return `
            <div class="data-card">
                <div class="card-header">
                    <h3 class="card-title">${this.escapeHtml(primaryValue)}</h3>
                </div>
                <div class="card-content">
                    <p>${this.escapeHtml(secondaryInfo)}</p>
                </div>
                <div class="card-meta">
                    <span>ID: ${item.id || 'ไม่มี'}</span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-icon btn-secondary" 
                            onclick="multiUI.editItem('${item.id}')" 
                            title="แก้ไข">
                        ✏️
                    </button>
                    <button class="btn btn-icon btn-danger" 
                            onclick="multiUI.deleteItem('${item.id}')" 
                            title="ลบ">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Search
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }

        // Sort
        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (e) => {
                this.performSort(e.target.value);
            });
        }

        // Back button
        if (this.elements.backBtn) {
            this.elements.backBtn.addEventListener('click', () => {
                this.showCollectionSelector();
            });
        }

        // Modal events
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Save item
        const saveBtn = document.getElementById('saveItemBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveItem());
        }

        // Delete confirmation
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.confirmDelete());
        }

        // Import
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.performImport());
        }

        // Export format change
        const exportFormat = document.getElementById('exportFormat');
        if (exportFormat) {
            exportFormat.addEventListener('change', () => this.updateExportPreview());
        }

        // Download
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadExport());
        }
    }

    performSearch(term) {
        if (!term.trim()) {
            this.filteredData = [...this.currentData];
        } else {
            this.filteredData = this.manager.searchCollection(this.currentCollection, term);
        }
        this.renderData();
        this.updateStats();
    }

    performSort(sortValue) {
        if (!sortValue) return;

        const [field, direction] = sortValue.split(':');
        this.filteredData = this.manager.sortCollection(this.currentCollection, field, direction);
        this.renderData();
    }

    updateStats() {
        if (this.elements.collectionStats) {
            const total = this.currentData.length;
            const filtered = this.filteredData.length;
            
            if (filtered === total) {
                this.elements.collectionStats.textContent = `${total} รายการ`;
            } else {
                this.elements.collectionStats.textContent = `${filtered} จาก ${total} รายการ`;
            }
        }
    }

    // Modal methods
    showAddModal() {
        this.currentEditItem = null;
        this.setupItemForm();
        document.getElementById('itemModalTitle').textContent = 'เพิ่มข้อมูลใหม่';
        this.showModal('itemModal');
    }

    async editItem(itemId) {
        const item = this.currentData.find(i => i.id === itemId);
        if (!item) return;

        this.currentEditItem = item;
        this.setupItemForm(item);
        document.getElementById('itemModalTitle').textContent = 'แก้ไขข้อมูล';
        this.showModal('itemModal');
    }

    setupItemForm(item = null) {
        const formFields = document.getElementById('formFields');
        if (!formFields) return;

        const definition = this.manager.collectionDefinitions[this.currentCollection];
        if (!definition) return;

        const fields = Object.entries(definition.schema).map(([field, type]) => {
            const value = item ? item[field] || '' : '';
            const displayValue = Array.isArray(value) ? value.join(', ') : value;

            return `
                <div class="form-group">
                    <label class="form-label">${field}</label>
                    ${type === 'array' ? `
                        <textarea class="form-textarea" name="${field}" 
                                  placeholder="แยกด้วยเครื่องหมายจุลภาค">${displayValue}</textarea>
                    ` : `
                        <input type="${type === 'number' ? 'number' : 'text'}" 
                               class="form-input" name="${field}" value="${displayValue}">
                    `}
                </div>
            `;
        }).join('');

        formFields.innerHTML = fields;
    }

    async saveItem() {
        const formData = new FormData(document.getElementById('itemForm'));
        const definition = this.manager.collectionDefinitions[this.currentCollection];
        
        const item = {};
        
        for (const [field, type] of Object.entries(definition.schema)) {
            const value = formData.get(field);
            
            if (type === 'number') {
                item[field] = value ? Number(value) : 0;
            } else if (type === 'array') {
                item[field] = value ? value.split(',').map(v => v.trim()).filter(v => v) : [];
            } else {
                item[field] = value || '';
            }
        }

        try {
            if (this.currentEditItem) {
                await this.manager.updateItem(this.currentCollection, this.currentEditItem.id, item);
                this.showMessage('อัปเดตข้อมูลเรียบร้อย', 'success');
            } else {
                await this.manager.addItem(this.currentCollection, item);
                this.showMessage('เพิ่มข้อมูลเรียบร้อย', 'success');
            }

            this.closeModal('itemModal');
            await this.loadCollectionData();
        } catch (error) {
            this.showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    }

    deleteItem(itemId) {
        const item = this.currentData.find(i => i.id === itemId);
        if (!item) return;

        this.currentEditItem = item;
        
        const config = this.collectionConfigs[this.currentCollection];
        const preview = document.getElementById('deletePreview');
        if (preview) {
            preview.innerHTML = `
                <div class="data-card" style="margin: 0;">
                    <div class="card-header">
                        <h4>${item[config.primaryField] || 'ไม่มีชื่อ'}</h4>
                    </div>
                    <div class="card-content">
                        <p>ID: ${item.id}</p>
                    </div>
                </div>
            `;
        }
        
        this.showModal('deleteModal');
    }

    async confirmDelete() {
        if (!this.currentEditItem) return;

        try {
            await this.manager.deleteItem(this.currentCollection, this.currentEditItem.id);
            this.showMessage('ลบข้อมูลเรียบร้อย', 'success');
            this.closeModal('deleteModal');
            await this.loadCollectionData();
        } catch (error) {
            this.showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    }

    showImportModal() {
        this.showModal('importModal');
    }

    async performImport() {
        const fileInput = document.getElementById('importFile');
        const textInput = document.getElementById('importText');
        const mergeCheckbox = document.getElementById('mergeImport');

        let data = null;

        if (fileInput.files[0]) {
            try {
                const text = await fileInput.files[0].text();
                data = JSON.parse(text);
            } catch (error) {
                this.showMessage('ไฟล์ JSON ไม่ถูกต้อง', 'error');
                return;
            }
        } else if (textInput.value.trim()) {
            try {
                data = JSON.parse(textInput.value);
            } catch (error) {
                this.showMessage('JSON ไม่ถูกต้อง', 'error');
                return;
            }
        } else {
            this.showMessage('กรุณาเลือกไฟล์หรือใส่ข้อมูล JSON', 'error');
            return;
        }

        try {
            await this.manager.importCollection(this.currentCollection, data, {
                merge: mergeCheckbox.checked
            });
            
            this.showMessage('นำเข้าข้อมูลเรียบร้อย', 'success');
            this.closeModal('importModal');
            await this.loadCollectionData();
        } catch (error) {
            this.showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    }

    showExportModal() {
        this.updateExportPreview();
        this.showModal('exportModal');
    }

    updateExportPreview() {
        const format = document.getElementById('exportFormat').value;
        const preview = document.getElementById('exportPreview');
        
        try {
            const exportData = this.manager.exportCollection(this.currentCollection, format);
            preview.value = exportData.substring(0, 1000) + (exportData.length > 1000 ? '...' : '');
        } catch (error) {
            preview.value = 'เกิดข้อผิดพลาดในการสร้างตัวอย่าง';
        }
    }

    downloadExport() {
        const format = document.getElementById('exportFormat').value;
        
        try {
            const data = this.manager.exportCollection(this.currentCollection, format);
            const blob = new Blob([data], { 
                type: format === 'csv' ? 'text/csv' : 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentCollection}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.closeModal('exportModal');
            this.showMessage('ดาวน์โหลดเรียบร้อย', 'success');
        } catch (error) {
            this.showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    }

    // Utility methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showLoading(show) {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = show ? 'block' : 'none';
        }
        if (this.elements.dataContainer) {
            this.elements.dataContainer.style.display = show ? 'none' : 'grid';
        }
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.innerHTML = `
            <span>${this.escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()" style="margin-left: auto; background: none; border: none; font-size: 18px;">×</button>
        `;

        container.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for dependencies
    const checkDependencies = () => {
        if (window.CollectionManager && window.SecureConfig) {
            window.multiUI = new MultiCollectionUI();
        } else {
            setTimeout(checkDependencies, 100);
        }
    };
    
    checkDependencies();
});