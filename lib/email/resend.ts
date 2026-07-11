type SendOtpEmailInput = {
  to: string;
  code: string;
  purpose: "signup" | "signin";
  expiresInMinutes: number;
};

function emailFrom() {
  return process.env.EMAIL_FROM || "FitPick <auth@myfitpick.com>";
}

function resendApiKey() {
  return process.env.RESEND_API_KEY || "";
}

function provider() {
  return (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
}

function subjectForPurpose(purpose: SendOtpEmailInput["purpose"]) {
  return purpose === "signin" ? "Your FitPick sign-in code" : "Your FitPick sign-up code";
}

function textBody(input: SendOtpEmailInput) {
  return [
    `Your FitPick ${input.purpose === "signin" ? "sign-in" : "sign-up"} code is ${input.code}.`,
    "",
    `This code expires in ${input.expiresInMinutes} minutes.`,
    "",
    "If you didn't request this, you can ignore this email."
  ].join("\n");
}

function htmlBody(input: SendOtpEmailInput) {
  const label = input.purpose === "signin" ? "sign-in" : "sign-up";
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#171310;max-width:520px;margin:0 auto;padding:24px">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8a5a44">FitPick</p>
      <h1 style="font-size:24px;margin:8px 0 16px">Your ${label} code</h1>
      <p style="font-size:15px;color:#4f4944">Use this 6-digit code to continue:</p>
      <p style="font-size:32px;font-weight:800;letter-spacing:0.18em;margin:20px 0;color:#3d2f2a">${input.code}</p>
      <p style="font-size:14px;color:#5f5a55">This code expires in ${input.expiresInMinutes} minutes.</p>
      <p style="font-size:13px;color:#77716b;margin-top:24px">If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

export async function sendOtpEmail(input: SendOtpEmailInput) {
  if (provider() !== "resend") {
    throw new Error("email_provider_not_configured");
  }

  const apiKey = resendApiKey();
  if (!apiKey) {
    throw new Error("resend_api_key_missing");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: emailFrom(),
      to: [input.to],
      subject: subjectForPurpose(input.purpose),
      text: textBody(input),
      html: htmlBody(input)
    })
  });

  if (!response.ok) {
    throw new Error(`resend_send_failed_${response.status}`);
  }
}
