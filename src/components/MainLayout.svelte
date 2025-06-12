<script>
	//@ts-nocheck
	import { onMount } from 'svelte';
	import DesktopView from './DesktopView.svelte';
	import MobileView from './MobileView.svelte';
	import { user } from '$lib/stores/ChatStores';

	//   let isMobile = false;

	//   onMount(() => {
	//     const checkMobile = () => {
	//       isMobile = window.innerWidth < 768;
	//     };

	//     checkMobile();
	//     window.addEventListener('resize', checkMobile);

	//     return () => window.removeEventListener('resize', checkMobile);
	//   });

	// Optional – sync localStorage and store if user refreshes
	onMount(() => {
		const userId = localStorage.getItem('user_id');

		if (userId) {
			user.set({
				id: userId,
				name: localStorage.getItem(`user_name-${userId}`),
				email: localStorage.getItem(`user_email-${userId}`),
				token: localStorage.getItem(`token-${userId}`)
			});
		}
	});
</script>

<!-- {#if isMobile} -->
<MobileView />
<!-- {:else} -->
<DesktopView />
<!-- {/if} -->
