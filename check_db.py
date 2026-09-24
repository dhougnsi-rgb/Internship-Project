"""
Database utility script for checking PostgreSQL database tables and data.
Requires PostgreSQL to be running and DATABASE_URL to be configured in backend/.env
"""
import os
import sys
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SQLALCHEMY_DATABASE_URL, Base

def check_database():
    """Check database tables and their contents"""
    try:
        # Create engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        # Create inspector
        inspector = inspect(engine)
        
        # Get all table names
        tables = inspector.get_table_names()
        print(f"Tables in database: {tables}")
        
        # Check each table
        Session = sessionmaker(bind=engine)
        session = Session()
        
        for table_name in tables:
            print(f"\n--- Table: {table_name} ---")
            
            # Get column information
            columns = inspector.get_columns(table_name)
            print(f"Columns: {[col['name'] for col in columns]}")
            
            # Count rows
            try:
                result = session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = result.scalar()
                print(f"Row count: {count}")
                
                # Show first few rows if table has data
                if count > 0 and count <= 10:
                    result = session.execute(text(f"SELECT * FROM {table_name}"))
                    rows = result.fetchall()
                    print(f"Data: {rows}")
                elif count > 10:
                    print(f"Data: (First 10 rows shown)")
                    result = session.execute(text(f"SELECT * FROM {table_name} LIMIT 10"))
                    rows = result.fetchall()
                    print(f"Data: {rows}")
                    
            except Exception as e:
                print(f"Error querying table: {e}")
        
        session.close()
        print("\nDatabase check completed successfully.")
        
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("Make sure PostgreSQL is running and DATABASE_URL is correctly set in backend/.env")
        sys.exit(1)

if __name__ == "__main__":
    check_database()