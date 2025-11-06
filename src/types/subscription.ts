export interface Subscription {
  id: string;
  user_id: string;
  purchase_token: string;
  product_id: string;
  purchase_time: string;
  expiry_time: string;
  is_active: boolean;
  auto_renewing: boolean;
  created_at: string;
  updated_at: string;
}

export interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<ItemDetails[]>;
  listPurchases(): Promise<PurchaseDetails[]>;
  consume(purchaseToken: string): Promise<void>;
}

export interface ItemDetails {
  itemId: string;
  title: string;
  price: {
    currency: string;
    value: string;
  };
  description: string;
  subscriptionPeriod?: string;
}

export interface PurchaseDetails {
  itemId: string;
  purchaseToken: string;
}

export interface PaymentRequestData {
  supportedMethods: string;
  data: {
    sku: string;
  };
}

declare global {
  interface Window {
    getDigitalGoodsService?(serviceProvider: string): Promise<DigitalGoodsService>;
  }
}
