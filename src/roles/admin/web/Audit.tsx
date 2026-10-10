import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ScrollText, SearchX } from 'lucide-react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Avatar, Button, Card, EmptyState, Page, PageHeader, Pill, Toggle, listItem } from '@/components/ui'
import { ErrorState, Loading } from '@/components/states'
import { audit, nextCursor } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'
import { useNow } from '@/api/queries'
import { dateLabel, localIso, time } from '@/lib/format'
import { auditActionLabel, isSensitive } from '@/roles/_shared/audit'
import { SearchInput, Segmented } from './shared'
import { useActorNames } from './Overview'

type Outcome = 'all' | 'success' | 'failure' | 'denied'

export function AuditPage() {
  const { schoolId } = useAuth()
  const now = useNow()
  const nameOf = useActorNames()
  const [q, setQ] = useState('')
  const [sensitive, setSensitive] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>('all')
  const pages = useInfiniteQuery({
    queryKey: ['audit', schoolId, 'infinite'],
    queryFn: ({ pageParam }) => audit.page(pageParam ? { cursor: pageParam } : {}),
    initialPageParam: '' as string,
    getNextPageParam: last => nextCursor(last.next),
  })

  const all = useMemo(() => pages.data?.pages.flatMap(p => p.results) ?? [], [pages.data])
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase()
    return all
      .filter(e => !sensitive || isSensitive(e.action))
      .filter(e => outcome === 'all' || e.outcome === outcome)
      .filter(e => !n || `${auditActionLabel(e.action)} ${e.action} ${e.target_type} ${nameOf(e.actor_id)}`.toLowerCase().includes(n))
  }, [all, q, sensitive, outcome, nameOf])

  const today = now.slice(0, 10)
  const groups = useMemo(() => {
    const m = new Map<string, typeof rows>()
    for (const e of rows) {
      const k = localIso(e.occurred_at).slice(0, 10)
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return [...m.entries()]
  }, [rows])
  const dayLabel = (k: string) => (k === today ? 'Today' : dateLabel(k, { weekday: 'long', day: 'numeric', month: 'long' }))

  return (
    <Page>
      <PageHeader eyebrow="Audit log" title="Every change, on the record"
        subtitle="Append-only: entries can be read and filtered, never edited or deleted — not even by an administrator." />

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-line-2 p-4 md:p-5 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search action, record or person" className="lg:max-w-[300px] lg:flex-1" />
          <Segmented id="audit-outcome" value={outcome} onChange={setOutcome}
            options={[{ value: 'all', label: 'Everything' }, { value: 'success', label: 'Succeeded' }, { value: 'denied', label: 'Denied' }, { value: 'failure', label: 'Failed' }]} />
          <label className="flex items-center gap-2.5 text-[13px] text-charcoal lg:ml-auto">
            <Toggle checked={sensitive} onChange={setSensitive} label="Sensitive only" /> Sensitive only
          </label>
        </div>

        {pages.isPending ? <div className="p-5"><Loading rows={6} /></div> : pages.error ? <ErrorState error={pages.error} onRetry={() => pages.refetch()} /> : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No entries match" body={all.length ? 'Try clearing a filter.' : 'Nothing has been recorded yet.'}
            action={all.length ? <Button size="sm" variant="outline" onClick={() => { setQ(''); setOutcome('all'); setSensitive(false) }}>Clear filters</Button> : undefined} />
        ) : (
          <div className="px-4 pb-4 md:px-5">
            {groups.map(([day, entries]) => (
              <section key={day}>
                <div className="sticky top-16 z-[1] -mx-1 bg-ivory-2/95 px-1 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone backdrop-blur">{dayLabel(day)} · {entries.length}</div>
                {entries.map(e => (
                  <motion.div key={e.id} variants={listItem} initial="hidden" animate="show"
                    className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-b border-line-2 py-3 last:border-0 sm:grid-cols-[52px_minmax(0,1fr)_auto]">
                    <span className="pt-1 text-[12.5px] tabular text-stone">{time(e.occurred_at)}</span>
                    <div className="flex min-w-0 gap-2.5">
                      <Avatar name={nameOf(e.actor_id)} size={28} />
                      <div className="min-w-0">
                        <div className="text-[13.5px] text-charcoal"><span className="font-medium text-ink">{nameOf(e.actor_id)}</span> <span className="text-stone">·</span> {auditActionLabel(e.action)}</div>
                        <div className="break-words text-[12.5px] text-stone">{e.target_type}{e.ip ? ` · ${e.ip}` : ''} · ref {e.request_id.slice(0, 8)}</div>
                      </div>
                    </div>
                    <div className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-auto sm:justify-end">
                      {e.outcome !== 'success' && <Pill tone="rust">{e.outcome}</Pill>}
                      {isSensitive(e.action) && <Pill tone="copper" icon={Lock}>Sensitive</Pill>}
                    </div>
                  </motion.div>
                ))}
              </section>
            ))}
            {pages.hasNextPage ? (
              <div className="flex justify-center pt-4">
                <Button size="sm" variant="outline" disabled={pages.isFetchingNextPage} onClick={() => pages.fetchNextPage()}>{pages.isFetchingNextPage ? 'Loading…' : 'Show older entries'}</Button>
              </div>
            ) : (
              <p className="flex items-center justify-center gap-1.5 pt-5 text-[12px] text-stone-l"><ScrollText size={13} /> Start of the log</p>
            )}
          </div>
        )}
      </Card>
    </Page>
  )
}
