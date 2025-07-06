//@ts-nocheck

// import { baseUrl } from '$lib/constants'; // Or manually define if not using a separate constants file
import { generateCardImage } from './generateCardImage';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export async function generateAndUploadCards(dataArray) {
	console.log('data', dataArray);

	const updatedItemsWithBase64 = [];
	const uploadPayload = [];

	await Promise.all(
		dataArray.map(async (item, index) => {
			try {
				console.log(`Processing item ${index}:`, item);
				const isNews = item.type === 'news';

				// Validate required fields
				if (!item.template_url || !(isNews ? item.title : item.article_title)) {
					console.warn('Invalid item found:', item);
					return null; // skip invalid
				}
				let titleToUse = isNews ? item.title : item.article_title;

				if (!isNews && item.article_title.length > 50 && item.openai_content) {
					try {
						const parsed = JSON.parse(item.openai_content);
						if (parsed?.title) {
							titleToUse = parsed.title;
							console.log(`Using openai_content title for item ${index}:`, titleToUse);
						}
					} catch (e) {
						console.warn(` Failed to parse openai_content for item ${index}`, e);
					}
				}

				console.log('title:', titleToUse);

				const fullBase64 = await generateCardImage(item.template_url, titleToUse);
				const base64String = fullBase64.split(',')[1]; // Extract raw base64 only

				console.log(`base64 (${index}):`, base64String.slice(0, 50) + '...'); // partial log

				// Add preview_card_url (UI only)
				item.preview_card_url = fullBase64;
				item.type = item.type || (item.specialization ? 'journal' : 'news'); //  ensure type stays
				updatedItemsWithBase64.push(item);

				// For backend update
				uploadPayload.push({
					article_name: isNews ? item.title : item.article_title,
					article_type: isNews ? 'news' : 'article',
					specialization: isNews ? '' : item.specialization || '',
					card_base64: base64String
				});
			} catch (err) {
				console.error(`Error generating card for item ${index}:`, err);
				return null;
			}
		})
	);

	console.log('UI Ready:', updatedItemsWithBase64);
	console.log('Upload payload:', uploadPayload);

	// Fire-and-forget upload in background
	if (uploadPayload.length) {
		// Filter out null values (invalid or failed items)
		const filteredPayload = uploadPayload.filter(Boolean);
		console.log('Final payload:', filteredPayload);

		if (!filteredPayload.length) {
			console.warn('No valid cards to upload.');
			return;
		}
		(async () => {
			try {
				const res = await fetch(`${baseUrl}/update_card_url`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(filteredPayload)
				});
				const result = await res.json();
				console.log('result of update card url API:', result);
				// return result;
				// return updatedItemsWithBase64;
			} catch (err) {
				console.error('Card Update Failed:', err);
			}
		})();
	}
	// Return immediately for UI
	return updatedItemsWithBase64;
}

// generateAndUploadCards function logic with previous method i.e. render after update card url api response :-

// async function generateAndUploadCards(dataArray) {
// 	console.log('data', dataArray);
// 	const payload = await Promise.all(
// 		dataArray.map(async (item, index) => {
// 			try {
// 				console.log(`Processing item ${index}:`, item);

// 				const isNews = item.type === 'news';

// 				// Validate required fields
// 				if (!item.template_url || !(isNews ? item.title : item.article_title)) {
// 					console.warn('Invalid item found:', item);
// 					return null; // skip invalid
// 				}

// 				// Decide title to use (for card generation)
// 				let titleToUse = isNews ? item.title : item.article_title;

// 				// Try OpenAI title if article_title is too long (only for journal)
// 				if (!isNews && item.article_title.length > 50 && item.openai_content) {
// 					try {
// 						const parsed = JSON.parse(item.openai_content);
// 						if (parsed?.title) {
// 							titleToUse = parsed.title;
// 							console.log(`Using openai_content title for item ${index}:`, titleToUse);
// 						}
// 					} catch (e) {
// 						console.warn(`Failed to parse openai_content for item ${index}`, e);
// 					}
// 				}

// 				console.log('title:', titleToUse);

// 				const base64Image = await generateCardImage(item.template_url, titleToUse);
// 				console.log(`base64 (${index}):`, base64Image.slice(0, 50) + '...'); // partial log

// 				return {
// 					article_name: isNews ? item.title : item.article_title,
// 					article_type: isNews ? 'news' : 'article',
// 					specialization: isNews ? '' : item.specialization || '',
// 					card_base64: base64Image
// 				};
// 			} catch (err) {
// 				console.error(`Error generating card for item ${index}:`, err);
// 				return null;
// 			}
// 		})
// 	);
// 	console.log('payload:', payload);
// 	// Filter out null values (invalid or failed items)
// 	const filteredPayload = payload.filter(Boolean);
// 	console.log('Final payload:', filteredPayload);

// 	if (!filteredPayload.length) {
// 		console.warn('No valid cards to upload.');
// 		return;
// 	}
// 	// return;

