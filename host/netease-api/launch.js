// Minimal launcher for NeteaseCloudMusicApi.
// Skips the version check (which shells out to npm), registers the anonymous
// token in the background, and adds a /karaoke endpoint that pre-generates
// an instrumental (vocal-removed) track using Demucs, cached by song id.
const path = require('path')
const fs = require('fs')
const os = require('os')
const http = require('http')
const https = require('https')
const { spawn } = require('child_process')

const ncm = path.join(__dirname, 'node_modules', 'NeteaseCloudMusicApi')
const { generateRandomChineseIP, cookieToJson } = require(path.join(ncm, 'util', 'index'))
const { serveNcmApi } = require(path.join(ncm, 'server'))
const { register_anonimous } = require(path.join(ncm, 'main'))

const CACHE_DIR = path.join(__dirname, 'karaoke-cache')
const SEPARATE_SCRIPT = path.join(__dirname, 'separate.py')
const PYTHON = process.env.DSH_PYTHON
  || 'C:/Users/Administrator/AppData/Roaming/kimi-desktop/daimon-share/daimon/runtime/python/.venv/Scripts/python.exe'

// Some request modules fall back to this when the client IP looks loopback.
global.cnIp = generateRandomChineseIP()

// Optional anonymous token (improves non-login song URLs). Non-blocking.
Promise.race([
  register_anonimous(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('anon timeout')), 10000)),
])
  .then((res) => {
    const cookie = res && res.body && res.body.cookie
    if (cookie) {
      const obj = cookieToJson(cookie)
      if (obj.MUSIC_A) {
        fs.writeFileSync(path.join(os.tmpdir(), 'anonymous_token'), obj.MUSIC_A, 'utf-8')
        console.log('[launch] anonymous token ready')
      }
    }
  })
  .catch((err) => {
    console.log('[launch] anonymous token skipped:', err && err.message)
  })

function getSongUrl(id, cookie) {
  return new Promise((resolve, reject) => {
    let url = 'http://127.0.0.1:3000/song/url/v1?id=' + encodeURIComponent(id) + '&level=exhigh'
    if (cookie) url += '&cookie=' + encodeURIComponent(cookie)
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        try {
          const j = JSON.parse(data)
          resolve(j.data && j.data[0] && j.data[0].url)
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('song url timeout')) })
  })
}

function download(url, dest, redirects) {
  redirects = redirects || 0
  return new Promise((resolve, reject) => {
    const mod = String(url).startsWith('https') ? https : http
    const req = mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        if (redirects > 5) return reject(new Error('too many redirects'))
        return download(res.headers.location, dest, redirects + 1).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)) }
      const file = fs.createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
      file.on('error', (e) => { file.close(); reject(e) })
    })
    req.on('error', reject)
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('download timeout')) })
  })
}

function runSeparation(input, cacheDir) {
  return new Promise((resolve, reject) => {
    const wavPath = path.join(cacheDir, 'no_vocals.wav')
    const child = spawn(PYTHON, [SEPARATE_SCRIPT, input, cacheDir], { windowsHide: true })
    let out = ''
    let settled = false
    child.stdout.on('data', (c) => { out += c })
    child.stderr.on('data', () => {})
    child.on('error', (e) => { if (!settled) { settled = true; reject(e) } })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      if (code === 0) return resolve(out.trim().split(/\r?\n/).pop())
      if (fs.existsSync(wavPath)) return resolve(wavPath)
      reject(new Error('demucs exited ' + code))
    })
    // Fallback: demucs/torch can hang on exit (non-daemon threads). Treat the
    // presence of the produced wav as success and stop waiting.
    const poll = setInterval(() => {
      if (settled) { clearInterval(poll); return }
      if (fs.existsSync(wavPath)) {
        settled = true
        clearInterval(poll)
        resolve(wavPath)
      }
    }, 1500)
  })
}

// ---- karaoke batch queue (offline playlist pre-processing) ----
const batch = { queue: [], done: [], total: 0, current: null, running: false, cookie: '' }

