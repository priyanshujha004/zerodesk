import { apiGet, apiPost } from './api';
import type { UserDto } from '../types';

export async function getUser(): Promise<UserDto | null> {
  try {
    return await apiGet<UserDto>('/auth/me');
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiPost('/auth/logout');
  } catch {
    // Even if the API call fails, redirect to login
  }
  window.location.href = '/login';
}
