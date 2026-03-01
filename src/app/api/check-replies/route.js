import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

export async function POST(request) {
    let client = null;

    try {
        const { emails } = await request.json();

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json(
                { success: false, error: "No emails to check" },
                { status: 400 }
            );
        }

        // ── Connect via IMAP ──────────────────────────────────────
        client = new ImapFlow({
            host: process.env.IMAP_HOST,
            port: Number(process.env.IMAP_PORT),
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            logger: false,
        });

        await client.connect();

        // ── Search INBOX for replies from these emails ───────────────
        const repliedEmails = new Set();

        // Open inbox
        await client.mailboxOpen("INBOX");

        // Check each email address for replies
        for (const email of emails) {
            try {
                // Search for messages FROM this email address
                const messages = await client.search({ from: email });

                if (messages && messages.length > 0) {
                    repliedEmails.add(email.toLowerCase());
                }
            } catch {
                // Skip individual search errors
                continue;
            }
        }

        await client.logout();

        return NextResponse.json({
            success: true,
            repliedEmails: Array.from(repliedEmails),
            checkedCount: emails.length,
            repliedCount: repliedEmails.size,
        });
    } catch (error) {
        console.error("Reply check failed:", error);

        if (client) {
            try {
                await client.logout();
            } catch {
                // ignore logout errors
            }
        }

        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
