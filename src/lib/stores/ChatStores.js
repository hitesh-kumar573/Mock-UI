// src/lib/stores.js
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