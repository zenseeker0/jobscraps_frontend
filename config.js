// Configuration for JobScraps Frontend
// API and performance settings for large dataset (444k+ jobs)

// API Configuration
const CONFIG = {
    // PostgREST API endpoint - adjust based on your setup
    API_BASE: 'http://localhost:3001',  // Local PostgREST instance
    
    // Alternative endpoints (uncomment as needed):
    // API_BASE: 'http://192.168.1.31:3001',  // Windows Docker instance
    // API_BASE: 'http://192.168.1.18:3001',  // Mac local instance
    
    // Database connection settings
    DB_SCHEMA: 'public',
    DB_TIMEOUT: 30000  // 30 second timeout for large queries
};

// UI Configuration for Large Dataset Performance
const UI_CONFIG = {
    // Performance settings for 100k+ visible jobs
    MAX_VISIBLE_JOBS: 5000,        // Limit displayed jobs for browser performance
    VIRTUALIZATION_THRESHOLD: 1000, // Consider virtualization above 1k jobs
    SEARCH_DEBOUNCE_MS: 500,       // Increased debounce for large dataset search
    LAZY_LOAD_DETAILS: true,       // Load job details on demand
    BATCH_SIZE: 50,               // Batch size for bulk operations
    
    // Debug and monitoring
    DEBUG_MODE: false,            // Enable performance logging
    PERFORMANCE_MONITORING: true,  // Monitor memory usage
    
    // Export settings
    MAX_EXPORT_SIZE: 10000,       // Warn before exporting more than 10k jobs
    CSV_BATCH_SIZE: 1000,         // Process CSV exports in batches
    
    // UI responsiveness
    RENDER_BATCH_SIZE: 100,       // Render jobs in batches
    SCROLL_DEBOUNCE_MS: 100,      // Scroll event debouncing
    
    // Memory management
    MEMORY_WARNING_THRESHOLD: 0.8, // Warn at 80% memory usage
    AUTO_CLEANUP_THRESHOLD: 1000,  // Clean up after 1000 operations
};

// Workflow Configuration (Phase 4 preparation)
const WORKFLOW_CONFIG = {
    DEFAULT_MODE: 'review',
    SELECTION_LIMITS: {
        max_bulk_selection: 100,
        bulk_export: 5000
    },
    SHORTCUTS_ENABLED: true,
    AUTO_SAVE_INTERVAL: 30000  // Auto-save every 30 seconds
};

// Export for global access
window.CONFIG = CONFIG;
window.UI_CONFIG = UI_CONFIG;  
window.WORKFLOW_CONFIG = WORKFLOW_CONFIG;

console.log('🚀 JobScraps Frontend Config Loaded', {
    apiBase: CONFIG.API_BASE,
    maxVisibleJobs: UI_CONFIG.MAX_VISIBLE_JOBS,
    debugMode: UI_CONFIG.DEBUG_MODE
});