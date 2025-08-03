# JobScraps Personal Job Board - Complete Setup Guide

A professional, keyboard-navigable job board interface for browsing and managing your scraped job data with status tracking, notes, and CSV export capabilities.

## 1. Overview & Architecture

### System Purpose
- **Personal job board** for browsing 362,597+ total scraped jobs (22,351 visible after smart filtering)
- **Smart filtering system** with exclusion rules that preserve data while showing relevant jobs
- **Status tracking** (interested, applied, followed-up, rejected)
- **Keyboard navigation** for efficient job scanning
- **Personal notes** and **filtered CSV export** functionality
- **SQL-based queries** with custom views for different job subsets
- **Modular frontend architecture** for easy maintenance and enhancement

### Frontend Architecture

```
jobscraps_frontend/
├── index.html                 # Clean HTML structure (~90 lines)
├── config.js                  # API configuration (~25 lines)
├── css/
│   └── styles.css            # All styling (~200 lines)
├── js/
│   ├── utils.js              # Utility functions (~100 lines)
│   ├── api.js                # Backend communication (~120 lines)
│   └── core.js               # Application logic (~280 lines)
└── README.md                 # This documentation
```

### System Architecture Diagram

```mermaid
graph TB
    subgraph "Windows 11 (192.168.1.31)"
        PG[(PostgreSQL<br/>jobscraps<br/>362,597 total jobs<br/>22,351 visible)]
        DPR[Docker PostgREST<br/>v12.0.2<br/>Port 3001]
        PG --> DPR
    end
    
    subgraph "Mac (192.168.1.18)"
        LPR[Local PostgREST<br/>v13.0.4<br/>Port 3001]
        WEB[HTTP Server<br/>Port 8080]
        BROWSER[Web Browser<br/>Job Board UI]
        
        WEB --> BROWSER
        BROWSER --> LPR
    end
    
    subgraph "Frontend Architecture"
        BROWSER --> HTML[index.html<br/>Clean Structure]
        HTML --> CSS[css/styles.css<br/>All Styling]
        HTML --> UTILS[js/utils.js<br/>Utilities]
        HTML --> API[js/api.js<br/>API Layer]
        HTML --> CORE[js/core.js<br/>App Logic]
    end
    
    subgraph "Network Connection"
        LPR -.->|Database Queries| PG
    end
    
    subgraph "Data Flow"
        BROWSER -->|1. Browse Jobs| LPR
        LPR -->|2. SQL Queries| PG
        PG -->|3. Job Data| LPR
        LPR -->|4. JSON Response| BROWSER
        
        BROWSER -->|5. Update Status| LPR
        LPR -->|6. INSERT/UPDATE| PG
        PG -->|7. Confirmation| LPR
        LPR -->|8. Success Response| BROWSER
    end
    
    style PG fill:#e1f5fe
    style BROWSER fill:#f3e5f5
    style LPR fill:#e8f5e8
    style DPR fill:#fff3e0
    style HTML fill:#fff9c4
    style CSS fill:#e8f5e8
    style UTILS fill:#f3e5f5
    style API fill:#e1f5fe
    style CORE fill:#fce4ec
```

### Current Environment Specifications
- **Mac:** macOS 15.5, PostgREST 13.0.4, IP: 192.168.1.18/192.168.1.63
- **Windows 11:** Pro 24H2 (Build 26100.4652), Docker PostgREST v12.0.2, IP: 192.168.1.31
- **Database:** PostgreSQL 14.18 with 362,597 total jobs (22,351 visible after filtering), 9 custom views
- **Smart Filtering:** 93.8% exclusion rate preserves data while showing relevant jobs
- **Performance:** Complete dataset loaded with acceptable speed and filtered display
- **Frontend:** Modular architecture with clean separation of concerns
- **Status:** ✅ **FULLY OPERATIONAL** - All major features working perfectly

## ✅ Quick Verification Test

After setup, verify the status update fix is working:

1. **Open Job Board:** http://localhost:8080
2. **Select any job** (click or use arrow keys)
3. **Change status** to "Interested" in right panel dropdown
4. **Look for**: 
   - ✅ Green success message: "Status updated to 'interested'"
   - ✅ Blue status badge in job table
   - ✅ Job remains selected (highlighted in blue)
5. **Verify database:**
   ```sql
   SELECT * FROM job_user_metadata;
   -- Should show 1 row with your job_id and status='interested'
   ```

