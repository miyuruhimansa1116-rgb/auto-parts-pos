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