const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
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

const isGoogleFallbackEnabled = () => {
    // Keep unit tests deterministic.
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'test') return false;

    const raw = String(process.env.TTS_DISABLE_GOOGLE_FALLBACK || '').trim().toLowerCase();
    return !(raw === '1' || raw === 'true' || raw === 'yes');
};

const streamUrlToResponse = (url, res, redirectBudget = 3) => {
    return new Promise((resolve, reject) => {
        let parsed;
        try {
            parsed = new URL(url);
        } catch (e) {
            reject(new Error('Invalid upstream URL'));
            return;
        }

        const client = parsed.protocol === 'http:' ? http : https;
        const req = client.request(
            {
                protocol: parsed.protocol,
                hostname: parsed.hostname,
                port: parsed.port,
                path: `${parsed.pathname}${parsed.search}`,
                method: 'GET',
                headers: {
                    // Some hosts behave better when a UA is present.
                    'User-Agent': 'accessible-language-learning-platform/1.0',
                    'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
                },
            },
            (upstream) => {
                const status = upstream.statusCode || 0;
                const location = upstream.headers.location;

                if ([301, 302, 303, 307, 308].includes(status) && location && redirectBudget > 0) {
                    upstream.resume();
                    const nextUrl = location.startsWith('http') ? location : new URL(location, url).toString();
                    streamUrlToResponse(nextUrl, res, redirectBudget - 1).then(resolve).catch(reject);
                    return;
                }

                if (status < 200 || status >= 300) {
                    let body = '';
                    upstream.on('data', (d) => {
                        if (body.length < 2000) body += d.toString();
                    });
                    upstream.on('end', () => {
                        reject(new Error(`Upstream TTS failed: ${status}${body ? ` - ${body.slice(0, 2000)}` : ''}`));
                    });
                    return;
                }

                if (!res.headersSent) {
                    res.setHeader('Content-Type', 'audio/mpeg');
                    const len = upstream.headers['content-length'];
                    if (len) res.setHeader('Content-Length', len);
                    res.setHeader('Cache-Control', 'no-store');
                }

                upstream.on('error', reject);
                upstream.on('end', resolve);
                upstream.pipe(res);
            }
        );

        req.on('error', reject);
        req.end();
    });
};

const probeUrlOk = (url, redirectBudget = 3) => {
    return new Promise((resolve) => {
        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            resolve({ ok: false, status: null, error: 'Invalid URL' });
            return;
        }

        const client = parsed.protocol === 'http:' ? http : https;
        const req = client.request(
            {
                protocol: parsed.protocol,
                hostname: parsed.hostname,
                port: parsed.port,
                path: `${parsed.pathname}${parsed.search}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'accessible-language-learning-platform/1.0',
                    'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
                },
            },
            (upstream) => {
                const status = upstream.statusCode || 0;
                const location = upstream.headers.location;

                if ([301, 302, 303, 307, 308].includes(status) && location && redirectBudget > 0) {
                    upstream.resume();
                    const nextUrl = location.startsWith('http') ? location : new URL(location, url).toString();
                    probeUrlOk(nextUrl, redirectBudget - 1).then(resolve);
                    return;
                }

                // We don't need the whole body; just confirm reachability.
                upstream.resume();
                resolve({ ok: status >= 200 && status < 300, status });
            }
        );

        req.on('error', (err) => resolve({ ok: false, status: null, error: err?.message ? err.message : String(err) }));
        req.end();
    });
};

const streamGoogleTts = async ({ res, text, lang, slow }) => {
    // google-tts-api returns a public Google Translate TTS URL.
    // This is a pragmatic fallback when Python isn't available in the host.
    const url = googleTTS.getAudioUrl(text, {
        lang,
        slow,
        host: 'https://translate.google.com'
    });

    await streamUrlToResponse(url, res);
};

router.get('/health', async (req, res) => {
    try {
        const pythonCandidates = getPythonExecutableCandidates();
        const probe = await runPythonProbe(pythonCandidates, ['-c', 'import sys; import gtts; print(sys.version); print(getattr(gtts, "__version__", "unknown"))']);

        const wantsGoogleProbe = String(req.query.probeGoogle || '').trim() === '1';
        let googleProbe = null;
        if (wantsGoogleProbe) {
            try {
                const url = googleTTS.getAudioUrl('health check', {
                    lang: 'en',
                    slow: false,
                    host: 'https://translate.google.com'
                });
                googleProbe = await probeUrlOk(url);
            } catch (e) {
                googleProbe = { ok: false, status: null, error: e?.message ? e.message : String(e) };
            }
        }

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
                googleFallback: wantsGoogleProbe ? googleProbe : undefined,
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
            gttsVersion: gttsVersionLine || null,
            googleFallback: wantsGoogleProbe ? googleProbe : undefined
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
        // Pass text via stdin to avoid OS argv length limits and quoting issues.
        pythonProcess = spawn(pythonExe, [scriptPath, '--stdin', speed || '1.0', resolvedLang], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        try {
            pythonProcess.stdin.write(String(text));
            pythonProcess.stdin.end();
        } catch {
            // ignore
        }

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

            const noPythonFound = err && err.code === 'ENOENT' && remainingCandidates.length === 0;

            // No python found at all: fall back to Node-based TTS.
            if (noPythonFound && isGoogleFallbackEnabled()) {
                return streamGoogleTts({ res, text, lang: resolvedLangForGoogle, slow: slowMode })
                    .catch((e) => {
                        console.error('Google TTS fallback failed:', e);
                        if (!res.headersSent) {
                            const payload = { message: 'TTS service unavailable' };
                            if (isTtsDebugEnabled()) payload.details = String(e && e.message ? e.message : e).slice(0, 1000);
                            return res.status(503).json(payload);
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
                    // If python exists but fails (missing gTTS, network, etc), try the Google URL fallback.
                    if (isGoogleFallbackEnabled()) {
                        return streamGoogleTts({ res, text, lang: resolvedLangForGoogle, slow: slowMode })
                            .catch((e) => {
                                console.error('Google TTS fallback after python failure failed:', e);
                                const payload = { message: 'TTS generation failed' };
                                if (isTtsDebugEnabled()) {
                                    payload.details = {
                                        pythonStderr: stderrText.trim().slice(0, 1000) || undefined,
                                        googleFallback: String(e && e.message ? e.message : e).slice(0, 1000),
                                    };
                                }
                                return res.status(500).json(payload);
                            });
                    }

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
