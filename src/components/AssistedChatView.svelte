<script>
	//@ts-nocheck
	import { createEventDispatcher, onMount } from 'svelte';
	import { user, userInput, messages } from '$lib/stores/ChatStores';

	export let expandedCards;
	export let toggleCard;
	export let toggleBookmark;
	export let bookmarked;

	const dispatch = createEventDispatcher();

	let chatContainer;

	function autoResize(event) {
		const el = event.target;
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + 'px';
	}

	function scrollToBottom() {
		if (chatContainer) {
			requestAnimationFrame(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			});
		}
	}

	function sendMessage() {
		// 🔁 your send logic from parent
		console.log('Send message:', $userInput);
		dispatch('send');
	}
</script>

<div class="relative flex flex-1 flex-col bg-white dark:bg-gray-900">
	<!-- Chat area -->
	<div
		class="h-auto max-h-[79vh] flex-1 overflow-y-auto p-2 py-2 pt-[12vh]"
		bind:this={chatContainer}
	>
		{#each $messages as msg}
			{#if msg.articles}
				<div class="my-2 space-y-3">
					{#each msg.articles as post, index}
						<div class="mb-4 rounded-lg bg-white shadow-sm dark:bg-gray-800">
							<a href={post.article_url} rel="noopener noreferrer">
								<img
									src={post.card_url ? post.card_url : post.template_url}
									alt="post"
									class="h-[28vh] w-full cursor-pointer rounded-t-md object-cover"
								/>
							</a>

							<div class="px-4 py-2 text-gray-800 dark:text-gray-200">
								{#if post.article_type === 'news'}
									<p class="font-semibold"><strong>Title:</strong> {post.title}</p>

									{#if post.summary}
										{#if expandedCards.has(index)}
											<p><strong>Summary:</strong> {post.summary}</p>
										{/if}
									{:else}
										<p class="text-gray-500 italic">No summary available</p>
									{/if}
								{:else}
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

							<div class="relative flex items-center justify-between px-4 py-2">
								<button
									aria-label="bookmark"
									class={`fa-bookmark cursor-pointer ${
										bookmarked.has(post.article_url) ? 'fas text-yellow-500' : 'far text-gray-600'
									} hover:text-yellow-500 dark:text-gray-300`}
									on:click={() => toggleBookmark(post)}
								></button>

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

	<!-- Input area -->
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
						scrollToBottom();
					}}
					on:keydown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							sendMessage();
						}
					}}
				></textarea>
			</div>

			<div class="flex w-full items-center justify-between gap-2 px-4 py-1">
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
