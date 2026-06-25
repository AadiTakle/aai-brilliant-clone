import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { CoursePage } from '../../src/pages/CoursePage'
import { makeAuthValue, makeUser, renderWithAuth } from '../helpers/renderWithAuth'

// [Phase 1] Home is the Python Basics course. Logged-out learners see the course
// card but cannot reach the lesson map (the map is gated behind sign-in); the
// course path only renders for a signed-in learner who has opened it.
describe('[Phase 1] CoursePage gate', () => {
  it('shows the course card with a sign-in prompt when logged out', () => {
    renderWithAuth(<CoursePage />, { authValue: makeAuthValue({ user: null }) })
    expect(screen.getByRole('heading', { name: /python basics/i })).toBeInTheDocument()
    expect(screen.getByText(/sign in to save your progress/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })

  it('does not reveal the lesson path to a logged-out learner, even at ?view=map', () => {
    renderWithAuth(<CoursePage />, {
      authValue: makeAuthValue({ user: null }),
      initialEntries: ['/?view=map'],
    })
    expect(screen.queryByLabelText(/^Lesson 1/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
  })

  it('opens the lesson path for a signed-in learner at ?view=map', () => {
    renderWithAuth(<CoursePage />, {
      authValue: makeAuthValue({ user: makeUser('Ada') }),
      initialEntries: ['/?view=map'],
    })
    expect(screen.getByLabelText(/^Lesson 1/i)).toBeInTheDocument()
    expect(screen.queryByText(/sign in to save your progress/i)).not.toBeInTheDocument()
  })
})
