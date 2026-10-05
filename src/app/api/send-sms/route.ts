import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: "Phone and message are required" }, { status: 400 });
    }

    const apiToken = "8038|0D4BkE4n4sw4c072tctGrqMjHFs3xHBT8wt7ycP16df65bb9";
    
    // Text.lk v3 API Endpoint එක
    const response = await fetch("https://api.text.lk/api/v3/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        recipient: phone,
        sender_id: "TextLKDemo", // ඩෑෂ්බෝඩ් එකේ ඇක්ටිව් තියෙන Sender ID එක (උදා: TextLKDemo)
        message: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.message || "Failed to send SMS" }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
