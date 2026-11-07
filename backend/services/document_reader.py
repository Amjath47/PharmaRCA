from io import BytesIO
from email import policy
from email.parser import BytesParser
from pathlib import Path

from pypdf import PdfReader


def extract_document_text(filename: str, content: bytes) -> str:
    extension = Path(filename).suffix.lower()

    if extension == ".pdf":
        reader = PdfReader(BytesIO(content))

        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)

        extracted_text = "\n".join(text_parts)

    elif extension == ".txt":
        extracted_text = content.decode("utf-8-sig")

    elif extension == ".eml":
        message = BytesParser(policy=policy.default).parsebytes(content)

        extracted_text = (
            f"Subject: {message.get('subject', '')}\n"
            f"From: {message.get('from', '')}\n\n"
        )

        body = message.get_body(preferencelist=("plain",))

        if body:
            extracted_text += body.get_content()

    else:
        raise ValueError(
            "Unsupported file type. Upload a PDF, TXT, or EML file."
        )

    extracted_text = extracted_text.strip()

    if not extracted_text:
        raise ValueError(
            "No readable text found. The PDF may be scanned "
            "and require OCR, or the document may be empty."
        )

    return extracted_text