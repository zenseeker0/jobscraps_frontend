// Phase 4 Implementation Guide & Missing Functions
// Complete implementation of remaining workflow functions

// Add these functions to core.js or create as separate workflow.js file

// Phase 4: Complete job details rendering with workflow features
async function loadAndDisplayJobDetails(jobId) {
    try {
        const panel = document.getElementById('detailsPanel');
        panel.innerHTML = '<div class="loading">Loading job details...</div>';
        
        const job = await loadJobDetails(jobId);
        if (job) {
            renderJobDetails(job);
        }
    } catch (error) {
        showMessage('Error loading job details.', 'error');
        document.getElementById('detailsPanel').innerHTML = 
            '<div class="loading">Error loading job details.</div>';
    }
}

function renderJobDetails(job) {
    const panel = document.getElementById('detailsPanel');
    
    panel.innerHTML = `
        <div class="details-header">
            <div class="details-title">${escapeHtml(job.title)}</div>
            <div class="details-company">
                <span onclick="showCompanyDetails('${escapeHtml(job.company)}')" 
                      style="cursor: pointer; text-decoration: underline;">
                    ${escapeHtml(job.company)}
                </span>
                <button onclick="showCompanyDetails('${escapeHtml(job.company)}')" 
                        style="margin-left: 8px; font-size: 12px; padding: 2px 6px;">
                    📋 Company Info
                </button>
            </div>
            <div class="details-meta">
                <div>📍 ${escapeHtml(job.location || 'Not specified')}</div>
                <div>🏢 ${escapeHtml(job.company_industry || 'Unknown industry')}</div>
                <div>💼 ${escapeHtml(job.job_type || 'Not specified')}</div>
                <div>🎯 ${escapeHtml(job.job_level || 'Not specified')}</div>
                ${job.job_role ? `<div>🏷️ ${escapeHtml(job.job_role)}</div>` : ''}
                ${job.location_scope ? `<div>🌍 ${escapeHtml(job.location_scope)}</div>` : ''}
            </div>
            
            ${job.excluded ? `
            <div class="exclusion-details">
                <strong>Exclusion Info:</strong>
                <div>Reason: ${escapeHtml(job.exclusion_reason || 'Not specified')}</div>
                <div>Sources: ${job.exclusion_sources ? JSON.parse(job.exclusion_sources).join(', ') : 'Not specified'}</div>
                <div>Applied: ${job.exclusion_applied_at ? formatDate(job.exclusion_applied_at) : 'Not specified'}</div>
            </div>
            ` : ''}
        </div>
        
        <div class="details-actions">
            <select class="status-select" onchange="updateJobStatus('${job.id}', this.value)" ${isUpdating ? 'disabled' : ''}>
                <option value="">Set Status</option>
                <option value="interested" ${job.status === 'interested' ? 'selected' : ''}>🟦 Interested (1)</option>
                <option value="applied" ${job.status === 'applied' ? 'selected' : ''}>🟢 Applied (2)</option>
                <option value="followed-up" ${job.status === 'followed-up' ? 'selected' : ''}>🟡 Followed Up (3)</option>
                <option value="rejected" ${job.status === 'rejected' ? 'selected' : ''}>🔴 Rejected (4)</option>
                <option value="irrelevant" ${job.status === 'irrelevant' ? 'selected' : ''}>⚪ Irrelevant (5)</option>
            </select>
            <a href="${job.job_url}" target="_blank" style="color: #3b82f6; text-decoration: none;">🔗 View Job</a>
            ${job.job_url_direct ? `<a href="${job.job_url_direct}" target="_blank" style="color: #3b82f6; text-decoration: none;">🎯 Direct Link</a>` : ''}
            <button onclick="copyJobDetails()" style="font-size: 12px;">📋 Copy Details</button>
            <button onclick="copyJobDescription()" style="font-size: 12px;">📄 Copy Description</button>
        </div>
        
        <div class="details-content">
            ${job.skills ? `<div style="margin-bottom: 15px;"><strong>Skills:</strong> ${escapeHtml(job.skills)}</div>` : ''}
            
            <div class="description-text">${escapeHtml(job.description || 'No description available.')}</div>
            
            <div class="notes-section">
                <label><strong>Your Notes:</strong></label>
                <textarea class="notes-input" placeholder="Add your notes about this job..." 
                          onchange="updateJobNotes('${job.id}', this.value)" 
                          ${isUpdating ? 'disabled' : ''}>${escapeHtml(job.user_notes || '')}</textarea>
            </div>
        </div>
    `;
}

