import { motion } from 'framer-motion'
import { CalendarCheck, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Avatar, Card, CardHeader, EmptyState, Page, PageHeader, Pill, Stat, cx, ease } from '@/components/ui'
import { ErrorState, Loading } from '@/components/states'
import { TwoCol } from '@/components/shell/Web'
import { attendance } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'
import { addDays, dateLabel, isoDate, time } from '@/lib/format'
import { inSchool, totalOf, useWall } from '@/roles/_shared/attendance'
import { BASE, HEX, pct0 } from './shared'

/** The design's thresholds: below 75% puts exam eligibility at risk; a 20-point drop over 3 weeks is "slipping". */
export const RISK_LINE = 0.75
export const SLIP_DROP = 0.2
const WINDOW = 60
const RECENT = 15

interface Insight { trend: { date: string; rate: number }[]; below: Row[]; slipping: Row[]; avg: number | null }
interface Row { id: string; name: string; section: string; rate: number; prior?: number }

/**
 * Derived from real registers and absence records over the last 60 school days:
 * GET /attendance/sessions?date_from&date_to and GET /attendance/records?status=absent&date_from&date_to.
 * A student's rate is 1 − absences ÷ registers taken in their section (late and half day count as in school).
 */
export function useAttendanceInsights() {
  const { schoolId } = useAuth()
  const today = isoDate()
  const from = addDays(today, -100)
  return useQuery({
    queryKey: ['attendance-insights', schoolId, today],
    queryFn: async (): Promise<Insight> => {
      const [sessions, absences] = await Promise.all([
        attendance.sessions({ date_from: from, date_to: today }),
        attendance.records({ status: 'absent', date_from: from, date_to: today }),
      ])
      const dates = [...new Set(sessions.map(s => s.date))].sort().slice(-WINDOW)
      const inWindow = new Set(dates)
      const recentDates = new Set(dates.slice(-RECENT))
      const trend = dates.map(date => {
        const day = sessions.filter(s => s.date === date)
        const t = day.reduce((a, s) => a + totalOf(s.counts), 0)
        return { date, rate: t ? day.reduce((a, s) => a + inSchool(s.counts), 0) / t : 1 }
      })
      const sectionDays = new Map<string, { all: number; recent: number; name: string }>()
      for (const s of sessions) {
        if (!inWindow.has(s.date)) continue
        const v = sectionDays.get(s.section.id) ?? { all: 0, recent: 0, name: s.section.code || s.section.name }
        v.all++; if (recentDates.has(s.date)) v.recent++
        sectionDays.set(s.section.id, v)
      }
      const per = new Map<string, { name: string; section: string; sectionId: string; all: number; recent: number }>()
      for (const r of absences) {
        if (!inWindow.has(r.date)) continue
        const v = per.get(r.student.id) ?? { name: r.student.full_name, section: r.section.code || r.section.name, sectionId: r.section.id, all: 0, recent: 0 }
        v.all++; if (recentDates.has(r.date)) v.recent++
        per.set(r.student.id, v)
      }
      const rows = [...per.entries()].map(([id, v]) => {
        const d = sectionDays.get(v.sectionId) ?? { all: 0, recent: 0 }
        const rate = d.all ? 1 - v.all / d.all : 1
        const recent = d.recent ? 1 - v.recent / d.recent : 1
        const priorDays = d.all - d.recent
        const prior = priorDays ? 1 - (v.all - v.recent) / priorDays : recent
        return { id, name: v.name, section: v.section, rate, recent, prior }
      })
      return {
        trend,
        avg: trend.length ? trend.reduce((a, t) => a + t.rate, 0) / trend.length : null,
        below: rows.filter(r => r.rate < RISK_LINE).sort((a, b) => a.rate - b.rate),
        slipping: rows.filter(r => r.rate >= RISK_LINE && r.prior - r.recent >= SLIP_DROP)
          .map(r => ({ ...r, rate: r.recent })).sort((a, b) => (b.prior! - b.rate) - (a.prior! - a.rate)),
      }
    },
    staleTime: 5 * 60_000,
  })
}

