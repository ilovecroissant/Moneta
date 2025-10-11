from fastapi import APIRouter, HTTPException

from typing import List
from ..schemas import (
    LessonGenerationRequest,
    LessonResponse,
    EvaluateRequest,
    EvaluateResponse,
    EvaluateDetail,
    FreeCheckRequest,
    FreeCheckResponse,
)
from ..services.llm import generate_lesson, check_free_response


router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.post("/generate", response_model=LessonResponse)
def generate(req: LessonGenerationRequest) -> LessonResponse:
    try:
        lesson, cached = generate_lesson(req)
        return LessonResponse(lesson=lesson, cached=cached)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _norm(s: str | None) -> str:
    return (s or "").strip().lower()


@router.post("/evaluate_answers", response_model=EvaluateResponse)
def evaluate_answers(req: EvaluateRequest) -> EvaluateResponse:
    answer_map = {a.question_id: a.user_answer for a in req.answers}
    details: List[EvaluateDetail] = []
    correct_count = 0
    total = len(req.lesson.questions)

    for q in req.lesson.questions:
        ua = _norm(answer_map.get(q.id))
        correct = False
        ca = _norm(q.correct_answer)

        if q.type == "mcq":
            correct = ua == ca and ca != ""
        elif q.type == "fill":
            correct = ca != "" and (ua == ca or ca in ua or ua in ca)
        else:
            correct = False  # free-text not auto-graded in MVP

        if correct:
            correct_count += 1

        details.append(EvaluateDetail(
            question_id=q.id,
            correct=correct,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
        ))

    score = round(correct_count / max(1, total), 2)
    if score < 0.6:
        recommendation = f"Review {req.lesson.category} level {req.lesson.level} and try again."
    else:
        recommendation = f"Great job! Unlock level {req.lesson.level + 1} in {req.lesson.category}."

    return EvaluateResponse(
        score=score,
        correct_count=correct_count,
        total=total,
        details=details,
        recommendation=recommendation,
    )


@router.post("/check_free", response_model=FreeCheckResponse)
def check_free(req: FreeCheckRequest) -> FreeCheckResponse:
    try:
        ok, feedback = check_free_response(req.question, req.user_answer)
        return FreeCheckResponse(correct=ok, feedback=feedback)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


