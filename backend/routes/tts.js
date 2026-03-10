/**
 * TTS Routes
 *
 * Text-to-speech endpoints that convert text into streamed MP3 audio.
 * Audio generation follows a two-tier fallback strategy:
 *
 *  1. Primary  – Spawns a Python child process running tts_gen.py (uses gTTS).
 *               Text is passed via stdin to avoid OS argv length limits.
 *  2. Fallback – If Python / gTTS is unavailable, or the Python process exits
 *               with a non-zero code before any audio is written, the Node.js
 *               `google-tts-api` package constructs a Google Translate TTS URL
 *               and streams the response directly to the client.
 *
 * The fallback can be disabled by setting TTS_DISABLE_GOOGLE_FALLBACK=true.
 * Debug logging is enabled by setting TTS_DEBUG=true (or 1 / yes).
 *
 * Base path: /api/tts
 *
 * Routes:
 *   GET  /api/tts/health  — Health-check: verifies Python + gTTS are available
 *   POST /api/tts/speak   — Generate and stream MP3 audio for the given text
 */

const express = require('express');
const router = express.Router();

// child_process.spawn – used to launch the Python TTS script as a subprocess
const { spawn } = require('child_process');
// path / fs – resolve the tts_gen.py script path and check for a venv Python binary
const path = require('path');
const fs = require('fs');
// http / https – used by streamUrlToResponse and probeUrlOk to proxy Google TTS audio
const http = require('http');
const https = require('https');
// google-tts-api – Node.js fallback: builds a public Google Translate TTS URL
const googleTTS = require('google-tts-api');

// ─── Environment helpers ──────────────────────────────────────────────────────

/**
 * isTtsDebugEnabled
 * Returns true when TTS_DEBUG is set to '1', 'true', or 'yes'.
 * When enabled, detailed Python stderr and upstream error messages are
 * included in error responses instead of generic user-facing strings.
 *
 * @returns {boolean}
 */
const isTtsDebugEnabled = () => {
    const raw = String(process.env.TTS_DEBUG || '').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
};

/**
 * getPythonExecutableCandidates
 * Builds an ordered list of Python executable paths to try when spawning
 * the TTS child process. Order of preference:
 *  1. PYTHON_EXECUTABLE env var (explicit override)
 *  2. .venv/bin/python in the repo root (virtualenv with gTTS pre-installed)
 *  3. 'python3' system binary
 *  4. 'python'  system binary
 * Duplicates are removed with Set so the list stays minimal.
 *
 * @returns {string[]} Ordered array of candidate executable paths/names.
 */
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

// ─── Python probe helper ──────────────────────────────────────────────────────

/**
 * runPythonProbe
 * Tries each candidate Python executable in order with the supplied args,
 * stopping at the first one that exits with code 0.
 * Used by the /health endpoint to verify Python + gTTS availability.
 *
 * @param {string[]} pythonCandidates - Ordered list of Python executable paths.
 * @param {string[]} probeArgs        - Arguments to pass to each candidate.
 * @returns {Promise<{ok:boolean, pythonExe:string|null, stdout:string, stderr:string, code:number|null, error?:string}>}
 */
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

    // All candidates exhausted without success
    return { ok: false, pythonExe: null, stdout: '', stderr: '', code: null, error: 'No working python executable found' };
};

// ─── Language / speed helpers ─────────────────────────────────────────────────

/**
 * resolveLangForGoogleTts
 * Maps a raw language tag (e.g. 'tamil', 'ta-IN', 'hi', 'english') to the
 * two-letter BCP-47 code that the Google Translate TTS API accepts.
 * Falls back to 'en' for any unrecognised value.
 *
 * @param {*} value - Raw language value from req.body.lang or req.body.language.
 * @returns {'en'|'ta'|'hi'} BCP-47 language code.
 */
const resolveLangForGoogleTts = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'en';
    if (raw.startsWith('ta')) return 'ta';
    if (raw.startsWith('hi')) return 'hi';
    if (raw.startsWith('en')) return 'en';
    return 'en';
};

/**
 * isSlowFromSpeed
 * Returns true when the numeric speed value is below 0.8, indicating the
 * learner wants slow/easy-to-understand playback (EPIC 3.1.4).
 * Handles undefined, null, and non-numeric values gracefully.
 *
 * @param {*} speed - Speed value from req.body.speed (string or number).
 * @returns {boolean}
 */
const isSlowFromSpeed = (speed) => {
    if (speed === undefined || speed === null) return false;
    const num = Number(speed);
    if (!Number.isFinite(num)) return false;
    return num < 0.8;
};

