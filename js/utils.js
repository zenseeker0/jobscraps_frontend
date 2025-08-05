// Enhanced utility functions with Phase 4 progress indicators and analytics
// Comprehensive progress feedback system for bulk operations

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
    // Create message container if it doesn't exist
    let container = document.getElementById('messageContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'messageContainer';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '10000';
        document.body.appendChild(container);
    }
    
    const message = document.createElement('div');
    message.className = `${type}-message`;
    message.textContent = text;
    message.style.marginBottom = '10px';
    message.style.padding = '12px 16px';
    message.style.borderRadius = '6px';
    message.style.maxWidth = '400px';
    message.style.wordWrap = 'break-word';
    message.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    message.style.fontSize = '14px';
    message.style.fontWeight = '500';
    
    // Style based on message type
    switch(type) {
        case 'success':
            message.style.background = '#dcfce7';
            message.style.color = '#166534';
            message.style.border = '1px solid #bbf7d0';
            break;
        case 'error':
            message.style.background = '#fee2e2';
            message.style.color = '#dc2626';
            message.style.border = '1px solid #fecaca';
            break;
        case 'warning':
            message.style.background = '#fef3c7';
            message.style.color = '#92400e';
            message.style.border = '1px solid #fed7aa';
            break;
        case 'info':
        default:
            message.style.background = '#dbeafe';
            message.style.color = '#1d4ed8';
            message.style.border = '1px solid #bfdbfe';
            break;
    }
    
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
    const totalElement = document.getElementById('totalJobs');
    const filteredElement = document.getElementById('filteredTotal');
    const selectedElement = document.getElementById('selectedIndex');
    
    if (totalElement) totalElement.textContent = formatLargeNumber(allJobs.length);
    if (filteredElement) filteredElement.textContent = formatLargeNumber(filteredJobs.length);
    if (selectedElement) selectedElement.textContent = selectedIndex >= 0 ? selectedIndex + 1 : 0;
    
    if (filteredJobs.length > UI_CONFIG.MAX_VISIBLE_JOBS) {
        const statsElement = document.querySelector('.stats');
        if (statsElement) {
            let performanceNote = document.getElementById('performanceNote');
            if (!performanceNote) {
                performanceNote = document.createElement('span');
                performanceNote.id = 'performanceNote';
                performanceNote.style.color = '#f59e0b';
                performanceNote.style.fontSize = '11px';
                performanceNote.style.marginLeft = '8px';
                statsElement.appendChild(performanceNote);
            }
            performanceNote.textContent = `(showing first ${formatLargeNumber(UI_CONFIG.MAX_VISIBLE_JOBS)})`;
        }
    } else {
        const performanceNote = document.getElementById('performanceNote');
        if (performanceNote) {
            performanceNote.remove();
        }
    }
}

function formatLargeNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

function formatPercentage(value, total) {
    if (total === 0) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
}

function formatDuration(milliseconds) {
    if (milliseconds < 1000) {
        return `${Math.round(milliseconds)}ms`;
    } else if (milliseconds < 60000) {
        return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
        return `${Math.round(milliseconds / 60000)}m ${Math.round((milliseconds % 60000) / 1000)}s`;
    }
}

// Phase 4: Loading spinner for general operations
function showLoadingSpinner(message = 'Loading...') {
    // Remove existing spinner if any
    hideLoadingSpinner();
    
    const spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner-content">
            <div class="spinner-icon">⟳</div>
            <div class="spinner-text">${message}</div>
        </div>
    `;
    
    // Add styles if not already present
    if (!document.getElementById('spinnerStyles')) {
        const style = document.createElement('style');
        style.id = 'spinnerStyles';
        style.textContent = `
            .loading-spinner {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.95);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                text-align: center;
            }
            .spinner-icon {
                font-size: 24px;
                animation: spin 1s linear infinite;
                margin-bottom: 8px;
            }
            .spinner-text {
                font-size: 14px;
                color: #64748b;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(spinner);
    return spinner;
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.remove();
    }
}

