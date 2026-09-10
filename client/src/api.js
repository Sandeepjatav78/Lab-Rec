import { getToken, clearToken } from "./auth.js";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401 && path !== "/auth/login") {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expired — please log in again");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

export function login(password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export const api = {
  getLabs: () => request("/labs"),
  createLab: (payload) =>
    request("/labs", { method: "POST", body: JSON.stringify(payload) }),
  updateLab: (id, payload) =>
    request(`/labs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteLab: (id) => request(`/labs/${id}`, { method: "DELETE" }),

  getChemicals: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.lab && params.lab !== "all") qs.set("lab", params.lab);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request(`/chemicals${suffix}`);
  },
  getChemicalSuggestions: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.lab && params.lab !== "all") qs.set("lab", params.lab);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request(`/chemicals/suggestions${suffix}`);
  },
  createChemical: (payload) =>
    request("/chemicals", { method: "POST", body: JSON.stringify(payload) }),
  updateChemical: (id, payload) =>
    request(`/chemicals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteChemical: (id) => request(`/chemicals/${id}`, { method: "DELETE" }),

  getRequirements: (week) =>
    request(`/requirements${week ? `?week=${week}` : ""}`),
  createRequirement: (payload) =>
    request("/requirements", { method: "POST", body: JSON.stringify(payload) }),
  updateRequirement: (id, payload) =>
    request(`/requirements/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteRequirement: (id) => request(`/requirements/${id}`, { method: "DELETE" }),
  completeRequirement: (id, date) =>
    request(`/requirements/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ date }),
    }),
  uncompleteRequirement: (id, date) =>
    request(`/requirements/${id}/uncomplete`, {
      method: "POST",
      body: JSON.stringify({ date }),
    }),

  previewImport: (fileBase64) =>
    request("/import/preview", {
      method: "POST",
      body: JSON.stringify({ fileBase64 }),
    }),
  importExcel: (fileBase64) =>
    request("/import/excel", {
      method: "POST",
      body: JSON.stringify({ fileBase64 }),
    }),
  importChemicalList: (fileBase64, lab, includeStruck = false) =>
    request("/import/list", {
      method: "POST",
      body: JSON.stringify({ fileBase64, lab, includeStruck }),
    }),

  getExperiments: (q) =>
    request(`/experiments${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createExperiment: (payload) =>
    request("/experiments", { method: "POST", body: JSON.stringify(payload) }),
  createExperimentsBulk: (experiments) =>
    request("/experiments/bulk", {
      method: "POST",
      body: JSON.stringify({ experiments }),
    }),
  updateExperiment: (id, payload) =>
    request(`/experiments/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteExperiment: (id) => request(`/experiments/${id}`, { method: "DELETE" }),
  deleteExperiments: (ids) =>
    request("/experiments/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  previewExperimentsPdf: (fileBase64) =>
    request("/experiments/preview", {
      method: "POST",
      body: JSON.stringify({ fileBase64 }),
    }),
};
