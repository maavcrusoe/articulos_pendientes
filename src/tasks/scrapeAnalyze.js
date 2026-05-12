const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { load } = require('cheerio');
const { getCollection, getLinksCollection } = require('../db');
const { createTaskLogger } = require('../logger');

const CONFIG_PATH = path.join(__dirname, '../../prompt/config.json');
const FETCH_TIMEOUT_MS = 20000;
const LLM_TIMEOUT_MS = 180000;
const YTDLP_TIMEOUT_MS = 60000;
const WHISPER_TIMEOUT_MS = 600000;

// Minimum metadata text length to skip audio transcription
const METADATA_TEXT_MIN = 150;

// Dedicated Twitter/X handling: fetch server-side meta tags and pass tweet text to the LLM.
const TWITTER_RE = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.*\/status/i;

// Detect video platform URLs (TikTok, YouTube Shorts, Instagram Reels, Vimeo, LinkedIn video, etc.)
const VIDEO_PLATFORM_RE = /^https?:\/\/(www\.|vm\.|vt\.)?(tiktok\.com|youtube\.com\/shorts\/|youtu\.be\/|instagram\.com\/(reel|p|tv)\/|vimeo\.com\/|linkedin\.com\/.*\/video\/|fb\.watch|facebook\.com\/.*\/video)/i;

// ── Config ──────────────────────────────────────────────────────────────────

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
            const cfg = JSON.parse(raw);
            if (cfg.model && cfg.prompt) return cfg;
        }
    } catch (e) { /* fall through to default */ }
    return {
        model: 'llama3.2',
        prompt: 'Analiza el siguiente contenido y devuelve ÚNICAMENTE un JSON válido con esta estructura:\n{"tags":["tag1","tag2","tag3"]}\nLos tags deben ser en minúsculas, en inglés o español, técnicos y concisos (3-6 tags máximo).\nContenido:\n',
    };
}

// ── Content extraction ───────────────────────────────────────────────────────

async function fetchWithTimeout(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { signal: controller.signal, ...opts });
    } finally {
        clearTimeout(timer);
    }
}

async function extractTwitterContent(url) {
    const response = await fetchWithTimeout(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Twitterbot/1.0)',
            'Accept': 'text/html',
        },
        redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const $ = load(html);

    const og = {
        title: $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || '',
        description: $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content') || '',
        site: $('meta[property="og:site_name"]').attr('content') || 'X / Twitter',
    };

    return [og.site, og.title, og.description]
        .filter(Boolean)
        .join(' — ')
        .trim()
        .slice(0, 3000);
}

// ── Video platform extraction (yt-dlp + optional Whisper) ───────────────────

function spawnWithTimeout(cmd, args, timeoutMs) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        const proc = spawn(cmd, args);
        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error(`Proceso ${cmd} superó el límite de ${timeoutMs / 1000}s`));
        }, timeoutMs);
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) return reject(new Error(`${cmd} salió con código ${code}: ${stderr.slice(0, 300)}`));
            resolve({ stdout, stderr });
        });
        proc.on('error', (err) => {
            clearTimeout(timer);
            reject(new Error(`No se pudo ejecutar ${cmd}: ${err.message}. ¿Está instalado?`));
        });
    });
}

