import os
import shutil
import sys
import tempfile
from pathlib import Path

TEST_ROOT = Path(tempfile.mkdtemp(prefix="notesmith_test_"))
os.environ["UPLOAD_DIR"] = str(TEST_ROOT / "uploads")
os.environ["CHROMA_PERSIST_DIR"] = str(TEST_ROOT / "chroma")
os.environ["OLLAMA_BASE_URL"] = "http://localhost:11434"
os.environ["OLLAMA_CHAT_MODEL"] = "llama3.1:8b"
os.environ["OLLAMA_EMBED_MODEL"] = "nomic-embed-text"

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(TEST_ROOT, ignore_errors=True)
