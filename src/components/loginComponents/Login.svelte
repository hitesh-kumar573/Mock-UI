<script>
	//@ts-nocheck
	import { goto } from '$app/navigation';
	import {
		failedNotificationMessage,
		failedNotificationVisible,
		user
	} from '$lib/stores/ChatStores';
	import FailedNotification from '../FailedNotification.svelte';

	const baseUrl = import.meta.env.VITE_API_BASE_URL;
	const frontendUrl = import.meta.env.VITE_API_FRONTEND_URL;

	let step = 1;
	let phone = '';
	let otp = '';
	let message = '';
	let showOtp = false;

	let isSendingOtp = false;
	let isVerifyingOtp = false;

	function logout() {
		let userId = localStorage.getItem('user_id');
		console.log('Logging out user with ID:', userId);

		if (userId) {
			localStorage.removeItem(`user_name-${userId}`);
			localStorage.removeItem(`user_designation-${userId}`);
			localStorage.removeItem(`user_email-${userId}`);
			localStorage.removeItem(`token-${userId}`);
			localStorage.removeItem('user_id');
		}

		user.set({ id: null, name: null, email: null, token: null });
		goto('/login');
	}

	async function sendOtp() {
		isSendingOtp = true;
		console.log('phone:', phone);

		// Step 1: Sanitize phone
		const sanitizedPhone = phone.replace(/\D/g, '');

		// Step 2: Validate phone
		if (sanitizedPhone.length !== 10) {
			message = 'Please enter a valid 10-digit phone number.';
			failedNotificationMessage.set(message);
			failedNotificationVisible.set(true);
			setTimeout(() => failedNotificationVisible.set(false), 4000);
			isSendingOtp = false;
			return;
		}

		const fullPhone = `+91${sanitizedPhone}`;
		console.log('Sending OTP to:', fullPhone);

		// Step 3: Check if user exists
		let userExists = false;

		try {
			const userCheck = await fetch(`${baseUrl}/user_check`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone: sanitizedPhone })
			});

			const userData = await userCheck.json();
			console.log('userCheck:', userData);

			userExists = userCheck.ok && userData.message === 'User exists';
		} catch (err) {
			console.error('Error checking user existence:', err);
			message = 'Server error. Try again.';
			isSendingOtp = false;
			return;
		}

		// Step 4: If user doesn't exist → signup
		if (!userExists) {
			const signupPayload = {
				phone: sanitizedPhone
			};

			try {
				const signupRes = await fetch(`${baseUrl}/signup`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(signupPayload)
				});

				const signupData = await signupRes.json();
				console.log('signupData:', signupData);

				if (!signupRes.ok) {
					message = signupData.message || 'Signup failed';
					failedNotificationMessage.set(message);
					failedNotificationVisible.set(true);
					setTimeout(() => failedNotificationVisible.set(false), 4000);
					isSendingOtp = false;
					return;
				}

				message = 'Signup successful! Sending OTP...';
			} catch (err) {
				console.error('Signup failed:', err);
				message = 'Signup failed. Try again.';
				isSendingOtp = false;
				return;
			}
		}

		// Step 5: Send OTP
		try {
			// const otpRes = await fetch(`${frontendUrl}/api/send-otp`, {
			const otpRes = await fetch('/api/send-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone: fullPhone })
			});

			const otpData = await otpRes.json();
			console.log('otpData:', otpData);

			if (otpData.status === 'pending') {
				step = 2;
				message = 'OTP sent successfully!';
			} else {
				message = otpData.error || 'Failed to send OTP';
				failedNotificationMessage.set(message);
				failedNotificationVisible.set(true);
				setTimeout(() => failedNotificationVisible.set(false), 4000);
				isSendingOtp = false;
			}
		} catch (err) {
			console.error('OTP sending failed:', err);
			message = 'Something went wrong while sending OTP.';
			isSendingOtp = false;
		}
		isSendingOtp = false;
	}

	async function verifyOtp() {
		isVerifyingOtp = true;
		// Sanitize and prepend +91
		const sanitizedPhone = phone.replace(/\D/g, '');
		const fullPhone = `+91${sanitizedPhone}`;
		console.log('Verifying OTP for:', fullPhone);

		try {
			const res = await fetch('/api/verify-otp', {
				// const res = await fetch(`${frontendUrl}/api/verify-otp`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone: fullPhone, code: otp })
			});

			const data = await res.json();

			if (data.success) {
				message = 'Phone number verified successfully!';

				// ✅ Step 2: Log the user in using sanitizedPhone (without +91)
				const loginRes = await fetch(`${baseUrl}/login_using_phone`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ phone: sanitizedPhone })
				});

				const loginData = await loginRes.json();
				console.log('Login response:', loginData);

				if (loginData) {
					let userId = loginData.user_id;
					let token = loginData.access_token;
					let userName = loginData.name;
					let userEmail = loginData.email;
					let designation = loginData.designation;

					console.log('user id:', userId);
					console.log('token:', token);
					console.log('userName:', userName);
					console.log('userEmail:', userEmail);
					console.log('designation:', designation);

					if (loginRes.ok && userId && token) {
						localStorage.setItem('user_id', userId);
						localStorage.setItem(`token-${userId}`, token);

						if (userName) {
							localStorage.setItem(`user_name-${userId}`, userName);
						}
						if (userEmail) {
							localStorage.setItem(`user_email-${userId}`, userEmail);
						}
						if (designation) {
							localStorage.setItem(`user_designation-${userId}`, designation);
						}

						message = 'Login successful!';

						// Auto logout after 24 hours
						setTimeout(
							() => {
								logout();
								console.log(`Auto-logged out after 1 day i.e.:- ${24 * 60 * 60 * 1000}`);
							},
							24 * 60 * 60 * 1000
						);

						goto('/');
					} else {
						console.error('Login failed: Incomplete user data received.');
						message = loginData.error || 'Login failed after verification.';
						isVerifyingOtp = false;
					}
				}
			} else {
				message = data.error || 'Invalid OTP';
				isVerifyingOtp = false;
			}
		} catch (err) {
			console.error('OTP verification or login error:', err);
			message = 'Something went wrong. Please try again.';
			isVerifyingOtp = false;
		}

		// Show error toast if needed
		if (message && message.toLowerCase().includes('fail')) {
			failedNotificationMessage.set(message);
			failedNotificationVisible.set(true);
			setTimeout(() => {
				failedNotificationVisible.set(false);
			}, 4000);
		}
		isVerifyingOtp = false;
	}

	function toggleOtpVisibility() {
		showOtp = !showOtp;
	}

	function goBackHome() {
		goto('/'); // change '/' to your desired route if needed
	}
	function signUp() {
		goto('/signup'); // change '/' to your desired route if needed
	}
