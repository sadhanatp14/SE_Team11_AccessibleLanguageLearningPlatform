import sys
from io import BytesIO

# Simple script to generate audio from text using Google TTS
# Usage: python tts_gen.py "text_to_speak" [speed] [lang]

def resolve_lang(value: str) -> str:
    raw = (value or '').strip().lower()
    if not raw:
        return 'en'
    # Accept BCP-47 inputs (e.g., ta-IN) or raw gTTS codes.
    if raw.startswith('ta'):
        return 'ta'
    if raw.startswith('hi'):
        return 'hi'
    if raw.startswith('en'):
        return 'en'
    # Fallback safely to English
    return 'en'


def generate_audio(text, slow=False, lang='en'):
    try:
        from gtts import gTTS

        tts = gTTS(text=text, lang=lang, slow=slow)

        # Write MP3 bytes directly to stdout (no filesystem usage).
        # gTTS provides write_to_fp for file-like objects.
        buf = BytesIO()
        tts.write_to_fp(buf)
        sys.stdout.buffer.write(buf.getvalue())
        sys.stdout.buffer.flush()

    except Exception as e:
        # Keep stderr short but informative (Node route can capture it).
        sys.stderr.write(f"TTS_PY_ERROR: {type(e).__name__}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python tts_gen.py <text>|--stdin [speed] [lang]\n")
        sys.exit(1)

    # Node integration passes --stdin to avoid argv size limits.
    if sys.argv[1] == '--stdin':
        text_input = sys.stdin.read()
        speed_arg = sys.argv[2] if len(sys.argv) > 2 else None
        lang_arg = sys.argv[3] if len(sys.argv) > 3 else None
    else:
        text_input = sys.argv[1]
        speed_arg = sys.argv[2] if len(sys.argv) > 2 else None
        lang_arg = sys.argv[3] if len(sys.argv) > 3 else None

    is_slow = False
    lang_input = 'en'
    
    if speed_arg is not None:
        # If speed input (which comes as playbackRate 0.5 to 2.0) is low, we use slow mode
        try:
            speed_val = float(speed_arg)
            if speed_val < 0.8:
                is_slow = True
        except ValueError:
            pass

    if lang_arg is not None:
        lang_input = resolve_lang(lang_arg)

    generate_audio(text_input, is_slow, lang_input)
