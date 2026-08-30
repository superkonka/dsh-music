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

function getSongUrl(id) {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:3000/song/url/v1?id=' + encodeURIComponent(id) + '&level=standard', (res) => {
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
    const child = spawn(PYTHON, [SEPARATE_SCRIPT, input, cacheDir], { windowsHide: true })
    let out = ''
    child.stdout.on('data', (c) => { out += c })
    child.stderr.on('data', () => {})
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim().split(/\r?\n/).pop())
      else reject(new Error('demucs exited ' + code))
    })
  })
}

serveNcmApi({ checkVersion: false, port: 3000 })
  .then((app) => {
    app.get('/karaoke/prepare', async (req, res) => {
      const id = req.query.id
      if (!id) return res.status(400).json({ ok: false, error: 'missing id' })
      const dir = path.join(CACHE_DIR, String(id))
      const wav = path.join(dir, 'no_vocals.wav')
      try {
        if (!fs.existsSync(wav)) {
          fs.mkdirSync(dir, { recursive: true })
          const url = await getSongUrl(id)
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
      res.setHeader('Content-Type', 'audio/wav')
      res.setHeader('Access-Control-Allow-Origin', '*')
      fs.createReadStream(wav).pipe(res)
    })

    console.log('[launch] NeteaseCloudMusicApi listening on :3000 (karaoke enabled)')
  })
  .catch((err) => {
    console.error('[launch] failed to start:', err && err.message)
  })
