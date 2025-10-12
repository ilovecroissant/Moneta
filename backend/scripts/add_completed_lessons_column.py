import os
import sys
from sqlalchemy import text

# Ensure backend root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import engine


def main() -> None:
    """Add completed_lessons column to user table if it doesn't exist"""
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("PRAGMA table_info(user)"))
        columns = [row[1] for row in result]
        
        if 'completed_lessons' not in columns:
            print("Adding completed_lessons column to user table...")
            conn.execute(text(
                "ALTER TABLE user ADD COLUMN completed_lessons VARCHAR DEFAULT ''"
            ))
            conn.commit()
            print("Column added successfully!")
        else:
            print("Column 'completed_lessons' already exists.")


if __name__ == "__main__":
    main()

