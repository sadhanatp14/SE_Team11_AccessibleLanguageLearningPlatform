# Audio Generation Guide

This guide will help you generate all 60 audio files needed for the lesson questions using the TTS service.

## Prerequisites

1. Make sure your backend server is running
2. Ensure the TTS service is properly configured
3. Node.js must be installed

## Quick Start

### Option 1: Automatic Generation (Recommended)

Run the provided script to generate all audio files automatically:

```bash
node generate-audio-files.js
```

This script will:
- Connect to your TTS service at `http://localhost:5002/api/tts/speak`
- Generate all 60 audio files (15 questions × 4 audio types each)
- Save them to `/frontend/public/audio/` directory
- Display progress for each file

### Option 2: Manual Generation via API

You can also generate audio files manually using the TTS API endpoint:

```bash
curl -X POST http://localhost:5002/api/tts/speak \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Is Hello a friendly greeting?",
    "language": "en",
    "speed": 1.0,
    "voice": "default"
  }' \
  --output frontend/public/audio/greet-1-question.mp3
```

### Option 3: Using Postman or Similar Tool

1. **Endpoint**: `POST http://localhost:5002/api/tts/speak`
2. **Headers**: `Content-Type: application/json`
3. **Body**: 
```json
{
  "text": "Your text here",
  "language": "en",
  "speed": 1.0,
  "voice": "default"
}
```
4. Save the response as an MP3 file

## Audio Files Needed

### Total: 60 Audio Files

Each of the 15 questions needs 4 audio files:
1. Question audio (the question text)
2. Explanation audio (the explanation when answered)
3. Correct feedback audio (positive reinforcement)
4. Incorrect feedback audio (encouraging retry message)

## File Naming Convention

All audio files follow this pattern:
- `{lesson}-{number}-{type}.mp3`

Where:
- `{lesson}` = `greet`, `vocab`, or `numbers`
- `{number}` = `1` through `5`
- `{type}` = `question`, `explanation`, `correct`, or `incorrect`

### Examples:
- `greet-1-question.mp3` - Question for greeting lesson, question 1
- `vocab-3-explanation.mp3` - Explanation for vocabulary lesson, question 3
- `numbers-5-correct.mp3` - Correct feedback for numbers lesson, question 5

## Audio Content Reference

See [ASSETS_REQUIRED.md](./ASSETS_REQUIRED.md) for the complete list of all text content that needs to be converted to audio.

## Troubleshooting

### Script fails to connect
- Ensure backend server is running on port 5002
- Check that the TTS route is configured at `/api/tts/generate`
- Verify your `.env` file has the correct TTS service configuration

### Audio files sound wrong
- Adjust the `speed` parameter (default is 1.0)
- Try different `voice` options if your TTS service supports them
- Check the `language` parameter matches your content

### Permission errors
- Ensure the `frontend/public/audio/` directory exists
- Check write permissions for the directory
- Try running with appropriate permissions

## Verifying Generated Files

After generation, verify:

1. **File count**: Should have 60 `.mp3` files in `/frontend/public/audio/`
2. **File size**: Each file should be > 0 bytes
3. **Playback**: Test a few files to ensure audio quality

Quick verification command:
```bash
# Count files
ls frontend/public/audio/*.mp3 | wc -l

# Check file sizes
ls -lh frontend/public/audio/
```

## Alternative: Pre-recorded Audio

If the TTS service doesn't meet your quality requirements, you can:

1. Record audio manually using professional voice actors
2. Use online TTS services (Google Cloud TTS, Amazon Polly, etc.)
3. Replace specific files with higher quality versions while keeping the same filenames

## Integration

Once all audio files are generated:

1. The lesson components will automatically load them
2. Audio will play when:
   - A question is displayed (`questionAudioUrl`)
   - An explanation is shown (`explanationAudioUrl`)
   - Correct/incorrect feedback is given (`correctAudioUrl`/`incorrectAudioUrl`)
3. Users can replay audio using the audio controls in the UI

## Accessibility Notes

- Audio narration is crucial for users with visual impairments
- Ensure clear pronunciation and appropriate pacing
- Test with actual users to verify comprehension
- Consider adding captions/transcripts as a fallback
