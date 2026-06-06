/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VerifyEmailClient from './VerifyEmailClient'

const { sendVerificationEmailMock, useSearchParamsMock } = vi.hoisted(() => ({
  sendVerificationEmailMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    sendVerificationEmail: sendVerificationEmailMock,
  },
}))

const translations = {
  title: 'Verify your email',
  body: 'We sent a confirmation link to your inbox.',
  resend: 'Resend email',
  resending: 'Sending...',
  resendSuccess: 'Verification email sent again.',
  resendError: 'Could not resend verification email. Try again.',
  missingEmail: 'Email is missing. Return to registration and try again.',
  changeEmail: 'Change email',
  wrongAddressPrompt: 'Entered the wrong address?',
  checkSpam: "Check your spam folder if you don't see it.",
}

describe('VerifyEmailClient', () => {
  const previousBetterAuthUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL = 'https://app.generations.test'
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('email=person%40example.com'),
    )
  })

  afterEach(() => {
    cleanup()

    if (previousBetterAuthUrl === undefined) {
      delete process.env.NEXT_PUBLIC_BETTER_AUTH_URL
      return
    }

    process.env.NEXT_PUBLIC_BETTER_AUTH_URL = previousBetterAuthUrl
  })

  it('renders the verification screen with email and localized links', () => {
    render(<VerifyEmailClient lang="en" t={translations} />)

    expect(screen.getAllByText(translations.title).length).toBeGreaterThan(0)
    expect(screen.getAllByText('person@example.com').length).toBeGreaterThan(0)

    expect(
      screen.getByRole('link', { name: translations.changeEmail }).getAttribute(
        'href',
      ),
    ).toBe('/en/register')
  })

  it('resends the verification email and shows success feedback', async () => {
    const user = userEvent.setup()
    sendVerificationEmailMock.mockResolvedValue({})

    render(<VerifyEmailClient lang="en" t={translations} />)

    await user.click(screen.getByRole('button', { name: translations.resend }))

    await waitFor(() => {
      expect(sendVerificationEmailMock).toHaveBeenCalledWith({
        email: 'person@example.com',
        callbackURL: '/en/dashboard?emailVerified=1',
      })
    })

    expect(
      await screen.findByText(translations.resendSuccess),
    ).not.toBeNull()
  })

  it('shows the missing-email message without calling the auth client', async () => {
    const user = userEvent.setup()
    useSearchParamsMock.mockReturnValue(new URLSearchParams())

    render(<VerifyEmailClient lang="en" t={translations} />)

    await user.click(screen.getByRole('button', { name: translations.resend }))

    expect(await screen.findByText(translations.missingEmail)).not.toBeNull()
    expect(sendVerificationEmailMock).not.toHaveBeenCalled()
  })
})
