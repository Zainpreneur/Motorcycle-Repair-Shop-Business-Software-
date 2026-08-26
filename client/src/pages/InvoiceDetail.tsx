import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Invoice } from "../types";
import Badge from "../components/Badge";
import Modal from "../components/Modal";

export default function InvoiceDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => (await api.get<Invoice>(`/invoices/${id}`)).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoice", id] });

  const addPayment = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post(`/invoices/${id}/payments`, payload),
    onSuccess: () => {
      invalidate();
      setShowPayment(false);
    },
    onError: (err: any) => alert(err?.response?.data?.error || "Could not record payment"),
  });

  const voidInvoice = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/void`),
    onSuccess: invalidate,
  });

  if (isLoading || !invoice) return <div className="page-loading">Loading…</div>;

  const balance = invoice.total - invoice.amountPaid;

  function submitPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addPayment.mutate({
      amount: Number(form.get("amount") || 0),
      method: String(form.get("method") || "cash"),
      notes: String(form.get("notes") || "") || undefined,
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          Invoice #{invoice.number} <Badge value={invoice.status} />
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          {balance > 0 && invoice.status !== "VOID" && (
            <button className="btn" onClick={() => setShowPayment(true)}>
              Record Payment
            </button>
          )}
          {invoice.status !== "VOID" && invoice.status !== "PAID" && (
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm("Void this invoice?")) voidInvoice.mutate();
              }}
            >
              Void
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Bill to</h3>
          <p>{invoice.workOrder?.customer?.name}</p>
          <p className="muted">{invoice.workOrder?.customer?.phone}</p>
          <p className="muted">{invoice.workOrder?.customer?.email}</p>
          <p style={{ marginTop: 12 }}>
            <Link to={`/work-orders/${invoice.workOrderId}`}>View source work order →</Link>
          </p>
        </div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Subtotal</span>
            <span>${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Tax ({invoice.taxRate}%)</span>
            <span>${invoice.tax.toFixed(2)}</span>
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
            <span>Total</span>
            <span>${invoice.total.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span className="muted">Paid</span>
            <span>${invoice.amountPaid.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>Balance due</span>
            <span>${balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="section-title">Line items</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Type</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.workOrder?.services?.map((l: any) => (
            <tr key={l.id}>
              <td>{l.description}</td>
              <td>Labor</td>
              <td>${l.total.toFixed(2)}</td>
            </tr>
          ))}
          {invoice.workOrder?.parts?.map((l: any) => (
            <tr key={l.id}>
              <td>
                {l.part?.name} × {l.quantity}
              </td>
              <td>Part</td>
              <td>${l.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section-title">Payments</div>
      {invoice.payments && invoice.payments.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {invoice.payments.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.paidAt).toLocaleString()}</td>
                <td>{p.method}</td>
                <td>${p.amount.toFixed(2)}</td>
                <td>{p.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">No payments recorded yet.</div>
      )}

      {showPayment && (
        <Modal title="Record payment" onClose={() => setShowPayment(false)}>
          <form onSubmit={submitPayment}>
            <div className="field">
              <label>Amount (balance: ${balance.toFixed(2)})</label>
              <input name="amount" type="number" step="0.01" max={balance} defaultValue={balance} required />
            </div>
            <div className="field">
              <label>Method</label>
              <select name="method" defaultValue="cash">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label>Notes</label>
              <input name="notes" />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPayment(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={addPayment.isPending}>
                Record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
