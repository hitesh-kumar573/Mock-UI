<script>
	//@ts-nocheck
	import { journalData, journalOffset } from '$lib/stores/ChatStores';
	import { onMount } from 'svelte';
	import SectionHeader from './SectionHeader.svelte';
	import { processFetchedArticles } from '$lib/utils/articleProcessor';
	import { get } from 'svelte/store';

	export let infiniteScroll = false;
	// export let journalData = [];
	export let expandedCards;
	export let toggleCard;
	export let toggleBookmark;
	export let bookmarked;
	export let user;

	let timedOut = false;

	onMount(() => {
		const timeout = setTimeout(() => {
			if (get(journalData).length === 0) {
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
				loadMoreJournals();
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

	async function loadMoreJournals() {
		journalOffset.update((prev) => {
			const next = prev + 10;
			fetchMoreJournals(next);
			return next;
		});
	}

	async function fetchMoreJournals(offset) {
		const url = `${baseUrl}/journal_news_articles?total=10&offset=10`;

		const res = await fetch(url);
		const data = await res.json();
		console.log('data from journal component:', data);

		const { finalJournal } = await processFetchedArticles(data);
		// const moreJournals = data?.journal_articles || [];

		console.log('more final Journal:', finalJournal);

		if (finalJournal.length > 0) {
			journalData.update((current) => [...current, ...finalJournal]);
		}
	}
</script>

<div class="flex-1 overflow-y-auto bg-gray-100 p-1 pt-[19dvh] dark:bg-gray-900">
	{#if $journalData.length === 0}
		{#if timedOut}
			<!-- Don't show anything if timed out and no data -->
		{:else}
			<SectionHeader title="Journal Articles" />

			<!-- Spinner -->
			<div class="flex h-[60vh] items-center justify-center">
				<div
					class="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
				></div>
			</div>
		{/if}
	{:else}
		<SectionHeader title="Journal Articles" />

		{#each $journalData as post, index}
			<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
				<!-- Post Image -->
				<a href={post.article_url} rel="noopener noreferrer">
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
						<span class="font-bold"><p><strong>Title:</strong> {post.article_title}</p></span>
						<!-- Parsed content -->
						{#if post.openai_content}
							{#await JSON.parse(post.openai_content) then parsed}
								<div class="transition-max-height overflow-hidden">
									<!-- Objective is always shown -->
									<p><strong>Objective:</strong> {parsed.objective?.join(', ')}</p>
									{#if expandedCards.has(index)}
										<p><strong>Results:</strong> {parsed.results}</p>
										<p><strong>Conclusion:</strong> {parsed.conclusion?.join(', ')}</p>
										{#if user.token}
											<p>
												<strong>Revelance For Doctor:</strong>
												{parsed.relevance_for_doctor?.join(', ')}
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
					</div>
				</div>

				<div class="relative flex items-center justify-between px-4 py-2">
					<!-- Bookmark -->
					<button
						aria-label="bookmark"
						class={`fa-bookmark cursor-pointer ${
							bookmarked.has(post.article_url) ? 'fas text-yellow-500' : 'far text-gray-600'
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
