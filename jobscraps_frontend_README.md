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

### Architecture Diagram

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
```

### Current Environment Specifications
- **Mac:** macOS 15.5, PostgREST 13.0.4, IP: 192.168.1.18/192.168.1.63
- **Windows 11:** Pro 24H2 (Build 26100.4652), Docker PostgREST v12.0.2, IP: 192.168.1.31
- **Database:** PostgreSQL 14.18 with 362,597 total jobs (22,351 visible after filtering), 9 custom views
- **Smart Filtering:** 93.8% exclusion rate preserves data while showing relevant jobs
- **Performance:** Complete dataset loaded with acceptable speed and filtered display
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

## 2. Current Artifacts Reference

### Required Artifacts (Copy These Exactly)
These artifacts contain the working configuration and must be saved exactly as provided:

- **`job_board_frontend`** - Main job board interface with status update fix (save as `index.html`)
- **`config_js`** - API configuration file (save as `config.js`)  
- **`updated_docker_compose`** - Windows PostgREST Docker setup (save as `docker-compose.yml`)
- **`sql_setup_jonesy`** - Database views and permissions (run in PostgreSQL)

### ✅ Status Update Issue Resolved
The main troubleshooting issue (job status updates not working) has been **fully resolved**. The updated `job_board_frontend` artifact includes:
- **Content-Range Detection**: Properly detects when PATCH operations affect 0 rows
- **Automatic Record Creation**: Creates new metadata records when none exist
- **User-Visible Feedback**: Success/error messages and loading states
- **Selection Preservation**: Jobs remain selected after status updates

### Deprecated/Reference Only
All other setup and troubleshooting artifacts from our session are deprecated. The system now works with the minimal configuration approach.

## 🎯 Smart Filtering System Overview

### Filtering Performance Results
```
📊 Current Dataset Performance:
- Total jobs in database: 362,597
- Excluded by filters: 340,246 (93.8%)
- Visible jobs displayed: 22,351
- Performance: Excellent (complete dataset loaded)
```

### How Smart Filtering Works
The system uses **exclusion-based filtering** rather than permanent deletion:
- **Data Preservation**: All 362k jobs remain in the database
- **Display Filtering**: Only relevant jobs (22k) shown in interface  
- **Export Accuracy**: CSV export includes only filtered/visible jobs
- **Reversible**: Filtering rules can be adjusted without data loss

### Filtering Categories Applied
- **Company patterns**: 48,882 jobs excluded (recruiting firms, etc.)
- **Title patterns**: 291,877 jobs excluded (irrelevant roles)
- **ID filters**: 221,125 jobs excluded (duplicate/low-quality postings)
- **Salary filters**: 123,012 jobs excluded (below minimum thresholds)

The filtering dramatically improves browsing experience while preserving the complete dataset for analysis.

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

## ✅ Status Update Verification

After opening the job board, test the status functionality:
1. Select any job and change its status
2. You should see a green success message 
3. The job status badge should update immediately
4. Check `SELECT * FROM job_user_metadata;` to confirm database record creation

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
   Use the exact content from artifact `updated_docker_compose` (connects to `jobscraps` database)

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

# Initialize git (optional)
git init
echo ".DS_Store" > .gitignore
```

#### Create Configuration Files
1. **Save artifacts as files:**
   - `job_board_frontend` → `index.html`
   - `config_js` → `config.js`

2. **Create PostgREST config:**
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
Run the SQL commands from artifact `sql_setup_jonesy` in your PostgreSQL database:

```sql
-- Connect to jobscraps database and execute all commands
-- This creates 6 essential views:
-- - job_list (main compact view)
-- - job_details (full job information)
-- - jobs_remote_only, jobs_applied, jobs_needs_review, jobs_with_salary
-- - jobs_export (CSV-ready format with filtered data)
```

#### Verify Setup
```sql
-- Check views were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%job%';

-- Expected: 9 tables/views including job_list, job_details, etc.
```

## 5. Job Status Management System

### 5.1 Status Workflow Diagram

