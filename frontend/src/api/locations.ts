import { request } from './request'

export interface Location {
  id: string
  name: string
  region: string
  latitude: number
  longitude: number
  coordinate_source: string
  verified: boolean
}

export async function getLocations(signal: AbortSignal): Promise<Location[]> {
  return (await request('/locations', signal)).json()
}
