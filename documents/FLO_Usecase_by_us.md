# Flo — Go with the Flow of Family Life
### ANZ Diversity Hackathon — Amazon Women in AI/ML 2026
### Use Case Documentation

---

## 1. Executive Summary

Every working parent knows the feeling. It is Sunday night, you are mentally running through the week ahead, and you realise you have double-booked school pickup against a client meeting, missed a permission slip deadline buried in last week's school newsletter, and forgotten that Saturday's 7am soccer game has a UV index of 11.

This is not a minor inconvenience. It is the invisible load — the relentless, largely unacknowledged cognitive and logistical burden of coordinating family life. Research consistently shows this load falls disproportionately on women, contributing to burnout, career friction, and reduced wellbeing.

**Flo** is an AI-powered family coordination platform built on Amazon Bedrock's multi-agent framework. It consolidates a working parent's five fragmented information streams — work calendar, personal calendar, school newsletters, school communication apps, and children's extracurricular schedules — into a single intelligent, unified view. A sixth agent monitors weather, UV, and AQI conditions to enrich every outdoor event with contextual intelligence.

But Flo goes further than coordination. It asks a deeper question: *are you actually spending your time on what matters most to you?* Every Sunday morning, Flo delivers a personalised weekly briefing — flagging clashes, suggesting resolutions, and checking whether the user has protected time for family, health, mental wellbeing, and personal growth.

Built entirely on AWS — Amazon Bedrock, Textract, SNS, EventBridge, Lambda, API Gateway, Cognito, and Amplify — Flo is a production-ready, SaaS-architected platform addressing a market of over one million dual-income households with school-age children across Australia and New Zealand.

**Flo does not just manage your calendar. It helps you live more intentionally.**

---

## 2. Problem Statement

### 2.1 The Fragmented Information Problem

A working parent with one or more school-age children is simultaneously managing at minimum five completely separate streams of time-sensitive information:

1. **Work calendar** — meetings, deadlines, travel, and commitments managed in Outlook or Google Calendar
2. **Personal and family calendar** — birthdays, anniversaries, social events, and family commitments managed in Google, Apple, or another personal calendar
3. **School newsletters** — PDFs or emails distributed weekly or fortnightly containing critical term dates, excursion deadlines, event registrations, and permission slips written in unstructured natural language
4. **School communication apps** — platforms such as SeeSaw, SEQTA, and ConnectNow through which teachers communicate directly with parents using informal, conversational language that contains embedded deadlines and action items
5. **Children's extracurricular activities** — sport training, music lessons, tutoring, and other activities each with their own schedules, locations, and logistics

None of these streams communicate with each other. There is no single system that understands all five simultaneously. The cognitive work of connecting them — identifying clashes, extracting dates from newsletters, remembering that Wednesday pickup conflicts with Thursday's team meeting — falls entirely on the parent.

### 2.2 The Scale of the Problem

- Over **1.2 million dual-income households** with dependent children exist across Australia and New Zealand (ABS, 2023)
- Working parents spend an estimated **3–5 hours per week** on family logistics and calendar coordination that could be automated
- **73% of working mothers** report experiencing significant stress related to managing competing work and family schedules (Deloitte Women at Work Report, 2023)
- School newsletters are distributed to **virtually every Australian school family** — approximately 4 million households — yet no mainstream calendar tool can read and extract dates from them automatically

### 2.3 The Invisible Load and Gender Equity

The invisible load is not evenly distributed. Across dual-income Australian households, research shows that women perform approximately **65–75% of household coordination tasks** including school administration, appointment booking, activity logistics, and form management — even when both partners work equivalent hours.

This imbalance is invisible because it is cognitive rather than physical. It does not appear on any calendar. It is never counted, never acknowledged, and never shared — because no tool has ever made it visible.

This is not a productivity problem. It is an equity problem. And it sits precisely at the intersection of AI, family life, and gender — making it uniquely well-suited to the mission of the Amazon Women in AI/ML hackathon.

### 2.4 Why Existing Solutions Fail