// Phase 4: Company modal functions (complete implementation)
async function showCompanyDetails(companyName) {
    if (!companyName || companyName === 'Unknown') return;
    
    try {
        let companyData = companyMetadataCache.get(companyName);
        
        if (!companyData) {
            companyData = await loadCompanyMetadata(companyName);
            companyMetadataCache.set(companyName, companyData);
        }
        
        const modal = document.createElement('div');
        modal.id = 'companyModal';
        modal.className = 'company-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${escapeHtml(companyName)} - Company Details</h3>
                    <button onclick="closeCompanyModal()" style="float: right;">✕</button>
                </div>
                <div class="modal-body">
                    <div class="company-field">
                        <label>Status:</label>
                        <select id="companyStatus">
                            <option value="">Not Set</option>
                            <option value="target" ${companyData?.status === 'target' ? 'selected' : ''}>Target Company</option>
                            <option value="applied" ${companyData?.status === 'applied' ? 'selected' : ''}>Applied Before</option>
                            <option value="rejected" ${companyData?.status === 'rejected' ? 'selected' : ''}>Rejected Me</option>
                            <option value="avoid" ${companyData?.status === 'avoid' ? 'selected' : ''}>Avoid</option>
                        </select>
                    </div>
                    
                    <div class="company-field">
                        <label>Appeal Factors:</label>
                        <textarea id="appealFactors" placeholder="What makes this company attractive?">${escapeHtml(companyData?.appeal_factors || '')}</textarea>
                    </div>
                    
                    <div class="company-field">
                        <label>Notes:</label>
                        <textarea id="companyNotes" placeholder="Your notes about this company...">${escapeHtml(companyData?.notes || '')}</textarea>
                    </div>
                    
                    <div class="company-field">
                        <label>Application History:</label>
                        <div id="applicationHistory">
                            ${companyData?.application_history ? 
                                JSON.parse(companyData.application_history).map(app => 
                                    `<div>• ${app.date}: ${app.position} (${app.status})</div>`
                                ).join('') : 
                                'No previous applications recorded'
                            }
                        </div>
                        <button onclick="addApplicationRecord('${escapeHtml(companyName)}')">+ Add Application</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="saveCompanyDetails('${escapeHtml(companyName)}')">Save</button>
                    <button onclick="closeCompanyModal()">Cancel</button>
                </div>
            </div>
            <div class="modal-backdrop" onclick="closeCompanyModal()"></div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error showing company details:', error);
        showMessage('Error loading company details', 'error');
    }
}

function closeCompanyModal() {
    const modal = document.getElementById('companyModal');
    if (modal) {
        modal.remove();
    }
}

async function saveCompanyDetails(companyName) {
    try {
        const status = document.getElementById('companyStatus').value;
        const appealFactors = document.getElementById('appealFactors').value;
        const notes = document.getElementById('companyNotes').value;
        
        const metadata = {
            status: status || null,
            appeal_factors: appealFactors || null,
            notes: notes || null
        };
        
        await updateCompanyMetadata(companyName, metadata);
        
        const existingData = companyMetadataCache.get(companyName) || {};
        companyMetadataCache.set(companyName, { ...existingData, ...metadata });
        
        showMessage('Company details saved', 'success', 2000);
        closeCompanyModal();
        
    } catch (error) {
        console.error('Error saving company details:', error);
        showMessage('Failed to save company details', 'error');
    }
}

function addApplicationRecord(companyName) {
    const position = prompt('Job position:');
    if (!position) return;
    
    const status = prompt('Application status (applied/interviewed/rejected/hired):');
    if (!status) return;
    
    const date = new Date().toISOString().split('T')[0];
    
    // Get existing history
    let companyData = companyMetadataCache.get(companyName) || {};
    let history = [];
    
    if (companyData.application_history) {
        history = JSON.parse(companyData.application_history);
    }
    
    history.push({ date, position, status });
    companyData.application_history = JSON.stringify(history);
    
    // Update cache and display
    companyMetadataCache.set(companyName, companyData);
    
    // Refresh modal
    closeCompanyModal();
    setTimeout(() => showCompanyDetails(companyName), 100);
}

