<script>
	//@ts-nocheck
	import SectionHeader from './SectionHeader.svelte';
	export let journalData = [];
	export let expandedCards;
	export let toggleCard;
	export let toggleBookmark;
	export let bookmarked;
	export let user;
</script>

<div class="flex-1 overflow-y-auto bg-gray-100 p-1 pt-[12vh] dark:bg-gray-900">
	{#if journalData?.length === 0}
		<!-- Spinner while data is loading -->
		<div class="flex h-[60vh] items-center justify-center">
			<div
				class="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
			></div>
		</div>
	{:else}
		<SectionHeader title="Rx Journal Articles" />
		{#each journalData as post, index}
			<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
				<!-- Post Image -->
				<a href={post.article_url} rel="noopener noreferrer">
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
						class="inline-block rounded-md bg-blue-600 px-2 py-1 text-sm font-medium text-white transition duration-200 hover:bg-blue-700 focus:ring-0 focus:outline-none dark:focus:ring-offset-gray-800"
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
