import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

LM_STUDIO_BASE_URL = os.getenv('LM_STUDIO_BASE_URL', 'http://localhost:1234/v1')
EMBED_MODEL = os.getenv('EMBED_MODEL', 'nomic-embed-text')
GEN_MODEL = os.getenv('GEN_MODEL', 'phi3.5')

CHROMA_HOST = os.getenv('CHROMA_HOST', 'localhost')
CHROMA_PORT = int(os.getenv('CHROMA_PORT', 8000))

UPLOAD_DIR = os.getenv('UPLOAD_DIR', './uploads')

# Build DATABASE_URL from individual parts if not set directly
_pg_user = os.getenv('POSTGRES_USER', 'lumina')
_pg_pass = os.getenv('POSTGRES_PASSWORD', 'lumina')
_pg_host = os.getenv('POSTGRES_HOST', 'localhost')
_pg_port = os.getenv('POSTGRES_PORT', '5432')
_pg_db   = os.getenv('POSTGRES_DB', 'lumina_scholar')
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    f'postgresql://{_pg_user}:{_pg_pass}@{_pg_host}:{_pg_port}/{_pg_db}'
)
