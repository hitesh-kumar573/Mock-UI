<script>
	//@ts-nocheck
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import FailedNotification from './FailedNotification.svelte';
	import { fly } from 'svelte/transition';

	let messages = [];
	let chats = writable([]);
	let userInput = '';
	let chatContainer;
	let activeChatId = null;
	let chatIdCounter = 1;

	//Failed Notification
	let failedNotificationVisible = false;
	let failedNotificationMessage = '';

	function initializeNewChat() {
		const newChat = {
			id: chatIdCounter++,
			title: 'New Chat',
			messages: [{ sender: 'bot', text: 'Hi! How can I assist you today?' }]
		};
		chats.update((c) => [newChat, ...c]);
		activeChatId = newChat.id;
		messages = newChat.messages;
	}

	function selectChat(id) {
		chats.subscribe((c) => {
			const chat = c.find((ch) => ch.id === id);
			if (chat) {
				activeChatId = chat.id;
				messages = chat.messages;
			}
		})();
	}

	function updateChatTitle(chatId, newTitle) {
		chats.update((c) => {
			return c.map((chat) => {
				if (chat.id === chatId && chat.title === 'New Chat') {
					return { ...chat, title: newTitle.slice(0, 25) }; // max 25 chars
				}
				return chat;
			});
		});
	}

	// GET: /specialization_category
	async function getSpecializationCategories() {
		const res = await fetch('http://172.105.253.40:7778/specialization_category');
		const data = await res.json();
		console.log(data);
		return data;
	}

	// GET: /news_specialization
	async function getNewsSpecializationTags() {
		const res = await fetch('http://172.105.253.40:7778/news_specialization');
		const data = await res.json();
		console.log(data);
		return data;
	}

	onMount(async () => {
		const categories = await getSpecializationCategories();
		const newsTags = await getNewsSpecializationTags();
		console.log('categories:', categories);
		console.log('newsTags:', newsTags);
	});

	async function sendMessage() {
		if (!userInput.trim() || activeChatId === null) return;

		const userMsg = { sender: 'user', text: userInput.trim() };
		messages = [...messages, userMsg];

		updateChatTitle(activeChatId, userMsg.text);
		userInput = '';

		// Update messages in selected chat
		chats.update((c) =>
			c.map((chat) =>
				chat.id === activeChatId ? { ...chat, messages: [...chat.messages, userMsg] } : chat
			)
		);

		// Show temporary loading message
		const loadingMsg = { sender: 'bot', text: 'Thinking...' };
		messages = [...messages, loadingMsg];

		// Also update in chat store
		chats.update((c) =>
			c.map((chat) =>
				chat.id === activeChatId ? { ...chat, messages: [...chat.messages, loadingMsg] } : chat
			)
		);

		scrollToBottom();

		try {
			const response = await fetch('http://172.105.253.40:7778/specialization_of_category', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ message: userMsg.text })
			});

			const data = await response.json();
			console.log(data);
			const botMsg = {
				sender: 'bot',
				text: data.reply || 'Sorry, no response.'
			};

			// Replace loading message with actual bot response
			messages = messages.map((msg) => (msg === loadingMsg ? botMsg : msg));

			console.log('response', messages);

			chats.update((c) =>
				c.map((chat) =>
					chat.id === activeChatId
						? {
								...chat,
								messages: chat.messages.map((msg) => (msg === loadingMsg ? botMsg : msg))
							}
						: chat
				)
			);
		} catch (err) {
			console.error('API Error:', err);
			const errorMsg = { sender: 'bot', text: 'Sorry, I can not get your message.' };

			messages = messages.map((msg) => (msg === loadingMsg ? errorMsg : msg));

			chats.update((c) =>
				c.map((chat) =>
					chat.id === activeChatId
						? {
								...chat,
								messages: chat.messages.map((msg) => (msg === loadingMsg ? errorMsg : msg))
							}
						: chat
				)
			);
		}

		scrollToBottom();
	}

	function scrollToBottom() {
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}

	onMount(() => {
		initializeNewChat();
	});

	function deleteChat(chatId) {
		chats.update((prev) => {
			if (prev.length <= 1) {
				// alert('At least one chat must remain.');
				failedNotificationMessage = `At least one chat must remain.`;
				failedNotificationVisible = true;
				setTimeout(() => {
					failedNotificationVisible = false;
				}, 5000);
				return prev;
			}

			const filteredChats = prev.filter((chat) => chat.id !== chatId);

			// Agar active chat delete hui, to active chat ko update karo
			if (chatId === activeChatId) {
				// Pehla chat ko select karo jo bach gaya hai
				activeChatId = filteredChats[0]?.id || null;
				messages = filteredChats[0]?.messages || [];
			}

			return filteredChats;
		});
	}

	let scrollContainer;

	const scrollAmount = 500; // px to scroll on each button click

	function scrollLeft() {
		scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
	}

	function scrollRight() {
		scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
	}

	let isMobileView = 'classical'; // 'classical' or 'assisted'
	let selectedDate = ''; // will hold the selected date
	let showMobileDrawer = false;

	let posts = Array(10).fill({ title: 'Medicine Info', description: 'Post content...' });
