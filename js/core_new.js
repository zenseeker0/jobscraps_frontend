console.log('🆕 NEW CORE.JS LOADED!');
// Core application logic and state management
// Enhanced with irrelevant status and company metadata features

// Global state variables
let allJobs = [];
let filteredJobs = [];
let selectedIndex = -1;
let selectedJobId = null;
let isUpdating = false; // Prevent race conditions

// Performance tracking for large dataset
let performanceMetrics = {
    lastRenderTime: 0,
    jobsLoaded: 0,
    filterTime: 0
};

// Company metadata cache
let companyMetadataCache = new Map();

// Event listeners setup
document.addEventListener('DOMContentLoaded', initializeApp);
document.addEventListener('keydown', handleKeyPress);

async function initializeApp() {
    // Show loading indicator for larger dataset
    showMessage('Loading job board... (this may take a moment with 101k+ jobs)', 'info');
    
    // Initialize event listeners
    document.getElementById('querySelect').addEventListener('change', loadAndDisplayJobs);
    document.getElementById('searchInput').addEventListener('input', debounce(filterJobs, UI_CONFIG.SEARCH_DEBOUNCE_MS));
    document.getElementById('statusFilter').addEventListener('change', () => filterJobs(false));
    
    // Load initial data
    await loadAndDisplayJobs();
}

async function loadAndDisplayJobs() {
    const startTime = performance.now();
    
    try {
        showMessage('Loading jobs from database...', 'info');
        
        allJobs = await loadJobs();
        performanceMetrics.jobsLoaded = allJobs.length;
        
        // Performance warning for very large datasets
        if (allJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS) {
            showMessage(
                `⚠️ Large dataset detected (${allJobs.length.toLocaleString()} jobs). ` +
                `Consider using filters to improve performance.`, 
                'warning', 
                8000
            );
        }
        
        filterJobs(false);
        updateStats();
        
        const loadTime = performance.now() - startTime;
        performanceMetrics.lastRenderTime = loadTime;
        
        if (UI_CONFIG.DEBUG_MODE) {
            console.log(`Jobs loaded in ${loadTime.toFixed(2)}ms (${allJobs.length} jobs)`);
        }
        
        showMessage(`✅ Loaded ${allJobs.length.toLocaleString()} jobs successfully`, 'success', 3000);
        
    } catch (error) {
        showMessage('Error loading jobs. Check PostgREST connection.', 'error');
        document.getElementById('jobsTableBody').innerHTML = 
            '<tr><td colspan="6" class="loading">Error loading jobs. Check PostgREST connection.</td></tr>';
    }
}

function filterJobs(resetSelection = true) {
    const startTime = performance.now();
    
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    
    // Performance optimization: early return for empty search on large dataset
    if (!search && !status && allJobs.length > 10000) {
        filteredJobs = allJobs.slice(0, UI_CONFIG.MAX_VISIBLE_JOBS);
        if (allJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS) {
            showMessage(
                `Showing first ${UI_CONFIG.MAX_VISIBLE_JOBS.toLocaleString()} of ${allJobs.length.toLocaleString()} jobs. Use search to filter.`,
                'info',
                5000
            );
        }
    } else {
        filteredJobs = allJobs.filter(job => {
            const matchesSearch = !search || 
                (job.title && job.title.toLowerCase().includes(search)) ||
                (job.company && job.company.toLowerCase().includes(search));
            
            const matchesStatus = !status || 
                (status === 'unreviewed' && !job.status) ||
                job.status === status;
            
            return matchesSearch && matchesStatus;
        });
    }
    
    const filterTime = performance.now() - startTime;
    performanceMetrics.filterTime = filterTime;
    
    if (UI_CONFIG.DEBUG_MODE) {
        console.log(`Filtering completed in ${filterTime.toFixed(2)}ms (${filteredJobs.length} results)`);
    }
    
    renderJobs();
    updateStats();
    
    // Only reset selection if explicitly requested (not during status updates)
    if (resetSelection) {
        selectedIndex = -1;
        selectedJobId = null;
        clearSelection();
    } else if (selectedJobId) {
        preserveSelection();
    }
}

