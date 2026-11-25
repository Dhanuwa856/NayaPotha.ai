import os
import uuid
import tempfile
from datetime import datetime
from typing import Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
import speech_recognition as sr
from pydub import AudioSegment

from app.db.mongo import get_db
from app.dependencies.auth import get_current_context

router = APIRouter(prefix="/voice", tags=["Voice AI & Drafts"])

def _extract_ids(ctx: Any) -> tuple[Optional[str], Optional[str]]:
    if isinstance(ctx, dict):
        return ctx.get("owner_id"), ctx.get("shop_id")
    return getattr(ctx, "owner_id", None), getattr(ctx, "shop_id", None)

@router.post("/transcribe")
async def transcribe_and_parse_voice(
    file: UploadFile = File(...),
    language: str = Form("si"),
    ctx: Any = Depends(get_current_context),
    db: Any = Depends(get_db),
):
    owner_id, shop_id = _extract_ids(ctx)
    
    # 1. Phone එකෙන් එන .m4a ෆයිල් එක තාවකාලිකව Save කිරීම
    suffix = os.path.splitext(file.filename or "audio.m4a")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_audio:
        tmp_audio.write(await file.read())
        tmp_audio_path = tmp_audio.name

    transcript = ""
    wav_path = tmp_audio_path + ".wav"
    
    try:
        # 2. pydub මගින් .m4a ෆයිල් එක .wav බවට හැරවීම (SpeechRecognition සඳහා)
        audio = AudioSegment.from_file(tmp_audio_path)
        audio.export(wav_path, format="wav")

        # 3. Google Free Web Speech API මගින් අකුරු බවට හැරවීම (No API Key needed)
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            # සිංහල සඳහා 'si-LK' ද, ඉංග්‍රීසි සඳහා 'en-US' ද භාවිතා කරයි
            lang_code = "si-LK" if language == "si" else "en-US"
            transcript = recognizer.recognize_google(audio_data, language=lang_code)

    except sr.UnknownValueError:
        raise HTTPException(status_code=422, detail="No clear speech detected in recording.")
    except sr.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Speech recognition service unavailable: {e}")
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=422, detail="Could not process audio format. Ensure FFmpeg is installed.")
    finally:
        # 4. තාවකාලික ෆයිල් මකා දැමීම
        if os.path.exists(tmp_audio_path):
            os.remove(tmp_audio_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

    if not transcript:
        raise HTTPException(status_code=422, detail="No clear speech detected.")

    # 5. Database Draft එක සෑදීම
    draft_id = f"vd_{uuid.uuid4().hex[:12]}"
    draft_doc = {
        "draft_id": draft_id,
        "shop_id": shop_id,
        "created_by": owner_id,
        "transcript": transcript,
        "language": language,
        "status": "DRAFT",
        "created_at": datetime.utcnow().isoformat(),
    }
    
    # App එකේ NLP engine එකෙන් මුදල සහ නම වෙන්කරගන්නා නිසා, 
    # Backend එකෙන් Transcript එක පමණක් යැවීම ප්‍රමාණවත්ය.
    await db.voice_drafts.insert_one(draft_doc)
    draft_doc.pop("_id", None)
    
    return draft_doc
