<script>
    //@ts-nocheck
  import { onMount } from 'svelte';
  import DesktopView from './DesktopView.svelte';
  import MobileView from './MobileView.svelte';
  
//   let isMobile = false;
  
//   onMount(() => {
//     const checkMobile = () => {
//       isMobile = window.innerWidth < 768;
//     };
    
//     checkMobile();
//     window.addEventListener('resize', checkMobile);
    
//     return () => window.removeEventListener('resize', checkMobile);
//   });
</script>

<!-- {#if isMobile} -->
  <MobileView />
<!-- {:else} -->
  <DesktopView />
<!-- {/if} -->