## 2. Frontend File Structure

### Required Files (Copy These Exactly)

#### **Core Files**
- **`index.html`** - Clean HTML structure with proper script imports
- **`config.js`** - API configuration (API_BASE setting)

#### **CSS Module**
- **`css/styles.css`** - Complete styling system:
  - Layout and responsive design
  - Job table and details panel styling
  - Status badges and visual indicators
  - Loading states and animations

#### **JavaScript Modules**
- **`js/utils.js`** - Utility functions (no dependencies):
  - `formatSalary()`, `formatDate()`, `escapeHtml()`
  - `showMessage()`, `debounce()`, `updateStats()`

- **`js/api.js`** - Backend communication layer:
  - `loadJobs()`, `loadJobDetails()`
  - `updateJobStatus()`, `updateJobNotes()`
  - `exportCSV()` with error handling

- **`js/core.js`** - Main application logic:
  - Global state management
  - Event handlers and keyboard navigation
  - Job filtering and rendering
  - Selection management

### ✅ Modular Architecture Benefits
- **Maintainability**: Each file has <300 lines and clear purpose
- **Debugging**: Easy to isolate issues by module
- **Development**: Work on individual features without conflicts
- **Scalability**: Ready for Phase 4 enhancements
- **Performance**: Optimized loading with dependency order

### Module Dependencies
```
index.html
├── config.js (configuration)
├── css/styles.css (styling)
└── JavaScript modules (in order):
    ├── js/utils.js (pure utilities)
    ├── js/api.js (depends on config.js, uses utils)
    └── js/core.js (depends on api.js and utils.js)
```

## 3. Daily Startup Procedure ⭐

### 3.1 Windows 11 Steps (Database Host)

```powershell
# Navigate to PostgREST directory
cd C:\PostgREST

# Start Docker PostgREST container (if not running)
docker-compose up -d

# Verify container is running
docker ps

# Expected output should show:
# CONTAINER ID   IMAGE                         STATUS    PORTS                    NAMES
# 13e05e7d4193   postgrest/postgrest:v12.0.2   Up        0.0.0.0:3001->3000/tcp   postgrest
```

### 3.2 Mac Steps (Frontend Host)

```bash
# Navigate to frontend directory
cd /Users/jonesy/gitlocal/jobscraps_frontend

# Start local PostgREST (connects to Windows database)
PGRST_DB_URI="postgres://jonesy:H1tchh1ker@192.168.1.31:5432/jobscraps" \
PGRST_DB_SCHEMAS="public" \
PGRST_DB_ANON_ROLE="jonesy" \
PGRST_SERVER_HOST="127.0.0.1" \
PGRST_SERVER_PORT=3001 \
postgrest

# In a new terminal tab, start HTTP server
cd /Users/jonesy/gitlocal/jobscraps_frontend
python3 -m http.server 8080
```

### 3.3 Verification Steps

```bash
# Test local PostgREST API
curl 'http://127.0.0.1:3001/job_list?limit=1'

# Should return JSON with job data
```

**Open Job Board:** http://localhost:8080

Expected result: Job board loads with "Total: 22351" visible jobs displayed (362,597 total in database). All features including status updates and filtered export are fully functional.

## 4. Complete Installation Guide

### 4.1 Windows 11 Setup (Database Host)

#### Prerequisites
- Docker Desktop installed and running
- Existing PostgreSQL database with scraped jobs

#### PostgREST Docker Setup
1. **Create PostgREST directory:**
   ```powershell
   mkdir C:\PostgREST
   cd C:\PostgREST
   ```

2. **Create docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     postgrest:
       image: postgrest/postgrest:v12.0.2
       ports:
         - "3001:3000"
       environment:
         PGRST_DB_URI: "postgres://jonesy:H1tchh1ker@host.docker.internal:5432/jobscraps"
         PGRST_DB_SCHEMAS: "public"
         PGRST_DB_ANON_ROLE: "jonesy"
         PGRST_SERVER_CORS_ALLOWED_ORIGINS: "*"
       restart: unless-stopped
   ```

3. **Start container:**
   ```powershell
   docker-compose up -d
   ```

4. **Configure Windows Firewall:**
   ```powershell
   # Run as Administrator
   New-NetFirewallRule -DisplayName "PostgREST" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
   ```

### 4.2 Mac Setup (Frontend Host)

#### Prerequisites
- Homebrew installed
- Network connectivity to Windows machine

#### PostgREST Installation
```bash
# Install PostgREST via Homebrew
brew install postgrest

