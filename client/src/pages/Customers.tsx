import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Customer } from "../types";
import Modal from "../components/Modal";

export default function Customers() {
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", q],
    queryFn: async () => (await api.get<Customer[]>("/customers", { params: { q } })).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Customer>) => api.post("/customers", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: String(form.get("name") || ""),
      email: String(form.get("email") || "") || undefined,
      phone: String(form.get("phone") || "") || undefined,
      address: String(form.get("address") || "") || undefined,
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          + New Customer
        </button>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search by name, email, or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="page-loading">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">No customers yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Motorcycles</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => navigate(`/customers/${c.id}`)}>
                <td>{c.name}</td>
                <td>{c.phone || "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.motorcycles?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title="New customer" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input name="name" required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input name="phone" />
            </div>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" />
            </div>
            <div className="field">
              <label>Address</label>
              <input name="address" />
            </div>
            {createMutation.isError && <div className="error-text">Could not save customer.</div>}
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
