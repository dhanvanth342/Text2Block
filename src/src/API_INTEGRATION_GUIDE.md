# API Integration Guide - External Python Backend

## Overview

This document describes the centralized API service architecture for communicating with the external Python backend that handles semantic analysis and prompt optimization.

---

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│   React UI      │ ───> │  API Service     │ ───> │  Python Backend     │
│  (ChatWorkspace)│      │  (services/api.ts)│      │  (localhost:8000)   │
└─────────────────┘      └──────────────────┘      └─────────────────────┘
         │                        │                           │
         │                        │                           │
         v                        v                           v
  State Management         Request/Response              Semantic Analysis
  - IDLE                   Transformation                - Intent Detection
  - LOADING                - Map Supabase → Backend      - Prompt Optimization
  - GENERIC_DISPLAY        - Parse response types        - Generic QA
  - TUTORIAL_EDIT          - Error handling
  - ERROR
```

---

## 1. API Service (`/services/api.ts`)

### Configuration

**Base URL:**
- Default: `http://localhost:8000`
- Override: Set `NEXT_PUBLIC_BACKEND_URL` environment variable

**Example:**
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

### Main Function: `optimizePrompt`

#### Purpose
Sends user query and profile to backend for semantic analysis and returns structured response.

#### Signature
```typescript
optimizePrompt(
  userQuery: string,
  userProfile: UserProfile
): Promise<ApiResponse>
```

#### Input Parameters

**userQuery** (string)
- The user's input text/question
- Example: `"teach me react hooks"`

**userProfile** (UserProfile object)
```typescript
interface UserProfile {
  education_level: string;    // e.g., "Master in Computer Science"
  experience_level: string;   // e.g., "3 years as Product Manager"
  user_introduction: string;  // User's bio/introduction
}
```

#### Data Mapping

The function maps Supabase profile keys to backend's expected format:

```typescript
// Supabase → Backend Mapping
{
  user_query: userQuery,
  user_profile: {
    education: userProfile.education_level,      // Renamed
    experience: userProfile.experience_level,    // Renamed
    introduction: userProfile.user_introduction  // Renamed
  }
}
```

#### Request Details

```typescript
POST /api/optimize_prompt
Content-Type: application/json

Body:
{
  "user_query": "teach me react hooks",
  "user_profile": {
    "education": "Master in Computer Science",
    "experience": "3 years as Product Manager",
    "introduction": "I'm passionate about learning..."
  }
}
```

---

## 2. Response Handling

### Response Types

The API returns one of three structured responses:

#### Type 1: ERROR Mode

**Trigger:**
- Missing `type` field in response
- HTTP error status
- Network failure
- Invalid JSON

**Response Structure:**
```typescript
{
  mode: 'ERROR',
  payload: string  // Error message
}
```

**Example:**
```json
{
  "mode": "ERROR",
  "payload": "Missing input field: user_query"
}
```

**UI Behavior:**
- Display toast notification (red)
- Show error message from `payload`
- Keep input enabled for retry
- Do NOT change chat history

---

#### Type 2: DISPLAY_MODE (Generic Response)

**Trigger:**
- Backend returns `{ "type": "generic" }`
- User asked a simple question
- No tutorial generation needed

**Response Structure:**
```typescript
{
  mode: 'DISPLAY_MODE',
  payload: string  // Direct answer
}
```

**Backend Response Example:**
```json
{
  "type": "generic",
  "response": "React Hooks were introduced in React 16.8..."
}
```

**Parsed Result:**
```typescript
{
  mode: 'DISPLAY_MODE',
  payload: "React Hooks were introduced in React 16.8..."
}
```

**UI Behavior:**
- ✅ Append answer to chat history as assistant message
- ✅ Display with ChatMessage component
- ✅ Support Markdown formatting
- ✅ Keep input enabled for follow-up questions
- ❌ Do NOT show optimization card
- ❌ Do NOT navigate to article view

**Visual Design:**
- Left-aligned message bubble
- Glass surface background
- Bot avatar icon
- Timestamp
- Markdown support (code blocks, lists, bold, etc.)

---

#### Type 3: EDIT_MODE (Tutorial Optimization)

**Trigger:**
- Backend returns `{ "type": "tutorial" }`
- User requested tutorial/learning content
- Semantic analysis determined tutorial needed

**Response Structure:**
```typescript
{
  mode: 'EDIT_MODE',
  payload: string  // Optimized prompt
}
```

**Backend Response Example:**
```json
{
  "type": "tutorial",
  "optimized_prompt": "Create a comprehensive tutorial on React Hooks covering useState, useEffect, and useContext with practical examples for intermediate developers."
}
```

**Parsed Result:**
```typescript
{
  mode: 'EDIT_MODE',
  payload: "Create a comprehensive tutorial on React Hooks..."
}
```