// 	// POST request to update_card_url
// 	try {
// 		const res = await fetch(`${baseUrl}/update_card_url`, {
// 			method: 'POST',
// 			headers: { 'Content-Type': 'application/json' },
// 			body: JSON.stringify(filteredPayload)
// 		});
// 		const result = await res.json();
// 		console.log('Update Card API result:', result);
// 		return result;
// 	} catch (err) {
// 		console.error('Card Update Failed:', err);
// 	}
// }

export async function processFetchedArticles(data) {
	console.log('raw data from utils:', data);

	const rawJournal = (data?.journal_articles || []).filter(
		(item) => item.article_title !== 'Issue Information'
	);
	const validJournal = rawJournal.filter(
		(item) => item.card_url && item.card_url.trim() !== '' && item.card_url !== 'null'
	);
	const missingJournal = rawJournal.filter(
		(item) => !item.card_url || item.card_url.trim() === '' || item.card_url === 'null'
	);

	console.log('raw Journal from utils:', rawJournal);
	console.log('valid Journal from utils:', validJournal);
	console.log('missing Journal from utils:', missingJournal);

	const rawNews = data?.news_articles || [];
	const validNews = rawNews.filter(
		(item) => item.card_url && item.card_url.trim() !== '' && item.card_url !== 'null'
	);
	const missingNews = rawNews.filter(
		(item) => !item.card_url || item.card_url.trim() === '' || item.card_url === 'null'
	);

	console.log('raw news from utils:', rawNews);
	console.log('valid news from utils:', validNews);
	console.log('missing news from utils:', missingNews);

	const allMissing = [
		...missingJournal.map((item) => ({ ...item, type: 'journal' })),
		...missingNews.map((item) => ({ ...item, type: 'news' }))
	];

	console.log('all missing:', allMissing);

	let generatedCards = [];
	if (allMissing.length > 0) {
		// const generated = await generateAndUploadCards(allMissing);
		// generatedCards = generated?.results?.results || generated?.results || [];

		const generatedCardsWithBase64 = await generateAndUploadCards(allMissing);
		generatedCards = generatedCardsWithBase64 || [];

		console.log('generated base64 from utils:', generatedCardsWithBase64);
		console.log('Generated Cards from utils:', generatedCards);
	}

	const generatedJournal = generatedCards.filter((item) => item.type === 'journal');
	const generatedNews = generatedCards.filter((item) => item.type === 'news');

	// const generatedJournal = generatedCards.filter(
	// 	(item) => item.specialization && item.specialization.trim() !== ''
	// );
	// const generatedNews = generatedCards.filter(
	// 	(item) => !item.specialization || item.specialization.trim() === ''
	// );

	console.log('generatedJournal:', generatedJournal);
	console.log('generatedNews:', generatedNews);

	return {
		finalJournal: [...validJournal, ...generatedJournal],
		finalNews: [...validNews, ...generatedNews]
	};
}

// processFetchedArticles function logic with previous method i.e. render after update card url api response :-

// export async function processFetchedArticles(data) {
// 	console.log('raw data from utils:', data);

// 	const rawJournal = (data?.journal_articles || []).filter(
// 		(item) => item.article_title !== 'Issue Information'
// 	);
// 	const validJournal = rawJournal.filter(
// 		(item) => item.card_url && item.card_url.trim() !== '' && item.card_url !== 'null'
// 	);
// 	const missingJournal = rawJournal.filter(
// 		(item) => !item.card_url || item.card_url.trim() === '' || item.card_url === 'null'
// 	);

// 	console.log('raw Journal from utils:', rawJournal);
// 	console.log('valid Journal from utils:', validJournal);
// 	console.log('missing Journal from utils:', missingJournal);

// 	const rawNews = data?.news_articles || [];
// 	const validNews = rawNews.filter(
// 		(item) => item.card_url && item.card_url.trim() !== '' && item.card_url !== 'null'
// 	);
// 	const missingNews = rawNews.filter(
// 		(item) => !item.card_url || item.card_url.trim() === '' || item.card_url === 'null'
// 	);

// 	console.log('raw news from utils:', rawNews);
// 	console.log('valid news from utils:', validNews);
// 	console.log('missing news from utils:', missingNews);

// 	const allMissing = [
// 		...missingJournal.map((item) => ({ ...item, type: 'journal' })),
// 		...missingNews.map((item) => ({ ...item, type: 'news' }))
// 	];

// 	console.log('all missing:', allMissing);

// 	let generatedCards = [];
// 	if (allMissing.length > 0) {
// 		const generated = await generateAndUploadCards(allMissing);
// 		generatedCards = generated?.results?.results || generated?.results || [];
// 	}

// 	const generatedJournal = generatedCards.filter(
// 		(item) => item.specialization && item.specialization.trim() !== ''
// 	);
// 	const generatedNews = generatedCards.filter(
// 		(item) => !item.specialization || item.specialization.trim() === ''
// 	);

// 	console.log('generatedJournal:', generatedJournal);
// 	console.log('generatedNews:', generatedNews);

// 	return {
// 		finalJournal: [...validJournal, ...generatedJournal],
// 		finalNews: [...validNews, ...generatedNews]
// 	};
// }
