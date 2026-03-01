import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Initialize Gemini AI ──────────────────────────────────────
function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

// ── Retry wrapper for Gemini calls ────────────────────────────
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        err.message?.includes("429") ||
        err.message?.includes("RetryInfo") ||
        err.message?.includes("RESOURCE_EXHAUSTED") ||
        err.message?.includes("overloaded");

      if (isRetryable && i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 15000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

// ── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a human business owner writing cold emails to potential clients. You've been doing this for years and you know what works.

Your writing style:
- You write how you actually think, not how a textbook says
- Sentences are short. Sometimes very short. Like this.
- You use lowercase sometimes because that's how real people text
- You never over explain yourself
- You sound like you genuinely noticed something about their business and couldn't help but reach out
- You're confident but never pushy. You don't need the sale.
- You write the first line like a human observation, not a pitch
- You sometimes use a tiny bit of humor if it fits naturally
- You never start with 'I' as the first word
- Your call to action is always a soft question, never a demand
- You write like you're the only person emailing them today because for you, this email actually matters

Rules you never break:
- Maximum 5 lines. Ever.
- No buzzwords. No corporate speak. No AI sounding phrases.
- No 'I hope this email finds you well'
- No 'I am reaching out because'
- No 'I wanted to touch base'
- No 'Please don't hesitate to contact me'
- Never use exclamation marks more than once
- Never use bullet points inside the email
- Subject line: max 5 words, lowercase, reads like a thought not a marketing headline
- Sign off casually like a real person would
- IMPORTANT: You are not limited to any one service or industry. You adapt completely to whatever service or offer the user describes in their instruction. If they say social media marketing — you write that. If they say accounting services — you write that. If they say graphic design — you write that. You become an expert in whatever they tell you.`;

// ── Craft email with single API call ──────────────────────────
async function craftEmail(prompt, name, company, fromName) {
  const model = getGeminiModel();

  const userPrompt = `Lead name: ${name}
Company: ${company}
Sender name: ${fromName}
My instruction: ${prompt}

Write the cold email now. Return ONLY:
SUBJECT: (subject line here)
BODY: (email body here)

Nothing else. No explanations. No alternatives.`;

  return callWithRetry(async () => {
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userPrompt },
    ]);

    const raw = result.response.text().trim();

    // Parse SUBJECT and BODY from response
    const subjectMatch = raw.match(/^SUBJECT:\s*(.+)$/m);
    const bodyMatch = raw.match(/BODY:\s*([\s\S]+)$/m);

    if (!subjectMatch || !bodyMatch) {
      throw new Error("Failed to parse AI response");
    }

    return {
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  });
}

export async function POST(request) {
  try {
    const { name, email, company, prompt } = await request.json();

    if (!name || !email || !company) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, email, company" },
        { status: 400 }
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: "Email prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const emailPort = Number(process.env.EMAIL_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      authMethod: "LOGIN",
      tls: {
        rejectUnauthorized: false,
      },
    });

    const fromName = process.env.FROM_NAME || "Karan";

    // ── Single AI call for both subject + body ────────────────
    const { subject, body } = await craftEmail(prompt, name, company, fromName);

    // ── Convert to HTML ───────────────────────────────────────
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.7; max-width: 600px;">
        ${body
        .split(/\n\s*\n|\n/)
        .filter(Boolean)
        .map((p) => `<p>${p.trim()}</p>`)
        .join("\n        ")}
      </div>
    `;

    await transporter.sendMail({
      from: `"${fromName}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text: body,
      html: htmlBody,
    });

    return NextResponse.json({ success: true, subject });
  } catch (error) {
    console.error("Email send failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
