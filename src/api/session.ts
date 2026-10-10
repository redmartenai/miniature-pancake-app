/**
 * The signed-in session's tokens and active school.
 *
 * Tokens live in memory only. The backend forbids keeping them in localStorage for the web console
 * (backend docs/security/authentication.md "Web sessions"); its httpOnly-cookie flow is not built yet,
 * so a page reload signs the user out. Tokens are opaque: nothing here decodes them.
 */

export interface Tokens {
  access: string
  refresh: string
}

type Listener = () => void

let tokens: Tokens | null = null
let schoolId: string | null = null
const listeners = new Set<Listener>()

const emit = () => listeners.forEach(l => l())

export const session = {
  getTokens: () => tokens,
  setTokens(next: Tokens | null) {
    tokens = next
    emit()
  },
  getSchoolId: () => schoolId,
  setSchoolId(id: string | null) {
    schoolId = id
    emit()
  },
  clear() {
    tokens = null
    schoolId = null
    emit()
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}
