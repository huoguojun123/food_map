import { apiClient } from './client'

export interface AiPlanSpot {
  id: number
  name: string
  address_text?: string
  taste?: string
  summary?: string
  distance_km?: number
}

export interface AiPlanRequest {
  intent: string
  spots: AiPlanSpot[]
}

export interface AiPlanResponse {
  title: string
  summary: string
  order?: number[]
}

export async function generateAiPlan(payload: AiPlanRequest): Promise<AiPlanResponse> {
  return apiClient.post<AiPlanResponse>('/api/ai/plan', payload)
}
