<script>
	//@ts-nocheck
	import SectionHeader from './SectionHeader.svelte';
	export let newsData = [];
	export let expandedCards;
	export let toggleCard;
	export let toggleBookmark;
	export let bookmarked;
</script>

<div class="flex-1 overflow-y-auto bg-gray-100 p-1 pt-[3vh] dark:bg-gray-900">
	{#if newsData?.length === 0}
		<!-- Spinner while data is loading -->
		<div class="flex h-[60vh] items-center justify-center">
			<div
				class="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
			></div>
		</div>
	{:else}
		<SectionHeader title="News Articles" />

		{#each newsData as post, index}
			<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
				<!-- Post Image -->
				<a href={post.url} rel="noopener noreferrer">
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
	{/if}
</div>