**UI Behavior:**
- ✅ Show OptimizationCard component
- ✅ Display optimized prompt in editable textarea
- ✅ Disable main input (focus on optimization)
- ✅ Show "Edit" and "Accept & Generate" buttons
- ❌ Do NOT add to chat history yet

**Visual Design:**
- Centered card with purple/blue gradient border
- Distinct from chat messages (stands out)
- Sparkles icon to indicate AI checkpoint
- Editable textarea with monospace font
- Character count indicator
- Two-button action bar

---

## 3. UI State Machine

### States

#### IDLE
- **When:** Initial state, waiting for user input
- **UI:** Input enabled, no loading indicators
- **Allowed Actions:** Submit query

#### LOADING
- **When:** API request in progress
- **UI:** 
  - Input disabled
  - Show "Analyzing semantic intent..." with animated dots
  - Loading spinner in bot avatar
- **Allowed Actions:** None (wait for response)

#### GENERIC_DISPLAY
- **When:** Generic response received and displayed
- **UI:** 
  - Answer shown in chat
  - Input re-enabled immediately
  - User can ask follow-up questions
- **Allowed Actions:** Submit new query, continue conversation

#### TUTORIAL_EDIT
- **When:** Optimization prompt received
- **UI:**
  - OptimizationCard visible
  - Main input disabled
  - Focus on optimization textarea
- **Allowed Actions:** 
  - Edit prompt
  - Accept → Navigate to article generation
  - Cancel → Return to IDLE

#### ERROR
- **When:** API error occurred
- **UI:**
  - Toast notification visible
  - Input re-enabled
  - Error message displayed
- **Allowed Actions:** Retry query, submit new query

---

## 4. Component Architecture

### ChatWorkspace (`/components/ChatWorkspace.tsx`)

**Purpose:** Main chat interface that integrates with API service

**Props:**
```typescript
interface ChatWorkspaceProps {
  userProfile: UserProfile | null;
  onGenerateTutorial: (optimizedPrompt: string) => void;
  isDark: boolean;
}
```

**State:**
```typescript
const [query, setQuery] = useState('');
const [interactionMode, setInteractionMode] = useState<InteractionMode>('IDLE');
const [messages, setMessages] = useState<Message[]>([]);
const [optimizedPrompt, setOptimizedPrompt] = useState('');
const [errorMessage, setErrorMessage] = useState('');
```

**Flow:**
1. User types query and hits "Send"
2. Add user message to chat history
3. Set mode to LOADING
4. Call `optimizePrompt(query, userProfile)`
5. Parse response mode:
   - DISPLAY_MODE → Add to chat, set mode to GENERIC_DISPLAY
   - EDIT_MODE → Show optimization card, set mode to TUTORIAL_EDIT
   - ERROR → Show toast, set mode to IDLE

---

### OptimizationCard (`/components/OptimizationCard.tsx`)

**Purpose:** Display and edit optimized tutorial prompt

**Props:**
```typescript
interface OptimizationCardProps {
  optimizedPrompt: string;
  onAccept: (finalPrompt: string) => void;
  onCancel?: () => void;
}
```

**Features:**
- Auto-resizing textarea based on content
- Character count indicator
- Edit button to focus textarea
- Accept button triggers tutorial generation
- Cancel button returns to chat
- Visual distinction (purple border, gradient background)

---

### ChatMessage (`/components/ChatMessage.tsx`)

**Purpose:** Display individual chat messages

**Props:**
```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}
```

**Features:**
- User messages: Right-aligned, blue gradient
- Assistant messages: Left-aligned, glass surface
- Markdown rendering with react-markdown
- Custom code block styling
- Timestamp display
- Avatar icons (User/Bot)

---

### Toast (`/components/Toast.tsx`)

**Purpose:** Display error notifications

**Props:**
```typescript
interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  duration?: number;
}
```

**Features:**
- Auto-dismiss after duration (default 5s)
- Slide-in animation
- Color-coded by type
- Dismissible with X button

---

## 5. User Flows

### Flow 1: Generic Question

```
1. User: "What is 6 * 216?"
2. ChatWorkspace calls optimizePrompt()
3. Backend returns:
   {
     "type": "generic",
     "response": "1296"
   }
4. API service returns:
   {
     "mode": "DISPLAY_MODE",
     "payload": "1296"
   }
5. ChatWorkspace adds assistant message to chat
6. User sees: "1296" in chat bubble
7. Input re-enabled, user can ask follow-up
```

**Visual Result:**
```
┌─────────────────────────────────────────┐
│  👤 What is 6 * 216?                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🤖 1296                                │
└─────────────────────────────────────────┘

[Input box enabled for next question]
```

