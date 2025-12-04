(function(){"use strict";const k={cursor:{name:"Cursor",scheme:"cursor",buildUrl:e=>`cursor://file/${e||""}`},windsurf:{name:"Windsurf",scheme:"windsurf",buildUrl:e=>`windsurf://file/${e||""}`}},N={EXTRACTION_TIMEOUT:3e3,TOAST_DURATION:3e3,DEFAULT_EDITOR:"cursor"},$=X();let l=!1,s=null,y=null,j=null,h=null,S=-1,v=null,m=null,T=N.DEFAULT_EDITOR,u=[],d=null,g=null,E=null,C=null;const Q=100;chrome.storage&&chrome.storage.local&&chrome.storage.local.get(["selectedEditor"],e=>{e.selectedEditor&&(T=e.selectedEditor)});function P(){const e=document.createElement("script");e.src=chrome.runtime.getURL("src/injected/index.js"),e.onload=function(){this.remove()},(document.head||document.documentElement).appendChild(e)}document.head||document.documentElement?P():document.addEventListener("DOMContentLoaded",P);let p=null,x="";$?$.element.addEventListener($.config.responseEvent,K):console.error("Vue Grab: Bridge initialization failed. Extraction will not work.");function K(e){const t=e.detail;if(t)if(t.type==="VUE_GRAB_COMPONENT_DATA"){window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0);const r=t.data;if(r)if(j=r,p==="scratchpad"){const i={id:"scratchpad-"+Math.random().toString(36).substring(2,11),note:x,componentData:r,timestamp:Date.now()};u.push(i),x="",p=null,U(),c(`✓ Added "${r.componentName}" to scratchpad`,"success")}else p==="editor"?(B(r),q(r),c(`✓ Copied and opening in ${k[T]?.name}...`,"success"),p=null,b(),l=!1):(B(r),c("✓ Component data copied to clipboard!","success"),p=null,b(),l=!1);else c(t.error||"No Vue component found","error"),p=null,b(),l=!1}else if(t.type==="VUE_GRAB_COMPONENT_INFO"){if(t.info&&s){const r=t.info.name||"Anonymous";s.classList.add("vue-grab-highlight"),ne(s,r),h=t.info.hierarchy||[],S=t.info.currentIndex??-1,M()}}else t.type==="VUE_GRAB_NAVIGATION_RESULT"&&(t.info?(h=t.info.hierarchy||[],S=t.info.currentIndex??-1,s&&s.setAttribute("data-vue-component",t.info.name||"Anonymous"),M()):t.error&&c(t.error,"error"))}function X(){const e=document.documentElement||document.body;if(!e)return null;const n=W(),t={bridgeId:`vue-grab-bridge-${n}`,requestEvent:`vue-grab-request-${n}`,responseEvent:`vue-grab-response-${n}`},r=document.createElement("div");return r.id=t.bridgeId,r.style.display="none",r.setAttribute("data-vue-grab-bridge","true"),r.setAttribute("data-request-event",t.requestEvent),r.setAttribute("data-response-event",t.responseEvent),e.appendChild(r),{element:r,config:t}}function W(){if(window.crypto&&window.crypto.getRandomValues){const e=new Uint32Array(2);return window.crypto.getRandomValues(e),Array.from(e,n=>n.toString(16)).join("")}return Math.random().toString(36).substring(2,11)}function w(e){if(!$){console.warn("Vue Grab: Cannot communicate with injected script.");return}const n=new CustomEvent($.config.requestEvent,{detail:e,bubbles:!1,composed:!1});$.element.dispatchEvent(n)}function q(e){const n=e?.filePath,t=k[T];if(t&&n){const r=t.buildUrl(n);try{window.open(r,"_blank")}catch(i){console.error("Vue Grab: Could not open editor:",i)}}}chrome.runtime.onMessage.addListener((e,n,t)=>(e.action==="toggle"?(l=!l,l?Y():b(),t({isActive:l})):e.action==="getState"?t({isActive:l,hasData:j!==null}):e.action==="getLastData"?t({data:j}):e.action==="setEditor"&&(T=e.editor,t({success:!0})),!0));function Y(){document.addEventListener("mouseover",G),document.addEventListener("mouseout",D),document.addEventListener("click",R,!0),document.addEventListener("keydown",L),ee(),c("Vue Grab activated! Click elements to add to scratchpad.","success")}function b(){document.removeEventListener("mouseover",G),document.removeEventListener("mouseout",D),document.removeEventListener("click",R,!0),document.removeEventListener("keydown",L),C!==null&&(clearTimeout(C),C=null),s&&(s.classList.remove("vue-grab-highlight"),s.removeAttribute("data-vue-grab-id")),h=null,S=-1,te(),I(),_(),O(),ae(),u=[],E=null}function G(e){if(!l||C!==null)return;s=e.target;const t="vue-grab-"+Math.random().toString(36).substring(2,11);s.setAttribute("data-vue-grab-id",t),w({type:"VUE_GRAB_GET_INFO",elementId:t}),C=window.setTimeout(()=>{C=null},Q)}function D(e){l&&(s&&(s.classList.remove("vue-grab-highlight"),s.removeAttribute("data-vue-grab-id"),s=null),_(),h=null,S=-1,I())}function R(e){if(!l)return;const n=e.target;if(!(n.closest(".vue-grab-inline-input")||n.closest(".vue-grab-scratchpad-panel"))){if(e.preventDefault(),e.stopPropagation(),e.metaKey||e.ctrlKey){V(!0,n);return}e.clientX,e.clientY,E=n,ie(e.clientX,e.clientY)}}function V(e,n){if(p=e?"editor":"copy",!s&&n&&(s=n),!s){c("No element selected. Hover over an element first.","error");return}if(!s.getAttribute("data-vue-grab-id")){const r="vue-grab-"+Math.random().toString(36).substring(2,11);s.setAttribute("data-vue-grab-id",r)}const t=window.setTimeout(()=>{l&&(c("Extraction timed out. Try again.","error"),p=null,b(),l=!1)},N.EXTRACTION_TIMEOUT);window._vueGrabExtractionTimeout=t,z()}function L(e){if(l){if(e.key==="Escape"){b(),l=!1,c("Vue Grab deactivated","success");return}if(e.key==="Enter"){e.preventDefault(),e.stopPropagation(),V(e.metaKey||e.ctrlKey,null);return}if(e.altKey&&e.key==="ArrowUp"){e.preventDefault(),e.stopPropagation(),w({type:"VUE_GRAB_NAVIGATE_PARENT"});return}if(e.altKey&&e.key==="ArrowDown"){e.preventDefault(),e.stopPropagation(),w({type:"VUE_GRAB_NAVIGATE_CHILD"});return}}}function z(){if(S>=0&&h&&h.length>0){w({type:"VUE_GRAB_EXTRACT_CURRENT"});return}if(s){let e=s.getAttribute("data-vue-grab-id");e||(e="vue-grab-"+Math.random().toString(36).substring(2,11),s.setAttribute("data-vue-grab-id",e)),w({type:"VUE_GRAB_EXTRACT",elementId:e});return}window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0),c("No element selected. Try hovering over a component first.","error"),p=null,b(),l=!1}function B(e){const n=Z(e);navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(n).catch(t=>{console.error("Could not copy to clipboard:",t),A(n)}):A(n)}function A(e){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.opacity="0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n)}function Z(e){const n=e.element?`## Element
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

`;const r=e.piniaStores.filter(o=>o.usedByComponent==="definitely"),i=e.piniaStores.filter(o=>o.usedByComponent==="potentially"),a=e.piniaStores.filter(o=>o.usedByComponent==="unknown");r.length>0&&(t+=`### Definitely Used by Component

`,r.forEach(o=>{t+=`#### Store: ${o.id}

`,t+=`**State:**
\`\`\`json
${JSON.stringify(o.state,null,2)}
\`\`\`

`,Object.keys(o.getters).length>0&&(t+=`**Getters:**
\`\`\`json
${JSON.stringify(o.getters,null,2)}
\`\`\`

`),o.actions.length>0&&(t+=`**Actions:** ${o.actions.join(", ")}

`)})),i.length>0&&(t+=`### Potentially Related Stores

`,i.forEach(o=>{t+=`- **${o.id}**: ${o.actions.length} actions, ${Object.keys(o.getters).length} getters
`}),t+=`
`),a.length>0&&(t+=`### Other Available Stores
`,t+=`${a.map(o=>o.id).join(", ")}

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

`;const r=e.tanstackQueries.filter(o=>o.usedByComponent==="definitely"),i=e.tanstackQueries.filter(o=>o.usedByComponent==="potentially"),a=e.tanstackQueries.filter(o=>o.usedByComponent==="unknown");r.length>0&&(t+=`### Definitely Used by Component

`,r.forEach(o=>{t+=`#### Query: ${JSON.stringify(o.queryKey)}

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

`})),i.length>0&&(t+=`### Potentially Related Queries

`,i.forEach(o=>{t+=`- **${JSON.stringify(o.queryKey)}**: ${o.state.status}
`}),t+=`
`),a.length>0&&(t+=`### Other Active Queries
`,t+=`${a.map(o=>JSON.stringify(o.queryKey)).join(", ")}

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
**Matched Routes:** ${e.routerState.matched.map(r=>r.name||r.path).join(" → ")}
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

`;for(const[r,i]of Object.entries(e.slots))t+=`### ${r==="default"?"Default Slot":`Slot: ${r}`}
`,typeof i=="string"?t+=`${i}

`:t+=`\`\`\`json
${JSON.stringify(i,null,2)}
\`\`\`

`}return e.template&&(t+=`
## Template
\`\`\`vue
${e.template}
\`\`\`
`),t+=`
---
*Generated by Vue Grab*
`,t}function c(e,n="success"){const t=document.createElement("div");t.className=`vue-grab-toast ${n}`,t.textContent=e,document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),300)},N.TOAST_DURATION)}function ee(){y=document.createElement("div"),y.className="vue-grab-active-indicator",y.innerHTML=`
    <div class="vue-grab-indicator-title">Vue Grab Active</div>
    <div class="vue-grab-indicator-shortcuts">
      <span class="shortcut"><kbd>Click</kbd> Add to scratchpad</span>
      <span class="shortcut"><kbd>⌘+Click</kbd> Instant copy + editor</span>
      <span class="shortcut"><kbd>⌥↑↓</kbd> Navigate</span>
      <span class="shortcut"><kbd>Esc</kbd> Cancel</span>
    </div>
  `,document.body.appendChild(y)}function te(){y&&(y.remove(),y=null)}function M(){if(!h||h.length===0){I();return}v||(v=document.createElement("div"),v.className="vue-grab-breadcrumb",document.body.appendChild(v));const e=h.map((n,t)=>{const r=t===S,i=["vue-grab-breadcrumb-item"];return r&&i.push("active"),t<S&&i.push("parent"),`<span class="${i.join(" ")}">${n}</span>`});v.innerHTML=`
    <div class="vue-grab-breadcrumb-path">${e.join(" → ")}</div>
    <div class="vue-grab-breadcrumb-hint">⌥↑/↓ to navigate</div>
  `}function I(){v&&(v.remove(),v=null)}function ne(e,n){_(),!(!e||!n)&&(m=document.createElement("div"),m.className="vue-grab-floating-label",m.textContent=n,document.body.appendChild(m),oe(e))}function oe(e){if(!m||!e)return;const n=e.getBoundingClientRect(),t=m.getBoundingClientRect();let r=n.top+window.scrollY-t.height-4,i=n.left+window.scrollX;r<window.scrollY+4&&(r=n.bottom+window.scrollY+4),i+t.width>window.innerWidth-4&&(i=window.innerWidth-t.width-4),i<4&&(i=4),m.style.top=`${r}px`,m.style.left=`${i}px`}function _(){m&&(m.remove(),m=null)}function ie(e,n){O(),g=document.createElement("div"),g.className="vue-grab-inline-input";const t=document.createElement("input");t.type="text",t.placeholder="Add a note (Enter to add, Esc to cancel)",t.className="vue-grab-inline-input-field",t.addEventListener("keydown",f=>{f.key==="Enter"?(f.preventDefault(),f.stopPropagation(),re(t.value)):f.key==="Escape"&&(f.preventDefault(),f.stopPropagation(),O())}),t.addEventListener("click",f=>{f.stopPropagation()}),g.appendChild(t),document.body.appendChild(g);const r=300,i=40;let a=e,o=n+10;a+r>window.innerWidth-10&&(a=window.innerWidth-r-10),a<10&&(a=10),o+i>window.innerHeight-10&&(o=n-i-10),g.style.left=`${a}px`,g.style.top=`${o}px`,setTimeout(()=>t.focus(),10),J()}function O(){g&&(g.remove(),g=null),E=null}function re(e){if(O(),!E){c("No element selected","error");return}if(x=e||"(no note)",p="scratchpad",!E.getAttribute("data-vue-grab-id")){const t="vue-grab-"+Math.random().toString(36).substring(2,11);E.setAttribute("data-vue-grab-id",t)}const n=window.setTimeout(()=>{p==="scratchpad"&&(c("Extraction timed out. Try again.","error"),p=null)},N.EXTRACTION_TIMEOUT);window._vueGrabExtractionTimeout=n,w({type:"VUE_GRAB_EXTRACT",elementId:E.getAttribute("data-vue-grab-id")})}function J(){d||(d=document.createElement("div"),d.className="vue-grab-scratchpad-panel",F(),document.body.appendChild(d))}function U(){if(!d){J();return}F()}function F(){if(!d)return;const e=u.length>0?u.map((a,o)=>`
        <div class="vue-grab-scratchpad-item" data-id="${a.id}">
          <div class="vue-grab-scratchpad-item-header">
            <span class="vue-grab-scratchpad-item-name">${a.componentData.componentName}</span>
            <button class="vue-grab-scratchpad-item-remove" data-index="${o}">×</button>
          </div>
          <div class="vue-grab-scratchpad-item-note">${ce(a.note)}</div>
        </div>
      `).join(""):'<div class="vue-grab-scratchpad-empty">Click elements to add to scratchpad</div>';d.innerHTML=`
    <div class="vue-grab-scratchpad-header">
      <span class="vue-grab-scratchpad-title">Scratchpad (${u.length})</span>
      ${u.length>0?`
        <button class="vue-grab-scratchpad-clear">Clear</button>
      `:""}
    </div>
    <div class="vue-grab-scratchpad-items">
      ${e}
    </div>
    ${u.length>0?`
      <div class="vue-grab-scratchpad-actions">
        <button class="vue-grab-scratchpad-copy">Copy All</button>
        <button class="vue-grab-scratchpad-send">Send to IDE</button>
      </div>
    `:""}
  `,d.querySelectorAll(".vue-grab-scratchpad-item-remove").forEach(a=>{a.addEventListener("click",o=>{o.stopPropagation();const f=parseInt(a.dataset.index||"0",10);se(f)})});const t=d.querySelector(".vue-grab-scratchpad-clear");t&&t.addEventListener("click",a=>{a.stopPropagation(),u=[],U(),c("Scratchpad cleared","success")});const r=d.querySelector(".vue-grab-scratchpad-copy");r&&r.addEventListener("click",a=>{a.stopPropagation(),H()});const i=d.querySelector(".vue-grab-scratchpad-send");i&&i.addEventListener("click",a=>{a.stopPropagation(),le()})}function ae(){d&&(d.remove(),d=null)}function se(e){if(e>=0&&e<u.length){const n=u.splice(e,1)[0];U(),c(`Removed "${n.componentData.componentName}" from scratchpad`,"success")}}function ce(e){const n=document.createElement("div");return n.textContent=e,n.innerHTML}function H(){if(u.length===0){c("Scratchpad is empty","error");return}const e=ue(u);navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(e).catch(n=>{console.error("Could not copy to clipboard:",n),A(e)}):A(e),c(`✓ Copied ${u.length} component(s) to clipboard!`,"success")}function le(){if(u.length===0){c("Scratchpad is empty","error");return}H();const e=u.find(n=>n.componentData.filePath);if(e){const n=k[T];if(n&&e.componentData.filePath){const t=n.buildUrl(e.componentData.filePath);try{window.open(t,"_blank"),c(`✓ Copied ${u.length} component(s) and opening in ${n.name}...`,"success")}catch(r){console.error("Vue Grab: Could not open editor:",r)}}}b(),l=!1}function ue(e){let n=`# Vue Component Context - Scratchpad (${e.length} items)

`;return e.forEach((t,r)=>{const i=t.componentData;if(n+=`## ${r+1}. ${i.componentName}
**Note**: ${t.note}
**File**: ${i.filePath||"Unknown"}

`,i.element&&(n+=`### Element
- **Tag**: <${i.element.tagName}>
- **ID**: ${i.element.id||"None"}
- **Classes**: ${i.element.classes?.join(", ")||"None"}

`),n+=`### Props
\`\`\`json
${JSON.stringify(i.props,null,2)}
\`\`\`

`,n+=`### Data/State
\`\`\`json
${JSON.stringify(i.data||i.setupState,null,2)}
\`\`\`

`,i.computed?.length&&(n+=`### Computed Properties
${i.computed.join(", ")}

`),i.methods?.length&&(n+=`### Methods
${i.methods.join(", ")}

`),i.piniaStores&&i.piniaStores.length>0){const a=i.piniaStores.filter(o=>o.usedByComponent==="definitely");a.length>0&&(n+=`### Pinia Stores (Definitely Used)
`,a.forEach(o=>{n+=`- **${o.id}**: ${JSON.stringify(o.state)}
`}),n+=`
`)}i.routerState&&(n+=`### Router
- **Path**: ${i.routerState.path}
- **Params**: ${JSON.stringify(i.routerState.params)}
- **Query**: ${JSON.stringify(i.routerState.query)}

`),n+=`---

`}),n+=`*Generated by Vue Grab - Scratchpad*
`,n}})();
//# sourceMappingURL=content.js.map