// Phase 4: Enhanced search implementation
function setupAdvancedSearch() {
    const searchInput   = document.getElementById('searchInput');
    const statusFilter  = document.getElementById('statusFilter');
    const querySelect   = document.getElementById('querySelect');

    // Wire search & status directly back to core.filterJobs
    searchInput.removeEventListener('input', searchInput.oninput);
    searchInput.addEventListener(
        'input',
        debounce(() => filterJobs(true), UI_CONFIG.SEARCH_DEBOUNCE_MS)
    );
    statusFilter.addEventListener('change', () => filterJobs(true));

    // Query-selector reloads the data set
    querySelect.addEventListener('change', () => loadAndDisplayJobs());

    // (Optional) add a little search button for folks who prefer clicking
    if (!document.getElementById('advancedSearchBtn')) {
        const btn = document.createElement('button');
        btn.id = 'advancedSearchBtn';
        btn.textContent = '🔍';
        btn.onclick = () => filterJobs(true);
        btn.style.marginLeft = '4px';
        searchInput.parentNode.appendChild(btn);
    }
}

function generateWorkflowRecommendations(analytics, efficiency) {
    const recommendations = [];
    
    if (efficiency.decisionsPerMinute < 1) {
        recommendations.push({
            type: 'efficiency',
            message: 'Consider using triage mode for faster job processing',
            priority: 'high'
        });
    }
    
    if (efficiency.shortcutUsageRate < 0.5) {
        recommendations.push({
            type: 'shortcuts',
            message: 'Using more keyboard shortcuts can speed up workflow',
            priority: 'medium'
        });
    }
    
    if (efficiency.errorRate > 0.1) {
        recommendations.push({
            type: 'errors',
            message: 'High error rate detected - consider refreshing or checking connection',
            priority: 'high'
        });
    }
    
    if (efficiency.bulkEfficiency > 10) {
        recommendations.push({
            type: 'bulk',
            message: 'Good use of bulk operations for efficiency',
            priority: 'info'
        });
    }
    
    if (analytics.primaryWorkflowMode === 'review' && analytics.jobsProcessed > 100) {
        recommendations.push({
            type: 'mode',
            message: 'Consider switching to triage mode for large datasets',
            priority: 'medium'
        });
    }
    
    return recommendations;
}

// Phase 4: Session persistence (optional)
function saveWorkflowSession() {
    const sessionData = {
        selectedJobs: Array.from(jobSelection.selectedJobs),
        currentMode: currentWorkflowMode,
        selectedJobId: selectedJobId,
        selectedIndex: selectedIndex,
        searchTerm: document.getElementById('searchInput').value,
        statusFilter: document.getElementById('statusFilter').value,
        timestamp: Date.now()
    };
    
    try {
        sessionStorage.setItem('jobboard_session', JSON.stringify(sessionData));
    } catch (error) {
        console.warn('Failed to save session:', error);
    }
}

function restoreWorkflowSession() {
    try {
        const sessionData = JSON.parse(sessionStorage.getItem('jobboard_session') || '{}');
        
        if (sessionData.timestamp && Date.now() - sessionData.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
            // Restore selections
            if (sessionData.selectedJobs) {
                jobSelection.selectedJobs = new Set(sessionData.selectedJobs);
                updateBulkSelectionUI();
            }
            
            // Restore workflow mode
            if (sessionData.currentMode) {
                setWorkflowMode(sessionData.currentMode);
            }
            
            // Restore filters
            if (sessionData.searchTerm) {
                document.getElementById('searchInput').value = sessionData.searchTerm;
            }
            if (sessionData.statusFilter) {
                document.getElementById('statusFilter').value = sessionData.statusFilter;
            }
            
            // Restore selection after jobs load
            if (sessionData.selectedJobId) {
                setTimeout(() => {
                    const jobIndex = filteredJobs.findIndex(job => job.id === sessionData.selectedJobId);
                    if (jobIndex >= 0) {
                        selectJob(jobIndex);
                    }
                }, 1000);
            }
            
            showMessage('Previous session restored', 'info', 3000);
        }
    } catch (error) {
        console.warn('Failed to restore session:', error);
    }
}

