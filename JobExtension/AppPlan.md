# Job Search Strategy Logger — App Plan

## 1. Core Concept

Not a job board / listing aggregator. A **personal experimentation tool for job seekers** — hold your resume/profile constant and test _how_ you apply (mass-apply vs. LLM-tailored vs. referral vs. cold outreach) against outcomes, cross-referenced by _role category_ (data / full stack / cloud / etc.), to find out what actually works for you specifically.

**Core thesis (differentiator):** the interesting question isn't "which roles get responses" (competitors already show this) or "which strategy gets responses" alone (thin on its own) — it's the **interaction**: does mass-applying work fine for full-stack roles but tank for cloud roles, while tailored applications matter more elsewhere? That category × strategy cross-tab, held against real outcomes, is not something Teal/Huntr/Simplify currently do.

**Caveat to keep front-of-mind:** this only works if the dashboard is honest about sample size. A user with 40 logged apps split across 3 categories × 4 strategies has ~3-4 data points per cell — not enough to draw real conclusions even though a percentage will _look_ authoritative. The product needs a "not enough data yet" state per cell, not just a rate.

Core loop: **Log (via Chrome extension) → Tag strategy + category → Track outcome → Analyze what's working (with confidence, not false certainty)**

## 2. Decisions So Far

- **Platform:** Web app + **Chrome extension** (extension is the primary logging surface, built first)
- **MVP Scope:** Full loop — logging, strategy tagging, and an analytics dashboard
- **Tech Stack:** Frontend + backend + DB + Chrome extension already scaffolded (extension is furthest along)

## 3. Current Architecture (as built so far)

### Chrome Extension (main focus, built, not yet tested)

**Content script** — runs on job posting pages and auto-extracts:

- Company, title, location, URL, website, date, count (application count?)
- Defaults to `"unknown"` for any field it can't extract
- Manual override available for company/title/location today

**Planned next:** extend manual-entry fallback to _every_ extractable field, one at a time via a **sequential popup flow** (a small "confirm/edit this field" popup per field, rather than one big form) — so the user can quickly correct only what's wrong.

**Also extracted from job description text:**

- Requirements section
- Responsibilities section
- Qualifications section

**User-input fields on the popup (each with preset options + custom/"other" input):**

- **Strategy** — Mass apply / Claude / GPT / custom
- **Status** — Applied / Rejected / Interview / custom
- **Category** — Full stack / Frontend / Backend / custom

**Resume + LLM integration (built, untested):**

- User can upload their resume
- Extension sends resume + extracted requirements/responsibilities/qualifications to a selected LLM (Claude, ChatGPT, etc.)
- _(Open question below: what does the LLM call return / do with this — fit score? tailored resume? cover letter?)_

### Web app (frontend + backend + DB)

- Exists, but details of current implementation not yet captured here — to fill in next.

## 4. Data Model (draft — needs to be reconciled with what's already in the DB)

**User**

- id, email, name, created_at

**Application** (a single logged entry, created from the extension)

- id, user_id
- company, title, location, url, website, date, count — auto-extracted, `"unknown"` default, user can manually correct
- description_requirements, description_responsibilities, description_qualifications — parsed from job description text
- strategy — enum (Mass apply / Claude / GPT / custom) + custom_strategy text if "custom"
- status — enum (Applied / Rejected / Interview / custom) + custom_status text if "custom"
- category — enum (Full stack / Frontend / Backend / custom) + custom_category text if "custom"
- resume_id (fk, nullable) — which resume version was used for this application
- llm_used (nullable) — which model the extension called for this application (Claude / GPT / etc.)
- llm_response (nullable, jsonb/text) — whatever comes back from the LLM call (TBD — see open questions)
- created_at, status_updated_at

**Resume**

- id, user_id, file, uploaded_at, label (optional, e.g. "v1 - SWE generic")

**StatusHistory** (optional, for funnel tracking over time)

- id, application_id, status, changed_at

**Insight/Metric (computed, not stored)**

- Response rate per strategy
- Interview rate per strategy
- Offer rate per strategy
- Time-to-response by strategy
- Volume over time (applications per week)

## 5. Key Features

### Built (not yet tested)

1. Auto-extraction of company/title/location/url/website/date/count from job posting pages
2. Manual override for company/title/location when extraction fails
3. Auto-extraction of requirements/responsibilities/qualifications from job description
4. Strategy / Status / Category tagging, each with preset options + custom input
5. Resume upload + sends resume + job description sections to a selected LLM

