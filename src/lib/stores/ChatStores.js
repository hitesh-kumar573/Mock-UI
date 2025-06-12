// src/lib/stores.js
//@ts-nocheck
import { writable } from 'svelte/store';

export const messages = writable([]);
export const chats = writable([]);
export const savedPosts = writable([]);
export const userInput = writable('');
export const activeChatId = writable(null);
export const chatIdCounter = writable(0);
export const failedNotificationVisible = writable(false);
export const failedNotificationMessage = writable('');
export const showMobileDrawer = writable(false);
export const startDate = writable('');
export const endDate = writable('');
export const isMobileView = writable('classical');

export const journalData = writable([]); // to hold fetched data
export const userId = writable('1'); // Assuming default or dynamic user ID

// export const user = writable({
// 	id: localStorage.getItem('user_id') || null,
// 	name: localStorage.getItem('user_name') || null,
// 	email: localStorage.getItem('user_email') || null,
// 	token: localStorage.getItem('token') || null
// });

let initialUser = {
	id: null,
	name: null,
	email: null,
	token: null
};

// ✅ Check if running in browser
if (typeof window !== 'undefined') {
	const userId = localStorage.getItem('user_id');

	if (userId) {
		initialUser = {
			id: userId,
			name: localStorage.getItem(`user_name-${userId}`) || null,
			email: localStorage.getItem(`user_email-${userId}`) || null,
			token: localStorage.getItem(`token-${userId}`) || null
		};
	}
}

export const user = writable(initialUser);