</script>

<FailedNotification message={failedNotificationMessage} visible={failedNotificationVisible} />

<!-- DESKTOP/TABLET VIEW (unchanged) -->
<div class="hidden h-screen w-screen overflow-hidden font-sans text-sm md:flex">
	<!-- Full-screen layout -->
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

			<!-- Chat History Scroll -->
			<div
				class="scrollbar-thin dark:scrollbar-thumb-gray-600 dark:scrollbar-track-transparent flex-1 space-y-2 overflow-y-auto px-2"
			>
				{#each $chats as chat (chat.id)}
					<div
						class="my-2 flex w-full cursor-pointer items-center justify-between rounded bg-white p-3 text-left shadow-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 {chat.id ===
						activeChatId
							? 'border-l-4 border-blue-500'
							: ''}"
					>
						<!-- {chat.title} -->
						<!-- Select Chat -->
						<button
							on:click={() => selectChat(chat.id)}
							class="flex-1 truncate text-left text-gray-700 dark:text-white"
						>
							{chat.title}
						</button>

						<!-- Delete Button -->
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
				<h1 class="text-lg font-semibold text-gray-800 dark:text-white">Rx AI Assistant</h1>
			</div>

			<!-- Messages: fixed height and scrollable, centered in container -->
			<div class="flex-1 px-2 py-4">
				<div
					bind:this={chatContainer}
					class="scrollbar-thin dark:scrollbar-thumb-gray-600 dark:scrollbar-track-transparent mx-auto w-full max-w-[60vw] overflow-y-auto"
					style="min-height: 300px; max-height: 400px;"
				>
					{#each messages as msg (msg.text)}
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

			<!-- Input Box: centered and slightly above bottom, same max width -->
			<div class="bg-white dark:bg-gray-800">
				<div class="mx-auto flex w-full max-w-[60vw] items-center gap-2 py-4">
					<input
						type="text"
						bind:value={userInput}
						on:keydown={(e) => e.key === 'Enter' && sendMessage()}
						placeholder="Type your message..."
						class="flex-1 rounded-full border px-4 py-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
					/>
					<button
						aria-label="input-button"
						on:click={sendMessage}
						class="rounded-full bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
					>
						<i class="fas fa-paper-plane"></i>
					</button>
				</div>
			</div>

			<!-- Cards Container: big scrollable div -->
			<!-- Cards Container: horizontally scrollable -->
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
								<!-- Left: Rounded user icon -->
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-300 text-xl"
								>
									<!-- You can replace with <FaUserCircle /> if you want an icon package -->
									🏠
								</div>
								<!-- <div class="text-sm opacity-80">User Role or Subtitle</div> -->
								<div class="flex flex-col justify-center gap-1">
									<div class="text-sm opacity-80">User Role or Subtitle</div>
									<div class="truncate text-xl font-semibold">User Name #{i + 1}</div>
								</div>
							</div>

							<!-- Right: Text lines -->
							<div class="flex flex-col justify-center">
								<button class="rounded-md bg-blue-500 p-2 text-sm opacity-80 hover:bg-blue-600"
									>Click here for more</button
								>
								<!-- <div class="truncate text-xl font-semibold">User Name #{i + 1}</div> -->
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

<!-- MOBILE VIEW -->
<div class="flex h-screen flex-col font-sans md:hidden">
	<!-- HEADER: Calendar + Toggle -->
	<div class="flex items-center justify-between bg-white px-2 py-4 shadow dark:bg-gray-800">
		<!-- Calendar (only in classical view) -->
		{#if isMobileView === 'classical'}
			<label class="relative flex items-center">
				<i class="fas fa-calendar-alt cursor-pointer text-xl text-blue-500"></i>
				<input
					type="date"
					bind:value={selectedDate}
					class="absolute top-0 left-0 h-full w-full cursor-pointer opacity-0"
				/>
				{#if selectedDate}
					<p class="px-3 text-xs text-gray-600 dark:text-gray-300">{selectedDate}</p>
				{/if}
			</label>
		{/if}
		{#if isMobileView === 'assisted'}
			<button
				aria-label="drawer button"
				on:click={() => (showMobileDrawer = !showMobileDrawer)}
				class="text-gray-700 dark:text-white"
			>
				<i class="fas fa-bars text-xl"></i>
			</button>
		{/if}
		<!-- <h2 class="text-lg font-semibold text-gray-800 dark:text-white">Rx AI</h2> -->
		<h2 class="text-lg font-semibold text-gray-800 dark:text-white">
			{isMobileView === 'classical' ? 'Classical View' : 'Assisted View'}
		</h2>
		<button
			on:click={() => (isMobileView = isMobileView === 'classical' ? 'assisted' : 'classical')}
			class="rounded-md bg-blue-400 px-2 py-1 text-sm text-gray-700 hover:bg-blue-500 active:bg-blue-500 dark:text-white"
		>
			{isMobileView === 'classical' ? 'Assisted' : 'Classical'}
		</button>
	</div>

	<!-- CLASSICAL VIEW -->
	{#if isMobileView === 'classical'}
		<div class="flex-1 overflow-y-auto bg-gray-100 p-1 dark:bg-gray-900">
			{#each posts as post, index}
				<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
					<!-- User Info -->
					<div class="flex items-center justify-between px-4 py-3">
						<div class="flex items-center gap-3">
							<span class="text-sm font-semibold text-gray-800 dark:text-white"
								>User_{index + 1}</span
							>
						</div>
						<i class="fas fa-ellipsis-h text-gray-500"></i>
					</div>

					<!-- Post Image -->
					<img
						src={`https://images.unsplash.com/photo-1748989431546-1ac17eb1f384?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`}
						alt="post"
						class="h-[50vh] w-full object-cover"
					/>

					<!-- Actions Bar -->
					<div class="flex items-center justify-between px-4 py-2">
						<div class="flex items-center gap-4 text-xl text-gray-600 dark:text-gray-300">
							<i class="far fa-heart cursor-pointer hover:text-red-500"></i>
							<i class="far fa-comment cursor-pointer hover:text-blue-500"></i>
							<i class="far fa-paper-plane cursor-pointer hover:text-green-500"></i>
						</div>
						<i
							class="far fa-bookmark cursor-pointer text-gray-600 hover:text-yellow-500 dark:text-gray-300"
						></i>
					</div>

					<!-- Caption -->
					<div class="px-4 pb-4 text-sm text-gray-700 dark:text-gray-200">
						<span class="font-semibold">User_{index + 1}</span>
						{post.description}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ASSISTED VIEW (ChatGPT-like) -->
	{#if isMobileView === 'assisted'}
		<div class="flex flex-1 flex-col bg-white dark:bg-gray-900">
			<!-- Chat area -->
			<div class="flex-1 overflow-y-auto p-2">
				{#each messages as msg}
					<div
						class={`my-2 w-fit max-w-[75%] rounded-lg p-3 text-sm ${msg.sender === 'user' ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
					>
						{msg.text}
					</div>
				{/each}
			</div>

			<!-- Input -->
			<div class="flex items-center p-2 mb-2">
				<input
					type="text"
					bind:value={userInput}
					placeholder="Ask something..."
					on:keydown={(e) => e.key === 'Enter' && sendMessage()}
					class="flex-1 rounded-full focus:ring-0 active:ring-0 px-3 py-3 text-sm dark:bg-gray-800 dark:text-white"
				/>
				<button
					on:click={sendMessage}
					aria-label="send message button"
					class="ml-2 rounded-full bg-blue-500 px-3 py-2 text-white"
				>
					<i class="fas fa-paper-plane"></i>
				</button>
			</div>
		</div>

		{#if showMobileDrawer}
			<div
				in:fly={{ x: -300, duration: 300 }}
				out:fly={{ x: -300, duration: 300 }}
				class="absolute z-50 flex h-full w-[75%] max-w-xs flex-col bg-white shadow-lg dark:bg-gray-900"
			>
				<!-- Close Button -->
				<div class="flex items-center justify-between p-4">
					<h3 class="text-lg font-semibold text-gray-800 dark:text-white">History</h3>
					<button on:click={() => (showMobileDrawer = false)} aria-label="close drawer">
						<i class="fas fa-times text-lg text-gray-600 dark:text-white"></i>
					</button>
				</div>

				<!-- New Chat -->
				<div class="p-4">
					<button
						on:click={initializeNewChat}
						class="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
					>
						+ New Chat
					</button>
				</div>

				<!-- Chat History -->
				<div class="flex-1 overflow-y-auto px-2">
					{#each $chats as chat (chat.id)}
						<div
							class="my-2 flex items-center justify-between rounded bg-white p-3 shadow-sm dark:bg-gray-700 {chat.id ===
							activeChatId
								? 'border-l-4 border-blue-500'
								: ''}"
						>
							<button
								on:click={() => {
									selectChat(chat.id);
									showMobileDrawer = false;
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
		{/if}
	{/if}
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
