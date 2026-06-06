from pathlib import Path

from fpdf import FPDF

from app.core.pdf_processor import PDFProcessor


def _make_test_pdf(path: Path, text: str) -> None:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    for line in text.splitlines() or [text]:
        pdf.cell(0, 10, txt=line, ln=1)
    pdf.output(str(path))


def test_extract_text_from_real_pdf(tmp_path: Path):
    pdf_path = tmp_path / "sample.pdf"
    sample = (
        "Tokenization is the first step in NLP. "
        "It splits text into smaller units called tokens."
    )
    _make_test_pdf(pdf_path, sample)
    text = PDFProcessor.extract_text(pdf_path)
    assert "Tokenization" in text
    assert "tokens" in text


def test_page_count_matches_pages(tmp_path: Path):
    pdf_path = tmp_path / "multipage.pdf"
    pdf = FPDF()
    for _ in range(3):
        pdf.add_page()
        pdf.set_font("Helvetica", size=12)
        pdf.cell(0, 10, txt="Page content", ln=1)
    pdf.output(str(pdf_path))
    assert PDFProcessor.page_count(pdf_path) == 3
