"""Clear the LLM cache to force regeneration of lessons with new prompts."""
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import get_session
from app.models import LLMCacheRecord

def clear_cache():
    with get_session() as session:
        # Count existing cache entries
        from sqlmodel import select
        cached = session.exec(select(LLMCacheRecord)).all()
        count = len(cached)
        
        if count == 0:
            print("✅ Cache is already empty!")
            return
        
        print(f"🗑️  Found {count} cached lesson(s)")
        confirm = input("Clear all cached lessons? (y/N): ")
        
        if confirm.lower() == 'y':
            # Delete all cache entries
            for record in cached:
                session.delete(record)
            session.commit()
            print(f"✅ Cleared {count} cached lesson(s)!")
            print("📝 New lessons will now use the updated short question format")
        else:
            print("❌ Cache clear cancelled")

if __name__ == "__main__":
    clear_cache()

