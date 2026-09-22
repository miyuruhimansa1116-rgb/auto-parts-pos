// src/components/ReceiptTemplate.tsx
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface ReceiptProps {
  invoice: {
    invoiceNo: string;
    customerName?: string;
    paymentMethod: string;
    items: any[];
    netTotal: number;
    subTotal: number;
    discount: number;
    cashPaid?: number;
    balance?: number;
    cashier?: string;
    createdAt?: any;
  };
}

export default function ReceiptTemplate({ invoice }: ReceiptProps) {
  const [shopSettings, setShopSettings] = useState({
    shopName: "AUTO ELECTRICAL & AC",
    address: "No. 12, Main Street, Battuluoya",
    phone: "07X-XXXXXXX",
    footerMessage: "THANK YOU COME AGAIN!",
    currency: "LKR",
  });

  useEffect(() => {
    // ඩේටාබේස් එකෙන් ව්‍යාපාරික සැකසුම් (Settings) ලබා ගැනීම
    const unsubSettings = onSnapshot(doc(db, "settings", "business"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setShopSettings({
          shopName: data.businessName || "AUTO ELECTRICAL & AC",
          address: data.businessAddress || "No. 12, Main Street, Battuluoya",
          phone: data.phoneNumber || "07X-XXXXXXX",
          footerMessage: data.footerMessage || "THANK YOU COME AGAIN!",
          currency: data.currency || "LKR",
        });
      }
    });

    return () => unsubSettings();
  }, []);

  const currencySymbol = shopSettings.currency === "USD" ? "$" : "Rs.";

  const d = invoice.createdAt?.toDate
    ? invoice.createdAt.toDate()
    : invoice.createdAt
    ? new Date(invoice.createdAt)
    : new Date();

  return (
    // මෙහි max-w-[80mm] සහ print:w-[80mm] යන කොටස් 58mm ලෙස වෙනස් කර ඇත
    <div className="bg-white text-black font-mono text-[11px] p-2 max-w-[58mm] mx-auto print:p-1 print:w-[58mm] select-none leading-tight">
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-2 space-y-1">
        <h2 className="font-extrabold text-sm tracking-wide">{shopSettings.shopName}</h2>
        <p className="text-[10px] text-gray-700">{shopSettings.address}</p>
        <p className="text-[10px] text-gray-700">Tel: {shopSettings.phone}</p>
        
        <div className="pt-1.5 text-[10px] space-y-0.5 text-left border-t border-dashed border-gray-300 mt-2">
          <div className="flex justify-between">
            <span>Invoice #: <strong className="font-bold">{invoice.invoiceNo}</strong></span>
            <span>{d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* පාරිභෝගික නමක් ඇත්නම් පමණක් පෙන්වයි */}
          {invoice.customerName ? (
            <div className="flex justify-between">
              <span>Customer: <span className="font-semibold">{invoice.customerName}</span></span>
              {invoice.cashier && <span>Cashier: {invoice.cashier}</span>}
            </div>
          ) : (
            invoice.cashier && (
              <div className="flex justify-end">
                <span>Cashier: {invoice.cashier}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left text-[11px] border-collapse my-2">
        <thead>
          <tr className="border-b border-dashed border-gray-400 text-[10px] text-gray-700">
            <th className="py-1 font-semibold">Item Description</th>
            <th className="py-1 text-center font-semibold">Qty</th>
            <th className="py-1 text-right font-semibold">Price</th>
            <th className="py-1 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-gray-200">
          {invoice.items.map((item: any, idx: number) => {
            const qty = Number(item.cartQty || item.qty || 1);
            const price = Number(item.sellingPrice || item.price || 0);
            const total = qty * price;
            return (
              <tr key={idx} className="align-top">
                <td className="py-1 font-medium pr-1 text-gray-900 break-words max-w-[100px]">
                  {item.name || item.itemName}
                </td>
                <td className="py-1 text-center text-gray-800">{qty}</td>
                <td className="py-1 text-right text-gray-800">{price.toLocaleString()}</td>
                <td className="py-1 text-right font-semibold text-gray-900">{total.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-[11px]">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal:</span>
          <span>{currencySymbol} {invoice.subTotal?.toLocaleString()}</span>
        </div>
        {Number(invoice.discount) > 0 && (
          <div className="flex justify-between text-red-600 font-medium">
            <span>Discount:</span>
            <span>-{currencySymbol} {invoice.discount?.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-b border-gray-800 py-1 my-1">
          <span>NET TOTAL:</span>
          <span>{currencySymbol} {invoice.netTotal?.toLocaleString()}</span>
        </div>

        <div className="space-y-0.5 pt-1 text-[10px] text-gray-700">
          <div className="flex justify-between">
            <span>Payment Method:</span>
            <span className="uppercase font-semibold">{invoice.paymentMethod || "Cash"}</span>
          </div>
          {invoice.cashPaid !== undefined && invoice.cashPaid > 0 && (
            <div className="flex justify-between">
              <span>Cash Tendered:</span>
              <span>{currencySymbol} {invoice.cashPaid.toLocaleString()}</span>
            </div>
          )}
          {invoice.balance !== undefined && (
            <div className="flex justify-between font-medium">
              <span>Balance Change:</span>
              <span>{currencySymbol} {invoice.balance.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note & Barcode Mock */}
      <div className="text-center border-t border-dashed border-gray-400 pt-3 mt-3 space-y-2">
        <p className="text-[10px] font-bold tracking-widest text-gray-900">
          {shopSettings.footerMessage}
        </p>

        <p className="text-[9px] text-gray-400 pt-1">
          Software by MH System
        </p>
      </div>
    </div>
  );
}