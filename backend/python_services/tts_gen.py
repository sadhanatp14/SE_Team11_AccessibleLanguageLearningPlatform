import sys
import os
from gtts import gTTS

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
        # gTTS (Google Text-to-Speech)
        tts = gTTS(text=text, lang=lang, slow=slow)
        
        # Save to a temporary file or stdout
        # For simplicity in this integration, we'll write to a temp file and print the filename
        # Or better, let's write to stdout buffer directly if possible, 
        # but gTTS writes to file.
        
        filename = f"temp_audio_{os.getpid()}.mp3"
        tts.save(filename)
        
        # Read the file and write binary to stdout
        with open(filename, "rb") as f:
            sys.stdout.buffer.write(f.read())
            
        # Clean up
        os.remove(filename)
        
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python tts_gen.py <text> [speed] [lang]\n")
        sys.exit(1)
        
    text_input = sys.argv[1]
    is_slow = False
    lang_input = 'en'
    
    if len(sys.argv) > 2:
        # If speed input (which comes as playbackRate 0.5 to 2.0) is low, we use slow mode
        try:
            speed_val = float(sys.argv[2])
            if speed_val < 0.8:
                is_slow = True
        except ValueError:
            pass

    if len(sys.argv) > 3:
        lang_input = resolve_lang(sys.argv[3])

    generate_audio(text_input, is_slow, lang_input)
