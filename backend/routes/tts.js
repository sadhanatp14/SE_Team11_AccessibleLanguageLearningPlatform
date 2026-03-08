const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const getPythonExecutableCandidates = () => {
    const candidates = [];

    if (process.env.PYTHON_EXECUTABLE) candidates.push(process.env.PYTHON_EXECUTABLE);

    // Prefer the repo virtualenv if present so Python deps (like gTTS) work reliably.
    const venvPython = path.resolve(__dirname, '../../.venv/bin/python');
    if (fs.existsSync(venvPython)) candidates.push(venvPython);

    // Common system fallbacks (Railway images vary).
    candidates.push('python3');
    candidates.push('python');

    return [...new Set(candidates)];
};

// Endpoint to generate audio
router.post('/speak', (req, res) => {
    const { text, speed, lang, language } = req.body;

    // EPIC 3.1.2, 3.5.3: Generate clear audio via backend TTS (consistent quality across devices).
    // EPIC 3.1.4: Support slow/easy-to-understand playback via the `speed` parameter.
    // EPIC 3.1.3, 3.5.1-3.5.2: Stateless endpoint enables unlimited replay by calling it again.

    if (!text) {
        return res.status(400).json({ message: 'Text is required' });
    }

    // Path to python script
    const scriptPath = path.join(__dirname, '../python_services/tts_gen.py');

    const pythonCandidates = getPythonExecutableCandidates();

    // Spawn python process (args: text, speed, lang)
    const resolvedLang = (typeof lang === 'string' && lang.trim())
        ? lang.trim()
        : (typeof language === 'string' && language.trim())
            ? language.trim()
            : 'en';

    let sentAudio = false;
    let stderrText = '';
    let pythonProcess;

    const startPython = (pythonExe, remainingCandidates) => {
        pythonProcess = spawn(pythonExe, [scriptPath, text, speed || '1.0', resolvedLang]);

        pythonProcess.stdout.on('data', (chunk) => {
            if (!sentAudio) {
                sentAudio = true;
                if (!res.headersSent) res.setHeader('Content-Type', 'audio/mpeg');
            }
            res.write(chunk);
        });

        pythonProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            stderrText += msg;
            console.error(`TTS Error: ${msg}`);
        });

        pythonProcess.on('error', (err) => {
            // If the executable doesn't exist, try the next candidate.
            if (err && err.code === 'ENOENT' && remainingCandidates.length > 0) {
                const next = remainingCandidates[0];
                return startPython(next, remainingCandidates.slice(1));
            }

            console.error('TTS spawn error:', err);
            if (!res.headersSent) {
                return res.status(500).json({ message: 'TTS service unavailable' });
            }
            res.end();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`TTS process exited with code ${code}`);
                if (!sentAudio && !res.headersSent) {
                    const payload = { message: 'TTS generation failed' };
                    if (process.env.NODE_ENV !== 'production' && stderrText.trim()) {
                        payload.details = stderrText.trim().slice(0, 1000);
                    }
                    return res.status(500).json(payload);
                }
            }
            res.end();
        });
    };

    const [firstCandidate, ...restCandidates] = pythonCandidates;
    startPython(firstCandidate, restCandidates);
});

module.exports = router;