/**
 * isGoogleFallbackEnabled
 * Returns true when the Node.js Google TTS fallback is permitted.
 * Always returns false in the 'test' environment to keep unit tests
 * deterministic and network-free.
 * Set TTS_DISABLE_GOOGLE_FALLBACK=true to disable in other environments.
 *
 * @returns {boolean}
 */
const isGoogleFallbackEnabled = () => {
    // Keep unit tests deterministic.
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'test') return false;

    const raw = String(process.env.TTS_DISABLE_GOOGLE_FALLBACK || '').trim().toLowerCase();
    return !(raw === '1' || raw === 'true' || raw === 'yes');
};

// ─── HTTP streaming helpers ───────────────────────────────────────────────────

/**
 * streamUrlToResponse
 * Fetches an audio URL and pipes the response body directly to the Express
 * `res` object, forwarding Content-Type and Content-Length headers.
 * Follows HTTP redirects up to `redirectBudget` hops (default 3).
 * Sets Cache-Control: no-store to prevent browsers caching transient URLs.
 *
 * @param {string} url           - The upstream audio URL to fetch.
 * @param {import('express').Response} res - Express response to pipe into.
 * @param {number} [redirectBudget=3]      - Max redirect hops to follow.
 * @returns {Promise<void>} Resolves when the upstream body has fully piped.
 */
