import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Motorcycle } from "../types";

export default function Motorcycles() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["motorcycles"],
    queryFn: async () => (await api.get<Motorcycle[]>("/motorcycles")).data,
  });

  return (
    <div>
      <div className="page-header">
        <h1>Motorcycles</h1>
      </div>
      {isLoading ? (
        <div className="page-loading">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">No motorcycles on file yet. Add one from a customer's page.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Owner</th>
              <th>Make / Model</th>
              <th>Year</th>
              <th>Plate</th>
              <th>Mileage</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id} className="clickable" onClick={() => navigate(`/customers/${m.customerId}`)}>
                <td>{m.customer?.name}</td>
                <td>
                  {m.make} {m.model}
                </td>
                <td>{m.year || "—"}</td>
                <td>{m.licensePlate || "—"}</td>
                <td>{m.mileage ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
