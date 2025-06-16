<script>
	// @ts-nocheck
	import { goto } from '$app/navigation';
	import {
		failedNotificationMessage,
		failedNotificationVisible,
		journalSpecializations,
		newsSpecializations
	} from '$lib/stores/ChatStores';
	import FailedNotification from '../FailedNotification.svelte';
	import Select from 'svelte-select';
	import { fetchJournalSpecializations, fetchNewsSpecializations } from './dal/specialization';
	import { onMount } from 'svelte';
	import { derived } from 'svelte/store';

	const baseUrl = import.meta.env.VITE_API_BASE_URL;

	let name = '',
		phone = '',
		email = '',
		password = '',
		designation = '';
	let selectedJournal = [];
	let selectedNews = [];
	let showPassword = false;
	let errorMessage = '',
		successMessage = '';

	// const specializationOptions = ['Cardiology', 'Pathology', 'Neurology', 'Dermatology'];
	// const specializationOptions = [
	// 	{ value: 'cardiology', label: 'Cardiology' },
	// 	{ value: 'pathology', label: 'Pathology' },
	// 	{ value: 'neurology', label: 'Neurology' },
	// 	{ value: 'oncology', label: 'Oncology' }
	// ];

	onMount(() => {
		fetchJournalSpecializations();
		fetchNewsSpecializations();
	});

	// Derived store to map and format the labels
	const journalSpecializationOptions = derived(journalSpecializations, ($specs) =>
		$specs.map((spec) => ({
			value: spec,
			label: spec
				.split('_')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ')
		}))
	);

	// Derived store to map and format the labels
	const newsSpecializationOptions = derived(newsSpecializations, ($specs) =>
		$specs.map((spec) => ({
			value: spec,
			label: spec
				.split('_')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ')
		}))
	);

	function toggleSpecialization(list, item) {
		if (list.includes(item)) {
			list.splice(list.indexOf(item), 1);
		} else {
			list.push(item);
		}
	}

	async function signupUser() {
		errorMessage = '';
		successMessage = '';

		// Clean phone input
		const sanitizedPhone = phone.replace(/\D/g, ''); // remove non-digit characters

		// Validate Indian phone number (10 digits)
		if (sanitizedPhone.length !== 10) {
			errorMessage = 'Please enter a valid 10-digit phone number.';
			// failedNotificationMessage.set(message);
			// failedNotificationVisible.set(true);
			// setTimeout(() => {
			// 	failedNotificationVisible.set(false);
			// }, 4000);
			setTimeout(() => {
				errorMessage = '';
			}, 3000);
			return;
		}

		// Format with +91
		// const formattedPhone = `+91${sanitizedPhone}`;

		if (
			// !name ||
			!phone ||
			// !email ||
			// !password ||
			// !designation ||
			selectedJournal.length === 0 ||
			selectedNews.length === 0
		) {
			errorMessage = 'All fields are required';
			setTimeout(() => {
				errorMessage = '';
			}, 3000);
			return;
		}

		const journal_specialization = selectedJournal;
		const news_specialization = selectedNews;

		const payload = {
			name,
			// phone,
			phone: sanitizedPhone,
			email,
			password,
			designation,
			journal_specialization,
			news_specialization
		};

		console.log('payload:', payload);
		// return;

		try {
			const res = await fetch(`${baseUrl}/signup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			console.log('data response:', res);

			const data = await res.json();
			console.log('data response:', data);

			if (!res.ok) {
				errorMessage = data.message || 'Signup failed';
				setTimeout(() => {
					errorMessage = '';
				}, 3000);
				return;
			}

			successMessage = data.message || 'Signup successful!';
			setTimeout(() => goto('/login'), 2000);
		} catch (err) {
			errorMessage = 'Something went wrong. Please try again.';
			failedNotificationVisible.set(true);
			failedNotificationMessage.set(errorMessage);
			setTimeout(() => {
				failedNotificationVisible.set(false);
				errorMessage = '';
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

	function goToLogin() {
		goto('/login');
	}
</script>

<FailedNotification message={$failedNotificationMessage} visible={$failedNotificationVisible} />

<!-- Page Container -->
<div class="flex min-h-screen flex-col bg-gray-100 p-4 dark:bg-gray-900">
	<!-- Header -->
	<div
		class="fixed top-0 right-0 left-0 z-10 mb-8 flex items-center justify-between bg-white px-2 py-4 shadow dark:bg-gray-800"
	>
		<button
			on:click={goBackHome}
			class="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-white"
		>
			<i class="fas fa-arrow-left text-blue-500"></i>
			<span>Home</span>
		</button>
		<button
			on:click={goToLogin}
			class="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-white"
		>
			<i class="fas fa-sign-in-alt text-blue-500"></i>
			<span>Login</span>
		</button>
	</div>

	<!-- Signup Form -->
	<div class="mx-auto mt-[12vh] w-full max-w-md rounded-xl bg-white p-4 shadow-lg dark:bg-gray-800">
		<h2 class="mb-4 text-center text-2xl font-semibold dark:text-white">Create Account</h2>

		<!-- Inputs -->
		<input
			bind:value={name}
			placeholder="Name"
			class="mb-3 w-full rounded-lg border p-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		/>
		<input
			bind:value={phone}
			type="tel"
			autocomplete="off"
			maxlength="10"
			placeholder="Phone *"
			class="mb-3 w-full rounded-lg border p-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		/>

		<input
			bind:value={email}
			type="email"
			placeholder="Email"
			class="mb-3 w-full rounded-lg border p-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		/>

		<div class="relative mb-3">
			<input
				type={showPassword ? 'text' : 'password'}
				bind:value={password}
				placeholder="Password"
				class="w-full rounded-lg border p-2.5 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			/>
			<button
				aria-label="toggle button"
				type="button"
				on:click={togglePasswordVisibility}
				class="absolute top-2.5 right-3 text-gray-500 dark:text-gray-300"
			>
				<i class={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-lg`}></i>
			</button>
		</div>

		<input
			bind:value={designation}
			placeholder="Designation (e.g., Dr.)"
			class="mb-4 w-full rounded-lg border p-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
		/>

		<!-- Journal Specialization -->
		<div class="mb-4 focus:ring-0 focus:outline-none active:ring-0">
			<label for="journal" class="mb-1 block text-sm font-medium dark:text-white"
				>Journal Specialization: <span class="text-red-500">*</span></label
			>
			<select
				multiple
				bind:value={selectedJournal}
				class="mb-4 w-full rounded-lg border bg-blue-100 p-1 focus:ring-0 focus:outline-none active:ring-0 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			>
				{#each $journalSpecializationOptions as option}
					<option
						class="my-1 rounded-md border border-gray-300 p-1 text-white"
						value={option.value}
					>
						{option.label}
					</option>
				{/each}
			</select>
		</div>

		<!-- News Specialization -->
		<div class="mb-5">
			<label for="news" class="mb-1 block text-sm font-medium dark:text-white"
				>News Specialization: <span class="text-red-500">*</span></label
			>
			<select
				multiple
				bind:value={selectedNews}
				class="mb-4 w-full rounded-lg border bg-blue-100 p-1 focus:ring-0 focus:outline-none active:ring-0 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
			>
				{#each $newsSpecializationOptions as option}
					<option
						class="my-1 rounded-md border border-gray-300 p-1 text-white"
						value={option.value}
					>
						{option.label}
					</option>
				{/each}
			</select>
		</div>

		{#if errorMessage}
			<p class="mb-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
		{:else if successMessage}
			<p class="mb-1 text-sm text-green-600 dark:text-green-400">{successMessage}</p>
		{/if}

		<button
			on:click={signupUser}
			class="w-full rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700"
		>
			Signup
		</button>
	</div>
</div>
