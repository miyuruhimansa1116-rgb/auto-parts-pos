// src/app/api/send-sms/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: "Phone and message are required" }, { status: 400 });
    }

    const userId = "1879"; // ඔයාගේ Notify.lk User ID එක (ඩෑෂ්බෝඩ් එකේ Profile හෝ API සෙක්ෂන් එකේ බලාගන්න පුළුවන්)
    const apiKey = "y54X1VTwPeEHpLVPN6BL";
    const senderId = "NotifyDEMO"; // අනුමත වූ පසු ඔයාගේ නම මෙතැනට දමන්න

    // Notify.lk API Endpoint එක
    const notifyUrl = `https://app.notify.lk/api/v1/send?user_id=${userId}&api_key=${apiKey}&sender_id=${senderId}&to=${phone}&message=${encodeURIComponent(message)}`;

    const response = await fetch(notifyUrl, {
      method: "GET",
    });

    const data = await response.json();

    if (data.status === "success" || data.code === 200) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json({ success: false, error: data.message || "Failed to send SMS" }, { status: 500 });
    }
  } catch (error) {
    console.error("Notify.lk API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
