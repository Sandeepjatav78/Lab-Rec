const BASE = import.meta.env.VITE_API_URL || "https://lab-rec.vercel.app/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
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
};
