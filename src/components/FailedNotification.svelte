<script>
	//@ts-nocheck
	import { failedNotificationVisible } from '$lib/stores/ChatStores';

	export let visible = false;
	export let message = 'An error occurred. Please try again later.'; // Default failure message
	export let isHtml = false; // ✅ New Prop: Check if message contains HTML

	// Function to hide the notification
	const hideNotification = () => {
		visible = false;
		failedNotificationVisible.set(false);
	};

	function removeEmojis(str) {
		// This regex matches most emojis including ✅, ❌, 😊, etc.
		return str
			.replace(
				/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|\u2600-\u26FF|\u200D|\uFE0F|\u23CF|\u23E9|\u231A|\u3030|\u303D|\u3297|\u3299|\u25B6|\u25C0|\u2B05|\u2B06|\u2B07|\u2934|\u2935|\u2B50|\u2B1B|\u2B1C|\u2B06|\u2B07|\u2B05|\u2B95|\u23EA|\u23E9|\u23EB|\u23EC|\u23F0|\u23F3|\u25FD|\u25FE|\u25FB|\u25FC|\u2B1B|\u2B1C)/g,
				''
			)
			.trim();
	}
</script>

{#if visible}
	<button
		class="fixed top-1/2 left-1/2 z-50 w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 transform cursor-pointer md:max-w-[400px]"
		on:click={hideNotification}
		aria-label="Close notification"
	>
		<div class="rounded-lg bg-white p-6 md:p-10">
			<div class="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-gray-100">
				<i class="fas fa-times text-[80px] text-red-500"></i>
				<!-- Red Cross Icon -->
			</div>

			<h1 class="mt-4 mb-2 text-center text-3xl font-extrabold text-red-600">Failed</h1>
			<div id="lower-side" class="relative bg-white p-4 md:p-6">
				<!-- <p id="message" class="mt-1 text-center text-base text-wrap text-gray-600 md:text-lg">
					{message}
				</p> -->
				{#if isHtml}
					<p
						id="message"
						class="mt-1 max-h-[200px] overflow-auto text-center text-base text-wrap text-gray-600 md:text-lg"
					>
						{@html message}
					</p>
				{:else}
					<p id="message" class="mt-1 text-center text-base text-wrap text-gray-600 md:text-lg">
						<!-- {message} -->
						{removeEmojis(message)}
					</p>
				{/if}
				<a
					href="#"
					on:click|preventDefault={hideNotification}
					class="mt-6 block w-full rounded-full bg-red-600 py-2 text-center text-white shadow transition-all duration-300 hover:bg-red-700 hover:no-underline hover:shadow-lg"
				>
					Try Again
				</a>
			</div>
		</div>
	</button>
{/if}
