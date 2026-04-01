<template>
  <section class="py-20">
    <div class="mx-auto max-w-2xl px-6">
      <h2 class="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Get started</h2>
      <div class="flex flex-col gap-8">
        <SiteInstallStep :step="1" title="Clone & build">
          <div class="flex flex-col gap-1 rounded-lg border border-white/[0.06] bg-[#111128] px-4 py-3">
            <code class="font-mono text-[13px] text-[#e0e0e0]">git clone https://github.com/estern1011/vue-grab.git</code>
            <code class="font-mono text-[13px] text-[#e0e0e0]">cd vue-grab &amp;&amp; npm install &amp;&amp; npm run build</code>
          </div>
        </SiteInstallStep>

        <SiteInstallStep :step="2" title="Load in Chrome">
          <p class="text-sm leading-relaxed text-[#888]">
            Go to <code class="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-[#42b883]">chrome://extensions</code>
            &rarr; Enable Developer Mode &rarr; Load Unpacked &rarr; Select the
            <code class="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-[#42b883]">dist/</code> folder
          </p>
        </SiteInstallStep>

        <SiteInstallStep :step="3" title="Grab & go">
          <p class="text-sm leading-relaxed text-[#888]">
            Navigate to any Vue app, press
            <kbd class="rounded border border-white/10 bg-white/[0.06] px-2 py-0.5 font-mono text-xs text-[#e0e0e0]">Alt+Shift+V</kbd>
            or click the extension icon, and start clicking components.
          </p>
        </SiteInstallStep>
      </div>
    </div>
  </section>
</template>
