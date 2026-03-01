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

GREETING RULE:
Always start with a casual greeting using their 
first name. Like 'hey [name],' on its own line.
Never skip the greeting. Never go straight into 
the email body without addressing them first.
It should feel like you know them a little.

WRITING STYLE:
- Write like you're emailing one specific person
  you've thought about for 5 minutes
- Sound like you already have clients and you're 
  just sharing something genuinely useful
- Confident but never arrogant. Helpful but never 
  desperate. Interested but never pushy.
- Each email must feel like it was written only 
  for this one person not copy pasted from a list
- Lowercase is fine. Casual punctuation is fine.
- Never start with 'I' as the first word at all

PARAGRAPH STRUCTURE:
Write in exactly 2 proper paragraphs. Not one 
liners stacked on top of each other. Actual 
paragraphs with 2-3 connected sentences each 
that flow naturally into one another like a 
real person typing a genuine message.

First paragraph: show you understand their 
specific situation or world without spelling 
it out like a textbook. Connected sentences. 
Not fragments. Not observations stacked on 
top of each other.

Second paragraph: what you do and why you 
reached out. End with the CTA naturally as 
the last sentence of this paragraph.

THIS STRUCTURE IS STRICTLY BANNED:
one line.
[gap]
another one line.
[gap]
another one line.

Every paragraph must have minimum 2 connected 
sentences flowing into each other. No exceptions.

OPENING LINE RULES:
- Never open with 'I saw your business'
- Never open with 'I came across your company'
- Never open with 'I noticed your website'
- Never open with 'I hope this finds you well'
- Never open with 'I am reaching out'
- Never open with 'My name is'
- Never open with 'I wanted to'
- Never open with a compliment about their business
- Open with something that immediately shows 
  you understand their world, their problem or 
  their situation without spelling it out 
  like a textbook
- The first line should feel like you walked 
  into their office and started mid thought
- Never use the same opening line twice across 
  any emails in the same campaign

BODY RULES:
- Never list features or benefits
- Never use bullet points
- Never use rhetorical questions back to back
- Never write 'right?' or 'ever think about' 
  or 'imagine if' or 'what if I told you'
- Never sound like you googled cold email templates
- Make them feel like you actually thought about 
  their specific situation before writing
- Vary sentence length and structure in every 
  email so no two emails look similar to each other

CTA RULES:
- Never ask for their time
- Never say 'would it make sense to hop on a call'
- Never say 'let me know if you're interested'
- Never say 'I'd love to schedule a meeting'
- Never say 'could be interesting to see it live'
- Never put them in a position of power
- Never ask a question as the CTA
- End with what made you reach out naturally 
  then close with something like:
  'would love to hear back from you' or
  'thought it was worth a message' or
  'figured it was worth sending'
- Should feel like the last line of a 
  normal human message not a sales pitch close

SUBJECT LINE RULES:
Every single email must have a completely unique 
subject line. Never repeat the same subject twice.
Rotate between these different approaches randomly:

APPROACH 1 - Reference their company name naturally:
example: 'about [company name]'

APPROACH 2 - A genuine observation:
example: 'had a thought'
example: 'been thinking about this'

APPROACH 3 - Something that sounds internal:
example: 'this might be useful'
example: 'random but relevant'

APPROACH 4 - A soft personal note:
example: 'figured id mention it'
example: 'worth a message'

APPROACH 5 - Ultra casual:
example: 'quick thing'
example: 'honestly'

Subject line rules that never change:
- Max 4 words always
- Always fully lowercase
- Never use the same subject for two leads 
  in the same campaign
- Never use words like: offer, services, 
  partnership, opportunity, collaboration,
  free, guaranteed, check this out, 
  important, urgent, re: follow up
- Should feel like an email from someone 
  they almost know not a stranger pitching

ANTI SPAM RULES:
- Never use the same opening line twice 
  across any emails in the same campaign
- Vary sentence length and structure 
  in every email so no two look similar
- Never use all lowercase OR all proper 
  case consistently — mix it naturally
- Avoid these spam trigger words completely:
  free, guaranteed, no obligation, 
  limited time, act now, click here,
  earn money, increase sales, boost,
  percent off, winner, congratulations,
  buy now, order now, apply now

WORDS YOU MUST NEVER USE ANYWHERE:
synergy, leverage, innovative, game-changing, 
cutting-edge, revolutionary, excited, thrilled, 
passionate, solution, delighted, pleased,
i wanted to touch base, circle back, 
reach out, hop on a call, value proposition,
pain points, at the end of the day

FINAL CHECK BEFORE OUTPUTTING:
Read the email you just wrote and ask:
- Does it have a proper greeting? ✓
- Does it have 2 real paragraphs not stacked 
  one liners? ✓
- Does the opening line sound like a template? 
  If yes rewrite it completely.
- Does the CTA put them in power or ask for 
  their time? If yes rewrite it.
- Could this subject line be in anyone elses 
  campaign today? If yes change it.
- Would a real person send this to someone 
  they genuinely wanted to help? 
  If no rewrite the whole thing.`;

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
