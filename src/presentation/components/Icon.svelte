<script lang="ts" module>
  export type IconName = 'pin' | 'unpin' | 'more' | 'down' | 'right' | 'check';
</script>

<script lang="ts">
  let { name, size }: { name: IconName; size: number } = $props();
</script>

{#if name === 'pin' || name === 'unpin'}
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M9.6 1.6l4.8 4.8-1.3.5-2.6 2.6-.3 2.8-1.1 1.1L6.4 10.7 2.6 14.5 1.5 14.5 1.5 13.4 5.3 9.6 2.6 6.9l1.1-1.1 2.8-.3 2.6-2.6z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.3"
      stroke-linejoin="round"
    />
    {#if name === 'unpin'}
      <path d="M1.5 1.5l13 13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
    {/if}
  </svg>
{:else if name === 'more'}
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="3" cy="8" r="1.25" fill="currentColor" />
    <circle cx="8" cy="8" r="1.25" fill="currentColor" />
    <circle cx="13" cy="8" r="1.25" fill="currentColor" />
  </svg>
{:else if name === 'down'}
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M1.5 3.5L5 7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{:else if name === 'right'}
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path d="M3.5 1.5L7 5 3.5 8.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{:else}
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 6.3l2.6 2.6L10 3.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{/if}

<style>
  svg {
    display: block;
  }
</style>