function buildTextFromYtDlpMeta(meta) {
    const parts = [
        meta.title || '',
        meta.description || '',
        meta.uploader || meta.channel || '',
        Array.isArray(meta.tags) ? meta.tags.join(', ') : (meta.tags || ''),
        Array.isArray(meta.categories) ? meta.categories.join(', ') : '',
    ];
    const combined = parts.filter(Boolean).join('\n');
    // Extract explicit hashtags that might be embedded in the text
    const hashtags = (combined.match(/#\w+/g) || []).join(' ');
    return [combined, hashtags].filter(Boolean).join('\n').replace(/\s+/g, ' ').trim().slice(0, 6000);
}

async function extractVideoMetadata(url, log) {
    const ytDlp = process.env.YTDLP_PATH || 'yt-dlp';
    log.detail(`Ejecutando yt-dlp --dump-json para: ${url}`);
    const { stdout } = await spawnWithTimeout(
        ytDlp,
        ['--dump-json', '--no-playlist', url],
        YTDLP_TIMEOUT_MS
    );
    const meta = JSON.parse(stdout.trim());
    const text = buildTextFromYtDlpMeta(meta);
    log.detail(`Metadata obtenida de yt-dlp (${text.length} chars): ${text.slice(0, 200)}`);
    return { meta, text };
}

async function transcribeAudio(url, log) {
    // nodejs-whisper is optional — if not installed, throw so caller can fallback
    let nodewhisper;
    try {
        nodewhisper = require('nodejs-whisper').nodewhisper;
    } catch (_) {
        throw new Error('nodejs-whisper no instalado. Ejecuta: npm install nodejs-whisper');
    }

    const ytDlp = process.env.YTDLP_PATH || 'yt-dlp';
    const whisperModel = process.env.WHISPER_MODEL || 'base';
    const tmpBase = path.join(os.tmpdir(), `scrape_audio_${Date.now()}`);
    const audioFile = `${tmpBase}.mp3`;

    log.detail(`Descargando audio con yt-dlp (modelo Whisper: ${whisperModel})...`);
    await spawnWithTimeout(
        ytDlp,
        ['-x', '--audio-format', 'mp3', '--audio-quality', '5', '--no-playlist', '-o', `${tmpBase}.%(ext)s`, url],
        YTDLP_TIMEOUT_MS * 2
    );

    if (!fs.existsSync(audioFile)) {
        throw new Error(`yt-dlp no generó el fichero de audio esperado: ${audioFile}`);
    }

    try {
        log.detail(`Transcribiendo con Whisper modelo "${whisperModel}"...`);
        const transcript = await nodewhisper(audioFile, {
            modelName: whisperModel,
            autoDownloadModelName: whisperModel,
            removeWavFileAfterTranscription: true,
            withCuda: false,
            whisperOptions: {
                outputInText: true,
                outputInVtt: false,
                outputInSrt: false,
                outputInCsv: false,
                translateToEnglish: false,
                wordTimestamps: false,
            },
        });
        const text = typeof transcript === 'string' ? transcript : JSON.stringify(transcript);
        log.detail(`Transcripción obtenida (${text.length} chars): ${text.slice(0, 200)}`);
        return text;
    } finally {
        try { fs.unlinkSync(audioFile); } catch (_) { /* ignore */ }
    }
}

/**
 * Two-tier video extraction:
 *  Tier 1 — yt-dlp metadata (no download). Fast, usually enough.
 *  Tier 2 — yt-dlp audio download + Whisper transcription (if Tier 1 text is sparse).
 */
async function extractVideoContent(url, log) {
    // Tier 1: metadata
    let metaText = '';
    let metaTitle = '';
    try {
        const { meta, text } = await extractVideoMetadata(url, log);
        metaText = text;
        metaTitle = meta.title || '';
    } catch (err) {
        log.warn(`yt-dlp metadata falló: ${err.message}`);
    }

    if (metaText.length >= METADATA_TEXT_MIN) {
        log.detail(`Tier 1 suficiente (${metaText.length} chars) — omitiendo transcripción`);
        return metaText;
    }

    log.detail(`Tier 1 escaso (${metaText.length} chars) — intentando transcripción de audio (Tier 2)...`);

    // Tier 2: audio transcription
    try {
        const transcript = await transcribeAudio(url, log);
        const combined = [metaTitle, metaText, transcript].filter(Boolean).join('\n\n').slice(0, 8000);
        return combined;
    } catch (err) {
        log.warn(`Transcripción de audio falló: ${err.message}`);
        return metaText || `URL: ${url}`;
    }
}

/**
 * Generic page scraping: prefers <article> > <main> > <body>.
 * Strips navigation, ads, scripts.
 */
async function extractPageContent(url) {
    const response = await fetchWithTimeout(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ArticulosBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = load(html);

    // Grab meta info first as fallback
    const metaTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const metaDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';

    $('script, style, nav, footer, header, aside, iframe, noscript, [role="navigation"], [role="banner"], [role="complementary"]').remove();

    const bodyText = ($('article').text() || $('main').text() || $('body').text())
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);

    const combined = [metaTitle, metaDesc, bodyText].filter(Boolean).join('\n\n');
    return combined.trim().slice(0, 6000);
}

async function scrapeUrl(url, log) {
    const isTwitter = TWITTER_RE.test(url);
    const isVideo = VIDEO_PLATFORM_RE.test(url);

    if (isTwitter) {
        log.detail('Tipo de URL: Twitter/X.com');
        const text = await extractTwitterContent(url);
        log.detail(`Contenido extraído de Twitter (${text.length} chars): ${text.slice(0, 200)}...`);
        return text;
    }

    log.detail(`Tipo de URL: ${isVideo ? 'plataforma de vídeo' : 'web genérica'}`);

    if (isVideo) {
        const text = await extractVideoContent(url, log);
        log.detail(`Contenido extraído de plataforma vídeo (${text.length} chars): ${text.slice(0, 200)}...`);
        return text;
    }

    const text = await extractPageContent(url);
    log.detail(`Contenido extraído (${text.length} chars): ${text.slice(0, 200)}...`);
    return text;
}

// ── LLM call ────────────────────────────────────────────────────────────────

function isTransientLLMError(err) {
    return err.message.includes('fetch failed')
        || err.message.includes('ECONNREFUSED')
        || err.message.includes('ENOTFOUND')
        || err.message.includes('ETIMEDOUT')
        || err.name === 'AbortError';
}

async function callLLM(model, systemPrompt, content, log) {
    const llmUrl = process.env.LLM_API_URL || 'http://192.168.100.6:11434/api/chat';
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000;
    let lastErr;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
        try {
            if (attempt === 1) {
                log.detail(`Llamando LLM — modelo: ${model} | url: ${llmUrl}`);
            } else {
                log.detail(`LLM reintento ${attempt}/${MAX_RETRIES} — modelo: ${model} | url: ${llmUrl}`);
            }
            const response = await fetch(llmUrl, {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: systemPrompt + content }],
                    stream: false,
                }),
            });
            if (!response.ok) {
                const body = await response.text();
                throw new Error(`LLM HTTP ${response.status}: ${body.slice(0, 300)}`);
            }
            const data = await response.json();
            const raw = data?.message?.content || data?.choices?.[0]?.message?.content || '';
            log.detail(`Respuesta LLM (${raw.length} chars): ${raw.slice(0, 500)}`);
            return raw;
        } catch (err) {
            lastErr = err;
            if (isTransientLLMError(err) && attempt < MAX_RETRIES) {
                log.warn(`LLM intento ${attempt}/${MAX_RETRIES} falló (${err.message}) — reintentando en ${RETRY_DELAY_MS / 1000}s...`);
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            } else {
                throw err;
            }
        } finally {
            clearTimeout(timer);
        }
    }
    throw lastErr;
}

