import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Invoice } from "../types";
import Badge from "../components/Badge";

export default function Invoices() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get<Invoice[]>("/invoices")).data,
  });

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
      </div>
      {isLoading ? (
        <div className="page-loading">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">No invoices yet. Generate one from a completed work order.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Issued</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((inv) => (
              <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                <td>#{inv.number}</td>
                <td>{inv.workOrder?.customer?.name}</td>
                <td>{new Date(inv.issuedAt).toLocaleDateString()}</td>
                <td>${inv.total.toFixed(2)}</td>
                <td>${inv.amountPaid.toFixed(2)}</td>
                <td>
                  <Badge value={inv.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
