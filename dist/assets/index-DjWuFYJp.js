(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function r(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(n){if(n.ep)return;n.ep=!0;const s=r(n);fetch(n.href,s)}})();const g=document.createElement("template");g.innerHTML=`
  <style>
    :host {
      --rht-font-size: 14px;
      --rht-line-height: 1.35;
      --rht-accent: #2563eb; /* indigo-600 */
      --rht-muted: #6b7280;  /* gray-500 */
      --rht-border: #e5e7eb; /* gray-200 */
      --rht-bg: #fff;
      --rht-hover: #f9fafb;

      display: block;
      font-size: var(--rht-font-size);
      line-height: var(--rht-line-height);
      color: #111827; /* gray-900 */
      background: var(--rht-bg);
    }
    .header {
      display: flex;
      gap: .5rem;
      align-items: baseline;
      margin-bottom: .5rem;
      flex-wrap: wrap;
    }
    .header code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #f3f4f6;
      padding: 0 .35rem;
      border-radius: 4px;
      border: 1px solid var(--rht-border);
      color: #111827;
    }
    .tree {
      padding-left: .25rem;
    }
    details {
      border-left: 2px solid var(--rht-border);
      margin: .125rem 0 .125rem .5rem;
      padding-left: .5rem;
    }
    summary {
      list-style: none;
      cursor: pointer;
      padding: .1rem .25rem;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: .4rem;
    }
    summary::-webkit-details-marker { display: none; }
    summary:hover { background: var(--rht-hover); }
    .twisty {
      width: .9em;
      display: inline-flex;
      transform: rotate(-90deg);
      transition: transform .12s ease;
      color: var(--rht-muted);
    }
    details[open] > summary .twisty {
      transform: rotate(0deg);
      color: var(--rht-accent);
    }
    .label {
      font-weight: 500;
    }
    .meta {
      color: var(--rht-muted);
      font-size: 0.92em;
    }
    .leaf {
      margin: .125rem 0 .125rem 1.5rem;
      padding: .1rem .25rem;
      border-radius: 6px;
    }
    .leaf:hover { background: var(--rht-hover); }
    .id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: #374151;
      word-break: break-all;
    }
    .error {
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: .5rem .75rem;
      border-radius: 8px;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      border: 0;
    }
  </style>
  <div class="header">
    <div><strong>RERUM History</strong></div>
    <div class="meta">
      <span class="sr-only">Base: </span><code id="baseDisplay"></code>
      <span>•</span>
      <span class="sr-only">Document ID: </span><code id="docIdDisplay"></code>
    </div>
  </div>
  <div id="content"></div>
`;class _ extends HTMLElement{static get observedAttributes(){return["api-base","history-base","document-id","node-label-key"]}constructor(){super(),this.attachShadow({mode:"open"}).appendChild(g.content.cloneNode(!0)),this._state={items:[],graph:null},this._abort=null}connectedCallback(){this._renderHeader(),this.apiBase&&this.documentId&&this.refresh()}attributeChangedCallback(e,r,o){var n;r!==o&&(e==="api-base"||e==="history-base"||e==="document-id"?(this._renderHeader(),this.isConnected&&this.apiBase&&this.documentId&&this.refresh()):e==="node-label-key"&&((n=this._state.items)!=null&&n.length)&&this._renderTree())}get apiBase(){return(this.getAttribute("api-base")||"").replace(/\/+$/,"")}set apiBase(e){e==null?this.removeAttribute("api-base"):this.setAttribute("api-base",e)}get historyBase(){return(this.getAttribute("history-base")||"").replace(/\/+$/,"")}set historyBase(e){e?this.setAttribute("history-base",e):this.removeAttribute("history-base")}get documentId(){return this.getAttribute("document-id")||""}set documentId(e){e==null?this.removeAttribute("document-id"):this.setAttribute("document-id",e)}get nodeLabelKey(){return this.getAttribute("node-label-key")||""}set nodeLabelKey(e){e?this.setAttribute("node-label-key",e):this.removeAttribute("node-label-key")}_deriveHistoryBase(){if(this.historyBase)return this.historyBase;const e=this.apiBase;if(!e)return"";const r=e.replace(/\/id\/?$/,"/history");return r!==e?r:`${e}/history`}async refresh(){if(!this.apiBase||!this.documentId)return;this._clearAbort();const e=new AbortController;this._abort=e;const o=`${this._deriveHistoryBase()}/${encodeURIComponent(this.documentId)}`;this._setContent(this._infoEl("Loading history…"));try{const n=await fetch(o,{signal:e.signal,headers:{accept:"application/json"}});if(!n.ok)throw new Error(`Request failed (${n.status}) ${n.statusText}`);const s=await n.json(),a=Array.isArray(s)?s:(s==null?void 0:s.items)||(s==null?void 0:s.history)||[];if(!Array.isArray(a))throw new Error("Unexpected response format (expected array).");const d=a.map(i=>typeof i=="string"?{"@id":i}:i);this._state.items=d,this._state.graph=E(d),this._renderTree(),this.dispatchEvent(new CustomEvent("loaded",{detail:{count:d.length,roots:this._state.graph.roots},bubbles:!0}))}catch(n){if(n.name==="AbortError")return;this._setContent(this._errorEl(n)),this.dispatchEvent(new CustomEvent("error",{detail:{error:n},bubbles:!0}))}finally{this._clearAbort()}}_renderHeader(){const e=this.shadowRoot,r=this.historyBase||this.apiBase;e.getElementById("baseDisplay").textContent=r||"(no base)",e.getElementById("docIdDisplay").textContent=this.documentId||"(no document id)"}_renderTree(){const e=document.createElement("div");e.className="tree";const{nodes:r,children:o,roots:n,idFor:s}=this._state.graph||{};if(!r){this._setContent(this._errorEl(new Error("No graph to render.")));return}if(n.length===0){e.appendChild(this._infoEl("No roots found. Rendering all as leaves."));for(const a of this._state.items)e.appendChild(this._leafEl(a,s(a)));this._setContent(e);return}for(const a of n){const d=this._branchEl(r.get(a),a,o,r,s,0);e.appendChild(d)}this._setContent(e)}_branchEl(e,r,o,n,s,a){const d=o.get(r)||[],i=document.createElement("details");a<2&&(i.open=!0);const l=document.createElement("summary"),c=document.createElement("span");c.className="twisty",c.textContent="▶";const h=document.createElement("span");h.className="label",h.textContent=this._labelFor(e,r);const u=document.createElement("span");u.className="id meta",u.textContent=`(${r})`,l.appendChild(c),l.appendChild(h),l.appendChild(u),l.addEventListener("click",f=>{this.dispatchEvent(new CustomEvent("nodeclick",{detail:{id:r,item:e},bubbles:!0})),f.stopPropagation()}),i.appendChild(l);for(const f of d){const b=n.get(f);(o.get(f)||[]).length>0?i.appendChild(this._branchEl(b,f,o,n,s,a+1)):i.appendChild(this._leafEl(b,f))}return i}_leafEl(e,r){const o=document.createElement("div");return o.className="leaf",o.innerHTML=`
      <span class="label">${m(this._labelFor(e,r))}</span>
      <span class="id meta">(${m(r)})</span>
    `,o.addEventListener("click",n=>{this.dispatchEvent(new CustomEvent("nodeclick",{detail:{id:r,item:e},bubbles:!0})),n.stopPropagation()}),o}_labelFor(e,r){var n;const o=(n=this.nodeLabelKey)==null?void 0:n.trim();if(o&&e&&typeof e=="object"&&o in e){const s=e[o];if(s!=null)return String(s)}if(e!=null&&e.label)return String(e.label);if(e!=null&&e.name)return String(e.name);if(r)try{const a=new URL(String(r),window.location.href).pathname.split("/").filter(Boolean);if(a.length)return a[a.length-1]}catch{const s=String(r).split(/[\/#!]/).filter(Boolean);if(s.length)return s[s.length-1]}return"version"}_infoEl(e){const r=document.createElement("div");return r.className="meta",r.textContent=e,r}_errorEl(e){const r=document.createElement("div");return r.className="error",r.textContent=`Error: ${(e==null?void 0:e.message)||e}`,r}_setContent(e){const r=this.shadowRoot.getElementById("content");r.innerHTML="",r.appendChild(e)}_clearAbort(){this._abort&&(this._abort.abort(),this._abort=null)}}customElements.define("rerum-history-tree",_);function E(t){const e=new Map,r=i=>v(i);for(const i of t){const l=r(i);l&&e.set(l,i)}const o=new Map,n=new Set,s=i=>(o.has(i)||o.set(i,new Set),o.get(i));for(const i of t){const l=r(i);if(!l)continue;const c=A(i),h=y(c);h&&(s(h).add(l),n.add(l))}for(const i of t){const l=r(i);if(!l)continue;const c=w(i);if(Array.isArray(c))for(const h of c){const u=y(h);u&&(s(l).add(u),n.add(u))}}const a=new Map;for(const[i,l]of o.entries())a.set(i,Array.from(l).filter(c=>e.has(c)));const d=[];for(const i of e.keys())n.has(i)||d.push(i);return{nodes:e,children:a,roots:d,idFor:r}}function v(t){var r,o,n;if(!t||typeof t!="object")return"";if(typeof t["@id"]=="string")return t["@id"];if(typeof t.id=="string")return t.id;if(typeof t._id=="string")return t._id;const e=((o=(r=t==null?void 0:t.__rerum)==null?void 0:r.history)==null?void 0:o.id)||((n=t==null?void 0:t.__rerum)==null?void 0:n.id);return typeof e=="string"?e:""}function A(t){var r,o,n,s;return((o=(r=t==null?void 0:t.__rerum)==null?void 0:r.history)==null?void 0:o.previous)??((n=t==null?void 0:t.history)==null?void 0:n.previous)??((s=t==null?void 0:t.__rerum)==null?void 0:s.previous)}function w(t){var r,o,n,s;const e=((o=(r=t==null?void 0:t.__rerum)==null?void 0:r.history)==null?void 0:o.next)??((n=t==null?void 0:t.history)==null?void 0:n.next)??((s=t==null?void 0:t.__rerum)==null?void 0:s.next);return Array.isArray(e)?e:typeof e=="string"?[e]:null}function y(t){return t?typeof t=="string"?t:typeof t=="object"?v(t):"":""}function m(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}const p=document.getElementById("tree");document.getElementById("loadBtn").addEventListener("click",()=>{const t=document.getElementById("apiBase").value.trim(),e=document.getElementById("docId").value.trim(),r=document.getElementById("labelKey").value.trim()||null;if(!t||!e){alert("Please provide both API Base and Document ID.");return}p.setAttribute("api-base",t),p.setAttribute("document-id",e),r?p.setAttribute("node-label-key",r):p.removeAttribute("node-label-key")});p.addEventListener("nodeclick",t=>{console.log("Node clicked:",t.detail)});p.addEventListener("loaded",t=>{console.log("Loaded:",t.detail)});p.addEventListener("error",t=>{console.error("Error:",t.detail.error)});
