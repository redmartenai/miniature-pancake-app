/* "What just happened": the school's recent audited actions (GET /audit-events, needs audit.read). */
import { motion } from 'framer-motion'
import { ScrollText } from 'lucide-react'
import { Card, CardHeader, EmptyState, listItem } from '@/components/ui'
import { QueryState } from '@/components/states'
import { useAuditPage, useNow } from '@/api/queries'
import { ago } from '@/lib/format'
import { auditActionLabel } from '@/roles/_shared/audit'
import { useCan } from './shared'

export function ActivityStream() {
  const can = useCan()
  const allowed = can('audit.read')
  const q = useAuditPage({}, allowed)
  const now = useNow()
  if (!allowed) return null
  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow="As it happens" title="Activity" />
      <QueryState q={q} empty={p => (p.results.length ? null : <EmptyState icon={ScrollText} title="Nothing yet" body="Registers, corrections and access changes appear here as they happen." />)}>
        {p => (
          <div className="scroll-quiet max-h-[420px] divide-y divide-line-2 overflow-y-auto">
            {p.results.slice(0, 15).map(e => (
              <motion.div key={e.id} variants={listItem} initial="hidden" animate="show" className="flex items-start gap-2.5 py-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.outcome === 'success' ? 'bg-forest-l' : 'bg-rust'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-ink">{auditActionLabel(e.action)}</div>
                  <div className="truncate text-[11.5px] text-stone">{e.target_type}{e.outcome !== 'success' ? ` · ${e.outcome}` : ''}</div>
                </div>
                <span className="shrink-0 text-[11.5px] text-stone-l">{ago(e.occurred_at, now)}</span>
              </motion.div>
            ))}
          </div>
        )}
      </QueryState>
    </Card>
  )
}
