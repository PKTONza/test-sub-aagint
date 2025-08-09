// Advanced Form Component for Complex Data Structures
// Handles arrays, objects, and various field types automatically

class AdvancedFormManager {
    constructor() {
        this.currentSchema = null;
        this.formData = {};
        this.validationRules = {};
        this.isEditMode = false;
    }
    
    // Generate form based on data schema
    generateForm(data, schema = null) {
        if (!data) {
            console.error('No data provided for form generation');
            return '';
        }
        
        this.currentSchema = schema || this.inferSchema(data);
        this.formData = typeof data === 'object' ? data : {};
        
        let formHTML = '<div class="advanced-form">';
        
        // Generate form fields based on schema
        for (const [fieldName, fieldConfig] of Object.entries(this.currentSchema)) {
            formHTML += this.generateField(fieldName, fieldConfig, this.formData[fieldName]);
        }
        
        formHTML += '</div>';
        return formHTML;
    }
    
    // Infer schema from data structure
    inferSchema(data) {
        const schema = {};
        
        if (Array.isArray(data) && data.length > 0) {
            // If data is array, use first item as template
            data = data[0];
        }
        
        for (const [key, value] of Object.entries(data)) {
            schema[key] = this.inferFieldType(key, value);
        }
        
        return schema;
    }
    
    // Infer field type from value
    inferFieldType(key, value) {
        const fieldConfig = {
            type: 'text',
            label: this.formatLabel(key),
            required: key === 'id' || key === 'name',
            validation: []
        };
        
        if (value === null || value === undefined) {
            return fieldConfig;
        }
        
        // Array fields
        if (Array.isArray(value)) {
            fieldConfig.type = 'array';
            fieldConfig.itemType = typeof value[0];
            return fieldConfig;
        }
        
        // Object fields
        if (typeof value === 'object') {
            fieldConfig.type = 'object';
            fieldConfig.properties = this.inferSchema(value);
            return fieldConfig;
        }
        
        // Primitive types
        switch (typeof value) {
            case 'number':
                fieldConfig.type = 'number';
                if (key.includes('health') || key.includes('damage')) {
                    fieldConfig.min = 0;
                    fieldConfig.max = 1000;
                }
                break;
                
            case 'boolean':
                fieldConfig.type = 'checkbox';
                break;
                
            case 'string':
                // Special string field handling
                if (key.toLowerCase().includes('email')) {
                    fieldConfig.type = 'email';
                } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('img')) {
                    fieldConfig.type = 'url';
                } else if (key.toLowerCase().includes('desc') || key.toLowerCase().includes('behavior')) {
                    fieldConfig.type = 'textarea';
                } else if (['type', 'rarity', 'category'].includes(key.toLowerCase())) {
                    fieldConfig.type = 'select';
                    fieldConfig.options = this.getSelectOptions(key);
                }
                break;
        }
        
