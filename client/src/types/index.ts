export type Role = "ADMIN" | "MANAGER" | "TECHNICIAN" | "FRONTDESK";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  motorcycles?: Motorcycle[];
}

export interface Motorcycle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year?: number | null;
  vin?: string | null;
  licensePlate?: string | null;
  color?: string | null;
  mileage?: number | null;
  notes?: string | null;
  customer?: Customer;
}

export type WorkOrderStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "WAITING_PARTS"
  | "COMPLETED"
  | "INVOICED"
  | "CANCELLED";

export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  defaultRate: number;
  estimatedHours: number;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  quantityInStock: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  supplier?: string | null;
}

export interface WorkOrderService {
  id: string;
  workOrderId: string;
  serviceId?: string | null;
  description: string;
  laborHours: number;
  laborRate: number;
  total: number;
}

export interface WorkOrderPart {
  id: string;
  workOrderId: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  part?: Part;
}

export interface Invoice {
  id: string;
  number: number;
  workOrderId: string;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: "UNPAID" | "PARTIAL" | "PAID" | "VOID";
  issuedAt: string;
  dueAt?: string | null;
  paidAt?: string | null;
  payments?: Payment[];
  workOrder?: WorkOrder;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  notes?: string | null;
  paidAt: string;
}

export interface WorkOrder {
  id: string;
  number: number;
  customerId: string;
  motorcycleId: string;
  technicianId?: string | null;
  status: WorkOrderStatus;
  priority: Priority;
  complaint?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  odometerIn?: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  customer?: Customer;
  motorcycle?: Motorcycle;
  technician?: { id: string; name: string; email: string } | null;
  services?: WorkOrderService[];
  parts?: WorkOrderPart[];
  invoice?: Invoice | null;
}

export interface Appointment {
  id: string;
  customerId: string;
  motorcycleId?: string | null;
  scheduledAt: string;
  reason?: string | null;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  notes?: string | null;
  customer?: Customer;
  motorcycle?: Motorcycle;
}

export interface DashboardSummary {
  openWorkOrders: number;
  inProgress: number;
  waitingParts: number;
  completedToday: number;
  outstandingInvoices: number;
  outstandingBalance: number;
  lowStockCount: number;
  lowStockParts: Part[];
  upcomingAppointments: Appointment[];
  totalCustomers: number;
  revenueThisMonth: number;
}