```mermaid
flowchart TD
    A[User Browses Jobs] --> B[Select Job in Table]
    B --> C[Job Details Load in Right Panel]
    C --> D[User Changes Status Dropdown]
    D --> E[JavaScript updateJobStatus Function]
    
    E --> F{Metadata Record Exists?}
    F -->|Yes| G[PATCH /job_user_metadata]
    F -->|No| H[POST /job_user_metadata]
    
    G --> I[Update Database Record]
    H --> J[Create New Database Record]
    
    I --> K[PostgREST Returns Success]
    J --> K
    
    K --> L[Update Local JavaScript Data]
    L --> M[Re-render Job Table Row]
    L --> N[Update Status Badge Color]
    L --> O[Refresh Stats Counter]
    
    M --> P[Status Badge Shows New Value]
    N --> P
    O --> Q[Header Shows Updated Counts]
    
    style A fill:#e1f5fe
    style P fill:#c8e6c9
    style Q fill:#c8e6c9
```

### 5.2 Data Flow for Status Updates

```mermaid
sequenceDiagram
    participant UI as Job Board UI
    participant JS as JavaScript
    participant API as PostgREST API
    participant DB as PostgreSQL
    
    UI->>JS: User selects status from dropdown
    JS->>JS: Capture job_id and new status
    
    JS->>API: PATCH /job_user_metadata?job_id=eq.ABC123
    Note over JS,API: Body: {"status": "interested", "reviewed": true}
    
    API->>DB: UPDATE job_user_metadata SET status='interested', reviewed=true WHERE job_id='ABC123'
    
    alt Record exists
        DB->>API: UPDATE successful (1+ rows affected)
        API->>JS: 204 No Content + Content-Range: 0-0/*
        Note over JS: Status updated successfully
    else Record doesn't exist  
        DB->>API: UPDATE successful (0 rows affected)
        API->>JS: 204 No Content + Content-Range: */*
        Note over JS: Content-Range */* detected - no rows updated
        
        JS->>API: POST /job_user_metadata
        Note over JS,API: Body: {"job_id": "ABC123", "status": "interested", "reviewed": true}
        API->>DB: INSERT INTO job_user_metadata (job_id, status, reviewed) VALUES (...)
        DB->>API: INSERT successful
        API->>JS: 201 Created
    end
    
    JS->>JS: Update local allJobs array
    JS->>UI: Re-render table row with new status badge
    JS->>UI: Update stats counters in header
    JS->>UI: Show success message
    
    Note over UI: Status badge color changes:<br/>- interested: blue<br/>- applied: green<br/>- followed-up: yellow<br/>- rejected: red
```

### 5.3 Status Impact Analysis

#### Available Status Values
- **`interested`** - Jobs worth pursuing (blue badge)
- **`applied`** - Applications submitted (green badge)  
- **`followed-up`** - Follow-up actions taken (yellow badge)
- **`rejected`** - Not moving forward (red badge)
- **`unreviewed`** - No status set (gray badge)

#### Database Schema Changes
```sql
-- When status is updated, these fields change in job_user_metadata:
job_id          -- Links to scraped_jobs.id
status          -- New status value  
reviewed        -- Set to TRUE automatically
updated_at      -- Timestamp updated automatically
user_notes      -- Preserved (unchanged)
```

#### UI Behavior Changes
1. **Table Row:** Status badge color and text update immediately
2. **Details Panel:** Status dropdown shows selected value
3. **Header Stats:** Counters update (Total: X, Selected: Y of Z)
4. **Filtering:** Job appears/disappears based on status filter
5. **Export:** Status included in CSV export data

#### Query View Effects
- **jobs_applied:** Job appears when status = 'applied'
- **jobs_needs_review:** Job disappears when reviewed = true
- **job_list:** Shows updated status in all views
- **jobs_export:** Includes status for CSV export

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

### 7.3 Managing Filtering Rules

The system includes an `apply-filtering-rules` command for managing job visibility:

```sql
-- View current filtering statistics
SELECT 
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE excluded = true) as excluded_jobs,
  COUNT(*) FILTER (WHERE excluded = false OR excluded IS NULL) as visible_jobs
FROM scraped_jobs;

-- The filtering system automatically excludes jobs based on:
-- 1. Company patterns (recruiting firms, unwanted companies)
-- 2. Title patterns (irrelevant job titles)  
-- 3. ID filters (duplicate or low-quality postings)
-- 4. Salary filters (below minimum thresholds)
```

#### Filtering Benefits
- **Performance**: Interface loads 22k jobs instead of 362k
- **Relevance**: Shows only pertinent opportunities
- **Preservation**: No data loss - all jobs remain in database
- **Flexibility**: Rules can be adjusted without losing historical data

