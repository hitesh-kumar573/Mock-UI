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
		user,
		newsData
	} from '$lib/stores/ChatStores';

	import FailedNotification from './FailedNotification.svelte';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { onMount, tick } from 'svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';
	import { get } from 'svelte/store';
	import LoginPopNotification from './loginComponents/LoginPopNotification.svelte';
	import MobileJournalView from './MobileJournalView.svelte';
	import MobileNewsView from './MobileNewsView.svelte';
	import SectionHeader from './SectionHeader.svelte';

	const baseUrl = import.meta.env.VITE_API_BASE_URL;
	const baseUrlForCustomQuery = import.meta.env.VITE_API_BASE_URL_FOR_CUSTOM_QUERY;

	let showLoginPopup = false;

	let calendarRef;
	let chatContainer;
	let showDropdown = false;

	let dropdownPosition = 'bottom'; // 'top' or 'bottom'
	let menuChatId = null; // to track which chat's menu is open
	let renamingChatId = null;
	let newTitle = '';

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
				res = await fetch(`${baseUrl}/get_bookmarks?user_id=${currentUserId}`, {
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
		const currentView = get(isMobileView);

		if (currentView === 'classical') {
			const today = new Date().toISOString().split('T')[0];
			console.log('today:', today);

			startDate.set('');
			endDate.set('');

			flatpickr(calendarRef, {
				mode: 'range',
				dateFormat: 'Y-m-d',
				maxDate: 'today',
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
		} else {
			fetchJournalArticles();
			fetchUserBookmarks();
		}
	});

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
		showDropdown = false;
		goto('/login');
	}

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

					const isNews = item.type === 'news';

					// Validate required fields
					if (!item.template_url || !(isNews ? item.title : item.article_title)) {
						console.warn('⚠️ Invalid item found:', item);
						return null; // skip invalid
					}

					// Decide title to use (for card generation)
					let titleToUse = isNews ? item.title : item.article_title;

					// Try OpenAI title if article_title is too long (only for journal)
					if (!isNews && item.article_title.length > 50 && item.openai_content) {
						try {
							const parsed = JSON.parse(item.openai_content);
							if (parsed?.title) {
								titleToUse = parsed.title;
								console.log(`📌 Using openai_content title for item ${index}:`, titleToUse);
							}
						} catch (e) {
							console.warn(`⚠️ Failed to parse openai_content for item ${index}`, e);
						}
					}

					console.log('title:', titleToUse);

					const base64Image = await generateCardImage(item.template_url, titleToUse);
					console.log(`✅ base64 (${index}):`, base64Image.slice(0, 50) + '...'); // partial log

					return {
						article_name: isNews ? item.title : item.article_title,
						article_type: isNews ? 'news' : 'article',
						specialization: isNews ? '' : item.specialization || '',
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
			const res = await fetch(`${baseUrl}/update_card_url`, {
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
			let mainUrl = `${baseUrl}/journal_news_articles`;

			let url = mainUrl;

			// Case: User not registered (userId not set)
			if (!uid) {
				// url = 'http://45.79.125.99:7879/journal_news_articles';
				url += '?total=20';
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

			if (!res.ok) {
				console.error('Fetch failed:', data);
				return;
			}

			// Journal Articles
			const rawJournal = (data?.journal_articles || []).filter(
				(item) => item.article_title !== 'Issue Information'
			);
			const validJournal = rawJournal.filter(
				(item) => item.card_url && item.card_url.trim() !== '' && item.card_url !== 'null'
			);
			const missingJournal = rawJournal.filter(
				(item) => !item.card_url || item.card_url.trim() === '' || item.card_url === 'null'
			);

			console.log('raw Journal:', rawJournal);
			console.log('valid Journal:', validJournal);
			console.log('missing Journal:', missingJournal);

			// News Articles
			const rawNews = data?.news_articles || [];
			const validNews = rawNews.filter(
				(item) => item.card_url && item.card_url.trim() !== '' && item.card_url !== 'null'
			);
			const missingNews = rawNews.filter(
				(item) => !item.card_url || item.card_url.trim() === '' || item.card_url === 'null'
			);

			console.log('raw news:', rawNews);
			console.log('valid news:', validNews);
			console.log('missing news:', missingNews);

			// Combine missing for generation
			const allMissing = [
				...missingJournal.map((item) => ({ ...item, type: 'journal' })),
				...missingNews.map((item) => ({ ...item, type: 'news' }))
			];

			console.log('all missing:', allMissing);

			// return;

			let generatedCards = [];
			if (allMissing.length > 0) {
				const generated = await generateAndUploadCards(allMissing);
				generatedCards = generated?.results?.results || [];
				console.log('generated:', generated);
			}

			// Split generated cards by type
			// const generatedJournal = generatedCards.filter((item) => item.type === 'journal');
			// const generatedNews = generatedCards.filter((item) => item.type === 'news');

			const generatedJournal = generatedCards.filter(
				(item) => item.specialization && item.specialization.trim() !== ''
			);
			const generatedNews = generatedCards.filter(
				(item) => !item.specialization || item.specialization.trim() === ''
			);

			console.log('generatedJournal:', generatedJournal);
			console.log('generatedNews:', generatedNews);

			// Final combine
			const finalJournal = [...validJournal, ...generatedJournal];
			const finalNews = [...validNews, ...generatedNews];

			// Set in stores
			journalData.set(finalJournal);
			newsData.set(finalNews);

			console.log('Final Journal Articles:', finalJournal);
			console.log('Final News Articles:', finalNews);
		} catch (error) {
			console.error('Fetch failed:', error);
		}
	}

	// onMount(async () => {
	// 	await initializeNewChat();
	// 	await fetchUserChats();
	// 	// Todo2:-- get users chat
	// 	// URL/chats/{user_id}
	// 	// call this api here to get all chats of particular user
	// });

	onMount(async () => {
		await fetchUserChats(); // Always fetch first

		const currentChats = get(chats);
		if (!currentChats || currentChats.length === 0) {
			initializeNewChat(); // Only if no chats exist after fetch
		}
	});

	async function fetchUserChats() {
		const currentUserId = localStorage.getItem('user_id');
		if (!currentUserId) {
			console.log('Guest user – skipping chat fetch');
			chats.set([]);
			return; // skip for guest
		}

		let currentUserToken = '';
		if (currentUserId) {
			currentUserToken = localStorage.getItem(`token-${currentUserId}`);
			console.log('Current user token:', currentUserToken);
		}
		console.log('Current user id:', currentUserId);
		try {
			const res = await fetch(`${baseUrl}/chats/${currentUserId}`, {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${currentUserToken}`
				}
			});

			if (!res.ok) throw new Error('Failed to fetch chats');

			const data = await res.json();

			console.log('fetched data:', data);
			// Add messages placeholder for each chat
			const formattedChats = data.map((chat) => ({
				id: chat.chat_id,
				title: chat.title,
				messages: [] // You can fetch specific chat messages later if needed
			}));

			chats.set(formattedChats);

			// Auto-select first chat if any exist
			if (formattedChats.length > 0) {
				selectChat(formattedChats[0].id); // auto-load first chat's messages
			}
		} catch (error) {
			console.error('Error fetching user chats:', error);
		}
	}

	async function initializeNewChat() {
		chatIdCounter.update((c) => c + 1);
		const newId = get(chatIdCounter); // get the updated value synchronously

		const currentUserId = localStorage.getItem('user_id');
		let currentUserToken = '';
		if (currentUserId) {
			currentUserToken = localStorage.getItem(`token-${currentUserId}`);
			console.log('Current user token:', currentUserToken);
		}
		console.log('Current user id:', currentUserId);

		const isGuest = !currentUserId;

		chatIdCounter.update((c) => c + 1);
		// const newId = get(chatIdCounter); // local unique ID

		if (isGuest) {
			//  Guest user – Create temp chat locally
			const tempChat = {
				id: newId,
				title: 'New Chat',
				messages: [{ sender: 'bot', text: 'Hi! How can I assist you today?' }]
			};

			chats.update((c) => [tempChat, ...c]);
			activeChatId.set(newId);
			messages.set(tempChat.messages);
			await tick();
			scrollToBottom();
			return;
		}

		// let newId;
		// chatIdCounter.subscribe((v) => (newId = v))();

		//Todo1:- add chat
		//  URL/chats/
		// call this api here for adding every new chat when component render or user manually add it by clicking on new chat button
		try {
			const res = await fetch(`${baseUrl}/chats/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${currentUserToken}`
				},
				body: JSON.stringify({
					// user_id: currentUserId,
					user_id: Number(currentUserId),
					title: 'New Chat'
				})
			});

			console.log('res:', res);

			if (!res.ok) {
				const errorText = await res.text(); // OR use res.json() if API returns JSON error
				console.error('Failed to create chat:', errorText);
				throw new Error('Failed to create chat');
			}

			const data = await res.json();
			console.log('response data:', data);

			const newChat = {
				id: data.chat_id,
				title: data.title,
				messages: [{ sender: 'bot', text: 'Hi! How can I assist you today?' }]
			};

			chats.update((c) => [newChat, ...c]);
			activeChatId.set(data.chat_id);
			messages.set(newChat.messages);

			await tick(); // ensure DOM updates after setting messages
			scrollToBottom(); // scroll to bottom so message is visible
		} catch (error) {
			console.error('Error creating new chat:', error);
		}
	}

	async function selectChat(id) {
		//Todo4:-- Get messages of a previous chat
		// URL/messages/{chat_id}
		// call this api here for getting particular chats messages

		const currentUserId = localStorage.getItem('user_id');
		let currentUserToken = '';
		if (currentUserId) {
			currentUserToken = localStorage.getItem(`token-${currentUserId}`);
		}

		// 	chats.subscribe((c) => {
		// 		const chat = c.find((ch) => ch.id === id);
		// 		if (chat) {
		// 			activeChatId.set(chat.id);
		// 			messages.set(chat.messages);
		// 		}
		// 	})();
		// }

		try {
			const res = await fetch(`${baseUrl}/messages/${id}`, {
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${currentUserToken}`
				}
			});

			let parsedMessages;

			// ⚠️ If chat is new (no messages yet), fallback to default
			if (!res.ok) {
				console.warn('New chat selected or messages not found. Showing default message.');

				parsedMessages = [{ sender: 'bot', text: 'Hi! How can I assist you today?' }];
			} else {
				const data = await res.json();
				console.log('data:', data);

				// parsedMessages = data.flatMap((item) => [
				// 	{ sender: 'user', text: item.user_text },
				// 	{
				// 		sender: 'bot',
				// 		articles: item.response_json?.results || []
				// 	}
				// ]);
				parsedMessages = data.flatMap((item) => {
					// 🌟 Normalize and map articles
					const articles = (item.response_json?.results || []).map((article) => {
						const isNews = !!(article.article_headline || article.article_description);
						const isJournal = !!article.article_title || article.openai_content;

						return {
							article_type: isNews ? 'news' : 'article',
							title: article.article_headline || article.article_title || 'Untitled',
							summary: article.article_description || article.article_summary || '',
							article_title: article.article_title || article.article_headline || 'Untitled',
							article_url: article.article_url || '',
							card_url: article.card_url || article.template_url || '',
							openai_content:
								article.openai_content ||
								(article.article_description
									? JSON.stringify({ objective: [article.article_description] })
									: null),
							specialization: article.specialization || article.article_health_speciality || '',
							date:
								article.date ||
								article.article_modified_date ||
								article.article_publication_date ||
								''
						};
					});

					console.log('Mapped Articles:', articles);

					return [
						{ sender: 'user', text: item.user_text },
						{ sender: 'bot', articles }
					];
				});
			}

			chats.update((c) =>
				c.map((chat) => (chat.id === id ? { ...chat, messages: parsedMessages } : chat))
			);

			activeChatId.set(id);
			messages.set(parsedMessages);

			await tick();
			scrollToBottom();
		} catch (error) {
			console.error('Error fetching messages:', error);
		}
	}

	async function updateChatTitle(chatId, newTitle) {
		//Todo5:-- Change title of chat
		// URL/chats/change_title
		// {
		//  "user_id": 1,
		//   "chat_id": 2,
		//   "new_title": "Latest Articles on Nephrology."
		// }

		const currentUserId = localStorage.getItem('user_id');
		let currentUserToken = '';
		if (currentUserId) {
			currentUserToken = localStorage.getItem(`token-${currentUserId}`);
		}

		// call this api here to update the title of the chat by user manually
		// 	chats.update((c) => {
		// 		return c.map((chat) => {
		// 			if (chat.id === chatId && chat.title === 'New Chat') {
		// 				return { ...chat, title: newTitle.slice(0, 25) };
		// 			}
		// 			return chat;
		// 		});
		// 	});
		// }

		try {
			const res = await fetch(`${baseUrl}/chats/change_title`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${currentUserToken}`
				},
				body: JSON.stringify({
					user_id: Number(currentUserId),
					chat_id: chatId,
					new_title: newTitle
				})
			});

			if (!res.ok) throw new Error('Failed to update chat title');

			const data = await res.json();
			console.log('Title updated:', data);

			// Update local state
			chats.update((c) =>
				c.map((chat) =>
					chat.id === chatId ? { ...chat, title: data.new_title.slice(0, 25) } : chat
				)
			);
		} catch (error) {
			console.error('Error updating chat title:', error);
		}
	}

	async function sendMessage() {
		const currentUserId = localStorage.getItem('user_id');
		let currentUserToken = '';
		if (currentUserId) {
			currentUserToken = localStorage.getItem(`token-${currentUserId}`);
		}
		let currentUserInput;
		userInput.subscribe((v) => (currentUserInput = v))();

		if (!currentUserInput.trim()) return;

		let currentActiveChatId;
		activeChatId.subscribe((v) => (currentActiveChatId = v))();

		if (currentActiveChatId === null) return;

		let uid = currentUserId;
		// userId.subscribe((v) => (uid = v))();
		console.log('uid from send func:', uid);

		const userMsg = { sender: 'user', text: currentUserInput.trim() };
		messages.update((m) => [...m, userMsg]);
		updateChatTitle(currentActiveChatId, userMsg.text);
		userInput.set('');

		chats.update((c) =>
			c.map((chat) =>
				chat.id === currentActiveChatId ? { ...chat, messages: [...chat.messages, userMsg] } : chat
			)
		);

		const loadingMsg = { sender: 'bot', type: 'typing' };
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
			const response = await fetch(`http://45.79.125.99:7778/custom-journal-query`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					queryPrompt: userMsg.text,
					user_id: uid || '' // fallback to empty string if not logged in
				})
			});
			console.log('response:', response);

			const result = await response.json();
			console.log('query result:', result);
			// return;

			if (result?.results?.length) {
				//Todo3:-- add message to database api calls here
				// "chat_id": 2,
				// "user_text": "I need some latest articles related to nephrology.",
				// "response_json": result

				// api:- URL/messages/
				// header should contain Authorization
				const isGuest = !uid;
				if (!isGuest) {
					//Save user query and AI response in DB
					try {
						console.log('token:', currentUserToken);
						console.log('currentActiveChatId:', currentActiveChatId);
						console.log('userMsg text:', userMsg.text);
						console.log('result:', result);

						const saveRes = await fetch(`${baseUrl}/messages/`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${currentUserToken}`
							},
							body: JSON.stringify({
								chat_id: currentActiveChatId,
								user_text: userMsg.text,
								response_json: result // full result object
							})
						});
						console.log('Message saved to data base response:', saveRes);

						const saveData = await saveRes.json();
						console.log('Message saved to data base:', saveData);
					} catch (err) {
						console.error('Error saving message:', err);
					}
				} else {
					console.log('Guest mode: message not saved to DB');
				}

				const rawArticles = result?.results || [];

				// Separate into missing & valid card_url sets
				const validArticles = rawArticles.filter(
					(a) => a.card_url && a.card_url.trim() !== '' && a.card_url !== 'null'
				);

				const missingArticles = rawArticles.filter(
					(a) => !a.card_url || a.card_url.trim() === '' || a.card_url === 'null'
				);

				// Add type info for generator
				const allMissing = missingArticles.map((item) => ({
					...item,
					type: item.specialization && item.specialization.trim() !== '' ? 'journal' : 'news'
				}));

				// If any card_url is missing, generate
				let generatedCards = [];
				if (allMissing.length > 0) {
					const generated = await generateAndUploadCards(allMissing);
					generatedCards = generated?.results?.results || [];
				}

				// Combine
				const allArticles = [...validArticles, ...generatedCards];

				// const articles = result?.results;
				const articles = allArticles.map((article) => {
					const isNews = article.article_headline && article.article_url;
					const isJournal = article.article_title && article.article_url;

					return {
						article_type: isNews ? 'news' : 'article',
						article_title: article.article_title || article.article_headline || 'Untitled',
						title: article.article_headline || article.article_title || 'Untitled',
						summary: article.article_description || '',
						article_url: article.article_url || '',
						card_url: article.card_url || article.template_url || '',
						openai_content:
							article.openai_content ||
							(article.article_description
								? JSON.stringify({ objective: [article.article_description] })
								: null),
						specialization: article.specialization || article.article_health_speciality || '',
						date: article.date || article.article_modified_date || ''
					};
				});

				console.log('articles:', articles);

				const cards = result?.results.map((article) => {
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

	async function deleteChat(chatId) {
		const currentUserId = localStorage.getItem('user_id');
		let currentUserToken = '';
		if (currentUserId) {
			currentUserToken = localStorage.getItem(`token-${currentUserId}`);
		}

		// Check if only one chat remains
		const currentChats = get(chats);
		if (currentChats.length <= 1) {
			failedNotificationMessage.set('At least one chat must remain.');
			failedNotificationVisible.set(true);
			setTimeout(() => failedNotificationVisible.set(false), 4000);
			return;
		}

		// If user is NOT logged in, delete locally only
		if (!currentUserId || !currentUserToken) {
			chats.update((prev) => {
				const filteredChats = prev.filter((chat) => chat.id !== chatId);

				let currentActiveId;
				activeChatId.subscribe((v) => (currentActiveId = v))();

				if (chatId === currentActiveId) {
					activeChatId.set(filteredChats[0]?.id || null);
					messages.set(filteredChats[0]?.messages || []);
				}

				return filteredChats;
			});
			return;
		}

		// Logged-in user — delete from backend
		try {
			const response = await fetch(`${baseUrl}/chats/delete_chat`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${currentUserToken}`
				},
				body: JSON.stringify({
					user_id: Number(currentUserId),
					chat_id: chatId
				})
			});
			console.log('response:', response);

			const data = await response.json();
			console.log('data:', data);

			if (response.ok && Array.isArray(data) && data[0] === 'Chat deleted successfully') {
				chats.update((prev) => {
					const filteredChats = prev.filter((chat) => chat.id !== chatId);

					let currentActiveId;
					activeChatId.subscribe((v) => (currentActiveId = v))();

					if (chatId === currentActiveId) {
						activeChatId.set(filteredChats[0]?.id || null);
						messages.set(filteredChats[0]?.messages || []);
					}

					return filteredChats;
				});
			} else {
				throw new Error('Failed to delete chat from server');
			}
		} catch (error) {
			console.error('Delete chat error:', error);
			failedNotificationMessage.set('Failed to delete chat.');
			failedNotificationVisible.set(true);
			setTimeout(() => failedNotificationVisible.set(false), 4000);
		}
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

		if (!currentUserId || !currentUserToken) {
			showLoginPopup = false;
			await tick();
			showLoginPopup = true;
			return;
		}

		// 🔍 Determine if it's a journal or news article
		// const isJournal = post.article_title || post.article_name || post.article_url;
		const isJournal = !!(post.article_title || post.article_name || post.article_url);
		const articleName = post.article_title || post.article_name || post.title || 'Untitled';
		const articleUrl = post.article_url || post.url || '';

		const articleType = post.article_type
			? post.article_type.toLowerCase()
			: isJournal
				? 'article'
				: 'news';

		const isBookmarked = bookmarked.has(articleUrl);

		// const isBookmarked = bookmarked.has(post.article_url); // or post.id if exists

		console.log('isBookmarked', isBookmarked);
		const url = isBookmarked ? `${baseUrl}/remove_bookmarks` : `${baseUrl}/add_bookmarks`;

		console.log('url', url);

		console.log('→ Toggling bookmark:', {
			articleName,
			articleUrl,
			articleType,
			isBookmarked
		});

		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${currentUserToken}`
				},
				body: JSON.stringify({
					user_id: currentUserId,
					article_name: articleName,
					article_type: articleType
				})
			});

			const data = await res.json();
			console.log(data.message);

			// Toggle local state only if request succeeds
			if (res.ok) {
				if (isBookmarked) {
					bookmarked.delete(articleUrl);
				} else {
					bookmarked.add(articleUrl);
				}
				bookmarked = new Set(bookmarked); // trigger reactivity

				console.log(data.message);
				fetchUserBookmarks();
			} else {
				// alert(data.message || 'Bookmark toggle failed.');
				failedNotificationMessage.set(data.message || 'Bookmark toggle failed.');
				failedNotificationVisible.set(true);
				setTimeout(() => failedNotificationVisible.set(false), 4000);
			}
		} catch (err) {
			console.error('Bookmark error:', err);
			// alert('Something went wrong.');
			failedNotificationMessage.set('Bookmark error:', err);
			failedNotificationVisible.set(true);
			setTimeout(() => failedNotificationVisible.set(false), 4000);
		}
	}

	let expandedCards = new Set();

	function toggleCard(index) {
		if (expandedCards.has(index)) {
			expandedCards.delete(index);
		} else {
			expandedCards.add(index);
		}
		// Force reactive update
		expandedCards = new Set(expandedCards);
	}
</script>

<!-- <FailedNotification /> -->
<FailedNotification message={$failedNotificationMessage} visible={$failedNotificationVisible} />
<!-- Login Popup -->
<LoginPopNotification visible={showLoginPopup} />

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
				class="rounded-md bg-blue-500 px-2 py-2 text-sm text-gray-700 hover:bg-blue-600 active:bg-blue-600 active:text-white dark:text-white"
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
						<span class="flex max-w-[60px] items-center justify-between gap-1 truncate">
							<i class="fas fa-user text-xs text-white"></i>
							{#if $user.name}
								<span class="truncate overflow-hidden whitespace-nowrap">
									{$user.name}
								</span>
							{:else}
								<span class="truncate overflow-hidden whitespace-nowrap">
									{$user.id}
								</span>
							{/if}
						</span>
					</button>

					{#if showDropdown}
						<div
							class="absolute right-0 z-50 mt-2 w-48 rounded-md bg-white shadow-lg dark:bg-gray-700"
						>
							<div class="px-4 py-2 text-sm text-gray-700 dark:text-white">
								{#if $user.name}
									<p class="max-w-[180px] truncate overflow-hidden whitespace-nowrap">
										<strong>{$user.name}</strong>
									</p>
									<p class="max-w-[180px] truncate overflow-hidden whitespace-nowrap">
										{$user.id}
									</p>
								{:else if $user.email}
									<p class="max-w-[180px] truncate overflow-hidden whitespace-nowrap">
										{$user.email}
									</p>
								{:else}
									<p class="max-w-[180px] truncate overflow-hidden whitespace-nowrap">
										{$user.id}
									</p>
								{/if}
							</div>
							<div class="px-4 py-2 text-sm text-gray-700 dark:text-white">
								<button
									class="cursor-pointer"
									on:click={() => {
										console.log('Updating...');
										goto('/update-profile');
									}}
								>
									Edit Profile
								</button>
							</div>
							<hr class="my-1" />
							<button
								on:click={logout}
								class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
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
		{#if $journalData.length > 0}
			<MobileJournalView
				journalData={$journalData}
				{expandedCards}
				{toggleCard}
				{toggleBookmark}
				{bookmarked}
				user={$user}
			/>
		{/if}

		{#if $newsData.length > 0}
			<MobileNewsView
				newsData={$newsData}
				{expandedCards}
				{toggleCard}
				{toggleBookmark}
				{bookmarked}
			/>
		{/if}
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
							{#each msg.articles as post, index}
								<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
									<!-- Post Image -->
									<a href={post.article_url} rel="noopener noreferrer">
										<img
											src={post.card_url ? post.card_url : post.template_url}
											alt="post"
											class="h-[28vh] w-full cursor-pointer rounded-t-md object-cover"
										/>
									</a>

									<!-- Content -->
									<div class="px-4 py-2 text-gray-800 dark:text-gray-200">
										{#if post.article_type === 'news'}
											<!-- News Format -->
											<p class="font-semibold"><strong>Title:</strong> {post.title}</p>

											{#if post.summary}
												{#if expandedCards.has(index)}
													<p><strong>Summary:</strong> {post.summary}</p>
												{/if}
											{:else}
												<p class="text-gray-500 italic">No summary available</p>
											{/if}
										{:else}
											<!-- Journal/AI Summary Format -->
											<h3 class="text-md mb-1 font-semibold">Title: {post.article_title}</h3>
											{#if post.openai_content}
												{#await JSON.parse(post.openai_content) then parsed}
													<div class="transition-max-height space-y-1 overflow-hidden">
														{#if parsed.objective?.length}
															<p><strong>Objective:</strong> {parsed.objective.join(', ')}</p>
														{/if}
														{#if expandedCards.has(index)}
															{#if parsed.results}
																<p><strong>Results:</strong> {parsed.results}</p>
															{/if}
															{#if parsed.conclusion?.length}
																<p><strong>Conclusion:</strong> {parsed.conclusion.join(', ')}</p>
															{/if}
															{#if $user.token && parsed.relevance_for_doctor?.length}
																<p>
																	<strong>Relevance For Doctor:</strong>
																	{parsed.relevance_for_doctor.join(', ')}
																</p>
															{/if}
														{/if}
													</div>
												{:catch}
													<p class="text-red-500">Invalid AI content format</p>
												{/await}
											{:else}
												<p class="text-gray-500 italic">No AI content available</p>
											{/if}
										{/if}
									</div>

									<!-- Actions: Bookmark & Read More -->
									<div class="relative flex items-center justify-between px-4 py-2">
										<!-- Bookmark -->
										<button
											aria-label="bookmark"
											class={`fa-bookmark cursor-pointer ${
												bookmarked.has(post.article_url)
													? 'fas text-yellow-500'
													: 'far text-gray-600'
											} hover:text-yellow-500 dark:text-gray-300`}
											on:click={() => toggleBookmark(post)}
										></button>
										<!-- Read More / Read Less -->
										<button
											class="inline-block rounded-md bg-blue-500 px-2 py-1 text-sm font-medium text-white transition duration-200 hover:bg-blue-600 focus:ring-0 focus:outline-none dark:focus:ring-offset-gray-800"
											on:click={() => toggleCard(index)}
										>
											{#if expandedCards.has(index)}
												Read Less <i class="fas fa-chevron-up ml-1"></i>
											{:else}
												Read More <i class="fas fa-chevron-down ml-1"></i>
											{/if}
										</button>
									</div>
								</div>
							{/each}
						</div>
					{:else if msg.type === 'typing'}
						<!-- Typing animation -->
						<div
							class="my-2 w-fit max-w-[75%] rounded-lg bg-gray-200 p-3 text-sm dark:bg-gray-700 dark:text-white"
						>
							<span class="flex items-center gap-1 space-x-1">
								<span>Thinking</span>
								<span class="typing-dots flex items-center space-x-1">
									<span class="dot"></span>
									<span class="dot"></span>
									<span class="dot"></span>
								</span>
							</span>
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

						<div class="chat-container max-h-[40vh] overflow-y-auto">
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
									<!-- <button
										aria-label="delete button"
										on:click={() => deleteChat(chat.id)}
										class="ml-2 text-red-500 hover:text-red-700"
									>
										<i class="fas fa-trash-alt"></i>
									</button> -->

									<!-- 3-dots menu -->
									<div class="relative z-10 ml-2">
										<button
											aria-label="chat action button"
											on:click={(e) => {
												const btn = e.currentTarget;
												const rect = btn.getBoundingClientRect();
												const container = btn.closest('.chat-container');
												if (!container) return;
												const containerRect = container.getBoundingClientRect();

												const spaceBelow = containerRect.bottom - rect.bottom;
												const spaceAbove = rect.top - containerRect.top;

												dropdownPosition =
													spaceBelow < 100 && spaceAbove > spaceBelow ? 'top' : 'bottom';
												menuChatId = menuChatId === chat.id ? null : chat.id;
											}}
											class="text-gray-600 hover:text-gray-800 dark:text-white"
										>
											<i class="fas fa-ellipsis-v"></i>
										</button>

										<!-- Dropdown -->
										{#if menuChatId === chat.id}
											<div
												class={`absolute z-30 flex w-fit items-center justify-between gap-2 rounded-md bg-white px-2 py-1 shadow-lg dark:bg-gray-800 ${
													$user.token
														? dropdownPosition === 'top'
															? 'bottom-0'
															: 'top-0'
														: dropdownPosition === 'top'
															? 'bottom-0'
															: '-top-2'
												} right-3`}
											>
												{#if $user.token}
													<!-- Rename -->
													<button
														aria-label="rename button"
														class="my-1 block w-full rounded-md border border-gray-200 px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
														on:click={() => {
															renamingChatId = chat.id;
															newTitle = chat.title;
															menuChatId = null;
														}}
													>
														<i class="fas fa-edit"></i>
													</button>
												{/if}
												<!-- Delete -->
												<button
													aria-label="delete button"
													class="block w-full rounded-md border border-gray-200 px-3 py-1 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
													on:click={() => {
														deleteChat(chat.id);
														menuChatId = null;
													}}
												>
													<i class="fas fa-trash-alt"></i>
												</button>
											</div>
										{/if}
									</div>
								</div>
								<!-- Rename input UI below the chat item -->
								{#if renamingChatId === chat.id}
									<div class="mt-1 flex items-center gap-2 px-2">
										<input
											type="text"
											bind:value={newTitle}
											class="w-full rounded border px-2 py-1 text-sm text-gray-800 dark:bg-gray-900 dark:text-white"
											placeholder="Enter new title"
										/>
										<button
											class="rounded bg-blue-500 px-2 py-1 text-sm text-white hover:bg-blue-600"
											on:click={async () => {
												await updateChatTitle(chat.id, newTitle);
												renamingChatId = null;
											}}
										>
											Save
										</button>
										<button
											class="rounded bg-gray-300 px-2 py-1 text-sm hover:bg-gray-400 dark:bg-gray-700 dark:text-white"
											on:click={() => (renamingChatId = null)}
										>
											Cancel
										</button>
									</div>
								{/if}
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

<style>
	.transition-max-height {
		transition: max-height 0.8s ease-in-out;
	}

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

	/* Light Mode */
	@media (prefers-color-scheme: light) {
		.typing-dots .dot {
			background-color: #333;
		}
	}

	/* Dark Mode */
	@media (prefers-color-scheme: dark) {
		.typing-dots .dot {
			background-color: white;
		}
	}

	/* .typing-dots .dot {
		width: 6px;
		height: 6px;
		background-color: white;
		border-radius: 50%;
		animation: blink 1.4s infinite both;
		opacity: 0.6;
	} */

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
</style>
