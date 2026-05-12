import asyncio
import logging
from config import REDIS_HOST, REDIS_PORT
from pdf_ingestion_worker import create_pdf_worker
from chat_worker import create_chat_worker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MAIN")

async def main():
    logger.info("Starting AI Workers...")
    
    redis_opts = {
        "host": REDIS_HOST,
        "port": REDIS_PORT,
    }

    pdf_worker = create_pdf_worker(redis_opts)
    chat_worker = create_chat_worker(redis_opts)

    try:
        # Run forever
        await asyncio.gather(
            asyncio.sleep(3600)  # The bullmq Worker internally loops when created and awaited, but standard usage is to just keep the process alive.
        )
    except KeyboardInterrupt:
        logger.info("Shutting down workers...")
        await pdf_worker.close()
        await chat_worker.close()

if __name__ == "__main__":
    asyncio.run(main())
