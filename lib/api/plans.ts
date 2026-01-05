import { apiClient } from './client'
import type { CreateTripPlanDto, TripPlan } from '@/lib/types/index'

export async function listPlans(): Promise<TripPlan[]> {
  const response = await apiClient.get<{ plans: TripPlan[] }>('/api/plans')
  return response.plans
}

export async function createPlan(payload: CreateTripPlanDto): Promise<TripPlan> {
  return apiClient.post<TripPlan>('/api/plans', payload)
}

export async function deletePlan(id: number): Promise<void> {
  await apiClient.delete(`/api/plans/${id}`)
}
