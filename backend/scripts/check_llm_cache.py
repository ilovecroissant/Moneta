import json
import os
import sys
from dataclasses import dataclass

# Ensure backend root is importable (so `import app` works when running this file directly)
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import init_db, get_session
from app.models import LLMCacheRecord
from app.schemas import LessonGenerationRequest
from app.services import llm as llm_service


@dataclass
class FakeResp:
    text: str


class FakeModel:
    def __init__(self, response_json: dict):
        self._payload = json.dumps(response_json)

    def generate_content(self, prompt: str) -> FakeResp:
        return FakeResp(text=self._payload)


def sample_lesson_payload() -> dict:
    return {
        "title": "Budget Basics",
        "category": "Budgeting & Saving Basics",
        "level": 1,
        "questions": [
            {
                "id": "q1",
                "type": "mcq",
                "prompt": "What is a budget?",
                "options": [
                    {"id": "A", "text": "A plan for your money"},
                    {"id": "B", "text": "A type of bank account"},
                ],
                "correct_answer": "A",
                "hint": "It helps you track spending",
                "explanation": "A budget is a simple plan for your income and spending.",
            }
        ],
    }


def main() -> None:
    # Ensure tables
    init_db()

    # Patch the LLM service to avoid real network calls
    payload = sample_lesson_payload()
    original_ensure = llm_service._ensure_model

    def fake_ensure():
        return FakeModel(response_json=payload)

    llm_service._ensure_model = fake_ensure  # type: ignore
    try:
        req = LessonGenerationRequest(category=payload["category"], level=payload["level"], num_questions=1)

        lesson1, cached1 = llm_service.generate_lesson(req)
        print("First call cached=", cached1, "title=", lesson1.title)

        # Confirm cache record exists
        with get_session() as s:
            count = s.query(LLMCacheRecord).count()  # type: ignore
        print("Cache rows after first call:", count)

        lesson2, cached2 = llm_service.generate_lesson(req)
        print("Second call cached=", cached2, "title=", lesson2.title)

        assert cached1 is False, "Expected first call to be a cache miss"
        assert cached2 is True, "Expected second call to be a cache hit"
        assert lesson1.title == lesson2.title
        print("OK: cache is working")
    finally:
        llm_service._ensure_model = original_ensure  # type: ignore


if __name__ == "__main__":
    main()


