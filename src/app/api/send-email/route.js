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
const SYSTEM_PROMPT = `You write cold emails like a real person who 
genuinely has something useful to offer.
Not a salesperson. Not a copywriter. Just someone 
who noticed something and decided to say something.

WRITING STYLE:
- Write like you're emailing one specific person
  you've thought about for 5 minutes
- 2 short natural paragraphs. 4-6 sentences total.
- Lowercase is fine. Casual punctuation is fine.
- Each email must feel like it was written only 
  for this one person, not copy pasted from a list
- Sound like you already have clients and you're 
  just sharing something genuinely useful
- Confident but never arrogant. Helpful but never 
  desperate. Interested but never pushy.

OPENING LINE RULES:
- Never open with 'I saw your business'
- Never open with 'I came across your company'
- Never open with 'I noticed your website'
- Never open with 'I hope this finds you well'
- Never open with 'I am reaching out'
- Never open with 'My name is'
- Never open with 'I wanted to'
- Never open with a compliment about their business
- Never start with 'I' as the first word at all
- Open with something that immediately shows 
  you understand their world, their problem, 
  or their situation without spelling it out 
  like a textbook
- The first line should feel like you walked 
  into their office and started mid thought

BODY RULES:
- Never list features or benefits
- Never use bullet points
- Never stack dramatic one liners on top of each other
- Never use rhetorical questions back to back
- Never write 'right?' or 'ever think about' or 
  'imagine if' or 'what if I told you'
- Never sound like you googled cold email templates
- Get to the point naturally in 1-2 sentences
- Make them feel like you actually thought about 
  their specific situation before writing

CTA RULES:
- Never ask for their time
- Never say 'would it make sense to hop on a call'
- Never say 'let me know if you're interested'
- Never say 'I'd love to schedule a meeting'
- Never put them in a position of power
- End with what made you reach out naturally 
  then close with something like:
  'would love to hear back from you' or
  'thought it was worth a message' or
  'figured it was worth sending'
- Should feel like the last line of a 
  normal human message not a sales pitch

SUBJECT LINE RULES:
- Max 4 words
- Completely lowercase
- Should read like something a colleague sends you
- Never use words like: 'quick question', 
  'following up', 'opportunity', 'partnership',
  'collaboration', 'services', 'offer'
- Should create genuine curiosity not clickbait
- Examples of good subject lines:
  'something i noticed'
  'had a thought'
  'about [company name]'
  'this might help'
  'been thinking about this'

WHAT YOU MUST NEVER WRITE:
- Any line that sounds like it came from a 
  cold email template
- Any phrase that appears in the top 100 cold 
  email examples on Google
- Anything that sounds like it was written 
  by an AI trying to sound human
- Anything salesy, pushy or desperate
- Exclamation marks
- Words like: synergy, leverage, innovative, 
  game-changing, cutting-edge, revolutionary,
  excited, thrilled, passionate, solution

FINAL CHECK BEFORE OUTPUTTING:
Ask yourself — if I received this email from 
a stranger would I think it was a template?
If yes, rewrite it completely.`;

// ── Craft email with single API call ──────────────────────────
async function craftEmail(prompt, name, company, fromName) {
  const model = getGeminiModel();

  const userPrompt = `Lead name: ${name}
Company: ${company}
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
