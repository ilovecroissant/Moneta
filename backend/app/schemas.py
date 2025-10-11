from typing import List, Literal, Optional
from pydantic import BaseModel


class HealthResponse(BaseModel):
    ok: bool


class ChoiceOption(BaseModel):
    id: str
    text: str


class Question(BaseModel):
    id: str
    type: Literal["mcq", "fill", "free"]
    prompt: str
    options: Optional[List[ChoiceOption]] = None
    correct_answer: Optional[str] = None
    hint: Optional[str] = None
    explanation: Optional[str] = None


class Lesson(BaseModel):
    title: str
    category: str
    level: int
    questions: List[Question]


class LessonGenerationRequest(BaseModel):
    category: str
    level: int
    num_questions: int = 5
    difficulty: Optional[str] = None


class LessonResponse(BaseModel):
    lesson: Lesson
    cached: bool = False


# --- Chat ---
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str


# --- Evaluation ---
class EvaluateAnswer(BaseModel):
    question_id: str
    user_answer: str


class EvaluateDetail(BaseModel):
    question_id: str
    correct: bool
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None


class EvaluateRequest(BaseModel):
    lesson: Lesson
    answers: List[EvaluateAnswer]


class EvaluateResponse(BaseModel):
    score: float
    correct_count: int
    total: int
    details: List[EvaluateDetail]
    recommendation: str


# --- Free response check ---
class FreeCheckRequest(BaseModel):
    question: Question
    user_answer: str


class FreeCheckResponse(BaseModel):
    correct: bool
    feedback: Optional[str] = None


# --- Progress ---
class Progress(BaseModel):
    handle: str
    xp: int
    streak: int
    unlocked: List[str]

