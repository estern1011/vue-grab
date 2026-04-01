(function(){"use strict";const O={cursor:{name:"Cursor",scheme:"cursor",buildUrl:e=>`cursor://file/${e||""}`,buildPromptUrl:e=>`cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(e)}`},windsurf:{name:"Windsurf",scheme:"windsurf",buildUrl:e=>`windsurf://file/${e||""}`}},I={EXTRACTION_TIMEOUT:3e3,DEFAULT_EDITOR:"cursor"},S=te();let d=!1,u=null,f=null,g=null,b=-1,m=null,p=null,h=I.DEFAULT_EDITOR,l=[],c=null,E=null;const Z=100;let j=[],y=-1,k=null;chrome.storage&&chrome.storage.local&&chrome.storage.local.get(["selectedEditor"],e=>{e.selectedEditor&&(h=e.selectedEditor)});function B(){const e=document.createElement("script");e.src=chrome.runtime.getURL("src/injected/index.js"),e.onload=function(){this.remove()},(document.head||document.documentElement).appendChild(e)}document.head||document.documentElement?B():document.addEventListener("DOMContentLoaded",B),S?S.element.addEventListener(S.config.responseEvent,ee):console.error("Vue Grab: Bridge initialization failed. Extraction will not work.");function ee(e){const t=e.detail;if(t)if(t.type==="VUE_GRAB_COMPONENT_DATA"){window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0);const n=t.data;if(n){const r={id:V(),componentData:n,comment:"",timestamp:Date.now()};l.push(r),N(),k==="editor"&&ne(n),k=null}else k=null}else if(t.type==="VUE_GRAB_COMPONENT_INFO"){if(t.info&&u){const n=t.info.name||"Anonymous";u.classList.add("vue-grab-highlight"),be(u,n),g=t.info.hierarchy||[],b=t.info.currentIndex??-1,z()}}else t.type==="VUE_GRAB_NAVIGATION_RESULT"?t.info?(g=t.info.hierarchy||[],b=t.info.currentIndex??-1,u&&u.setAttribute("data-vue-component",t.info.name||"Anonymous"),z()):t.error:t.type==="VUE_GRAB_COMPONENTS_LIST"&&ae(t.elementIds)}function te(){const e=document.documentElement||document.body;if(!e)return null;const s=V(),t={bridgeId:`vue-grab-bridge-${s}`,requestEvent:`vue-grab-request-${s}`,responseEvent:`vue-grab-response-${s}`},n=document.createElement("div");return n.id=t.bridgeId,n.style.display="none",n.setAttribute("data-vue-grab-bridge","true"),n.setAttribute("data-request-event",t.requestEvent),n.setAttribute("data-response-event",t.responseEvent),e.appendChild(n),{element:n,config:t}}function V(){if(window.crypto&&window.crypto.getRandomValues){const e=new Uint32Array(2);return window.crypto.getRandomValues(e),Array.from(e,s=>s.toString(16)).join("")}return Math.random().toString(36).substring(2,11)}function x(e){if(!S){console.warn("Vue Grab: Cannot communicate with injected script.");return}const s=new CustomEvent(S.config.requestEvent,{detail:e,bubbles:!1,composed:!1});S.element.dispatchEvent(s)}function ne(e){const s=e?.filePath,t=O[h];if(t&&t.scheme&&s){const n=t.buildUrl(s);try{window.open(n,"_blank")}catch(r){console.error("Vue Grab: Could not open editor:",r)}}}chrome.runtime.onMessage.addListener((e,s,t)=>{if(e.action==="toggle")d=!d,d?se():A(),t({isActive:d});else if(e.action==="getState")t({isActive:d,hasData:l.length>0});else if(e.action==="getLastData"){const n=l[l.length-1];t({data:n?.componentData||null})}else e.action==="setEditor"&&(h=e.editor,t({success:!0}));return!0});function se(){document.addEventListener("mouseover",R),document.addEventListener("mouseout",D),document.addEventListener("click",G,!0),document.addEventListener("keydown",H),me(),oe()}function A(){document.removeEventListener("mouseover",R),document.removeEventListener("mouseout",D),document.removeEventListener("click",G,!0),document.removeEventListener("keydown",H),E!==null&&(clearTimeout(E),E=null),u&&(u.classList.remove("vue-grab-highlight"),u.removeAttribute("data-vue-grab-id")),g=null,b=-1,fe(),U(),P(),le()}function R(e){if(!d)return;const s=e.target;if(s.closest(".vue-grab-panel")||E!==null)return;u=s,y=-1;const t="vue-grab-"+Math.random().toString(36).substring(2,11);u.setAttribute("data-vue-grab-id",t),x({type:"VUE_GRAB_GET_INFO",elementId:t}),E=window.setTimeout(()=>{E=null},Z)}function D(e){d&&(u&&(u.classList.remove("vue-grab-highlight"),u.removeAttribute("data-vue-grab-id"),u=null),P(),g=null,b=-1,U())}function G(e){if(!d)return;const s=e.target;s.closest(".vue-grab-panel")||(e.preventDefault(),e.stopPropagation(),M(e.metaKey||e.ctrlKey,s))}function M(e,s){if(k=e?"editor":"grab",!u&&s&&(u=s),!u)return;if(!u.getAttribute("data-vue-grab-id")){const n="vue-grab-"+Math.random().toString(36).substring(2,11);u.setAttribute("data-vue-grab-id",n)}const t=window.setTimeout(()=>{k=null},I.EXTRACTION_TIMEOUT);window._vueGrabExtractionTimeout=t,re()}function H(e){if(d){if(e.key==="Escape"){A(),d=!1;return}if(e.key==="Enter"){e.preventDefault(),e.stopPropagation(),M(e.metaKey||e.ctrlKey,null);return}if(e.key==="Tab"){e.preventDefault(),e.stopPropagation(),ie(e.shiftKey?-1:1);return}if(e.altKey&&e.key==="ArrowUp"){e.preventDefault(),e.stopPropagation(),x({type:"VUE_GRAB_NAVIGATE_PARENT"});return}if(e.altKey&&e.key==="ArrowDown"){e.preventDefault(),e.stopPropagation(),x({type:"VUE_GRAB_NAVIGATE_CHILD"});return}}}function re(){if(b>=0&&g&&g.length>0){x({type:"VUE_GRAB_EXTRACT_CURRENT"});return}if(u){let e=u.getAttribute("data-vue-grab-id");e||(e="vue-grab-"+Math.random().toString(36).substring(2,11),u.setAttribute("data-vue-grab-id",e)),x({type:"VUE_GRAB_EXTRACT",elementId:e});return}window._vueGrabExtractionTimeout&&(clearTimeout(window._vueGrabExtractionTimeout),window._vueGrabExtractionTimeout=void 0),k=null}let q=1;function ie(e){q=e,x({type:"VUE_GRAB_COLLECT_COMPONENTS"})}function ae(e){if(j=e.map(n=>document.querySelector(`[data-vue-grab-id="${n}"]`)).filter(Boolean),j.length===0)return;y+=q,y>=j.length&&(y=0),y<0&&(y=j.length-1);const s=j[y];u&&u.classList.remove("vue-grab-highlight"),u=s,s.classList.add("vue-grab-highlight");const t=s.getAttribute("data-vue-grab-id");x({type:"VUE_GRAB_GET_INFO",elementId:t}),s.scrollIntoView({block:"nearest",behavior:"smooth"})}function oe(){c||(c=document.createElement("div"),c.className="vue-grab-panel",c.innerHTML=J(),document.body.appendChild(c),Q())}function le(){c&&(c.remove(),c=null)}function N(){if(!c)return;const e=c.querySelector(".vue-grab-panel-list"),s=c.querySelector(".vue-grab-panel-count"),t=c.querySelector(".vue-grab-panel-actions");e&&(e.innerHTML=F()),s&&(s.textContent=`${l.length} component${l.length!==1?"s":""}`),t&&(t.style.display=l.length>0?"flex":"none"),L()}function J(){const e=Object.entries(O).map(([r,a])=>`<button class="vue-grab-panel-editor-btn ${r===h?"active":""}" data-editor="${r}">${a.name}</button>`).join(""),s=O[h],n=s?.buildPromptUrl?`Send to ${s.name}`:`Copy for ${s?.name||"Editor"}`;return`
    <div class="vue-grab-panel-header">
      <div class="vue-grab-panel-header-top">
        <div class="vue-grab-panel-title">
          <span class="vue-grab-panel-logo">Vue Grab</span>
          <span class="vue-grab-panel-count">${l.length} component${l.length!==1?"s":""}</span>
        </div>
        <button class="vue-grab-panel-close" title="Close (Esc)">&times;</button>
      </div>
      <div class="vue-grab-panel-editor-row">
        <span class="vue-grab-panel-editor-label">Send to</span>
        ${e}
      </div>
    </div>
    <div class="vue-grab-panel-list">
      ${F()}
    </div>
    <div class="vue-grab-panel-actions" style="display: ${l.length>0?"flex":"none"}">
      <button class="vue-grab-panel-send">${n}</button>
      <button class="vue-grab-panel-copy-all">Copy</button>
      <button class="vue-grab-panel-clear">Clear</button>
    </div>
    <div class="vue-grab-panel-empty" style="display: ${l.length===0?"block":"none"}">
      Click any element on the page to grab its Vue component context.
    </div>
  `}function F(){return l.length===0?"":l.map((e,s)=>{const t=e.componentData;return`
      <div class="vue-grab-panel-item" data-item-id="${e.id}">
        <div class="vue-grab-panel-item-header">
          <div class="vue-grab-panel-item-info">
            <span class="vue-grab-panel-item-number">${s+1}</span>
            <span class="vue-grab-panel-item-name">${o(t.componentName)}</span>
          </div>
          <button class="vue-grab-panel-item-remove" data-item-id="${e.id}" title="Remove">&times;</button>
        </div>
        ${t.filePath?`<div class="vue-grab-panel-item-file">${o(t.filePath)}</div>`:""}
        <div class="vue-grab-panel-item-comment-row">
          <input
            type="text"
            class="vue-grab-panel-item-comment"
            data-item-id="${e.id}"
            placeholder="Add a note for the agent..."
            value="${o(e.comment)}"
          />
        </div>
        <div class="vue-grab-context">
          ${ce(t)}
        </div>
      </div>
    `}).join("")}function ce(e){let s="";if(e.element){const n=e.element,a=[`&lt;${o(n.tagName)}&gt;`];if(n.id&&a.push(`#${o(n.id)}`),n.classes?.length&&a.push(n.classes.map(i=>`.${o(i)}`).join("")),s+=`<div class="vue-grab-ctx-element">${a.join("")}</div>`,n.selector||n.pageUrl){if(s+=`<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">Locator</summary>`,n.pageUrl&&(s+=`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">url</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string vue-grab-ctx-val--truncate">${o(n.pageUrl)}</span></div>`),n.selector&&(s+=`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">css</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${o(n.selector)}</span></div>`),n.xpath&&(s+=`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">xpath</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${o(n.xpath)}</span></div>`),n.boundingBox){const i=n.boundingBox;s+=`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">box</span><span class="vue-grab-ctx-val vue-grab-ctx-val--num">${i.x}, ${i.y} (${i.width}&times;${i.height})</span></div>`}n.textContent&&(s+=`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">text</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string vue-grab-ctx-val--truncate">"${o(n.textContent)}"</span></div>`),s+="</details>"}n.computedStyles&&Object.keys(n.computedStyles).length&&(s+=C("Styles",n.computedStyles)),n.renderedHtml&&(s+=`<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">HTML</summary>
        <pre class="vue-grab-ctx-code">${o(n.renderedHtml)}</pre>
      </details>`)}s+=C("Props",e.props);const t=e.data||e.setupState;if(s+=C("State",t),e.computed?.length&&(s+=w("Computed",e.computed)),e.methods?.length&&(s+=w("Methods",e.methods)),e.piniaStores?.length){const n=e.piniaStores.filter(a=>a.usedByComponent==="definitely"),r=e.piniaStores.filter(a=>a.usedByComponent!=="definitely");if(n.length)for(const a of n)s+=ue(a.id,a.state,a.getters,a.actions);r.length&&(s+=`<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">${r.length} other store${r.length!==1?"s":""}</summary>
        <div class="vue-grab-ctx-tags">${r.map(a=>`<span class="vue-grab-ctx-tag">${o(a.id)}</span>`).join("")}</div>
      </details>`)}if(e.vuexStore&&(s+=C("Vuex State",e.vuexStore.state),e.vuexStore.usedState.length&&(s+=w("Used State",e.vuexStore.usedState))),e.tanstackQueries?.length)for(const n of e.tanstackQueries.filter(r=>r.usedByComponent==="definitely")){const r=`Query ${JSON.stringify(n.queryKey)}`,a=n.state.status;s+=`<details class="vue-grab-ctx-section">
        <summary class="vue-grab-ctx-label">${o(r)} <span class="vue-grab-ctx-badge vue-grab-ctx-badge--${a}">${a}</span></summary>
        ${$(n.data,0)}
      </details>`}if(e.routerState){const n=e.routerState;s+=`<details class="vue-grab-ctx-section">
      <summary class="vue-grab-ctx-label">Route</summary>
      <div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key">path</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${o(n.fullPath)}</span>
      </div>
      ${n.name?`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">name</span><span class="vue-grab-ctx-val vue-grab-ctx-val--string">${o(String(n.name))}</span></div>`:""}
      ${Object.keys(n.params||{}).length?`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">params</span>${$(n.params,0)}</div>`:""}
      ${Object.keys(n.query||{}).length?`<div class="vue-grab-ctx-kv"><span class="vue-grab-ctx-key">query</span>${$(n.query,0)}</div>`:""}
    </details>`}return e.emittedEvents?.length&&(s+=w("Emits",e.emittedEvents)),e.providedValues&&Object.keys(e.providedValues).length&&(s+=C("Provides",e.providedValues)),e.injectedValues&&Object.keys(e.injectedValues).length&&(s+=C("Injects",e.injectedValues)),e.slots&&Object.keys(e.slots).length&&(s+=w("Slots",Object.keys(e.slots))),e.template&&(s+=`<details class="vue-grab-ctx-section">
      <summary class="vue-grab-ctx-label">Template</summary>
      <pre class="vue-grab-ctx-code">${o(e.template)}</pre>
    </details>`),s||'<div class="vue-grab-ctx-empty">No data extracted</div>'}function C(e,s){if(!s||Object.keys(s).length===0)return"";const t=Object.keys(s);let n="";for(const r of t)n+=`<div class="vue-grab-ctx-kv">
      <span class="vue-grab-ctx-key">${o(r)}</span>${$(s[r],0)}
    </div>`;return`<details class="vue-grab-ctx-section" open>
    <summary class="vue-grab-ctx-label">${o(e)} <span class="vue-grab-ctx-count">${t.length}</span></summary>
    ${n}
  </details>`}function w(e,s){return`<details class="vue-grab-ctx-section" open>
    <summary class="vue-grab-ctx-label">${o(e)} <span class="vue-grab-ctx-count">${s.length}</span></summary>
    <div class="vue-grab-ctx-tags">${s.map(t=>`<span class="vue-grab-ctx-tag">${o(t)}</span>`).join("")}</div>
  </details>`}function ue(e,s,t,n,r){let a="";const i=Object.keys(s||{});if(i.length)for(const v of i)a+=`<div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key">${o(v)}</span>${$(s[v],0)}
      </div>`;const T=Object.keys(t||{});return T.length&&(a+=`<div class="vue-grab-ctx-sub">Getters: ${T.map(v=>`<span class="vue-grab-ctx-tag">${o(v)}</span>`).join("")}</div>`),n.length&&(a+=`<div class="vue-grab-ctx-sub">Actions: ${n.map(v=>`<span class="vue-grab-ctx-tag">${o(v)}</span>`).join("")}</div>`),`<details class="vue-grab-ctx-section" open>
    <summary class="vue-grab-ctx-label">Store: ${o(e)} <span class="vue-grab-ctx-badge vue-grab-ctx-badge--success">used</span></summary>
    ${a}
  </details>`}const K=4;function $(e,s){if(e==null)return`<span class="vue-grab-ctx-val vue-grab-ctx-val--null">${e===null?"null":"undefined"}</span>`;if(typeof e=="boolean")return`<span class="vue-grab-ctx-val vue-grab-ctx-val--bool">${e}</span>`;if(typeof e=="number")return`<span class="vue-grab-ctx-val vue-grab-ctx-val--num">${e}</span>`;if(typeof e=="string"){if(e.startsWith("[Function")||e.startsWith("[Circular")||e.startsWith("[Deep")||e.startsWith("[HTML"))return`<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">${o(e)}</span>`;const t=e.length>80?e.slice(0,77)+"...":e;return`<span class="vue-grab-ctx-val vue-grab-ctx-val--string">"${o(t)}"</span>`}if(Array.isArray(e)){if(e.length===0)return'<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">[]</span>';if(s>=K)return`<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">Array(${e.length})</span>`;let t="";for(let n=0;n<e.length;n++)t+=`<div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key vue-grab-ctx-key--index">${n}</span>${$(e[n],s+1)}
      </div>`;return`<details class="vue-grab-ctx-inline">
      <summary class="vue-grab-ctx-expand">Array(${e.length})</summary>
      <div class="vue-grab-ctx-nested">${t}</div>
    </details>`}if(typeof e=="object"){const t=Object.keys(e);if(t.length===0)return'<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">{}</span>';if(s>=K)return`<span class="vue-grab-ctx-val vue-grab-ctx-val--ref">{${t.slice(0,3).join(", ")}${t.length>3?", ...":""}}</span>`;const n=t.slice(0,3).join(", ")+(t.length>3?", ...":"");let r="";for(const a of t)r+=`<div class="vue-grab-ctx-kv">
        <span class="vue-grab-ctx-key">${o(a)}</span>${$(e[a],s+1)}
      </div>`;return`<details class="vue-grab-ctx-inline">
      <summary class="vue-grab-ctx-expand">{${o(n)}}</summary>
      <div class="vue-grab-ctx-nested">${r}</div>
    </details>`}return`<span class="vue-grab-ctx-val">${o(String(e))}</span>`}function de(){if(l.length===0)return;const e=W(),s=O[h];if(s?.buildPromptUrl){_(e);const t=pe(),n=s.buildPromptUrl(t);if(n.length<=32e3)try{window.open(n,"_blank")}catch{}return}if(_(e),s?.scheme){const t=new Set(l.map(n=>n.componentData.filePath).filter(Boolean));for(const n of t)try{window.open(s.buildUrl(n),"_blank")}catch{}}}function pe(){const e=[];e.push(`Here is Vue component context from ${l.length} grabbed component(s):
`);for(const t of l){const n=t.componentData;e.push(`Component: ${n.componentName}`),n.filePath&&e.push(`File: ${n.filePath}`),t.comment&&e.push(`Note: ${t.comment}`),n.props&&Object.keys(n.props).length&&e.push(`Props: ${JSON.stringify(n.props)}`),(n.data||n.setupState)&&e.push(`State: ${JSON.stringify(n.data||n.setupState)}`),n.computed?.length&&e.push(`Computed: ${n.computed.join(", ")}`),n.methods?.length&&e.push(`Methods: ${n.methods.join(", ")}`),n.element&&(n.element.selector&&e.push(`CSS Selector: ${n.element.selector}`),n.element.pageUrl&&e.push(`Page: ${n.element.pageUrl}`)),n.routerState&&e.push(`Route: ${n.routerState.fullPath}`),e.push("")}let s=e.join(`
`);return s.length>7e3&&(s=s.slice(0,6997)+"..."),s}function Q(){if(!c)return;c.querySelector(".vue-grab-panel-close")?.addEventListener("click",()=>{A(),d=!1}),c.querySelector(".vue-grab-panel-send")?.addEventListener("click",de),c.querySelector(".vue-grab-panel-copy-all")?.addEventListener("click",ge),c.querySelector(".vue-grab-panel-clear")?.addEventListener("click",()=>{l=[],N();const r=c?.querySelector(".vue-grab-panel-empty");r&&(r.style.display="block")}),c.querySelectorAll(".vue-grab-panel-editor-btn").forEach(r=>{r.addEventListener("click",a=>{const i=a.currentTarget.dataset.editor;if(i){h=i,chrome.storage?.local&&chrome.storage.local.set({selectedEditor:i});const T=c?.querySelector(".vue-grab-panel-list")?.innerHTML;if(c){c.innerHTML=J();const v=c.querySelector(".vue-grab-panel-list");v&&T&&(v.innerHTML=T),Q(),L()}}})}),L()}function L(){if(!c)return;c.querySelectorAll(".vue-grab-panel-item-remove").forEach(s=>{s.addEventListener("click",t=>{const n=t.currentTarget.dataset.itemId;if(l=l.filter(r=>r.id!==n),N(),l.length===0){const r=c?.querySelector(".vue-grab-panel-empty");r&&(r.style.display="block")}})}),c.querySelectorAll(".vue-grab-panel-item-comment").forEach(s=>{s.addEventListener("input",t=>{const n=t.target,r=n.dataset.itemId,a=l.find(i=>i.id===r);a&&(a.comment=n.value)}),s.addEventListener("keydown",t=>{t.stopPropagation()})});const e=c?.querySelector(".vue-grab-panel-empty");e&&(e.style.display=l.length===0?"block":"none")}function ge(){if(l.length===0)return;const e=W();_(e)}function W(){if(l.length===1){const s=l[0];let t="";return s.comment&&(t+=`> **Note:** ${s.comment}

`),t+=ve(s.componentData),t}let e=`# Vue Component Context (${l.length} components)

`;return l.forEach((s,t)=>{e+=`---

`,e+=`## ${t+1}. ${s.componentData.componentName}`,s.componentData.filePath&&(e+=` (${s.componentData.filePath})`),e+=`

`,s.comment&&(e+=`> **Note:** ${s.comment}

`),e+=Y(s.componentData),e+=`
`}),e}function _(e){navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(e).catch(()=>X(e)):X(e)}function X(e){const s=document.createElement("textarea");s.value=e,s.style.position="fixed",s.style.opacity="0",document.body.appendChild(s),s.select(),document.execCommand("copy"),document.body.removeChild(s)}function ve(e){let s=`# Vue Component Context

`;return s+=Y(e),s}function Y(e){let s="";if(e.element){const n=e.element;s=`### Element
- **Tag**: <${n.tagName}>
- **ID**: ${n.id||"None"}
- **Classes**: ${n.classes?.join(", ")||"None"}
`,n.pageUrl&&(s+=`- **Page**: ${n.pageUrl}
`),n.selector&&(s+=`- **CSS Selector**: \`${n.selector}\`
`),n.xpath&&(s+=`- **XPath**: \`${n.xpath}\`
`),n.boundingBox&&(s+=`- **Bounding Box**: x=${n.boundingBox.x}, y=${n.boundingBox.y}, ${n.boundingBox.width}x${n.boundingBox.height}
`),n.textContent&&(s+=`- **Text**: "${n.textContent}"
`),n.computedStyles&&Object.keys(n.computedStyles).length&&(s+=`
**Computed Styles:**
\`\`\`json
${JSON.stringify(n.computedStyles,null,2)}
\`\`\`
`),n.renderedHtml&&(s+=`
**Rendered HTML:**
\`\`\`html
${n.renderedHtml}
\`\`\`
`),s+=`
`}let t=`### Component Information
- **Name**: ${e.componentName}
- **File**: ${e.filePath||"Unknown"}

`;if(t+=s,t+=`### Props
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

`;const n=e.piniaStores.filter(i=>i.usedByComponent==="definitely"),r=e.piniaStores.filter(i=>i.usedByComponent==="potentially"),a=e.piniaStores.filter(i=>i.usedByComponent==="unknown");n.length>0&&(t+=`#### Definitely Used by Component

`,n.forEach(i=>{t+=`**Store: ${i.id}**

`,t+=`**State:**
\`\`\`json
${JSON.stringify(i.state,null,2)}
\`\`\`

`,Object.keys(i.getters).length>0&&(t+=`**Getters:**
\`\`\`json
${JSON.stringify(i.getters,null,2)}
\`\`\`

`),i.actions.length>0&&(t+=`**Actions:** ${i.actions.join(", ")}

`)})),r.length>0&&(t+=`#### Potentially Related Stores

`,r.forEach(i=>{t+=`- **${i.id}**: ${i.actions.length} actions, ${Object.keys(i.getters).length} getters
`}),t+=`
`),a.length>0&&(t+=`#### Other Available Stores
${a.map(i=>i.id).join(", ")}

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

`;const n=e.tanstackQueries.filter(i=>i.usedByComponent==="definitely"),r=e.tanstackQueries.filter(i=>i.usedByComponent==="potentially"),a=e.tanstackQueries.filter(i=>i.usedByComponent==="unknown");n.length>0&&(t+=`#### Definitely Used by Component

`,n.forEach(i=>{t+=`**Query: ${JSON.stringify(i.queryKey)}**

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

`})),r.length>0&&(t+=`#### Potentially Related Queries

`,r.forEach(i=>{t+=`- **${JSON.stringify(i.queryKey)}**: ${i.state.status}
`}),t+=`
`),a.length>0&&(t+=`#### Other Active Queries
${a.map(i=>JSON.stringify(i.queryKey)).join(", ")}

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
**Matched Routes:** ${e.routerState.matched.map(n=>n.name||n.path).join(" > ")}
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

`;for(const[n,r]of Object.entries(e.slots))t+=`#### ${n==="default"?"Default Slot":`Slot: ${n}`}
`,typeof r=="string"?t+=`${r}

`:t+=`\`\`\`json
${JSON.stringify(r,null,2)}
\`\`\`

`}return e.template&&(t+=`
### Template
\`\`\`vue
${e.template}
\`\`\`
`),t}function o(e){const s=document.createElement("div");return s.textContent=e,s.innerHTML}function me(){f=document.createElement("div"),f.className="vue-grab-active-indicator",f.innerHTML=`
    <div class="vue-grab-indicator-title">Vue Grab Active</div>
    <div class="vue-grab-indicator-shortcuts">
      <span class="shortcut"><kbd>Click</kbd>/<kbd>Enter</kbd> Add to list</span>
      <span class="shortcut"><kbd>Tab</kbd> Next component</span>
      <span class="shortcut"><kbd>⌥↑↓</kbd> Navigate tree</span>
      <span class="shortcut"><kbd>Esc</kbd> Done</span>
    </div>
  `,document.body.appendChild(f)}function fe(){f&&(f.remove(),f=null)}function z(){if(!g||g.length===0){U();return}m||(m=document.createElement("div"),m.className="vue-grab-breadcrumb",document.body.appendChild(m));const e=g.map((s,t)=>{const n=t===b,r=["vue-grab-breadcrumb-item"];return n&&r.push("active"),t<b&&r.push("parent"),`<span class="${r.join(" ")}">${s}</span>`});m.innerHTML=`
    <div class="vue-grab-breadcrumb-path">${e.join(" > ")}</div>
    <div class="vue-grab-breadcrumb-hint">Alt+Up/Down to navigate</div>
  `}function U(){m&&(m.remove(),m=null)}function be(e,s){P(),!(!e||!s)&&(p=document.createElement("div"),p.className="vue-grab-floating-label",p.textContent=s,document.body.appendChild(p),he(e))}function he(e){if(!p||!e)return;const s=e.getBoundingClientRect(),t=p.getBoundingClientRect();let n=s.top+window.scrollY-t.height-4,r=s.left+window.scrollX;n<window.scrollY+4&&(n=s.bottom+window.scrollY+4),r+t.width>window.innerWidth-4&&(r=window.innerWidth-t.width-4),r<4&&(r=4),p.style.top=`${n}px`,p.style.left=`${r}px`}function P(){p&&(p.remove(),p=null)}})();
//# sourceMappingURL=content.js.map
