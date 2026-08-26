import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Service } from "../types";
import Modal from "../components/Modal";

export default function Services() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await api.get<Service[]>("/services")).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/services", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowForm(false);
    },
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: String(form.get("name") || ""),
      category: String(form.get("category") || "") || undefined,
      defaultRate: Number(form.get("defaultRate") || 0),
      estimatedHours: Number(form.get("estimatedHours") || 0),
      description: String(form.get("description") || "") || undefined,
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Service Catalog</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          + New Service
        </button>
      </div>

      {isLoading ? (
        <div className="page-loading">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">No services defined yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Est. hours</th>
              <th>Default rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.category || "—"}</td>
                <td>{s.estimatedHours}</td>
                <td>${s.defaultRate.toFixed(2)}/hr</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title="New service" onClose={() => setShowForm(false)}>
          <form onSubmit={submit}>
            <div className="field">
              <label>Name</label>
              <input name="name" required />
            </div>
            <div className="field">
              <label>Category</label>
              <input name="category" />
            </div>
            <div className="grid grid-cols-2">
              <div className="field">
                <label>Estimated hours</label>
                <input name="estimatedHours" type="number" step="0.25" defaultValue={1} />
              </div>
              <div className="field">
                <label>Default hourly rate</label>
                <input name="defaultRate" type="number" step="0.01" defaultValue={95} />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea name="description" rows={2} />
            </div>
            {createMutation.isError && <div className="error-text">Could not save service.</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={createMutation.isPending}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
