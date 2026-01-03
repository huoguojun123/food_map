import { apiClient } from './client'

export type SettingsPayload = {
  aiKey: string
  aiBaseUrl: string
  aiModel: string
  amapKey: string
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
