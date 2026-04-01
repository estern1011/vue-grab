<script setup lang="ts">
import { useVueGrab } from '~/composables/useVueGrab'

const grab = useVueGrab()

function handleCopy() {
  const text = grab.copyAll()
  navigator.clipboard.writeText(text)
}

function handleSend() {
  // Copy to clipboard as backup — panel handles the deep link
  handleCopy()
}

function updateComment(id: string, comment: string) {
  const item = grab.grabbedItems.value.find(i => i.id === id)
  if (item) item.comment = comment
}
</script>

<template>
  <main id="main-content">
    <GrabOverlay
      :is-active="grab.isActive.value"
      :hovered-component="grab.hoveredComponent.value"
      :hierarchy="grab.hierarchy.value"
      :hierarchy-index="grab.hierarchyIndex.value"
      @deactivate="grab.deactivate()"
    />

    <GrabPanel
      :items="grab.grabbedItems.value"
      :is-active="grab.isActive.value"
      @remove="grab.removeItem"
      @clear="grab.clearAll"
      @copy="handleCopy"
      @send="handleSend"
      @close="grab.deactivate"
      @update:comment="updateComment"
    />

    <SiteHero :grab-active="grab.isActive.value" @toggle="grab.toggle()" />
    <SiteFeatures />
    <SiteInstall />
    <SiteFooter />
  </main>
</template>
