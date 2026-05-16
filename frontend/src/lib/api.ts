import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

export const auth = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post("/auth/signup", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

export const notes = {
  list: (params?: { search?: string; tag?: string; archived?: boolean }) =>
    api.get("/notes", { params }),
  get: (id: string) => api.get(`/notes/${id}`),
  create: (data: { title?: string; content?: string; tags?: string[] }) =>
    api.post("/notes", data),
  update: (id: string, data: any) => api.patch(`/notes/${id}`, data),
  delete: (id: string) => api.delete(`/notes/${id}`),
  tags: () => api.get("/notes/tags/all"),
};

export const aiApi = {
  generateSummary: (note_id: string) =>
    api.post("/ai/generate-summary", { note_id }),
};

export const shareApi = {
  generate: (note_id: string) => api.post(`/shared/generate/${note_id}`),
  revoke: (note_id: string) => api.delete(`/shared/revoke/${note_id}`),
  getPublic: (share_id: string) =>
    axios.get(`/api/shared/${share_id}`),
};

export const insightsApi = {
  get: () => api.get("/insights"),
};
