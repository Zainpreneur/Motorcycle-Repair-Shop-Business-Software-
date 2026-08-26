import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Appointment, Customer } from "../types";
import Modal from "../components/Modal";
import Badge from "../components/Badge";

export default function Appointments() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => (await api.get<Appointment[]>("/appointments")).data,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: async () => (await api.get<Customer[]>("/customers")).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/appointments", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowForm(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/appointments/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const [selectedCustomer, setSelectedCustomer] = useState("");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      customerId: String(form.get("customerId") || ""),
      motorcycleId: String(form.get("motorcycleId") || "") || undefined,
      scheduledAt: String(form.get("scheduledAt") || ""),
      reason: String(form.get("reason") || "") || undefined,
    });
  }

  const motos = customers?.find((c) => c.id === selectedCustomer)?.motorcycles || [];

  return (
    <div>
      <div className="page-header">
        <h1>Appointments</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          + New Appointment
        </button>
      </div>

      {isLoading ? (
        <div className="page-loading">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">No appointments scheduled.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date / time</th>
              <th>Customer</th>
              <th>Motorcycle</th>
              <th>Reason</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.scheduledAt).toLocaleString()}</td>
                <td>{a.customer?.name}</td>
                <td>{a.motorcycle ? `${a.motorcycle.make} ${a.motorcycle.model}` : "—"}</td>
                <td>{a.reason || "—"}</td>
                <td>
                  <Badge value={a.status} />
                </td>
                <td>
                  <select
                    value={a.status}
                    onChange={(e) => statusMutation.mutate({ id: a.id, status: e.target.value })}
                  >
                    {["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title="New appointment" onClose={() => setShowForm(false)}>
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
              <label>Motorcycle (optional)</label>
              <select name="motorcycleId">
                <option value="">—</option>
                {motos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.make} {m.model}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date &amp; time</label>
              <input name="scheduledAt" type="datetime-local" required />
            </div>
            <div className="field">
              <label>Reason</label>
              <input name="reason" placeholder="e.g. Oil change" />
            </div>
            {createMutation.isError && <div className="error-text">Could not save appointment.</div>}
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
