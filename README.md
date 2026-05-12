# Lumina Scholar

**Lumina Scholar** is a full-stack academic platform built as a final-year graduation project (PFE). It bridges traditional course management with AI-powered study assistance, giving students an intelligent RAG-based Q&A interface over their course documents, while providing professors with real-time analytics on engagement and performance.

---

## ✨ Features

### Student Portal
- **Dashboard** — View enrolled courses, download course materials, and track upcoming assignment deadlines.
- **Document Viewer / AI Study Hub** — Upload course PDFs and ask natural-language questions. Answers are generated locally via a RAG pipeline (ChromaDB + LM Studio), streamed token-by-token in real time over WebSockets.
- **Assignment Submission** — Submit PDF assignments directly from the dashboard with deadline tracking and overdue indicators.
- **Communication** — Channel-based messaging between students and professors.
- **Settings** — Language toggle (English / French) and dark/light mode.

### Professor Portal
- **Dashboard** — Overview of managed courses and enrolled students.
- **Performance Analytics** — Per-course analytics dashboard with:
  - Class average, assignment completion rate, and total AI study queries.
  - Scatter plot correlating AI engagement with academic grade.
  - At-risk and top-performer student segments.
  - Full searchable student roster with scores and submission history.
  - Inline grading hub — review student submissions and enter scores per assignment.
- **Distribution** — Push course documents and assignments to enrolled students.
- **Communication** — Channel-based messaging with students.
- **Settings** — Profile and preference management.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| API Gateway | NestJS, TypeScript, Prisma ORM, BullMQ (job queues) |
| AI Workers | Python (FastAPI / asyncpg), PyMuPDF, OpenAI-compatible client |
| LLM Serving | LM Studio — `phi-3.5-mini-instruct` (generation) + `nomic-embed-text-v1.5` (embeddings) |
| Vector Store | ChromaDB |
| Database | PostgreSQL 15 (via Prisma) |
| Cache / Pub-Sub | Redis 7 |
| Containerisation | Docker Compose |

---

## 🏗 Project Structure

```
lumina-scholar/
├── apps/
│   ├── api/               # NestJS REST API + WebSocket gateway
│   │   ├── src/
│   │   │   ├── auth/      # JWT auth (access + refresh tokens)
│   │   │   ├── courses/   # Course & enrollment management
│   │   │   ├── documents/ # File upload, download, RAG ingestion jobs
│   │   │   ├── messages/  # Channel messaging
│   │   │   ├── analytics/ # Professor analytics endpoints
│   │   │   └── websockets/# Real-time AI stream gateway
│   │   └── prisma/        # Schema, migrations, seed data
│   └── workers/           # Python AI workers
│       ├── pdf_ingestion_worker.py  # PyMuPDF → chunks → ChromaDB embeddings
│       └── chat_worker.py           # Query embed → ChromaDB → phi3.5 → Redis stream
├── frontend/              # Next.js application
│   └── app/
│       ├── (auth)/        # Login / register pages
│       └── (app)/
│           ├── student/   # Student dashboard, documents, study hub, communication
│           └── professor/ # Professor dashboard, analytics, distribution, communication
├── docker-compose.yml     # Full stack orchestration
└── .env.example           # Environment variable reference
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js** v18+
- **Python** 3.11+
- **Docker Desktop** (running)
- **LM Studio** — installed and running locally

### 1. Clone & configure environment

```bash
git clone https://github.com/alaeddinedaly/lumina-scholar.git
cd lumina-scholar
cp .env.example .env   # Fill in your secrets
```

### 2. Boot data infrastructure

```bash
docker-compose up -d postgres redis chroma
```

This starts:
- PostgreSQL 15 on `localhost:5432`
- Redis 7 on `localhost:6379`
- ChromaDB on `localhost:8000`

### 3. Set up and start the NestJS API

```bash
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed          # Creates demo users, courses, and assignments
npm run start:dev
```

API runs on `http://localhost:3001`.

### 4. Start the Python AI Workers

```bash
cd apps/workers
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Mac / Linux

pip install -r requirements.txt
python main.py
```

### 5. Configure LM Studio *(required for AI features)*

1. Open LM Studio and click the **Local Server** icon.
2. Click **Start Server** (default port `1234`).
3. Load both models:
   - **Generation:** `phi-3.5-mini-instruct`
   - **Embeddings:** `nomic-embed-text-v1.5`
4. Verify the server logs show incoming requests.

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

---

## 🐳 Full Docker Compose (all services)

> **Note:** Docker mode requires LM Studio running on the host machine (exposed via `host.docker.internal:1234`).

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| NestJS API | http://localhost:3001 |
| ChromaDB | http://localhost:8000 |

---

## 🔑 Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Professor | professor@lumina.test | password123 |
| Student 1 | student1@lumina.test | password123 |
| Student 2 | student2@lumina.test | password123 |
| Student 3 | student3@lumina.test | password123 |
| Student 4 | student4@lumina.test | password123 |
| Student 5 | student5@lumina.test | password123 |

---

## ⚙️ How the RAG Pipeline Works

1. A professor uploads a PDF → the NestJS API stores it and enqueues an ingestion job via **BullMQ**.
2. `pdf_ingestion_worker.py` picks up the job, parses the PDF with **PyMuPDF**, chunks the text, generates embeddings via **nomic-embed-text** (through LM Studio's OpenAI-compatible API), and stores them in **ChromaDB**.
3. When a student asks a question in the Study Hub, the API emits it to the **WebSocket gateway**.
4. `chat_worker.py` embeds the query, performs a similarity search in ChromaDB, constructs a precision context prompt, pipes it into **phi-3.5-mini**, and broadcasts token chunks back over a **Redis Pub/Sub** channel directly to the student's browser in real time.

---

## 📜 License

MIT
