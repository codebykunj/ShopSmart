export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'STAFF';
}

export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  category: string;
  unitPrice: number | string;
  costPrice?: number | string | null;
  quantityInStock: number;
  reorderThreshold: number;
  sku?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  id: string;
  billId: string;
  productId?: string | null;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number | string;
  lineTotal: number | string;
}

export interface Bill {
  id: string;
  shopId: string;
  cashierId: string;
  customerId?: string | null;
  totalAmount: number | string;
  paymentMethod: string;
  status: 'DRAFT' | 'FINALIZED' | 'VOID';
  invoiceNumber?: string | null;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  discountAmount?: number | string;
  createdAt: string;
  items: BillItem[];
  cashier?: { id: string; name: string };
  shop?: Shop;
  customerName?: string | null;
  customerMobile?: string | null;
}

export interface ScanResult {
  id: string;
  originalImageUrl: string;
  rawOcrText: string;
  parsed: {
    headerFields?: {
      shopName?: string;
      date?: string;
      billNumber?: string;
    };
    supplierInfo?: {
      name?: string;
      invoiceNo?: string;
      date?: string;
    };
    lineItems?: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      confidence: number;
    }>;
    items?: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      confidence: number;
    }>;
    overallConfidence: number;
  };
  status: 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED';
}

export interface SalesData {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    totalItemsSold: number;
    avgTransaction: number;
  };
  chartData: Array<{
    date: string;
    revenue: number;
    transactions: number;
    itemsSold: number;
  }>;
  range: string;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

// Cart item for billing terminal
export interface CartItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// Scanned product item for inventory import
export interface ScannedProductItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  sku?: string;
  expiryDate?: string;
  include: boolean;
  updatePriceIfExists: boolean;
  existingMatch?: boolean; // true if a product with same name exists
}

// Customer for loyalty system
export interface Customer {
  id: string;
  shopId: string;
  name: string;
  mobile: string;
  email?: string | null;
  totalSpent: number | string;
  loyaltyPoints: number;
  visitCount: number;
  lastVisitAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { bills: number };
}

// Notification
export interface Notification {
  id: string;
  shopId: string;
  userId?: string | null;
  type: 'LOW_STOCK' | 'EXPIRY_WARNING' | 'DAILY_SUMMARY' | 'DEMAND_SPIKE' | 'VOID_BILL' | 'STOCK_IMPORTED' | 'GENERAL';
  title: string;
  message: string;
  isRead: boolean;
  data?: any;
  createdAt: string;
}

// Activity Log
export interface ActivityLogEntry {
  id: string;
  shopId: string;
  userId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: any;
  createdAt: string;
  user?: { id: string; name: string; role: string };
}

// Reorder Suggestion
export interface ReorderSuggestion {
  productId: string;
  name: string;
  category: string;
  currentStock: number;
  reorderThreshold: number;
  unitsSoldLast30Days: number;
  dailySalesRate: number;
  daysOfStockLeft: number;
  suggestedOrderQty: number;
  estimatedCost: number;
  urgency: 'critical' | 'urgent' | 'normal' | 'ok';
}
