<script>
	//@ts-nocheck
	import {
		messages,
		chats,
		savedPosts,
		userInput,
		activeChatId,
		chatIdCounter,
		failedNotificationVisible,
		failedNotificationMessage,
		isMobileView,
		showMobileDrawer,
		startDate,
		endDate,
		userId,
		journalData
	} from '$lib/stores/ChatStores';

	import FailedNotification from './FailedNotification.svelte';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { onMount, tick } from 'svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';
	import { get } from 'svelte/store';

	let calendarRef;
	let chatContainer;

	// onMount(() => {
	// 	flatpickr(calendarRef, {
	// 		mode: 'range',
	// 		dateFormat: 'Y-m-d',
	// 		onChange: function (selectedDates) {
	// 			if (selectedDates.length === 2) {
	// 				startDate = selectedDates[0].toISOString().split('T')[0];
	// 				endDate = selectedDates[1].toISOString().split('T')[0];

	// 				console.log('start date:', startDate);
	// 				console.log('end date:', endDate);
	// 			}
	// 		}
	// 	});
	// });

	onMount(() => {
		// const today = new Date();
		// console.log('today:', today);
		flatpickr(calendarRef, {
			mode: 'range',
			dateFormat: 'Y-m-d',
			// defaultDate: [today, today],
			onChange: function (selectedDates) {
				if (selectedDates.length === 2) {
					startDate.set(selectedDates[0].toISOString().split('T')[0]);
					endDate.set(selectedDates[1].toISOString().split('T')[0]);

					console.log('start date:', $startDate, 'end date:', $endDate);

					fetchJournalArticles(); //Fetch on date change
				}
			}
		});
		// Fetch on page load (no dates initially)
		fetchJournalArticles();
	});

	const posts = Array(10).fill({
		title: 'Medicine Info',
		description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit...'
	});

	async function fetchJournalArticles() {
		try {
			// const uid = get(userId);
			const uid = null;
			const start = get(startDate);
			const end = get(endDate);

			let url = 'http://45.79.125.99:7879/journal_news_articles';

			// Case: User not registered (userId not set)
			if (!uid) {
				url = 'http://45.79.125.99:7879/journal_news_articles';
			}
			// Case: With date range
			else if (start && end) {
				url += `?user_id=${uid}&start_date=${start}&end_date=${end}`;
			}
			// Case: Without dates, but user is logged in
			else {
				url += `?user_id=${uid}`;
			}
			console.log('url:', url);

			const res = await fetch(url);
			console.log('response:', res);

			const data = await res.json();
			console.log('response data:', data);

			if (res.ok) {
				journalData.set(data);
				console.log('Fetched journal/news articles:', data);
			} else {
				console.error('Error fetching journal/news:', data);
			}
		} catch (error) {
			console.error('Fetch failed:', error);
		}
	}

	onMount(() => {
		initializeNewChat();
	});

	async function initializeNewChat() {
		chatIdCounter.update((c) => c + 1);
		const newId = get(chatIdCounter); // get the updated value synchronously

		// let newId;
		// chatIdCounter.subscribe((v) => (newId = v))();

		const newChat = {
			id: newId,
			title: 'New Chat',
			messages: [{ sender: 'bot', text: 'Hi! How can I assist you today?' }]
		};

		chats.update((c) => [newChat, ...c]);
		activeChatId.set(newId);
		messages.set(newChat.messages);

		await tick(); // ensure DOM updates after setting messages
		scrollToBottom(); // scroll to bottom so message is visible
	}

	function selectChat(id) {
		chats.subscribe((c) => {
			const chat = c.find((ch) => ch.id === id);
			if (chat) {
				activeChatId.set(chat.id);
				messages.set(chat.messages);
			}
		})();
	}

	function updateChatTitle(chatId, newTitle) {
		chats.update((c) => {
			return c.map((chat) => {
				if (chat.id === chatId && chat.title === 'New Chat') {
					return { ...chat, title: newTitle.slice(0, 25) };
				}
				return chat;
			});
		});
	}

	async function sendMessage() {
		let currentUserInput;
		userInput.subscribe((v) => (currentUserInput = v))();

		if (!currentUserInput.trim()) return;

		let currentActiveChatId;
		activeChatId.subscribe((v) => (currentActiveChatId = v))();

		if (currentActiveChatId === null) return;

		const userMsg = { sender: 'user', text: currentUserInput.trim() };
		messages.update((m) => [...m, userMsg]);
		updateChatTitle(currentActiveChatId, userMsg.text);
		userInput.set('');

		chats.update((c) =>
			c.map((chat) =>
				chat.id === currentActiveChatId ? { ...chat, messages: [...chat.messages, userMsg] } : chat
			)
		);

		const loadingMsg = { sender: 'bot', text: 'Thinking...' };
		messages.update((m) => [...m, loadingMsg]);
		chats.update((c) =>
			c.map((chat) =>
				chat.id === currentActiveChatId
					? { ...chat, messages: [...chat.messages, loadingMsg] }
					: chat
			)
		);
		scrollToBottom();

		try {
			const response = await fetch('http://172.105.253.40:7778/specialization_of_category', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: userMsg.text })
			});

			const data = await response.json();
			const botMsg = { sender: 'bot', text: data.reply || 'Sorry, no response.' };

			messages.update((m) => m.map((msg) => (msg.text === loadingMsg.text ? botMsg : msg)));
			chats.update((c) =>
				c.map((chat) => ({
					...chat,
					messages: chat.messages.map((msg) => (msg.text === loadingMsg.text ? botMsg : msg))
				}))
			);
		} catch (err) {
			console.error('API Error:', err);
			const errorMsg = { sender: 'bot', text: 'Sorry, I cannot get your message.' };

			messages.update((m) => m.map((msg) => (msg.text === loadingMsg.text ? errorMsg : msg)));
			chats.update((c) =>
				c.map((chat) => ({
					...chat,
					messages: chat.messages.map((msg) => (msg.text === loadingMsg.text ? errorMsg : msg))
				}))
			);
		}
		scrollToBottom();
	}

	function scrollToBottom() {
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}

	function deleteChat(chatId) {
		chats.update((prev) => {
			if (prev.length <= 1) {
				failedNotificationMessage.set('At least one chat must remain.');
				failedNotificationVisible.set(true);
				setTimeout(() => failedNotificationVisible.set(false), 5000);
				return prev;
			}

			const filteredChats = prev.filter((chat) => chat.id !== chatId);

			let currentActiveId;
			activeChatId.subscribe((v) => (currentActiveId = v))();

			if (chatId === currentActiveId) {
				activeChatId.set(filteredChats[0]?.id || null);
				messages.set(filteredChats[0]?.messages || []);
			}

			return filteredChats;
		});
	}

	function autoResize(e) {
		const textarea = e.target;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}
