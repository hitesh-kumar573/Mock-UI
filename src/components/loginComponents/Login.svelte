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
		console.log('phone:', phone);

		// Step 1: Sanitize phone
		const sanitizedPhone = phone.replace(/\D/g, '');

		// Step 2: Validate phone
		if (sanitizedPhone.length !== 10) {
			message = 'Please enter a valid 10-digit phone number.';
			failedNotificationMessage.set(message);
			failedNotificationVisible.set(true);
			setTimeout(() => failedNotificationVisible.set(false), 4000);
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
					return;
				}

				message = 'Signup successful! Sending OTP...';
			} catch (err) {
				console.error('Signup failed:', err);
				message = 'Signup failed. Try again.';
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
			}
		} catch (err) {
			console.error('OTP sending failed:', err);
			message = 'Something went wrong while sending OTP.';
		}
	}

	async function verifyOtp() {
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
					}
				}
			} else {
				message = data.error || 'Invalid OTP';
			}
		} catch (err) {
			console.error('OTP verification or login error:', err);
			message = 'Something went wrong. Please try again.';
		}

		// Show error toast if needed
		if (message && message.toLowerCase().includes('fail')) {
			failedNotificationMessage.set(message);
			failedNotificationVisible.set(true);
			setTimeout(() => {
				failedNotificationVisible.set(false);
			}, 4000);
		}
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
					class="w-full rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700"
				>
					Send OTP
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
					class="w-full rounded-lg bg-green-600 p-3 text-white transition hover:bg-green-700"
				>
					Verify OTP
				</button>
			</form>
		{/if}
	</div>
</div>
