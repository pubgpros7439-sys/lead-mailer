import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ── Subject line templates (randomly picked per email) ────────────
const SUBJECT_TEMPLATES = [
  (company) => `Quick idea for ${company}'s website`,
  (company) => `${company} — a thought about your online presence`,
  (company) => `Spotted something about ${company}'s website`,
  (company) => `Can I help ${company} get more customers online?`,
  (company) => `A website suggestion for ${company}`,
  (company) => `${company}'s website could be doing more — here's how`,
  (company) => `Thought this might help ${company} grow online`,
  (company) => `Quick question about ${company}'s web presence`,
];

function getRandomSubject(company) {
  const index = Math.floor(Math.random() * SUBJECT_TEMPLATES.length);
  return SUBJECT_TEMPLATES[index](company);
}

export async function POST(request) {
  try {
    const { name, email, company } = await request.json();

    // ── Validate required fields ──────────────────────────────────
    if (!name || !email || !company) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, email, company" },
        { status: 400 }
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

    // ── Compose the email ─────────────────────────────────────────
    const subject = getRandomSubject(company);

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.7; max-width: 600px;">
        <p>Hi ${name},</p>

        <p>
          I came across <strong>${company}</strong> and was genuinely impressed by what you're building.
          After taking a closer look, I noticed a few opportunities where a stronger web presence
          could help you reach even more customers and drive better results.
        </p>

        <p>
          We specialize in helping businesses like <strong>${company}</strong> get modern, high-performing
          websites that convert visitors into loyal customers — from sharp redesigns to fully custom builds
          tailored to your goals.
        </p>

        <p>
          Would you be open to a quick 10-minute chat this week? I'd love to share a couple of ideas
          specific to <strong>${company}</strong> — no strings attached.
        </p>

        <p style="margin-top: 24px;">
          Looking forward to hearing from you!<br />
          <strong>${process.env.FROM_NAME || "Your Name"}</strong>
        </p>
      </div>
    `;

    const textBody =
      `Hi ${name},\n\n` +
      `I came across ${company} and was genuinely impressed by what you're building. ` +
      `After taking a closer look, I noticed a few opportunities where a stronger web presence ` +
      `could help you reach even more customers and drive better results.\n\n` +
      `We specialize in helping businesses like ${company} get modern, high-performing ` +
      `websites that convert visitors into loyal customers — from sharp redesigns to fully custom builds ` +
      `tailored to your goals.\n\n` +
      `Would you be open to a quick 10-minute chat this week? I'd love to share a couple of ideas ` +
      `specific to ${company} — no strings attached.\n\n` +
      `Looking forward to hearing from you!\n` +
      `${process.env.FROM_NAME || "Your Name"}`;

    // ── Send the email ────────────────────────────────────────────
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "Your Name"}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      text: textBody,
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
