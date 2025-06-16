<script>
	// @ts-nocheck
	import { goto } from '$app/navigation';
	import { failedNotificationMessage, failedNotificationVisible } from '$lib/stores/ChatStores';
	import FailedNotification from '../FailedNotification.svelte';

	const baseUrl = import.meta.env.VITE_API_BASE_URL;

	let username = '';
	let password = '';
	let showPassword = false;
	let errorMessage = '';

	async function loginUser() {
		errorMessage = '';
		if (!username.trim() || !password.trim()) {
			errorMessage = 'Both fields are required';
			setTimeout(() => {
				errorMessage = '';
			}, 3000);
			return;
		}

		try {
			const res = await fetch(`${baseUrl}/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			console.log('data response:', res);

			if (!res.ok) {
				const err = await res.json();
				errorMessage = err.message || 'Login failed';
				return;
			}

			const data = await res.json();
			console.log('data response:', data);

			let userId = data.user_id;
			let token = data.access_token;
			let userName = data.name;
			let userEmail = data.email;

			console.log('user id:', userId);
			console.log('token:', token);
			console.log('userName:', userName);
			console.log('userEmail:', userEmail);

			if (userId && token && userName && userEmail) {
				localStorage.setItem('user_id', userId);
				localStorage.setItem(`user_name-${userId}`, userName);
				localStorage.setItem(`user_email-${userId}`, userEmail);
				localStorage.setItem(`token-${userId}`, token);
				goto('/');
			} else {
				console.error('Login failed: Incomplete user data received.');
			}
		} catch (err) {
			errorMessage = 'Something went wrong. Please try again.';
			failedNotificationVisible.set(true);
			failedNotificationMessage.set('Something went wrong. Please try again.');
			setTimeout(() => {
				failedNotificationVisible.set(false);
			}, 4000);
			console.error(err);
		}
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	function goBackHome() {
		goto('/');
	}

	function signUp() {
		goto('/signup'); // Change if you have another route
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

			<button
				on:click={signUp}
				class="absolute top-4 right-4 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
			>
				<i class="fas fa-user-plus text-blue-500"></i>
				<span>Signup</span>
			</button>
		</div>
		<form on:submit|preventDefault={loginUser}>
			<h2 class="mb-6 text-center text-2xl font-semibold dark:text-white">Login to Your Account</h2>

			<input
				type="email"
				bind:value={username}
				placeholder="Enter email"
				autocomplete="username"
				class="mb-4 w-full rounded-lg border p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			/>

			<div class="relative">
				<input
					type={showPassword ? 'text' : 'password'}
					bind:value={password}
					placeholder="Enter password"
					autocomplete="current-password"
					class="mb-4 w-full rounded-lg border p-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
				/>

				<button
					type="button"
					aria-label="toggle password visibility"
					on:click={togglePasswordVisibility}
					class="absolute top-3.5 right-3 text-gray-500 dark:text-gray-300"
				>
					<i class={`fa-solid ${showPassword ? 'fa-eye-slash text-lg' : 'fa-eye text-lg'}`}></i>
				</button>
			</div>
			{#if errorMessage}
				<p class="mb-4 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
			{/if}
			<button
				type="submit"
				class="w-full rounded-lg bg-blue-500 p-3 text-white transition hover:bg-blue-600"
			>
				Login
			</button>
		</form>
	</div>
</div>
