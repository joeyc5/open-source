import 'dotenv/config'
import { adapters, adapterByKey } from '../src/lib/adapters'
import { runAdapter } from '../src/lib/ingest/run'
import { serviceClient } from '../src/lib/supabase'

/**
 * Ingest CLI. Runs in GitHub Actions, not on Vercel: the SAM bulk CSV is far
 * too large for a serverless function and Playwright needs a real machine.
 *
 *   npm run ingest -- --source sam
 *   npm run ingest -- --dry --source caleprocure --limit 5
 */
async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const only = valueOf(args, '--source')
  const limit = Number(valueOf(args, '--limit') ?? 5)

  const selected = only ? [adapterByKey(only)].filter(Boolean) : adapters
  if (selected.length === 0) {
    console.error(`unknown source "${only}". Known: ${adapters.map((a) => a.key).join(', ')}`)
    process.exit(1)
  }

  if (dry) {
    for (const a of selected) {
      console.log(`\n=== ${a!.key} (${a!.strategy}) ===`)
      let n = 0
      const samples = []
      for await (const item of a!.fetch({ log: (m) => console.log(`  ${m}`) })) {
        n++
        if (samples.length < limit) samples.push(item)
        if (n >= 2000) break
      }
      console.log(`  rows: ${n}${n >= 2000 ? '+ (capped)' : ''}`)
      for (const s of samples) {
        console.log(`  - [${s.sourceId}] ${s.title.slice(0, 70)}`)
        console.log(`      agency=${s.agency ?? '-'} state=${s.state ?? '-'} due=${s.dueAt ?? '-'}`)
        console.log(`      url=${s.sourceUrl ?? '-'}`)
      }
    }
    return
  }

  const db = serviceClient()
  let failed = false
  for (const a of selected) {
    const r = await runAdapter(db, a!)
    console.log(JSON.stringify(r))
    if (r.status === 'failed') failed = true
  }
  if (failed) process.exit(1)
}

function valueOf(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
