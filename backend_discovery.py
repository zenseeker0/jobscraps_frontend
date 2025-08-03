#!/usr/bin/env python3
"""
JobScraps Backend Discovery Script
==================================

Inventories all backend capabilities for frontend development.
Run from: /Users/jonesy/gitlocal/jobscraps_frontend

Usage:
    python3 backend_discovery.py

Requirements:
    pip install psycopg2-binary requests
"""

import psycopg2
import psycopg2.extras
import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

# Database configuration
DB_CONFIG = {
    'host': '192.168.1.31',
    'port': 5432,
    'database': 'jobscraps',
    'user': 'jonesy',
    'password': 'H1tchh1ker'  # Update this with actual password
}

# PostgREST configuration
POSTGREST_BASE = 'http://127.0.0.1:3001'

def connect_db():
    """Connect to PostgreSQL database."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Update the PASSWORD in DB_CONFIG and ensure PostgreSQL is running")
        return None

def test_postgrest():
    """Test PostgREST API availability."""
    try:
        response = requests.get(f"{POSTGREST_BASE}/", timeout=5)
        return response.status_code == 200
    except requests.RequestException:
        return False

def get_database_info(conn):
    """Get basic database information."""
    print("🗄️  === DATABASE OVERVIEW ===")
    
    with conn.cursor() as cursor:
        # PostgreSQL version
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        print(f"PostgreSQL Version: {version.split(',')[0]}")
        
        # Database size
        cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
        size = cursor.fetchone()[0]
        print(f"Database Size: {size}")
        
        # Total jobs count
        try:
            cursor.execute("SELECT COUNT(*) FROM scraped_jobs")
            total_jobs = cursor.fetchone()[0]
            print(f"Total Jobs: {total_jobs:,}")
        except psycopg2.Error:
            print("Total Jobs: Table 'scraped_jobs' not found")
        
        # Excluded jobs count
        try:
            cursor.execute("SELECT COUNT(*) FROM job_user_metadata WHERE excluded = true")
            excluded_jobs = cursor.fetchone()[0]
            print(f"Excluded Jobs: {excluded_jobs:,}")
        except psycopg2.Error:
            print("Excluded Jobs: Table 'job_user_metadata' not found")

def get_tables_and_views(conn):
    """Inventory all tables and views."""
    print("\n📋 === TABLES & VIEWS INVENTORY ===")
    
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
        # Get all tables and views
        cursor.execute("""
            SELECT 
                table_name, 
                table_type,
                CASE 
                    WHEN table_type = 'VIEW' THEN '👁️'
                    ELSE '📁'
                END as icon
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_type, table_name
        """)
        
        tables = cursor.fetchall()
        
        for table in tables:
            print(f"{table['icon']} {table['table_name']} ({table['table_type']})")
            
            # Get column information
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position
            """, (table['table_name'],))
            
            columns = cursor.fetchall()
            for col in columns:    # Show all columns
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                print(f"    • {col['column_name']}: {col['data_type']} {nullable}{default}")
            print()

def test_computed_columns(conn):
    """Test availability of computed columns."""
    print("🧮 === COMPUTED COLUMNS TEST ===")
    
    with conn.cursor() as cursor:
        # Test job_role computation
        try:
            cursor.execute("SELECT extract_job_role('Data Analyst Remote')")
            result = cursor.fetchone()[0]
            print(f"✅ extract_job_role() function available: '{result}'")
        except psycopg2.Error as e:
            print(f"❌ extract_job_role() function not available: {e}")
        
        # Test location_scope computation
        try:
            cursor.execute("SELECT classify_location_scope('Boulder, CO')")
            result = cursor.fetchone()[0]
            print(f"✅ classify_location_scope() function available: '{result}'")
        except psycopg2.Error as e:
            print(f"❌ classify_location_scope() function not available: {e}")
        
        # Test computed columns in views
        try:
            cursor.execute("SELECT job_role, location_scope FROM job_board_main LIMIT 1")
            result = cursor.fetchone()
            if result:
                print(f"✅ Computed columns in job_board_main: job_role='{result[0]}', location_scope='{result[1]}'")
            else:
                print("⚠️  job_board_main view exists but returned no data")
        except psycopg2.Error as e:
            print(f"❌ Computed columns not available in job_board_main: {e}")

