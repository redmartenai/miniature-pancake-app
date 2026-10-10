/* Signed-in person, role switch, school switch and sign-out — the mobile apps' version of the account menu. */
import { LogOut, Repeat, School } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MList, MRow, MSection } from '@/components/shell/Mobile'
import { Avatar, useToast } from '@/components/ui'
import { roleTitle } from '@/components/shell/AccountMenu'
import { errorCopy } from '@/components/states'
import { useAuth } from '@/auth/AuthProvider'
import { EXPERIENCE_LABEL, homePath, isWide, type Experience } from '@/auth/experience'
import { ToneIcon } from './ui'

export function AccountSection({ current }: { current: Experience }) {
  const { user, membership, experiences, selectable, schoolId, activateSchool, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  if (!user) return null
  return (
    <MSection title="Account">
      <MList>
        <MRow icon={<Avatar name={user.full_name} size={36} />} title={user.full_name} sub={membership ? `${roleTitle(membership.roles)} · ${membership.school.name}` : undefined} />
        {experiences.filter(e => e !== current).map(e => (
          <MRow key={e} icon={<ToneIcon icon={Repeat} tone="slate" size={36} />} title={`Switch to ${EXPERIENCE_LABEL[e].label}`} sub={EXPERIENCE_LABEL[e].sub}
            onClick={() => navigate(homePath(e, !!isWide()))} />
        ))}
        {selectable.filter(m => m.school.id !== schoolId).map(m => (
          <MRow key={m.id} icon={<ToneIcon icon={School} tone="slate" size={36} />} title={m.school.name} sub="Switch school"
            onClick={async () => { try { await activateSchool(m.school.id); navigate('/', { replace: true }) } catch (e) { toast(errorCopy(e).title, 'rust') } }} />
        ))}
        <MRow icon={<ToneIcon icon={LogOut} tone="stone" size={36} />} title="Sign out" onClick={() => signOut()} />
      </MList>
    </MSection>
  )
}
