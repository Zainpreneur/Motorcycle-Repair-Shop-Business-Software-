import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Customer, WorkOrder } from "../types";
import Modal from "../components/Modal";
import Badge from "../components/Badge";

const STATUSES = ["PENDING", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "INVOICED", "CANCELLED"];

export default function WorkOrders() {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["work-orders", statusFilter],
    queryFn: async () =>
      (await api.get<WorkOrder[]>("/work-orders", { params: { status: statusFilter || undefined } })).data,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: async () => (await api.get<Customer[]>("/customers")).data,
  });

  const { data: technicians } = useQuery({
    queryKey: ["users", "TECHNICIAN"],
    queryFn: async () => (await api.get("/users", { params: { role: "TECHNICIAN" } })).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/work-orders", payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      setShowForm(false);
      navigate(`/work-orders/${res.data.id}`);
    },
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      customerId: String(form.get("customerId") || ""),
      motorcycleId: String(form.get("motorcycleId") || ""),
      technicianId: String(form.get("technicianId") || "") || undefined,
      priority: String(form.get("priority") || "NORMAL"),
      complaint: String(form.get("complaint") || "") || undefined,
      odometerIn: form.get("odometerIn") ? Number(form.get("odometerIn")) : undefined,
    });
  }

  const motos = customers?.find((c) => c.id === selectedCustomer)?.motorcycles || [];

  return (
    <div>
      <div className="page-header">
        <h1>Work Orders</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          + New Work Order
        </button>
      </div>

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="page-loading">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">No work orders found.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Motorcycle</th>
              <th>Technician</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((wo) => (
              <tr key={wo.id} className="clickable" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                <td>#{wo.number}</td>
                <td>{wo.customer?.name}</td>
                <td>
                  {wo.motorcycle?.make} {wo.motorcycle?.model}
                </td>
                <td>{wo.technician?.name || "Unassigned"}</td>
                <td>
                  <Badge value={wo.priority} />
                </td>
                <td>
                  <Badge value={wo.status} />
                </td>
                <td>{new Date(wo.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title="New work order" onClose={() => setShowForm(false)}>
          <form onSubmit={submit}>
            <div className="field">
              <label>Customer</label>
              <select name="customerId" required onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="">Select a customer…</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Motorcycle</label>
              <select name="motorcycleId" required disabled={!selectedCustomer}>
                <option value="">Select a motorcycle…</option>
                {motos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.year} {m.make} {m.model}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2">
              <div className="field">
                <label>Technician</label>
                <select name="technicianId">
                  <option value="">Unassigned</option>
                  {technicians?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Priority</label>
                <select name="priority" defaultValue="NORMAL">
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Odometer in</label>
              <input name="odometerIn" type="number" />
            </div>
            <div className="field">
              <label>Customer complaint / reason for visit</label>
              <textarea name="complaint" rows={3} />
            </div>
            {createMutation.isError && <div className="error-text">Could not create work order.</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={createMutation.isPending}>
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
