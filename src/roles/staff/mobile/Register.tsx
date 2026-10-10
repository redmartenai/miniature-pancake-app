/*
 * The nine-second register (GET /classes/{id}/roster, POST /classes/{id}/attendance).
 * Everyone starts present; tap a child to cycle Present → Absent → Late. Only exceptions are sent, with one
 * client_id per draft so a retry can never double-submit (backend ADR-008; client known issue C2). Half-day and
 * excused marks already on the register are kept unless the teacher changes them (known issue C1).
 * After the register locks (end of its day), changes go through correction requests.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, RotateCcw, Send, Timer } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { newRequestId } from '@/api/client'
import { attendance, type AttendanceStatus, type S } from '@/api/endpoints'
import { useRoster, useSubmitRegister } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { Avatar, Button, Sheet, cx, ease, spring, useToast } from '@/components/ui'
import { MobileScreen, useMobileNav } from '@/components/shell/Mobile'
import { ErrorState, Loading, errorCopy } from '@/components/states'
import { firstName, isoDate, time } from '@/lib/format'
import { STATUS } from '@/roles/_shared/attendance'
import { ChoiceChips, textareaClass } from '@/roles/_shared/ui'

export const NEXT: Record<AttendanceStatus, AttendanceStatus> = { present: 'absent', absent: 'late', late: 'present', half_day: 'present', excused: 'present' }
const LOOK: Record<AttendanceStatus, { bg: string; border: string; text: string; badge: string }> = {
  present: { bg: '#FDFCF8', border: '#E2DCD1', text: 'text-ink', badge: 'bg-forest-p text-forest' },
  absent: { bg: '#F5E3DF', border: '#A4483A', text: 'text-rust', badge: 'bg-rust text-ivory' },
  late: { bg: '#FBF0D9', border: '#E0A53F', text: 'text-[#8a5f14]', badge: 'bg-amber text-ink' },
  half_day: { bg: '#E7EBEE', border: '#7C8894', text: 'text-slate', badge: 'bg-slate text-ivory' },
  excused: { bg: '#F0EBE2', border: '#B6AFA3', text: 'text-stone', badge: 'bg-stone text-ivory' },
}

/** The submission body: exceptions only (a student left out is present). */
export function exceptionsOf(marks: Record<string, AttendanceStatus>) {
  return Object.entries(marks).filter(([, s]) => s !== 'present').map(([student_id, status]) => ({ student_id, status }))
}

export function RegisterScreen({ sectionId, short }: { sectionId: string; short: string }) {
  const today = isoDate()
  const roster = useRoster(sectionId, today)
  return (
    <div className="relative h-full">
      {roster.isPending ? <MobileScreen title={`${short} register`}><Loading rows={6} /></MobileScreen>
        : roster.error ? <MobileScreen title={`${short} register`}><ErrorState error={roster.error} onRetry={() => roster.refetch()} /></MobileScreen>
        : roster.data!.locked ? <LockedRegister roster={roster.data!} short={short} sectionId={sectionId} />
        : <OpenRegister roster={roster.data!} short={short} sectionId={sectionId} />}
    </div>
  )
}

