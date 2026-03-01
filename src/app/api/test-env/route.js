import { NextResponse } from "next/server";

export async function GET() {
    const p = process.env.EMAIL_PASS || "";
    return NextResponse.json({
        EMAIL_USER: process.env.EMAIL_USER,
        EMAIL_PASS_LEN: p.length,
        EMAIL_PASS_LAST_CHAR: p.slice(-1),
        EMAIL_PASS: p,
        EMAIL_HOST: process.env.EMAIL_HOST
    });
}