function renderJobs() {
    console.log('🔄 FIXED renderJobs function is running!');
    const startTime = performance.now();
    const tbody = document.getElementById('jobsTableBody');
    
    if (filteredJobs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No jobs found. Try adjusting your search or filters.</td></tr>';
        return;
    }
    
    // Performance optimization: limit rendered jobs if very large result set
    const jobsToRender = filteredJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS 
        ? filteredJobs.slice(0, UI_CONFIG.MAX_VISIBLE_JOBS)
        : filteredJobs;
    
    console.log('📊 Rendering', jobsToRender.length, 'jobs');
    
    // FIXED: Use proper table element instead of div
    const tempTable = document.createElement('table');
    const tempTbody = document.createElement('tbody');
    tempTable.appendChild(tempTbody);
    
    tempTbody.innerHTML = jobsToRender.map((job, index) => `
        <tr class="job-row" data-job-id="${job.id}" data-index="${index}" onclick="selectJob(${index})">
            <td class="selection-cell">
                <input type="checkbox" 
                       id="job-${job.id}" 
                       onchange="event.stopPropagation(); toggleJobSelection('${job.id}')"
                       title="Select this job">
            </td>
            <td class="job-title">${escapeHtml(job.title || 'No Title')}</td>
            <td class="job-company">
                <span class="company-name" 
                      onmouseenter="showCompanyTooltip(event, '${escapeHtml(job.company)}')"
                      onmouseleave="hideCompanyTooltip()">
                    ${escapeHtml(job.company || 'Unknown')}
                </span>
                ${job.excluded ? '<span class="excluded-badge">Excluded</span>' : ''}
            </td>
            <td>
                ${escapeHtml(job.location || 'N/A')}
                ${job.is_remote ? '<span class="remote-badge">Remote</span>' : ''}
            </td>
            <td>
                <span class="status-badge status-${job.status || 'unreviewed'}">
                    ${job.status || 'unreviewed'}
                </span>
                ${job.exclusion_reason ? `<div class="exclusion-reason">${escapeHtml(job.exclusion_reason)}</div>` : ''}
            </td>
            <td class="salary">${formatSalary(job)}</td>
            <td>${formatDate(job.date_posted)}</td>
        </tr>
    `).join('');
    
    // Clear existing content and move new rows
    tbody.innerHTML = '';
    while (tempTbody.firstChild) {
        tbody.appendChild(tempTbody.firstChild);
    }
    
    console.log('✅ Table updated with', tbody.children.length, 'rows');
    
    // DEBUG: Check what's actually in the DOM now
    const firstRow = tbody.children[0];
    if (firstRow) {
        console.log('🔍 First row in DOM has', firstRow.children.length, 'cells');
        console.log('🔍 First cell content:', firstRow.children[0]?.innerHTML?.substring(0, 100));
    }
    
    // Show truncation warning if needed
    if (filteredJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS) {
        showMessage(
            `⚠️ Showing ${UI_CONFIG.MAX_VISIBLE_JOBS.toLocaleString()} of ${filteredJobs.length.toLocaleString()} filtered jobs. ` +
            `Use more specific search terms to see all results.`,
            'warning',
            6000
        );
    }
    
    const renderTime = performance.now() - startTime;
    if (UI_CONFIG.DEBUG_MODE) {
        console.log(`Rendered ${jobsToRender.length} jobs in ${renderTime.toFixed(2)}ms`);
    }
}

// Job selection management for bulk operations
let selectedJobs = new Set();

function toggleJobSelection(jobId) {
    const checkbox = document.getElementById(`job-${jobId}`);
    const row = document.querySelector(`[data-job-id="${jobId}"]`);
    
    if (checkbox.checked) {
        selectedJobs.add(jobId);
        if (row) row.classList.add('bulk-selected');
    } else {
        selectedJobs.delete(jobId);
        if (row) row.classList.remove('bulk-selected');
    }
    
    updateSelectionUI();
}

