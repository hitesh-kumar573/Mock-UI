<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
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
		endDate
	} from '$lib/stores/ChatStores';
	import FailedNotification from './FailedNotification.svelte';
	import { goto } from '$app/navigation';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';

	let chatContainer;
	let calendarRef;
	let scrollContainer;
	const scrollAmount = 500;

	onMount(() => {
		flatpickr(calendarRef, {
			mode: 'range',
			dateFormat: 'Y-m-d',
			onChange: function (selectedDates) {
				if (selectedDates.length === 2) {
					startDate.set(selectedDates[0].toISOString().split('T')[0]);
					endDate.set(selectedDates[1].toISOString().split('T')[0]);

					console.log('start date:', $startDate, 'end date:', $endDate);
				}
			}
		});
		// initializeNewChat();
	});

	function initializeNewChat() {
		chatIdCounter.update((c) => c + 1);
		let newId;
		chatIdCounter.subscribe((v) => (newId = v))();

		const newChat = {
			id: newId,
			title: 'New Chat',
			messages: [{ sender: 'bot', text: 'Hi! How can I assist you today?' }]
		};

		chats.update((c) => [newChat, ...c]);
		activeChatId.set(newId);
		messages.set(newChat.messages);
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

		// Update messages in selected chat
		chats.update((c) =>
			c.map((chat) =>
				chat.id === currentActiveChatId ? { ...chat, messages: [...chat.messages, userMsg] } : chat
			)
		);

		// Show loading message
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

			// Replace loading message
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

			// Update active chat if deleted
			let currentActiveId;
			activeChatId.subscribe((v) => (currentActiveId = v))();

			if (chatId === currentActiveId) {
				activeChatId.set(filteredChats[0]?.id || null);
				messages.set(filteredChats[0]?.messages || []);
			}

			return filteredChats;
		});
	}

	function scrollLeft() {
		scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
	}

	function scrollRight() {
		scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
	}

	function autoResize(e) {
		const textarea = e.target;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}
</script>

<!-- <FailedNotification /> -->
<FailedNotification message={$failedNotificationMessage} visible={$failedNotificationVisible} />