# Verify installation
postgrest --version
# Expected: PostgREST 13.0.4
```

#### Frontend Project Setup
```bash
# Create project directory
mkdir -p /Users/jonesy/gitlocal/jobscraps_frontend
cd /Users/jonesy/gitlocal/jobscraps_frontend

# Create directory structure
mkdir -p css js

# Initialize git (optional)
git init
echo ".DS_Store" > .gitignore
```

#### Create Frontend Files
Create each file with the following content:

1. **`index.html`** - Clean HTML structure:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>SQL Job Board</title>
       <link rel="stylesheet" href="css/styles.css">
   </head>
   <body>
       <!-- Clean HTML structure -->
       
       <!-- JavaScript imports in dependency order -->
       <script src="config.js"></script>
       <script src="js/utils.js"></script>
       <script src="js/api.js"></script>
       <script src="js/core.js"></script>
   </body>
   </html>
   ```

2. **`config.js`** - API configuration:
   ```javascript
   const CONFIG = {
       API_BASE: 'http://127.0.0.1:3001',
   };
   
   const UI_CONFIG = {
       DEFAULT_PAGE_SIZE: 100,
       AUTO_REFRESH_INTERVAL: 30000,
       KEYBOARD_NAVIGATION: true,
       DEBUG_MODE: false,
   };
   ```

3. **`css/styles.css`** - Complete styling system
4. **`js/utils.js`** - Utility functions module
5. **`js/api.js`** - API communication module  
6. **`js/core.js`** - Main application logic module

#### PostgREST Configuration
```bash
cat > postgrest.conf << 'EOF'
db-uri = "postgres://jonesy:H1tchh1ker@192.168.1.31:5432/jobscraps"
db-schemas = "public"
db-anon-role = "jonesy"
server-host = "127.0.0.1"
server-port = 3001
server-cors-allowed-origins = "*"
EOF
```

### 4.3 Database Setup (PostgreSQL)

#### Create Required Views and Permissions
```sql
-- Connect to jobscraps database
\c jobscraps

-- Create main job list view (compact for table display)
CREATE OR REPLACE VIEW job_list AS
SELECT 
    sj.id,
    sj.title,
    sj.company,
    sj.location,
    sj.date_posted,
    sj.min_amount,
    sj.max_amount,
    sj.currency,
    sj.is_remote,
    sj.date_scraped,
    jum.status,
    jum.reviewed,
    jum.user_notes
FROM scraped_jobs sj
LEFT JOIN job_user_metadata jum ON sj.id = jum.job_id
WHERE sj.excluded = false OR sj.excluded IS NULL
ORDER BY sj.date_scraped DESC;

-- Create detailed job view (for job details panel)
CREATE OR REPLACE VIEW job_details AS
SELECT 
    sj.*,
    jum.status,
    jum.reviewed,
    jum.user_notes,
    jum.updated_at as status_updated_at
FROM scraped_jobs sj
LEFT JOIN job_user_metadata jum ON sj.id = jum.job_id;

-- Create filtered views for different job subsets
CREATE OR REPLACE VIEW jobs_remote_only AS
SELECT * FROM job_list WHERE is_remote = true;

CREATE OR REPLACE VIEW jobs_applied AS  
SELECT * FROM job_list WHERE status = 'applied';

CREATE OR REPLACE VIEW jobs_needs_review AS
SELECT * FROM job_list WHERE reviewed = false OR reviewed IS NULL;

CREATE OR REPLACE VIEW jobs_with_salary AS
SELECT * FROM job_list WHERE min_amount IS NOT NULL;

-- Create export view (CSV-ready format)
CREATE OR REPLACE VIEW jobs_export AS
SELECT 
    id, title, company, location, date_posted,
    min_amount, max_amount, currency, is_remote,
    status, reviewed, user_notes, date_scraped,
    job_url, job_url_direct, description, skills,
    company_industry, job_type, job_level
FROM job_details
WHERE excluded = false OR excluded IS NULL;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO jonesy;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_user_metadata TO jonesy;
```