| Existing Tool | What it Does | Why it Falls Short |
|---|---|---|
| Fantastical / Camo | Aggregates multiple calendars | Cannot read unstructured school newsletters or teacher messages |
| Reclaim.ai | AI scheduling for work calendars | Work-focused only; no school or family context |
| Google Calendar | Shared family calendars | No intelligence layer; no clash reasoning; no newsletter parsing |
| School apps (SeeSaw, SEQTA) | School-to-parent communication | Siloed; no integration with parent's work or personal calendar |
| Paper / memory | The default for most parents | The problem itself |

No existing product addresses the full problem space. The gap is not incremental — it is structural. Solving it requires multi-source intelligence, natural language understanding of unstructured documents, and agentic reasoning across heterogeneous data. This is precisely what Amazon Bedrock's multi-agent framework is designed to do.

---

## 3. Solution Overview

### 3.1 What Flo Does

Flo is a Progressive Web App (PWA) built on React and hosted on AWS Amplify. It deploys six specialised AI agents, each responsible for monitoring one stream of a family's information. A seventh orchestrator agent — powered by Amazon Bedrock Agents — synthesises all six streams, detects conflicts, and generates actionable insights for each adult in the household.

### 3.2 The Seven-Agent Architecture

| Agent | Responsibility | Key Technology |
|---|---|---|
| Agent 1 — Work Calendar | Monitors Outlook / Google work calendar for meetings, deadlines, and commitments | Calendar API connectors |
| Agent 2 — Personal Calendar | Monitors personal and family calendar for events, birthdays, and social commitments | Google / Apple Calendar API |
| Agent 3 — School Newsletter | Parses uploaded school newsletter PDFs and extracts dates, deadlines, and action items from unstructured natural language | Amazon Textract + Bedrock |
| Agent 4 — School App | Reads teacher messages from SeeSaw, SEQTA, and ConnectNow and extracts embedded action items and deadlines | Amazon Bedrock NLP |
| Agent 5 — Extracurricular | Manages children's sport, activity, and lesson schedules including time, location, and logistics | Structured input + Bedrock |
| Agent 6 — Weather & Environment | Retrieves weather forecasts, UV index, AQI, and rain probability for outdoor events | Weather API + Bedrock reasoning |
| Agent 7 — Orchestrator | Synthesises all six agents, detects clashes, generates resolution suggestions, and produces the Sunday briefing | Amazon Bedrock Agents / Agent Core |

### 3.3 The User Journey

**Onboarding (once):**
The user connects their information sources, adds family members to their household profile, sets their weekly priority goals across four categories (Family, Health, Mental Wellbeing, Upskilling), and configures their notification preferences.

**During the week:**
Flo's agents operate continuously in the background. When a school newsletter is uploaded, Agent 3 extracts dates and action items within seconds. When a clash is detected between any two agents' data, the Orchestrator immediately generates a resolution suggestion and sends a push notification.

**Every Sunday morning:**
The user receives a personalised weekly briefing — delivered as a push notification, email, and optionally a 60-second voice summary via Amazon Polly (coming soon) — covering the week ahead, time allocated across their four priority categories, unresolved clashes, and any wellbeing gaps.

### 3.4 The Invisible Load Dashboard

Flo's most distinctive feature is the Invisible Load Dashboard — a visual representation of how household coordination tasks are distributed between the two adults in a household across any given week. Categories tracked include school administration, pickups and dropoffs, activity logistics, and form and deadline management.

This makes the invisible load visible for the first time. It creates an evidence-based conversation between partners about equity and redistribution — something no calendar application has ever attempted.

---

## 4. Target Users and Market Opportunity

### 4.1 Primary Persona

**Sarah, 38 — Working Mother, Perth WA**
Sarah is a project manager at a mid-size consulting firm working four days a week. Her partner James works full-time in mining. They have two children — Mia (9) and Liam (7) — in different schools. Mia does dance on Tuesdays. Liam plays soccer on Saturdays. Sarah manages her work calendar in Outlook, the family calendar in Google Calendar, and receives newsletters from two different schools plus messages from SeeSaw. She spends approximately four hours a week mentally coordinating these streams — time that comes directly from her evenings and weekends.

### 4.2 Secondary Personas

- **Single parents** — for whom the full coordination burden falls on one person with no partner to redistribute to
- **Blended families** — multiple schools, multiple ex-partner calendars, complex custody scheduling
- **Sandwich generation caregivers** — managing both children's schedules and elderly parent care appointments
- **Corporate HR / Employee Wellbeing** — enterprises seeking to reduce working parent burnout as a retention tool

