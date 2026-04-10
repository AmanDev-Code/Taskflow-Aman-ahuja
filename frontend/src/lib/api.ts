import type {
  AuthResponse,
  Project,
  Task,
  Tag,
  Subtask,
  ProjectMember,
  ProjectMemberResponse,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  UpdateSubtaskInput,
  CreateTagInput,
  UpdateTagInput,
  User,
  UpdateUserInput,
  ChangePasswordInput,
  Activity,
  CreateActivityInput,
  TaskAttachment,
} from '@/types';
import { mapProjectMember } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  data: T;
  message: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiErrorResponse = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const json: ApiResponse<T> = await response.json();
    return json.data;
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<{ access_token: string; user: AuthResponse['user'] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return { token: data.access_token, user: data.user };
  }

  async register(
    name: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    const data = await this.request<{ access_token: string; user: AuthResponse['user'] }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    return { token: data.access_token, user: data.user };
  }

  // Projects
  async getProjects(page?: number, limit?: number): Promise<PaginatedResponse<Project>> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    const queryString = params.toString();
    return this.request<PaginatedResponse<Project>>(
      `/projects${queryString ? `?${queryString}` : ''}`
    );
  }

  async getProject(id: string): Promise<Project & { tasks: Task[] }> {
    return this.request<Project & { tasks: Task[] }>(`/projects/${id}`);
  }

  async createProject(data: CreateProjectInput): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Project Members
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await this.request<ProjectMemberResponse[]>(`/projects/${projectId}/members`);
    return response.map(mapProjectMember);
  }

  async addProjectMember(
    projectId: string,
    email: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<ProjectMember> {
    const response = await this.request<ProjectMemberResponse>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
    return mapProjectMember(response);
  }

  getProjectEventsUrl(projectId: string): string {
    const token = localStorage.getItem('token');
    const url = new URL(`${API_BASE}/events/projects/${projectId}`);
    if (token) {
      // SSE cannot send custom Authorization headers. Backend supports token query fallback.
      url.searchParams.set('token', token);
    }
    return url.toString();
  }

  async removeProjectMember(projectId: string, memberId: string): Promise<void> {
    return this.request(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async searchUsers(query: string, limit = 8): Promise<User[]> {
    const params = new URLSearchParams();
    params.set('query', query);
    params.set('limit', String(limit));
    return this.request<User[]>(`/users/search?${params.toString()}`);
  }

  // Tasks
  async getTasks(projectId: string, filters?: { status?: string; assignee?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assignee) params.append('assignee', filters.assignee);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const queryString = params.toString();
    return this.request<PaginatedResponse<Task>>(
      `/projects/${projectId}/tasks${queryString ? `?${queryString}` : ''}`
    );
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`);
  }

  async createTask(projectId: string, data: CreateTaskInput): Promise<Task> {
    return this.request<Task>(
      `/projects/${projectId}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateTask(
    taskId: string,
    data: UpdateTaskInput
  ): Promise<Task> {
    return this.request<Task>(
      `/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async duplicateTask(taskId: string): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Subtasks
  async getSubtasks(taskId: string): Promise<Subtask[]> {
    return this.request<Subtask[]>(`/tasks/${taskId}/subtasks`);
  }

  async getSubtask(subtaskId: string): Promise<Subtask> {
    return this.request<Subtask>(`/subtasks/${subtaskId}`);
  }

  async createSubtask(taskId: string, data: CreateSubtaskInput): Promise<Subtask> {
    return this.request<Subtask>(`/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubtask(_taskId: string, subtaskId: string, data: UpdateSubtaskInput): Promise<Subtask> {
    return this.request<Subtask>(`/subtasks/${subtaskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSubtask(_taskId: string, subtaskId: string): Promise<void> {
    return this.request(`/subtasks/${subtaskId}`, {
      method: 'DELETE',
    });
  }

  // Tags
  async getTags(projectId: string): Promise<Tag[]> {
    return this.request<Tag[]>(`/projects/${projectId}/tags`);
  }

  async createTag(projectId: string, data: CreateTagInput): Promise<Tag> {
    return this.request<Tag>(`/projects/${projectId}/tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTag(tagId: string, data: UpdateTagInput): Promise<Tag> {
    return this.request<Tag>(`/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTag(tagId: string): Promise<void> {
    return this.request(`/tags/${tagId}`, {
      method: 'DELETE',
    });
  }

  // Stats
  async getProjectStats(projectId: string): Promise<{
    total_tasks: number;
    by_status: Record<string, number>;
    by_assignee: Array<{ assignee_id: string | null; assignee_name: string; count: number }>;
  }> {
    return this.request(`/projects/${projectId}/stats`);
  }

  // AI
  async getAiStatus(): Promise<{ configured: boolean }> {
    return this.request('/ai/status');
  }

  async getAiHelp(data: {
    taskTitle: string;
    taskDescription?: string;
    question: string;
  }): Promise<{ response: string }> {
    return this.request('/ai/help', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateDescription(data: { prompt: string }): Promise<{ description: string }> {
    return this.request('/ai/generate-description', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async suggestSubtasks(data: { taskTitle: string }): Promise<{ subtasks: string[] }> {
    return this.request('/ai/suggest-subtasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User Profile
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/users/me');
  }

  async updateCurrentUser(data: UpdateUserInput): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: ChangePasswordInput): Promise<void> {
    return this.request('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Activities
  async getActivities(taskId: string): Promise<Activity[]> {
    return this.request<Activity[]>(`/tasks/${taskId}/activities`);
  }

  async getSubtaskActivities(subtaskId: string): Promise<Activity[]> {
    return this.request<Activity[]>(`/subtasks/${subtaskId}/activities`);
  }

  async createActivity(taskId: string, data: CreateActivityInput): Promise<Activity> {
    return this.request<Activity>(`/tasks/${taskId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createSubtaskActivity(subtaskId: string, data: CreateActivityInput): Promise<Activity> {
    return this.request<Activity>(`/subtasks/${subtaskId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createComment(taskId: string, content: string): Promise<Activity> {
    return this.request<Activity>(`/tasks/${taskId}/activities/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async createSubtaskComment(subtaskId: string, content: string): Promise<Activity> {
    return this.request<Activity>(`/subtasks/${subtaskId}/activities/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Search
  async searchProjectsLocal(query: string): Promise<Project[]> {
    const result = await this.getProjects(1, 100);
    const q = query.toLowerCase();
    return result.items.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description?.toLowerCase().includes(q)
    );
  }

  async searchTasksAcrossProjects(query: string): Promise<Task[]> {
    const projectsResult = await this.getProjects(1, 50);
    const allTasks: Task[] = [];
    const q = query.toLowerCase();
    
    for (const project of projectsResult.items) {
      try {
        const tasksResult = await this.getTasks(project.id, { limit: 100 });
        const matchingTasks = tasksResult.items.filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
        );
        allTasks.push(...matchingTasks);
      } catch {
        // Skip projects with errors
      }
    }
    
    return allTasks.slice(0, 20);
  }

  // Time Tracking (Fastify rejects empty body with Content-Type: application/json)
  async startTimer(taskId: string): Promise<{ startedAt: string }> {
    return this.request(`/tasks/${taskId}/time/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async stopTimer(taskId: string): Promise<{ elapsedMinutes: number; totalTimeSpent: number }> {
    return this.request(`/tasks/${taskId}/time/stop`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getTimerStatus(taskId: string): Promise<{
    isRunning: boolean;
    startedAt: string | null;
    elapsedMinutes: number;
    totalTimeSpent: number;
  }> {
    return this.request(`/tasks/${taskId}/time/status`);
  }

  async addManualTime(taskId: string, minutes: number): Promise<{ totalTimeSpent: number }> {
    return this.request(`/tasks/${taskId}/time/add`, {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    });
  }

  async startSubtaskTimer(subtaskId: string): Promise<{ startedAt: string }> {
    return this.request(`/subtasks/${subtaskId}/time/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async stopSubtaskTimer(subtaskId: string): Promise<{ elapsedMinutes: number; totalTimeSpent: number }> {
    return this.request(`/subtasks/${subtaskId}/time/stop`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getSubtaskTimerStatus(subtaskId: string): Promise<{
    isRunning: boolean;
    startedAt: string | null;
    elapsedMinutes: number;
    totalTimeSpent: number;
  }> {
    return this.request(`/subtasks/${subtaskId}/time/status`);
  }

  async addSubtaskManualTime(subtaskId: string, minutes: number): Promise<{ totalTimeSpent: number }> {
    return this.request(`/subtasks/${subtaskId}/time/add`, {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    });
  }

  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    return this.request<TaskAttachment[]>(`/tasks/${taskId}/attachments`);
  }

  async uploadTaskAttachment(taskId: string, file: File): Promise<TaskAttachment> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const err: ApiErrorResponse = await response.json().catch(() => ({
        message: 'Upload failed',
      }));
      throw new Error(err.error || err.message || 'Upload failed');
    }
    const json: ApiResponse<TaskAttachment> = await response.json();
    return json.data;
  }

  async getSubtaskAttachments(subtaskId: string): Promise<TaskAttachment[]> {
    return this.request<TaskAttachment[]>(`/subtasks/${subtaskId}/attachments`);
  }

  async uploadSubtaskAttachment(subtaskId: string, file: File): Promise<TaskAttachment> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/subtasks/${subtaskId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const err: ApiErrorResponse = await response.json().catch(() => ({
        message: 'Upload failed',
      }));
      throw new Error(err.error || err.message || 'Upload failed');
    }
    const json: ApiResponse<TaskAttachment> = await response.json();
    return json.data;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.request(`/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  async getAttachmentPresignedUrl(attachmentId: string): Promise<{
    url: string;
    previewUrl?: string;
    downloadUrl?: string;
    filename: string;
    mimeType: string;
    expiresIn: number;
  }> {
    return this.request(`/attachments/${attachmentId}/url`);
  }
}

export const api = new ApiClient();
