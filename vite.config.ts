import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Local archive: while `npm run dev` runs, the app sends every recorded exercise, every
// recommendation it shows and the user's notes here, so they land as plain JSON files
// in ./data — readable later to check results and improve the analysis.
function dataArchive(): Plugin {
  const root = fileURLToPath(new URL('./data', import.meta.url))
  const dirs = {
    exercises: path.join(root, 'exercises'),
    profiles: path.join(root, 'profiles'),
  }
  const ensure = () => Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }))
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const list = (d: string) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')) : [])

  const readBody = (req: NodeJS.ReadableStream) =>
    new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })

  return {
    name: 'hetuner-data-archive',
    configureServer(server) {
      server.middlewares.use('/__hetuner', async (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        try {
          const url = req.url ?? '/'
          if (req.method === 'GET' && url.startsWith('/status')) {
            return send(200, { dir: root, exercises: list(dirs.exercises).length, profiles: list(dirs.profiles).length })
          }
          if (req.method !== 'POST') return send(404, { error: 'not found' })
          ensure()
          const data = JSON.parse(await readBody(req))

          if (url.startsWith('/exercise')) {
            const id = String(data.id ?? '')
            if (!/^[a-z0-9]+$/i.test(id) || typeof data.kind !== 'string') return send(400, { error: 'invalid exercise' })
            if (list(dirs.exercises).some((f) => f.endsWith(`_${id}.json`))) return send(200, { ok: true, existed: true })
            const file = `${stamp(data.createdAt ?? Date.now())}_${data.kind}_${data.source}_${id}.json`
            fs.writeFileSync(path.join(dirs.exercises, file), JSON.stringify(data))
            const summary =
              data.kind === 'typing'
                ? { wpm: data.meta?.wpm, accuracy: data.meta?.accuracy, keys: data.meta?.keys?.length, hw: !!data.hw }
                : {}
            fs.appendFileSync(
              path.join(root, 'index.jsonl'),
              JSON.stringify({ id, kind: data.kind, source: data.source, createdAt: new Date(data.createdAt).toISOString(), file, ...summary }) + '\n',
            )
            return send(200, { ok: true, file })
          }

          if (url.startsWith('/profile')) {
            const hash = crypto.createHash('sha1').update(JSON.stringify(data.profile)).digest('hex').slice(0, 10)
            if (list(dirs.profiles).some((f) => f.includes(hash))) return send(200, { ok: true, existed: true })
            const file = `${stamp(data.at ?? Date.now())}_${hash}.json`
            fs.writeFileSync(path.join(dirs.profiles, file), JSON.stringify(data))
            return send(200, { ok: true, file })
          }

          if (url.startsWith('/note')) {
            const text = String(data.text ?? '').slice(0, 4000)
            if (!text.trim()) return send(400, { error: 'empty note' })
            fs.appendFileSync(path.join(root, 'notes.jsonl'), JSON.stringify({ at: new Date().toISOString(), text, context: data.context ?? null }) + '\n')
            return send(200, { ok: true })
          }

          return send(404, { error: 'not found' })
        } catch (e) {
          return send(500, { error: (e as Error).message })
        }
      })
    },
  }
}

export default defineConfig({
  // GitHub Pages serves the demo from /<repo>/ (set by the deploy workflow)
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), dataArchive()],
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/data/**'] } },
})