### Next up (extension)

6. Extend manual-entry fallback to **every** field, via a sequential "confirm one field at a time" popup flow
7. **Test the LLM integration end-to-end** (resume + JD → LLM → ??? — needs to be defined, see open questions)

### Not yet started / to design

8. **Analytics dashboard** (web app) — the actual payoff of the whole project:
   - Response rate by strategy
   - Interview rate by strategy
   - Response/interview rate by category (full stack / frontend / backend)
   - Funnel visualization (applied → response → interview → offer)
   - Trends over time / volume
9. Web app views for browsing/editing logged applications
10. Auth (so extension + web app share a user identity)

## 6. Open Questions / Next Decisions

- [ ] **What should the LLM call actually return/do?** e.g. a fit score, a tailored resume rewrite, a generated cover letter, extracted keyword gaps — this changes what `llm_response` needs to store and how it's shown to the user.
- [ ] Is "count" the number of times applied to that company, or something else? (naming/definition to confirm)
- [ ] How does data flow from extension → backend today — direct API calls to your backend, or local storage synced later?
- [ ] Auth: is the extension already tied to a logged-in user, or is that still to be built?
- [ ] For the sequential per-field popup: should it appear automatically whenever extraction is incomplete, or only when the user clicks "review/edit"?
- [ ] Priority check: test the built extension end-to-end first, or start scaffolding the analytics dashboard in parallel?

## 7. Next Steps (proposed order)

1. Test the extension end-to-end (extraction → tagging → resume/LLM call → saved to DB) and fix what breaks
2. Confirm what the LLM call should return, and finalize `llm_response` handling
3. Build the sequential per-field manual-correction popup
4. Build the web app analytics dashboard against real logged data
5. Add auth to tie extension + web app to the same user

## 8. Competitive Notes (USP check, July 2026)

Reality check on where this stands vs. Teal / Huntr / Simplify / Jobscan-style tools:

**Already commoditized (not a USP):**