### 4.3 Market Opportunity

| Segment | Size | Notes |
|---|---|---|
| ANZ dual-income households with school-age children | 1.2M households | Primary addressable market |
| ANZ single-parent households | 340,000 households | High coordination burden, strong need |
| Asia Pacific expansion (Year 2) | 15M+ households | Singapore, NZ, Hong Kong, Japan |
| Enterprise HR / Wellbeing (Year 2–3) | TBD | B2B licensing to employers as a staff benefit |

### 4.4 Business Model

**Free tier:** Connect up to 2 sources, basic calendar consolidation
**Pro tier (AUD $9.99/month):** All 6 agents, Sunday briefing, Invisible Load Dashboard, clash resolution
**Family tier (AUD $14.99/month):** Two adult profiles, multi-child tracking, voice briefings
**Enterprise:** Per-seat licensing to employers as a workplace wellbeing benefit

**Distribution:** Direct via AWS Marketplace and app stores; B2B via HR and employee benefits platforms

---

## 5. Technical Architecture

### 5.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER LAYER                           │
│         React PWA (AWS Amplify + CloudFront)            │
│              Amazon Cognito (Auth)                      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS + JWT
┌──────────────────────▼──────────────────────────────────┐
│                    API LAYER                            │
│              Amazon API Gateway                         │
│         (Auth validation, routing, throttling)          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                 ORCHESTRATION LAYER                     │
│              AWS Lambda Functions                       │
│         (Agent coordination, business logic)            │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    AI/ML LAYER                          │
│         Amazon Bedrock Agents / Agent Core              │
│                                                         │
│  Agent 1    Agent 2    Agent 3    Agent 4               │
│  Work Cal   Family Cal Newsletter School App            │
│                                                         │
│  Agent 5    Agent 6    Agent 7 (Orchestrator)           │
│  Activities Weather    Synthesis + Briefing             │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  SERVICES LAYER                         │
│  Amazon S3        Amazon Textract    Amazon SNS         │
│  Amazon Polly     Amazon EventBridge Amazon DynamoDB    │
└─────────────────────────────────────────────────────────┘
```

### 5.2 AWS Services — Detailed Justification

| AWS Service | Role in Flo | Why This Service | Judging Criterion |
|---|---|---|---|
| **Amazon Bedrock** | Foundation model powering all seven agents — NLP reasoning, document understanding, conflict resolution, briefing generation | Most capable managed AI service on AWS; no infrastructure management; model choice flexibility; data never used for training | Innovation, Technical Excellence |
| **Bedrock Agents / Agent Core** | Multi-agent orchestration — supervisor agent coordinates six sub-agents, manages tool use, maintains conversation state | Native AWS agentic framework; supports plan-act-reason loop; designed for exactly this multi-step, multi-source pattern | Innovation, Technical Excellence |
| **Amazon Textract** | Extracts raw text from school newsletter PDFs before Bedrock processes the content | Purpose-built for document extraction; handles handwritten text, tables, and complex PDF layouts; far more reliable than generic PDF parsers | Technical Excellence |
| **Amazon Cognito** | User authentication, household profile management, JWT token issuance | Native Amplify integration; zero-code auth; MFA support; ensures household data isolation | Technical Excellence |
| **AWS Amplify** | React PWA hosting, CI/CD, environment management | Fastest path from code to live URL; integrates natively with all other AWS services; auto-deploys on git push | Technical Excellence |
| **Amazon API Gateway** | Secure API routing between frontend and Lambda; JWT validation; rate limiting | Validates Cognito tokens before any request reaches backend; standard production pattern; full request logging | Technical Excellence |
| **AWS Lambda** | Agent orchestration logic, API handlers, event processing | Serverless — no server management; scales automatically; cost-effective at any scale | Technical Excellence |
| **Amazon SNS** | Push notifications for Sunday briefing, clash alerts, and action item reminders | Native AWS notification service; supports push, SMS, and email from one API | Business Impact |
| **Amazon EventBridge** | Triggers Sunday morning briefing job for every household | Managed scheduler; cron-based triggers; reliable at scale | Technical Excellence |
| **Amazon Polly** | Converts Sunday briefing text to a warm, natural-sounding 60-second audio summary | Best-in-class neural text-to-speech; multiple Australian English voices; low latency | Innovation (Coming Soon) |
| **Amazon S3** | Stores uploaded school newsletters and processed document metadata | Standard, cost-effective object storage; integrates directly with Textract | Technical Excellence |
| **Amazon DynamoDB** | Stores household profiles, agent state, extracted calendar events, and priority settings | Serverless NoSQL; millisecond latency; scales automatically | Technical Excellence |
| **Bedrock Guardrails** | Responsible AI layer — content filtering, PII protection, response validation | Ensures no sensitive family data is exposed in model responses; demonstrates responsible AI by design | Innovation, Technical Excellence |

### 5.3 Data Flow — Newsletter Parsing (Key Demo Flow)

```
1. Parent uploads school newsletter PDF via Flo PWA
         ↓
