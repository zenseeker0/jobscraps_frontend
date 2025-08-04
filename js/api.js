// API layer - FIXED: Add proper exclusion filtering at database level
// This ensures excluded jobs are filtered OUT before reaching the frontend

async function loadJobs() {
    const query = document.getElementById('querySelect').value;
    
    try {
        const loadingSpinner = showLoadingSpinner('Loading jobs from database...');
        const startTime = performance.now();
        
        // Add reasonable limits to prevent 674 MB downloads!
        const limit = UI_CONFIG.MAX_VISIBLE_JOBS || 5000;
        
        // FIXED: Add exclusion filtering at the API level
        // This prevents excluded jobs from ever reaching the frontend
        let url = `${CONFIG.API_BASE}/${query}?order=date_scraped.desc&limit=${limit}`;
        
        // CRITICAL FIX: Filter out excluded jobs at the database level
        // This handles jobs where excluded=true OR user_metadata->>'excluded'='true'
        url += '&or=(excluded.is.null,excluded.eq.false)';
        
        // Additional safety: exclude jobs with exclusion_reason (fallback)
        url += '&exclusion_reason=is.null';
        
        console.log(`🔄 Loading jobs from: ${url}`);
        
        const response = await fetch(url);
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Get response text first to debug
        const responseText = await response.text();
        console.log(`📊 Response length: ${responseText.length} chars`);
        console.log('First 200 chars:', responseText.substring(0, 200));
        
        let data;
        if (responseText.length === 0) {
            throw new Error('Empty response from server');
        }
        
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('JSON Parse Error:', jsonError);
            console.error('Response text sample:', responseText.substring(0, 1000));
            throw new Error(`Invalid JSON response: ${jsonError.message}`);
        }
        
        const loadTime = performance.now() - startTime;
        hideLoadingSpinner();
        
        logPerformanceMetrics('loadJobs', loadTime, {
            query: query,
            jobCount: Array.isArray(data) ? data.length : 1,
            responseSize: responseText.length,
            requestedLimit: limit,
            exclusionFilterApplied: true
        });
        
        if (Array.isArray(data)) {
            console.log(`✅ Successfully loaded ${data.length} jobs (limit: ${limit}, excluded jobs filtered out)`);
            
            // Show info about the dataset size
            showMessage(
                `📊 Loaded ${formatLargeNumber(data.length)} jobs (excluded jobs filtered out at database level).`,
                'info', 4000
            );
            
            return data;
        } else {
            console.error('API returned non-array data:', data);
            throw new Error('API returned unexpected data format');
        }
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading jobs:', error);
        showMessage(`Failed to load jobs: ${error.message}`, 'error');
        throw error;
    }
}

