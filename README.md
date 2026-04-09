# Lumina: Event-Driven Conversational BI Platform 🌌

![Project Status](https://img.shields.io/badge/Status-Active_Development-brightgreen)
![Architecture](https://img.shields.io/badge/Architecture-Event--Driven-blue)
![Frontend Stack](https://img.shields.io/badge/Frontend-Next.js_|_React_|_Three.js-black)
![AI Stack](https://img.shields.io/badge/AI_Engine-LangChain_|_Qwen_2.5-purple)

**Lumina** is a next-generation Business Intelligence (BI) platform built as a graduation project (Projet de Fin d'Études - PFE). It challenges the traditional, static dashboard paradigm by replacing it with a fully interactive, **AI-driven spatial interface**. 

Instead of forcing users to manually explore raw data streams, Lumina leverages offline Large Language Models (LLMs) to interpret natural language queries (e.g., *"Show me revenue drops by category"*) and dynamically maps them to optimized SQL to generate beautiful, interactive `Apache ECharts` datasets inside a hardware-accelerated 3D WebGL environment.

---

## 🏗 System Architecture & Design Philosophy

The architecture of Lumina was chosen specifically to solve the performance and latency bottlenecks commonly found in enterprise analytic platforms that handle large datasets concurrently.

### 1. Event-Driven Architecture (EDA)
Traditional BI platforms rely on synchronous HTTP requests. If a user asks for an aggressive table join on 2,000,000 rows, an HTTP connection will stall and time-out. 
Lumina adopts an **Event-Driven Architecture using Apache Kafka and WebSockets**:
* **Why we chose this:** By using Kafka as the backbone stream processor, large analytical queries are pushed into an asynchronous queue rather than bottlenecking the NestJS API layer under heavy concurrency. 
* Once the LLM generates the SQL and the database returns the payload, the platform streams the JSON result directly to the frontend via WebSockets in real-time. The UI is completely decoupled from the data-processing timeline.

### 2. Spatial UI & Rendering Optimization
We chose a highly uncommon approach for B2B dashboards: a $100,000 aesthetic.
* **Why we chose this:** Enterprise software is traditionally flat and fatiguing. Lumina deploys a persistent WebGL layer (`Three.js` + `React-Three-Fiber`) running an optimized algorithm (Instanced Meshes, deferred initialization) beneath a frosted layer of `TailwindCSS` glassmorphism. It guarantees 60fps animations out of the box while keeping the users cognitively engaged.

### 3. Local/Offline LLM Integation
* **Why we chose this:** Enterprise BI strictly mandates privacy. Uploading corporate `.csv` datasets or SQL schemas to OpenAI generates a massive security risk. Lumina is designed to be paired with **LM Studio** and **Llama.cpp**, running quantized models (like `Qwen-2.5-Coder-7B`) entirely locally on limited VRAM hardware using the LangChain wrapper. No data ever leaves the VPC.

---

## 🛠 Technology Stack

### Frontend (User Interface)
* **Framework:** Next.js (App Router) — Selected for its React Server Components (RSC) and highly efficient routing between the Data/Schema/Query flows.
* **Styling & Animations:** Tailwind CSS & Framer Motion — Creating the responsive flex/grid layouts and complex spatial layout shifts (40/60 split terminal).
* **3D Engine:** Three.js & React-Three-Fiber — Rendering the core background geometry.
* **Data Visualization:** Apache ECharts (`echarts-for-react`) — Chosen over simple libraries (like Recharts) because of its built-in canvas rendering engines, massive dataset capability, and configuration hooks required to build the deeply stylized neon gradients.

### Backend (Data Processing & AI)
* **Framework:** NestJS (TypeScript Node.js Framework)
* **Message Broker:** Apache Kafka (Event Streaming)
* **AI Pipelines:** LangChain.js & Local LLMs powered via GGUF models.

---

## 🚀 Getting Started

Follow these instructions to spin up the Lumina Frontend environment on your local machine.

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/YourUsername/Lumina-Conversational-BI.git
   cd Lumina-Conversational-BI/frontend
   ```

2. **Install all dependencies**
   ```bash
   npm install
   ```

3. **Launch the Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Platform**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Testing the Flow (Mock API):**
> Currently, the Frontend features built-in delay simulators (`setTimeout`) rather than raw API hits. To test the core UI:
> * Proceed to `http://localhost:3000/upload` to witness the Drag-and-Drop system and Analytics overlay.
> * Navigate to `http://localhost:3000/query` to interact with the LLM Terminal and toggle the EChart visualization states.
> * View historical AI snapshots mapping back to previous data sessions via `http://localhost:3000/history`.

---
*Developed securely and rapidly as a thesis execution project (PFE) inside the Novation City AI ecosystem format.*
