import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { customerPhone, message } = await request.json();

    // Text.lk API එකට රික්වෙස්ට් එක යැවීම
    const response = await fetch('https://text.lk/api/v3/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 8038|0D4BkE4n4sw4c072tctGrqMjHFs3xHBT8wt7ycP16df65bb9',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        recipient: customerPhone, // පාරිභෝගිකයාගේ අංකය
        sender_id: 'TextLKDemo',    // ඔබේ දැනට ඇති ඩිෆෝල්ට් Sender ID එක
        message: message,          // බිල් විස්තරය
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json({ success: false, error: data.message || "SMS යැවීම අසාර්ථක විය" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
