const fs = require('fs');
const nodemailer = require('nodemailer');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=["']?(.*?)["']?\s*$/);
    if (match) env[match[1].trim()] = match[2];
});

console.log('Email:', env.EMAIL_USER);
console.log('Pass length:', env.EMAIL_PASS?.length);
console.log('Pass:', env.EMAIL_PASS);
console.log('Host:', env.EMAIL_HOST);

async function test() {
    // Test port 465 SSL
    console.log('\n--- Testing port 465 (SSL) ---');
    try {
        const t1 = nodemailer.createTransport({
            host: env.EMAIL_HOST,
            port: 465,
            secure: true,
            auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
            tls: { rejectUnauthorized: false },
        });
        await t1.verify();
        console.log('PORT 465: SUCCESS!');
    } catch (e) {
        console.log('PORT 465 FAIL:', e.message);
    }

    // Test port 587 STARTTLS
    console.log('\n--- Testing port 587 (STARTTLS) ---');
    try {
        const t2 = nodemailer.createTransport({
            host: env.EMAIL_HOST,
            port: 587,
            secure: false,
            auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
            tls: { rejectUnauthorized: false },
        });
        await t2.verify();
        console.log('PORT 587: SUCCESS!');
    } catch (e) {
        console.log('PORT 587 FAIL:', e.message);
    }

    // Test with Hostinger Titan host
    console.log('\n--- Testing smtp.titan.email port 465 ---');
    try {
        const t3 = nodemailer.createTransport({
            host: 'smtp.titan.email',
            port: 465,
            secure: true,
            auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
            tls: { rejectUnauthorized: false },
        });
        await t3.verify();
        console.log('TITAN 465: SUCCESS!');
    } catch (e) {
        console.log('TITAN 465 FAIL:', e.message);
    }

    // Test with Titan port 587
    console.log('\n--- Testing smtp.titan.email port 587 ---');
    try {
        const t4 = nodemailer.createTransport({
            host: 'smtp.titan.email',
            port: 587,
            secure: false,
            auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
            tls: { rejectUnauthorized: false },
        });
        await t4.verify();
        console.log('TITAN 587: SUCCESS!');
    } catch (e) {
        console.log('TITAN 587 FAIL:', e.message);
    }
}

test();