async function processOne(id, cookie) {
  const dir = path.join(CACHE_DIR, String(id))
  const wav = path.join(dir, 'no_vocals.wav')
  if (fs.existsSync(wav)) return true
  fs.mkdirSync(dir, { recursive: true })
  const url = await getSongUrl(id, cookie)
  if (!url) throw new Error('no playable url')
  const mp3 = path.join(dir, 'song.mp3')
  if (!fs.existsSync(mp3)) await download(url, mp3)
  await runSeparation(mp3, dir)
  return fs.existsSync(wav)
}

async function processBatch() {
  if (batch.running) return
  batch.running = true
  while (batch.queue.length > 0) {
    const id = batch.queue.shift()
    batch.current = id
    try {
      await processOne(id, batch.cookie)
      batch.done.push(String(id))
    } catch (e) {
      console.error('[karaoke] batch item failed:', id, e && e.message)
    }
    batch.current = null
  }
  batch.running = false
}

serveNcmApi({ checkVersion: false, port: 3000 })
  .then((app) => {
    app.get('/karaoke/prepare', async (req, res) => {
      const id = req.query.id
      const cookie = req.query.cookie || ''
      if (!id) return res.status(400).json({ ok: false, error: 'missing id' })
      const dir = path.join(CACHE_DIR, String(id))
      const wav = path.join(dir, 'no_vocals.wav')
      try {
        if (!fs.existsSync(wav)) {
          fs.mkdirSync(dir, { recursive: true })
          const url = await getSongUrl(id, cookie)
          if (!url) return res.status(404).json({ ok: false, error: 'no playable url' })
          const mp3 = path.join(dir, 'song.mp3')
          if (!fs.existsSync(mp3)) await download(url, mp3)
          const produced = await runSeparation(mp3, dir)
          if (!produced || !fs.existsSync(wav)) {
            return res.status(500).json({ ok: false, error: 'separation produced no output' })
          }
        }
        res.json({ ok: true, url: '/karaoke/file/' + id + '.wav' })
      } catch (e) {
        console.error('[karaoke] prepare failed:', e && e.message)
        res.status(500).json({ ok: false, error: (e && e.message) || 'separation failed' })
      }
    })

    app.get('/karaoke/file/:name', (req, res) => {
      const id = path.basename(req.params.name, '.wav')
      const wav = path.join(CACHE_DIR, id, 'no_vocals.wav')
      if (!fs.existsSync(wav)) return res.status(404).json({ error: 'not found' })
      const stat = fs.statSync(wav)
      const fileSize = stat.size
      const range = req.headers.range
      res.setHeader('Content-Type', 'audio/wav')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Accept-Ranges', 'bytes')
      if (range) {
        const parts = String(range).replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10) || 0
        const end = parts[1] ? (parseInt(parts[1], 10) || (fileSize - 1)) : (fileSize - 1)
        const chunkSize = end - start + 1
        res.status(206)
        res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + fileSize)
        res.setHeader('Content-Length', chunkSize)
        fs.createReadStream(wav, { start: start, end: end }).pipe(res)
      } else {
        res.setHeader('Content-Length', fileSize)
        fs.createReadStream(wav).pipe(res)
      }
    })

    app.post('/karaoke/batch/start', (req, res) => {
      const ids = (req.body && req.body.ids) || []
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ ok: false, error: 'no ids' })
      if (req.body && req.body.cookie) batch.cookie = req.body.cookie
      const seen = new Set(batch.queue.concat(batch.done))
      let added = 0
      for (const id of ids) {
        const key = String(id)
        if (seen.has(key)) continue
        seen.add(key)
        batch.queue.push(key)
        added++
      }
      batch.total += added
      if (added) processBatch()
      res.json({ ok: true, queued: added })
    })

    app.get('/karaoke/batch/status', (req, res) => {
      res.json({
        total: batch.total,
        done: batch.done.length,
        remaining: batch.queue.length,
        current: batch.current,
        running: batch.running,
      })
    })

    app.get('/karaoke/check', (req, res) => {
      const ids = String(req.query.ids || '').split(',').filter(Boolean)
      const cached = []
      for (const id of ids) {
        if (fs.existsSync(path.join(CACHE_DIR, id, 'no_vocals.wav'))) cached.push(id)
      }
      res.json({ cached: cached })
    })

    console.log('[launch] NeteaseCloudMusicApi listening on :3000 (karaoke enabled)')
  })
  .catch((err) => {
    console.error('[launch] failed to start:', err && err.message)
  })
