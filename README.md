# Job Tracker

![Output](./Output.png)

## Project Overview

A full-stack job application tracker built for active job seekers who apply to large volumes of roles across multiple platforms. It solves the friction of manually logging applications by pairing a **Chrome extension** (that auto-extracts job data from any job board) with a **web dashboard** (for filtering, editing, exporting, and tracking application status). A shared REST API and MongoDB backend keeps both surfaces in sync, including a monotonic application counter that stays consistent regardless of which client saves a job.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19 + Vite 8 | Latest concurrent React with fast HMR; no CRA overhead |
| Frontend routing | React Router v7 | Lightweight SPA routing with file-based page structure |
| Styling | Tailwind CSS (utility classes inline) + custom CSS | Utility classes for rapid layout; custom CSS for design tokens (card strips, badges, modals) |
| Linting | oxlint | Rust-based linter; orders of magnitude faster than ESLint at scale |
| Extension | Chrome MV3 (Manifest v3) | Required for any new Chrome extension submission; Service Worker background script |
| Extension side panel | Chrome Side Panel API | Persistent overlay that doesn't interrupt browsing, no popup dismissal UX friction |
| Extension AI feature | OpenAI `gpt-4o-mini` API (user-supplied key) | Cheapest capable model for ATS resume analysis; key stays client-side, never touches our backend |
| Extension PDF parsing | pdfjs-dist | Client-side PDF text extraction, no file upload needed |
| Backend | Node.js + Express 5 | Familiar JS stack, async-native; Express 5 ships built-in async error propagation |
| Database | MongoDB 7 + Mongoose 9 | Schema-flexible for evolving job fields; Mongoose validators enforce invariants at the model layer |
| Counter pattern | MongoDB `findOneAndUpdate` + `$inc` | Atomic, race-condition-safe application counter across concurrent clients |
| Dev proxy | Vite `server.proxy` | Forwards `/api/*` to `localhost:5000` in dev; eliminates CORS complexity |

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Browser
        EXT["Chrome Extension\n(MV3 Side Panel)"]
        WEB["React Web App\n(Vite Dev / Built)"]
    end

    subgraph "Content Layer"
        CS["content.js\n(injected into every tab)"]
        BG["background.js\n(Service Worker)"]
    end

    subgraph "Backend (Node / Express 5)"
        API["REST API\nlocalhost:5000"]
        JOB_ROUTES["/addJob  GET /  /updateJob  /deleteJob\n/exportToSheet  /resetDB"]
        PROMPT_ROUTES["/prompts  CRUD + /use"]
    end

    subgraph "MongoDB (local)"
        JOBS[(jobs collection)]
        PROMPTS[(prompts collection)]
        COUNTER[(counters collection)]
    end

    EXT -->|"chrome.tabs.sendMessage"| CS
    CS -->|"sendResponse / chrome.runtime"| EXT
    BG -->|"Side Panel open on icon click"| EXT

    EXT -->|"fetch POST /addJob\nfetch GET /exportToSheet\nfetch POST /resetDB\nfetch /prompts CRUD"| API
    WEB -->|"fetch /api/* (proxied)"| API

    EXT -->|"fetch POST (user's key)\ngpt-4o-mini"| OPENAI["OpenAI API\n(external)"]

    API --> JOB_ROUTES
    API --> PROMPT_ROUTES
    JOB_ROUTES --> JOBS
    JOB_ROUTES --> COUNTER
    PROMPT_ROUTES --> PROMPTS
