import { apiClient } from './client'

export type SettingsPayload = {
  aiKey?: string
  aiBaseUrl?: string
  aiModel?: string
  amapKey?: string
}

export type SettingsResponse = {
  success: boolean
  message?: string
  note?: string
}

export async function saveSettings(
  data: SettingsPayload
): Promise<SettingsResponse> {
  return apiClient.post<SettingsResponse>('/api/settings', data)
}

export type SettingsTestResponse = {
  success: boolean
  ai?: {
    ok: boolean
    message: string
  }
  amap?: {
    ok: boolean
    message: string
  }
}

export async function testSettings(
  data: SettingsPayload
): Promise<SettingsTestResponse> {
  return apiClient.post<SettingsTestResponse>('/api/settings/test', data)
}
