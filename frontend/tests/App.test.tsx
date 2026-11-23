import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'

// Fixture sintético para el catálogo de interfaz.
const testLocation = {
  id: 'test', name: 'Localidad TEST', region: 'Región TEST', latitude: -1, longitude: -2,
  coordinate_source: 'Fixture TEST', verified: false,
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
})

describe('Catálogo', () => {
  it('informa la carga y muestra una localidad preliminar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([testLocation])))
    render(<App />)
    expect(screen.getByRole('status').textContent).toContain('Cargando')
    expect(await screen.findByRole('heading', { name: 'Localidad TEST' })).toBeTruthy()
    expect(screen.getByText('API disponible')).toBeTruthy()
    expect(screen.getByText('Coordenada preliminar')).toBeTruthy()
  })

  it('reintenta con teclado y distingue un catálogo vacío', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new Error('TEST'))
      .mockResolvedValueOnce(Response.json([])))
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    const retry = screen.getByRole('button', { name: 'Reintentar' })
    for (let i = 0; i < 20 && document.activeElement !== retry; i++) await user.tab()
    expect(document.activeElement).toBe(retry)
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Aún no hay localidades en el catálogo.')).toBeTruthy()
  })
})
