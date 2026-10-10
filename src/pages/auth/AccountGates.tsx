/* Screens between sign-in and the app: forced password change, choosing a school, and "no access". */
import { useState, type FormEvent } from 'react'
import { ChevronRight, School, ShieldX } from 'lucide-react'
import { isApiError } from '@/api/client'
import { auth as authApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'
import { useHostBranding } from '@/branding/BrandingProvider'
import { Button, Field, inputClass } from '@/components/ui'
import { errorCopy } from '@/components/states'
import { AuthLayout, FieldError, FormError } from './AuthLayout'

export function ChangePasswordPage() {
  const { refreshMe, signOut } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const mismatch = confirm.length > 0 && confirm !== next
  const fe = (k: string) => (isApiError(error) ? error.fieldError(k) : undefined)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!next || mismatch) return
    setBusy(true); setError(null)
    try {
      await authApi.changePassword({ new_password: next, ...(current ? { current_password: current } : {}) })
      await refreshMe()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Your school set a temporary password. Pick your own before you continue."
      footer={<button onClick={() => signOut()} className="hover:text-ink">Sign out</button>}>
      <form onSubmit={submit} noValidate>
        {!!error && !fe('new_password') && !fe('current_password') && <FormError>{errorCopy(error).body}</FormError>}
        <div className="space-y-4">
          <Field label="Current password" hint="Leave blank if you signed in with a phone code or an invitation.">
            <input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} className={inputClass} />
            <FieldError>{fe('current_password')}</FieldError>
          </Field>
          <Field label="New password">
            <input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} className={inputClass} aria-invalid={!!fe('new_password')} />
            <FieldError>{fe('new_password')}</FieldError>
          </Field>
          <Field label="Repeat new password">
            <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} aria-invalid={mismatch} />
            <FieldError>{mismatch ? "The passwords don't match." : undefined}</FieldError>
          </Field>
        </div>
        <Button type="submit" block size="lg" className="mt-6" disabled={busy || !next || mismatch || confirm !== next}>{busy ? 'Saving…' : 'Save and continue'}</Button>
      </form>
    </AuthLayout>
  )
}

export function ChooseSchoolPage() {
  const { selectable, activateSchool, activating, signOut, user } = useAuth()
  const [error, setError] = useState<unknown>(null)
  const pick = async (id: string) => {
    setError(null)
    try { await activateSchool(id) } catch (e) { setError(e) }
  }
  return (
    <AuthLayout title="Choose a school" subtitle={`${user?.full_name}, you belong to more than one school.`}
      footer={<button onClick={() => signOut()} className="hover:text-ink">Sign out</button>}>
      {!!error && <FormError>{errorCopy(error).body}</FormError>}
      <div className="divide-y divide-line-2 overflow-hidden rounded-[14px] border border-line">
        {selectable.map(m => (
          <button key={m.id} disabled={activating} onClick={() => pick(m.school.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-paper/60 disabled:opacity-60">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-forest-p text-forest"><School size={17} /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium text-ink">{m.school.name}</div>
              <div className="truncate text-[12.5px] text-stone">{m.roles.map(r => r.title || r.name).join(' · ')}</div>
            </div>
            <ChevronRight size={17} className="text-stone-l" />
          </button>
        ))}
      </div>
    </AuthLayout>
  )
}

/** Signed in, but there is nothing in this app for the account here. */
export function NoAccessPage({ reason }: { reason: 'no-school' | 'platform' | 'host' | 'no-experience' }) {
  const { signOut, membership } = useAuth()
  const host = useHostBranding()
  const copy = {
    'no-school': ['No school yet', "Your account isn't an active member of any school. If you were invited, open the invitation link; otherwise ask the school office."],
    platform: ['Platform administration', "EduFlow staff accounts manage schools through the platform console, which isn't part of the supplied screens for this app."],
    host: ['Not a member here', `This address belongs to ${host.branding.school?.name ?? 'another school'}, and your account isn't a member of it. Use your own school's address.`],
    'no-experience': ['No workspace for your role yet', `Your role at ${membership?.school.name ?? 'this school'} (${membership?.roles.map(r => r.name).join(', ') || 'none'}) has no screens in the supplied designs yet. The designs cover principals, administrators, teachers, parents and students.`],
  }[reason]
  return (
    <AuthLayout title={copy[0]}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-p text-slate"><ShieldX size={18} /></span>
        <p className="text-[14px] leading-relaxed text-charcoal-2">{copy[1]}</p>
      </div>
      <Button block variant="outline" className="mt-6" onClick={() => signOut()}>Sign out</Button>
    </AuthLayout>
  )
}