#### Verify Setup
```sql
-- Check views were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%job%';

-- Test job_list view
SELECT COUNT(*) FROM job_list;
-- Expected: ~22,351 visible jobs

-- Test job_details view  
SELECT COUNT(*) FROM job_details;
-- Expected: 362,597 total jobs
```

## 5. Job Status Management System

### 5.1 Status Workflow Diagram

```mermaid
flowchart TD
    A[User Browses Jobs] --> B[Select Job in Table]
    B --> C[Job Details Load in Right Panel]
    C --> D[User Changes Status Dropdown]
    D --> E[core.js → api.js updateJobStatus]
    
    E --> F{Metadata Record Exists?}
    F -->|Yes| G[PATCH /job_user_metadata]
    F -->|No| H[POST /job_user_metadata]
    
    G --> I[Update Database Record]
    H --> J[Create New Database Record]
    
    I --> K[PostgREST Returns Success]
    J --> K
    
    K --> L[api.js Updates Local Data]
    L --> M[core.js Re-renders Job Table]
    L --> N[utils.js Updates Status Badge]
    L --> O[utils.js Refreshes Stats]
    
    M --> P[Status Badge Shows New Value]
    N --> P
    O --> Q[Header Shows Updated Counts]
    
    style A fill:#e1f5fe
    style E fill:#fce4ec
    style L fill:#e1f5fe
    style M fill:#fce4ec
    style N fill:#fff9c4
    style O fill:#fff9c4
    style P fill:#c8e6c9
    style Q fill:#c8e6c9
```

### 5.2 Module Interaction for Status Updates

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant CORE as core.js
    participant API as api.js
    participant UTILS as utils.js
    participant REST as PostgREST
    participant DB as PostgreSQL
    
    UI->>CORE: User selects status from dropdown
    CORE->>API: updateJobStatus(jobId, status)
    
    API->>REST: PATCH /job_user_metadata?job_id=eq.ABC123
    REST->>DB: UPDATE job_user_metadata SET status='interested'
    
    alt Record exists
        DB->>REST: UPDATE successful (1+ rows affected)
        REST->>API: 204 No Content + Content-Range: 0-0/*
    else Record doesn't exist  
        DB->>REST: UPDATE successful (0 rows affected)
        REST->>API: 204 No Content + Content-Range: */*
        
        API->>REST: POST /job_user_metadata
        REST->>DB: INSERT INTO job_user_metadata
        DB->>REST: INSERT successful
        REST->>API: 201 Created
    end
    
    API->>API: Update allJobs array (local data)
    API->>CORE: filterJobs(false) - preserve selection
    CORE->>CORE: renderJobs() - re-render table
    API->>UTILS: showMessage('Status updated', 'success')
    UTILS->>UI: Display success message
    
    Note over CORE: Job remains selected,<br/>status badge updates color
