import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_summarize_mocked(monkeypatch):
    monkeypatch.setattr("app.db.database.get_pdf", lambda x: {"id": "pdf1", "stored_path": "fake.pdf"})
    monkeypatch.setattr("app.core.pdf_processor.PDFProcessor.extract_text", lambda x: "This is a very long text to summarize. " * 50)
    
    from app.core.llm import llm
    monkeypatch.setattr(llm, "generate_text", lambda x: "Mocked summary result.")
    
    response = client.post("/api/summarize", json={"pdf_id": "pdf1", "length": "short"})
    print("STATUS", response.status_code)
    print("JSON", response.json())
    assert response.status_code == 200
