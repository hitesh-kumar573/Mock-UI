<script>
	//@ts-nocheck
	import { newsData, newsOffset } from '$lib/stores/ChatStores';
	import { onMount } from 'svelte';
	import SectionHeader from './SectionHeader.svelte';
	import { processFetchedArticles } from '$lib/utils/articleProcessor';
	import { get } from 'svelte/store';

	export let infiniteScroll = false;
	export let expandedCards;
	export let toggleCard;
	export let toggleBookmark;
	export let bookmarked;

	let timedOut = false;

	onMount(() => {
		const timeout = setTimeout(() => {
			if (get(newsData).length === 0) {
				timedOut = true;
			}
		}, 3000);

		// Optional: clear timeout if component is destroyed early
		return () => clearTimeout(timeout);
	});

	let observer;
	let sentinel;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;

	$: if (sentinel) {
		console.log('Sentinel is ready:', sentinel);
		observer.observe(sentinel);
	}

	onMount(() => {
		if (!infiniteScroll) return;

		observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				loadMoreNews();
			}
		});

		// observer.observe(sentinel);
		if (sentinel) {
			observer.observe(sentinel);
		}

		return () => {
			if (sentinel) observer.unobserve(sentinel);
		};
	});

	async function loadMoreNews() {
		newsOffset.update((prev) => {
			const next = prev + 10;
			fetchMoreNews(next);
			return next;
		});
	}

	async function fetchMoreNews(offset) {
		const url = `${baseUrl}/journal_news_articles?total=10&offset=10`;

		const res = await fetch(url);
		const data = await res.json();

		console.log('data from news component:', data);

		const { finalNews } = await processFetchedArticles(data);

		// console.log('data from news component:', data);

		// const moreNews = data?.news_articles || [];

		console.log('more final News:', finalNews);

		if (finalNews.length > 0) {
			newsData.update((current) => [...current, ...finalNews]);
		}
	}
</script>

<div
	class="flex-1 overflow-y-auto bg-gray-100 p-1 dark:bg-gray-900"
	class:pt-[19dvh]={infiniteScroll}
	class:pt-[3vh]={!infiniteScroll}
>
	{#if $newsData.length === 0}
		{#if timedOut}
			<!-- Don't show anything if timed out and no data -->
		{:else}
			<SectionHeader title="News Articles" />

			<!-- Spinner -->
			<div class="flex h-[60vh] items-center justify-center">
				<div
					class="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
				></div>
			</div>
		{/if}
	{:else}
		<SectionHeader title="News Articles" />

		{#each $newsData as post, index}
			<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
				<!-- Post Image -->
				<a href={post.url} rel="noopener noreferrer">
					<!-- <img
						src={post.preview_card_url || post.card_url || post.template_url}
						alt="post"
						class="h-[28vh] w-full cursor-pointer rounded-t-md object-cover"
					/> -->

					{#if post.preview_card_url && post.preview_card_url.startsWith('data:image')}
						<!-- Render base64 image -->
						<img
							src={post.preview_card_url}
							alt="Generated preview"
							loading="lazy"
							class="h-[28vh] w-full cursor-pointer rounded-t-md object-cover"
						/>
					{:else}
						<!-- Render normal image -->
						<img
							src={post.card_url || post.template_url}
							alt="Post image"
							loading="lazy"
							class="h-[28vh] w-full cursor-pointer rounded-t-md object-cover"
						/>
					{/if}
				</a>

				<!-- Actions Bar -->
				<div class="flex items-center justify-between px-3 pt-2">
					<!-- Caption -->
					<div class="text-gray-700 dark:text-gray-200">
						<span class="font-bold"><p><strong>Title:</strong> {post.title}</p></span>
						<!-- Parsed content -->
						{#if post.summary}
							{#if expandedCards.has(index)}
								{#if post.summary}
									<p><strong>Summary:</strong> {post.summary}</p>
								{:else}
									<p class="text-gray-500 italic">No summary available</p>
								{/if}
							{/if}
						{:else}
							<p class="text-gray-500 italic">No summary available</p>
						{/if}
					</div>
				</div>

				<div class="relative flex items-center justify-between px-4 py-2">
					<!-- Bookmark -->
					<button
						aria-label="bookmark"
						class={`fa-bookmark cursor-pointer ${
							bookmarked.has(post.url) ? 'fas text-yellow-500' : 'far text-gray-600'
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
		<!-- This is the bottom sentinel -->
		<div bind:this={sentinel} class="h-1"></div>
	{/if}
</div>
