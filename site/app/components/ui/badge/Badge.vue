<script setup lang="ts">
import { cn } from '~/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[#42b883]/15 text-[#42b883] border border-[#42b883]/20',
        secondary: 'bg-white/5 text-[#9b9bb2] border border-white/10',
        destructive: 'bg-red-500/15 text-red-400 border border-red-500/20',
        outline: 'border border-white/10 text-[#9b9bb2]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

type BadgeVariants = VariantProps<typeof badgeVariants>

const props = defineProps<{ variant?: BadgeVariants['variant']; class?: string }>()
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </span>
</template>