</script>

<FailedNotification message={$failedNotificationMessage} visible={$failedNotificationVisible} />

<div class="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
	<div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
		<div class="flex items-center justify-between">
			<button
				on:click={goBackHome}
				class="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
			>
				<i class="fas fa-arrow-left text-blue-500"></i>
				<span>Home</span>
			</button>
			<!-- <button
				on:click={signUp}
				class="absolute top-4 right-4 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
			>
				<i class="fas fa-user-plus text-blue-500"></i>

				<span>Signup</span>
			</button> -->
		</div>

		<h2 class="mb-6 text-center text-2xl font-semibold dark:text-white">
			{step === 1 ? 'Login in with Phone' : 'Enter OTP'}
		</h2>

		{#if step === 1}
			<!-- Step 1: Send OTP -->
			<form on:submit|preventDefault={sendOtp}>
				<input
					type="tel"
					bind:value={phone}
					autocomplete="off"
					maxlength="10"
					placeholder="Enter 10-digit phone number"
					class="mb-4 w-full rounded-lg border p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				/>

				<button
					type="submit"
					class="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700"
					disabled={isSendingOtp}
				>
					<!-- Send OTP -->
					{#if isSendingOtp}
						<!-- <span class="loader mr-2"></span> Sending... -->
						<!-- <i class="fas fa-spinner fa-spin"></i> Sending... -->
						<div class="flex items-center justify-center gap-2">
							<span>Sending</span>
							<div class="typing-dots">
								<div class="dot"></div>
								<div class="dot"></div>
								<div class="dot"></div>
							</div>
						</div>
					{:else}
						Send OTP
					{/if}
				</button>
			</form>
		{:else}
			<!-- Step 2: Verify OTP -->
			<form on:submit|preventDefault={verifyOtp}>
				<div class="relative">
					<input
						type={showOtp ? 'text' : 'password'}
						bind:value={otp}
						autocomplete="off"
						placeholder="Enter 4-digit OTP"
						class="mb-4 w-full rounded-lg border p-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					/>

					<!-- Eye icon -->
					<button
						type="button"
						aria-label="toggle button"
						on:click={toggleOtpVisibility}
						class="absolute top-2.5 right-3 text-gray-500 dark:text-gray-300"
					>
						<i class={`fas ${showOtp ? 'fa-eye-slash' : 'fa-eye'}`}></i>
					</button>
				</div>

				<button
					type="submit"
					class="flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 p-3 text-white transition hover:bg-green-700"
					disabled={isVerifyingOtp}
				>
					{#if isVerifyingOtp}
						<!-- <span class="loader mr-2"></span> Verifying... -->
						<!-- <i class="fas fa-spinner fa-spin"></i> Verifying... -->
						<div class="flex items-center justify-center gap-2">
							<span>Verifying</span>
							<div class="typing-dots">
								<div class="dot"></div>
								<div class="dot"></div>
								<div class="dot"></div>
							</div>
						</div>
					{:else}
						Verify OTP
					{/if}
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.typing-dots {
		display: flex;
		align-items: center;
		justify-content: start;
		gap: 4px;
	}

	.typing-dots .dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		animation: blink 1.4s infinite both;
	}

	@media (prefers-color-scheme: light) {
		.typing-dots .dot {
			background-color: #333;
		}
	}
	@media (prefers-color-scheme: dark) {
		.typing-dots .dot {
			background-color: white;
		}
	}

	.typing-dots .dot:nth-child(1) {
		animation-delay: 0s;
	}
	.typing-dots .dot:nth-child(2) {
		animation-delay: 0.2s;
	}
	.typing-dots .dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes blink {
		0% {
			opacity: 0.2;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.3);
		}
		100% {
			opacity: 0.2;
			transform: scale(1);
		}
	}

	.loader {
		border: 3px solid #f3f3f3;
		border-top: 3px solid #3498db;
		border-radius: 50%;
		width: 16px;
		height: 16px;
		animation: spin 1s linear infinite;
		display: inline-block;
	}
	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes float1 {
		0% {
			transform: translateY(0px) rotate(0deg);
		}
		50% {
			transform: translateY(-20px) rotate(5deg);
		}
		100% {
			transform: translateY(0px) rotate(0deg);
		}
	}
	@keyframes float2 {
		0% {
			transform: translateY(0px) rotate(0deg);
		}
		50% {
			transform: translateY(15px) rotate(-5deg);
		}
		100% {
			transform: translateY(0px) rotate(0deg);
		}
	}
	@keyframes float3 {
		0% {
			transform: translateY(0px) scale(1);
		}
		50% {
			transform: translateY(-10px) scale(1.05);
		}
		100% {
			transform: translateY(0px) scale(1);
		}
	}

	.animate-float1 {
		animation: float1 6s ease-in-out infinite;
	}
	.animate-float2 {
		animation: float2 8s ease-in-out infinite;
	}
	.animate-float3 {
		animation: float3 5s ease-in-out infinite;
	}

	@keyframes gradient-x {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}

	.animate-gradient-x {
		background-size: 300% 300%;
		animation: gradient-x 4s ease-in-out infinite;
	}
</style>
