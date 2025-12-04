(function(){"use strict";const P={cursor:{name:"Cursor",scheme:"cursor",buildUrl:e=>`cursor://file/${e||""}`},windsurf:{name:"Windsurf",scheme:"windsurf",buildUrl:e=>`windsurf://file/${e||""}`}},O={EXTRACTION_TIMEOUT:3e3,TOAST_DURATION:3e3,DEFAULT_EDITOR:"cursor"},te={claudeCode:{name:"Claude Code",port:4567,endpoint:"http://localhost:4567/context",checkEndpoint:"http://localhost:4567/health"},cursor:{name:"Cursor",port:5567,endpoint:"http://localhost:5567/context",checkEndpoint:"http://localhost:5567/health"}},w=ie();let u=!1,a=null,E=null,U=null,g=null,$=-1,y=null,f=null,N=O.DEFAULT_EDITOR,c=[],p=null,v=null,C=null,x=[],k=null,T=null;const ne=100;chrome.storage&&chrome.storage.local&&chrome.storage.local.get(["selectedEditor"],e=>{e.selectedEditor&&(N=e.selectedEditor)});function B(){const e=document.createElement("script");e.src=chrome.runtime.getURL("src/injected/index.js"),e.onload=function(){this.remove()},(document.head||document.documentElement).appendChild(e)}document.head||document.documentElement?B():document.addEventListener("DOMContentLoaded",B);let m=null,G="";w?w.element.addEventListener(w.config.responseEvent,oe):console.error("Vue Grab: Bridge initialization failed. Extraction will not work.");function oe(e){const t=e.detail;if(t)if(t.type==="VUE_GRAB_COMPONENT_DATA"){window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0);const o=t.data;if(o)if(U=o,m==="scratchpad"){const r={id:"scratchpad-"+Math.random().toString(36).substring(2,11),note:G,componentData:o,timestamp:Date.now()};c.push(r),G="",m=null,_(),s(`✓ Added "${o.componentName}" to scratchpad`,"success")}else m==="editor"?(K(o),ae(o),s(`✓ Copied and opening in ${P[N]?.name}...`,"success"),m=null,b(),u=!1):(K(o),s("✓ Component data copied to clipboard!","success"),m=null,b(),u=!1);else s(t.error||"No Vue component found","error"),m=null,b(),u=!1}else if(t.type==="VUE_GRAB_COMPONENT_INFO"){if(t.info&&a){const o=t.info.name||"Anonymous";a.classList.add("vue-grab-highlight"),pe(a,o),g=t.info.hierarchy||[],$=t.info.currentIndex??-1,X()}}else t.type==="VUE_GRAB_NAVIGATION_RESULT"&&(t.info?(g=t.info.hierarchy||[],$=t.info.currentIndex??-1,a&&a.setAttribute("data-vue-component",t.info.name||"Anonymous"),X()):t.error&&s(t.error,"error"))}function ie(){const e=document.documentElement||document.body;if(!e)return null;const n=re(),t={bridgeId:`vue-grab-bridge-${n}`,requestEvent:`vue-grab-request-${n}`,responseEvent:`vue-grab-response-${n}`},o=document.createElement("div");return o.id=t.bridgeId,o.style.display="none",o.setAttribute("data-vue-grab-bridge","true"),o.setAttribute("data-request-event",t.requestEvent),o.setAttribute("data-response-event",t.responseEvent),e.appendChild(o),{element:o,config:t}}function re(){if(window.crypto&&window.crypto.getRandomValues){const e=new Uint32Array(2);return window.crypto.getRandomValues(e),Array.from(e,n=>n.toString(16)).join("")}return Math.random().toString(36).substring(2,11)}function A(e){if(!w){console.warn("Vue Grab: Cannot communicate with injected script.");return}const n=new CustomEvent(w.config.requestEvent,{detail:e,bubbles:!1,composed:!1});w.element.dispatchEvent(n)}function ae(e){const n=e?.filePath,t=P[N];if(t&&n){const o=t.buildUrl(n);try{window.open(o,"_blank")}catch(r){console.error("Vue Grab: Could not open editor:",r)}}}chrome.runtime.onMessage.addListener((e,n,t)=>(e.action==="toggle"?(u=!u,u?se():b(),t({isActive:u})):e.action==="getState"?t({isActive:u,hasData:U!==null}):e.action==="getLastData"?t({data:U}):e.action==="setEditor"&&(N=e.editor,t({success:!0})),!0));function se(){document.addEventListener("mouseover",M),document.addEventListener("mouseout",J),document.addEventListener("click",F,!0),document.addEventListener("keydown",Q),ue(),s("Vue Grab activated! Click elements to add to scratchpad.","success")}function b(){document.removeEventListener("mouseover",M),document.removeEventListener("mouseout",J),document.removeEventListener("click",F,!0),document.removeEventListener("keydown",Q),T!==null&&(clearTimeout(T),T=null),a&&(a.classList.remove("vue-grab-highlight"),a.removeAttribute("data-vue-grab-id")),g=null,$=-1,de(),D(),R(),I(),ge(),c=[],C=null}function M(e){if(!u||T!==null)return;a=e.target;const t="vue-grab-"+Math.random().toString(36).substring(2,11);a.setAttribute("data-vue-grab-id",t),A({type:"VUE_GRAB_GET_INFO",elementId:t}),T=window.setTimeout(()=>{T=null},ne)}function J(e){u&&(a&&(a.classList.remove("vue-grab-highlight"),a.removeAttribute("data-vue-grab-id"),a=null),R(),g=null,$=-1,D())}function F(e){if(!u)return;const n=e.target;if(!(n.closest(".vue-grab-inline-input")||n.closest(".vue-grab-scratchpad-panel"))){if(e.preventDefault(),e.stopPropagation(),e.metaKey||e.ctrlKey){H(!0,n);return}e.clientX,e.clientY,C=n,fe(e.clientX,e.clientY)}}function H(e,n){if(m=e?"editor":"copy",!a&&n&&(a=n),!a){s("No element selected. Hover over an element first.","error");return}if(!a.getAttribute("data-vue-grab-id")){const o="vue-grab-"+Math.random().toString(36).substring(2,11);a.setAttribute("data-vue-grab-id",o)}const t=window.setTimeout(()=>{u&&(s("Extraction timed out. Try again.","error"),m=null,b(),u=!1)},O.EXTRACTION_TIMEOUT);window._vueGrabExtractionTimeout=t,ce()}function Q(e){if(u){if(e.key==="Escape"){b(),u=!1,s("Vue Grab deactivated","success");return}if(e.key==="Enter"){e.preventDefault(),e.stopPropagation(),H(e.metaKey||e.ctrlKey,null);return}if(e.altKey&&e.key==="ArrowUp"){e.preventDefault(),e.stopPropagation(),A({type:"VUE_GRAB_NAVIGATE_PARENT"});return}if(e.altKey&&e.key==="ArrowDown"){e.preventDefault(),e.stopPropagation(),A({type:"VUE_GRAB_NAVIGATE_CHILD"});return}}}function ce(){if($>=0&&g&&g.length>0){A({type:"VUE_GRAB_EXTRACT_CURRENT"});return}if(a){let e=a.getAttribute("data-vue-grab-id");e||(e="vue-grab-"+Math.random().toString(36).substring(2,11),a.setAttribute("data-vue-grab-id",e)),A({type:"VUE_GRAB_EXTRACT",elementId:e});return}window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0),s("No element selected. Try hovering over a component first.","error"),m=null,b(),u=!1}function K(e){const n=le(e);navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(n).catch(t=>{console.error("Could not copy to clipboard:",t),j(n)}):j(n)}function j(e){const n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.opacity="0",document.body.appendChild(n),n.select(),document.execCommand("copy"),document.body.removeChild(n)}function le(e){const n=e.element?`## Element
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

`;const o=e.piniaStores.filter(i=>i.usedByComponent==="definitely"),r=e.piniaStores.filter(i=>i.usedByComponent==="potentially"),d=e.piniaStores.filter(i=>i.usedByComponent==="unknown");o.length>0&&(t+=`### Definitely Used by Component

`,o.forEach(i=>{t+=`#### Store: ${i.id}

`,t+=`**State:**
\`\`\`json
${JSON.stringify(i.state,null,2)}
\`\`\`

`,Object.keys(i.getters).length>0&&(t+=`**Getters:**
\`\`\`json
${JSON.stringify(i.getters,null,2)}
\`\`\`

`),i.actions.length>0&&(t+=`**Actions:** ${i.actions.join(", ")}

`)})),r.length>0&&(t+=`### Potentially Related Stores

`,r.forEach(i=>{t+=`- **${i.id}**: ${i.actions.length} actions, ${Object.keys(i.getters).length} getters
`}),t+=`
`),d.length>0&&(t+=`### Other Available Stores
`,t+=`${d.map(i=>i.id).join(", ")}

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

`;const o=e.tanstackQueries.filter(i=>i.usedByComponent==="definitely"),r=e.tanstackQueries.filter(i=>i.usedByComponent==="potentially"),d=e.tanstackQueries.filter(i=>i.usedByComponent==="unknown");o.length>0&&(t+=`### Definitely Used by Component

`,o.forEach(i=>{t+=`#### Query: ${JSON.stringify(i.queryKey)}

`,t+=`- **Status:** ${i.state.status}
`,t+=`- **Fetch Status:** ${i.state.fetchStatus}
`,t+=`- **Last Updated:** ${i.lastUpdated||"Never"}
`,t+=`- **Data Updates:** ${i.state.dataUpdateCount}
`,i.error&&(t+=`- **Error:** ${i.error}
`),t+=`
**Data:**
\`\`\`json
${JSON.stringify(i.data,null,2)}
\`\`\`

`})),r.length>0&&(t+=`### Potentially Related Queries

`,r.forEach(i=>{t+=`- **${JSON.stringify(i.queryKey)}**: ${i.state.status}
`}),t+=`
`),d.length>0&&(t+=`### Other Active Queries
`,t+=`${d.map(i=>JSON.stringify(i.queryKey)).join(", ")}

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
**Matched Routes:** ${e.routerState.matched.map(o=>o.name||o.path).join(" → ")}
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

`;for(const[o,r]of Object.entries(e.slots))t+=`### ${o==="default"?"Default Slot":`Slot: ${o}`}
`,typeof r=="string"?t+=`${r}

`:t+=`\`\`\`json
${JSON.stringify(r,null,2)}
\`\`\`

`}return e.template&&(t+=`
## Template
\`\`\`vue
${e.template}
\`\`\`
`),t+=`
---
*Generated by Vue Grab*
`,t}function s(e,n="success"){const t=document.createElement("div");t.className=`vue-grab-toast ${n}`,t.textContent=e,document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),300)},O.TOAST_DURATION)}function ue(){E=document.createElement("div"),E.className="vue-grab-active-indicator",E.innerHTML=`
    <div class="vue-grab-indicator-title">Vue Grab Active</div>
    <div class="vue-grab-indicator-shortcuts">
      <span class="shortcut"><kbd>Click</kbd> Add to scratchpad</span>
      <span class="shortcut"><kbd>⌘+Click</kbd> Instant copy + editor</span>
      <span class="shortcut"><kbd>⌥↑↓</kbd> Navigate</span>
      <span class="shortcut"><kbd>Esc</kbd> Cancel</span>
    </div>
  `,document.body.appendChild(E)}function de(){E&&(E.remove(),E=null)}function X(){if(!g||g.length===0){D();return}y||(y=document.createElement("div"),y.className="vue-grab-breadcrumb",document.body.appendChild(y));const e=g.map((n,t)=>{const o=t===$,r=["vue-grab-breadcrumb-item"];return o&&r.push("active"),t<$&&r.push("parent"),`<span class="${r.join(" ")}">${n}</span>`});y.innerHTML=`
    <div class="vue-grab-breadcrumb-path">${e.join(" → ")}</div>
    <div class="vue-grab-breadcrumb-hint">⌥↑/↓ to navigate</div>
  `}function D(){y&&(y.remove(),y=null)}function pe(e,n){R(),!(!e||!n)&&(f=document.createElement("div"),f.className="vue-grab-floating-label",f.textContent=n,document.body.appendChild(f),me(e))}function me(e){if(!f||!e)return;const n=e.getBoundingClientRect(),t=f.getBoundingClientRect();let o=n.top+window.scrollY-t.height-4,r=n.left+window.scrollX;o<window.scrollY+4&&(o=n.bottom+window.scrollY+4),r+t.width>window.innerWidth-4&&(r=window.innerWidth-t.width-4),r<4&&(r=4),f.style.top=`${o}px`,f.style.left=`${r}px`}function R(){f&&(f.remove(),f=null)}function fe(e,n){I(),v=document.createElement("div"),v.className="vue-grab-inline-input";const t=document.createElement("input");t.type="text",t.placeholder="Add a note (Enter to add, Esc to cancel)",t.className="vue-grab-inline-input-field",t.addEventListener("keydown",h=>{h.key==="Enter"?(h.preventDefault(),h.stopPropagation(),he(t.value)):h.key==="Escape"&&(h.preventDefault(),h.stopPropagation(),I())}),t.addEventListener("click",h=>{h.stopPropagation()}),v.appendChild(t),document.body.appendChild(v);const o=300,r=40;let d=e,i=n+10;d+o>window.innerWidth-10&&(d=window.innerWidth-o-10),d<10&&(d=10),i+r>window.innerHeight-10&&(i=n-r-10),v.style.left=`${d}px`,v.style.top=`${i}px`,setTimeout(()=>t.focus(),10),W()}function I(){v&&(v.remove(),v=null),C=null}function he(e){if(I(),!C){s("No element selected","error");return}if(G=e||"(no note)",m="scratchpad",!C.getAttribute("data-vue-grab-id")){const t="vue-grab-"+Math.random().toString(36).substring(2,11);C.setAttribute("data-vue-grab-id",t)}const n=window.setTimeout(()=>{m==="scratchpad"&&(s("Extraction timed out. Try again.","error"),m=null)},O.EXTRACTION_TIMEOUT);window._vueGrabExtractionTimeout=n,A({type:"VUE_GRAB_EXTRACT",elementId:C.getAttribute("data-vue-grab-id")})}function W(){p||(p=document.createElement("div"),p.className="vue-grab-scratchpad-panel",q(),document.body.appendChild(p),Ee())}function _(){if(!p){W();return}q()}function q(){if(!p)return;const e=c.length>0?c.map((l,S)=>`
        <div class="vue-grab-scratchpad-item" data-id="${l.id}">
          <div class="vue-grab-scratchpad-item-header">
            <span class="vue-grab-scratchpad-item-name">${l.componentData.componentName}</span>
            <button class="vue-grab-scratchpad-item-remove" data-index="${S}">×</button>
          </div>
          <div class="vue-grab-scratchpad-item-note">${be(l.note)}</div>
        </div>
      `).join(""):'<div class="vue-grab-scratchpad-empty">Click elements to add to scratchpad</div>',n=x.filter(l=>l.available),t=n.length>0?`<div class="vue-grab-agent-status connected">
        <span class="vue-grab-agent-dot"></span>
        ${n.map(l=>l.name).join(", ")}
      </div>`:`<div class="vue-grab-agent-status disconnected">
        <span class="vue-grab-agent-dot"></span>
        No agents detected
      </div>`;let o="";c.length>0&&(n.length>0?o=`
        <div class="vue-grab-scratchpad-actions">
          <button class="vue-grab-scratchpad-copy">Copy</button>
          ${n.map(S=>`<button class="vue-grab-scratchpad-agent" data-agent="${S.name}">
          Send to ${S.name}
        </button>`).join("")}
        </div>
      `:o=`
        <div class="vue-grab-scratchpad-actions">
          <button class="vue-grab-scratchpad-copy">Copy All</button>
          <button class="vue-grab-scratchpad-send">Send to IDE</button>
        </div>
      `),p.innerHTML=`
    <div class="vue-grab-scratchpad-header">
      <span class="vue-grab-scratchpad-title">Scratchpad (${c.length})</span>
      ${c.length>0?`
        <button class="vue-grab-scratchpad-clear">Clear</button>
      `:""}
    </div>
    ${t}
    <div class="vue-grab-scratchpad-items">
      ${e}
    </div>
    ${o}
  `,p.querySelectorAll(".vue-grab-scratchpad-item-remove").forEach(l=>{l.addEventListener("click",S=>{S.stopPropagation();const V=parseInt(l.dataset.index||"0",10);ve(V)})});const d=p.querySelector(".vue-grab-scratchpad-clear");d&&d.addEventListener("click",l=>{l.stopPropagation(),c=[],_(),s("Scratchpad cleared","success")});const i=p.querySelector(".vue-grab-scratchpad-copy");i&&i.addEventListener("click",l=>{l.stopPropagation(),Y()});const h=p.querySelector(".vue-grab-scratchpad-send");h&&h.addEventListener("click",l=>{l.stopPropagation(),ye()}),p.querySelectorAll(".vue-grab-scratchpad-agent").forEach(l=>{l.addEventListener("click",async S=>{S.stopPropagation();const V=l.dataset.agent,ee=x.find(L=>L.name===V&&L.available);ee&&await Ce(ee)&&(b(),u=!1)})})}function ge(){p&&(p.remove(),p=null),$e()}function ve(e){if(e>=0&&e<c.length){const n=c.splice(e,1)[0];_(),s(`Removed "${n.componentData.componentName}" from scratchpad`,"success")}}function be(e){const n=document.createElement("div");return n.textContent=e,n.innerHTML}function Y(){if(c.length===0){s("Scratchpad is empty","error");return}const e=z(c);navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(e).catch(n=>{console.error("Could not copy to clipboard:",n),j(e)}):j(e),s(`✓ Copied ${c.length} component(s) to clipboard!`,"success")}function ye(){if(c.length===0){s("Scratchpad is empty","error");return}Y();const e=c.find(n=>n.componentData.filePath);if(e){const n=P[N];if(n&&e.componentData.filePath){const t=n.buildUrl(e.componentData.filePath);try{window.open(t,"_blank"),s(`✓ Copied ${c.length} component(s) and opening in ${n.name}...`,"success")}catch(o){console.error("Vue Grab: Could not open editor:",o)}}}b(),u=!1}function z(e){let n=`# Vue Component Context - Scratchpad (${e.length} items)

`;return e.forEach((t,o)=>{const r=t.componentData;if(n+=`## ${o+1}. ${r.componentName}
**Note**: ${t.note}
**File**: ${r.filePath||"Unknown"}

`,r.element&&(n+=`### Element
- **Tag**: <${r.element.tagName}>
- **ID**: ${r.element.id||"None"}
- **Classes**: ${r.element.classes?.join(", ")||"None"}

`),n+=`### Props
\`\`\`json
${JSON.stringify(r.props,null,2)}
\`\`\`

`,n+=`### Data/State
\`\`\`json
${JSON.stringify(r.data||r.setupState,null,2)}
\`\`\`

`,r.computed?.length&&(n+=`### Computed Properties
${r.computed.join(", ")}

`),r.methods?.length&&(n+=`### Methods
${r.methods.join(", ")}

`),r.piniaStores&&r.piniaStores.length>0){const d=r.piniaStores.filter(i=>i.usedByComponent==="definitely");d.length>0&&(n+=`### Pinia Stores (Definitely Used)
`,d.forEach(i=>{n+=`- **${i.id}**: ${JSON.stringify(i.state)}
`}),n+=`
`)}r.routerState&&(n+=`### Router
- **Path**: ${r.routerState.path}
- **Params**: ${JSON.stringify(r.routerState.params)}
- **Query**: ${JSON.stringify(r.routerState.query)}

`),n+=`---

`}),n+=`*Generated by Vue Grab - Scratchpad*
`,n}async function Se(e){try{const n=new AbortController,t=setTimeout(()=>n.abort(),1e3),o=await fetch(e.checkEndpoint||e.endpoint,{method:"GET",signal:n.signal});return clearTimeout(t),o.ok}catch{return!1}}async function Z(){const e=[];for(const[n,t]of Object.entries(te)){const o=await Se(t);e.push({available:o,name:t.name,config:t})}x=e,_()}function Ee(){Z(),k===null&&(k=window.setInterval(Z,5e3))}function $e(){k!==null&&(clearInterval(k),k=null),x=[]}async function Ce(e){if(c.length===0)return s("Scratchpad is empty","error"),!1;const n=z(c),t={type:"vue-grab-context",source:"vue-grab-extension",timestamp:Date.now(),content:n,components:c.map(o=>({name:o.componentData.componentName,filePath:o.componentData.filePath,note:o.note}))};try{const o=await fetch(e.config.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});return o.ok?(s(`✓ Sent ${c.length} component(s) to ${e.name}!`,"success"),!0):(s(`Failed to send to ${e.name}: ${o.statusText}`,"error"),!1)}catch{return s(`Could not connect to ${e.name}`,"error"),!1}}})();
//# sourceMappingURL=content.js.map
