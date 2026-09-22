export interface Product {
  id?: string;
  partNumber: string;
  name: string;
  category?: string; 
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  imageUrl?: string;
}

export interface CartItem extends Product {
  cartQty: number;
  qty?: number;
  total?: number;
}