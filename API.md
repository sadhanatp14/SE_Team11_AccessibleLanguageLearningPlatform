# API Documentation

Base URL (local dev):

- Backend: `http://localhost:5002`
- API namespace: `/api`

Most endpoints are protected and require a JWT:

- Header: `Authorization: Bearer <token>`

Common response patterns:

- Success responses typically include `success: true`.
- Error responses typically include `success: false`, a `message`, and sometimes `errors`.

## Health

### GET /health

Returns server status.

### GET /api/health

Returns API namespace status.

## Auth

### POST /api/auth/register

Registers a new user.

Request body (example):

```json
{
  "name": "Student",
  "email": "student@example.com",
  "password": "password123",
  "learningCondition": "dyslexia",
  "age": 12,
  "isMinor": true,
  "parentEmail": "parent@example.com"
}
```

Response (example):

```json
{
  "success": true,
  "message": "Registration successful",
  "token": "<jwt>",
  "user": {
    "id": "<mongo_object_id>",
    "name": "Student",
    "email": "student@example.com",
    "learningCondition": "dyslexia",
    "requiresParentalApproval": true
  }
}
```

Notes:

- `learningCondition` must be one of: `dyslexia`, `adhd`, `autism`, `none`.
- A `Preferences` document is created with condition-specific defaults.

### POST /api/auth/login


### Admin Routes

#### GET /api/admin/users
List all users. Requires admin authentication.

#### GET /api/admin/users/:id
Return detailed information about a user, including progress summary and interaction records. Admin-only.


Logs in a user.

Request body:

```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

Response includes `token` and `user`.

### GET /api/auth/me

Returns the current authenticated user (requires token).

### POST /api/auth/logout

JWT logout is client-side; this endpoint returns a success message (requires token).

## Preferences

All preferences endpoints require authentication.

### GET /api/preferences

Returns the preferences for the current user.

### PUT /api/preferences

Creates or replaces preferences for the current user.

### PATCH /api/preferences/accessibility

Updates core accessibility fields.

Request body (any subset):

```json
{
  "fontSize": "large",
  "contrastTheme": "high-contrast",
  "learningPace": "slow",
  "fontFamily": "opendyslexic",
  "letterSpacing": "wide",
  "distractionFreeMode": true
}
```

### PATCH /api/preferences/dyslexia

Updates dyslexia-specific settings.

### PATCH /api/preferences/adhd

Updates ADHD-specific settings.

### PATCH /api/preferences/autism

Updates autism-specific settings.

### DELETE /api/preferences/reset

Resets preferences to condition-specific defaults based on the current user's `learningCondition`.

## Users

All user endpoints require authentication.

### GET /api/users/profile

Returns the authenticated user's profile.

### PUT /api/users/profile

Updates profile fields (subset of `name`, `age`, `parentEmail`).

### POST /api/users/complete-lesson

Marks a lesson as completed.

Request body:

```json
{
  "lessonKey": "<lessonId>"
}
```

Notes:

- `lessonKey` may contain a MongoDB ObjectId, or a non-database key.
- Response includes `completedLessons` and may include a `summary`.

### GET /api/users/completed-lessons

Returns the user's completed lesson keys.

## Lessons

All lesson endpoints require authentication.

### GET /api/lessons/search?q=

Searches lessons. Uses embedding-based search when configured; falls back to MongoDB text search.

Example:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5002/api/lessons/search?q=greetings"
```

### GET /api/lessons/:lessonId/sections

Returns ordered lesson sections.

### GET /api/lessons/:id

Returns a lesson by id.

## Interactions

All interaction endpoints require authentication.

### POST /api/interactions/submit

Submits an answer for an interaction.

Request body:

```json
{
  "lessonId": "<lessonId>",
  "interactionId": "q1",
  "selectedAnswer": "A"
}
```

Response (example):

```json
{
  "isCorrect": false,
  "feedback": "Try again",
  "hint": "Look for the greeting word",
  "encouragement": "Learning takes practice. Keep going!"
}
```

### POST /api/interactions/help

Requests help (hint or explanation) for an interaction.

Request body:

```json
{
  "lessonId": "<lessonId>",
  "interactionId": "q1"
}
```

## Progress

All progress endpoints require authentication.

### GET /api/progress/summary

Returns a progress summary payload:

- `totalLessons`
- `completedCount`
- `remaining`
- `completedLessons` list

### GET /api/progress/:lessonId

Returns progress for a specific lesson. If no progress exists yet, the backend creates a default progress document.

### POST /api/progress/update

Auto-saves progress when advancing.

Request body (example):

```json
{
  "lessonId": "<lessonId>",
  "currentSectionId": "<sectionId>",
  "completedSections": ["<sectionId>"]
}
```

Notes:

- When `isReplay` is true, the backend returns the existing progress without mutating it.

## TTS

### POST /api/tts/speak

Generates and streams MP3 audio for the provided text.

Request body:

```json
{
  "text": "Hello and welcome",
  "speed": "0.85"
}
```

Response:

- Content-Type: `audio/mpeg`
- Body: binary MP3 stream

Notes:

- Requires Python dependencies if using the backend TTS generator.
- Frontend may fall back to browser speech synthesis if needed.

## AI (optional)

These endpoints do not require auth in the current backend implementation.

### POST /api/ai/generate-questions

Request body:

```json
{
  "topic": "greetings",
  "context": "beginner"
}
```

Response:

```json
{
  "questions": [
    {
      "type": "quiz",
      "question": "...",
      "options": ["..."],
      "correct": "...",
      "hint": "..."
    }
  ]
}
```

### POST /api/ai/story-quiz

Request body:

```json
{
  "storyText": "Once upon a time..."
}
```

Returns questions or a fallback mock payload if Gemini is unavailable.

## Dev-only routes

Mounted only when `NODE_ENV !== 'production'`.

### POST /api/dev/create-test-lesson

Creates a test lesson and a set of sections.

Request body (optional):

```json
{
  "title": "Test Lesson",
  "sections": [
    { "title": "Part 1", "text": "P1" },
    { "title": "Part 2", "text": "P2" }
  ]
}
```
