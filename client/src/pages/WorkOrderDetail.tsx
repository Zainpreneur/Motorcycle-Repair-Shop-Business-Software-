import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Part, Service, WorkOrder } from "../types";
import Badge from "../components/Badge";
import Modal from "../components/Modal";

const STATUSES = ["PENDING", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "INVOICED", "CANCELLED"];

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showPartForm, setShowPartForm] = useState(false);

  const { data: wo, isLoading } = useQuery({
    queryKey: ["work-order", id],
    queryFn: async () => (await api.get<WorkOrder>(`/work-orders/${id}`)).data,
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await api.get<Service[]>("/services")).data,
  });

  const { data: parts } = useQuery({
    queryKey: ["parts", false],
    queryFn: async () => (await api.get<Part[]>("/parts")).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["work-order", id] });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.put(`/work-orders/${id}`, payload),
    onSuccess: invalidate,
  });

  const addService = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post(`/work-orders/${id}/services`, payload),
    onSuccess: () => {
      invalidate();
      setShowServiceForm(false);
    },
  });

  const removeService = useMutation({
    mutationFn: (lineId: string) => api.delete(`/work-orders/${id}/services/${lineId}`),
    onSuccess: invalidate,
  });

  const addPart = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post(`/work-orders/${id}/parts`, payload),
    onSuccess: () => {
      invalidate();
      setShowPartForm(false);
    },
    onError: (err: any) => alert(err?.response?.data?.error || "Could not add part"),
  });

  const removePart = useMutation({
    mutationFn: (lineId: string) => api.delete(`/work-orders/${id}/parts/${lineId}`),
    onSuccess: invalidate,
  });

  const generateInvoice = useMutation({
    mutationFn: () => api.post("/invoices/generate", { workOrderId: id, taxRate: 8 }),
    onSuccess: (res) => navigate(`/invoices/${res.data.id}`),
    onError: (err: any) => alert(err?.response?.data?.error || "Could not generate invoice"),
  });

  if (isLoading || !wo) return <div className="page-loading">Loading…</div>;

  const laborTotal = (wo.services || []).reduce((s, l) => s + l.total, 0);
  const partsTotal = (wo.parts || []).reduce((s, l) => s + l.total, 0);

  function submitService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const serviceId = String(form.get("serviceId") || "");
    const chosen = services?.find((s) => s.id === serviceId);
    addService.mutate({
      serviceId: serviceId || undefined,
      description: String(form.get("description") || chosen?.name || ""),
      laborHours: Number(form.get("laborHours") || chosen?.estimatedHours || 0),
      laborRate: Number(form.get("laborRate") || chosen?.defaultRate || 0),
    });
  }

  function submitPart(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addPart.mutate({
      partId: String(form.get("partId") || ""),
      quantity: Number(form.get("quantity") || 1),
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          Work Order #{wo.number} <Badge value={wo.status} />
        </h1>
        {!wo.invoice && wo.status !== "CANCELLED" && (
          <button className="btn" onClick={() => generateInvoice.mutate()} disabled={generateInvoice.isPending}>
            Generate Invoice
          </button>
        )}
        {wo.invoice && (
          <Link className="btn btn-secondary" to={`/invoices/${wo.invoice.id}`}>
            View Invoice #{wo.invoice.number}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            <Link to={`/customers/${wo.customerId}`}>{wo.customer?.name}</Link>
          </h3>
          <p className="muted">
            {wo.motorcycle?.year} {wo.motorcycle?.make} {wo.motorcycle?.model} ·{" "}
            {wo.motorcycle?.licensePlate || "no plate"}
          </p>
          <p>Odometer in: {wo.odometerIn ?? "—"}</p>
          <p>Complaint: {wo.complaint || "—"}</p>

          <div className="field">
            <label>Diagnosis / notes</label>
            <textarea
              defaultValue={wo.diagnosis || ""}
              rows={3}
              onBlur={(e) => updateMutation.mutate({ diagnosis: e.target.value })}
            />
          </div>
        </div>

        <div className="card">
          <div className="field">
            <label>Status</label>
            <select value={wo.status} onChange={(e) => updateMutation.mutate({ status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select value={wo.priority} onChange={(e) => updateMutation.mutate({ priority: e.target.value })}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            Created {new Date(wo.createdAt).toLocaleString()}
            {wo.completedAt && <> · Completed {new Date(wo.completedAt).toLocaleString()}</>}
          </p>
        </div>
      </div>

      <div className="section-title">Labor / Services</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Hours</th>
            <th>Rate</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(wo.services || []).map((l) => (
            <tr key={l.id}>
              <td>{l.description}</td>
              <td>{l.laborHours}</td>
              <td>${l.laborRate.toFixed(2)}</td>
              <td>${l.total.toFixed(2)}</td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => removeService.mutate(l.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {(wo.services || []).length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No labor lines yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowServiceForm(true)}>
        + Add labor line
      </button>

      <div className="section-title">Parts used</div>
      <table>
        <thead>
          <tr>
            <th>Part</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(wo.parts || []).map((l) => (
            <tr key={l.id}>
              <td>{l.part?.name}</td>
              <td>{l.quantity}</td>
              <td>${l.unitPrice.toFixed(2)}</td>
              <td>${l.total.toFixed(2)}</td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => removePart.mutate(l.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {(wo.parts || []).length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No parts added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowPartForm(true)}>
        + Add part
      </button>

      <div className="card" style={{ marginTop: 20, maxWidth: 320, marginLeft: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="muted">Labor</span>
          <span>${laborTotal.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="muted">Parts</span>
          <span>${partsTotal.toFixed(2)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid var(--border)",
          }}
        >
          <span>Subtotal</span>
          <span>${(laborTotal + partsTotal).toFixed(2)}</span>
        </div>
      </div>

      {showServiceForm && (
        <Modal title="Add labor line" onClose={() => setShowServiceForm(false)}>
          <form onSubmit={submitService}>
            <div className="field">
              <label>From catalog (optional)</label>
              <select
                name="serviceId"
                onChange={(e) => {
                  const svc = services?.find((s) => s.id === e.target.value);
                  const form = e.currentTarget.form!;
                  if (svc) {
                    (form.elements.namedItem("description") as HTMLInputElement).value = svc.name;
                    (form.elements.namedItem("laborHours") as HTMLInputElement).value = String(svc.estimatedHours);
                    (form.elements.namedItem("laborRate") as HTMLInputElement).value = String(svc.defaultRate);
                  }
                }}
              >
                <option value="">Custom line…</option>
                {services?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <input name="description" required />
            </div>
            <div className="grid grid-cols-2">
              <div className="field">
                <label>Hours</label>
                <input name="laborHours" type="number" step="0.25" defaultValue={1} />
              </div>
              <div className="field">
                <label>Rate ($/hr)</label>
                <input name="laborRate" type="number" step="0.01" defaultValue={95} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowServiceForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={addService.isPending}>
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showPartForm && (
        <Modal title="Add part" onClose={() => setShowPartForm(false)}>
          <form onSubmit={submitPart}>
            <div className="field">
              <label>Part</label>
              <select name="partId" required>
                <option value="">Select a part…</option>
                {parts?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.quantityInStock} in stock) — ${p.unitPrice.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Quantity</label>
              <input name="quantity" type="number" min={1} defaultValue={1} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPartForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={addPart.isPending}>
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
