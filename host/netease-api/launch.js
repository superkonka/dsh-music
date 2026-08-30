// Minimal launcher for NeteaseCloudMusicApi.
// Skips the version check (which shells out to npm) and registers the
// anonymous token in the background with a timeout so startup never blocks.
const path = require('path')
const fs = require('fs')
const os = require('os')

const ncm = path.join(__dirname, 'node_modules', 'NeteaseCloudMusicApi')
const { generateRandomChineseIP, cookieToJson } = require(path.join(ncm, 'util', 'index'))
const { serveNcmApi } = require(path.join(ncm, 'server'))
const { register_anonimous } = require(path.join(ncm, 'main'))

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

serveNcmApi({ checkVersion: false, port: 3000 })
  .then(() => {
    console.log('[launch] NeteaseCloudMusicApi listening on :3000')
  })
  .catch((err) => {
    console.error('[launch] failed to start:', err && err.message)
  })
