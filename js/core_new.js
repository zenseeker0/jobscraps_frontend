console.log('🆕 FIXED STATUS FILTERING CORE.JS LOADED!');

// Core application logic and state management
// FIXED: Status filtering and updating issues

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

// Job selection management for bulk operations
let selectedJobs = new Set();

// Event listeners setup
document.addEventListener('DOMContentLoaded', initializeApp);
document.addEventListener('keydown', handleKeyPress);

async function initializeApp() {
    // Show loading indicator for larger dataset
    showMessage('Loading job board...', 'info');
    
    // Initialize event listeners
    document.getElementById('querySelect').addEventListener('change', loadAndDisplayJobs);
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, UI_CONFIG.SEARCH_DEBOUNCE_MS));
    document.getElementById('statusFilter').addEventListener('change', () => handleSearch());
    
    // Load initial data
    await loadAndDisplayJobs();
}

// ENHANCED: Centralized search handler that can use API-level filtering for better performance
async function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const statusValue = document.getElementById('statusFilter').value;
    
    // For large datasets, use API-level filtering when possible
    if (allJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS && (searchTerm || statusValue)) {
        console.log('🔍 Using API-level filtering for large dataset');
        
        try {
            const filters = {};
            if (searchTerm) filters.search = searchTerm;
            if (statusValue) filters.status = statusValue;
            
            const filteredData = await loadJobsWithFilters(filters);
            allJobs = filteredData; // Replace allJobs with filtered results
            filteredJobs = [...allJobs]; // No additional frontend filtering needed
            
            renderJobs();
            updateStats();
            clearSelection();
            
        } catch (error) {
            console.error('API-level filtering failed, falling back to frontend filtering:', error);
            filterJobs(true); // Fallback to frontend filtering
        }
    } else {
        // Use frontend filtering for smaller datasets or when no search terms
        filterJobs(true);
    }
}