// ── Tag parsing ──────────────────────────────────────────────────────────────

/**
 * Tries to parse tags from the LLM response.
 * Accepts: pure JSON, JSON embedded in markdown code blocks, or comma-separated text.
 */
function parseTags(llmResponse) {
    if (!llmResponse) return [];

    // Strip markdown code fences
    const cleaned = llmResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

    // Try parsing as JSON
    try {
        // Find the first {...} block
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            const tags = parsed.tags || parsed.Tags || parsed.etiquetas || [];
            if (Array.isArray(tags) && tags.length) {
                return tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 10);
            }
        }
    } catch (_) { /* not valid JSON, try heuristics */ }

    // Fallback: treat as comma/newline separated list
    const lines = cleaned.split(/[,\n]+/);
    return lines
        .map((l) => l.replace(/^[-*•\d.]+/, '').replace(/["\[\]{}]/g, '').trim().toLowerCase())
        .filter((l) => l.length > 1 && l.length < 40)
        .slice(0, 8);
}

// ── Main task ────────────────────────────────────────────────────────────────

async function runScrapeAnalyze() {
    const log = createTaskLogger('scrapeAnalyze');
    log.separator('INICIO TAREA — Scraping y análisis LLM');
    log.info('Iniciando tarea de scraping y etiquetado automático');

    const config = loadConfig();
    const { model, prompt } = config;

    log.info(`Modelo LLM: ${model}`);
    log.detail(`Prompt configurado: ${prompt.slice(0, 200)}...`);

    if (!model || !prompt) {
        const err = 'Configuración incompleta: falta model o prompt en prompt/config.json';
        log.error(err);
        throw new Error(err);
    }

    const col = getLinksCollection();

    // Target: saved/viewed links with no tags (or empty tags) and a sourceUrl, not yet processed
    const articles = await col
        .find({
            sourceUrl: { $exists: true, $ne: '' },
            $or: [
                { tags: { $exists: false } },
                { tags: { $size: 0 } },
            ],
            analysisError: { $exists: false },
        })
        .sort({ viewedAt: -1 })
        //.limit(10)
        .toArray();

    log.info(`Artículos sin etiquetas encontrados: ${articles.length}`);

    if (articles.length === 0) {
        log.info('No hay artículos pendientes sin etiquetas — tarea finalizada sin trabajo');
        log.separator('FIN TAREA');
        return { analyzed: 0, errors: 0, total: 0 };
    }

    let analyzed = 0;
    let errors = 0;

    for (const article of articles) {
        const id = article._id.toString();
        const title = article.title || 'Sin título';
        const url = article.sourceUrl || article.url || '';

        log.separator(`Artículo: ${title}`);
        log.info(`Procesando [${id}] — ${title}`);
        log.detail(`URL: ${url}`);
        log.detail(`Tags actuales: ${JSON.stringify(article.tags || [])}`);

        if (!url) {
            log.warn('Sin URL — omitiendo este item');
            errors++;
            continue;
        }

        try {
            // 1. Scrape content
            let content;
            try {
                content = await scrapeUrl(url, log);
            } catch (scrapeErr) {
                log.warn(`No se pudo obtener el contenido de la URL: ${scrapeErr.message}`);
                content = '';
            }

            if (!content || content.length < 50) {
                log.warn(`Contenido insuficiente (${content ? content.length : 0} chars) — usando título y URL como contexto`);
                content = `Título: ${title}\nURL: ${url}`;
            }

            // 2. Call LLM
            const llmRaw = await callLLM(model, prompt, content, log);

            // 3. Parse tags
            const suggestedTags = parseTags(llmRaw);
            log.info(`Tags sugeridos por LLM: ${JSON.stringify(suggestedTags)}`);

            if (!suggestedTags.length) {
                log.warn('El LLM no devolvió tags válidos — guardando respuesta raw para revisión');
                await col.updateOne(
                    { _id: article._id },
                    { $set: { analysisRaw: llmRaw, analyzedAt: new Date(), analysisModel: model } }
                );
                errors++;
                continue;
            }

            // 4. Merge with existing tags (avoid duplicates, case-insensitive)
            const existingLower = (article.tags || []).map((t) => t.toLowerCase());
            const newTags = suggestedTags.filter((t) => !existingLower.includes(t));
            const mergedTags = [...(article.tags || []), ...newTags];

            log.info(`Tags resultantes tras merge: ${JSON.stringify(mergedTags)}`);

            // 5. Update MongoDB
            await col.updateOne(
                { _id: article._id },
                {
                    $set: {
                        tags: mergedTags,
                        analysisRaw: llmRaw,
                        analyzedAt: new Date(),
                        analysisModel: model,
                    },
                }
            );

            log.info(`✅ Artículo actualizado con ${newTags.length} nuevas etiquetas`);
            analyzed++;
        } catch (err) {
            log.error(`Error procesando "${title}" (${url}): ${err.message}`);
            if (err.stack) log.detail(`Stack: ${err.stack}`);
            // Only persist analysisError for permanent failures.
            // Transient network errors should NOT block the article from future retries.
            if (!isTransientLLMError(err)) {
                try {
                    await col.updateOne(
                        { _id: article._id },
                        { $set: { analysisError: err.message, analyzedAt: new Date() } }
                    );
                } catch (_) { /* ignore update error */ }
            } else {
                log.warn('Error transitorio de red — artículo NO marcado como fallido (se reintentará en la próxima ejecución)');
            }
            errors++;
        }
    }

    log.separator('RESUMEN FINAL');
    log.info(`Tarea completada — Analizados: ${analyzed} | Errores: ${errors} | Total: ${articles.length}`);
    log.separator('FIN TAREA');

    return { analyzed, errors, total: articles.length };
}

module.exports = { runScrapeAnalyze };
