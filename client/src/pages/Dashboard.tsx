import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DashboardSummary } from "../types";

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
  });

  if (isLoading || !data) return <div className="page-loading">Loading dashboard…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="grid grid-cols-4">
        <div className="stat-card">
          <div className="stat-value">{data.openWorkOrders}</div>
          <div className="stat-label">Open work orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.inProgress}</div>
          <div className="stat-label">In progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.waitingParts}</div>
          <div className="stat-label">Waiting on parts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.completedToday}</div>
          <div className="stat-label">Completed today</div>
        </div>
      </div>

      <div className="grid grid-cols-4" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-value">{money(data.outstandingBalance)}</div>
          <div className="stat-label">Outstanding balance ({data.outstandingInvoices} invoices)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{money(data.revenueThisMonth)}</div>
          <div className="stat-label">Revenue this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.totalCustomers}</div>
          <div className="stat-label">Total customers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.lowStockCount}</div>
          <div className="stat-label">Parts low on stock</div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ marginTop: 24 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Upcoming appointments</h3>
          {data.upcomingAppointments.length === 0 && <p className="muted">Nothing scheduled.</p>}
          {data.upcomingAppointments.map((a) => (
            <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600 }}>{a.customer?.name}</div>
              <div className="muted" style={{ fontSize: "0.82rem" }}>
                {new Date(a.scheduledAt).toLocaleString()} — {a.reason || "General visit"}
              </div>
            </div>
          ))}
          <Link to="/appointments" className="muted" style={{ fontSize: "0.85rem" }}>
            View all appointments →
          </Link>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Low stock parts</h3>
          {data.lowStockParts.length === 0 && <p className="muted">Inventory looks healthy.</p>}
          {data.lowStockParts.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>{p.name}</span>
              <span className="muted">
                {p.quantityInStock} / {p.reorderLevel} min
              </span>
            </div>
          ))}
          <Link to="/parts" className="muted" style={{ fontSize: "0.85rem" }}>
            View inventory →
          </Link>
        </div>
      </div>
    </div>
  );
}