- Auto-extraction of job details from job board pages via content script (Teal supports 40+ boards this way already)
- Manual fallback when a site isn't recognized (Teal does this too — paste JD, parse manually)
- Resume-vs-JD keyword/fit matching (Teal, Jobscan)
- AI cover letter generation, AI resume rewrites (Teal+, Resume Optimizer Pro, others)
- Basic non-AI form autofill (Simplify's whole positioning) and even AI-assisted autofill across 500+ sites (JobWizard and similar)
- Response-rate-by-role analytics (Huntr's dashboard already does this)

**Actually differentiated, if fully committed to:**

- **Strategy as a first-class outcome variable** (mass-apply vs. tailored vs. referral vs. cold-outreach), not just a metadata tag
- **Category × strategy interaction analysis** — nobody currently cross-tabs "which strategy works for which type of role" for you specifically
- **Framing as a personal experiment**, not a tracker/organizer — onboarding and UI should reinforce "let's find out what works for you," not "stay organized"
- One architectural note in our favor: your LLM tailoring call happens **inside the extension itself, on the page, for free** — Teal splits that off into a paid web-app step and its extension is "just a clipper." Worth keeping as a deliberate choice if the in-extension LLM call proves reliable.

**Risk if not committed to:** if the strategy/category tags stay as minor fields on an otherwise generic tracker, this reads as a weaker clone of Huntr/Teal, not a different product.

## 9. Future Development

### 9.1 Basic (non-AI) Form Autofill

- **What it does:** Populates standard application form fields — name, email, phone, address, LinkedIn/portfolio URL, work history, education, years of experience — from a saved user profile. No LLM call involved; pure field-mapping/pattern-matching against known form structures (similar to how Simplify/JobWizard target Workday, Greenhouse, Lever, iCIMS field names).
- **Scope decisions to make:**
  - [ ] Target a fixed list of known ATS platforms first (Workday, Greenhouse, Lever) rather than trying to generically handle "any form" — matches how competitors actually scoped this.
  - [ ] Autofill should **populate fields only**, not auto-submit. User reviews and clicks submit themselves. (See legal section — auto-submission is a materially different risk.)
  - [ ] Store one profile per user (or allow multiple profiles/resume variants to autofill from — ties into resume_id already in the data model).
- **Honest take:** Not a USP — well-established, commoditized feature. Build for retention/convenience, don't market around it.

### 9.2 Interview Logger (detailed)

Extends the current single "Interview" status into a proper sub-pipeline tied to each `Application`.

**New entity: `InterviewRound`**

- id, application_id (fk)
- round_number (int) — 1, 2, 3...
- round_type — enum: Phone screen / Recruiter call / Technical (coding) / Technical (system design) / Behavioral / Case study / Onsite / Final / Panel / custom + custom_round_type text
- scheduled_date, actual_date
- format — enum: Phone / Video / In-person / Take-home + custom
- interviewer(s) — free text or structured list (name/role), optional
- outcome — enum: Passed / Rejected / Awaiting feedback / Cancelled / Withdrawn
- outcome_date
- self_rated_difficulty (optional, 1-5) — user's own sense of how hard it was
- self_rated_performance (optional, 1-5) — user's own sense of how well they did
- notes — free text (questions asked, feedback received, what to improve)
- created_at, updated_at

**Why this level of detail matters for the core thesis:**

- Splits "got an interview" from "converted through the funnel" — lets the dashboard show, per strategy/category: _interview rate_ (applied → first round) separately from _conversion rate_ (first round → offer)
- Enables the specific question from earlier: "does Claude-tailored resume get more first-round interviews, but referrals convert better once in the door?" — that requires round-level data, not just a single status field
- self_rated_difficulty/performance opens a future angle: "am I underperforming specifically in system design rounds?" — a different, complementary insight track from the strategy/category analysis

**UI implications:**

- Web app application detail view needs a "rounds" sub-list/timeline, not just a status dropdown
- Extension itself probably doesn't need to log interview rounds (that happens after the application, off the job posting page) — this is a **web-app-only** feature, not an extension feature
- Dashboard additions: interview-to-offer conversion rate by strategy/category, average number of rounds by category, drop-off point analysis (which round rejections cluster at, by category)

**Open questions for this feature:**

- [ ] Do we need reminders/notifications for upcoming scheduled rounds, or is this purely a log (no calendar integration) for v1?
- [ ] Is round-level data required for the dashboard to work, or can we ship a simpler "interview → offer" binary first and layer rounds in later?

**Honest take:** Not a standalone USP — it's a data-model extension of the existing status field, and pipeline-stage tracking already exists elsewhere (Huntr's Kanban). Its value here is specifically in feeding richer outcome data into the category × strategy analysis, not as a headline feature.

## 10. Legal / Compliance Considerations

_(Not legal advice — general awareness only. Get an actual lawyer before scaling with real user data, and especially before shipping auto-submit autofill.)_

### 10.1 Scraping / automation vs. job-site Terms of Service

- LinkedIn, Workday, Greenhouse, Lever, iCIMS and similar platforms generally include anti-automation / anti-scraping clauses in their ToS.
- **Read-only extraction** (what's built today — pulling company/title/location/JD text from the page) is lower risk; this is functionally the same thing Teal's extension already does at scale.
- **Auto-submitting forms** (future autofill, if it goes beyond populate-and-review) is higher risk — it looks more like "automated use" of the site, which is what these ToS clauses specifically target.
- This is a **per-site, ongoing risk**, not a one-time legal question — a platform can change its detection/enforcement at any time, and enforcement is typically a cease-and-desist or IP/account block rather than criminal liability for a small tool.
- **Mitigation to consider:** keep autofill as populate-only (user clicks submit themselves), which is a materially different legal posture than automated submission.

### 10.2 Sending resumes / PII to third-party LLMs

- You're transmitting personal data (resume content, sometimes contact info, job description text) to OpenAI/Anthropic APIs.
- Needs a clear, accessible privacy policy disclosing: what's sent, to which provider, how long it's retained, and whether it could be used for model training (check each provider's API data-use terms — API data is typically NOT used for training by default, but this should be stated to users explicitly, not assumed).
- If you have EU users: GDPR applies (lawful basis for processing, data minimization, right to access/deletion, potentially a Data Processing Agreement with the LLM provider).
- If you have California users: CCPA/CPRA-style obligations apply (disclosure, right to delete, right to opt out of "sale/sharing" of personal info — worth checking whether sending data to an LLM API counts under your specific implementation).
- **Mitigation to consider:** don't store resumes/JD text longer than needed for the feature to function; give users a clear delete-my-data option early, not as an afterthought.

### 10.3 Chrome Web Store policy compliance

- Content scripts reading page data and sending it to a third-party API will get scrutinized under Chrome Web Store's extension review requirements: a clear "single purpose" description, disclosure of remote/third-party data handling, and a linked privacy policy are generally required.
- Getting this wrong risks the extension being rejected or removed post-launch — existential risk for a Chrome-extension-first product.
- **Mitigation to consider:** write the privacy policy and permissions justification _before_ first submission, not after a rejection.

### 10.4 Storing / displaying job description text

- Job postings are technically the employer's or job board's content (copyright-adjacent).
- Extracting a few sections (requirements/responsibilities/qualifications) for **personal, non-redistributed** use is low-risk — this is the same thing every competitor already does.
- Risk increases if you ever let users **export, publish, or share** full job description text through your product (e.g., a public "compare my strategies" feature that includes raw JD content).

### 10.5 General product/consumer risk (lower priority, but worth noting)

- If autofill ever populates _incorrect_ data into a real application (e.g., stale profile info) and the user submits without reviewing, that's a user-experience/trust risk more than a legal one — but worth designing against (always show a review step before submit).
- No indication of employment-law exposure for you as the app maker — you're not the employer or a staffing agency, so you're not subject to hiring-discrimination-type regulations; the legal surface is squarely automation/ToS + data-privacy, not employment law.

## 11. Open Legal/Strategy Questions

- [ ] Will future autofill actually _submit_ forms, or just populate fields for the user to review and submit manually? (Meaningfully different risk profile — see 10.1.)
- [ ] Do we need a documented data-retention/deletion policy before onboarding real users' resumes? (See 10.2.)
- [ ] Should the dashboard show a confidence/sample-size indicator per category×strategy cell before this ships, to avoid presenting noise as signal?
- [ ] Have we confirmed Anthropic's and OpenAI's API terms regarding data retention/training for the specific API tier we're using, so the privacy policy can state this accurately rather than assuming?
- [ ] Do we need per-site legal review before targeting autofill at each specific ATS platform (Workday, Greenhouse, etc.), or is populate-only autofill low-risk enough to skip that for v1?

The actual case history:
In hiQ Labs v. LinkedIn, the 9th Circuit ruled in 2022 that scraping publicly available LinkedIn data does not violate the Computer Fraud and Abuse Act — LinkedIn actually lost on the criminal-statute question. LinkedIn and hiQ later reached a settlement after years of litigation.
Linkedintools
jdsupra
In 2025, LinkedIn filed suit against Proxycurl and its parent company Nubela, and Proxycurl's founder settled, agreeing to permanently delete all LinkedIn data obtained. Around the same time, LinkedIn also blocked Apollo.io and Seamless.ai overnight.
Autoposting
Autoposting
The consensus from legal analysts is that scraping public data can survive a CFAA challenge, but it can still expose you to breach-of-contract liability whenever a site's terms prohibit it — and LinkedIn's User Agreement explicitly does.
Connectsafely
Interestingly, there's now a reverse suit too: a class action filed April 2026 alleges LinkedIn installed client-side code to scan users' browser extensions without consent, covering roughly 6,000 extensions.
PPC Land
The important nuance for you specifically: every company actually sued (Proxycurl/Nubela, Apollo, Seamless) was running commercial-scale, bulk data-extraction or lead-gen businesses — selling LinkedIn data to third parties via API, not an individual reading their own feed. Browser extensions that operate at human browsing speed sit at the low end of the risk spectrum; commercial APIs that automate at scale are what LinkedIn's legal team is actually targeting. Being sued in any meaningful sense is extremely rare and has only happened to companies, not individuals — the realistic risk for an individual user is account restriction, not legal action.
Actuallyusefulextensions
Linkedintools
What this means for your app: a single user, logged into their own LinkedIn account, viewing job postings at normal speed, extracting only the fields on the page they're already looking at — that's structurally much closer to hiQ/individual-use than to Proxycurl's bulk-resale model. The real exposure is still there (LinkedIn's ToS does prohibit it, and they can restrict/ban an account that trips detection), but "LinkedIn sues my users" is not the realistic failure mode — "LinkedIn's bot detection flags the account" is.
Let me update the legal section with this corrected, more specific picture.

Edited a file, ran a command, read a file

Edited a file, ran a command, read a file
Updated 10.1 with the actual case history — LinkedIn lost the CFAA question in hiQ, but won a settlement against Proxycurl/Nubela for commercial bulk-resale. The key distinction: real lawsuits only hit commercial data-resale operations; a single user's extension reading their own feed at normal speed realistically risks an account ban from bot detection, not litigation. Auto-submit autofill is the piece most likely to look "automated" and worth keeping populate-only.
