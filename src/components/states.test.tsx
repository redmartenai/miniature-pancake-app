import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/client'
import { ErrorState, Unavailable, errorCopy } from './states'

describe('shared states', () => {
  it('names the exact missing backend capability for an unavailable screen', () => {
    render(<Unavailable blocker="fees" />)
    expect(screen.getByText("Fees isn't connected yet")).toBeInTheDocument()
    expect(screen.getByText(/\/students\/\{id\}\/fees/)).toBeInTheDocument()
  })

  it('explains permission errors without leaking server text, and offers a retry', async () => {
    const retry = vi.fn()
    render(<ErrorState error={new ApiError(403, 'permission_denied', 'internal detail')} onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Not available to your role')
    expect(screen.queryByText(/internal detail/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()
  })

  it('maps network and rate-limit errors to actionable copy', () => {
    expect(errorCopy(new ApiError(0, 'network_error', 'offline')).title).toBe("Can't reach EduFlow")
    expect(errorCopy(new ApiError(429, 'rate_limited', 'x', { retryAfterSeconds: 42 })).body).toContain('42 seconds')
  })
})
