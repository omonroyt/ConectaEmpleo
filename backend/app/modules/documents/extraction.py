"""Extracción real de texto desde documentos de CV (docs/05 §7, A1 modo EXTRACT).

`pypdf` para PDF y `python-docx` para `.docx` — ambos puros Python, sin
dependencias de sistema (a diferencia de `python-magic`, ya evitado en
`validation.py` por el mismo motivo en Windows).

Un PDF escaneado (imagen sin capa de texto) o un archivo dañado no deben
romper el job `CV_PARSE`: si el texto obtenido es insuficiente, se lanza
`CVTextExtractionError` con un mensaje accionable en español. El worker
(`documents/service.py::cv_parse_worker`) traduce eso en `Document.status =
FAILED` **sin mutar el perfil** (HU-C03) — nunca se llama a `AIPort.parse_cv`
con texto insuficiente o inventado.

La ruta "enviar como imagen a un modelo con visión" que menciona docs/05 §7
para CVs escaneados requiere un adaptador con LLM real (B11); el
`DeterministicAdapter` no tiene visión. Aquí, ante ese caso, el fallback es
declarar la extracción fallida con un mensaje claro, no inventar contenido.
"""

from __future__ import annotations

import io

from docx import Document as DocxDocument
from pypdf import PdfReader

#: Umbral mínimo de caracteres para considerar que el documento trae texto
#: real aprovechable. Por debajo de esto, tratamos el resultado como "no se
#: pudo leer" (PDF escaneado, archivo vacío o dañado) en vez de intentar
#: parsear un CV con casi nada de contenido.
MIN_TEXT_LENGTH = 30

PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class CVTextExtractionError(Exception):
    """El documento no produjo texto suficiente para extraer un CV (HU-C03)."""


def _extract_pdf_text(content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(content))
        pages_text: list[str] = []
        for page in reader.pages:
            try:
                pages_text.append(page.extract_text() or "")
            except Exception:  # noqa: BLE001 — una página dañada no debe tumbar todo el PDF
                continue
        return "\n".join(pages_text).strip()
    except CVTextExtractionError:
        raise
    except Exception as exc:  # noqa: BLE001 — cualquier falla de pypdf es "no se pudo leer"
        raise CVTextExtractionError(
            "No se pudo abrir el PDF: parece estar dañado o corrupto. Sube una versión válida "
            "del archivo o usa el CV conversacional."
        ) from exc


def _extract_docx_text(content: bytes) -> str:
    try:
        doc = DocxDocument(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs).strip()
    except Exception as exc:  # noqa: BLE001 — cualquier falla de python-docx es "no se pudo leer"
        raise CVTextExtractionError(
            "No se pudo abrir el documento Word: parece estar dañado o corrupto. Sube una "
            "versión válida del archivo o usa el CV conversacional."
        ) from exc


def extract_text(*, mime_type: str, content: bytes) -> str:
    """Extrae texto real de `content` según `mime_type`.

    Lanza `CVTextExtractionError` (mensaje en español, accionable) si el mime
    no es un formato de texto soportado (ej. una imagen — PDF/JPG escaneado
    sin capa de texto) o si el resultado es demasiado corto para ser un CV
    real.
    """

    if mime_type == PDF_MIME:
        text = _extract_pdf_text(content)
    elif mime_type == DOCX_MIME:
        text = _extract_docx_text(content)
    else:
        # PNG/JPG: sin adaptador de visión disponible (ver docstring del módulo).
        raise CVTextExtractionError(
            "Este archivo es una imagen y no tiene texto que se pueda leer directamente. "
            "Sube tu CV en PDF o Word con texto seleccionable, o usa el CV conversacional "
            "para construirlo hablando."
        )

    if len(text) < MIN_TEXT_LENGTH:
        raise CVTextExtractionError(
            "No se pudo leer texto suficiente del documento. Es posible que sea un PDF "
            "escaneado (una foto o imagen del CV) o que el archivo esté dañado. Sube una "
            "versión con texto seleccionable o usa el CV conversacional para construirlo "
            "hablando."
        )
    return text