export function AttendancePage() {
  const wall = useWall(isoDate())
  const insights = useAttendanceInsights()
  const navigate = useNavigate()
  const total = wall.tiles?.length ?? 0
  const att = wall.totals.total ? wall.totals.in / wall.totals.total : null
  const ins = insights.data

  return (
    <Page>
      <PageHeader eyebrow="Attendance" title={att === null ? 'No registers yet today' : `${pct0(att)} of children are in school`}
        subtitle={`${wall.marked} of ${total} registers taken.${ins ? ` ${ins.below.length} students are below ${RISK_LINE * 100}% over the last ${ins.trend.length} school days and ${ins.slipping.length} have started slipping.` : ''}`} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="In school today" value={wall.totals.in} sub={`of ${wall.totals.total} marked`} tone="forest" />
        <Stat label="Away today" value={wall.totals.absent} sub="absent or excused" tone={wall.totals.absent > 20 ? 'rust' : 'amber'} />
        <Stat label={`${ins?.trend.length ?? WINDOW}-day average`} value={(ins?.avg ?? 0) * 100} format={n => (ins?.avg == null ? '—' : `${n.toFixed(1)}%`)} tone="slate" trend={ins?.trend.map(t => t.rate * 100)} />
        <Stat label={`Below ${RISK_LINE * 100}%`} value={ins?.below.length ?? 0} sub="exam eligibility at risk" tone="rust" />
      </div>

      <TwoCol
        main={<>
          <Card padded={false} className="p-4 md:p-5">
            <CardHeader eyebrow="Today" title="By classroom" />
            {wall.isPending ? <Loading /> : wall.error ? <ErrorState error={wall.error} onRetry={wall.refetch} compact /> : !wall.tiles?.length ? (
              <EmptyState icon={CalendarCheck} title="No classes yet" body="Sections for the current academic year appear here once they are set up." />
            ) : (
              <div className="divide-y divide-line-2">
                {wall.tiles.map(({ cls, register: r }) => {
                  const c = r?.counts
                  const t = c ? totalOf(c) || 1 : 1
                  return (
                    <div key={cls.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:flex-nowrap">
                      <span className="w-12 font-display text-[19px] text-ink">{cls.short}</span>
                      <div className="min-w-0 flex-1">
                        {c ? (
                          <>
                            <div className="mb-1.5 flex h-2.5 overflow-hidden rounded-full bg-line-2">
                              <motion.div className="bg-forest-l" initial={{ width: 0 }} animate={{ width: `${((c.present + c.half_day) / t) * 100}%` }} transition={{ duration: 0.8, ease: ease.out }} />
                              <motion.div className="bg-amber" initial={{ width: 0 }} animate={{ width: `${(c.late / t) * 100}%` }} transition={{ duration: 0.8, ease: ease.out, delay: 0.1 }} />
                              <motion.div className="bg-rust" initial={{ width: 0 }} animate={{ width: `${((c.absent + c.excused) / t) * 100}%` }} transition={{ duration: 0.8, ease: ease.out, delay: 0.2 }} />
                            </div>
                            <div className="text-[12px] text-stone">{c.present} present{c.late ? `, ${c.late} late` : ''}{c.half_day ? `, ${c.half_day} half day` : ''}, {c.absent} absent{c.excused ? `, ${c.excused} excused` : ''} · {r!.taken_by.full_name} at {time(r!.submitted_at)}</div>
                          </>
                        ) : (
                          <div className="text-[13px] text-copper-d">Not marked yet · {cls.classTeacher?.name ?? 'no class teacher assigned'}</div>
                        )}
                      </div>
                      {c ? <span className="w-12 text-right tabular font-medium text-ink">{pct0(inSchool(c) / t)}</span> : <Pill tone="copper">Waiting</Pill>}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
          <Card padded={false} className="p-4 md:p-5">
            <CardHeader eyebrow={`Last ${ins?.trend.length ?? WINDOW} school days`} title="School-wide attendance" action={ins?.avg != null && <Pill tone="slate">avg {pct0(ins.avg)}</Pill>} />
            {insights.isPending ? <Loading rows={2} /> : insights.error ? <ErrorState error={insights.error} onRetry={() => insights.refetch()} compact /> : <TrendChart data={ins!.trend} />}
          </Card>
        </>}
        side={<>
          <StudentList title={`Below ${RISK_LINE * 100}%`} eyebrow={`Last ${ins?.trend.length ?? WINDOW} school days`} tone="rust" empty="Every child is above the line." q={insights}
            rows={ins?.below.map(r => ({ id: r.id, name: r.name, sub: r.section, value: pct0(r.rate) })) ?? []} onOpen={id => navigate(`${BASE}/students?s=${id}`)} />
          <StudentList title="Starting to slip" eyebrow="Last 3 weeks vs before" tone="copper" icon empty="Nobody has dropped sharply." q={insights}
            rows={ins?.slipping.map(r => ({ id: r.id, name: r.name, sub: `${r.section} · was ${pct0(r.prior ?? 1)}`, value: pct0(r.rate) })) ?? []} onOpen={id => navigate(`${BASE}/students?s=${id}`)} />
        </>}
      />
    </Page>
  )
}

function StudentList({ title, eyebrow, rows, tone, empty, onOpen, icon, q }: {
  title: string; eyebrow: string; rows: { id: string; name: string; sub: string; value: string }[]; tone: 'rust' | 'copper'; empty: string; onOpen: (id: string) => void; icon?: boolean
  q: { isPending: boolean; error: unknown; refetch: () => unknown }
}) {
  return (
    <Card padded={false} className="p-4 md:p-5">
      <CardHeader eyebrow={eyebrow} title={title} action={!q.isPending && <Pill tone={tone}>{rows.length}</Pill>} />
      {q.isPending ? <Loading rows={2} /> : q.error ? <ErrorState error={q.error} onRetry={() => q.refetch()} compact /> : rows.length === 0 ? <EmptyState icon={CalendarCheck} title="All clear" body={empty} /> : (
        <div className="scroll-quiet max-h-[380px] divide-y divide-line-2 overflow-y-auto">
          {rows.map(r => (
            <button key={r.id} onClick={() => onOpen(r.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-paper/40">
              <Avatar name={r.name} size={28} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-ink">{r.name}</div>
                <div className="truncate text-[11.5px] text-stone">{r.sub}</div>
              </div>
              <span className={cx('inline-flex items-center gap-1 tabular text-[13px] font-medium', tone === 'rust' ? 'text-rust' : 'text-copper-d')}>
                {icon && <TrendingDown size={13} />}{r.value}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function TrendChart({ data }: { data: { date: string; rate: number }[] }) {
  const W = 640, H = 200, L = 34, R = 8, T = 10, B = 24
  if (data.length < 2) return <EmptyState icon={CalendarCheck} title="Not enough days yet" body="The trend appears after two school days with registers." />
  const lo = Math.min(0.7, Math.floor(Math.min(...data.map(d => d.rate)) * 20) / 20)
  const hi = 1
  const x = (i: number) => L + (i / Math.max(1, data.length - 1)) * (W - L - R)
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.rate).toFixed(1)}`).join(' ')
  const ticks = [lo, 0.75, 0.9, 1].filter((v, i, a) => v >= lo && a.indexOf(v) === i)
  const labels = [0, Math.floor(data.length / 2), data.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`School attendance over the last ${data.length} school days`}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0.75 ? HEX.rust : HEX.line2} strokeDasharray={t === 0.75 ? '4 4' : undefined} strokeWidth={1} />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill={t === 0.75 ? HEX.rust : HEX.stone}>{Math.round(t * 100)}%</text>
        </g>
      ))}
      <motion.path d={`${path} L${x(data.length - 1)},${H - B} L${x(0)},${H - B} Z`} style={{ fill: HEX.forestP }} initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ duration: 0.8, delay: 0.4 }} />
      <motion.path d={path} fill="none" style={{ stroke: HEX.forestL }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: ease.out }} />
      {data.map((d, i) => d.rate < 0.85 && <circle key={d.date} cx={x(i)} cy={y(d.rate)} r={3} style={{ fill: HEX.copper }}><title>{`${dateLabel(d.date)} · ${Math.round(d.rate * 100)}%`}</title></circle>)}
      {labels.map(i => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="10.5" fill={HEX.stone}>{dateLabel(data[i].date)}</text>)}
    </svg>
  )
}

