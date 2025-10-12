# API Fixes Applied

## Issues Fixed:

### 1. **Chat API**
- **Problem**: Frontend was passing `{ message }` but backend expected `{ message, context? }`
- **Problem**: Frontend expected `data.response` but backend returned `data.answer`
- **Fix**: Updated API to accept object with message and context, return full response object

### 2. **Generate Lesson API**
- **Problem**: Wrong endpoint `/generate-lesson` instead of `/lessons/generate`
- **Problem**: Wrong parameters (category, user_level, known_topics) vs (category, level, num_questions, difficulty)
- **Fix**: Updated to use correct endpoint and parameters

### 3. **Evaluate Answers API**
- **Problem**: Wrong endpoint `/evaluate-answers` instead of `/lessons/evaluate_answers`
- **Problem**: Wrong request format
- **Fix**: Updated to send `{ lesson, answers: [{ question_id, user_answer }] }`

### 4. **Progress API**
- **Problem**: Using localStorage instead of backend
- **Fix**: Created real API calls to `/progress/{handle}` for GET and POST

### 5. **Check Free API**
- **Problem**: Wrong endpoint and wrong response type
- **Fix**: Updated to `/lessons/check_free` with correct request/response format

## Backend Endpoints:

```
POST /chat
  Request: { message: string, context?: string }
  Response: { answer: string }

POST /lessons/generate
  Request: { category: string, level: number, num_questions: number, difficulty?: string }
  Response: { lesson: Lesson, cached: boolean }

POST /lessons/evaluate_answers
  Request: { lesson: Lesson, answers: [{ question_id: string, user_answer: string }] }
  Response: { score: number, correct_count: number, total: number, details: [...], recommendation: string }

POST /lessons/check_free
  Request: { question: Question, user_answer: string }
  Response: { correct: boolean, feedback?: string }

GET /progress/{handle}
  Response: { handle: string, xp: number, streak: number, unlocked: string[] }

POST /progress/{handle}
  Request: { xp?: number, streak?: number }
  Response: { handle: string, xp: number, streak: number, unlocked: string[] }
```

## What Should Work Now:

✅ Chat with AI coach  
✅ Generate lessons from backend  
✅ Evaluate quiz answers  
✅ Check free-text responses  
✅ Save progress to database  
✅ Load progress from database  
✅ Unlock lessons based on XP  

## Testing:

1. Open http://localhost:3000
2. Click on a lesson node
3. Lesson should generate (not locked anymore!)
4. Answer questions
5. Submit quiz
6. Progress should save to database
7. Chat should work

The database (`backend/app.db`) should now store user progress properly!
