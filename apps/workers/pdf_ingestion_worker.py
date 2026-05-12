import logging
import asyncio
import uuid
import asyncpg
import fitz  # PyMuPDF
from bullmq import Worker
from langchain_text_splitters import RecursiveCharacterTextSplitter
from chromadb import HttpClient
from chromadb.config import Settings
from openai import AsyncOpenAI

from config import (
    LM_STUDIO_BASE_URL, EMBED_MODEL,
    CHROMA_HOST, CHROMA_PORT, DATABASE_URL
)

logger = logging.getLogger("PDF-WORKER")

# Postgres Helper
async def update_doc_status(document_id: str, status: str, chunk_count: int = 0):
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(
            """
            UPDATE "Document" 
            SET status = CAST($1 AS "DocumentStatus"), "chunkCount" = $2, "updatedAt" = NOW() 
            WHERE id = $3::uuid
            """,
            status, chunk_count, document_id
        )
    finally:
        await conn.close()

async def process_pdf(job, job_token):
    data = job.data
    document_id = data['documentId']
    tenant_id = data['tenantId']
    course_id = data['courseId']
    file_path = data['filePath']
    original_name = data['originalName']

    logger.info(f"[{job.id}] Starting ingestion for doc: {document_id}")

    try:
        # Step 2: Extract text
        doc = fitz.open(file_path)
        pages = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            if text.strip():
                pages.append({"text": text, "page_number": page_num + 1})

        # Step 3: Chunk
        splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)
        chunks = []
        for p in pages:
            split = splitter.split_text(p["text"])
            for s in split:
                chunks.append({
                    "text": s,
                    "page_number": p["page_number"]
                })

        logger.info(f"[{job.id}] Total chunks generated: {len(chunks)}")

        if len(chunks) == 0:
            logger.error(f"[{job.id}] No text could be extracted from PDF. Possibly an image-only scan.")
            await update_doc_status(document_id, 'FAILED')
            return

        # Step 4: Batch embed
        client = AsyncOpenAI(base_url=LM_STUDIO_BASE_URL, api_key="lm-studio")
        embeddings = []
        batch_size = 50
        
        for i in range(0, len(chunks), batch_size):
            batch = [c["text"] for c in chunks[i:i + batch_size]]
            logger.info(f"[{job.id}] Embedding batch {i//batch_size + 1}")
            response = await client.embeddings.create(
                input=batch,
                model=EMBED_MODEL
            )
            for d in response.data:
                embeddings.append(d.embedding)

        # Step 5: Store in Chroma — use personal collection if no courseId
        chroma_client = HttpClient(host=CHROMA_HOST, port=CHROMA_PORT, settings=Settings(allow_reset=True))
        if data.get('isPersonal') or not data.get('courseId'):
            collection_name = f"personal_{data['tenantId']}_{data.get('userId', 'unknown')}"
        else:
            collection_name = f"tenant_{data['tenantId']}_course_{data['courseId']}"
        collection = chroma_client.get_or_create_collection(name=collection_name)

        ids = [str(uuid.uuid4()) for _ in chunks]
        docs = [c["text"] for c in chunks]
        metadatas = [{
            "source": original_name,
            "page_number": c["page_number"],
            "course_id": course_id if course_id else "",
            "tenant_id": tenant_id,
            "document_id": document_id
        } for c in chunks]

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=docs,
            metadatas=metadatas
        )

        # Step 6: Update DB
        await update_doc_status(document_id, 'INDEXED', len(chunks))
        logger.info(f"[{job.id}] Completed successfully")

    except Exception as e:
        logger.error(f"[{job.id}] Failed: {str(e)}", exc_info=True)
        await update_doc_status(document_id, 'FAILED')
        raise e

def create_pdf_worker(redis_opts):
    return Worker("pdf-ingestion", process_pdf, {"connection": redis_opts})
