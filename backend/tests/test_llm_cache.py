import json
from contextlib import contextmanager
from dataclasses import dataclass

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


@contextmanager
def inject_fake_model(payload: dict):
    orig_ensure = llm_service._ensure_model

    def _fake_ensure():
        return FakeModel(response_json=payload)

    llm_service._ensure_model = _fake_ensure  # type: ignore
    try:
        yield
    finally:
        llm_service._ensure_model = orig_ensure  # type: ignore


def _sample_lesson_payload():
    return {
        "title": "Credit Basics",
        "category": "Credit & Debt",
        "level": 1,
        "questions": [
            {
                "id": "q1",
                "type": "mcq",
                "prompt": "What is credit score?",
                "options": [
                    {"id": "A", "text": "A measure of your ice cream"},
                    {"id": "B", "text": "A measure of your borrowing risk"},
                ],
                "correct_answer": "B",
                "hint": "Think lenders",
                "explanation": "It estimates how risky it is to lend to you.",
            }
        ],
    }


def test_llm_cache_roundtrip(tmp_path, monkeypatch):
    # Init DB tables
    init_db()

    req = LessonGenerationRequest(category="Credit & Debt", level=1, num_questions=1)
    payload = _sample_lesson_payload()

    with inject_fake_model(payload):
        # First call -> miss -> store
        lesson, cached = llm_service.generate_lesson(req)
        assert cached is False
        assert lesson.title == payload["title"]

        # Ensure cache stored
        with get_session() as s:
            recs = list(s.query(LLMCacheRecord).all())  # type: ignore
            assert len(recs) == 1

        # Second call -> hit
        lesson2, cached2 = llm_service.generate_lesson(req)
        assert cached2 is True
        assert lesson2.title == lesson.title


