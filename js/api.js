// API layer - all backend communication

const API_BASE = CONFIG.API_BASE;

async function loadJobs() {
    const query = document.getElementById('querySelect').value;
    
    try {
        const response = await fetch(`${API_BASE}/${query}?order=date_scraped.desc`);
        const data = await response.json();
        
        // Ensure we have an array
        if (Array.isArray(data)) {
            return data;
        } else {
            console.error('API returned non-array data:', data);
            throw new Error('API returned unexpected data format');
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        throw error;
    }
}

async function loadJobDetails(jobId) {
    try {
        const response = await fetch(`${API_BASE}/job_details?id=eq.${jobId}`);
        const details = await response.json();
        return details.length > 0 ? details[0] : null;
    } catch (error) {
        console.error('Error loading job details:', error);
        throw error;
    }
}

async function updateJobStatus(jobId, status) {
    if (isUpdating) return; // Prevent concurrent updates
    
    isUpdating = true;
    const statusSelect = document.querySelector('.status-select');
    if (statusSelect) {
        statusSelect.classList.add('status-updating');
        statusSelect.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE}/job_user_metadata?job_id=eq.${jobId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, reviewed: true })
        });
        
        // Check if any rows were actually updated
        const contentRange = response.headers.get('Content-Range');
        const noRowsUpdated = contentRange === '*/*' || contentRange === '*/0';
        
        if (response.status === 404 || noRowsUpdated) {
            const createResponse = await fetch(`${API_BASE}/job_user_metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: jobId, status, reviewed: true })
            });
            
            if (!createResponse.ok) {
                throw new Error(`Failed to create status record: ${createResponse.status}`);
            }
        }
        
        // Update local data
        const job = allJobs.find(j => j.id === jobId);
        if (job) {
            job.status = status;
            job.reviewed = true;
        }
        
        // Re-render table without resetting selection
        filterJobs(false);
        showMessage(`Status updated to "${status}"`, 'success', 2000);
        
    } catch (error) {
        console.error('Error updating status:', error);
        showMessage(`Failed to update status: ${error.message}`, 'error');
        
        // Reset the dropdown to previous value
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

async function updateJobNotes(jobId, notes) {
    if (isUpdating) return; // Prevent concurrent updates
    
    isUpdating = true;
    const notesInput = document.querySelector('.notes-input');
    if (notesInput) {
        notesInput.classList.add('notes-updating');
        notesInput.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE}/job_user_metadata?job_id=eq.${jobId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_notes: notes, reviewed: true })
        });
        
        // Check if any rows were actually updated
        const contentRange = response.headers.get('Content-Range');
        const noRowsUpdated = contentRange === '*/*' || contentRange === '*/0';
        
        if (response.status === 404 || noRowsUpdated) {
            const createResponse = await fetch(`${API_BASE}/job_user_metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: jobId, user_notes: notes, reviewed: true })
            });
            
            if (!createResponse.ok) {
                throw new Error(`Failed to create notes record: ${createResponse.status}`);
            }
        }
        
        // Update local data
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

async function exportCSV() {
    try {
        if (filteredJobs.length === 0) {
            showMessage('No jobs to export in current filter', 'error');
            return;
        }
        
        // Get detailed data for filtered jobs only
        const jobIds = filteredJobs.map(job => job.id);
        const jobIdParams = jobIds.map(id => `id=eq.${id}`).join('&');
        
        const response = await fetch(`${API_BASE}/job_board_export?${jobIdParams}`);
        const jobs = await response.json();
        
        if (jobs.length === 0) {
            showMessage('No detailed data found for filtered jobs', 'error');
            return;
        }
        
        // Create CSV content
        const headers = Object.keys(jobs[0]);
        const csvContent = [
            headers.join(','),
            ...jobs.map(job => 
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
        
        // Include filter info in filename
        const search = document.getElementById('searchInput').value;
        const status = document.getElementById('statusFilter').value;
        const query = document.getElementById('querySelect').value;
        
        let filename = `jobs_export_${new Date().toISOString().split('T')[0]}`;
        if (status) filename += `_${status}`;
        if (search) filename += `_search`;
        if (query !== 'job_board_main') filename += `_${query.replace('job_board_', '')}`;
        filename += '.csv';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showMessage(`Exported ${jobs.length} filtered jobs to CSV`, 'success');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showMessage('Error exporting CSV', 'error');
    }
}