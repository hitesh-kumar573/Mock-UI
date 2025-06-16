//@ts-nocheck

import { journalSpecializations, newsSpecializations } from "$lib/stores/ChatStores";
import { get } from "svelte/store";

const API_BASE_URL = 'http://45.79.125.99:7879'; // 👈 Replace with actual base URL

export async function fetchJournalSpecializations() {
    try {
        const res = await fetch(`${API_BASE_URL}/get_journal_speciality`);
        const data = await res.json();


        if (data?.specializations) {
            const flatList = data.specializations.flat(); // removes nested array
            journalSpecializations.set(flatList);
            console.log("journal data:", get(journalSpecializations))
        }
    } catch (err) {
        console.error('Failed to fetch journal specializations:', err);
    }
}

export async function fetchNewsSpecializations() {
    try {
        const res = await fetch(`${API_BASE_URL}/get_news_speciality`);
        const data = await res.json();


        if (data?.specializations) {
            const flatList = data.specializations.flat();
            newsSpecializations.set(flatList);
            console.log('news data:', get(newsSpecializations))
        }
    } catch (err) {
        console.error('Failed to fetch news specializations:', err);
    }
}
