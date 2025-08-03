// Shared utility functions with no external dependencies

function formatSalary(job) {
    const currency = job.currency || '$';
    if (job.min_amount && job.max_amount) {
        return `${currency}${Math.round(job.min_amount/1000)}k-${Math.round(job.max_amount/1000)}k`;
    } else if (job.min_amount) {
        return `${currency}${Math.round(job.min_amount/1000)}k+`;
    }
    return '';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr.slice(0, 10);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type = 'info', duration = 4000) {
    const container = document.getElementById('messageContainer');
    const message = document.createElement('div');
    message.className = `${type}-message`;
    message.textContent = text;
    
    container.appendChild(message);
    
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, duration);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateStats() {
    document.getElementById('totalJobs').textContent = allJobs.length;
    document.getElementById('filteredTotal').textContent = filteredJobs.length;
    document.getElementById('selectedIndex').textContent = selectedIndex >= 0 ? selectedIndex + 1 : 0;
}