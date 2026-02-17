const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const getPythonExecutable = () => {
    if (process.env.PYTHON_EXECUTABLE) return process.env.PYTHON_EXECUTABLE;

    // Prefer the repo virtualenv if present so Python deps (like gTTS) work reliably.
    const venvPython = path.resolve(__dirname, '../../.venv/bin/python');
    if (fs.existsSync(venvPython)) return venvPython;

    return 'python3';
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

    const pythonExe = getPythonExecutable();

    // Spawn python process
    // args: text, speed, lang
    const resolvedLang = (typeof lang === 'string' && lang.trim())
        ? lang.trim()
        : (typeof language === 'string' && language.trim())
            ? language.trim()
            : 'en';

    const pythonProcess = spawn(pythonExe, [scriptPath, text, speed || '1.0', resolvedLang]);

    let sentAudio = false;

    pythonProcess.stdout.on('data', (chunk) => {
        if (!sentAudio) {
            sentAudio = true;
            if (!res.headersSent) res.setHeader('Content-Type', 'audio/mpeg');
        }
        res.write(chunk);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`TTS Error: ${data}`);
    });

    pythonProcess.on('error', (err) => {
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
                return res.status(500).json({ message: 'TTS generation failed' });
            }
        }
        res.end();
    });
});

module.exports = router;