function toggleAllVisible() {
    const selectAllCheckbox = document.getElementById('selectAllVisible');
    const visibleJobs = filteredJobs.slice(0, UI_CONFIG.MAX_VISIBLE_JOBS);
    
    if (selectAllCheckbox.checked) {
        // Select all visible jobs
        visibleJobs.forEach(job => {
            selectedJobs.add(job.id);
            const checkbox = document.getElementById(`job-${job.id}`);
            const row = document.querySelector(`[data-job-id="${job.id}"]`);
            if (checkbox) checkbox.checked = true;
            if (row) row.classList.add('bulk-selected');
        });
        
        showMessage(`Selected ${visibleJobs.length} visible jobs`, 'success', 2000);
    } else {
        // Deselect all visible jobs
        visibleJobs.forEach(job => {
            selectedJobs.delete(job.id);
            const checkbox = document.getElementById(`job-${job.id}`);
            const row = document.querySelector(`[data-job-id="${job.id}"]`);
            if (checkbox) checkbox.checked = false;
            if (row) row.classList.remove('bulk-selected');
        });
        
        showMessage('Deselected all visible jobs', 'info', 2000);
    }
    
    updateSelectionUI();
}

function updateSelectionUI() {
    // Update the selection count if elements exist
    const selectionCountElement = document.getElementById('selectionCount');
    if (selectionCountElement) {
        selectionCountElement.textContent = selectedJobs.size;
    }
    
    // Update the "select all" checkbox state
    const selectAllCheckbox = document.getElementById('selectAllVisible');
    if (selectAllCheckbox) {
        const visibleJobIds = filteredJobs.slice(0, UI_CONFIG.MAX_VISIBLE_JOBS).map(job => job.id);
        const visibleSelectedCount = visibleJobIds.filter(id => selectedJobs.has(id)).length;
        
        if (visibleSelectedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (visibleSelectedCount === visibleJobIds.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

function clearAllSelections() {
    selectedJobs.clear();
    
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"][id^="job-"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Remove selection styling
    document.querySelectorAll('.bulk-selected').forEach(row => {
        row.classList.remove('bulk-selected');
    });
    
    updateSelectionUI();
    showMessage('Cleared all selections', 'info', 2000);
}

function selectJob(index) {
    selectedIndex = index;
    selectedJobId = filteredJobs[index].id;
    
    // Update table selection
    document.querySelectorAll('.job-row').forEach(row => row.classList.remove('selected'));
    const selectedRow = document.querySelector(`[data-index="${index}"]`);
    if (selectedRow) {
        selectedRow.classList.add('selected');
        
        // Scroll to selected row
        selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Load job details (lazy loading for performance)
    if (UI_CONFIG.LAZY_LOAD_DETAILS) {
        loadAndDisplayJobDetails(selectedJobId);
    }
    
    updateStats();
}

async function loadAndDisplayJobDetails(jobId) {
    try {
        // Show loading state for job details
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
                <option value="interested" ${job.status === 'interested' ? 'selected' : ''}>Interested</option>
                <option value="applied" ${job.status === 'applied' ? 'selected' : ''}>Applied</option>
                <option value="followed-up" ${job.status === 'followed-up' ? 'selected' : ''}>Followed Up</option>
                <option value="rejected" ${job.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                <option value="irrelevant" ${job.status === 'irrelevant' ? 'selected' : ''}>Irrelevant</option>
            </select>
            <a href="${job.job_url}" target="_blank" style="color: #3b82f6; text-decoration: none;">🔗 View Job</a>
            ${job.job_url_direct ? `<a href="${job.job_url_direct}" target="_blank" style="color: #3b82f6; text-decoration: none;">🎯 Direct Link</a>` : ''}
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

// NEW: Company metadata functionality (addressing feedback point 3)
async function showCompanyTooltip(event, companyName) {
    if (!companyName || companyName === 'Unknown') return;
    
    try {
        // Check cache first
        let companyData = companyMetadataCache.get(companyName);
        
        if (!companyData) {
            companyData = await loadCompanyMetadata(companyName);
            companyMetadataCache.set(companyName, companyData);
        }
        
        if (companyData) {
            const tooltip = document.createElement('div');
            tooltip.id = 'companyTooltip';
            tooltip.className = 'company-tooltip';
            tooltip.innerHTML = `
                <div class="tooltip-header">${escapeHtml(companyName)}</div>
                ${companyData.status ? `<div>Status: <span class="company-status-${companyData.status}">${companyData.status}</span></div>` : ''}
                ${companyData.appeal_factors ? `<div>Appeal: ${escapeHtml(companyData.appeal_factors)}</div>` : ''}
                ${companyData.application_history ? `<div>Applications: ${JSON.parse(companyData.application_history).length || 0}</div>` : ''}
                ${companyData.notes ? `<div>Notes: ${escapeHtml(companyData.notes.substring(0, 100))}${companyData.notes.length > 100 ? '...' : ''}</div>` : ''}
            `;
            
            tooltip.style.position = 'absolute';
            tooltip.style.left = event.pageX + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
            
            document.body.appendChild(tooltip);
        }
    } catch (error) {
        console.error('Error loading company tooltip:', error);
    }
}

function hideCompanyTooltip() {
    const tooltip = document.getElementById('companyTooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

async function showCompanyDetails(companyName) {
    if (!companyName || companyName === 'Unknown') return;
    
    try {
        let companyData = companyMetadataCache.get(companyName);
        
        if (!companyData) {
            companyData = await loadCompanyMetadata(companyName);
            companyMetadataCache.set(companyName, companyData);
        }
        
        // Create company details modal/panel
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
        
        // Update cache
        const existingData = companyMetadataCache.get(companyName) || {};
        companyMetadataCache.set(companyName, { ...existingData, ...metadata });
        
        showMessage('Company details saved', 'success', 2000);
        closeCompanyModal();
        
    } catch (error) {
        console.error('Error saving company details:', error);
        showMessage('Failed to save company details', 'error');
    }
}

function preserveSelection() {
    // Preserve selection by finding the job in filtered results
    const jobIndex = filteredJobs.findIndex(job => job.id === selectedJobId);
    if (jobIndex >= 0) {
        selectedIndex = jobIndex;
        // Re-highlight the selected row
        setTimeout(() => {
            const selectedRow = document.querySelector(`[data-index="${selectedIndex}"]`);
            if (selectedRow) {
                selectedRow.classList.add('selected');
            }
        }, 0);
    } else {
        // Job no longer in filtered results
        selectedIndex = -1;
        selectedJobId = null;
        clearSelection();
    }
}

function clearSelection() {
    document.getElementById('detailsPanel').innerHTML = `
        <div class="no-selection">← Select a job to view details</div>
    `;
}

function handleKeyPress(event) {
    if (filteredJobs.length === 0) return;
    
    switch(event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (selectedIndex < Math.min(filteredJobs.length - 1, UI_CONFIG.MAX_VISIBLE_JOBS - 1)) {
                selectJob(selectedIndex + 1);
            }
            break;
        case 'ArrowUp':
            event.preventDefault();
            if (selectedIndex > 0) {
                selectJob(selectedIndex - 1);
            } else if (selectedIndex === -1 && filteredJobs.length > 0) {
                selectJob(0);
            }
            break;
        case 'Enter':
            if (selectedJobId) {
                const job = filteredJobs[selectedIndex];
                window.open(job.job_url, '_blank');
            }
            break;
        case 'Escape':
            // Clear search for large datasets
            if (document.getElementById('searchInput').value) {
                document.getElementById('searchInput').value = '';
                filterJobs(true);
            }
            break;
        case 'i':
            // Quick irrelevant marking
            if (selectedJobId && event.ctrlKey) {
                event.preventDefault();
                updateJobStatus(selectedJobId, 'irrelevant');
            }
            break;
    }
}

// Performance monitoring function
function getPerformanceStats() {
    return {
        ...performanceMetrics,
        visibleJobs: filteredJobs.length,
        totalJobs: allJobs.length,
        companyCache: companyMetadataCache.size,
        memoryUsage: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB'
        } : 'Not available'
    };
}