// Phase 4: Performance monitoring and analytics
function logPerformanceMetrics(operation, duration, additionalData = {}) {
    const logData = {
        operation,
        duration: Math.round(duration),
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    
    if (UI_CONFIG.DEBUG_MODE) {
        const memory = getMemoryUsage();
        console.group(`🔍 Performance: ${operation}`);
        console.log(`Duration: ${formatDuration(duration)}`);
        if (memory) {
            console.log(`Memory: ${memory.used}MB / ${memory.total}MB (limit: ${memory.limit}MB)`);
        }
        if (Object.keys(additionalData).length > 0) {
            console.log('Additional data:', additionalData);
        }
        console.groupEnd();
    }
    
    // Store metrics for analytics (safe check for undefined)
    if (typeof workflowAnalytics !== 'undefined' && workflowAnalytics.session) {
        if (!workflowAnalytics.session.performanceMetrics) {
            workflowAnalytics.session.performanceMetrics = [];
        }
        
        workflowAnalytics.session.performanceMetrics.push({
            ...logData,
            memory: getMemoryUsage()
        });
    }
}

function getMemoryUsage() {
    if (performance.memory) {
        return {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
    }
    return null;
}

// Phase 4: Error handling utilities
function showRetryableError(errorDetails) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message retryable';
    errorEl.innerHTML = `
        <div class="error-content">
            <span class="error-text">${errorDetails.message}</span>
            <button class="error-retry-btn" onclick="retryLastOperation()">🔄 Retry</button>
            <button class="error-dismiss-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
    `;
    
    // Add error styles if not present
    if (!document.getElementById('errorStyles')) {
        const style = document.createElement('style');
        style.id = 'errorStyles';
        style.textContent = `
            .error-message.retryable {
                background: #fef2f2;
                border: 1px solid #fecaca;
                border-left: 4px solid #ef4444;
                border-radius: 6px;
                padding: 12px;
                margin: 10px 0;
            }
            .error-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .error-text {
                flex: 1;
                color: #dc2626;
                font-size: 14px;
            }
            .error-retry-btn, .error-dismiss-btn {
                padding: 4px 8px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                background: white;
            }
            .error-retry-btn:hover {
                background: #f3f4f6;
                border-color: #ef4444;
            }
            .error-dismiss-btn:hover {
                background: #f3f4f6;
            }
        `;
        document.head.appendChild(style);
    }
    
    let container = document.getElementById('messageContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'messageContainer';
        document.body.appendChild(container);
    }
    container.appendChild(errorEl);
}

// Phase 4: Analytics and session utilities
function getSessionSummary() {
    if (typeof workflowAnalytics === 'undefined') {
        return { error: 'Analytics not initialized' };
    }
    
    const duration = Date.now() - workflowAnalytics.session.startTime;
    const metrics = workflowAnalytics.session.metrics;
    
    return {
        sessionDuration: formatDuration(duration),
        jobsViewed: metrics.jobsViewed ? metrics.jobsViewed.size : 0,
        statusUpdates: metrics.statusUpdates || 0,
        bulkOperations: metrics.bulkOperations || 0,
        undoOperations: metrics.undoOperations || 0,
        errorCount: metrics.errorCount || 0,
        averageDecisionTime: formatDuration(metrics.averageDecisionTime || 0),
        jobsPerMinute: Math.round(((metrics.jobsViewed ? metrics.jobsViewed.size : 0) / duration) * 60000 * 10) / 10,
        memoryUsage: getMemoryUsage()
    };
}

function exportSessionAnalytics() {
    const summary = getSessionSummary();
    const analytics = {
        summary,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_analytics_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showMessage('Session analytics exported', 'success');
}

// Phase 4: Advanced filtering utilities
function showPerformanceWarning(jobCount, threshold = UI_CONFIG.MAX_VISIBLE_JOBS) {
    if (jobCount > threshold) {
        showMessage(
            `⚠️ Large result set (${formatLargeNumber(jobCount)} jobs). ` +
            `Showing first ${formatLargeNumber(threshold)} for performance. ` +
            `Use search to filter results.`,
            'warning', 8000
        );
    }
}

// Performance monitoring for large datasets
function monitorPerformance() {
    if (typeof workflowAnalytics === 'undefined') return;
    
    const memory = getMemoryUsage();
    if (memory && memory.used > memory.limit * 0.8) {
        showMessage(
            `⚠️ High memory usage detected (${memory.used}MB). Consider refreshing the page or using more specific filters.`,
            'warning', 10000
        );
    }
}

// Basic retry functionality
function retryLastOperation() {
    showMessage('Retry functionality would be implemented based on specific error context', 'info');
}

// Phase 4: Keyboard shortcut helper stub (for workflow.js compatibility)  
function showShortcutHelp() {
    showMessage('Keyboard shortcuts: ↑↓ to navigate, Enter to open job, Escape to clear search', 'info', 5000);
}

// Initialize basic performance monitoring
if (typeof window !== 'undefined') {
    // Set up periodic memory monitoring
    setInterval(monitorPerformance, 60000); // Every minute
    
    // Global error handlers
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showMessage('An unexpected error occurred. Check console for details.', 'error');
    });
    
    window.addEventListener('error', function(event) {
        console.error('JavaScript error:', event.error);
        showMessage('A JavaScript error occurred. Check console for details.', 'error');
    });
}

console.log('📦 Utils loaded successfully');