```

### 5.3 Status Impact Analysis

#### Available Status Values
- **`interested`** - Jobs worth pursuing (blue badge)
- **`applied`** - Applications submitted (green badge)  
- **`followed-up`** - Follow-up actions taken (yellow badge)
- **`rejected`** - Not moving forward (red badge)
- **`unreviewed`** - No status set (gray badge)

#### Module Responsibilities
- **`api.js`**: Handles HTTP requests and error handling
- **`core.js`**: Manages application state and UI updates
- **`utils.js`**: Provides formatting and messaging utilities
- **`styles.css`**: Defines status badge colors and animations

#### Database Schema Changes
```sql
-- When status is updated, these fields change in job_user_metadata:
job_id          -- Links to scraped_jobs.id
status          -- New status value  
reviewed        -- Set to TRUE automatically
updated_at      -- Timestamp updated automatically
user_notes      -- Preserved (unchanged)
```

## 6. Usage Guide & Features

### 6.1 Keyboard Navigation
- **↑/↓ Arrow Keys:** Navigate through job list
- **Enter:** Open selected job URL in new tab
- **Tab:** Move between controls
- **Typing in search:** Filter jobs by title/company

### 6.2 Job Board Interface

#### Header Controls
- **Query Dropdown:** Switch between predefined views
  - All Jobs (22,351 visible of 362,597 total)
  - Needs Review (unreviewed jobs)
  - Remote Only (is_remote = true)
  - Applied (status = 'applied')
  - With Salary (min_amount IS NOT NULL)

- **Search Box:** Live filter by job title or company name
- **Status Filter:** Show only jobs with specific status
- **Export CSV Button:** Download current filtered results

#### Main Interface
- **Left Panel (60%):** Compact job table
  - Title, Company, Location, Status, Salary, Posted Date
  - Color-coded status badges
  - Remote badges for remote jobs
  - Click or arrow keys to select

- **Right Panel (40%):** Detailed job view
  - Full job title and company
  - Location, industry, job type, level
  - Status dropdown for updates
  - Direct job links
  - Full job description (scrollable)
  - Personal notes textarea

### 6.3 Status Management
1. **Select a job** in the left panel (click or arrow keys)
2. **Choose status** from dropdown in right panel
3. **Status updates automatically** - table refreshes immediately
4. **Add notes** in the textarea below job description
5. **Changes save automatically** on dropdown change or textarea blur

### 6.4 Data Export
- **Filtered CSV Export**: Includes only the currently visible/filtered jobs (not all 362k)
- **Intelligent Filtering**: Exports exactly what you see in the interface (22k jobs)
- **File naming**: `jobs_export_YYYY-MM-DD.csv` with filter indicators
- **Columns**: id, title, company, location, date_posted, salary info, status, notes, etc.
- **Performance**: Fast export of manageable dataset size

## 7. API Reference & Custom Views

### 7.1 Available PostgREST Endpoints

#### Main Views
- `GET /job_list` - Compact job listing (main table view)
- `GET /job_details?id=eq.{job_id}` - Full job details
- `GET /jobs_export` - CSV-ready format with all fields

#### Filtered Views  
- `GET /jobs_remote_only` - Remote jobs only
- `GET /jobs_applied` - Jobs with status = 'applied'
- `GET /jobs_needs_review` - Unreviewed jobs (reviewed = false)
- `GET /jobs_with_salary` - Jobs with salary information

#### Status Management
- `PATCH /job_user_metadata?job_id=eq.{id}` - Update existing status/notes
- `POST /job_user_metadata` - Create new status record

### 7.2 Query Examples

#### Filter Jobs by Company
```bash
curl 'http://127.0.0.1:3001/job_list?company=like.*Google*'
```

#### Get Remote Jobs with Salary > $100k
```bash
curl 'http://127.0.0.1:3001/jobs_remote_only?min_amount=gte.100000'
```

#### Search Job Titles
```bash
curl 'http://127.0.0.1:3001/job_list?title=like.*Engineer*&limit=10'
```

#### Export Applied Jobs to CSV
```bash
curl 'http://127.0.0.1:3001/jobs_export?status=eq.applied' \
  -H "Accept: text/csv" > applied_jobs.csv