2. PDF stored in Amazon S3 (household-isolated bucket prefix)
         ↓
3. Lambda triggers Amazon Textract → raw text extracted
         ↓
4. Raw text passed to Bedrock Agent 3 (Newsletter Agent)
         ↓
5. Bedrock foundation model reads natural language,
   identifies dates, deadlines, and action items
         ↓
6. Structured events returned to Orchestrator (Agent 7)
         ↓
7. Orchestrator cross-references with Agent 1 (Work Calendar)
   and Agent 2 (Family Calendar) data
         ↓
8. Clash detected → resolution drafted → stored in DynamoDB
         ↓
9. SNS push notification sent to parent's device
         ↓
10. Calendar updated in Flo PWA in real time
```

### 5.4 Security and Privacy Architecture

Flo is designed with privacy as a first principle, not an afterthought.

- **Data isolation:** Each household's data is stored under a unique Cognito user pool identifier. No household can access another's data at any layer of the stack.
- **No model training:** Amazon Bedrock explicitly does not use customer data to train or improve its foundation models. Family calendars, school newsletters, and personal schedules never leave the customer's AWS environment.
- **Encryption:** All data is encrypted in transit (TLS 1.3) and at rest (AES-256 via AWS KMS).
- **Bedrock Guardrails:** Content filtering and PII detection are applied to all model inputs and outputs.
- **Minimal data retention:** Uploaded newsletters are processed and then deleted from S3 after extraction; only the structured event data is retained.
- **Compliance:** Architecture is designed for compliance with the Australian Privacy Act 1988 and the Privacy Amendment (Notifiable Data Breaches) Act 2017.

---

## 6. AI/ML Innovation

### 6.1 Why This is a Genuine AI Problem

The core innovation in Flo is not calendar aggregation — that is commodity software. The innovation is applying large language model reasoning to a class of problem that structured software cannot solve: **extracting actionable structured data from unstructured, informal, conversational human communication.**

A school newsletter might say:

> *"A reminder to all Year 4 families that the incursion permission slip needs to come back to school no later than the end of next week."*

There is no date in that sentence. There is no structured field. A traditional parser or rule-based system cannot handle it. Amazon Bedrock can — because it understands language the way a human does. It knows "next week" means the week following publication. It knows "end of next week" means Friday. It knows "Year 4 families" is a filter condition. It extracts a structured event: `{type: "deadline", description: "Year 4 incursion permission slip", date: "2026-02-28", action: "return to school"}`.

This is not retrieval. This is reasoning. And it is exactly what Rada Stanic described when she defined agents as systems that "plan, act, and reason to achieve a goal."

### 6.2 The Multi-Agent Design Choice

Flo uses a multi-agent architecture rather than a single large prompt for deliberate reasons:

**Specialisation:** Each agent is optimised for its specific data source. The Newsletter Agent has a system prompt tuned for school communication language. The Weather Agent has tools for API calls and contextual reasoning about outdoor events. A monolithic approach would require a single model to simultaneously understand corporate calendar syntax, informal teacher language, weather data, and family scheduling logic — degrading performance across all of them.

**Parallelism:** Six agents can process their respective data sources simultaneously rather than sequentially, reducing latency for the Sunday briefing generation.

**Debuggability:** When an agent makes an error, it is immediately clear which agent and which data source is responsible. In a monolithic system, errors are opaque.

**Extensibility:** New data sources can be added by creating a new specialised agent without modifying the orchestrator logic. SeeSaw today; GP appointment systems tomorrow.

### 6.3 Responsible AI Design

- Bedrock Guardrails prevent the model from surfacing sensitive personal information in ways the user has not authorised
- The system is explicitly transparent about what data is being processed and why
- Users can review, edit, and delete any event Flo has extracted
- The Invisible Load Dashboard presents data neutrally — it describes, it does not prescribe
- No behavioural profiling or advertising use of family data — ever

---

## 7. Demo Walkthrough

### 7.1 Demo Flow (5 minutes)

**Minute 1 — The Problem (30 seconds)**
Open the Flo home page. Deliver the opening line of the pitch: *"Raise your hand if you've ever missed a school deadline buried in a newsletter."* Show the hero section. Point to the three floating cards — Sunday Briefing, Newsletter AI, Invisible Load. Set the scene.

**Minute 2 — Onboarding (60 seconds)**
Click Get Started. Walk through the four onboarding steps:
- Household setup — Sarah, James, Mia, Liam
- Source connection — show all six agent tiles selected
- Priority sliders — adjust Family to 8 hours, Health to 5 hours
- Notification preferences — push + email on, voice briefing toggled (coming soon)

**Minute 3 — The Newsletter AI Moment (90 seconds)**
Navigate to the Newsletter AI section. Upload a real Churchlands Primary school newsletter PDF. Watch in real time as Amazon Textract extracts the text and Bedrock Agent 3 parses it. Show the extracted items appearing — permission slip due 24 Feb, last day of term 28 Mar, art show 5 Mar. This is the technical wow moment. Pause here and explain what just happened under the hood — Textract, Bedrock, natural language reasoning.

**Minute 4 — Clash Detection and Resolution (60 seconds)**
Show the clash alert — Thursday 27 Feb, client presentation vs school pickup. Click Resolve with Flo. Show the resolution modal — Flo has reasoned that James is available Thursday and has drafted a calendar invite. Show the calendar with the pulsing red dot on Thursday. Explain the agentic reasoning: *"Flo didn't just detect a conflict — it reasoned about who in the household was best placed to resolve it and drafted the action."*

**Minute 5 — Dashboard and Invisible Load (60 seconds)**
Scroll to the Family Dashboard. Show the Invisible Load chart — Sarah carrying 75–85% across all categories. Let the visual speak. Then show the Weekly Priorities panel — wellbeing at zero, health behind. Show the Sunday Briefing banner and click the play button for the Polly voice briefing. Close with: *"This is Flo. It doesn't just manage your calendar — it helps you live more intentionally."*

### 7.2 Key Moments to Emphasise for Each Judge

| Judge | Moment to Emphasise | Why |
|---|---|---|
| Rada Stanic | Newsletter parsing — explain Textract + Bedrock reasoning live | She cares about genuine agentic AI, not chatbots |
| Luke Anderson | Market size, SaaS tiers, AWS Marketplace path | He thinks commercially |
| Sarah Bassett | Invisible Load dashboard — pause and let it land | Personal and professional resonance |

---

## 8. Social Impact and Diversity

### 8.1 The Equity Dimension

Flo was conceived in direct response to a documented, persistent inequality in Australian and New Zealand households: the unequal distribution of the invisible load. This is not anecdotal. It is measured, consistent, and consequential.

The Australian Institute of Family Studies reports that women in dual-income households spend significantly more time than their partners on unpaid household and family management activities — including the cognitive and administrative work of coordinating children's schedules, managing school communications, and maintaining the family's collective memory of upcoming obligations.

This inequality does not reflect a lack of willingness to share. It reflects a lack of visibility. When the load is invisible, it cannot be measured. When it cannot be measured, it cannot be redistributed. When it cannot be redistributed, it accumulates — silently, relentlessly — into burnout, career friction, and eroded wellbeing.

Flo's Invisible Load Dashboard is the first step toward visibility. It does not assign blame. It does not prescribe solutions. It simply shows, for the first time, what is actually happening — and gives both partners a shared, factual basis for a conversation about equity.

### 8.2 Accessibility of AI

A secondary social impact dimension of Flo is its commitment to making AI genuinely useful to non-technical everyday users. The working parent uploading a school newsletter to Flo does not need to know what a foundation model is. They do not need to write a prompt. They do not need to configure anything. They upload a PDF and Flo handles the rest.

This is democratisation of AI in its truest form — not making AI available to developers, but making AI useful to the people who need it most.

### 8.3 Mental Health and Wellbeing

The values-based scheduling feature — asking users to set weekly goals for Family, Health, Wellbeing, and Upskilling, then checking each week whether those goals were met — addresses a genuine mental health dimension of modern parenting. Research consistently links unmet personal time goals with elevated stress, reduced relationship satisfaction, and parental burnout. Flo does not solve these problems. But it makes them visible, and visibility is the precondition for change.

---

## 9. Challenges and Learnings

### 9.1 Technical Challenges

**Unstructured language variability:** School newsletters vary enormously in structure, language, and format across different schools, year levels, and teachers. Training the Newsletter Agent to handle this variability — implicit dates, relative timeframes, informal language — required careful prompt engineering and extensive testing with real newsletter samples from Australian schools.

**Multi-agent state management:** Coordinating six agents with different data freshness rates (work calendar updates hourly; school newsletters update weekly) required careful design of the Orchestrator's state management logic to avoid stale data informing clash detection.

**PWA push notification compatibility:** iOS requires users to add the app to their home screen before push notifications are available. This is a UX friction point that required a deliberate onboarding design decision — we prompt iOS users to install the PWA during onboarding.

### 9.2 Design Decisions Reconsidered

**Single vs multi-agent:** We initially explored a single large prompt approach before concluding that specialised agents produced significantly better extraction quality for domain-specific content like school newsletters. The quality improvement in newsletter parsing alone justified the additional architectural complexity.

**Invisible Load as opt-in:** We initially built the Invisible Load Dashboard as a default feature before deciding to make it an explicit opt-in during onboarding — recognising that for some households, introducing this visibility without consent could create friction rather than conversation.

---

## 10. Roadmap

### Phase 1 — Hackathon MVP (Current)
- Six Bedrock agents with Orchestrator
- Newsletter PDF parsing via Textract
- Clash detection and resolution suggestions
- Invisible Load Dashboard
- Sunday briefing via push notification and email
- React PWA on AWS Amplify

### Phase 2 — 0 to 3 Months Post-Hackathon
- Live OAuth integrations with Outlook and Google Calendar
- Direct SeeSaw and SEQTA API integrations
- Voice Sunday briefing via Amazon Polly (currently coming soon)
- iOS and Android native app wrappers via Capacitor
- Multi-school support per household

### Phase 3 — 3 to 12 Months
- GP and medical appointment calendar integration
- Grocery and meal planning agent (if family has a big activity day, suggest prep meals)
- Enterprise HR / employee wellbeing licensing model
- AWS Marketplace listing
- Expansion to Singapore, New Zealand, Hong Kong

### Phase 4 — 12 Months Plus
- Predictive load balancing — Flo learns household patterns and proactively suggests redistribution before overload occurs
- School partnership API program — direct structured data feeds from school systems
- Family analytics — longitudinal tracking of load distribution and wellbeing trends

---

## 11. Team

*[Team member details to be completed by the submission team]*

**What this team brings:**
- Deep understanding of the problem space — lived experience as working parents
- AWS architecture expertise spanning Bedrock, Lambda, Amplify, and Cognito
- Product design sensibility — Flo was designed from the user's Sunday night anxiety outward, not from the technology inward
- Commitment to the values of the Amazon Women in AI/ML community — building AI that is useful, accessible, and equitable

---

## 12. Appendix — AWS Architecture Diagram Reference

*[Insert final architecture diagram here — recommend using draw.io or AWS Architecture Icons set]*

**Recommended diagram elements:**
- User device (PWA) → Amplify → Cognito
- API Gateway with Cognito Authorizer shown explicitly
- Lambda orchestration layer
- Seven Bedrock agent boxes with Agent Core supervisor shown
- Textract feeding into Agent 3
- S3, DynamoDB, SNS, EventBridge, Polly as service layer
- Data flow arrows showing newsletter upload → extraction → clash detection → notification path

---

*Flo — Go with the flow of family life.*
*Built for the ANZ Diversity Hackathon — Amazon Women in AI/ML 2026*
*Powered by Amazon Bedrock · Textract · SNS · EventBridge · Polly · Lambda · Amplify · Cognito*
