import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Initialize Gemini AI ──────────────────────────────────────
function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

// ── Use AI to craft the email ─────────────────────────────────
async function craftEmail(prompt, name, company, fromName) {
  const model = getGeminiModel();

  const systemPrompt = `You are a professional cold email copywriter. The user will give you a rough idea or instruction about what they want to email a lead about. You must craft a polished, professional, personalized cold email based on that instruction.

Rules:
- Write ONLY the email body (no subject line, no "Subject:" prefix)
- Start with "Hi ${name},"
- Mention their company "${company}" naturally 1-2 times
- Keep it concise (3-4 short paragraphs max)
- Sound human, warm, and conversational — NOT robotic or salesy
- End with a soft call-to-action (like asking for a quick chat)
- Sign off with: "Looking forward to hearing from you!\\n${fromName}"
- Do NOT use placeholders like [your name] or [company] — use the actual values provided
- Do NOT include any markdown formatting, just plain text
- Do NOT add a subject line — only the email body`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: `Instruction: ${prompt}\n\nLead name: ${name}\nLead company: ${company}\nSender name: ${fromName}` },
  ]);

  return result.response.text().trim();
}

// ── Use AI to generate a relevant subject line ────────────────
async function craftSubject(prompt, company) {
  const model = getGeminiModel();

  const result = await model.generateContent([
    {
      text: `Generate exactly ONE short, compelling email subject line for a cold email to "${company}". 
The email is about: ${prompt}

Rules:
- Maximum 8 words
- No quotes, no emojis, no special characters
- Sound natural and curiosity-driven
- Do NOT include "Subject:" prefix
- Return ONLY the subject line text, nothing else`,
    },
  ]);

  return result.response.text().trim().replace(/^["']|["']$/g, "");
}

export async function POST(request) {
  try {
    const { name, email, company, prompt } = await request.json();

    // ── Validate required fields ──────────────────────────────────
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

    // ── Configure nodemailer transport ────────────────────────────
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const fromName = process.env.FROM_NAME || "Your Name";

    // ── AI-craft the email and subject ────────────────────────────
    const [emailBody, subject] = await Promise.all([
      craftEmail(prompt, name, company, fromName),
      craftSubject(prompt, company),
    ]);

    // ── Convert plain text to HTML ────────────────────────────────
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.7; max-width: 600px;">
        ${emailBody
        .split(/\n\s*\n|\n/)
        .filter(Boolean)
        .map((p) => `<p>${p.trim()}</p>`)
        .join("\n        ")}
      </div>
    `;

    // ── Send the email ────────────────────────────────────────────
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      text: emailBody,
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
