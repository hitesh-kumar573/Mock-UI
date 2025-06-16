//@ts-nocheck
import { json } from '@sveltejs/kit';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

console.log('accountSid:', accountSid);
console.log('authToken:', authToken);
console.log('verifySid:', verifySid);

const client = twilio(accountSid, authToken);

export async function POST({ request }) {
	const { phone } = await request.json();

	console.log('phone:', phone);

	if (!phone) {
		return json({ error: 'Phone number is required' }, { status: 400 });
	}

	try {
		const verification = await client.verify.v2
			.services(verifySid)
			.verifications.create({ to: phone, channel: 'sms' });

		console.log('verification:', verification);
		return json({ status: verification.status }); // should be "pending"
	} catch (err) {
		console.error('Twilio send error:', err);
		return json({ error: 'Failed to send OTP' }, { status: 500 });
	}
}
