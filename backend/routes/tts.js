const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const googleTTS = require('google-tts-api');

const isTtsDebugEnabled = () => {
    const raw = String(process.env.TTS_DEBUG || '').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
};

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

const runPythonProbe = async (pythonCandidates, probeArgs) => {
    for (const pythonExe of pythonCandidates) {
        // eslint-disable-next-line no-await-in-loop
        const result = await new Promise((resolve) => {
            const child = spawn(pythonExe, probeArgs);
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (d) => { stdout += d.toString(); });
            child.stderr.on('data', (d) => { stderr += d.toString(); });
            child.on('error', (err) => {
                resolve({ ok: false, pythonExe, error: err && err.message ? err.message : String(err), stdout, stderr, code: null });
            });
            child.on('close', (code) => {
                resolve({ ok: code === 0, pythonExe, stdout, stderr, code });
            });
        });

        if (result.ok) return result;
    }

    return { ok: false, pythonExe: null, stdout: '', stderr: '', code: null, error: 'No working python executable found' };
};

const resolveLangForGoogleTts = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'en';
    if (raw.startsWith('ta')) return 'ta';
    if (raw.startsWith('hi')) return 'hi';
    if (raw.startsWith('en')) return 'en';
    return 'en';
};

const isSlowFromSpeed = (speed) => {
    if (speed === undefined || speed === null) return false;
    const num = Number(speed);
    if (!Number.isFinite(num)) return false;
    return num < 0.8;
};

const streamGoogleTts = async ({ res, text, lang, slow }) => {
    // google-tts-api returns a public Google Translate TTS URL.
    // This is a pragmatic fallback when Python isn't available in the host.
    const url = googleTTS.getAudioUrl(text, {
        lang,
        slow,
        host: 'https://translate.google.com'
    });

    const upstream = await fetch(url);
    if (!upstream.ok) {
        throw new Error(`Upstream TTS failed: ${upstream.status}`);
    }

    if (!res.headersSent) {
        res.setHeader('Content-Type', 'audio/mpeg');
        // Allow browsers to play/seek better.
        const len = upstream.headers.get('content-length');
        if (len) res.setHeader('Content-Length', len);
        res.setHeader('Cache-Control', 'no-store');
    }

    // Stream upstream response body to client.
    if (upstream.body) {
        // Node fetch gives a web ReadableStream; convert chunk-by-chunk.
        const reader = upstream.body.getReader();
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // eslint-disable-next-line no-await-in-loop
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
        }
        res.end();
        return;
    }

    // Fallback (shouldn't happen often): buffer then send.
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
};

router.get('/health', async (req, res) => {
    try {
        const pythonCandidates = getPythonExecutableCandidates();
        const probe = await runPythonProbe(pythonCandidates, ['-c', 'import sys; import gtts; print(sys.version); print(getattr(gtts, "__version__", "unknown"))']);

        if (!probe.ok) {
            const combined = `${probe.error || ''}\n${probe.stderr || ''}`.toLowerCase();
            const isPythonMissing = combined.includes('enoent') || combined.includes('not found') || combined.includes('no such file');
            const isGttsMissing = combined.includes('modulenotfounderror') || combined.includes("no module named 'gtts'") || combined.includes('no module named gtts');

            let hint = 'Enable TTS_DEBUG=true to see details.';
            if (isPythonMissing) hint = 'Python is not available in the runtime image.';
            else if (isGttsMissing) hint = 'Python is available but gTTS is not installed.';

            return res.status(500).json({
                ok: false,
                tts: 'unavailable',
                pythonCandidates,
                error: isTtsDebugEnabled() ? (probe.error || probe.stderr || 'probe failed') : hint,
                note: 'If python is unavailable in production, /api/tts/speak will try a Node.js fallback TTS.'
            });
        }

        const [pythonVersionLine, gttsVersionLine] = probe.stdout.trim().split(/\r?\n/);
        return res.json({
            ok: true,
            tts: 'available',
            pythonExe: probe.pythonExe,
            pythonVersion: pythonVersionLine || null,
            gttsVersion: gttsVersionLine || null
        });
    } catch (err) {
        return res.status(500).json({ ok: false, tts: 'unavailable' });
    }
});

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

    const slowMode = isSlowFromSpeed(speed || '1.0');
    const resolvedLangForGoogle = resolveLangForGoogleTts(resolvedLang);

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

            // No python found at all: fall back to Node-based TTS.
            if (err && err.code === 'ENOENT' && remainingCandidates.length === 0) {
                return streamGoogleTts({ res, text, lang: resolvedLangForGoogle, slow: slowMode })
                    .catch((e) => {
                        console.error('Google TTS fallback failed:', e);
                        if (!res.headersSent) {
                            return res.status(500).json({ message: 'TTS service unavailable' });
                        }
                        res.end();
                    });
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
                    if (isTtsDebugEnabled() && stderrText.trim()) {
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
