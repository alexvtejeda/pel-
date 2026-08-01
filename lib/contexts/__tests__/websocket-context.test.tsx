import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { StrictMode } from 'react'

vi.mock('@/lib/api/chat', () => ({ listConversations: vi.fn(async () => ({ data: [], error: null })) }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u-me', role: 'member' } }),
}))

import { WebSocketProvider } from '@/lib/contexts/websocket-context'

/*
  Models the one browser behaviour the bug depended on: `close()` does NOT run
  onclose synchronously. The old guard only survived because a synchronous close
  would have seen its flag still false — in a real browser the next effect run
  had already flipped it back to true by the time onclose landed.
*/
class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 3

  readyState = FakeWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
    setTimeout(() => {
      if (this.readyState !== FakeWebSocket.CONNECTING) return
      this.readyState = FakeWebSocket.OPEN
      this.onopen?.()
    }, 0)
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return
    this.readyState = FakeWebSocket.CLOSED
    setTimeout(() => this.onclose?.(), 0)
  }

  send() {}
}

const liveSockets = () =>
  FakeWebSocket.instances.filter(s => s.readyState !== FakeWebSocket.CLOSED)

beforeEach(() => {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('WebSocketProvider connection lifecycle', () => {
  /*
    Alex saw one sent message counted three times. Nothing was duplicated
    server-side — the browser held more than one live socket, so every frame was
    dispatched once per socket.

    StrictMode reproduces the trigger exactly: setup → teardown → setup on the
    SAME component instance, so the refs survive across runs. That is also what
    Fast Refresh does on every save during development, which is how the extra
    sockets accumulated in a long dev session.
  */
  it('leaves exactly one live socket after a setup/teardown/setup cycle', async () => {
    render(
      <StrictMode>
        <WebSocketProvider>
          <div />
        </WebSocketProvider>
      </StrictMode>
    )

    // Long enough to flush the deferred onclose AND the 1s reconnect backoff a
    // stale socket used to schedule.
    await vi.advanceTimersByTimeAsync(3000)

    expect(liveSockets()).toHaveLength(1)
  })

  /*
    The orphan was invisible in the UI because it was never in wsRef — only the
    ref got overwritten. Pinning the identity is what stops a stale socket from
    reconnecting over the live one.
  */
  it('does not reopen a socket that teardown already retired', async () => {
    const { unmount } = render(
      <WebSocketProvider>
        <div />
      </WebSocketProvider>
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(liveSockets()).toHaveLength(1)

    unmount()
    await vi.advanceTimersByTimeAsync(3000)

    expect(liveSockets()).toHaveLength(0)
  })
})
