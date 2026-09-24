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
    shopName: "Sampath Auto Parts",
    address: "322, Church Rd, Battuluoya",
    phone: "07X-XXXXXXX",
    footerMessage: "THANK YOU COME AGAIN!",
    currency: "LKR",
  });

  useEffect(() => {
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
    <div className="bg-white text-black font-mono text-[11px] p-3 max-w-[58mm] mx-auto print:p-2 print:w-[58mm] select-none leading-relaxed">
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-2 space-y-1">
        <h2 className="font-extrabold text-xs tracking-wider uppercase">{shopSettings.shopName}</h2>
        <p className="text-[10px] text-gray-700 px-1">{shopSettings.address}</p>
        <p className="text-[10px] text-gray-700">Tel: {shopSettings.phone}</p>
        
        <div className="pt-2 text-[10px] space-y-1 text-left border-t border-dashed border-gray-300 mt-2.5">
          <div className="flex justify-between">
            <span>Inv:<strong className="font-bold">{invoice.invoiceNo}</strong></span>
            <span>{d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {invoice.customerName ? (
            <div className="flex justify-between">
              <span>Cust:<span className="font-semibold">{invoice.customerName}</span></span>
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

      {/* Items Section */}
      <div className="border-b border-gray-800 pb-2 mb-2">
        <div className="flex justify-between text-[10px] font-bold text-gray-900 border-b border-gray-800 pb-1">
          <span># Items/Qty</span>
          <span className="text-right">Amount</span>
        </div>

        <div className="space-y-2.5 mt-2">
          {invoice.items.map((item: any, idx: number) => {
            const qty = Number(item.cartQty || item.qty || 1);
            const price = Number(item.sellingPrice || item.price || 0);
            const total = qty * price;
            return (
              <div key={idx} className="text-[11px]">
                {/* අයිතමයේ අංකය සහ නම */}
                <div className="font-bold text-gray-900 uppercase">
                  <span className="inline-block w-5 text-gray-600">{idx + 1}.</span>
                  <span>{item.name || item.itemName}</span>
                </div>
                {/* ප්‍රමාණය, මිල සහ මුළු මුදල පැහැදිලිව පෙළගැස්වීම */}
                <div className="flex justify-between items-center text-[10px] text-gray-700 pl-5 mt-0.5">
                  <span>{qty} x {price.toLocaleString()}</span>
                  <span className="font-semibold text-gray-900">{total.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals Section */}
      <div className="pt-1 space-y-1.5 text-[11px]">
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
        <div className="flex justify-between font-bold text-xs border-t border-b border-gray-900 py-1.5 my-1.5">
          <span>NET TOTAL:</span>
          <span>{currencySymbol} {invoice.netTotal?.toLocaleString()}</span>
        </div>

        <div className="space-y-1 pt-1 text-[10px] text-gray-700">
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

      {/* Footer Note */}
      <div className="text-center border-t border-dashed border-gray-400 pt-3 mt-3 space-y-1.5">
        <p className="text-[10px] font-extrabold tracking-wider text-gray-900">
          {shopSettings.footerMessage}
        </p>
        <p className="text-[9px] text-gray-400 pt-1">
          Software by MH System
        </p>
      </div>
    </div>
  );
}