// Phase 4: Keyboard shortcut registration system
function registerGlobalShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Don't trigger shortcuts when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.contentEditable === 'true') {
            return;
        }
        
        // Global shortcuts that work regardless of workflow mode
        switch(event.key) {
            case '?':
                event.preventDefault();
                showShortcutHelp();
                break;
            case 'Escape':
                event.preventDefault();
                // Close modals or clear search
                const modal = document.querySelector('.company-modal, .shortcut-help-modal');
                if (modal) {
                    modal.remove();
                } else if (document.getElementById('searchInput').value) {
                    document.getElementById('searchInput').value = '';
                    filterJobs(true);
                }
                break;
            case 'Tab':
                if (event.ctrlKey) {
                    event.preventDefault();
                    toggleWorkflowMode();
                }
                break;
        }
    });
}

// Phase 4: Error recovery functions
function retryLastOperation() {
    // This would be called from retry buttons in error messages
    // Implementation depends on storing the last failed operation
    showMessage('Retry functionality would be implemented based on specific error context', 'info');
}

function resetApplication() {
    if (confirm('Reset the application? This will clear all selections and reload the job data.')) {
        // Clear all state
        jobSelection.selectedJobs.clear();
        selectedIndex = -1;
        selectedJobId = null;
        companyMetadataCache.clear();
        
        // Clear UI
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        clearSelection();
        updateBulkSelectionUI();
        
        // Reload data
        loadAndDisplayJobs();
        
        showMessage('Application reset successfully', 'success');
    }
}

// Phase 4: Data export utilities
function exportWorkflowState() {
    const state = {
        selections: Array.from(jobSelection.selectedJobs),
        workflowMode: currentWorkflowMode,
        filters: {
            search: document.getElementById('searchInput').value,
            status: document.getElementById('statusFilter').value,
            query: document.getElementById('querySelect').value
        },
        analytics: getSessionSummary(),
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_state_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showMessage('Workflow state exported', 'success');
}

// Phase 4: Initialize all systems
function initializePhase4Systems() {
    // Initialize workflow UI (called from core.js initializeApp)
    initializeWorkflowUI();
    
    // Setup advanced search
    setupAdvancedSearch();
    
    // Register global shortcuts
    registerGlobalShortcuts();
    
    // Restore previous session
    restoreWorkflowSession();
    
    // Setup auto-save
    setInterval(saveWorkflowSession, 30000); // Save every 30 seconds
    
    // Setup performance monitoring
    setInterval(monitorPerformance, 30000);
    
    console.log('🚀 Phase 4 systems initialized successfully');
}

// Phase 4: Add these event listeners to initialize systems
document.addEventListener('DOMContentLoaded', function() {
    // This will be called after the main initializeApp() function
    setTimeout(initializePhase4Systems, 1000);
});

// Add to window for global access if needed
window.Phase4 = {
    generateWorkflowReport,
    exportWorkflowState,
    resetApplication,
    restoreWorkflowSession,
    saveWorkflowSession
};

// Phase 4: Console commands for testing/debugging
if (UI_CONFIG.DEBUG_MODE) {
    window.debugCommands = {
        showAnalytics: () => console.log(getSessionSummary()),
        simulateBulkOperation: (count = 10) => {
            const randomJobs = filteredJobs.slice(0, count);
            randomJobs.forEach(job => jobSelection.selectedJobs.add(job.id));
            updateBulkSelectionUI();
        },
        clearAllSelections: () => {
            jobSelection.selectedJobs.clear();
            updateBulkSelectionUI();
        },
        testWorkflowModes: () => {
            const modes = Object.keys(CONFIG.WORKFLOW_MODES);
            let index = 0;
            const interval = setInterval(() => {
                setWorkflowMode(modes[index]);
                index++;
                if (index >= modes.length) {
                    clearInterval(interval);
                    showMessage('Workflow mode test completed', 'success');
                }
            }, 2000);
        }
    };
    
    console.log('Debug commands available:', Object.keys(window.debugCommands));
}