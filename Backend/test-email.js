require('dotenv').config();
const { sendOTPEmail } = require('./src/utils/emailService');

const testEmail = process.argv[2];

if (!testEmail) {
    console.error('Please provide an email address: node test-email.js your-email@example.com');
    process.exit(1);
}

async function runTest() {
    console.log(`Attempting to send a test email to: ${testEmail}...`);
    try {
        const result = await sendOTPEmail(testEmail, '123456', 'Test User');
        if (result.success) {
            console.log('✅ Success! Test email sent.');
            console.log('Message ID:', result.messageId);
        }
    } catch (error) {
        console.error('❌ Failed to send test email:');
        console.error(error.message);

        console.log('\n--- Troubleshooting Tips ---');
        console.log('1. Check your .env file for SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
        console.log('2. Ensure your SMTP credentials are correct.');
        console.log('3. If using AWS SES, ensure the "From" address is verified.');
        console.log('4. Check if your ISP or firewall is blocking the SMTP port (usually 587 or 465).');
    }
}

runTest();
