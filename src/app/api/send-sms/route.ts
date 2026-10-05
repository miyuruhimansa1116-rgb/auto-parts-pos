import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: "Phone and message are required" }, { status: 400 });
    }

    // අපේ ලැප්ටොප් එකේ රන් වන Local WhatsApp Server එකට රික්වෙස්ට් එක යැවීම
    const localServerUrl = "http://localhost:3001/send-message";

    const response = await fetch(localServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, message }),
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json({ success: false, error: data.error || "Failed to send WhatsApp message" }, { status: 500 });
    }
  } catch (error) {
    console.error("Local WhatsApp Bridge Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error or Local Server is offline" }, { status: 500 });
  }
}
