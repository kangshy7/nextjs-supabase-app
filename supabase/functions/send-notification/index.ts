// Supabase Edge Function: 이메일 알림 발송 (Resend API 연동)
// 배포: npx supabase functions deploy send-notification
// 환경변수: RESEND_API_KEY (Supabase 대시보드 > Edge Functions > Secrets)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface NotificationPayload {
  type: "accepted" | "rejected" | "reminder";
  recipient_email: string;
  recipient_name: string;
  event_title: string;
  data?: Record<string, unknown>;
}

const EMAIL_TEMPLATES: Record<
  string,
  (p: NotificationPayload) => { subject: string; html: string }
> = {
  accepted: (p) => ({
    subject: `[모임관리] "${p.event_title}" 참여가 수락되었습니다`,
    html: `<p>${p.recipient_name}님, <strong>${p.event_title}</strong> 이벤트 참여 신청이 <span style="color:green">수락</span>되었습니다.</p>`,
  }),
  rejected: (p) => ({
    subject: `[모임관리] "${p.event_title}" 참여 신청 결과 안내`,
    html: `<p>${p.recipient_name}님, <strong>${p.event_title}</strong> 이벤트 참여 신청이 <span style="color:red">거절</span>되었습니다.</p>`,
  }),
  reminder: (p) => ({
    subject: `[모임관리] "${p.event_title}" 정산 미납 안내`,
    html: `<p>${p.recipient_name}님, <strong>${p.event_title}</strong> 이벤트 정산 미납액이 남아있습니다. 확인 후 납부해 주세요.</p>`,
  }),
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: NotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const template = EMAIL_TEMPLATES[payload.type];
  if (!template) {
    return new Response(JSON.stringify({ error: "Unknown notification type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { subject, html } = template(payload);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "모임관리 <noreply@yourdomain.com>",
      to: payload.recipient_email,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    return new Response(JSON.stringify({ error }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