// ENHANCED: Load jobs with specific filters for better performance
async function loadJobsWithFilters(additionalFilters = {}) {
    const query = document.getElementById('querySelect').value;
    
    try {
        const loadingSpinner = showLoadingSpinner('Loading filtered jobs...');
        const startTime = performance.now();
        
        const limit = UI_CONFIG.MAX_VISIBLE_JOBS || 5000;
        let url = `${CONFIG.API_BASE}/${query}?order=date_scraped.desc&limit=${limit}`;
        
        // ALWAYS exclude excluded jobs at the database level
        url += '&or=(excluded.is.null,excluded.eq.false)';
        url += '&exclusion_reason=is.null';
        
        // Add any additional filters
        Object.entries(additionalFilters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                if (key === 'search') {
                    // Handle search across title and company
                    url += `&or=(title.ilike.*${encodeURIComponent(value)}*,company.ilike.*${encodeURIComponent(value)}*)`;
                } else if (key === 'status') {
                    if (value === 'unreviewed') {
                        url += '&or=(status.is.null,status.eq.)&reviewed=not.eq.true';
                    } else {
                        url += `&status=eq.${encodeURIComponent(value)}`;
                    }
                } else {
                    url += `&${key}=eq.${encodeURIComponent(value)}`;
                }
            }
        });
        
        console.log(`🔄 Loading filtered jobs from: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        let data;
        
        if (responseText.length === 0) {
            data = [];
        } else {
            data = JSON.parse(responseText);
        }
        
        const loadTime = performance.now() - startTime;
        hideLoadingSpinner();
        
        logPerformanceMetrics('loadJobsWithFilters', loadTime, {
            query: query,
            jobCount: Array.isArray(data) ? data.length : 0,
            responseSize: responseText.length,
            filters: additionalFilters
        });
        
        console.log(`✅ Successfully loaded ${data.length} filtered jobs`);
        
        return Array.isArray(data) ? data : [];
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error loading filtered jobs:', error);
        showMessage(`Failed to load filtered jobs: ${error.message}`, 'error');
        throw error;
    }
}

async function loadJobDetails(jobId) {
    try {
        const startTime = performance.now();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(`${CONFIG.API_BASE}/job_details?id=eq.${jobId}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const details = await response.json();
        
        const loadTime = performance.now() - startTime;
        logPerformanceMetrics('loadJobDetails', loadTime, {
            jobId: jobId,
            detailsSize: JSON.stringify(details[0] || {}).length
        });
        
        return details.length > 0 ? details[0] : null;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Job details request timed out');
            showMessage('Job details request timed out', 'error');
        } else {
            console.error('Error loading job details:', error);
        }
        throw error;
    }
}

async function updateJobStatus(jobId, status) {
    if (isUpdating) return;
    
    isUpdating = true;
    const statusSelect = document.querySelector('.status-select');
    if (statusSelect) {
        statusSelect.classList.add('status-updating');
        statusSelect.disabled = true;
    }
    
    try {
        const startTime = performance.now();
        
        // Enhanced: Handle exclusion fields atomically when status is "irrelevant"
        const updateData = { status, reviewed: true };
        
        if (status === 'irrelevant') {
            updateData.excluded = true;
            updateData.exclusion_reason = 'irrelevant';
            updateData.exclusion_sources = JSON.stringify(['manual']);
            updateData.exclusion_applied_at = new Date().toISOString();
        } else if (status && status !== 'irrelevant') {
            updateData.excluded = false;
            updateData.exclusion_reason = null;
            updateData.exclusion_sources = JSON.stringify([]);
            updateData.exclusion_applied_at = null;
        }
        
        const response = await fetch(`${CONFIG.API_BASE}/job_user_metadata?job_id=eq.${jobId}`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const contentRange = response.headers.get('Content-Range');
        const noRowsUpdated = contentRange === '*/*' || contentRange === '*/0';
        
        if (response.status === 404 || noRowsUpdated) {
            const createResponse = await fetch(`${CONFIG.API_BASE}/job_user_metadata`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ job_id: jobId, ...updateData })
            });
            
            if (!createResponse.ok) {
                throw new Error(`Failed to create status record: ${createResponse.status}`);
            }
        }
        
        const updateTime = performance.now() - startTime;
        logPerformanceMetrics('updateJobStatus', updateTime, {
            jobId: jobId,
            status: status,
            operation: noRowsUpdated ? 'create' : 'update',
            excludedFields: status === 'irrelevant'
        });
        
        // Update local data with all fields
        const job = allJobs.find(j => j.id === jobId);
        if (job) {
            job.status = status;
            job.reviewed = true;
            if (status === 'irrelevant') {
                job.excluded = true;
                job.exclusion_reason = 'irrelevant';
                job.exclusion_sources = ['manual'];
            } else {
                job.excluded = false;
                job.exclusion_reason = null;
                job.exclusion_sources = [];
            }
        }
        
        // IMPORTANT: If job is now excluded, remove it from view immediately
        if (status === 'irrelevant') {
            // Remove from allJobs and filteredJobs to hide it immediately
            const allJobsIndex = allJobs.findIndex(j => j.id === jobId);
            if (allJobsIndex >= 0) {
                allJobs.splice(allJobsIndex, 1);
            }
            
            const filteredIndex = filteredJobs.findIndex(j => j.id === jobId);
            if (filteredIndex >= 0) {
                filteredJobs.splice(filteredIndex, 1);
            }
            
            // Re-render the job list to reflect the change
            renderJobs();
            updateStats();
            
            // Clear selection if this was the selected job
            if (selectedJobId === jobId) {
                clearSelection();
                selectedIndex = -1;
                selectedJobId = null;
            }
            
            showMessage(`Job marked as irrelevant and hidden from view`, 'success', 3000);
        } else {
            filterJobs(false);
            
            let message = `Status updated to "${status}"`;
            showMessage(message, 'success', 2000);
        }
        
    } catch (error) {
        console.error('Error updating status:', error);
        showMessage(`Failed to update status: ${error.message}`, 'error');
        
        if (statusSelect) {
            const job = allJobs.find(j => j.id === jobId);
            statusSelect.value = job?.status || '';
        }
    } finally {
        isUpdating = false;
        if (statusSelect) {
            statusSelect.classList.remove('status-updating');
            statusSelect.disabled = false;
        }
    }
}

