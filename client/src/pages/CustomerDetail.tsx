import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer } from "../types";
import Modal from "../components/Modal";
import Badge from "../components/Badge";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMotoForm, setShowMotoForm] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => (await api.get<Customer>(`/customers/${id}`)).data,
  });

  const addMoto = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/motorcycles", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setShowMotoForm(false);
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: () => api.delete(`/customers/${id}`),
    onSuccess: () => navigate("/customers"),
  });

  if (isLoading || !customer) return <div className="page-loading">Loading…</div>;

  function submitMoto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addMoto.mutate({
      customerId: id,
      make: String(form.get("make") || ""),
      model: String(form.get("model") || ""),
      year: form.get("year") ? Number(form.get("year")) : undefined,
      vin: String(form.get("vin") || "") || undefined,
      licensePlate: String(form.get("licensePlate") || "") || undefined,
      color: String(form.get("color") || "") || undefined,
      mileage: form.get("mileage") ? Number(form.get("mileage")) : undefined,
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>{customer.name}</h1>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm("Delete this customer and all related records?")) deleteCustomer.mutate();
          }}
        >
          Delete customer
        </button>
      </div>

      <div className="grid grid-cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Contact info</h3>
          <p>Phone: {customer.phone || "—"}</p>
          <p>Email: {customer.email || "—"}</p>
          <p>Address: {customer.address || "—"}</p>
          {customer.notes && <p>Notes: {customer.notes}</p>}
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ marginTop: 0 }}>Motorcycles</h3>
            <button className="btn btn-sm" onClick={() => setShowMotoForm(true)}>
              + Add
            </button>
          </div>
          {(customer.motorcycles || []).length === 0 && <p className="muted">No motorcycles on file.</p>}
          {(customer.motorcycles || []).map((m) => (
            <div key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600 }}>
                {m.year} {m.make} {m.model}
              </div>
              <div className="muted" style={{ fontSize: "0.82rem" }}>
                {m.licensePlate || "no plate"} · {m.mileage ?? "?"} mi
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">Work orders</div>
      {(customer as any).workOrders?.length ? (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Complaint</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {(customer as any).workOrders.map((wo: any) => (
              <tr key={wo.id} className="clickable" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                <td>#{wo.number}</td>
                <td>
                  <Badge value={wo.status} />
                </td>
                <td>{wo.complaint || "—"}</td>
                <td>{new Date(wo.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">No work orders yet.</div>
      )}

      <p style={{ marginTop: 20 }}>
        <Link to="/customers" className="muted">
          ← Back to customers
        </Link>
      </p>

      {showMotoForm && (
        <Modal title="Add motorcycle" onClose={() => setShowMotoForm(false)}>
          <form onSubmit={submitMoto}>
            <div className="grid grid-cols-2">
              <div className="field">
                <label>Make</label>
                <input name="make" required />
              </div>
              <div className="field">
                <label>Model</label>
                <input name="model" required />
              </div>
              <div className="field">
                <label>Year</label>
                <input name="year" type="number" />
              </div>
              <div className="field">
                <label>Color</label>
                <input name="color" />
              </div>
              <div className="field">
                <label>VIN</label>
                <input name="vin" />
              </div>
              <div className="field">
                <label>License plate</label>
                <input name="licensePlate" />
              </div>
              <div className="field">
                <label>Mileage</label>
                <input name="mileage" type="number" />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowMotoForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={addMoto.isPending}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
