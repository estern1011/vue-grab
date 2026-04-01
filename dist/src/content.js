(function(){"use strict";const F={cursor:{name:"Cursor",scheme:"cursor",buildUrl:e=>`cursor://file/${e||""}`},windsurf:{name:"Windsurf",scheme:"windsurf",buildUrl:e=>`windsurf://file/${e||""}`},"claude-code":{name:"Claude Code",scheme:"",buildUrl:()=>""}},j={EXTRACTION_TIMEOUT:3e3,TOAST_DURATION:3e3,DEFAULT_EDITOR:"cursor"},h=Q();let m=!1,l=null,f=null,g=null,b=-1,v=null,p=null,w=j.DEFAULT_EDITOR,a=[],c=null,y=null;const H=100;let $=null;chrome.storage&&chrome.storage.local&&chrome.storage.local.get(["selectedEditor"],e=>{e.selectedEditor&&(w=e.selectedEditor)});function I(){const e=document.createElement("script");e.src=chrome.runtime.getURL("src/injected/index.js"),e.onload=function(){this.remove()},(document.head||document.documentElement).appendChild(e)}document.head||document.documentElement?I():document.addEventListener("DOMContentLoaded",I),h?h.element.addEventListener(h.config.responseEvent,K):console.error("Vue Grab: Bridge initialization failed. Extraction will not work.");function K(e){const t=e.detail;if(t)if(t.type==="VUE_GRAB_COMPONENT_DATA"){window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0);const s=t.data;if(s){const r={id:_(),componentData:s,comment:"",timestamp:Date.now()};a.push(r),O(),d(`Added ${s.componentName} to grab list`,"success"),$==="editor"&&W(s),$=null}else d(t.error||"No Vue component found","error"),$=null}else if(t.type==="VUE_GRAB_COMPONENT_INFO"){if(t.info&&l){const s=t.info.name||"Anonymous";l.classList.add("vue-grab-highlight"),ce(l,s),g=t.info.hierarchy||[],b=t.info.currentIndex??-1,q()}}else t.type==="VUE_GRAB_NAVIGATION_RESULT"&&(t.info?(g=t.info.hierarchy||[],b=t.info.currentIndex??-1,l&&l.setAttribute("data-vue-component",t.info.name||"Anonymous"),q()):t.error&&d(t.error,"error"))}function Q(){const e=document.documentElement||document.body;if(!e)return null;const n=_(),t={bridgeId:`vue-grab-bridge-${n}`,requestEvent:`vue-grab-request-${n}`,responseEvent:`vue-grab-response-${n}`},s=document.createElement("div");return s.id=t.bridgeId,s.style.display="none",s.setAttribute("data-vue-grab-bridge","true"),s.setAttribute("data-request-event",t.requestEvent),s.setAttribute("data-response-event",t.responseEvent),e.appendChild(s),{element:s,config:t}}function _(){if(window.crypto&&window.crypto.getRandomValues){const e=new Uint32Array(2);return window.crypto.getRandomValues(e),Array.from(e,n=>n.toString(16)).join("")}return Math.random().toString(36).substring(2,11)}function S(e){if(!h){console.warn("Vue Grab: Cannot communicate with injected script.");return}const n=new CustomEvent(h.config.requestEvent,{detail:e,bubbles:!1,composed:!1});h.element.dispatchEvent(n)}function W(e){const n=e?.filePath,t=F[w];if(t&&t.scheme&&n){const s=t.buildUrl(n);try{window.open(s,"_blank")}catch(r){console.error("Vue Grab: Could not open editor:",r)}}}chrome.runtime.onMessage.addListener((e,n,t)=>{if(e.action==="toggle")m=!m,m?X():T(),t({isActive:m});else if(e.action==="getState")t({isActive:m,hasData:a.length>0});else if(e.action==="getLastData"){const s=a[a.length-1];t({data:s?.componentData||null})}else e.action==="setEditor"&&(w=e.editor,t({success:!0}));return!0});function X(){document.addEventListener("mouseover",L),document.addEventListener("mouseout",G),document.addEventListener("click",U,!0),document.addEventListener("keydown",D),ae(),z(),d("Vue Grab activated! Click elements to add them to your grab list.","success")}function T(){document.removeEventListener("mouseover",L),document.removeEventListener("mouseout",G),document.removeEventListener("click",U,!0),document.removeEventListener("keydown",D),y!==null&&(clearTimeout(y),y=null),l&&(l.classList.remove("vue-grab-highlight"),l.removeAttribute("data-vue-grab-id")),g=null,b=-1,le(),N(),V(),Z()}function L(e){if(!m)return;const n=e.target;if(n.closest(".vue-grab-panel")||y!==null)return;l=n;const t="vue-grab-"+Math.random().toString(36).substring(2,11);l.setAttribute("data-vue-grab-id",t),S({type:"VUE_GRAB_GET_INFO",elementId:t}),y=window.setTimeout(()=>{y=null},H)}function G(e){m&&(l&&(l.classList.remove("vue-grab-highlight"),l.removeAttribute("data-vue-grab-id"),l=null),V(),g=null,b=-1,N())}function U(e){if(!m)return;const n=e.target;n.closest(".vue-grab-panel")||(e.preventDefault(),e.stopPropagation(),R(e.metaKey||e.ctrlKey,n))}function R(e,n){if($=e?"editor":"grab",!l&&n&&(l=n),!l){d("No element selected. Hover over an element first.","error");return}if(!l.getAttribute("data-vue-grab-id")){const s="vue-grab-"+Math.random().toString(36).substring(2,11);l.setAttribute("data-vue-grab-id",s)}const t=window.setTimeout(()=>{d("Extraction timed out. Try again.","error"),$=null},j.EXTRACTION_TIMEOUT);window._vueGrabExtractionTimeout=t,Y()}function D(e){if(m){if(e.key==="Escape"){T(),m=!1,d("Vue Grab deactivated","success");return}if(e.key==="Enter"){e.preventDefault(),e.stopPropagation(),R(e.metaKey||e.ctrlKey,null);return}if(e.altKey&&e.key==="ArrowUp"){e.preventDefault(),e.stopPropagation(),S({type:"VUE_GRAB_NAVIGATE_PARENT"});return}if(e.altKey&&e.key==="ArrowDown"){e.preventDefault(),e.stopPropagation(),S({type:"VUE_GRAB_NAVIGATE_CHILD"});return}}}function Y(){if(b>=0&&g&&g.length>0){S({type:"VUE_GRAB_EXTRACT_CURRENT"});return}if(l){let e=l.getAttribute("data-vue-grab-id");e||(e="vue-grab-"+Math.random().toString(36).substring(2,11),l.setAttribute("data-vue-grab-id",e)),S({type:"VUE_GRAB_EXTRACT",elementId:e});return}window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0),d("No element selected. Try hovering over a component first.","error"),$=null}function z(){c||(c=document.createElement("div"),c.className="vue-grab-panel",c.innerHTML=ee(),document.body.appendChild(c),se())}function Z(){c&&(c.remove(),c=null)}function O(){if(!c)return;const e=c.querySelector(".vue-grab-panel-list"),n=c.querySelector(".vue-grab-panel-count"),t=c.querySelector(".vue-grab-panel-actions");e&&(e.innerHTML=P()),n&&(n.textContent=`${a.length} component${a.length!==1?"s":""}`),t&&(t.style.display=a.length>0?"flex":"none"),B()}function ee(){return`
    <div class="vue-grab-panel-header">
      <div class="vue-grab-panel-title">
        <span class="vue-grab-panel-logo">Vue Grab</span>
        <span class="vue-grab-panel-count">${a.length} component${a.length!==1?"s":""}</span>
      </div>
      <button class="vue-grab-panel-close" title="Close (Esc)">&times;</button>
    </div>
    <div class="vue-grab-panel-list">
      ${P()}
    </div>
    <div class="vue-grab-panel-actions" style="display: ${a.length>0?"flex":"none"}">
      <button class="vue-grab-panel-copy-all">Copy All</button>
      <button class="vue-grab-panel-clear">Clear</button>
    </div>
    <div class="vue-grab-panel-empty" style="display: ${a.length===0?"block":"none"}">
      Click any element on the page to grab its Vue component context.
    </div>
  `}function P(){return a.length===0?"":a.map((e,n)=>{const t=e.componentData;return`
      <div class="vue-grab-panel-item" data-item-id="${e.id}">
        <div class="vue-grab-panel-item-header">
          <div class="vue-grab-panel-item-info">
            <span class="vue-grab-panel-item-number">${n+1}</span>
            <span class="vue-grab-panel-item-name">${u(t.componentName)}</span>
          </div>
          <button class="vue-grab-panel-item-remove" data-item-id="${e.id}" title="Remove">&times;</button>
        </div>
        ${t.filePath?`<div class="vue-grab-panel-item-file">${u(t.filePath)}</div>`:""}
        <div class="vue-grab-panel-item-comment-row">
          <input
            type="text"
            class="vue-grab-panel-item-comment"
            data-item-id="${e.id}"
            placeholder="Add a note for the agent..."
            value="${u(e.comment)}"
          />
        </div>
        <div class="vue-grab-context">
          ${te(t)}
        </div>
      </div>
    `}).join("")}function te(e){let n="";if(e.element){const s=e.element,i=[`&lt;${u(s.tagName)}&gt;`];s.id&&i.push(`#${u(s.id)}`),s.classes?.length&&i.push(s.classes.map(o=>`.${u(o)}`).join("")),n+=`<div class="vue-grab-ctx-element">${i.join("")}</div>`}n+=E("Props",e.props);const t=e.data||e.setupState;if(n+=E("State",t),e.computed?.length&&(n+=k("Computed",e.computed)),e.methods?.length&&(n+=k("Methods",e.methods)),e.piniaStores?.length){const s=e.piniaStores.filter(i=>i.usedByComponent==="definitely"),r=e.piniaStores.filter(i=>i.usedByComponent!=="definitely");if(s.length)for(const i of s)n+=ne(i.id,i.state,i.getters,i.actions);r.length&&(n+=`<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">${r.length} other store${r.length!==1?"s":""}</summary>
        <div class="vue-grab-ctx-tags">${r.map(i=>`<span class="vue-grab-ctx-tag">${u(i.id)}</span>`).join("")}</div>
      </details>`)}if(e.vuexStore&&(n+=E("Vuex State",e.vuexStore.state),e.vuexStore.usedState.length&&(n+=k("Used State",e.vuexStore.usedState))),e.tanstackQueries?.length)for(const s of e.tanstackQueries.filter(r=>r.usedByComponent==="definitely")){const r=`Query ${JSON.stringify(s.queryKey)}`,i=s.state.status;n+=`<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">${u(r)} <span class="vue-grab-ctx-badge vue-grab-ctx-badge--${i}">${i}</span></summary>
        ${C(s.data)}
      </details>`}if(e.routerState){const s=e.routerState;n+=`<details class="vue-grab-ctx-section">
      <summary class="vue-grab-ctx-label">Route</summary>
      <div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key">path</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${u(s.fullPath)}</span>
      </div>
      ${s.name?`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">name</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${u(String(s.name))}</span></div>`:""}
      ${Object.keys(s.params||{}).length?`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">params</span>${C(s.params)}</div>`:""}
      ${Object.keys(s.query||{}).length?`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">query</span>${C(s.query)}</div>`:""}
    </details>`}return e.emittedEvents?.length&&(n+=k("Emits",e.emittedEvents)),e.providedValues&&Object.keys(e.providedValues).length&&(n+=E("Provides",e.providedValues)),e.injectedValues&&Object.keys(e.injectedValues).length&&(n+=E("Injects",e.injectedValues)),e.slots&&Object.keys(e.slots).length&&(n+=k("Slots",Object.keys(e.slots))),e.template&&(n+=`<details class="vue-grab-ctx-section">
      <summary class="vue-grab-ctx-label">Template</summary>
      <pre class="vue-grab-ctx-code">${u(e.template)}</pre>
    </details>`),n||'<div class="vue-grab-ctx-empty">No data extracted</div>'}function E(e,n){if(!n||Object.keys(n).length===0)return"";const t=Object.keys(n),s=4,r=t.length>s;let i="";const o=r?t.slice(0,s):t;for(const A of o)i+=`<div class="vue-grab-ctx-kv">
      <span class="vue-grab-ctx-key">${u(A)}</span>${C(n[A])}
    </div>`;return r&&(i+=`<div class="vue-grab-ctx-more">+${t.length-s} more</div>`),`<details class="vue-grab-ctx-section" open>
    <summary class="vue-grab-ctx-label">${u(e)} <span class="vue-grab-ctx-count">${t.length}</span></summary>
    ${i}
  </details>`}function k(e,n){return`<details class="vue-grab-ctx-section" open>
    <summary class="vue-grab-ctx-label">${u(e)} <span class="vue-grab-ctx-count">${n.length}</span></summary>
    <div class="vue-grab-ctx-tags">${n.map(t=>`<span class="vue-grab-ctx-tag">${u(t)}</span>`).join("")}</div>
  </details>`}function ne(e,n,t,s,r){let i="";const o=Object.keys(n||{});if(o.length){for(const x of o.slice(0,3))i+=`<div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key">${u(x)}</span>${C(n[x])}
      </div>`;o.length>3&&(i+=`<div class="vue-grab-ctx-more">+${o.length-3} more state</div>`)}const A=Object.keys(t||{});return A.length&&(i+=`<div class="vue-grab-ctx-sub">Getters: ${A.map(x=>`<span class="vue-grab-ctx-tag">${u(x)}</span>`).join("")}</div>`),s.length&&(i+=`<div class="vue-grab-ctx-sub">Actions: ${s.map(x=>`<span class="vue-grab-ctx-tag">${u(x)}</span>`).join("")}</div>`),`<details class="vue-grab-ctx-section" open>
    <summary class="vue-grab-ctx-label">Store: ${u(e)} <span class="vue-grab-ctx-badge vue-grab-ctx-badge--success">used</span></summary>
    ${i}
  </details>`}function C(e){if(e==null)return`<span class="vue-grab-ctx-val vue-grab-ctx-val--null">${e===null?"null":"undefined"}</span>`;if(typeof e=="boolean")return`<span class="vue-grab-ctx-val vue-grab-ctx-val--bool">${e}</span>`;if(typeof e=="number")return`<span class="vue-grab-ctx-val vue-grab-ctx-val--num">${e}</span>`;if(typeof e=="string"){if(e.startsWith("[Function")||e.startsWith("[Circular")||e.startsWith("[Deep")||e.startsWith("[HTML"))return`<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">${u(e)}</span>`;const n=e.length>60?e.slice(0,57)+"...":e;return`<span class="vue-grab-ctx-val vue-grab-ctx-val--string">"${u(n)}"</span>`}if(Array.isArray(e))return e.length===0?'<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">[]</span>':`<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">Array(${e.length})</span>`;if(typeof e=="object"){const n=Object.keys(e);return n.length===0?'<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">{}</span>':`<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">{${n.slice(0,3).join(", ")}${n.length>3?", ...":""}}</span>`}return`<span class="vue-grab-ctx-val">${u(String(e))}</span>`}function se(){if(!c)return;c.querySelector(".vue-grab-panel-close")?.addEventListener("click",()=>{T(),m=!1}),c.querySelector(".vue-grab-panel-copy-all")?.addEventListener("click",oe),c.querySelector(".vue-grab-panel-clear")?.addEventListener("click",()=>{a=[],O();const s=c?.querySelector(".vue-grab-panel-empty");s&&(s.style.display="block")}),B()}function B(){if(!c)return;c.querySelectorAll(".vue-grab-panel-item-remove").forEach(n=>{n.addEventListener("click",t=>{const s=t.currentTarget.dataset.itemId;if(a=a.filter(r=>r.id!==s),O(),a.length===0){const r=c?.querySelector(".vue-grab-panel-empty");r&&(r.style.display="block")}})}),c.querySelectorAll(".vue-grab-panel-item-comment").forEach(n=>{n.addEventListener("input",t=>{const s=t.target,r=s.dataset.itemId,i=a.find(o=>o.id===r);i&&(i.comment=s.value)}),n.addEventListener("keydown",t=>{t.stopPropagation()})});const e=c?.querySelector(".vue-grab-panel-empty");e&&(e.style.display=a.length===0?"block":"none")}function oe(){if(a.length===0){d("No components grabbed yet.","error");return}const e=re();navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(e).then(()=>{d(`Copied ${a.length} component${a.length!==1?"s":""} to clipboard!`,"success")}).catch(n=>{console.error("Could not copy to clipboard:",n),M(e),d(`Copied ${a.length} component${a.length!==1?"s":""} to clipboard!`,"success")}):(M(e),d(`Copied ${a.length} component${a.length!==1?"s":""} to clipboard!`,"success"))}function re(){if(a.length===1){const n=a[0];let t="";return n.comment&&(t+=`> **Note:** ${n.comment}

`),t+=ie(n.componentData),t}let e=`# Vue Component Context (${a.length} components)

`;return a.forEach((n,t)=>{e+=`---

`,e+=`## ${t+1}. ${n.componentData.componentName}`,n.componentData.filePath&&(e+=` (${n.componentData.filePath})`),e+=`

`,n.comment&&(e+=`> **Note:** ${n.comment}

`),e+=J(n.componentData),e+=`
`}),e+=`---
*Generated by Vue Grab - ${a.length} components*
`,e}function M(e){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.opacity="0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n)}function ie(e){let n=`# Vue Component Context

`;return n+=J(e),n+=`
---
*Generated by Vue Grab*
`,n}function J(e){const n=e.element?`### Element
- **Tag**: <${e.element.tagName}>
- **ID**: ${e.element.id||"None"}
- **Classes**: ${e.element.classes?.join(", ")||"None"}

`:"";let t=`### Component Information
- **Name**: ${e.componentName}
- **File**: ${e.filePath||"Unknown"}

`;if(t+=n,t+=`### Props
\`\`\`json
${JSON.stringify(e.props,null,2)}
\`\`\`

`,t+=`### Data/State
\`\`\`json
${JSON.stringify(e.data||e.setupState,null,2)}
\`\`\`

`,t+=`### Computed Properties
${e.computed?.length?e.computed.join(", "):"None"}

`,t+=`### Methods
${e.methods?.length?e.methods.join(", "):"None"}
`,e.piniaStores&&e.piniaStores.length>0){t+=`
### Pinia Stores

`;const s=e.piniaStores.filter(o=>o.usedByComponent==="definitely"),r=e.piniaStores.filter(o=>o.usedByComponent==="potentially"),i=e.piniaStores.filter(o=>o.usedByComponent==="unknown");s.length>0&&(t+=`#### Definitely Used by Component

`,s.forEach(o=>{t+=`**Store: ${o.id}**

`,t+=`**State:**
\`\`\`json
${JSON.stringify(o.state,null,2)}
\`\`\`

`,Object.keys(o.getters).length>0&&(t+=`**Getters:**
\`\`\`json
${JSON.stringify(o.getters,null,2)}
\`\`\`

`),o.actions.length>0&&(t+=`**Actions:** ${o.actions.join(", ")}

`)})),r.length>0&&(t+=`#### Potentially Related Stores

`,r.forEach(o=>{t+=`- **${o.id}**: ${o.actions.length} actions, ${Object.keys(o.getters).length} getters
`}),t+=`
`),i.length>0&&(t+=`#### Other Available Stores
${i.map(o=>o.id).join(", ")}

`)}if(e.vuexStore&&(t+=`
### Vuex Store

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
### TanStack Query (Vue Query)

`;const s=e.tanstackQueries.filter(o=>o.usedByComponent==="definitely"),r=e.tanstackQueries.filter(o=>o.usedByComponent==="potentially"),i=e.tanstackQueries.filter(o=>o.usedByComponent==="unknown");s.length>0&&(t+=`#### Definitely Used by Component

`,s.forEach(o=>{t+=`**Query: ${JSON.stringify(o.queryKey)}**

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

`})),r.length>0&&(t+=`#### Potentially Related Queries

`,r.forEach(o=>{t+=`- **${JSON.stringify(o.queryKey)}**: ${o.state.status}
`}),t+=`
`),i.length>0&&(t+=`#### Other Active Queries
${i.map(o=>JSON.stringify(o.queryKey)).join(", ")}

`)}if(e.routerState&&(t+=`
### Vue Router State

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
**Matched Routes:** ${e.routerState.matched.map(s=>s.name||s.path).join(" > ")}
`)),e.emittedEvents&&e.emittedEvents.length>0&&(t+=`
### Emitted Events
${e.emittedEvents.join(", ")}
`),(e.providedValues||e.injectedValues)&&(t+=`
### Provide/Inject

`,e.providedValues&&Object.keys(e.providedValues).length>0&&(t+=`**Provided by this component:**
\`\`\`json
${JSON.stringify(e.providedValues,null,2)}
\`\`\`

`),e.injectedValues&&Object.keys(e.injectedValues).length>0&&(t+=`**Injected into this component:**
\`\`\`json
${JSON.stringify(e.injectedValues,null,2)}
\`\`\`
`)),e.slots&&Object.keys(e.slots).length>0){t+=`
### Slots

`;for(const[s,r]of Object.entries(e.slots))t+=`#### ${s==="default"?"Default Slot":`Slot: ${s}`}
`,typeof r=="string"?t+=`${r}

`:t+=`\`\`\`json
${JSON.stringify(r,null,2)}
\`\`\`

`}return e.template&&(t+=`
### Template
\`\`\`vue
${e.template}
\`\`\`
`),t}function u(e){const n=document.createElement("div");return n.textContent=e,n.innerHTML}function d(e,n="success"){const t=document.createElement("div");t.className=`vue-grab-toast ${n}`,t.textContent=e,document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),300)},j.TOAST_DURATION)}function ae(){f=document.createElement("div"),f.className="vue-grab-active-indicator",f.innerHTML=`
    <div class="vue-grab-indicator-title">Vue Grab Active</div>
    <div class="vue-grab-indicator-shortcuts">
      <span class="shortcut"><kbd>Click</kbd>/<kbd>Enter</kbd> Add to list</span>
      <span class="shortcut"><kbd>⌥↑↓</kbd> Navigate</span>
      <span class="shortcut"><kbd>Esc</kbd> Done</span>
    </div>
  `,document.body.appendChild(f)}function le(){f&&(f.remove(),f=null)}function q(){if(!g||g.length===0){N();return}v||(v=document.createElement("div"),v.className="vue-grab-breadcrumb",document.body.appendChild(v));const e=g.map((n,t)=>{const s=t===b,r=["vue-grab-breadcrumb-item"];return s&&r.push("active"),t<b&&r.push("parent"),`<span class="${r.join(" ")}">${n}</span>`});v.innerHTML=`
    <div class="vue-grab-breadcrumb-path">${e.join(" > ")}</div>
    <div class="vue-grab-breadcrumb-hint">Alt+Up/Down to navigate</div>
  `}function N(){v&&(v.remove(),v=null)}function ce(e,n){V(),!(!e||!n)&&(p=document.createElement("div"),p.className="vue-grab-floating-label",p.textContent=n,document.body.appendChild(p),ue(e))}function ue(e){if(!p||!e)return;const n=e.getBoundingClientRect(),t=p.getBoundingClientRect();let s=n.top+window.scrollY-t.height-4,r=n.left+window.scrollX;s<window.scrollY+4&&(s=n.bottom+window.scrollY+4),r+t.width>window.innerWidth-4&&(r=window.innerWidth-t.width-4),r<4&&(r=4),p.style.top=`${s}px`,p.style.left=`${r}px`}function V(){p&&(p.remove(),p=null)}})();
//# sourceMappingURL=content.js.map
