import json
import hashlib
import re
from typing import Tuple

from sqlmodel import select

try:
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover - allow running without the lib in some envs
    genai = None  # fallback; tests may inject a fake provider

from ..config import settings
from ..db import get_session
from ..models import LLMCacheRecord
from ..schemas import Lesson, LessonGenerationRequest, ChoiceOption, Question


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _extract_json(markdown_or_json: str) -> str:
    # Handle ```json ... ``` or ``` ... ``` fences; otherwise return as-is
    m = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", markdown_or_json)
    if m:
        return m.group(1)
    m = re.search(r"```\s*([\s\S]*?)\s*```", markdown_or_json)
    if m:
        return m.group(1)
    return markdown_or_json


def _lesson_prompt(req: LessonGenerationRequest) -> str:
    difficulty = req.difficulty or "beginner-friendly"
    return f"""
You are a friendly finance tutor for teens. Create a concise lesson as strict JSON only (no markdown), following this schema:

{{
  "title": string,
  "category": "{req.category}",
  "level": {req.level},
  "questions": [
    {{
      "id": string,
      "type": "mcq" | "fill" | "free",
      "prompt": string,
      "options": [{{"id": "A","text": string}},{{"id":"B","text":string}},{{"id":"C","text":string}},{{"id":"D","text":string}}] (only for mcq),
      "correct_answer": string (for mcq/fill; for mcq must be one of "A","B","C","D"),
      "hint": string,
      "explanation": string
    }}
  ]
}}

Constraints:
- Exactly {req.num_questions} questions.
- For every question with type "mcq": include exactly 4 options with ids A, B, C, D.
- For every "mcq": set "correct_answer" to one of "A","B","C","D".
- Tone: short, warm, Duolingo-like.
- Explanations are one-liners.
- Keep math simple and age-appropriate.
- Return ONLY JSON with the exact fields.

Topic: {req.category}
Level: {req.level}
Difficulty: {difficulty}
"""


def _ensure_model():
    if genai is None:
        raise RuntimeError("google-generativeai is not available. Install it or inject a fake provider for tests.")
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    return genai.GenerativeModel("gemini-2.5-flash")


def generate_lesson(req: LessonGenerationRequest) -> Tuple[Lesson, bool]:
    prompt = _lesson_prompt(req)
    ph = _hash(prompt)

    with get_session() as session:
        cached = session.exec(select(LLMCacheRecord).where(LLMCacheRecord.prompt_hash == ph)).first()
        if cached:
            data = json.loads(cached.response_json)
            return Lesson(**data), True

        # Call Gemini
        model = _ensure_model()
        resp = model.generate_content(prompt)
        raw_text = (getattr(resp, "text", None) or "").strip()
        json_text = _extract_json(raw_text)
        data = json.loads(json_text)

        # Validate
        lesson = Lesson(**data)
        _enforce_mcq_four_options(lesson)

        # Persist cache with normalized lesson
        normalized = lesson.model_dump() if hasattr(lesson, "model_dump") else lesson.dict()
        session.add(LLMCacheRecord(prompt_hash=ph, response_json=json.dumps(normalized)))
        session.commit()
        return lesson, False


def _enforce_mcq_four_options(lesson: Lesson) -> None:
    desired_ids = ["A", "B", "C", "D"]
    for q in lesson.questions:
        if q.type != "mcq":
            continue
        existing_texts = [opt.text for opt in (q.options or []) if getattr(opt, "text", None)]
        while len(existing_texts) < 4:
            existing_texts.append("Option")
        existing_texts = existing_texts[:4]
        q.options = [ChoiceOption(id=oid, text=existing_texts[i]) for i, oid in enumerate(desired_ids)]
        ca = (q.correct_answer or "").strip().upper()
        q.correct_answer = ca if ca in desired_ids else "A"


def finance_chat(message: str, context: str | None = None) -> str:
    model = _ensure_model()
    system = (
        "You are a patient, upbeat finance coach for teens. "
        "Answer briefly (2-4 sentences), with simple words, and examples where helpful."
    )
    full = f"{system}\nContext: {context or 'n/a'}\nQuestion: {message}"
    resp = model.generate_content(full)
    return (getattr(resp, "text", "") or "").strip()


def check_free_response(question: Question, user_answer: str) -> Tuple[bool, str]:
    model = _ensure_model()
    rubric = (
        "You are grading a teen's short finance answer. "
        "Decide if it correctly and succinctly answers the prompt. "
        "Respond with strict JSON: {\"correct\": boolean, \"feedback\": string}."
    )
    prompt = f"{rubric}\nPrompt: {question.prompt}\nStudent: {user_answer}"
    resp = model.generate_content(prompt)
    raw = (getattr(resp, "text", "") or "").strip()
    try:
        data = json.loads(_extract_json(raw))
        return bool(data.get("correct", False)), str(data.get("feedback", ""))
    except Exception:
        return False, "Couldn't check your answer. Try again with a clearer response."

