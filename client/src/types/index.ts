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
  totalAmount: number | string;
  paymentMethod: string;
  status: 'DRAFT' | 'FINALIZED' | 'VOID';
  invoiceNumber?: string | null;
  createdAt: string;
  items: BillItem[];
  cashier?: { id: string; name: string };
  shop?: Shop;
}

export interface ScanResult {
  id: string;
  originalImageUrl: string;
  rawOcrText: string;
  parsed: {
    headerFields: {
      shopName?: string;
      date?: string;
      billNumber?: string;
    };
    lineItems: Array<{
      productName: string;
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
