<script>
	import { goto } from '$app/navigation';

	let step = 1;
	let phone = '';
	let otp = '';
	let showOtp = false;

	function sendOtp() {
		if (phone.trim().length >= 10) {
			console.log('OTP sent to', phone);
			step = 2;
		}
	}

	function verifyOtp() {
		if (otp.trim().length === 6) {
			console.log('OTP Verified:', otp);
			// proceed to next step
		}
	}

	function toggleOtpVisibility() {
		showOtp = !showOtp;
	}

	function goBackHome() {
		goto('/'); // change '/' to your desired route if needed
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
	<div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
		<!-- 🔙 Back to Home Button -->
		<button
			on:click={goBackHome}
			class="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
		>
			<i class="fas fa-arrow-left text-blue-500"></i>
			<span>Back to Home</span>
		</button>

		<h2 class="mb-6 text-center text-2xl font-semibold dark:text-white">
			{step === 1 ? 'Sign in with Phone' : 'Enter OTP'}
		</h2>

		{#if step === 1}
			<input
				type="tel"
				bind:value={phone}
				autocomplete="off"
				placeholder="Enter phone number"
				class="mb-4 w-full rounded-lg border p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			/>

			<button
				on:click={sendOtp}
				class="w-full rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700"
			>
				Send OTP
			</button>
		{:else}
			<div class="relative">
				<input
					type={showOtp ? 'text' : 'password'}
					bind:value={otp}
					autocomplete="off"
					placeholder="Enter 6-digit OTP"
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
				on:click={verifyOtp}
				class="w-full rounded-lg bg-green-600 p-3 text-white transition hover:bg-green-700"
			>
				Verify OTP
			</button>
		{/if}
	</div>
</div>
