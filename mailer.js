const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmailNotification(api) {
    console.log('Sending email notification...');
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.SECURITY_TEAM_EMAIL,
        subject: 'New API Added to Inventory',
        text: `A new API has been added to the inventory:

        Name: ${api.name}
        URL: ${api.url}
        Method: ${api.method}
        Description: ${api.description}

        Please review it as soon as possible.`
    };

    try {
        console.log('Sending email...');
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully.');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { sendEmailNotification };
