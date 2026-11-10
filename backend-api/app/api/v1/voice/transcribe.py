# backend-api හි voice router එකක් ලෙස එකතු කිරීමට (විකල්ප):
from fastapi import APIRouter, UploadFile, File, Form
import speech_recognition as sr
import tempfile
import os

router = APIRouter(prefix="/voice", tags=["Voice"])

@router.post("/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    language: str = Form("si")
):
    # Audio ෆයිල් එක තාවකාලිකව සුරැකීම
    suffix = os.path.splitext(file.filename or "audio.m4a")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # Google Free Speech Recognition හෝ HuggingFace Whisper මෙතැනට යෙදිය හැක
        recognizer = sr.Recognizer()
        with sr.AudioFile(tmp_path) as source:
            audio_data = recognizer.record(source)
            lang_code = "si-LK" if language == "si" else "en-LK"
            text = recognizer.recognize_google(audio_data, language=lang_code)
            return {"transcript": text, "language": language}
    except Exception:
        return {"transcript": "", "language": language}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)