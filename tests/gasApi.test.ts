import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '../services/gasApi'

describe('Gas API wrapper', () => {
  beforeEach(() => {
    // reset mocks before each test
    // @ts-ignore
    global.fetch && global.fetch.mockClear?.()
  })

  it('sends correct payload for getRole', async () => {
    const mockText = JSON.stringify({ success: true, data: { ok: true } })
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockText
    })

    const res = await (api as any).getRole()
    expect(global.fetch).toHaveBeenCalled()
    const url = (global.fetch as any).mock.calls[0][0]
    expect(url).toContain('script.google.com')
    const opts = (global.fetch as any).mock.calls[0][1]
    expect(opts).toBeTruthy()
    const body = JSON.parse(opts.body)
    expect(body.functionName).toBe('getRole')
  })

  it('throws on non-ok response', async () => {
    // @ts-ignore
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error', text: async () => '' })
    await expect((api as any).getRole()).rejects.toBeTruthy()
  })
})
