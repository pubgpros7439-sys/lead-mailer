import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { password } = await request.json();

        // Password is stored securely as an environment variable
        const correctPassword = process.env.APP_PASSWORD;

        if (!correctPassword) {
            return NextResponse.json(
                { success: false, error: "APP_PASSWORD not configured" },
                { status: 500 }
            );
        }

        if (password === correctPassword) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { success: false, error: "Invalid password" },
                { status: 401 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