### 7.4 Adding Custom Views

To add new SQL views (they automatically become API endpoints):

```sql
-- Example: High-paying remote Python jobs
CREATE OR REPLACE VIEW jobs_python_remote_high_pay AS
SELECT * FROM job_list 
WHERE skills ILIKE '%python%' 
  AND is_remote = true 
  AND min_amount >= 120000;

GRANT SELECT ON jobs_python_remote_high_pay TO jonesy;

-- Restart PostgREST to recognize new view
-- Now available at: GET /jobs_python_remote_high_pay
```

Then add to frontend dropdown:
```html
<option value="jobs_python_remote_high_pay">High-Pay Python Remote</option>
```

## 8. Troubleshooting Guide

### 8.1 ✅ Resolved Issues

#### Status Updates Not Working (RESOLVED)
**Previous Problem**: Job status changes didn't create records in `job_user_metadata` table.

**Root Cause**: PostgREST returns `204 No Content` with `Content-Range: */*` when PATCH operations affect 0 rows, but frontend only created new records on `404` responses.

**Resolution**: Updated frontend to check `Content-Range` header and create new records when `*/*` is returned.

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
**Cause:** HTTP server not running or wrong port

**Solutions:**
1. **Check HTTP server:**
   ```bash
   # Should show process on port 8080
   lsof -i :8080
   ```

2. **Restart HTTP server:**
   ```bash
   cd /Users/jonesy/gitlocal/jobscraps_frontend
   python3 -m http.server 8080
   ```

3. **Check config.js API_BASE setting:**
   ```javascript
   // Should be:
   API_BASE: 'http://127.0.0.1:3001'
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

## 9. Customization Options

### 9.1 Adding New Status Types

1. **Update status dropdown in index.html:**
   ```html
   <option value="interview">Interview Scheduled</option>
   <option value="offer">Offer Received</option>
   ```

2. **Add CSS for new status badges:**
   ```css
   .status-interview { background: #e3f2fd; color: #1976d2; }
   .status-offer { background: #f3e5f5; color: #7b1fa2; }
   ```

### 9.2 Custom Job Queries

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
```

### 9.3 Frontend Modifications

#### Change Table Columns
Edit the table header and row rendering in `index.html`:

```javascript
// Add new column to table
<th>Skills</th>

// Add corresponding cell data
<td>${escapeHtml(job.skills || '')}</td>
```

#### Modify Keyboard Shortcuts
Add new key handlers in `handleKeyPress` function:

```javascript
case 'i': // Mark as interested
    if (selectedJobId) {
        updateJobStatus(selectedJobId, 'interested');
    }
    break;
```

#### Custom Styling
Add your own CSS overrides to the `<style>` section for:
- Color schemes
- Typography
- Layout adjustments
- Company-specific highlighting

---

## 🎉 Success Metrics

Your job board is successfully managing:
- **362,597 total jobs** in database from your scraping system
- **22,351 visible jobs** after smart filtering (93.8% exclusion rate)
- **9 custom SQL views** for different job subsets  
- **Smart filtering system** that preserves data while showing relevant jobs
- **Keyboard-driven navigation** for efficient browsing
- **✅ Full status tracking** with notes capability (WORKING)
- **✅ Filtered CSV export** for external analysis (exports only visible jobs)
- **Real-time filtering** and search functionality
- **Professional interface** with excellent performance

## ✅ System Status: FULLY OPERATIONAL

The system provides a professional interface for managing your job search workflow with the performance and flexibility of direct SQL access through PostgREST.

### Recent Fixes Applied:
- **Status Update Bug**: ✅ RESOLVED - Content-Range header detection implemented
- **Selection Preservation**: ✅ Jobs remain selected after status updates  
- **User Feedback**: ✅ Success/error messages added
- **Loading States**: ✅ Visual feedback during updates
- **Race Condition Prevention**: ✅ Concurrent update protection added

### Verified Working Features:
- ✅ Job browsing and navigation (keyboard + mouse)
- ✅ Status updates (interested, applied, followed-up, rejected)
- ✅ Notes functionality
- ✅ Filtered CSV export (exports only visible jobs)
- ✅ Real-time search and filtering
- ✅ Database record creation and updates
- ✅ Smart filtering system (362k→22k jobs)
- ✅ Professional interface with excellent performance