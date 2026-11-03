// PUT/GET /files/:id
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { MAX_FILE_SIZE } from '../src/files.js'
import { login, MEMBER, put, setup } from './helpers.js'

let t: ReturnType<typeof setup>
beforeEach(() => {
  t = setup()
  put(t.db, 'users', [MEMBER])
})

const upload = (id: string, body: Uint8Array | string, headers: Record<string, string> = login(t.db, MEMBER)) =>
  t.app.request(`/api/files/${id}`, {
    method: 'PUT', body,
    headers: { 'Content-Type': 'image/jpeg', 'X-File-Name': encodeURIComponent('Radlager äöü.jpg'), ...headers },
  })

describe('files', () => {
  it('round-trip with type, size and file name', async () => {
    const bytes = new Uint8Array([1, 2, 3, 255])
    assert.equal((await upload('photo-1', bytes)).status, 204)
    const res = await t.app.request('/api/files/photo-1')
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/jpeg')
    assert.equal(res.headers.get('content-length'), '4')
    assert.equal(res.headers.get('content-disposition'), `inline; filename*=UTF-8''${encodeURIComponent('Radlager äöü.jpg')}`)
    assert.deepEqual(new Uint8Array(await res.arrayBuffer()), bytes)
  })

  it('the same id may be overwritten', async () => {
    await upload('f', 'eins')
    await upload('f', 'zwei!')
    const res = await t.app.request('/api/files/f')
    assert.equal(await res.text(), 'zwei!')
  })

  it('413 when too large', async () => {
    const res = await upload('big', new Uint8Array(MAX_FILE_SIZE + 1))
    assert.equal(res.status, 413)
    assert.equal((await t.app.request('/api/files/big')).status, 404)
  })

  it('400 for invalid ids', async () => {
    assert.equal((await upload('..%2Fsecret', 'x')).status, 400)
    assert.equal((await upload('a'.repeat(65), 'x')).status, 400)
  })

  it('401 without a session, GET needs none', async () => {
    assert.equal((await upload('f', 'x', { Cookie: '' })).status, 401)
    await upload('f', 'x')
    assert.equal((await t.app.request('/api/files/f')).status, 200)
  })

  it('404 for unknown files', async () => {
    assert.equal((await t.app.request('/api/files/nope')).status, 404)
  })
})
