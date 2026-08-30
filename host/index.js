/**
 * dsh-music — starts the NeteaseCloudMusicApi server (port 3000) on DSH startup
 * so the music player overlay can play without any manual step.
 *
 * Host-plane Cordis plugin mounted through a cordis.patch.yml row:
 *
 *   - id: tool-music-server
 *     name: 'file:///C:/Users/Administrator/.dsh/plugins/dsh-music/index.js'
 *     config:
 *       nodePath: 'C:/Program Files/nodejs/node.exe'
 *       serverScript: 'E:/code/插件配置/netease-api/launch.js'
 *       port: 3000
 */
import { spawn } from 'node:child_process'
import net from 'node:net'

export const name = 'dsh-music-server'

function portInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host })
    let done = false
    const finish = (v) => {
      if (done) return
      done = true
      try { sock.destroy() } catch {}
      resolve(v)
    }
    sock.once('connect', () => finish(true))
    sock.once('error', () => finish(false))
    sock.setTimeout(800, () => finish(false))
  })
}

export function apply(ctx, config) {
  const nodePath = config?.nodePath || 'node'
  const serverScript = config?.serverScript
  const port = Number(config?.port || 3000)

  ctx.effect(() => {
    let child = null
    let stopped = false

    ;(async () => {
      try {
        const inUse = await portInUse(port)
        if (stopped) return
        if (inUse) {
          console.log('[dsh-music] port ' + port + ' already in use, skip spawn')
          return
        }
        if (!serverScript) {
          console.error('[dsh-music] no serverScript configured')
          return
        }
        child = spawn(nodePath, [serverScript], {
          stdio: 'ignore',
          windowsHide: true,
        })
        child.on('error', (e) => console.error('[dsh-music] spawn failed:', e.message))
        child.on('exit', (code) => console.log('[dsh-music] server exited, code', code))
        console.log('[dsh-music] started NeteaseCloudMusicApi on :' + port)
      } catch (err) {
        console.error('[dsh-music] startup error:', err && err.message)
      }
    })()

    return () => {
      stopped = true
      if (child) { try { child.kill() } catch {} }
    }
  })
}
