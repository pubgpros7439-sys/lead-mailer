import "./globals.css";

export const metadata = {
    title: "Lead Mailer — Personalized Email Campaigns",
    description:
        "Send personalized outreach emails to your leads in bulk with smart pacing.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
