import logging
import asyncio
import json
import uuid
import asyncpg
import redis.asyncio as redis
from bullmq import Worker
from chromadb import HttpClient
from chromadb.config import Settings
from openai import AsyncOpenAI

from config import (
    LM_STUDIO_BASE_URL, EMBED_MODEL, GEN_MODEL,
    CHROMA_HOST, CHROMA_PORT, DATABASE_URL,
    REDIS_HOST, REDIS_PORT
)

logger = logging.getLogger("CHAT-WORKER")

async def persist_chat(job_data, response_text, citations):
    conn = await asyncpg.connect(DATABASE_URL)
    course_id = job_data.get('courseId')  # can be None for personal chats
    try:
        async with conn.transaction():
            msg_id = str(uuid.uuid4())
            if course_id:
                await conn.execute(
                    """
                    INSERT INTO "Message" (id, "sessionId", query, response, "courseId", "userId", "tenantId", "createdAt")
                    VALUES ($1, $2, $3, $4, $5::uuid, $6::uuid, $7::uuid, NOW())
                    """,
                    msg_id, job_data['sessionId'], job_data['query'], response_text,
                    course_id, job_data['userId'], job_data['tenantId']
                )
            else:
                # Personal chat — no courseId
                await conn.execute(
                    """
                    INSERT INTO "Message" (id, "sessionId", query, response, "userId", "tenantId", "createdAt")
                    VALUES ($1, $2, $3, $4, $5::uuid, $6::uuid, NOW())
                    """,
                    msg_id, job_data['sessionId'], job_data['query'], response_text,
                    job_data['userId'], job_data['tenantId']
                )

            for c in citations:
                await conn.execute(
                    """
                    INSERT INTO "Citation" (id, "messageId", "sourceFile", "pageNumber", "similarityScore", "chunkText")
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    str(uuid.uuid4()), msg_id, c['sourceFile'], c['pageNumber'],
                    float(c['similarityScore']), c['chunkText']
                )
    finally:
        await conn.close()

async def process_chat(job, job_token):
    data = job.data
    logger.info(f"[{job.id}] Chat triggered for session {data['sessionId']}")
    
    r_pub = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
    stream_channel = f"stream:{data['sessionId']}"
    
    try:
        # Step 1: Embed Query
        client = AsyncOpenAI(base_url=LM_STUDIO_BASE_URL, api_key="lm-studio")
        embed_res = await client.embeddings.create(input=[data['query']], model=EMBED_MODEL)
        query_vector = embed_res.data[0].embedding

        # Step 2: Search Chroma
        chroma_client = HttpClient(host=CHROMA_HOST, port=CHROMA_PORT, settings=Settings(allow_reset=True))
        # For personal documents, resolve collection from the document's metadata
        if data.get('isPersonal') or not data.get('courseId'):
            collection_name = f"personal_{data['tenantId']}_{data['userId']}"
        else:
            collection_name = f"tenant_{data['tenantId']}_course_{data['courseId']}"
        collection = chroma_client.get_or_create_collection(name=collection_name)

        where_filter = {"document_id": data['documentId']} if data.get('documentId') else None
        
        results = collection.query(
            query_embeddings=[query_vector],
            n_results=5,
            where=where_filter
        )

        # Build Citations
        citations = []
        context_blocks = []
        if results['documents'] and results['documents'][0]:
            docs = results['documents'][0]
            metas = results['metadatas'][0]
            distances = results['distances'][0]
            
            for i, (doc, meta, dist) in enumerate(zip(docs, metas, distances)):
                citations.append({
                    "sourceFile": meta['source'],
                    "pageNumber": meta['page_number'],
                    "similarityScore": 1.0 - dist,  # Cosine dist mapping
                    "chunkText": doc
                })
                context_blocks.append(f"--- Context {i+1} ---\n{doc}")
                
        context_str = "\n".join(context_blocks)
        
        # Step 3: Build Prompt
        system_prompt = "You are an academic tutor. Answer the student's question using ONLY the context provided below. If the answer is not in the context, say so clearly. Always cite the source document and page number for every claim you make."
        user_prompt = f"Context:\n{context_str}\n\nStudent Question: {data['query']}"

        # Step 4: Stream GenModel
        logger.info(f"[{job.id}] Starting phi3.5 stream...")
        stream = await client.chat.completions.create(
            model=GEN_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            stream=True
        )

        full_response = ""
        # Step 5: Relay via Hub
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_response += token
                await r_pub.publish(stream_channel, json.dumps({
                    "type": "token",
                    "content": token
                }))

        logger.info(f"[{job.id}] Published {len(full_response)} chars across tokens to {stream_channel}")

        # Step 7: Stream End
        await r_pub.publish(stream_channel, json.dumps({
            "type": "end",
            "citations": citations
        }))

        # Step 8: Persist
        await persist_chat(data, full_response, citations)
        logger.info(f"[{job.id}] Chat stream complete and persisted.")

    except Exception as e:
        logger.error(f"[{job.id}] Chat failed: {str(e)}", exc_info=True)
        await r_pub.publish(stream_channel, json.dumps({
            "type": "token",
            "content": "\n\n[System Error: Failed to generate response]"
        }))
        await r_pub.publish(stream_channel, json.dumps({"type": "end", "citations": []}))
    finally:
        await r_pub.close()

async def dispatch_chat(job, job_token):
    """Routes jobs by name to the correct handler."""
    if job.name == 'process-tutor':
        await process_tutor(job, job_token)
    else:
        await process_chat(job, job_token)

def create_chat_worker(redis_opts):
    return Worker("chat", dispatch_chat, {"connection": redis_opts})

async def process_tutor(job, job_token):
    """Free-form AI tutor chat — no RAG, just conversation history."""
    data = job.data
    logger.info(f"[{job.id}] Tutor chat for session {data['sessionId']}")

    r_pub = redis.Redis(host=REDIS_HOST, port=REDIS_PORT)
    stream_channel = f"stream:{data['sessionId']}"

    try:
        client = AsyncOpenAI(base_url=LM_STUDIO_BASE_URL, api_key="lm-studio")

        system_msg = {
            "role": "system",
            "content": (
                "You are Lumina, an expert academic tutor. You help students understand their coursework, "
                "answer questions clearly, explain concepts step-by-step, and provide examples. "
                "Be encouraging, precise, and educational. Never refuse to help with academic topics."
            )
        }

        # Build messages from history + new query
        history = data.get('history', [])
        messages = [system_msg] + history + [{"role": "user", "content": data['query']}]

        stream = await client.chat.completions.create(
            model=GEN_MODEL,
            messages=messages,
            stream=True
        )

        full_response = ""
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_response += token
                await r_pub.publish(stream_channel, json.dumps({
                    "type": "token",
                    "content": token
                }))

        await r_pub.publish(stream_channel, json.dumps({"type": "end", "citations": []}))
        logger.info(f"[{job.id}] Tutor response: {len(full_response)} chars")

    except Exception as e:
        logger.error(f"[{job.id}] Tutor chat failed: {str(e)}", exc_info=True)
        await r_pub.publish(stream_channel, json.dumps({"type": "token", "content": "\n\n[Error: Could not reach the AI model]"})) 
        await r_pub.publish(stream_channel, json.dumps({"type": "end", "citations": []}))
    finally:
        await r_pub.close()

def create_tutor_worker(redis_opts):
    return Worker("chat", process_tutor, {"connection": redis_opts})
