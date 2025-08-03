// Core application logic and state management

// Global state variables
let allJobs = [];
let filteredJobs = [];
let selectedIndex = -1;
let selectedJobId = null;
let isUpdating = false; // Prevent race conditions

// Event listeners setup
document.addEventListener('DOMContentLoaded', initializeApp);
document.addEventListener('keydown', handleKeyPress);

async function initializeApp() {
    // Initialize event listeners
    document.getElementById('querySelect').addEventListener('change', loadAndDisplayJobs);
    document.getElementById('searchInput').addEventListener('input', debounce(filterJobs, 300));
    document.getElementById('statusFilter').addEventListener('change', () => filterJobs(false));
    
    // Load initial data
    await loadAndDisplayJobs();
}

async function loadAndDisplayJobs() {
    try {
        allJobs = await loadJobs();
        filterJobs(false);
        updateStats();
    } catch (error) {
        showMessage('Error loading jobs. Check PostgREST connection.', 'error');
        document.getElementById('jobsTableBody').innerHTML = 
            '<tr><td colspan="6" class="loading">Error loading jobs. Check PostgREST connection.</td></tr>';
    }
}

function filterJobs(resetSelection = true) {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    
    filteredJobs = allJobs.filter(job => {
        const matchesSearch = !search || 
            (job.title && job.title.toLowerCase().includes(search)) ||
            (job.company && job.company.toLowerCase().includes(search));
        
        const matchesStatus = !status || 
            (status === 'unreviewed' && !job.status) ||
            job.status === status;
        
        return matchesSearch && matchesStatus;
    });
    
    renderJobs();
    updateStats();
    
    // Only reset selection if explicitly requested (not during status updates)
    if (resetSelection) {
        selectedIndex = -1;
        selectedJobId = null;
        clearSelection();
    } else if (selectedJobId) {
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
}

function renderJobs() {
    const tbody = document.getElementById('jobsTableBody');
    
    if (filteredJobs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No jobs found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredJobs.map((job, index) => `
        <tr class="job-row" data-job-id="${job.id}" data-index="${index}" onclick="selectJob(${index})">
            <td class="job-title">${escapeHtml(job.title || 'No Title')}</td>
            <td class="job-company">${escapeHtml(job.company || 'Unknown')}</td>
            <td>
                ${escapeHtml(job.location || 'N/A')}
                ${job.is_remote ? '<span class="remote-badge">Remote</span>' : ''}
            </td>
            <td>
                <span class="status-badge status-${job.status || 'unreviewed'}">
                    ${job.status || 'unreviewed'}
                </span>
            </td>
            <td class="salary">${formatSalary(job)}</td>
            <td>${formatDate(job.date_posted)}</td>
        </tr>
    `).join('');
}

function selectJob(index) {
    selectedIndex = index;
    selectedJobId = filteredJobs[index].id;
    
    // Update table selection
    document.querySelectorAll('.job-row').forEach(row => row.classList.remove('selected'));
    document.querySelector(`[data-index="${index}"]`).classList.add('selected');
    
    // Scroll to selected row
    const selectedRow = document.querySelector(`[data-index="${index}"]`);
    selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Load job details
    loadAndDisplayJobDetails(selectedJobId);
    updateStats();
}

async function loadAndDisplayJobDetails(jobId) {
    try {
        const job = await loadJobDetails(jobId);
        if (job) {
            renderJobDetails(job);
        }
    } catch (error) {
        showMessage('Error loading job details.', 'error');
    }
}

function renderJobDetails(job) {
    const panel = document.getElementById('detailsPanel');
    
    panel.innerHTML = `
        <div class="details-header">
            <div class="details-title">${escapeHtml(job.title)}</div>
            <div class="details-company">${escapeHtml(job.company)}</div>
            <div class="details-meta">
                <div>📍 ${escapeHtml(job.location || 'Not specified')}</div>
                <div>🏢 ${escapeHtml(job.company_industry || 'Unknown industry')}</div>
                <div>💼 ${escapeHtml(job.job_type || 'Not specified')}</div>
                <div>🎯 ${escapeHtml(job.job_level || 'Not specified')}</div>
            </div>
        </div>
        
        <div class="details-actions">
            <select class="status-select" onchange="updateJobStatus('${job.id}', this.value)" ${isUpdating ? 'disabled' : ''}>
                <option value="">Set Status</option>
                <option value="interested" ${job.status === 'interested' ? 'selected' : ''}>Interested</option>
                <option value="applied" ${job.status === 'applied' ? 'selected' : ''}>Applied</option>
                <option value="followed-up" ${job.status === 'followed-up' ? 'selected' : ''}>Followed Up</option>
                <option value="rejected" ${job.status === 'rejected' ? 'selected' : ''}>Rejected</option>
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
            if (selectedIndex < filteredJobs.length - 1) {
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
    }
}