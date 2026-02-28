import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ── Build email body from the user's prompt ───────────────────
// Replaces {name}, {company} placeholders if the user uses them.
// If the prompt is plain text, it wraps it with a greeting and sign-off.
function buildEmail(prompt, name, company, fromName) {
  // Replace placeholders in the prompt
  let body = prompt
    .replace(/\{name\}/gi, name)
    .replace(/\{company\}/gi, company);

  // Split into paragraphs (by double newline or single newline)
  const paragraphs = body
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Check if user already included a greeting (Hi/Hey/Hello/Dear)
  const hasGreeting = /^(hi|hey|hello|dear|greetings)\b/i.test(paragraphs[0] || "");

  // Check if user already included a sign-off (thanks/regards/cheers/best)
  const lastPara = paragraphs[paragraphs.length - 1] || "";
  const hasSignOff = /^(thanks|thank you|regards|best|cheers|sincerely|warm regards|looking forward)\b/i.test(lastPara);

  // Build HTML
  let htmlParts = [];

  if (!hasGreeting) {
    htmlParts.push(`<p>Hi ${name},</p>`);
  }

  paragraphs.forEach((p) => {
    // Bold any mention of the company name for emphasis
    const highlighted = p.replace(
      new RegExp(`(${company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
      "<strong>$1</strong>"
    );
    htmlParts.push(`<p>${highlighted}</p>`);
  });

  if (!hasSignOff) {
    htmlParts.push(
      `<p style="margin-top: 24px;">Looking forward to hearing from you!<br /><strong>${fromName}</strong></p>`
    );
  } else {
    // Add sender name after their sign-off
    htmlParts.push(`<p><strong>${fromName}</strong></p>`);
  }

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.7; max-width: 600px;">
      ${htmlParts.join("\n      ")}
    </div>
  `;

  // Build plain text version
  let textParts = [];
  if (!hasGreeting) {
    textParts.push(`Hi ${name},`);
  }
  textParts.push(...paragraphs);
  if (!hasSignOff) {
    textParts.push(`\nLooking forward to hearing from you!\n${fromName}`);
  } else {
    textParts.push(fromName);
  }

  const textBody = textParts.join("\n\n");

  return { htmlBody, textBody };
}

// ── Generate a subject line from the prompt context ───────────
// Extracts the main topic/service from the prompt and creates
// varied subject lines based on it.
function generateSubject(prompt, company) {
  // Try to extract the core service/topic from the prompt
  const topicPatterns = [
    /(?:about|for|regarding|offering|pitch|sell|promote)\s+(?:our\s+|my\s+|the\s+)?(.+?)(?:\.|,|$)/i,
    /(?:voice\s+agent|ai\s+agent|chatbot|automation|marketing|seo|design|development|consulting|saas|software|app|service)/i,
  ];

  let topic = "";
  for (const pattern of topicPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      topic = match[1] || match[0];
      topic = topic.trim().replace(/[.!?,;]+$/, "");
      if (topic.length > 50) topic = topic.substring(0, 50);
      break;
    }
  }

  const templates = topic
    ? [
      `Quick idea for ${company} — ${topic}`,
      `${company} + ${topic} = growth?`,
      `A thought about ${topic} for ${company}`,
      `Can ${topic} help ${company} grow?`,
      `${company} — have you considered ${topic}?`,
      `Thought this might help ${company}`,
      `Quick question for ${company}`,
      `An idea for ${company}'s growth`,
    ]
    : [
      `Quick idea for ${company}`,
      `A thought I had about ${company}`,
      `Can I help ${company} grow?`,
      `${company} — I noticed something interesting`,
      `Thought this might help ${company}`,
      `Quick question for ${company}`,
      `An idea for ${company}`,
      `Something ${company} should know`,
    ];

  return templates[Math.floor(Math.random() * templates.length)];
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
        { success: false, error: "Email prompt/body is required" },
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

    const fromName = process.env.FROM_NAME || "Your Name";

    // ── Build email from the user's prompt ────────────────────────
    const subject = generateSubject(prompt, company);
    const { htmlBody, textBody } = buildEmail(prompt, name, company, fromName);

    // ── Send the email ────────────────────────────────────────────
    await transporter.sendMail({
      from: `"${fromName}" <${process.env.GMAIL_USER}>`,
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
