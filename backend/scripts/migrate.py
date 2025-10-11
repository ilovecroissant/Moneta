import os
import sys
from typing import Dict

from dotenv import load_dotenv
from sqlalchemy import inspect, text

# Ensure backend root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import init_db, engine


def get_table_counts() -> Dict[str, int]:
    counts: Dict[str, int] = {}
    with engine.connect() as conn:
        inspector = inspect(conn)
        for table in inspector.get_table_names():
            try:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                counts[table] = int(result.scalar() or 0)
            except Exception:
                counts[table] = -1
    return counts


def main() -> None:
    load_dotenv()
    print("DATABASE_URL=", os.getenv("DATABASE_URL"))

    # Create tables if they don't exist (simple migration)
    init_db()

    counts = get_table_counts()
    if not counts:
        print("No tables found.")
    else:
        print("Tables and row counts:")
        for name, cnt in counts.items():
            print(f" - {name}: {cnt}")


if __name__ == "__main__":
    main()