<div class="hidden h-screen w-screen overflow-hidden font-sans text-sm md:flex">
	<div class="flex h-screen w-screen overflow-hidden font-sans text-sm">
		<!-- Sidebar -->
		<div class="flex w-[280px] flex-shrink-0 flex-col bg-gray-100 dark:bg-gray-900">
			<div class="p-4">
				<button
					on:click={initializeNewChat}
					class="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
				>
					+ New Chat
				</button>
			</div>

			<!-- Chat History -->
			<div
				class="scrollbar-thin dark:scrollbar-thumb-gray-600 dark:scrollbar-track-transparent flex-1 space-y-2 overflow-y-auto px-2"
			>
				{#each $chats as chat (chat.id)}
					<div
						class="my-2 flex w-full cursor-pointer items-center justify-between rounded bg-white p-3 text-left shadow-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 {chat.id ===
						$activeChatId
							? 'border-l-4 border-blue-500'
							: ''}"
					>
						<button
							on:click={() => selectChat(chat.id)}
							class="flex-1 truncate text-left text-gray-700 dark:text-white"
						>
							{chat.title}
						</button>

						<button
							on:click={() => deleteChat(chat.id)}
							class="ml-2 cursor-pointer text-red-500 hover:text-red-700"
							aria-label="Delete chat"
						>
							<i class="fas fa-trash-alt" aria-hidden="true"></i>
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Chat Window -->
		<div class="flex flex-1 flex-col overflow-auto bg-white dark:bg-gray-800">
			<!-- Header -->
			<div class="flex items-center justify-between bg-white px-6 py-4 dark:bg-gray-800">
				<h1 class="text-lg font-semibold text-gray-800 dark:text-white">CareSnippet</h1>
				<div class="flex items-center justify-between gap-2">
					<div class="relative flex w-fit items-center text-xs">
						<input
							type="text"
							placeholder="Select range"
							class="w-full rounded-lg border p-2 pr-6 focus:ring-0 focus:outline-none active:right-0 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
							bind:this={calendarRef}
							readonly
						/>
						<!-- Calendar Icon -->
						<i class="fas fa-calendar-alt pointer-events-none absolute top-3 right-3 text-gray-500"
						></i>
					</div>
					<button
						on:click={() => goto('/login')}
						class="rounded-md bg-blue-500 px-2 py-1 text-sm text-gray-700 hover:bg-blue-600 active:bg-blue-600 dark:text-white"
					>
						<i class="fas fa-user text-white"></i>
						Login
					</button>
				</div>
			</div>

			<!-- Messages -->
			<div class="flex-1 px-2 py-4">
				<div
					bind:this={chatContainer}
					class="scrollbar-thin dark:scrollbar-thumb-gray-600 dark:scrollbar-track-transparent mx-auto w-full max-w-[60vw] overflow-y-auto"
					style="min-height: 300px; max-height: 400px;"
				>
					<!-- {#each $messages as msg (msg.text)} -->
					{#each $messages as msg, index (index)}
						<div class="flex">
							<div
								class={`my-2 max-w-[60%] rounded-lg px-4 py-2 ${
									msg.sender === 'user'
										? 'ml-auto rounded-br-none bg-blue-500 text-white'
										: 'rounded-bl-none bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
								}`}
							>
								{msg.text}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Input Box -->
			<div class="bg-white dark:bg-gray-800">
				<div class="mx-auto flex w-full max-w-[60vw] items-center gap-2 py-4">
					<input
						type="text"
						bind:value={$userInput}
						on:keydown={(e) => e.key === 'Enter' && sendMessage()}
						placeholder="Type your message..."
						class="flex-1 rounded-full border px-4 py-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
					/>
					<button
						on:click={sendMessage}
						class="rounded-full bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
						aria-label="Send message"
					>
						<i class="fas fa-paper-plane"></i>
					</button>
				</div>
			</div>

			<!-- Cards Container -->
			<div class="relative w-full">
				<button
					on:click={scrollLeft}
					aria-label="Scroll left"
					class="bg-opacity-30 hover:bg-opacity-50 absolute top-1/2 left-2 z-10 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded bg-black p-2 text-xl text-white transition"
				>
					&#8249;
				</button>

				<div
					bind:this={scrollContainer}
					class="scrollbar-none scrollbar-thin dark:scrollbar-thumb-gray-600 dark:scrollbar-track-transparent flex gap-4 overflow-x-auto scroll-smooth px-12 py-4"
				>
					{#each Array(10) as _, i}
						<div
							class="flex h-32 min-w-[250px] flex-shrink-0 flex-col items-center gap-4 rounded-lg bg-blue-500 p-4 text-white"
						>
							<div class="flex w-full items-center gap-2">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-300 text-xl"
								>
									🏠
								</div>
								<div class="flex flex-col justify-center gap-1">
									<div class="text-sm opacity-80">User Role or Subtitle</div>
									<div class="truncate text-xl font-semibold">User Name #{i + 1}</div>
								</div>
							</div>
							<div class="flex flex-col justify-center">
								<button class="rounded-md bg-blue-500 p-2 text-sm opacity-80 hover:bg-blue-600"
									>Click here for more</button
								>
							</div>
						</div>
					{/each}
				</div>

				<button
					on:click={scrollRight}
					aria-label="Scroll right"
					class="bg-opacity-30 hover:bg-opacity-50 absolute top-1/2 right-2 z-10 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded bg-black p-2 text-xl text-white transition"
				>
					&#8250;
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');

	/* Optional: hide default scrollbar for better UI */
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
	/* Custom dark scrollbars – works in WebKit (Chrome, Edge, Safari) */
	::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	::-webkit-scrollbar-track {
		background: transparent;
	}

	::-webkit-scrollbar-thumb {
		background-color: rgba(100, 100, 100, 0.6);
		border-radius: 10px;
		border: 2px solid transparent;
		background-clip: content-box;
		transition: background-color 0.3s ease;
	}

	::-webkit-scrollbar-thumb:hover {
		background-color: rgba(160, 160, 160, 0.8);
	}

	/* Firefox support */
	* {
		scrollbar-width: thin;
		scrollbar-color: rgba(100, 100, 100, 0.6) transparent;
	}
</style>