        return fieldConfig;
    }
    
    // Get predefined options for select fields
    getSelectOptions(fieldName) {
        const optionsMap = {
            type: ['Predator', 'Herbivore', 'Omnivore', 'Small Game', 'Bird of Prey', 'Reptile', 'Aquatic'],
            rarity: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
            category: ['Weapon', 'Armor', 'Food', 'Tool', 'Material', 'Consumable'],
            difficulty: ['Easy', 'Medium', 'Hard', 'Expert', 'Master']
        };
        
        return optionsMap[fieldName.toLowerCase()] || [];
    }
    
    // Format field label
    formatLabel(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/_/g, ' ');
    }
    
    // Generate individual form field
    generateField(fieldName, fieldConfig, currentValue) {
        const { type, label, required, options, min, max } = fieldConfig;
        const fieldId = `field_${fieldName}`;
        const requiredAttr = required ? 'required' : '';
        const currentVal = currentValue || '';
        
        let fieldHTML = `
            <div class="form-field" data-field="${fieldName}">
                <label for="${fieldId}" class="form-label">
                    ${label}
                    ${required ? '<span class="required">*</span>' : ''}
                </label>
        `;
        
        switch (type) {
            case 'text':
            case 'email':
            case 'url':
                fieldHTML += `
                    <input 
                        type="${type}" 
                        id="${fieldId}" 
                        name="${fieldName}"
                        value="${this.escapeHtml(currentVal)}" 
                        class="form-input"
                        ${requiredAttr}
                        placeholder="Enter ${label.toLowerCase()}"
                    >
                `;
                break;
                
            case 'number':
                fieldHTML += `
                    <input 
                        type="number" 
                        id="${fieldId}" 
                        name="${fieldName}"
                        value="${currentVal}" 
                        class="form-input"
                        ${min !== undefined ? `min="${min}"` : ''}
                        ${max !== undefined ? `max="${max}"` : ''}
                        ${requiredAttr}
                        placeholder="Enter ${label.toLowerCase()}"
                    >
                `;
                break;
                
            case 'textarea':
                fieldHTML += `
                    <textarea 
                        id="${fieldId}" 
                        name="${fieldName}"
                        class="form-textarea"
                        ${requiredAttr}
                        placeholder="Enter ${label.toLowerCase()}"
                        rows="3"
                    >${this.escapeHtml(currentVal)}</textarea>
                `;
                break;
                
            case 'checkbox':
                fieldHTML += `
                    <div class="form-checkbox">
                        <input 
                            type="checkbox" 
                            id="${fieldId}" 
                            name="${fieldName}"
                            ${currentVal ? 'checked' : ''}
                            class="form-checkbox-input"
                        >
                        <span class="form-checkbox-label">${label}</span>
                    </div>
                `;
                break;
                
            case 'select':
                fieldHTML += `
                    <select 
                        id="${fieldId}" 
                        name="${fieldName}"
                        class="form-select"
                        ${requiredAttr}
                    >
                        <option value="">Select ${label.toLowerCase()}</option>
                `;
                
                if (options && options.length > 0) {
                    options.forEach(option => {
                        const selected = currentVal === option ? 'selected' : '';
                        fieldHTML += `<option value="${option}" ${selected}>${option}</option>`;
                    });
                }
                
                fieldHTML += '</select>';
                break;
                
            case 'array':
                fieldHTML += this.generateArrayField(fieldName, currentValue || []);
                break;
                
            case 'object':
                fieldHTML += this.generateObjectField(fieldName, fieldConfig, currentValue || {});
                break;
                
            default:
                fieldHTML += `
                    <input 
                        type="text" 
                        id="${fieldId}" 
                        name="${fieldName}"
                        value="${this.escapeHtml(currentVal)}" 
                        class="form-input"
                        ${requiredAttr}
                        placeholder="Enter ${label.toLowerCase()}"
                    >
                `;
        }
        
        fieldHTML += `
                <div class="form-field-error" id="${fieldId}_error"></div>
            </div>
        `;
        
        return fieldHTML;
    }
    
    // Generate array field (like location, drops)
    generateArrayField(fieldName, currentArray) {
        const arrayValues = Array.isArray(currentArray) ? currentArray : [];
        
        let html = `
            <div class="form-array" data-field="${fieldName}">
                <div class="form-array-items">
        `;
        
        arrayValues.forEach((value, index) => {
            html += `
                <div class="form-array-item">
                    <input 
                        type="text" 
                        value="${this.escapeHtml(value)}" 
                        class="form-input"
                        placeholder="Item ${index + 1}"
                    >
                    <button type="button" class="btn btn-danger btn-small" onclick="this.parentNode.remove()">
                        ✕
                    </button>
                </div>
            `;
        });
        
        html += `
                </div>
                <button type="button" class="btn btn-secondary btn-small add-array-item" 
                        onclick="addArrayItem('${fieldName}')">
                    ➕ Add Item
                </button>
            </div>
        `;
        
        return html;
    }
    
    // Generate object field (nested objects)
    generateObjectField(fieldName, fieldConfig, currentObject) {
        let html = `
            <div class="form-object" data-field="${fieldName}">
                <div class="form-object-content">
        `;
        
        if (fieldConfig.properties) {
            for (const [propName, propConfig] of Object.entries(fieldConfig.properties)) {
                const propValue = currentObject[propName];
                html += this.generateField(`${fieldName}.${propName}`, propConfig, propValue);
            }
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    // Extract form data
    extractFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
        // Handle regular fields
        for (const [key, value] of formData.entries()) {
            if (key.includes('.')) {
                // Handle nested objects
                this.setNestedValue(data, key, value);
            } else {
                data[key] = value;
            }
        }
        
        // Handle arrays
        const arrayFields = formElement.querySelectorAll('.form-array');
        arrayFields.forEach(arrayField => {
            const fieldName = arrayField.dataset.field;
            const items = arrayField.querySelectorAll('.form-array-item input');
            data[fieldName] = Array.from(items).map(input => input.value).filter(val => val.trim());
        });
        
        // Handle checkboxes
        const checkboxes = formElement.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            data[checkbox.name] = checkbox.checked;
        });
        
        // Convert numeric fields
        const numberInputs = formElement.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            if (input.value) {
                data[input.name] = parseFloat(input.value);
            }
        });
        
        return data;
    }
    
    // Set nested object values
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }
    
    // Validate form data
    validateForm(data) {
        const errors = {};
        
        for (const [fieldName, fieldConfig] of Object.entries(this.currentSchema)) {
            const value = data[fieldName];
            const fieldErrors = [];
            
            // Required validation
            if (fieldConfig.required && (!value || value === '')) {
                fieldErrors.push(`${fieldConfig.label} is required`);
            }
            
            // Type-specific validation
            if (value) {
                switch (fieldConfig.type) {
                    case 'email':
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                            fieldErrors.push('Please enter a valid email address');
                        }
                        break;
                        
                    case 'url':
                        try {
                            new URL(value);
                        } catch {
                            fieldErrors.push('Please enter a valid URL');
                        }
                        break;
                        
                    case 'number':
                        const num = parseFloat(value);
                        if (isNaN(num)) {
                            fieldErrors.push('Please enter a valid number');
                        }
                        if (fieldConfig.min !== undefined && num < fieldConfig.min) {
                            fieldErrors.push(`Value must be at least ${fieldConfig.min}`);
                        }
                        if (fieldConfig.max !== undefined && num > fieldConfig.max) {
                            fieldErrors.push(`Value must be at most ${fieldConfig.max}`);
                        }
                        break;
                }
            }
            
            if (fieldErrors.length > 0) {
                errors[fieldName] = fieldErrors;
            }
        }
        
        return errors;
    }
    
    // Show validation errors with enhanced UX
    showValidationErrors(errors) {
        // Clear previous errors
        document.querySelectorAll('.form-field-error').forEach(el => {
            el.textContent = '';
            el.setAttribute('aria-live', 'polite');
        });
        document.querySelectorAll('.form-field').forEach(el => el.classList.remove('has-error'));
        
        // Show new errors with better messaging
        for (const [fieldName, fieldErrors] of Object.entries(errors)) {
            const errorElement = document.getElementById(`field_${fieldName}_error`);
            const fieldElement = document.querySelector(`[data-field="${fieldName}"]`);
            const inputElement = document.querySelector(`[name="${fieldName}"]`);
            
            if (errorElement) {
                // Enhanced error messages
                const userFriendlyError = this.formatErrorMessage(fieldName, fieldErrors[0]);
                errorElement.textContent = userFriendlyError;
                errorElement.setAttribute('role', 'alert');
            }
            
            if (fieldElement) {
                fieldElement.classList.add('has-error');
            }
            
            if (inputElement) {
                inputElement.setAttribute('aria-invalid', 'true');
                inputElement.setAttribute('aria-describedby', `field_${fieldName}_error`);
            }
        }
        
        // Focus first error field
        const firstErrorField = document.querySelector('.has-error [name]');
        if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // Format error messages to be user-friendly
    formatErrorMessage(fieldName, error) {
        const fieldLabel = this.formatLabel(fieldName);
        
        const errorMap = {
            'is required': `กรุณากรอก${fieldLabel}`,
            'Please enter a valid email': 'กรุณากรอกอีเมลที่ถูกต้อง',
            'Please enter a valid URL': 'กรุณากรอก URL ที่ถูกต้อง',
            'Please enter a valid number': 'กรุณากรอกตัวเลขที่ถูกต้อง'
        };
        
        // Check for min/max errors
        if (error.includes('at least')) {
            const minValue = error.match(/\d+/)?.[0];
            return `${fieldLabel} ต้องมีค่าอย่างน้อย ${minValue}`;
        }
        
        if (error.includes('at most')) {
            const maxValue = error.match(/\d+/)?.[0];
            return `${fieldLabel} ต้องมีค่าไม่เกิน ${maxValue}`;
        }
        
        return errorMap[error] || `${fieldLabel}: ${error}`;
    }
    
    // Utility functions
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
}

// Global functions for array management
function addArrayItem(fieldName) {
    const arrayContainer = document.querySelector(`[data-field="${fieldName}"] .form-array-items`);
    if (arrayContainer) {
        const itemCount = arrayContainer.children.length;
        const newItem = document.createElement('div');
        newItem.className = 'form-array-item';
        newItem.innerHTML = `
            <input 
                type="text" 
                class="form-input"
                placeholder="Item ${itemCount + 1}"
            >
            <button type="button" class="btn btn-danger btn-small" onclick="this.parentNode.remove()">
                ✕
            </button>
        `;
        arrayContainer.appendChild(newItem);
    }
}

// Initialize global form manager
window.AdvancedForm = new AdvancedFormManager();