---

### Flow 2: Tutorial Request

```
1. User: "teach me react hooks"
2. ChatWorkspace calls optimizePrompt()
3. Backend returns:
   {
     "type": "tutorial",
     "optimized_prompt": "Create a comprehensive tutorial..."
   }
4. API service returns:
   {
     "mode": "EDIT_MODE",
     "payload": "Create a comprehensive tutorial..."
   }
5. ChatWorkspace shows OptimizationCard
6. User sees editable prompt with "Accept & Generate"
7. User clicks Accept
8. ChatWorkspace calls onGenerateTutorial(finalPrompt)
9. Navigate to article generation view
```

**Visual Result:**
```
┌─────────────────────────────────────────┐
│  👤 teach me react hooks                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ✨ Refining Your Request               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Create a comprehensive tutorial │   │
│  │ on React Hooks covering...      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Edit]      [Cancel] [Accept & Generate]
└─────────────────────────────────────────┘

[Input box disabled during optimization]
```

---

### Flow 3: Error Handling

```
1. User: "complex query"
2. ChatWorkspace calls optimizePrompt()
3. Backend returns error or network fails
4. API service returns:
   {
     "mode": "ERROR",
     "payload": "Connection timeout"
   }
5. ChatWorkspace shows toast notification
6. User sees red toast: "Connection timeout"
7. Input remains enabled, user can retry
```

**Visual Result:**
```
┌───────────────────────────────────────┐
│  ⚠️ Connection timeout         [×]   │ <- Toast
└───────────────────────────────────────┘

[Chat history unchanged]
[Input box enabled for retry]
```

---

## 6. Backend Integration Requirements

### Expected Endpoint

```
POST http://localhost:8000/api/optimize_prompt
```

### Request Format

```json
{
  "user_query": "string (required)",
  "user_profile": {
    "education": "string (required)",
    "experience": "string (required)",
    "introduction": "string (required)"
  }
}
```

### Response Formats

#### Generic Response
```json
{
  "type": "generic",
  "response": "Direct answer string"
}
```

#### Tutorial Response
```json
{
  "type": "tutorial",
  "optimized_prompt": "Refined prompt for tutorial generation"
}
```

#### Error Response
```json
{
  "detail": {
    "message": "Error description"
  }
}
```

---

## 7. Testing the Integration

### Test Case 1: Generic Query
```typescript
// Expected: Direct answer in chat
await optimizePrompt("What is 2+2?", userProfile);
// Backend should return: { "type": "generic", "response": "4" }
```

### Test Case 2: Tutorial Query
```typescript
// Expected: Optimization card
await optimizePrompt("teach me python", userProfile);
// Backend should return: { "type": "tutorial", "optimized_prompt": "..." }
```

### Test Case 3: Error
```typescript
// Expected: Error toast
await optimizePrompt("", userProfile);
// Backend should return: 400 with error detail
```

---

## 8. Environment Setup

### Development
```bash
# .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Production
```bash
# .env.production
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

---

## 9. Key Files

```
/services/api.ts              - API client and request/response handling
/components/ChatWorkspace.tsx - Main chat UI with state machine
/components/OptimizationCard.tsx - Tutorial prompt editor
/components/ChatMessage.tsx   - Chat bubble renderer
/components/Toast.tsx         - Error notifications
/components/Dashboard.tsx     - Fetches user profile, orchestrates views
/types/profile.ts             - TypeScript type definitions
```

---

## 10. Debugging Tips

### Enable API Logging
All API calls log to console with `[API]` prefix:
```javascript
console.log('[API] Sending request to:', url);
console.log('[API] Payload:', payload);
console.log('[API] Response received:', data);
```

### Check Network Tab
- Look for POST to `/api/optimize_prompt`
- Verify request payload format
- Check response status and body

### Common Issues

**Issue:** "User profile not loaded"
- **Cause:** Dashboard couldn't fetch user_profile from Supabase
- **Fix:** Check profile endpoint returns `user_profile` JSONB

**Issue:** Backend not reachable
- **Cause:** CORS, wrong URL, backend down
- **Fix:** Check BASE_URL, verify backend running, enable CORS

**Issue:** Response type undefined
- **Cause:** Backend didn't include "type" field
- **Fix:** Ensure backend returns `{ "type": "tutorial" | "generic" }`

---

## 11. Future Enhancements

- [ ] Add retry logic for failed requests
- [ ] Implement request debouncing
- [ ] Add loading progress indicators
- [ ] Support conversation context in API calls
- [ ] Cache generic responses
- [ ] Add analytics tracking
- [ ] Support streaming responses

---

**Created:** December 12, 2024  
**Status:** ✅ Fully Implemented  
**Backend Required:** Python FastAPI at `localhost:8000`
