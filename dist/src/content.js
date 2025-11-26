(function(){"use strict";const $={cursor:{name:"Cursor",scheme:"cursor",buildUrl:e=>`cursor://file/${e||""}`},windsurf:{name:"Windsurf",scheme:"windsurf",buildUrl:e=>`windsurf://file/${e||""}`}},S={EXTRACTION_TIMEOUT:3e3,TOAST_DURATION:3e3,DEFAULT_EDITOR:"cursor"},p=L();let u=!1,r=null,m=null,w=null,a=null,f=-1,d=null,l=null,E=S.DEFAULT_EDITOR,v=null;const R=100;chrome.storage&&chrome.storage.local&&chrome.storage.local.get(["selectedEditor"],e=>{e.selectedEditor&&(E=e.selectedEditor)});function A(){const e=document.createElement("script");e.src=chrome.runtime.getURL("src/injected/index.js"),e.onload=function(){this.remove()},(document.head||document.documentElement).appendChild(e)}document.head||document.documentElement?A():document.addEventListener("DOMContentLoaded",A);let g=null;p?p.element.addEventListener(p.config.responseEvent,V):console.error("Vue Grab: Bridge initialization failed. Extraction will not work.");function V(e){const t=e.detail;if(t)if(t.type==="VUE_GRAB_COMPONENT_DATA"){window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0);const i=t.data;i?(w=i,g==="editor"?(U(i),B(i),c(`✓ Copied and opening in ${$[E]?.name}...`,"success")):(U(i),c("✓ Component data copied to clipboard!","success")),g=null,b(),u=!1):(c(t.error||"No Vue component found","error"),g=null,b(),u=!1)}else if(t.type==="VUE_GRAB_COMPONENT_INFO"){if(t.info&&r){const i=t.info.name||"Anonymous";r.classList.add("vue-grab-highlight"),K(r,i),a=t.info.hierarchy||[],f=t.info.currentIndex??-1,I()}}else t.type==="VUE_GRAB_NAVIGATION_RESULT"&&(t.info?(a=t.info.hierarchy||[],f=t.info.currentIndex??-1,r&&r.setAttribute("data-vue-component",t.info.name||"Anonymous"),I()):t.error&&c(t.error,"error"))}function L(){const e=document.documentElement||document.body;if(!e)return null;const n=D(),t={bridgeId:`vue-grab-bridge-${n}`,requestEvent:`vue-grab-request-${n}`,responseEvent:`vue-grab-response-${n}`},i=document.createElement("div");return i.id=t.bridgeId,i.style.display="none",i.setAttribute("data-vue-grab-bridge","true"),i.setAttribute("data-request-event",t.requestEvent),i.setAttribute("data-response-event",t.responseEvent),e.appendChild(i),{element:i,config:t}}function D(){if(window.crypto&&window.crypto.getRandomValues){const e=new Uint32Array(2);return window.crypto.getRandomValues(e),Array.from(e,n=>n.toString(16)).join("")}return Math.random().toString(36).substring(2,11)}function h(e){if(!p){console.warn("Vue Grab: Cannot communicate with injected script.");return}const n=new CustomEvent(p.config.requestEvent,{detail:e,bubbles:!1,composed:!1});p.element.dispatchEvent(n)}function B(e){const n=e?.filePath,t=$[E];if(t&&n){const i=t.buildUrl(n);try{window.open(i,"_blank")}catch(s){console.error("Vue Grab: Could not open editor:",s)}}}chrome.runtime.onMessage.addListener((e,n,t)=>(e.action==="toggle"?(u=!u,u?M():b(),t({isActive:u})):e.action==="getState"?t({isActive:u,hasData:w!==null}):e.action==="getLastData"?t({data:w}):e.action==="setEditor"&&(E=e.editor,t({success:!0})),!0));function M(){document.body.classList.add("vue-grab-active"),document.addEventListener("mouseover",N,!0),document.addEventListener("mouseout",O,!0),document.addEventListener("click",k,!0),document.addEventListener("mousedown",j,!0),document.addEventListener("keydown",x),F(),c("Vue Grab activated! Click any element to extract its component.","success")}function b(){document.body.classList.remove("vue-grab-active"),document.removeEventListener("mouseover",N,!0),document.removeEventListener("mouseout",O,!0),document.removeEventListener("click",k,!0),document.removeEventListener("mousedown",j,!0),document.removeEventListener("keydown",x),v!==null&&(clearTimeout(v),v=null),r&&(r.classList.remove("vue-grab-highlight"),r.removeAttribute("data-vue-grab-id")),a=null,f=-1,Q(),C(),T()}function N(e){if(!u||v!==null)return;r=e.target;const t="vue-grab-"+Math.random().toString(36).substring(2,11);r.setAttribute("data-vue-grab-id",t),h({type:"VUE_GRAB_GET_INFO",elementId:t}),v=window.setTimeout(()=>{v=null},R)}function O(e){u&&(r&&(r.classList.remove("vue-grab-highlight"),r.removeAttribute("data-vue-grab-id"),r=null),T(),a=null,f=-1,C())}function j(e){u&&(e.preventDefault(),e.stopPropagation())}function k(e){u&&(e.preventDefault(),e.stopPropagation(),_(e.metaKey||e.ctrlKey,e.target))}function _(e,n){if(g=e?"editor":"copy",!r&&n&&(r=n),!r){c("No element selected. Hover over an element first.","error");return}if(!r.getAttribute("data-vue-grab-id")){const i="vue-grab-"+Math.random().toString(36).substring(2,11);r.setAttribute("data-vue-grab-id",i)}const t=window.setTimeout(()=>{u&&(c("Extraction timed out. Try again.","error"),g=null,b(),u=!1)},S.EXTRACTION_TIMEOUT);window._vueGrabExtractionTimeout=t,P()}function x(e){if(u){if(e.key==="Escape"){b(),u=!1,c("Vue Grab deactivated","success");return}if(e.key==="Enter"){e.preventDefault(),e.stopPropagation(),_(e.metaKey||e.ctrlKey,null);return}if(e.altKey&&e.key==="ArrowUp"){e.preventDefault(),e.stopPropagation(),h({type:"VUE_GRAB_NAVIGATE_PARENT"});return}if(e.altKey&&e.key==="ArrowDown"){e.preventDefault(),e.stopPropagation(),h({type:"VUE_GRAB_NAVIGATE_CHILD"});return}}}function P(){if(f>=0&&a&&a.length>0){h({type:"VUE_GRAB_EXTRACT_CURRENT"});return}if(r){let e=r.getAttribute("data-vue-grab-id");e||(e="vue-grab-"+Math.random().toString(36).substring(2,11),r.setAttribute("data-vue-grab-id",e)),h({type:"VUE_GRAB_EXTRACT",elementId:e});return}window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0),c("No element selected. Try hovering over a component first.","error"),g=null,b(),u=!1}function U(e){const n=J(e);navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(n).catch(t=>{console.error("Could not copy to clipboard:",t),G(n)}):G(n)}function G(e){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.opacity="0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n)}function J(e){const n=e.element?`## Element
- **Tag**: <${e.element.tagName}>
- **ID**: ${e.element.id||"None"}
- **Classes**: ${e.element.classes?.join(", ")||"None"}
`:"";let t=`# Vue Component Context

## Component Information
- **Name**: ${e.componentName}
- **File**: ${e.filePath||"Unknown"}

${n}## Props
\`\`\`json
${JSON.stringify(e.props,null,2)}
\`\`\`

## Data/State
\`\`\`json
${JSON.stringify(e.data||e.setupState,null,2)}
\`\`\`

## Computed Properties
${e.computed?.length?e.computed.join(", "):"None"}

## Methods
${e.methods?.length?e.methods.join(", "):"None"}
`;if(e.piniaStores&&e.piniaStores.length>0){t+=`
## Pinia Stores

`;const i=e.piniaStores.filter(o=>o.usedByComponent==="definitely"),s=e.piniaStores.filter(o=>o.usedByComponent==="potentially"),y=e.piniaStores.filter(o=>o.usedByComponent==="unknown");i.length>0&&(t+=`### Definitely Used by Component

`,i.forEach(o=>{t+=`#### Store: ${o.id}

`,t+=`**State:**
\`\`\`json
${JSON.stringify(o.state,null,2)}
\`\`\`

`,Object.keys(o.getters).length>0&&(t+=`**Getters:**
\`\`\`json
${JSON.stringify(o.getters,null,2)}
\`\`\`

`),o.actions.length>0&&(t+=`**Actions:** ${o.actions.join(", ")}

`)})),s.length>0&&(t+=`### Potentially Related Stores

`,s.forEach(o=>{t+=`- **${o.id}**: ${o.actions.length} actions, ${Object.keys(o.getters).length} getters
`}),t+=`
`),y.length>0&&(t+=`### Other Available Stores
`,t+=`${y.map(o=>o.id).join(", ")}

`)}if(e.vuexStore&&(t+=`
## Vuex Store

`,t+=`**Full State:**
\`\`\`json
${JSON.stringify(e.vuexStore.state,null,2)}
\`\`\`

`,e.vuexStore.usedState.length>0&&(t+=`**State Used by Component:** ${e.vuexStore.usedState.join(", ")}

`),Object.keys(e.vuexStore.getters).length>0&&(t+=`**Getters:**
\`\`\`json
${JSON.stringify(e.vuexStore.getters,null,2)}
\`\`\`

`,e.vuexStore.usedGetters.length>0&&(t+=`**Getters Used by Component:** ${e.vuexStore.usedGetters.join(", ")}

`)),e.vuexStore.mutations.length>0&&(t+=`**Available Mutations:** ${e.vuexStore.mutations.join(", ")}

`),e.vuexStore.actions.length>0&&(t+=`**Available Actions:** ${e.vuexStore.actions.join(", ")}

`),e.vuexStore.modules.length>0&&(t+=`**Modules:** ${e.vuexStore.modules.join(", ")}

`),e.vuexStore.likelyUsesMappedHelpers&&(t+=`*Note: Component appears to use mapState/mapGetters helpers*

`)),e.tanstackQueries&&e.tanstackQueries.length>0){t+=`
## TanStack Query (Vue Query)

`;const i=e.tanstackQueries.filter(o=>o.usedByComponent==="definitely"),s=e.tanstackQueries.filter(o=>o.usedByComponent==="potentially"),y=e.tanstackQueries.filter(o=>o.usedByComponent==="unknown");i.length>0&&(t+=`### Definitely Used by Component

`,i.forEach(o=>{t+=`#### Query: ${JSON.stringify(o.queryKey)}

`,t+=`- **Status:** ${o.state.status}
`,t+=`- **Fetch Status:** ${o.state.fetchStatus}
`,t+=`- **Last Updated:** ${o.lastUpdated||"Never"}
`,t+=`- **Data Updates:** ${o.state.dataUpdateCount}
`,o.error&&(t+=`- **Error:** ${o.error}
`),t+=`
**Data:**
\`\`\`json
${JSON.stringify(o.data,null,2)}
\`\`\`

`})),s.length>0&&(t+=`### Potentially Related Queries

`,s.forEach(o=>{t+=`- **${JSON.stringify(o.queryKey)}**: ${o.state.status}
`}),t+=`
`),y.length>0&&(t+=`### Other Active Queries
`,t+=`${y.map(o=>JSON.stringify(o.queryKey)).join(", ")}

`)}if(e.routerState&&(t+=`
## Vue Router State

`,t+=`- **Path:** ${e.routerState.path}
`,e.routerState.name&&(t+=`- **Route Name:** ${e.routerState.name}
`),t+=`- **Full Path:** ${e.routerState.fullPath}
`,e.routerState.params&&Object.keys(e.routerState.params).length>0&&(t+=`
**Params:**
\`\`\`json
${JSON.stringify(e.routerState.params,null,2)}
\`\`\`
`),e.routerState.query&&Object.keys(e.routerState.query).length>0&&(t+=`
**Query:**
\`\`\`json
${JSON.stringify(e.routerState.query,null,2)}
\`\`\`
`),e.routerState.meta&&Object.keys(e.routerState.meta).length>0&&(t+=`
**Meta:**
\`\`\`json
${JSON.stringify(e.routerState.meta,null,2)}
\`\`\`
`),e.routerState.matched&&e.routerState.matched.length>0&&(t+=`
**Matched Routes:** ${e.routerState.matched.map(i=>i.name||i.path).join(" → ")}
`)),e.emittedEvents&&e.emittedEvents.length>0&&(t+=`
## Emitted Events
`,t+=`${e.emittedEvents.join(", ")}
`),(e.providedValues||e.injectedValues)&&(t+=`
## Provide/Inject

`,e.providedValues&&Object.keys(e.providedValues).length>0&&(t+=`**Provided by this component:**
\`\`\`json
${JSON.stringify(e.providedValues,null,2)}
\`\`\`

`),e.injectedValues&&Object.keys(e.injectedValues).length>0&&(t+=`**Injected into this component:**
\`\`\`json
${JSON.stringify(e.injectedValues,null,2)}
\`\`\`
`)),e.slots&&Object.keys(e.slots).length>0){t+=`
## Slots

`;for(const[i,s]of Object.entries(e.slots))t+=`### ${i==="default"?"Default Slot":`Slot: ${i}`}
`,typeof s=="string"?t+=`${s}

`:t+=`\`\`\`json
${JSON.stringify(s,null,2)}
\`\`\`

`}return e.template&&(t+=`
## Template
\`\`\`vue
${e.template}
\`\`\`
`),t+=`
---
*Generated by Vue Grab*
`,t}function c(e,n="success"){const t=document.createElement("div");t.className=`vue-grab-toast ${n}`,t.textContent=e,document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),300)},S.TOAST_DURATION)}function F(){m=document.createElement("div"),m.className="vue-grab-active-indicator",m.innerHTML=`
    <div class="vue-grab-indicator-title">Vue Grab Active</div>
    <div class="vue-grab-indicator-shortcuts">
      <span class="shortcut"><kbd>Click</kbd>/<kbd>Enter</kbd> Copy</span>
      <span class="shortcut"><kbd>⌘+Click</kbd>/<kbd>⌘+Enter</kbd> + Editor</span>
      <span class="shortcut"><kbd>⌥↑↓</kbd> Navigate</span>
      <span class="shortcut"><kbd>Esc</kbd> Cancel</span>
    </div>
  `,document.body.appendChild(m)}function Q(){m&&(m.remove(),m=null)}function I(){if(!a||a.length===0){C();return}d||(d=document.createElement("div"),d.className="vue-grab-breadcrumb",document.body.appendChild(d));const e=a.map((n,t)=>{const i=t===f,s=["vue-grab-breadcrumb-item"];return i&&s.push("active"),t<f&&s.push("parent"),`<span class="${s.join(" ")}">${n}</span>`});d.innerHTML=`
    <div class="vue-grab-breadcrumb-path">${e.join(" → ")}</div>
    <div class="vue-grab-breadcrumb-hint">⌥↑/↓ to navigate</div>
  `}function C(){d&&(d.remove(),d=null)}function K(e,n){T(),!(!e||!n)&&(l=document.createElement("div"),l.className="vue-grab-floating-label",l.textContent=n,document.body.appendChild(l),H(e))}function H(e){if(!l||!e)return;const n=e.getBoundingClientRect(),t=l.getBoundingClientRect();let i=n.top+window.scrollY-t.height-4,s=n.left+window.scrollX;i<window.scrollY+4&&(i=n.bottom+window.scrollY+4),s+t.width>window.innerWidth-4&&(s=window.innerWidth-t.width-4),s<4&&(s=4),l.style.top=`${i}px`,l.style.left=`${s}px`}function T(){l&&(l.remove(),l=null)}})();
//# sourceMappingURL=content.js.map