const streamUrlToResponse = (url, res, redirectBudget = 3) => {
    return new Promise((resolve, reject) => {
        let parsed;
        try {
            parsed = new URL(url);
        } catch (e) {
            reject(new Error('Invalid upstream URL'));
            return;
        }

        // Select the correct Node.js client module based on the URL scheme
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

                // Follow redirects recursively, decrementing the budget each hop
                if ([301, 302, 303, 307, 308].includes(status) && location && redirectBudget > 0) {
                    upstream.resume();
                    const nextUrl = location.startsWith('http') ? location : new URL(location, url).toString();
                    streamUrlToResponse(nextUrl, res, redirectBudget - 1).then(resolve).catch(reject);
                    return;
                }

                // Non-2xx responses without a redirect header are treated as failures
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

                // Forward audio headers to the client only once (guard against re-entrant calls)
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

/**
 * probeUrlOk
 * Makes a lightweight GET request to `url` and resolves with
 * `{ ok: true, status }` when the server returns a 2xx status code.
 * Used by the /health endpoint to verify that the Google TTS URL is
 * reachable from the current runtime environment.
 * Follows redirects up to `redirectBudget` hops (default 3).
 * The upstream response body is discarded (resume()) to avoid memory leaks.
 *
 * @param {string} url                - URL to probe.
 * @param {number} [redirectBudget=3] - Max redirect hops to follow.
 * @returns {Promise<{ok:boolean, status:number|null, error?:string}>}
 */
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

                // Follow redirects recursively within the allowed budget
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

/**
 * streamGoogleTts
 * Node.js-based TTS fallback: obtains a Google Translate TTS audio URL via
 * the `google-tts-api` package and proxies it to the client using
 * streamUrlToResponse. Used when Python / gTTS is unavailable.
 *
 * @param {object} params
 * @param {import('express').Response} params.res  - Express response to stream into.
 * @param {string} params.text  - Text to synthesise.
 * @param {string} params.lang  - BCP-47 language code (e.g. 'en', 'ta', 'hi').
 * @param {boolean} params.slow - Whether to request slow-pace audio.
 * @returns {Promise<void>}
 */
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

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/tts/health
 *
 * Diagnostic endpoint that verifies whether the Python TTS stack is functional.
 * Probes each candidate Python executable with `import sys; import gtts` and
 * returns version information for both Python and gTTS.
 *
 * Optional query params:
 *   probeGoogle=1  – Also perform a live reachability probe of a Google TTS URL
 *                    and include the result in the response.
 *
 * Response when healthy:
 *   { ok: true, tts: 'available', pythonExe, pythonVersion, gttsVersion, googleFallback? }
 *
 * Response when unhealthy:
 *   { ok: false, tts: 'unavailable', pythonCandidates, error, note, googleFallback? }
 *   The `error` field is a user-friendly hint unless TTS_DEBUG is enabled, in
 *   which case the raw probe output is returned instead.
 */
router.get('/health', async (req, res) => {
    try {
        const pythonCandidates = getPythonExecutableCandidates();

        // Run a short inline Python script that imports gtts and prints versions.
        // If this exits with code 0, Python + gTTS are both functional.
        const probe = await runPythonProbe(pythonCandidates, ['-c', 'import sys; import gtts; print(sys.version); print(getattr(gtts, "__version__", "unknown"))']);

        // Optional: probe whether a Google TTS URL is reachable from this host
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
            // Classify the failure to produce a helpful hint for operators
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
                // Expose raw error only when debug mode is on; otherwise show the hint
                error: isTtsDebugEnabled() ? (probe.error || probe.stderr || 'probe failed') : hint,
                note: 'If python is unavailable in production, /api/tts/speak will try a Node.js fallback TTS.'
            });
        }

        // Parse the two-line stdout: line 1 = Python version, line 2 = gTTS version
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

/**
 * POST /api/tts/speak
 *
 * Synthesises the supplied text and streams MP3 audio back to the client.
 *
 * EPIC 3.1.2 / 3.5.3 – Consistent audio quality via server-side TTS.
 * EPIC 3.1.4          – Slow/easy playback via the `speed` parameter (< 0.8).
 * EPIC 3.1.3 / 3.5.1–3.5.2 – Stateless endpoint enables unlimited replay.
 *
 * Body:
 *   text     {string}          – Required. Text to convert to speech.
 *   speed    {number|string}   – Optional. Playback speed; values < 0.8 trigger
 *                                slow mode. Defaults to '1.0'.
 *   lang     {string}          – Optional. BCP-47 language tag (e.g. 'en', 'ta-IN').
 *   language {string}          – Optional. Fallback language field when `lang` is absent.
 *
 * Response:
 *   200  audio/mpeg stream
 *   400  { message: 'Text is required' }
 *   500  { message: 'TTS generation failed', details? }
 *   503  { message: 'TTS service unavailable', details? }
 */
router.post('/speak', (req, res) => {
    const { text, speed, lang, language } = req.body;

    if (!text) {
        return res.status(400).json({ message: 'Text is required' });
    }

    // Absolute path to the Python TTS script
    const scriptPath = path.join(__dirname, '../python_services/tts_gen.py');

    const pythonCandidates = getPythonExecutableCandidates();

    // Normalise language: prefer `lang`, fall back to `language`, then default to 'en'
    const resolvedLang = (typeof lang === 'string' && lang.trim())
        ? lang.trim()
        : (typeof language === 'string' && language.trim())
            ? language.trim()
            : 'en';

    // Determine slow-mode flag and the two-letter Google TTS language code
    const slowMode = isSlowFromSpeed(speed || '1.0');
    const resolvedLangForGoogle = resolveLangForGoogleTts(resolvedLang);

    // Track whether any audio bytes have been written so we can decide whether
    // to attempt the Google fallback on non-zero Python exit
    let sentAudio = false;
    let stderrText = '';
    let pythonProcess;

    /**
     * startPython
     * Spawns the given Python executable and wires up stdout/stderr/error/close
     * handlers. On ENOENT, automatically retries with the next candidate.
     * Falls back to streamGoogleTts when no Python is found or the process fails
     * before writing any audio.
     *
     * @param {string}   pythonExe          - The Python executable to try.
     * @param {string[]} remainingCandidates - Remaining candidates to try on failure.
     */
    const startPython = (pythonExe, remainingCandidates) => {
        // Pass text via stdin to avoid OS argv length limits and quoting issues.
        pythonProcess = spawn(pythonExe, [scriptPath, '--stdin', speed || '1.0', resolvedLang], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        try {
            pythonProcess.stdin.write(String(text));
            pythonProcess.stdin.end();
        } catch {
            // stdin.write can throw if the process already exited; ignore safely
        }

        // Stream audio bytes from Python stdout directly to the HTTP response
        pythonProcess.stdout.on('data', (chunk) => {
            if (!sentAudio) {
                sentAudio = true;
                if (!res.headersSent) res.setHeader('Content-Type', 'audio/mpeg');
            }
            res.write(chunk);
        });

        // Collect stderr for error reporting (only shown when TTS_DEBUG is enabled)
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

            // No python found at all: fall back to Node-based Google TTS.
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
                    // Python exists but failed (e.g. missing gTTS, network error):
                    // attempt the Google URL fallback before giving up entirely.
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

                    // Fallback disabled: return error with optional debug details
                    const payload = { message: 'TTS generation failed' };
                    if (isTtsDebugEnabled() && stderrText.trim()) {
                        payload.details = stderrText.trim().slice(0, 1000);
                    }
                    return res.status(500).json(payload);
                }
            }
            // Audio was fully written (or code === 0); finalise the response
            res.end();
        });
    };

    // Kick off with the highest-priority candidate; pass the rest for fallback chaining
    const [firstCandidate, ...restCandidates] = pythonCandidates;
    startPython(firstCandidate, restCandidates);
});

module.exports = router;
