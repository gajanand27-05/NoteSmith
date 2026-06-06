from pathlib import Path

from pypdf import PdfReader


class PDFProcessor:
    @staticmethod
    def extract_text(file_path: str | Path) -> str:
        reader = PdfReader(str(file_path))
        parts: list[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text:
                parts.append(text)
        return "\n\n".join(parts).strip()

    @staticmethod
    def page_count(file_path: str | Path) -> int:
        return len(PdfReader(str(file_path)).pages)
