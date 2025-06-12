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
		journalData,
		user
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
	let showDropdown = false;

	// Bookmarked post IDs (assuming each post has a unique ID or title)
	let bookmarked = new Set(); // local reactive state

	async function fetchUserBookmarks() {
		// const currentUser = get(user);
		const currentUserId = localStorage.getItem('user_id');
		let currentUserToken = '';
		if (currentUserId) {
			currentUserToken = localStorage.getItem(`token-${currentUserId}`);
			console.log('Current user token:', currentUserToken);
		}
		console.log('Current user id:', currentUserId);

		if (!currentUserId && !currentUserToken) {
			console.log('User not logged in. Skipping bookmark fetch.');
			savedPosts.set([]);
			return;
		}

		try {
			let res = '';
			if (currentUserId && currentUserToken) {
				res = await fetch(`http://45.79.125.99:7879/get_bookmarks?user_id=${currentUserId}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${currentUserToken}`
					}
				});
			}
			console.log('res bookmark data:', res);

			const data = await res.json();
			console.log('bookmark data:', data);

			savedPosts.set(data);

			if (res.ok) {
				// Fill the bookmarked set
				bookmarked = new Set(data.map((post) => post.article_url));
				console.log('Bookmarked articles:', bookmarked);
			} else {
				console.error('Failed to fetch bookmarks:', data);
			}
		} catch (err) {
			console.error('Error fetching bookmarks:', err);
		}
	}

	onMount(() => {
		const today = new Date().toISOString().split('T')[0];
		console.log('today:', today);

		startDate.set('');
		endDate.set('');

		flatpickr(calendarRef, {
			mode: 'range',
			dateFormat: 'Y-m-d',
			// defaultDate: [today, today],
			defaultDate: null, // No default range on first load
			allowInput: true, // So user can manually clear
			onChange: function (selectedDates) {
				if (selectedDates.length === 2) {
					startDate.set(selectedDates[0].toISOString().split('T')[0]);
					endDate.set(selectedDates[1].toISOString().split('T')[0]);

					console.log('start date:', $startDate, 'end date:', $endDate);

					// fetchJournalArticles(); //Fetch on date change
				} else {
					// User cleared the range
					startDate.set('');
					endDate.set('');
					console.log('Date range cleared');
				}
				// Fetch no matter what — handles both cases
				fetchJournalArticles();
				fetchUserBookmarks();
			}
		});
		// Fetch on page load (no dates initially)
		fetchJournalArticles();
		fetchUserBookmarks();
	});

	function logout() {
		let userId = localStorage.getItem('user_id');
		console.log('Logging out user with ID:', userId);

		if (userId) {
			localStorage.removeItem(`user_name-${userId}`);
			localStorage.removeItem(`user_email-${userId}`);
			localStorage.removeItem(`token-${userId}`);
			localStorage.removeItem('user_id');
		}

		user.set({ id: null, name: null, email: null, token: null });
		showDropdown = false;
		goto('/login');
	}

	// onMount(async () => {
	// 	const base64Image = await generateCardImage(
	// 		'/template.png',
	// 		'Decoding Pw1 Imprinting in the Postischemic Heart: A Novel Antifibrotic Strategy?'
	// 	);

	// 	console.log('🔍 Generated Base64 Image:', base64Image); // <-- yeh line important hai

	// 	const img = new Image();
	// 	img.src = 'data:image/png;base64,' + base64Image;
	// 	document.body.appendChild(img);
	// });

	async function generateCardImage(templateUrl, titleText) {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = templateUrl;

		await new Promise((resolve) => (img.onload = resolve));

		const canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext('2d');

		// Draw original image
		ctx.drawImage(img, 0, 0);

		// Set text style
		ctx.fillStyle = 'white';
		ctx.font = '600 45px sans-serif'; // semibold
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';

		// Define column layout
		const padding = 10;
		const columnX = canvas.width * 0.3; // Center column starts at 25%
		const columnWidth = canvas.width * 0.4; // 50% width
		const textAreaX = columnX + columnWidth / 2; // Center X of middle column
		const textAreaWidth = columnWidth - 2 * padding;
		const textAreaY = padding;
		const textAreaHeight = canvas.height - 2 * padding;

		// Word wrap logic
		const words = titleText.split(' ');
		let line = '';
		const lines = [];
		for (let n = 0; n < words.length; n++) {
			const testLine = line + words[n] + ' ';
			const metrics = ctx.measureText(testLine);
			const testWidth = metrics.width;
			if (testWidth > textAreaWidth && n > 0) {
				lines.push(line);
				line = words[n] + ' ';
			} else {
				line = testLine;
			}
		}
		lines.push(line.trim());

		// Vertical center
		const lineHeight = 46;
		const totalTextHeight = lines.length * lineHeight;
		let y = textAreaY + (textAreaHeight - totalTextHeight) / 2;

		// Draw lines inside center column
		for (let i = 0; i < lines.length; i++) {
			ctx.fillText(lines[i], textAreaX, y);
			y += lineHeight;
		}

		// Return base64 string
		return canvas.toDataURL('image/png').split(',')[1];
	}

	//   NEW: Generate images and post to update card API

	async function generateAndUploadCards(dataArray) {
		console.log('data', dataArray);
		const payload = await Promise.all(
			dataArray.map(async (item, index) => {
				try {
					console.log(`Processing item ${index}:`, item);

					if (!item.template_url || !item.article_title) {
						console.warn('⚠️ Invalid item found:', item);
						return null; // skip invalid
					}

					const base64Image = await generateCardImage(item.template_url, item.article_title);
					console.log(`✅ base64 (${index}):`, base64Image.slice(0, 50) + '...'); // partial log

					return {
						article_name: item.article_title,
						article_type: 'article',
						specialization: item.specialization || '',
						card_base64: base64Image
					};
				} catch (err) {
					console.error(`❌ Error generating card for item ${index}:`, err);
					return null;
				}
			})
		);
		console.log('payload:', payload);
		// ❗ Filter out null values (invalid or failed items)
		const filteredPayload = payload.filter(Boolean);
		console.log('✅ Final payload:', filteredPayload);

		if (!filteredPayload.length) {
			console.warn('🚫 No valid cards to upload.');
			return;
		}
		// return;

		// POST request to update_card_url
		try {
			const res = await fetch('http://45.79.125.99:7879/update_card_url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(filteredPayload)
			});
			const result = await res.json();
			console.log('Update Card API result:', result);
			return result;
		} catch (err) {
			console.error('Card Update Failed:', err);
		}
	}

	async function fetchJournalArticles() {
		try {
			// const uid = get(userId);
			const uid = localStorage.getItem('user_id') || null;
			const start = get(startDate);
			const end = get(endDate);

			console.log('userId:', uid, 'Start:', start, 'end:', end);

			//TODO:-- use env file variables for urls remove hard coded urls
			// let url = 'http://45.79.125.99:7879/journal_news_articles';

			// Use environment variable (TODO: move to .env in Vite: import.meta.env.VITE_API_URL)
			let baseUrl = 'http://45.79.125.99:7879/journal_news_articles';

			let url = baseUrl;

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
				if (data.journal_articles.some((item) => !item.card_url)) {
					// 🆕 Step: Generate and upload cards
					let generatedImageData = await generateAndUploadCards(data.journal_articles);

					console.log('generatedImageData:', generatedImageData);

					journalData.set(generatedImageData);
					console.log('Fetched journal/news articles:', $journalData);
					// fetchJournalArticles();
				} else {
					// return;
					journalData.set(data.journal_articles);
					console.log('Fetched journal/news articles:', $journalData);
				}
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

		let uid;
		userId.subscribe((v) => (uid = v))();

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
			const response = await fetch('http://45.79.125.99:7778/custom-journal-query', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					queryPrompt: userMsg.text,
					user_id: uid || '' // fallback to empty string if not logged in
				})
			});
			console.log('response:', response);

			const result = await response.json();
			console.log('result:', result);
			// return;

			if (result?.results?.length) {
				const articles = result.results;
				const cards = result.results.map((article) => {
					let finalCardUrl = article.card_url;
					if (!finalCardUrl && article.template_url && article.article_title) {
						// fallback card URL generation (customize this logic if needed)
						const encodedTitle = encodeURIComponent(article.article_title.replace(/\s+/g, '_'));
						finalCardUrl = `${article.template_url.split('?')[0]}?title=${encodedTitle}`;
					}

					return `${article.article_title}\n [Read More](${article.article_url})\n Card: ${finalCardUrl}`;
				});

				// const botMsg = { sender: 'bot', text: data.reply || 'Sorry, no response.' };
				const botMsg = { sender: 'bot', articles: articles || 'Sorry, no response.' };

				messages.update((m) => m.map((msg) => (msg.text === loadingMsg.text ? botMsg : msg)));
				chats.update((c) =>
					c.map((chat) => ({
						...chat,
						messages: chat.messages.map((msg) => (msg.text === loadingMsg.text ? botMsg : msg))
					}))
				);
			} else {
				const noDataMsg = { sender: 'bot', text: 'No articles found for your query.' };
				messages.update((m) => m.map((msg) => (msg.text === loadingMsg.text ? noDataMsg : msg)));
				chats.update((c) =>
					c.map((chat) => ({
						...chat,
						messages: chat.messages.map((msg) => (msg.text === loadingMsg.text ? noDataMsg : msg))
					}))
				);
			}
		} catch (err) {
			console.error('API Error:', err);
			const errorMsg = { sender: 'bot', text: 'No articles found for your query.' };

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

	async function toggleBookmark(post) {
		console.log('post:', post);
		const currentUserId = localStorage.getItem('user_id');
		let currentUserToken = '';
		if (currentUserId) {
			currentUserToken = localStorage.getItem(`token-${currentUserId}`);
			console.log('Current user token:', currentUserToken);
		}
		console.log('Current user id:', currentUserId);

		// const currentUser = get(user);
		// const currentUser = localStorage.getItem('user_id');
		// console.log('Current user:', currentUser);

		if (!currentUserId || !currentUserToken) {
			// alert('Please login to bookmark posts.');
			failedNotificationMessage.set('Please login to bookmark posts.');
			failedNotificationVisible.set(true);
			setTimeout(() => failedNotificationVisible.set(false), 2000);
			return;
		}

		const isBookmarked = bookmarked.has(post.article_url); // or post.id if exists

		console.log('isBookmarked', isBookmarked);
		const url = isBookmarked
			? 'http://45.79.125.99:7879/remove_bookmarks'
			: 'http://45.79.125.99:7879/add_bookmarks';

		console.log('url', url);

		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${currentUserToken}`
				},
				body: JSON.stringify({
					user_id: currentUserId,
					article_name: post.article_title, // this is the article_name in API
					article_type: 'article' // or 'news' if it's a news post
				})
			});

			const data = await res.json();
			console.log(data.message);

			// Toggle local state only if request succeeds
			if (res.ok) {
				if (isBookmarked) {
					bookmarked.delete(post.article_url);
				} else {
					bookmarked.add(post.article_url);
				}
				bookmarked = new Set(bookmarked); // trigger reactivity

				console.log(data.message);
				fetchUserBookmarks();
			} else {
				alert(data.message || 'Bookmark toggle failed.');
			}
		} catch (err) {
			console.error('Bookmark error:', err);
			alert('Something went wrong.');
		}
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

			{#if $user.token}
				<!-- Logged-in View -->
				<div class="relative">
					<button
						on:click={() => (showDropdown = !showDropdown)}
						class="rounded-md bg-blue-500 px-2 py-2 text-sm text-white hover:bg-blue-600"
					>
						<span class="flex items-center justify-between gap-1">
							<i class="fas fa-user text-xs text-white"></i>{$user.name}
						</span>
					</button>

					{#if showDropdown}
						<div
							class="absolute right-0 z-50 mt-2 w-48 rounded-md bg-white shadow-lg dark:bg-gray-700"
						>
							<div class="px-4 py-2 text-sm text-gray-700 dark:text-white">
								<p class="max-w-[180px] truncate overflow-hidden whitespace-nowrap">
									<strong>{$user.name}</strong>
								</p>
								<p class="max-w-[180px] truncate overflow-hidden whitespace-nowrap">
									{$user.email}
								</p>
							</div>
							<hr class="my-1" />
							<button
								on:click={logout}
								class="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								Logout
							</button>
						</div>
					{/if}
				</div>
			{:else}
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
			{/if}
		</div>
	</div>

	<!-- CLASSICAL VIEW -->
	{#if $isMobileView === 'classical'}
		<div class="flex-1 overflow-y-auto bg-gray-100 p-1 pt-[12vh] dark:bg-gray-900">
			{#if $journalData.length === 0}
				<!-- Spinner while data is loading -->
				<div class="flex h-[60vh] items-center justify-center">
					<div
						class="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
					></div>
				</div>
			{:else}
				{#each $journalData as post, index}
					<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
						<!-- Post Image -->
						<a href={post.article_url} target="_blank" rel="noopener noreferrer">
							<img
								src={post.card_url ? post.card_url : post.template_url}
								alt="post"
								class="h-[28vh] w-full cursor-pointer rounded-t-md object-cover"
							/>
						</a>

						<!-- Actions Bar -->
						<div class="flex items-center justify-between px-3 pt-2">
							<!-- Caption -->
							<div class="text-gray-700 dark:text-gray-200">
								<span class="font-bold"><p><strong>Title:</strong> {post.article_title}</p></span>
								<!-- Parsed content -->
								{#if post.openai_content}
									{#await JSON.parse(post.openai_content) then parsed}
										<p><strong>Objective:</strong> {parsed.objective?.join(', ')}</p>
										<p><strong>Results:</strong> {parsed.results}</p>
										<p><strong>Conclusion:</strong> {parsed.conclusion?.join(', ')}</p>
										{#if $user.token}
											<p>
												<strong>Revelance For Doctor:</strong>
												{parsed.relevance_for_doctor?.join(', ')}
											</p>
										{/if}
									{:catch}
										<p class="text-red-500">Invalid AI content format</p>
									{/await}
								{:else}
									<p class="text-gray-500 italic">No AI content available</p>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-end px-4 py-2">
							<!-- <i
							class="far fa-bookmark cursor-pointer text-gray-600 hover:text-yellow-500 dark:text-gray-300"
						></i> -->

							<button
								aria-label="bookmark"
								class={`fa-bookmark cursor-pointer ${
									bookmarked.has(post.article_url) ? 'fas text-yellow-500' : 'far text-gray-600'
								} hover:text-yellow-500 dark:text-gray-300`}
								on:click={() => toggleBookmark(post)}
							></button>
						</div>
					</div>
				{/each}
			{/if}
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
					{#if msg.articles}
						<!-- Custom card rendering -->
						<div class="my-2 space-y-3">
							{#each msg.articles as post}
								<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
									<!-- Post Image -->
									<a href={post.article_url} target="_blank" rel="noopener noreferrer">
										<img
											src={post.card_url ? post.card_url : post.template_url}
											alt="post"
											class="h-[28vh] w-full cursor-pointer rounded-t-md object-cover"
										/>
									</a>

									<!-- Content -->
									<div class="px-4 py-2 text-gray-800 dark:text-gray-200">
										<h3 class="text-md mb-1 font-semibold">Title: {post.article_title}</h3>

										<!-- AI Summary Content -->
										{#if post.openai_content}
											{#await JSON.parse(post.openai_content) then parsed}
												<!-- Objective (truncate to 2 lines) -->
												{#if parsed.objective}
													<p class="line-clamp-1 text-sm">
														<strong>Objective:</strong>
														{parsed.objective.join(', ')}
													</p>
												{/if}

												<!-- Results -->
												{#if parsed.results}
													<p class="line-clamp-1 text-sm">
														<strong>Results:</strong>
														{parsed.results}
													</p>
												{/if}

												<!-- Conclusion -->
												{#if parsed.conclusion}
													<p class="line-clamp-1 text-sm">
														<strong>Conclusion:</strong>
														{parsed.conclusion.join(', ')}
													</p>
												{/if}

												<!-- Relevance (only for logged in users) -->
												{#if $user.token && parsed.relevance_for_doctor}
													<p class="line-clamp-1 text-sm">
														<strong>Relevance For Doctor:</strong>
														{parsed.relevance_for_doctor.join(', ')}
													</p>
												{/if}
											{:catch}
												<p class="text-sm text-red-500">Invalid AI content format</p>
											{/await}
										{:else}
											<p class="text-sm text-gray-500 italic">No AI content available</p>
										{/if}
									</div>

									<!-- Actions: Bookmark & Read More -->
									<div class="flex items-center justify-between px-4 py-2">
										<!-- Bookmark -->
										<button
											aria-label="bookmark"
											class={`fa-bookmark cursor-pointer text-lg ${
												bookmarked.has(post.article_url)
													? 'fas text-yellow-500'
													: 'far text-gray-600'
											} hover:text-yellow-500 dark:text-gray-300`}
											on:click={() => toggleBookmark(post)}
										></button>

										<!-- Read More Button -->
										<a
											href={post.article_url}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-block rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none dark:focus:ring-offset-gray-800"
										>
											Read More →
										</a>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<!-- Regular text message -->
						<div
							class={`my-2 w-fit max-w-[75%] rounded-lg p-3 text-sm ${
								msg.sender === 'user'
									? 'ml-auto bg-blue-500 text-white'
									: 'bg-gray-200 dark:bg-gray-700 dark:text-white'
							}`}
						>
							{msg.text}
						</div>
					{/if}
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
							{#each $savedPosts as post (post.article_url)}
								<a
									href={post.article_url}
									target="_blank"
									rel="noopener noreferrer"
									class="mb-2 block cursor-pointer truncate rounded bg-gray-100 p-2 text-sm text-blue-600 hover:underline dark:bg-gray-800 dark:text-blue-400"
									title={post.article_name}
								>
									{post.article_name}
								</a>
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
							{#each $savedPosts as post (post.article_url)}
								<a
									href={post.article_url}
									target="_blank"
									rel="noopener noreferrer"
									class="mb-2 block cursor-pointer truncate rounded bg-gray-100 p-2 text-sm text-blue-600 hover:underline dark:bg-gray-800 dark:text-blue-400"
									title={post.article_name}
								>
									{post.article_name}
								</a>
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