</script>

<!-- <FailedNotification /> -->
<FailedNotification message={$failedNotificationMessage} visible={$failedNotificationVisible} />

<div class="flex min-h-[100dvh] flex-col font-sans md:hidden">
	<!-- HEADER: Calendar + Toggle -->
	<div
		class="fixed top-0 right-0 left-0 z-10 flex items-center justify-between bg-white px-2 py-4 shadow dark:bg-gray-800"
	>
		<!-- Calendar (only in classical view) -->

		<!-- {#if isMobileView === 'assisted'} -->
		<button
			aria-label="drawer button"
			on:click={() => showMobileDrawer.set(!$showMobileDrawer)}
			class="text-gray-700 dark:text-white"
		>
			<i class="fas fa-bars text-xl"></i>
		</button>
		<!-- {/if} -->
		{#if $isMobileView === 'classical'}
			<div class="relative flex w-fit items-center text-xs">
				<input
					type="text"
					placeholder="Select range"
					class="w-full rounded-lg border p-2 pr-6 focus:ring-0 focus:outline-none active:right-0 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
					bind:this={calendarRef}
					readonly
				/>
				<!-- Calendar Icon -->
				<i class="fas fa-calendar-alt pointer-events-none absolute top-3 right-3 text-gray-500"></i>
			</div>
		{/if}
		<div class="flex items-center justify-between gap-2">
			<button
				on:click={() => isMobileView.set($isMobileView === 'classical' ? 'assisted' : 'classical')}
				class="rounded-md bg-blue-500 px-2 py-2 text-sm text-gray-700 hover:bg-blue-600 active:bg-blue-600 dark:text-white"
			>
				{$isMobileView === 'classical' ? 'Assisted' : 'Classical'}
			</button>
			<button
				on:click={() => {
					console.log('Logging In...');
					goto('/login');
				}}
				class="rounded-md bg-blue-500 px-2 py-2 text-sm text-gray-700 hover:bg-blue-600 active:bg-blue-600 dark:text-white"
			>
				<i class="fas fa-user text-white"></i>
				Login
			</button>
		</div>
	</div>

	<!-- CLASSICAL VIEW -->
	{#if $isMobileView === 'classical'}
		<div class="flex-1 overflow-y-auto bg-gray-100 p-1 pt-[12vh] dark:bg-gray-900">
			{#each posts as post, index}
				<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
					<!-- Post Image -->
					<img src="/img.jpeg" alt="post" class="h-[28vh] w-full rounded-t-md object-cover" />

					<!-- Actions Bar -->
					<div class="flex items-center justify-between px-3 pt-2">
						<!-- Caption -->
						<div class="text-gray-700 dark:text-gray-200">
							<span class="font-bold">Inshort_{index + 1}</span>
							{post.description}
						</div>
					</div>
					<div class="flex items-center justify-end px-4 py-2">
						<i
							class="far fa-bookmark cursor-pointer text-gray-600 hover:text-yellow-500 dark:text-gray-300"
						></i>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ASSISTED VIEW (ChatGPT-like) -->
	{#if $isMobileView === 'assisted'}
		<div class="relative flex flex-1 flex-col bg-white dark:bg-gray-900">
			<!-- Chat area -->
			<div
				class="h-auto max-h-[79vh] flex-1 overflow-y-auto p-2 py-2 pt-[12vh]"
				bind:this={chatContainer}
			>
				{#each $messages as msg}
					<div
						class={`my-2 w-fit max-w-[75%] rounded-lg p-3 text-sm ${msg.sender === 'user' ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
					>
						{msg.text}
					</div>
				{/each}
			</div>

			<!-- Input -->
			<div class="absolute bottom-0 mb-3 flex w-full flex-col items-center p-2">
				<div
					class="relative flex w-full flex-col items-center justify-between rounded-3xl border bg-white focus:ring-0 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
				>
					<div class="w-full">
						<textarea
							bind:value={$userInput}
							rows="1"
							placeholder="Ask something..."
							class="w-full resize-none p-3 focus:ring-0 focus:outline-none active:ring-0"
							style="overflow: hidden;"
							on:input={(e) => {
								autoResize(e);
								scrollToBottom(); // scroll after resize
							}}
							on:keydown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault(); // ⛔ prevent the new line
									sendMessage();
								}
							}}
						></textarea>
					</div>

					<div class="flex w-full items-center justify-between gap-2 px-4 py-1">
						<!-- Mic button -->
						<button aria-label="mic button" class="text-gray-500 hover:text-blue-500">
							<i class="fas fa-microphone text-xl"></i>
						</button>
						<button
							on:click={sendMessage}
							aria-label="send message button"
							class="ml-2 rounded-full bg-blue-500 px-3.5 py-2 text-white hover:bg-blue-600 active:bg-blue-600"
						>
							<i class="fas fa-arrow-up"></i>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if $showMobileDrawer}
		<div
			in:fly={{ x: -300, duration: 300 }}
			out:fly={{ x: -300, duration: 300 }}
			class="fixed top-0 left-0 z-50 flex min-h-[100dvh] w-[75%] max-w-xs flex-col bg-white shadow-lg dark:bg-gray-900"
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-4">
				<h3 class="text-lg font-semibold text-gray-800 dark:text-white">CareSnippet</h3>
				<button on:click={() => showMobileDrawer.set(false)} aria-label="close drawer">
					<i class="fas fa-times text-lg text-gray-600 dark:text-white"></i>
				</button>
			</div>

			<!-- Main Body: Flex container for saved + history -->
			<div class="flex h-full flex-1 flex-col">
				{#if $isMobileView === 'assisted'}
					<!-- Split in 2 equal parts -->
					<div class="max-h-[42vh] flex-1 overflow-y-auto p-2">
						<h4 class="mb-2 font-medium text-gray-500 dark:text-gray-300">Saved Posts</h4>
						{#if $savedPosts.length > 0}
							{#each $savedPosts as post (post.id)}
								<div
									class="mb-2 max-h-[33vh] truncate overflow-y-auto rounded bg-gray-100 p-2 text-sm dark:bg-gray-800 dark:text-white"
								>
									{post.title}
								</div>
							{/each}
						{:else}
							<p class="text-sm text-gray-400 dark:text-gray-500">No saved posts yet.</p>
						{/if}
					</div>

					<div class="max-h-[50vh] p-2 pt-0">
						<!-- New Chat -->
						<div class="p-2 pb-3">
							<button
								on:click={initializeNewChat}
								class="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
							>
								+ New Chat
							</button>
						</div>

						<div class="max-h-[40vh] overflow-y-auto">
							<!-- Chat History -->
							{#each $chats as chat (chat.id)}
								<div
									class="my-2 flex items-center justify-between rounded bg-white p-3 shadow-sm dark:bg-gray-700 {chat.id ===
									$activeChatId
										? 'border-l-4 border-blue-500'
										: ''}"
								>
									<button
										on:click={() => {
											selectChat(chat.id);
											showMobileDrawer.set(false);
										}}
										class="flex-1 truncate text-left text-gray-700 dark:text-white"
									>
										{chat.title}
									</button>
									<button
										aria-label="delete button"
										on:click={() => deleteChat(chat.id)}
										class="ml-2 text-red-500 hover:text-red-700"
									>
										<i class="fas fa-trash-alt"></i>
									</button>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Non-assisted view: Only show Saved Posts, full height -->
					<div class="flex-1 overflow-y-auto p-4">
						<h4 class="mb-2 font-medium text-gray-500 dark:text-gray-300">Saved Posts</h4>
						{#if $savedPosts.length > 0}
							{#each $savedPosts as post (post.id)}
								<div
									class="mb-2 max-h-[80vh] truncate overflow-y-auto rounded bg-gray-100 p-2 text-sm dark:bg-gray-800 dark:text-white"
								>
									{post.title}
								</div>
							{/each}
						{:else}
							<p class="text-sm text-gray-400 dark:text-gray-500">No saved posts yet.</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