function OpenRegister({ roster, short, sectionId }: { roster: S['ClassRosterOut']; short: string; sectionId: string }) {
  const nav = useMobileNav()
  const toast = useToast()
  const submit = useSubmitRegister(sectionId)
  const students = useMemo(() => [...roster.students].sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }) || a.name.localeCompare(b.name)), [roster.students])
  const initial = () => Object.fromEntries(students.map(s => [s.id, (s.status ?? 'present') as AttendanceStatus]))
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(initial)
  const [sent, setSent] = useState<null | { seconds: number; inSchool: number; away: number }>(null)
  const [error, setError] = useState<unknown>(null)
  const clientId = useRef(newRequestId()) // one per draft; reused on retry, rotated only after the server accepts

  const startedAt = useRef(0)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => { startedAt.current = performance.now() }, []) // the stopwatch starts when the roster appears
  useEffect(() => {
    if (sent) return
    const t = setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 100)
    return () => clearInterval(t)
  }, [sent])

  const counts = useMemo(() => {
    const v = Object.values(marks)
    return { P: v.filter(m => m === 'present' || m === 'half_day').length, A: v.filter(m => m === 'absent' || m === 'excused').length, L: v.filter(m => m === 'late').length }
  }, [marks])

  const send = async () => {
    setError(null)
    const seconds = (performance.now() - startedAt.current) / 1000
    try {
      const r = await submit.mutateAsync({ entries: exceptionsOf(marks), client_id: clientId.current, date: roster.date })
      clientId.current = newRequestId()
      const inSchool = r.counts.present + r.counts.late + r.counts.half_day
      setSent({ seconds, inSchool, away: r.counts.absent + r.counts.excused })
      setTimeout(() => { nav.pop(); toast(`${short} register saved · ${inSchool} in, ${r.counts.absent + r.counts.excused} away`) }, 2400)
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <MobileScreen title={`${short} register`}
        eyebrow={roster.marked && roster.marked_at ? `Saved at ${time(roster.marked_at)} · you can change it until the end of the day` : `${students.length} children · everyone starts present`}
        actions={<span className="flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[13px] font-semibold tabular text-ink" aria-label="Seconds elapsed"><Timer size={14} className="text-copper" />{elapsed.toFixed(1)}s</span>}
        footer={
          <div>
            {!!error && <p role="alert" className="mb-2 text-center text-[13px] text-rust">{errorCopy(error).title}. {errorCopy(error).body}</p>}
            <Button block size="lg" icon={Send} onClick={send} disabled={!!sent || submit.isPending || students.length === 0}>
              {submit.isPending ? 'Saving…' : `${roster.marked ? 'Save changes' : 'Send register'} · ${counts.P + counts.L} in${counts.A ? `, ${counts.A} away` : ''}`}
            </Button>
          </div>
        }>
        <div className="sticky top-0 z-10 -mx-4 bg-ivory/95 px-4 pb-3 pt-1 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {([['P', 'Present', 'border-forest/20 bg-forest-p', 'text-forest'], ['A', 'Away', 'border-rust/20 bg-rust-p', 'text-rust'], ['L', 'Late', 'border-amber/30 bg-amber-p', 'text-[#8a5f14]']] as const).map(([k, label, box, text]) => (
              <div key={k} className={cx('rounded-[14px] border px-3 py-2', box)}>
                <div className={cx('text-[11.5px] font-medium uppercase tracking-[0.1em]', text)}>{label}</div>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={counts[k]} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={spring}
                    className="font-display text-[26px] leading-none tabular text-ink">{counts[k]}</motion.div>
                </AnimatePresence>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <p className="text-[12.5px] text-stone">Tap a child to mark absent, tap again for late.</p>
            <button onClick={() => setMarks(Object.fromEntries(students.map(s => [s.id, 'present' as AttendanceStatus])))} className="-mr-2 flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-forest">
              <RotateCcw size={14} /> All present
            </button>
          </div>
        </div>

        {students.length === 0 ? <p className="rounded-[14px] border border-dashed border-line px-4 py-6 text-center text-[13.5px] text-stone">No children are enrolled in {short} today.</p> : (
          <div className="grid grid-cols-4 gap-2">
            {students.map(s => {
              const m = marks[s.id]
              return (
                <motion.button key={s.id} onClick={() => setMarks(x => ({ ...x, [s.id]: NEXT[x[s.id]] }))} whileTap={{ scale: 0.9 }}
                  animate={{ backgroundColor: LOOK[m].bg, borderColor: LOOK[m].border }} transition={{ duration: 0.18, ease: ease.out }}
                  aria-label={`${s.name}${s.roll_no ? `, roll ${s.roll_no}` : ''}: ${STATUS[m].label}`}
                  className="relative flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-[14px] border px-1 py-2">
                  <span className="relative">
                    <motion.span animate={{ scale: m === 'present' ? 1 : 0.92, opacity: m === 'absent' ? 0.55 : 1 }} transition={spring} className="block"><Avatar name={s.name} size={38} /></motion.span>
                    <AnimatePresence>
                      {m !== 'present' && (
                        <motion.span key={m} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                          className={cx('absolute -bottom-1 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold ring-2 ring-ivory-2', LOOK[m].badge)}>
                          {STATUS[m].short}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span className={cx('w-full truncate text-center text-[12.5px] font-medium leading-tight', LOOK[m].text)}>{firstName(s.name)}</span>
                  {s.roll_no && <span className="text-[10.5px] tabular text-stone">Roll {s.roll_no}</span>}
                </motion.button>
              )
            })}
          </div>
        )}
      </MobileScreen>
      <AnimatePresence>{sent && <SavedMoment short={short} {...sent} />}</AnimatePresence>
    </>
  )
}

function SavedMoment({ short, seconds, inSchool, away }: { short: string; seconds: number; inSchool: number; away: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-forest px-8 text-center text-on-forest">
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="grid h-24 w-24 place-items-center rounded-full bg-ivory/12 ring-1 ring-ivory/25">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
          <motion.path d="M12 25 L21 34 L37 15" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2, duration: 0.45, ease: ease.out }} />
        </svg>
      </motion.div>
      <motion.h2 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35, duration: 0.5, ease: ease.out }}
        className="mt-7 font-display text-[30px] leading-tight !text-on-forest">{short} register saved</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-1.5 font-display text-[19px] tabular opacity-80">{seconds.toFixed(1)} seconds</motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 text-[14px] opacity-75">{inSchool} in school{away ? ` · ${away} away` : ''}</motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-8 text-[14px] opacity-70">The principal's wall shows it now. You can start teaching.</motion.p>
    </motion.div>
  )
}