async function loadAndDisplayJobs() {
    const startTime = performance.now();
    
    try {
        showMessage('Loading jobs from database...', 'info');
        
        allJobs = await loadJobs();
        performanceMetrics.jobsLoaded = allJobs.length;
        
        // Since database views handle exclusion logic, we should have the right jobs
        console.log(`📊 Loaded ${allJobs.length} jobs (database views handle exclusion logic)`);
        const statusCounts = {};
        allJobs.forEach(job => {
            const status = job.status || 'unreviewed';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log('📊 STATUS BREAKDOWN:', statusCounts);

        // Performance warning for very large datasets (should be rare now)
        if (allJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS) {
            showMessage(
                `⚠️ Large dataset detected (${allJobs.length.toLocaleString()} jobs). ` +
                `Consider using more specific query or filters.`, 
                'warning', 
                6000
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
            '<tr><td colspan="7" class="loading">Error loading jobs. Check PostgREST connection.</td></tr>';
    }
}

// FIXED: Frontend filtering with better status logic - database views handle exclusion
function filterJobs(resetSelection = true) {
    const startTime = performance.now();

    // — PREP SEARCH & STATUS —
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const statusValue = document.getElementById('statusFilter').value;

    // — LOG ENTRY STATE —
    console.log('🔍 filterJobs start', {
        totalJobs: allJobs.length,
        searchTerm,
        statusValue
    });

    // Start with all jobs (database views handle exclusion logic)
    let visibleJobs = [...allJobs];

    // — 1) SEARCH FILTER (enhanced with exact ID matching) —
    if (searchTerm) {
        visibleJobs = visibleJobs.filter(job => {
            const title = (job.title || '').toLowerCase();
            const company = (job.company || '').toLowerCase();
            const id = (job.id || '').toLowerCase();
            const location = (job.location || '').toLowerCase();
            
            // Exact ID match gets priority
            if (id === searchTerm) return true;
            
            // Otherwise search in title, company, and location
            return (
                title.includes(searchTerm) ||
                company.includes(searchTerm) ||
                location.includes(searchTerm)
            );
        });
        console.log('‣ after search filter:', visibleJobs.length);
    }

    // — 2) FIXED STATUS FILTER —
    if (statusValue) {
        console.log(`🔍 Filtering by status: "${statusValue}"`);
        let matchCount = 0; // Track matches for debugging
        
        visibleJobs = visibleJobs.filter(job => {
            // FIXED: Check status field directly from the API response
            const jobStatus = job.status;
            const jobReviewed = job.reviewed;
            
            let matches = false;
            
            if (statusValue === 'unreviewed') {
                // Unreviewed means no status (empty string or null) AND not marked as reviewed
                matches = (!jobStatus || jobStatus === '' || jobStatus === 'unreviewed') && 
                         (!jobReviewed || jobReviewed === false);
            } else {
                // For specific statuses, match exactly
                matches = jobStatus === statusValue;
            }
            
            // Limited debugging - only log first few matches
            if (matches && matchCount < 3) {
                console.log(`  ✅ Match found: ${job.id} (status: "${jobStatus}")`);
                matchCount++;
            }
            
            return matches;
        });
        
        console.log(`‣ Found ${visibleJobs.length} jobs with status "${statusValue}"`);
    
        // Special debugging for irrelevant status
        if (statusValue === 'irrelevant') {
            console.log('🔍 IRRELEVANT DEBUG:');
            console.log('Total jobs loaded:', allJobs.length);
            
            const irrelevantJobs = allJobs.filter(job => 
                job.status && job.status.toLowerCase() === 'irrelevant'
            );
            console.log('Jobs with irrelevant status:', irrelevantJobs.length);
            
            if (irrelevantJobs.length > 0) {
                console.log('Sample irrelevant job:', irrelevantJobs[0]);
            }
            
            // Check if any jobs have status containing irrelevant
            const partialMatches = allJobs.filter(job => 
                job.status && job.status.toLowerCase().includes('irrelevant')
            );
            console.log('Jobs with status containing "irrelevant":', partialMatches.length);
        }
    }

    // — 3) PERFORMANCE-BASED TRUNCATION —
    if (!searchTerm && !statusValue && visibleJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS) {
        filteredJobs = visibleJobs.slice(0, UI_CONFIG.MAX_VISIBLE_JOBS);
        showMessage(
            `⚠️ Showing first ${UI_CONFIG.MAX_VISIBLE_JOBS.toLocaleString()} of ` +
            `${visibleJobs.length.toLocaleString()} jobs. Use search or filters to narrow results.`,
            'info',
            5000
        );
    } else {
        filteredJobs = visibleJobs;
    }

    // — 4) TIMING & DEBUG LOG —
    performanceMetrics.filterTime = performance.now() - startTime;
    if (UI_CONFIG.DEBUG_MODE) {
        console.log(
            `filterJobs completed: ${filteredJobs.length} jobs in ` +
            `${performanceMetrics.filterTime.toFixed(1)}ms`
        );
    }

    // — 5) RENDER & STATS —
    renderJobs();
    updateStats();

    // — 6) SELECTION HANDLING —
    if (resetSelection) {
        clearSelection();
    } else {
        preserveSelection();
    }
}

// ENHANCED: More efficient rendering with virtual scrolling preparation
function renderJobs() {
    console.log('🔄 OPTIMIZED renderJobs function is running!');
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
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    jobsToRender.forEach((job, index) => {
        const row = document.createElement('tr');
        row.className = 'job-row';
        row.setAttribute('data-job-id', job.id);
        row.setAttribute('data-index', index);
        row.onclick = () => selectJob(index);
        
        // FIXED: Better status display with debugging
        const displayStatus = job.status || 'unreviewed';
        const statusShortcut = getStatusShortcut(displayStatus);
        
        // Build row content with enhanced status display
        row.innerHTML = `
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
                <span class="status-badge status-${displayStatus}">
                    ${displayStatus}
                </span>
                ${statusShortcut ? `<span class="status-shortcut">${statusShortcut}</span>` : ''}
                ${job.exclusion_reason ? `<div class="exclusion-reason">${escapeHtml(job.exclusion_reason)}</div>` : ''}
            </td>
            <td class="salary">${formatSalary(job)}</td>
            <td>${formatDate(job.date_posted)}</td>
        `;
        
        fragment.appendChild(row);
    });
    
    // Clear and populate tbody
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
    
    console.log('✅ Table updated with', tbody.children.length, 'rows');
    
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

// HELPER: Get keyboard shortcut for status
function getStatusShortcut(status) {
    const shortcuts = {
        'interested': '1',
        'applied': '2',
        'followed-up': '3',
        'rejected': '4',
        'irrelevant': '5'
    };
    return shortcuts[status] || '';
}

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
    
    // FIXED: Display current status correctly
    const currentStatus = job.status || '';
    console.log(`Rendering details for job ${job.id}, current status: "${currentStatus}"`);
    
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
                <option value="interested" ${currentStatus === 'interested' ? 'selected' : ''}>🟦 Interested (1)</option>
                <option value="applied" ${currentStatus === 'applied' ? 'selected' : ''}>🟢 Applied (2)</option>
                <option value="followed-up" ${currentStatus === 'followed-up' ? 'selected' : ''}>🟡 Followed Up (3)</option>
                <option value="rejected" ${currentStatus === 'rejected' ? 'selected' : ''}>🔴 Rejected (4)</option>
                <option value="irrelevant" ${currentStatus === 'irrelevant' ? 'selected' : ''}>⚪ Irrelevant (5)</option>
            </select>
            <a href="${job.job_url}" target="_blank" style="color: #3b82f6; text-decoration: none;">🔗 View Job</a>
            ${job.job_url_direct ? `<a href="${job.job_url_direct}" target="_blank" style="color: #3b82f6; text-decoration: none;">🎯 Direct Link</a>` : ''}
            <button onclick="debugJobData('${job.id}')" style="font-size: 11px; background: #64748b;">🐛 Debug</button>
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

// DEBUG FUNCTION: Help troubleshoot status issues
function debugJobData(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    console.group(`🐛 Debug Job Data: ${jobId}`);
    console.log('Full job object:', job);
    console.log('Status field:', job?.status);
    console.log('Reviewed field:', job?.reviewed);
    console.log('User notes:', job?.user_notes);
    console.log('Excluded:', job?.excluded);
    console.log('Exclusion reason:', job?.exclusion_reason);
    console.groupEnd();
    
    // Show in UI too
    showMessage(`Debug: Job ${jobId} status="${job?.status}" reviewed=${job?.reviewed}`, 'info', 5000);
}

// Company metadata functionality (unchanged)
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

// ENHANCED: Keyboard shortcuts with status setting
function handleKeyPress(event) {
    if (filteredJobs.length === 0) return;
    
    // Don't trigger shortcuts when typing in inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
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
                handleSearch();
            }
            break;
        case '1':
            if (selectedJobId) {
                event.preventDefault();
                updateJobStatus(selectedJobId, 'interested');
            }
            break;
        case '2':
            if (selectedJobId) {
                event.preventDefault();
                updateJobStatus(selectedJobId, 'applied');
            }
            break;
        case '3':
            if (selectedJobId) {
                event.preventDefault();
                updateJobStatus(selectedJobId, 'followed-up');
            }
            break;
        case '4':
            if (selectedJobId) {
                event.preventDefault();
                updateJobStatus(selectedJobId, 'rejected');
            }
            break;
        case '5':
            if (selectedJobId) {
                event.preventDefault();
                updateJobStatus(selectedJobId, 'irrelevant');
            }
            break;
        case ' ':
            // Space bar moves to next job
            if (selectedIndex < Math.min(filteredJobs.length - 1, UI_CONFIG.MAX_VISIBLE_JOBS - 1)) {
                event.preventDefault();
                selectJob(selectedIndex + 1);
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
        selectedJobs: selectedJobs.size,
        memoryUsage: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB'
        } : 'Not available'
    };
}

console.log('✅ FIXED STATUS FILTERING - Core application loaded successfully');