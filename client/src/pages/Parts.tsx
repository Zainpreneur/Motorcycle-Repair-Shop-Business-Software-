import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Part } from "../types";
import Modal from "../components/Modal";

export default function Parts() {
  const [showForm, setShowForm] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["parts", lowStockOnly],
    queryFn: async () => (await api.get<Part[]>("/parts", { params: { lowStock: lowStockOnly } })).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/parts", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      setShowForm(false);
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      api.post(`/parts/${id}/adjust-stock`, { delta }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["parts"] }),
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      sku: String(form.get("sku") || ""),
      name: String(form.get("name") || ""),
      category: String(form.get("category") || "") || undefined,
      quantityInStock: Number(form.get("quantityInStock") || 0),
      reorderLevel: Number(form.get("reorderLevel") || 5),
      unitCost: Number(form.get("unitCost") || 0),
      unitPrice: Number(form.get("unitPrice") || 0),
      supplier: String(form.get("supplier") || "") || undefined,
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Inventory</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          + New Part
        </button>
      </div>

      <div className="toolbar">
        <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0 }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Show low stock only
        </label>
      </div>

      {isLoading ? (
        <div className="page-loading">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="empty-state">No parts in inventory.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>In stock</th>
              <th>Reorder at</th>
              <th>Unit price</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.category || "—"}</td>
                <td style={{ color: p.quantityInStock <= p.reorderLevel ? "var(--danger)" : undefined }}>
                  {p.quantityInStock}
                </td>
                <td>{p.reorderLevel}</td>
                <td>${p.unitPrice.toFixed(2)}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => adjustMutation.mutate({ id: p.id, delta: -1 })}
                  >
                    −1
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => adjustMutation.mutate({ id: p.id, delta: 1 })}
                  >
                    +1
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <Modal title="New part" onClose={() => setShowForm(false)}>
          <form onSubmit={submit}>
            <div className="grid grid-cols-2">
              <div className="field">
                <label>SKU</label>
                <input name="sku" required />
              </div>
              <div className="field">
                <label>Name</label>
                <input name="name" required />
              </div>
              <div className="field">
                <label>Category</label>
                <input name="category" />
              </div>
              <div className="field">
                <label>Supplier</label>
                <input name="supplier" />
              </div>
              <div className="field">
                <label>Quantity in stock</label>
                <input name="quantityInStock" type="number" defaultValue={0} />
              </div>
              <div className="field">
                <label>Reorder level</label>
                <input name="reorderLevel" type="number" defaultValue={5} />
              </div>
              <div className="field">
                <label>Unit cost</label>
                <input name="unitCost" type="number" step="0.01" defaultValue={0} />
              </div>
              <div className="field">
                <label>Unit price</label>
                <input name="unitPrice" type="number" step="0.01" defaultValue={0} />
              </div>
            </div>
            {createMutation.isError && <div className="error-text">Could not save part.</div>}
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