```

---

## Data Model

```mermaid
erDiagram
    JOB {
        ObjectId _id PK
        string Title
        string Company
        string Location
        Date Date
        string Website
        string URL
        int Count
        string Status
        string Strategy
        string Category
        Date createdAt
        Date updatedAt
    }

    PROMPT {
        ObjectId _id PK
        string name
        string content
        string category
        int usageCount
        Date createdAt
        Date updatedAt
    }

    COUNTER {
        ObjectId _id PK
        string name UK
        int value
    }

    JOB ||--o{ COUNTER : "Count incremented by"
```

> **Note:** There is no auth/user model — this is a single-user local tool. `Counter` holds one document (`name: "jobs"`) that acts as the canonical application sequence number across all clients.

---

## Key Workflows

### 1. Saving a Job from the Extension

This flow shows the multi-step message-passing chain through Chrome's extension runtime and the atomic counter write.

```mermaid
sequenceDiagram
    actor User
    participant SP as Side Panel (sidepanel.js)
    participant CS as Content Script (content.js)
    participant BE as Express API
    participant DB as MongoDB

    User->>SP: Clicks "Save Job"
    SP->>CS: chrome.tabs.sendMessage({action:"saveJob"})
    CS->>CS: buildJobData() — extract title/company/location from DOM + page title regex
    CS-->>SP: {success:true, data:{Title,Company,...}}
    SP->>BE: POST /addJob (JSON body)
    BE->>BE: Validate required fields (Title, Company)
    BE->>DB: Counter.findOneAndUpdate({name:"jobs"}, {$inc:{value:1}})
    Note over BE,DB: Atomic $inc prevents duplicate Count<br/>even with concurrent requests
    DB-->>BE: {value: N}
    BE->>DB: Job.create({...fields, Count: N})
    DB-->>BE: saved Job document
    BE-->>SP: 201 {message, job}
    SP-->>User: alert("Job saved successfully!")
```

### 2. ATS Resume Analysis (Extension AI Feature)

This flow is entirely client-side and calls OpenAI directly — the backend is never involved.

```mermaid
sequenceDiagram
    actor User
    participant SP as Side Panel
    participant CS as Content Script
    participant PDF as pdfjs-dist (in-browser)
    participant OAI as OpenAI API

    User->>SP: Upload resume PDF + enter API key + optional prompt → click Analyze
    SP->>CS: chrome.tabs.sendMessage({type:"GET_DESCRIPTION"})
    CS->>CS: extractJobSections() — walk DOM for responsibilities/qualifications/requirements headings
    CS-->>SP: {description:{responsibilities:[],qualifications:[],requirements:[]}}
    SP->>PDF: file.text() — extract raw text from PDF
    PDF-->>SP: resumeText string
    SP->>OAI: POST /v1/chat/completions (gpt-4o-mini)\n{systemPrompt, jobDescription, resumeText, customPrompt}
    OAI-->>SP: {choices[0].message.content}
    SP-->>User: Render analysis (ATS keywords, match %, suggestions)
```

---

## Module Structure

```mermaid
classDiagram
    class App {
        +Router
        +Route / → Home
        +Route /NewJob → NewJob
    }

    class Home {
        -jobs: Job[]
        -search: string
        -editingJob: Job|null
        +fetchJobs()
        +handleSaveEdit(form)
        +handleDelete(job)
        +exportJobs()
        +resetDB()
    }

    class Card {
        +job: Job
        +onEdit(job)
        +onDelete(job)
        -categoryColor(c)
        -statusColor(s)
        -formatDate(d)
        -relativeDate(d)
    }

    class EditModal {
        -form: Record
        +onSave(form)
        +onClose()
    }

    class ContentScript {
        +getData()
        +buildJobData()
        +extractJobSections()
        +enableSelectionMode()
        -manualOverrides: Record
        -syncPageState()
    }

    class SidePanel {
        +saveJob()
        +getDetails()
        +selectValues()
        +analyze()
        +loadPrompts()
        +exportToSheet()
        +resetDB()
    }

    class BackendServer {
        +POST /addJob
        +GET /
        +PUT /updateJob/:id
        +DELETE /deleteJob/:id
        +GET /exportToSheet
        +POST /resetDB
        +GET /prompts
        +POST /prompts
        +PUT /prompts/:id
        +DELETE /prompts/:id
        +POST /prompts/:id/use
    }

    class JobModel {
        +Title: String
        +Company: String
        +Status: String
        +Count: Number
        index: Title+Company
        index: Date-1
        index: Status
    }

    class PromptModel {
        +name: String
        +content: String
        +usageCount: Number
        index: usageCount-1 createdAt-1
    }

    class CounterModel {
        +name: String unique
        +value: Number
    }

    App --> Home
    App --> EditModal
    Home --> Card
    Home --> EditModal
    SidePanel --> ContentScript : chrome.tabs.sendMessage
    SidePanel --> BackendServer : fetch
    BackendServer --> JobModel
    BackendServer --> PromptModel
    BackendServer --> CounterModel
```

---

## State / Lifecycle Logic

Application status follows a real-world hiring funnel. The valid transitions below were inferred from the hardcoded `Status` options in the extension side panel and the `STATUS_COLORS` map in `Card.jsx`.

```mermaid
stateDiagram-v2
    [*] --> Applied : Job saved (default)

    Applied --> OA : Online assessment sent
    Applied --> Rejected : Early rejection

    OA --> Round1 : OA passed
    OA --> Rejected : OA failed / ghosted

    Round1 --> Round2 : Advanced
    Round1 --> Rejected : Eliminated after round 1

    Round2 --> Offer : Final round passed
    Round2 --> Rejected : Eliminated after round 2

    Offer --> [*] : Accepted / Declined

    note right of Applied
        Default on save.
        Counter assigned at this stage.
    end note

    note right of Rejected
        Terminal state.
        Record kept for analytics / export.
    end note
```

> Custom statuses can be added at runtime via the "+" button in the side panel (persisted to `chrome.storage.local`). These flow into the same funnel at whatever stage the user assigns them.

---

## Key Tradeoff Decision

### Where to own the application counter: backend vs. client

The extension originally tracked `applicationCounter` in `chrome.storage.local`. When the web frontend was added as a second write surface, client-side counters would diverge. The decision was to move the counter entirely to the backend using MongoDB's atomic `$inc` operator.

```mermaid
quadrantChart
    title Counter Strategy — Consistency vs. Implementation Complexity
    x-axis Low Complexity --> High Complexity
    y-axis Low Consistency --> High Consistency

    quadrant-1 Ideal
    quadrant-2 Over-engineered
    quadrant-3 Risky
    quadrant-4 Simple but fragile

    chrome.storage.local only: [0.1, 0.2]
    Max(Job.Count) on each write: [0.3, 0.5]
    Redis atomic INCR: [0.85, 0.95]
    MongoDB $inc on Counter doc: [0.55, 0.9]
```

**Chosen approach:** `MongoDB $inc on Counter doc` — atomic at the DB level, no extra infrastructure, handles the race condition documented in `getNextCount()` with a duplicate-key catch that falls back to a second `findOneAndUpdate`.

---

## Notable Engineering Decisions

- **Race-condition-safe counter bootstrap.** On first use, `getNextCount()` seeds the counter from `MAX(Job.Count)` so existing records aren't re-numbered. A `try/catch` on `11000` (duplicate key) handles the edge case where two requests initialize the counter simultaneously.

- **Regex-based title/company extraction from page titles.** Rather than site-specific scrapers (which break on DOM changes), `content.js` parses tab titles using patterns like `"Role @ Company | Site"` and `"Role at Company"`. This works across LinkedIn, Jobright, and most job boards without maintenance.

- **Manual DOM selection as a fallback.** When auto-extraction yields `"Unknown"` fields, the extension enters a step-through selection mode — changing the cursor to crosshair and attaching a capture-phase `click` listener — so the user can point at any element. Overrides are page-scoped and cleared on URL change via `syncPageState()`.

- **CSV export in two places, differently.** The extension calls `GET /exportToSheet` (server generates CSV with UTF-8 BOM). The web frontend generates the CSV client-side using `Blob` + `URL.createObjectURL`. Both add the BOM (`\uFEFF`) so Excel renders special characters correctly. Server-side export is in the extension because it doesn't have DOM blob APIs; client-side is in the frontend to avoid an unnecessary round-trip.

- **Content Security Policy compliance for prompt buttons.** Chrome MV3 blocks `onclick` inline handlers in extension pages. The prompts list uses delegated event listening (`promptsList.addEventListener("click", ...)`) with `data-action` / `data-id` attributes on buttons, fully compatible with MV3's strict CSP.

- **`useMemo` for client-side search filtering.** `Home.jsx` filters jobs with `useMemo` keyed on `[jobs, search]`. This avoids re-filtering the full array on every unrelated re-render and keeps search snappy even with hundreds of cards.

---

## Setup & Run Instructions

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally on `mongodb://127.0.0.1:27017`

### Backend

```bash
cd backend
npm install
node server.js
# API available at http://localhost:5000
```

### Web Frontend

```bash
cd frontend
npm install
npm run dev
# Dev server at http://localhost:5173 (proxies /api/* → localhost:5000)
```

### Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `JobExtension/` folder
4. Pin the extension; click the icon to open the Side Panel

> The extension calls `http://localhost:5000` directly (no proxy). The backend CORS config explicitly allows `chrome-extension://*` origins.

---