def analyze_jsonb_exclusions(conn):
    """Analyze JSONB exclusion tracking."""
    print("\n📊 === JSONB EXCLUSION TRACKING ===")
    
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
        try:
            # Check if exclusion_sources column exists
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'job_user_metadata' AND column_name = 'exclusion_sources'
            """)
            
            if not cursor.fetchone():
                print("❌ exclusion_sources column not found in job_user_metadata")
                return
            
            print("✅ exclusion_sources JSONB column found")
            
            # Sample exclusion sources
            cursor.execute("""
                SELECT exclusion_sources, COUNT(*) as count
                FROM job_user_metadata 
                WHERE exclusion_sources IS NOT NULL 
                  AND exclusion_sources != '[]'::jsonb
                GROUP BY exclusion_sources 
                ORDER BY count DESC 
                LIMIT 10
            """)
            
            results = cursor.fetchall()
            if results:
                print("\nTop exclusion source patterns:")
                for row in results:
                    sources = row['exclusion_sources']
                    count = row['count']
                    print(f"  {sources} → {count:,} jobs")
            else:
                print("⚠️  No exclusion_sources data found")
            
            # Check session tracking fields
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_metadata,
                    COUNT(exclusion_session_id) as with_session_id,
                    COUNT(exclusion_applied_at) as with_applied_at
                FROM job_user_metadata
            """)
            
            session_stats = cursor.fetchone()
            print(f"\nSession tracking stats:")
            print(f"  Total metadata records: {session_stats['total_metadata']:,}")
            print(f"  With session_id: {session_stats['with_session_id']:,}")
            print(f"  With applied_at timestamp: {session_stats['with_applied_at']:,}")
            
        except psycopg2.Error as e:
            print(f"❌ Error analyzing JSONB exclusions: {e}")

def test_session_tracking(conn):
    """Test session tracking capabilities."""
    print("\n📝 === SESSION TRACKING ===")
    
    with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
        try:
            # Recent sessions
            cursor.execute("""
                SELECT id, start_time, end_time, status,
                    EXTRACT(EPOCH FROM (COALESCE(end_time, CURRENT_TIMESTAMP) - start_time)) as duration_seconds
                FROM search_sessions 
                WHERE start_time > CURRENT_TIMESTAMP - INTERVAL '30 days'
                ORDER BY start_time DESC 
                LIMIT 5
            """)
            
            sessions = cursor.fetchall()
            if sessions:
                print("Recent sessions (last 30 days):")
                for session in sessions:
                    duration = f"{session['duration_seconds']:.1f}s" if session['duration_seconds'] else "ongoing"
                    status_icon = {"completed": "✅", "failed": "❌", "error": "💥"}.get(session['status'], "⏳")
                    print(f"  {status_icon} Session {session['id']}: {session['start_time'].strftime('%Y-%m-%d %H:%M:%S')} ({duration})")
            else:
                print("⚠️  No recent sessions found")
            
            # Search history sample
            cursor.execute("""
                SELECT search_query, new_jobs_inserted, duration_seconds, timestamp
                FROM search_history 
                ORDER BY timestamp DESC 
                LIMIT 3
            """)
            
            history = cursor.fetchall()
            if history:
                print("\nRecent search history:")
                for search in history:
                    print(f"  '{search['search_query']}' → {search['new_jobs_inserted']} new jobs ({search['duration_seconds']}s)")
            
        except psycopg2.Error as e:
            print(f"❌ Error testing session tracking: {e}")

