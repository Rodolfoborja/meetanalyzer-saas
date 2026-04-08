import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface Meeting {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration: number; // in seconds
  speakers: string[];
  createdAt: string;
  summary?: string;
  actionItems?: ActionItem[];
  transcript?: TranscriptSegment[];
}

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface DashboardStats {
  totalMeetings: number;
  minutesUsed: number;
  minutesLimit: number;
  actionItemsTotal: number;
  actionItemsCompleted: number;
}

export interface UsageHistory {
  date: string;
  minutes: number;
}

// API functions

// Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/api/dashboard/stats');
  return data;
}

export async function getUsageHistory(): Promise<UsageHistory[]> {
  const { data } = await api.get('/api/dashboard/usage');
  return data;
}

export async function getRecentMeetings(limit = 5): Promise<Meeting[]> {
  const { data } = await api.get('/api/meetings', { params: { limit, sort: '-createdAt' } });
  return data.data || data;
}

// Meetings
export interface MeetingsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
}

export interface MeetingsPaginated {
  data: Meeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getMeetings(query: MeetingsQuery = {}): Promise<MeetingsPaginated> {
  const { data } = await api.get('/api/meetings', { params: query });
  return data;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data } = await api.get(`/api/meetings/${id}`);
  return data;
}

export async function createMeeting(formData: FormData, onProgress?: (progress: number) => void): Promise<Meeting> {
  const { data } = await api.post('/api/meetings', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
  return data;
}

export async function updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
  const { data } = await api.patch(`/api/meetings/${id}`, updates);
  return data;
}

export async function deleteMeeting(id: string): Promise<void> {
  await api.delete(`/api/meetings/${id}`);
}

export async function updateActionItem(
  meetingId: string,
  itemId: string,
  updates: Partial<ActionItem>
): Promise<ActionItem> {
  const { data } = await api.patch(`/api/meetings/${meetingId}/action-items/${itemId}`, updates);
  return data;
}

export async function updateSpeakerName(
  meetingId: string,
  oldName: string,
  newName: string
): Promise<void> {
  await api.patch(`/api/meetings/${meetingId}/speakers`, { oldName, newName });
}

// User/Settings
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const { data } = await api.patch('/api/users/me', updates);
  return data;
}

export async function getOrganization(): Promise<Organization> {
  const { data } = await api.get('/api/organization');
  return data;
}

export async function updateOrganization(updates: Partial<Organization>): Promise<Organization> {
  const { data } = await api.patch('/api/organization', updates);
  return data;
}

export async function getApiKeys(): Promise<ApiKey[]> {
  const { data } = await api.get('/api/api-keys');
  return data;
}

export async function createApiKey(name: string): Promise<{ key: ApiKey; secret: string }> {
  const { data } = await api.post('/api/api-keys', { name });
  return data;
}

export async function deleteApiKey(id: string): Promise<void> {
  await api.delete(`/api/api-keys/${id}`);
}
