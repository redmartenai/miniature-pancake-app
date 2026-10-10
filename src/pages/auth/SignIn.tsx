/* Sign in with an email/phone and password, or with a one-time code sent to a phone (POST /auth/*). */
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound, Smartphone } from 'lucide-react'
import { isApiError } from '@/api/client'
import { auth as authApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'
import { useHostBranding } from '@/branding/BrandingProvider'
import { Button, Field, Tabs, Toggle, cx, inputClass } from '@/components/ui'
import { AuthLayout, FieldError, FormError } from './AuthLayout'

type Mode = 'password' | 'otp'

/** Messages by error code (the server's wording is generic on purpose: no account enumeration). */
export function signInError(e: unknown): string {
  if (!isApiError(e)) return 'Something went wrong. Please try again.'
  switch (e.code) {
    case 'invalid_credentials': return "That email or phone and password don't match."
    case 'invalid_code': return "That code isn't right, or it has expired. Request a new one."
    case 'rate_limited': return `Too many attempts. Try again in ${e.retryAfterSeconds ?? 60} seconds.`
    case 'network_error': return e.message
    case 'validation_error': return 'Please check the highlighted fields.'
    default: return e.message
  }
}

export function SignInPage() {
  const { notice } = useAuth()
  const host = useHostBranding()
  const [mode, setMode] = useState<Mode>('password')
  const school = host.branding.school
  return (
    <AuthLayout title="Sign in" subtitle={school ? `to ${school.name}` : 'to your school on EduFlow'}
      footer="Trouble signing in? Your school office can reset your access.">
      <FormError>{notice}</FormError>
      <Tabs<Mode> className="mb-5" value={mode} onChange={setMode}
        tabs={[{ id: 'password', label: <span className="inline-flex items-center gap-1.5"><KeyRound size={14} />Password</span> }, { id: 'otp', label: <span className="inline-flex items-center gap-1.5"><Smartphone size={14} />Phone code</span> }]} />
      {mode === 'password' ? <PasswordForm /> : <OtpForm />}
    </AuthLayout>
  )
}

function PasswordForm() {
  const { completeSignIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const fe = (k: string) => (isApiError(error) ? error.fieldError(k) : undefined)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password) return
    setBusy(true); setError(null)
    try {
      await completeSignIn(await authApi.passwordLogin({ identifier: identifier.trim(), password, remember }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {!!error && <FormError>{signInError(error)}</FormError>}
      <div className="space-y-4">
        <Field label="Email or mobile number">
          <input autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} className={inputClass} aria-invalid={!!fe('identifier')} required />
          <FieldError>{fe('identifier')}</FieldError>
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} aria-invalid={!!fe('password')} required />
          <FieldError>{fe('password')}</FieldError>
        </Field>
        <label className="flex items-center gap-2.5 text-[13.5px] text-charcoal-2">
          <Toggle checked={remember} onChange={setRemember} label="Keep me signed in for 30 days" /> Keep me signed in for 30 days
        </label>
      </div>
      <Button type="submit" block size="lg" className="mt-6" disabled={busy || !identifier.trim() || !password}>{busy ? 'Signing in…' : 'Sign in'}</Button>
    </form>
  )
}

function OtpForm() {
  const { completeSignIn } = useAuth()
  const [phone, setPhone] = useState('')
  const [challenge, setChallenge] = useState<{ id: string; sentAt: number; resendAt: number; devCode?: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [clock, setClock] = useState(0)
  useEffect(() => {
    if (!challenge) return
    const t = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(t)
  }, [challenge])
  const wait = challenge && clock ? Math.max(0, Math.ceil((challenge.resendAt - clock) / 1000)) : challenge ? Math.ceil((challenge.resendAt - challenge.sentAt) / 1000) : 0

  const request = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!phone.trim()) return
    setBusy(true); setError(null)
    try {
      const r = await authApi.otpRequest(phone.trim())
      // dev_code is echoed only by a development backend; never show it in a production build.
      const sentAt = Date.now()
      setClock(0)
      setChallenge({ id: r.challenge_id, sentAt, resendAt: sentAt + r.resend_in * 1000, devCode: import.meta.env.DEV ? r.dev_code : undefined })
      setCode('')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (!challenge || code.length < 4) return
    setBusy(true); setError(null)
    try {
      await completeSignIn(await authApi.otpVerify({ challenge_id: challenge.id, code }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  if (!challenge) {
    return (
      <form onSubmit={request} noValidate>
        {!!error && <FormError>{signInError(error)}</FormError>}
        <Field label="Mobile number" hint="We'll text you a 6-digit code.">
          <input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="98123 45678" className={inputClass} />
          <FieldError>{isApiError(error) ? error.fieldError('phone') : undefined}</FieldError>
        </Field>
        <Button type="submit" block size="lg" className="mt-6" disabled={busy || !phone.trim()}>{busy ? 'Sending…' : 'Send code'}</Button>
      </form>
    )
  }

  return (
    <form onSubmit={verify} noValidate>
      {!!error && <FormError>{signInError(error)}</FormError>}
      <p className="mb-4 text-[13.5px] text-charcoal-2">If {phone} belongs to an EduFlow account, a code is on its way.</p>
      <Field label="6-digit code">
        <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          className={cx(inputClass, 'h-12 text-center font-display text-[22px] tracking-[0.4em]')} aria-label="Code" />
      </Field>
      {challenge.devCode && <p className="mt-2 text-[12px] text-stone">Development code: <span className="tabular font-medium text-ink">{challenge.devCode}</span></p>}
      <Button type="submit" block size="lg" className="mt-6" disabled={busy || code.length < 4}>{busy ? 'Checking…' : 'Sign in'}</Button>
      <div className="mt-4 flex items-center justify-between text-[13px]">
        <button type="button" onClick={() => { setChallenge(null); setError(null) }} className="inline-flex items-center gap-1 text-stone hover:text-ink"><ArrowLeft size={14} /> Change number</button>
        <button type="button" disabled={wait > 0 || busy} onClick={() => request()} className="font-medium text-forest disabled:text-stone-l">
          {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </form>
  )
}