def test_postgrest_endpoints(conn):
    """Test PostgREST endpoint availability."""
    print("\n🌐 === POSTGREST ENDPOINTS ===")
    
    if not test_postgrest():
        print("❌ PostgREST not available at http://127.0.0.1:3001")
        print("💡 Start PostgREST with: postgrest postgrest.conf")
        return
    
    print("✅ PostgREST API available")
    
    # Get available endpoints from database views
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type IN ('VIEW', 'BASE TABLE')
            ORDER BY table_name
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
    
    print("\nTesting key endpoints:")
    
    # Test critical endpoints
    critical_endpoints = [
        'job_board_main',
        'job_details', 
        'job_user_metadata',
        'scraped_jobs'
    ]
    
    for endpoint in critical_endpoints:
        if endpoint in tables:
            try:
                response = requests.get(f"{POSTGREST_BASE}/{endpoint}?limit=1", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    print(f"  ✅ /{endpoint} → {len(data)} record(s)")
                    
                    # Show available fields for main endpoints
                    if endpoint in ['job_board_main', 'job_details'] and data:
                        fields = list(data[0].keys())
                        print(f"      Fields: {', '.join(fields[:8])}{'...' if len(fields) > 8 else ''}")
                else:
                    print(f"  ❌ /{endpoint} → HTTP {response.status_code}")
            except requests.RequestException as e:
                print(f"  ❌ /{endpoint} → Request failed: {e}")
        else:
            print(f"  ❌ /{endpoint} → Table/view not found")

def test_advanced_queries(conn):
    """Test advanced query capabilities."""
    print("\n🔍 === ADVANCED QUERY CAPABILITIES ===")
    
    if not test_postgrest():
        return
    
    print("Testing advanced PostgREST queries:")
    
    # Test JSONB queries
    try:
        response = requests.get(f"{POSTGREST_BASE}/job_user_metadata?exclusion_sources=cs.[\"manual\"]&limit=1", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ JSONB containment query → {len(data)} manual exclusions found")
        else:
            print(f"  ⚠️  JSONB query returned HTTP {response.status_code}")
    except Exception as e:
        print(f"  ❌ JSONB query failed: {e}")
    
    # Test computed column filtering
    try:
        response = requests.get(f"{POSTGREST_BASE}/job_board_main?job_role=eq.General&limit=1", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Computed column filter (job_role) → {len(data)} records")
        else:
            print(f"  ⚠️  Computed column query returned HTTP {response.status_code}")
    except Exception as e:
        print(f"  ❌ Computed column query failed: {e}")
    
    # Test full-text search
    try:
        response = requests.get(f"{POSTGREST_BASE}/job_board_main?title=ilike.*Engineer*&limit=1", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Full-text search (title) → {len(data)} records")
        else:
            print(f"  ⚠️  Full-text search returned HTTP {response.status_code}")
    except Exception as e:
        print(f"  ❌ Full-text search failed: {e}")

def generate_frontend_config():
    """Generate frontend configuration recommendations."""
    print("\n⚙️  === FRONTEND CONFIGURATION RECOMMENDATIONS ===")
    
    frontend_config = {
        "api_base": "http://127.0.0.1:3001",
        "primary_view": "job_board_main",
        "available_views": [
            "job_board_main",
            "job_board_applied", 
            "job_board_needs_review",
            "job_board_remote",
            "job_board_with_salary",
            "job_board_export"
        ],
        "features": {
            "jsonb_exclusion_tracking": "Check if exclusion_sources column exists",
            "computed_columns": "Check if job_role and location_scope are available",
            "session_tracking": "Check if exclusion_session_id is populated",
            "bulk_operations": "Use job_user_metadata for batch updates",
            "advanced_search": "Full-text search on title, company, description"
        },
        "batch_update_endpoint": "/job_user_metadata",
        "export_endpoint": "/job_board_export"
    }
    
    print(json.dumps(frontend_config, indent=2))

def main():
    """Main discovery function."""
    print("🔍 JobScraps Backend Discovery")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    print(f"PostgREST: {POSTGREST_BASE}")
    print()
    
    # Connect to database
    conn = connect_db()
    if not conn:
        sys.exit(1)
    
    try:
        # Run all discovery tests
        get_database_info(conn)
        get_tables_and_views(conn)
        test_computed_columns(conn)
        analyze_jsonb_exclusions(conn)
        test_session_tracking(conn)
        test_postgrest_endpoints(conn)
        test_advanced_queries(conn)
        generate_frontend_config()
        
        print("\n🎉 === DISCOVERY COMPLETE ===")
        print("💡 Use this information to design your frontend capabilities!")
        print("📋 Feed the relevant artifacts to your frontend development session.")
        
    finally:
        conn.close()

if __name__ == "__main__":
    main()