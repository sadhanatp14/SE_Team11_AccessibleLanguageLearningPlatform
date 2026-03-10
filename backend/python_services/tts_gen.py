"""
tts_gen.py — Google Text-to-Speech audio generator
====================================================
Invoked as a child process by the Node.js TTS route
(``backend/routes/tts.js``) to produce MP3 audio from a text string.

Usage
-----
    python tts_gen.py "<text>" [speed] [lang]
    echo "<text>" | python tts_gen.py --stdin [speed] [lang]

Arguments
---------
    text / --stdin
        The text to synthesise. Pass ``--stdin`` when the text is large
        (avoids operating-system argv size limits); the script then reads
        the full text from standard input.
    speed   (optional)
        A floating-point playback-rate value in the range 0.5–2.0 matching
        the Web Audio ``playbackRate`` property. Values below 0.8 enable
        gTTS ``slow`` mode; all other values use normal speed.
    lang    (optional)
        A BCP-47 language tag (e.g. ``en``, ``en-US``, ``ta-IN``, ``hi-IN``)
        or a raw gTTS language code. Defaults to ``'en'`` when omitted or
        unrecognised.

Output
------
    MP3 bytes written directly to **stdout** (no temporary files).
    Error messages are written to **stderr** and the process exits with
    code 1 so the Node caller can detect failure.

Dependencies
------------
    gtts  — pip install gtts
"""
import sys          # argv, stdin/stdout/stderr, exit
from io import BytesIO  # in-memory buffer for gTTS write_to_fp

# Simple script to generate audio from text using Google TTS
# Usage: python tts_gen.py "text_to_speak" [speed] [lang]

def resolve_lang(value: str) -> str:
    """
    Normalise a raw language tag to a gTTS-compatible two-letter code.

    Accepts BCP-47 tags (e.g. ``'ta-IN'``, ``'hi-IN'``, ``'en-US'``) as well
    as plain gTTS codes (``'ta'``, ``'hi'``, ``'en'``). Any unrecognised value
    falls back to ``'en'`` so the route never crashes due to a bad lang param.

    Parameters
    ----------
    value : str
        Raw language value received from the Node caller (may be empty/None).

    Returns
    -------
    str
        One of ``'ta'`` (Tamil), ``'hi'`` (Hindi), or ``'en'`` (English).
    """
    raw = (value or '').strip().lower()
    if not raw:
        return 'en'  # Default to English when no language is specified
    # Accept BCP-47 inputs (e.g., ta-IN) or raw gTTS codes.
    if raw.startswith('ta'):
        return 'ta'  # Tamil
    if raw.startswith('hi'):
        return 'hi'  # Hindi
    if raw.startswith('en'):
        return 'en'  # English
    # Unrecognised tag — fall back safely to English
    return 'en'


def generate_audio(text: str, slow: bool = False, lang: str = 'en') -> None:
    """
    Synthesise ``text`` with gTTS and stream the resulting MP3 bytes to stdout.

    Writing to ``sys.stdout.buffer`` (the raw binary stream) avoids any
    encoding issues that would corrupt the MP3 data if it were written through
    the text-mode stdout.

    Parameters
    ----------
    text : str
        The text to convert to speech.
    slow : bool, optional
        When ``True``, gTTS generates slower-paced audio (maps to the
        ``slow`` parameter of the Google TTS API). Defaults to ``False``.
    lang : str, optional
        gTTS language code (``'en'``, ``'ta'``, or ``'hi'``). Defaults to ``'en'``.

    Side effects
    ------------
    On success: MP3 bytes written to ``sys.stdout.buffer``.
    On failure: error message written to ``sys.stderr``, process exits with code 1.
    """
    try:
        from gtts import gTTS  # Imported here to give a clear ImportError if gtts is missing

        # Instantiate the gTTS object with the resolved language and speed settings
        tts = gTTS(text=text, lang=lang, slow=slow)

        # Write MP3 bytes directly to stdout (no filesystem usage).
        # gTTS provides write_to_fp for file-like objects.
        buf = BytesIO()          # In-memory buffer to capture the MP3 bytes
        tts.write_to_fp(buf)     # gTTS streams the audio into the buffer
        sys.stdout.buffer.write(buf.getvalue())  # Forward raw bytes to the Node caller
        sys.stdout.buffer.flush()                # Ensure all bytes are flushed before exit

    except Exception as e:
        # Keep stderr short but informative (Node route captures and logs it).
        sys.stderr.write(f"TTS_PY_ERROR: {type(e).__name__}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Require at least one positional argument (the text or --stdin flag)
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python tts_gen.py <text>|--stdin [speed] [lang]\n")
        sys.exit(1)

    # Node integration passes --stdin to avoid argv size limits for long texts.
    # In --stdin mode the text is read from standard input; optional speed and
    # lang arguments still come from argv at positions 2 and 3.
    if sys.argv[1] == '--stdin':
        text_input = sys.stdin.read()                                  # Read full text from stdin
        speed_arg  = sys.argv[2] if len(sys.argv) > 2 else None        # Optional speed value
        lang_arg   = sys.argv[3] if len(sys.argv) > 3 else None        # Optional language tag
    else:
        text_input = sys.argv[1]                                       # Text passed directly as argv[1]
        speed_arg  = sys.argv[2] if len(sys.argv) > 2 else None
        lang_arg   = sys.argv[3] if len(sys.argv) > 3 else None

    is_slow    = False   # Default: normal TTS speed
    lang_input = 'en'    # Default: English
    
    if speed_arg is not None:
        # Map the Web Audio playbackRate (0.5–2.0) to gTTS slow mode.
        # Rates below 0.8 are considered "slow"; everything else uses normal speed.
        try:
            speed_val = float(speed_arg)
            if speed_val < 0.8:
                is_slow = True
        except ValueError:
            pass  # Ignore non-numeric speed args; fall back to normal speed

    if lang_arg is not None:
        # Normalise the raw language tag to a gTTS-compatible code
        lang_input = resolve_lang(lang_arg)

    # Synthesise the audio and stream MP3 bytes to stdout
    generate_audio(text_input, is_slow, lang_input)