/** After the cutoff the register is read-only; a change becomes a correction request for an approver. */
function LockedRegister({ roster, short, sectionId }: { roster: S['ClassRosterOut']; short: string; sectionId: string }) {
  const { schoolId } = useAuth()
  const records = useQuery({
    queryKey: ['attendance-records', schoolId, sectionId, roster.date],
    queryFn: () => attendance.records({ section_id: sectionId, date: roster.date }),
  })
  const [fixing, setFixing] = useState<S['RecordOut'] | null>(null)
  return (
    <MobileScreen title={`${short} register`} eyebrow={roster.marked_at ? `Saved at ${time(roster.marked_at)} · locked` : 'Locked'}>
      <div className="mb-3 flex items-start gap-2 rounded-[12px] bg-paper px-3 py-2.5 text-[13px] text-charcoal-2">
        <Lock size={15} className="mt-0.5 shrink-0 text-stone" /> This register is locked. Tap a child to ask for a correction; the principal or office decides.
      </div>
      {records.isPending ? <Loading rows={4} /> : records.error ? <ErrorState error={records.error} onRetry={() => records.refetch()} compact /> : (
        <div className="divide-y divide-line-2 overflow-hidden rounded-[16px] border border-line bg-ivory-2">
          {records.data!.map(r => (
            <button key={r.id} onClick={() => setFixing(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <Avatar name={r.student.full_name} size={34} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{r.student.full_name}</span>
              <span className={cx('rounded-full px-2.5 py-[3px] text-[12px] font-medium', LOOK[r.status].badge)}>{STATUS[r.status].label}</span>
            </button>
          ))}
        </div>
      )}
      <CorrectionSheet record={fixing} onClose={() => setFixing(null)} />
    </MobileScreen>
  )
}

function CorrectionSheet({ record, onClose }: { record: S['RecordOut'] | null; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [status, setStatus] = useState<AttendanceStatus>('present')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const options = (Object.keys(STATUS) as AttendanceStatus[]).filter(s => s !== record?.status)
  const chosen = options.includes(status) ? status : options[0]
  const submit = async () => {
    if (!record || !reason.trim()) return
    setBusy(true); setError(null)
    try {
      await attendance.requestCorrection({ record_id: record.id, new_status: chosen, reason: reason.trim() })
      qc.invalidateQueries({ queryKey: ['corrections'] })
      toast('Correction sent for approval')
      setReason('')
      onClose()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={!!record} onClose={onClose} title={record ? `Correct ${firstName(record.student.full_name)}` : ''}
      footer={<Button block size="lg" disabled={busy || !reason.trim()} onClick={submit}>{busy ? 'Sending…' : 'Send for approval'}</Button>}>
      {record && (
        <>
          <p className="mb-3 text-[13.5px] text-stone">Marked {STATUS[record.status].label.toLowerCase()}. Change it to:</p>
          <ChoiceChips group={`fix-${record.id}`} value={chosen} onChange={setStatus} options={options.map(s => ({ id: s, label: STATUS[s].label }))} />
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why does it need changing? (required)" aria-label="Reason" className={cx(textareaClass, 'mt-4')} />
          {!!error && <p role="alert" className="mt-2 text-[13px] text-rust">{errorCopy(error).body}</p>}
        </>
      )}
    </Sheet>
  )
}
