//@ts-nocheck
import { json } from '@sveltejs/kit';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

export async function POST({ request }) {
	const { phone, code } = await request.json();

	console.log('phone:', phone, 'code:', code);

	if (!phone || !code) {
		return json({ error: 'Phone and code are required' }, { status: 400 });
	}

	try {
		const verificationCheck = await client.verify.v2
			.services(verifySid)
			.verificationChecks.create({ to: phone, code });

		console.log('verificationCheck:', verificationCheck);
		if (verificationCheck.status === 'approved') {
			return json({ success: true });
		} else {
			return json({ success: false, status: verificationCheck.status });
		}
	} catch (err) {
		console.error('Twilio verify error:', err);
		return json({ error: 'OTP verification failed' }, { status: 500 });
	}
}