```

## 8. Troubleshooting Guide

### 8.1 ✅ Resolved Issues

#### Status Updates Not Working (RESOLVED)
**Previous Problem**: Job status changes didn't create records in `job_user_metadata` table.

**Root Cause**: PostgREST returns `204 No Content` with `Content-Range: */*` when PATCH operations affect 0 rows, but frontend only created new records on `404` responses.

**Resolution**: Updated `api.js` to check `Content-Range` header and create new records when `*/*` is returned.

**Verification**: 
1. Change a job status and check for success message
2. Verify record creation:
   ```sql
   SELECT * FROM job_user_metadata WHERE job_id = 'your-job-id';
   ```
3. Confirm job stays selected after status update

### 8.2 Common Issues

#### "Error loading jobs. Check PostgREST connection."
**Cause:** PostgREST not running or misconfigured

**Solutions:**
1. **Check PostgREST process:**
   ```bash
   ps aux | grep postgrest
   ```

2. **Test API directly:**
   ```bash
   curl http://127.0.0.1:3001/job_list?limit=1
   ```

3. **Restart PostgREST:**
   ```bash
   # Kill existing process
   pkill postgrest
   
   # Restart with environment variables
   PGRST_DB_URI="postgres://jonesy:H1tchh1ker@192.168.1.31:5432/jobscraps" \
   PGRST_DB_SCHEMAS="public" \
   PGRST_DB_ANON_ROLE="jonesy" \
   PGRST_SERVER_HOST="127.0.0.1" \
   PGRST_SERVER_PORT=3001 \
   postgrest
   ```

#### Browser Shows Blank Job Board
**Cause:** HTTP server not running, wrong port, or missing files

**Solutions:**
1. **Check file structure:**
   ```bash
   ls -la /Users/jonesy/gitlocal/jobscraps_frontend/
   # Should show: index.html, config.js, css/, js/
   ```

2. **Check HTTP server:**
   ```bash
   # Should show process on port 8080
   lsof -i :8080
   ```

3. **Restart HTTP server:**
   ```bash
   cd /Users/jonesy/gitlocal/jobscraps_frontend
   python3 -m http.server 8080
   ```

4. **Check config.js API_BASE setting:**
   ```javascript
   // Should be:
   const CONFIG = {
       API_BASE: 'http://127.0.0.1:3001'
   };
   ```

#### JavaScript Console Errors
**Cause:** Missing files or incorrect module loading order

**Solutions:**
1. **Check browser console (F12)** for error messages
2. **Verify file loading order** in index.html:
   ```html
   <!-- Correct order -->
   <script src="config.js"></script>
   <script src="js/utils.js"></script>
   <script src="js/api.js"></script>
   <script src="js/core.js"></script>
   ```

3. **Check file permissions:**
   ```bash
   chmod 644 index.html config.js css/styles.css js/*.js
   ```

### 8.3 Network Connectivity Issues

#### Can't Connect to Windows Database
**Cause:** Firewall, network, or PostgreSQL configuration

**Solutions:**
1. **Test Windows PostgreSQL directly:**
   ```bash
   # From Mac
   telnet 192.168.1.31 5432
   ```

2. **Check Windows firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "*postgres*"
   ```

3. **Verify PostgreSQL accepts connections:**
   ```sql
   -- In postgresql.conf
   listen_addresses = '*'
   
   -- In pg_hba.conf  
   host all jonesy 192.168.1.0/24 md5
   ```

#### Docker PostgREST Issues
**Solutions:**
1. **Check container logs:**
   ```powershell
   docker logs postgrest
   ```

2. **Restart container:**
   ```powershell
   docker-compose restart
   ```

3. **Verify environment variables:**
   ```powershell
   docker exec postgrest env | grep PGRST
   ```

## 9. Customization & Development

### 9.1 Adding New Features

#### Module-Specific Changes

**For UI Changes (`css/styles.css`):**
```css
/* Add new status colors */
.status-interview { background: #e3f2fd; color: #1976d2; }
.status-offer { background: #f3e5f5; color: #7b1fa2; }

/* Custom company highlighting */
.job-company[data-company="Google"] { color: #4285f4; font-weight: bold; }
```

**For Utility Functions (`js/utils.js`):**
```javascript
// Add new formatting function
function formatCompanySize(employees) {
    if (employees < 50) return 'Startup';
    if (employees < 1000) return 'Mid-size';
    return 'Enterprise';
}
```

**For API Features (`js/api.js`):**
```javascript
// Add new API endpoint function
async function bulkUpdateStatus(jobIds, status) {
    // Implementation for bulk status updates
}
```

**For App Logic (`js/core.js`):**
```javascript
// Add new keyboard shortcuts
case 'i': // Mark as interested
    if (selectedJobId) {
        updateJobStatus(selectedJobId, 'interested');
    }
    break;
```

### 9.2 Adding Custom Views

Create specialized views for your workflow:

```sql
-- Jobs from specific companies
CREATE VIEW jobs_target_companies AS
SELECT * FROM job_list 
WHERE company IN ('Google', 'Apple', 'Microsoft', 'Amazon');

-- Recent high-value jobs
CREATE VIEW jobs_recent_high_value AS
SELECT * FROM job_list 
WHERE date_scraped >= NOW() - INTERVAL '7 days'
  AND min_amount >= 150000;

-- Jobs needing immediate attention
CREATE VIEW jobs_action_required AS
SELECT * FROM job_list 
WHERE status IN ('interested', 'interview')
  AND updated_at <= NOW() - INTERVAL '3 days';

-- Grant permissions
GRANT SELECT ON jobs_target_companies TO jonesy;
GRANT SELECT ON jobs_recent_high_value TO jonesy;
GRANT SELECT ON jobs_action_required TO jonesy;
```

Then add to frontend dropdown in `index.html`:
```html
<option value="jobs_target_companies">Target Companies</option>
<option value="jobs_recent_high_value">Recent High-Value</option>
<option value="jobs_action_required">Action Required</option>
```

### 9.3 Frontend Debugging

#### Module Debugging Techniques

**Check Module Loading:**
```javascript
// Add to browser console
console.log('Config loaded:', typeof CONFIG !== 'undefined');
console.log('Utils loaded:', typeof formatSalary !== 'undefined');
console.log('API loaded:', typeof loadJobs !== 'undefined');
console.log('Core loaded:', typeof allJobs !== 'undefined');
```

**Enable Debug Mode:**
```javascript
// In config.js
const UI_CONFIG = {
    DEBUG_MODE: true,  // Enable verbose logging
    // ...
};
```

**API Call Debugging:**
```javascript
// In js/api.js, add logging
console.log('API Request:', url, options);
console.log('API Response:', response);
```

#### Performance Monitoring

**Check Module Load Times:**
```javascript
// Add timing to each module
console.time('Utils module load');
// ... utils.js content
console.timeEnd('Utils module load');
```

**Monitor API Performance:**
```javascript
// In js/api.js
const startTime = performance.now();
const response = await fetch(url);
console.log(`API call took ${performance.now() - startTime}ms`);
```

## 🎯 Smart Filtering System Overview

### Filtering Performance Results
```
📊 Current Dataset Performance:
- Total jobs in database: 362,597
- Excluded by filters: 340,246 (93.8%)
- Visible jobs displayed: 22,351
- Performance: Excellent (complete dataset loaded)
- Frontend modules: 5 files, ~800 total lines
```

### How Smart Filtering Works
The system uses **exclusion-based filtering** rather than permanent deletion:
- **Data Preservation**: All 362k jobs remain in the database
- **Display Filtering**: Only relevant jobs (22k) shown in interface  
- **Export Accuracy**: CSV export includes only filtered/visible jobs
- **Reversible**: Filtering rules can be adjusted without data loss
- **Modular Frontend**: Clean separation of concerns for easy maintenance

### Filtering Categories Applied
- **Company patterns**: 48,882 jobs excluded (recruiting firms, etc.)
- **Title patterns**: 291,877 jobs excluded (irrelevant roles)
- **ID filters**: 221,125 jobs excluded (duplicate/low-quality postings)
- **Salary filters**: 123,012 jobs excluded (below minimum thresholds)

The filtering dramatically improves browsing experience while preserving the complete dataset for analysis.

---

## 🎉 Success Metrics

Your modular job board is successfully managing:
- **362,597 total jobs** in database from your scraping system
- **22,351 visible jobs** after smart filtering (93.8% exclusion rate)
- **9 custom SQL views** for different job subsets  
- **5 modular frontend files** with clean separation of concerns
- **Smart filtering system** that preserves data while showing relevant jobs
- **Keyboard-driven navigation** for efficient browsing
- **✅ Full status tracking** with notes capability (WORKING)
- **✅ Filtered CSV export** for external analysis (exports only visible jobs)
- **Real-time filtering** and search functionality
- **Professional modular architecture** ready for Phase 4 enhancements

## ✅ System Status: FULLY OPERATIONAL

The system provides a professional modular interface for managing your job search workflow with the performance and flexibility of direct SQL access through PostgREST.

### Modular Architecture Benefits:
- **Maintainability**: ✅ Each file <300 lines with clear purpose
- **Debugging**: ✅ Easy to isolate issues by module
- **Development**: ✅ Work on individual features without conflicts  
- **Scalability**: ✅ Ready for Phase 4 workflow enhancements
- **Performance**: ✅ Optimized loading with proper dependency order

### Recent Fixes Applied:
- **Status Update Bug**: ✅ RESOLVED - Content-Range header detection in api.js
- **Selection Preservation**: ✅ Jobs remain selected after status updates in core.js
- **User Feedback**: ✅ Success/error messages in utils.js
- **Loading States**: ✅ Visual feedback during updates in styles.css
- **Race Condition Prevention**: ✅ Concurrent update protection in api.js
- **Modular Refactor**: ✅ COMPLETED - Clean 5-file architecture

### Verified Working Features:
- ✅ Job browsing and navigation (keyboard + mouse)
- ✅ Status updates (interested, applied, followed-up, rejected)
- ✅ Notes functionality
- ✅ Filtered CSV export (exports only visible jobs)
- ✅ Real-time search and filtering
- ✅ Database record creation and updates
- ✅ Smart filtering system (362k→22k jobs)
- ✅ Professional modular interface with excellent performance
- ✅ Phase 4 enhancement readiness