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
  onSettingsLoaded?: (settings: any) => void;
}

export default function ReceiptTemplate({ invoice, onSettingsLoaded }: ReceiptProps) {
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
        const newSettings = {
          shopName: data.businessName || "AUTO ELECTRICAL & AC",
          address: data.businessAddress || "No. 12, Main Street, Battuluoya",
          phone: data.phoneNumber || "07X-XXXXXXX",
          footerMessage: data.footerMessage || "THANK YOU COME AGAIN!",
          currency: data.currency || "LKR",
        };
        setShopSettings(newSettings);
        if (onSettingsLoaded) onSettingsLoaded(newSettings);
      } else {
        if (onSettingsLoaded) onSettingsLoaded(shopSettings);
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
    <div style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'monospace', fontSize: '11px', padding: '12px', maxWidth: '58mm', margin: '0 auto', userSelect: 'none', lineHeight: '1.4' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #9ca3af', paddingBottom: '12px', marginBottom: '8px' }}>
        <h2 style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', margin: 0 }}>{shopSettings.shopName}</h2>
        <p style={{ fontSize: '10px', color: '#374151', margin: '2px 0' }}>{shopSettings.address}</p>
        <p style={{ fontSize: '10px', color: '#374151', margin: 0 }}>Tel: {shopSettings.phone}</p>
        
        <div style={{ paddingTop: '8px', fontSize: '10px', textAlign: 'left', borderTop: '1px dashed #d1d5db', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Inv: <strong style={{ fontWeight: 'bold' }}>{invoice.invoiceNo}</strong></span>
            <span>{d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {invoice.customerName ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span>Cust: <span style={{ fontWeight: 600 }}>{invoice.customerName}</span></span>
              {invoice.cashier && <span>Cashier: {invoice.cashier}</span>}
            </div>
          ) : (
            invoice.cashier && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                <span>Cashier: {invoice.cashier}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Items Section */}
      <div style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #1f2937', paddingBottom: '4px' }}>
          <span># Items/Qty</span>
          <span>Amount</span>
        </div>

        <div style={{ marginTop: '8px' }}>
          {invoice.items.map((item: any, idx: number) => {
            const qty = Number(item.cartQty || item.qty || 1);
            const price = Number(item.sellingPrice || item.price || 0);
            const total = qty * price;
            return (
              <div key={idx} style={{ fontSize: '11px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>
                  <span style={{ display: 'inline-block', width: '20px', color: '#4b5563' }}>{idx + 1}.</span>
                  <span>{item.name || item.itemName}</span>
                </div>
                {item.partNumber && (
                  <div style={{ fontSize: '9px', color: '#4b5563', paddingLeft: '20px' }}>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#374151', paddingLeft: '20px', marginTop: '2px' }}>
                  <span>{qty} x {price.toLocaleString()}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{total.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals Section */}
      <div style={{ paddingTop: '4px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151', marginBottom: '4px' }}>
          <span>Subtotal:</span>
          <span>{currencySymbol} {invoice.subTotal?.toLocaleString()}</span>
        </div>
        {Number(invoice.discount) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 500, marginBottom: '4px' }}>
            <span>Discount:</span>
            <span>-{currencySymbol} {invoice.discount?.toLocaleString()}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', borderTop: '1px solid #111827', borderBottom: '1px solid #111827', padding: '6px 0', margin: '6px 0' }}>
          <span>NET TOTAL:</span>
          <span>{currencySymbol} {invoice.netTotal?.toLocaleString()}</span>
        </div>

        <div style={{ paddingTop: '4px', fontSize: '10px', color: '#374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Payment Method:</span>
            <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{invoice.paymentMethod || "Cash"}</span>
          </div>
          {invoice.cashPaid !== undefined && invoice.cashPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Cash Tendered:</span>
              <span>{currencySymbol} {invoice.cashPaid.toLocaleString()}</span>
            </div>
          )}
          {invoice.balance !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
              <span>Balance Change:</span>
              <span>{currencySymbol} {invoice.balance.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div style={{ textAlign: 'center', borderTop: '1px dashed #9ca3af', paddingTop: '10px', marginTop: '10px' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', color: '#111827', margin: 0 }}>
          {shopSettings.footerMessage}
        </p>
        <p style={{ fontSize: '9px', color: '#9ca3af', paddingTop: '4px', margin: 0 }}>
          Software by MH System
        </p>
      </div>
    </div>
  );
}