// Company metadata functions (unchanged)
async function loadCompanyMetadata(companyName) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/company_user_metadata?company_name=eq.${encodeURIComponent(companyName)}`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error('Error loading company metadata:', error);
        return null;
    }
}

async function updateCompanyMetadata(companyName, metadata) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/company_user_metadata?company_name=eq.${encodeURIComponent(companyName)}`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                ...metadata,
                updated_at: new Date().toISOString()
            })
        });
        
        const contentRange = response.headers.get('Content-Range');
        const noRowsUpdated = contentRange === '*/*' || contentRange === '*/0';
        
        if (response.status === 404 || noRowsUpdated) {
            const createResponse = await fetch(`${CONFIG.API_BASE}/company_user_metadata`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    company_name: companyName,
                    ...metadata,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });
            
            if (!createResponse.ok) {
                throw new Error(`Failed to create company record: ${createResponse.status}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error updating company metadata:', error);
        throw error;
    }
}

async function updateJobNotes(jobId, notes) {
    if (isUpdating) return;
    
    isUpdating = true;
    const notesInput = document.querySelector('.notes-input');
    if (notesInput) {
        notesInput.classList.add('notes-updating');
        notesInput.disabled = true;
    }
    
    try {
        const startTime = performance.now();
        
        const response = await fetch(`${CONFIG.API_BASE}/job_user_metadata?job_id=eq.${jobId}`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ user_notes: notes, reviewed: true })
        });
        
        const contentRange = response.headers.get('Content-Range');
        const noRowsUpdated = contentRange === '*/*' || contentRange === '*/0';
        
        if (response.status === 404 || noRowsUpdated) {
            const createResponse = await fetch(`${CONFIG.API_BASE}/job_user_metadata`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ job_id: jobId, user_notes: notes, reviewed: true })
            });
            
            if (!createResponse.ok) {
                throw new Error(`Failed to create notes record: ${createResponse.status}`);
            }
        }
        
        const updateTime = performance.now() - startTime;
        logPerformanceMetrics('updateJobNotes', updateTime, {
            jobId: jobId,
            notesLength: notes.length,
            operation: noRowsUpdated ? 'create' : 'update'
        });
        
        const job = allJobs.find(j => j.id === jobId);
        if (job) {
            job.user_notes = notes;
            job.reviewed = true;
        }
        
        showMessage('Notes saved', 'success', 1500);
        
    } catch (error) {
        console.error('Error updating notes:', error);
        showMessage(`Failed to save notes: ${error.message}`, 'error');
    } finally {
        isUpdating = false;
        if (notesInput) {
            notesInput.classList.remove('notes-updating');
            notesInput.disabled = false;
        }
    }
}

// Export CSV function with better error handling
async function exportCSV() {
    try {
        if (filteredJobs.length === 0) {
            showMessage('No jobs to export in current filter', 'error');
            return;
        }
        
        // Performance check for large exports
        const exportSize = Math.min(filteredJobs.length, UI_CONFIG.MAX_VISIBLE_JOBS);
        
        if (filteredJobs.length > 10000) {
            const confirmed = confirm(
                `Export ${formatLargeNumber(filteredJobs.length)} jobs? ` +
                `This is a large dataset and may take time to process. ` +
                `Consider filtering results first for better performance.`
            );
            if (!confirmed) return;
        }
        
        const startTime = performance.now();
        const loadingSpinner = showLoadingSpinner(`Preparing export of ${formatLargeNumber(exportSize)} jobs...`);
        
        // Get detailed data for filtered jobs only (respecting display limits)
        const jobsToExport = filteredJobs.slice(0, UI_CONFIG.MAX_VISIBLE_JOBS);
        const jobIds = jobsToExport.map(job => job.id);
        
        // Batch the job IDs for very large exports
        const batchSize = 1000;
        let allExportJobs = [];
        
        for (let i = 0; i < jobIds.length; i += batchSize) {
            const batch = jobIds.slice(i, i + batchSize);
            const jobIdParams = batch.map(id => `id=eq.${id}`).join('&');
            
            // FIXED: Add exclusion filtering to export as well
            let exportUrl = `${CONFIG.API_BASE}/job_board_export?${jobIdParams}`;
            exportUrl += '&or=(excluded.is.null,excluded.eq.false)';
            
            const response = await fetch(exportUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Export batch failed: HTTP ${response.status}`);
            }
            
            const batchJobs = await response.json();
            allExportJobs = allExportJobs.concat(batchJobs);
            
            // Update progress for large exports
            if (jobIds.length > 5000) {
                const progress = Math.min(i + batchSize, jobIds.length);
                const spinner = document.getElementById('loadingSpinner');
                if (spinner) {
                    const text = spinner.querySelector('.spinner-text');
                    if (text) {
                        text.textContent = `Processing ${formatLargeNumber(progress)} of ${formatLargeNumber(jobIds.length)} jobs...`;
                    }
                }
            }
        }
        
        if (allExportJobs.length === 0) {
            hideLoadingSpinner();
            showMessage('No detailed data found for filtered jobs', 'error');
            return;
        }
        
        // Create CSV content
        const headers = Object.keys(allExportJobs[0]);
        const csvContent = [
            headers.join(','),
            ...allExportJobs.map(job => 
                headers.map(header => {
                    const value = job[header] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Include filter info and dataset size in filename
        const search = document.getElementById('searchInput').value;
        const status = document.getElementById('statusFilter').value;
        const query = document.getElementById('querySelect').value;
        
        let filename = `jobs_export_${new Date().toISOString().split('T')[0]}`;
        if (status) filename += `_${status}`;
        if (search) filename += `_search`;
        if (query !== 'job_board_main') filename += `_${query.replace('job_board_', '')}`;
        if (filteredJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS) {
            filename += `_first${UI_CONFIG.MAX_VISIBLE_JOBS}`;
        }
        filename += '.csv';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        const exportTime = performance.now() - startTime;
        hideLoadingSpinner();
        
        logPerformanceMetrics('exportCSV', exportTime, {
            jobsExported: allExportJobs.length,
            totalFiltered: filteredJobs.length,
            csvSize: csvContent.length,
            filename: filename
        });
        
        let message = `Exported ${formatLargeNumber(allExportJobs.length)} jobs to CSV`;
        if (filteredJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS) {
            message += ` (first ${formatLargeNumber(UI_CONFIG.MAX_VISIBLE_JOBS)} of ${formatLargeNumber(filteredJobs.length)})`;
        }
        showMessage(message, 'success');
        
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error exporting CSV:', error);
        showMessage(`Error exporting CSV: ${error.message}`, 'error');
    }
}

console.log('🔌 FIXED API layer loaded successfully - excluded jobs filtered at database level');