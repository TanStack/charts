var e=Date.UTC(2025,0,1),t=7*864e5,n=[34,42,39,51,57,54,66,72],r=n.map((n,r)=>new Date(e+r*t)),i=[r[0]??new Date(e),r[r.length-1]??new Date(e)];function a(e=0){return r.map((t,r)=>{let i=n[r]??0;return{id:o(t),date:t,value:e%2==1&&(r===3||r===4)?i+4:i}})}function o(e){return e.toISOString().slice(0,10)}function s(e){let t=e.startsWith(`frame:`)?e.slice(6):``,n=r.findIndex(e=>o(e)===t);return n<0?null:n}function c(e,t,n){let r=e.ownerDocument,i=r.createElement(`style`);i.textContent=`
    .ts-conformance-playback-range {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      color-scheme: light dark;
      cursor: ew-resize;
      margin: 0;
      padding: 0;
    }
    .ts-conformance-playback-range::-webkit-slider-runnable-track {
      height: 4px;
      background: transparent;
    }
    .ts-conformance-playback-range::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      margin-top: -8px;
      border: 0;
      background: transparent;
    }
    .ts-conformance-playback-range::-moz-range-track {
      height: 4px;
      background: transparent;
    }
    .ts-conformance-playback-range::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border: 0;
      background: transparent;
    }
    .ts-conformance-playback-range:focus-visible {
      outline: none;
    }
    .ts-conformance-playback-range:focus-visible
      + .ts-conformance-playback-handle {
      outline: 3px solid var(--ts-chart-1, #2563eb);
      outline-offset: 3px;
    }
    .ts-conformance-playback-toolbar {
      color: inherit;
    }
    .ts-conformance-playback-current,
    .ts-conformance-playback-button {
      border: 1px solid color-mix(in srgb, currentColor 32%, transparent);
      background: color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas);
      color: inherit;
    }
    .ts-conformance-playback-button:hover {
      background: color-mix(in srgb, var(--ts-chart-2, #f97316) 20%, Canvas);
    }
    .ts-conformance-playback-button:focus-visible {
      outline: 3px solid var(--ts-chart-1, #2563eb);
      outline-offset: 2px;
    }
  `;let a=r.createElement(`div`);a.style.position=`absolute`,a.style.inset=`0`,a.style.zIndex=`3`,a.style.pointerEvents=`none`;let o=r.createElement(`div`);o.className=`ts-conformance-playback-track`,o.dataset.conformancePlaybackRule=`track`,o.style.position=`absolute`,o.style.height=`4px`,o.style.borderRadius=`999px`,o.style.background=`color-mix(in srgb, currentColor 52%, transparent)`;let s=r.createElement(`div`);s.className=`ts-conformance-playback-playhead`,s.dataset.conformancePlaybackRule=`playhead`,s.style.position=`absolute`,s.style.width=`2px`,s.style.borderRadius=`999px`,s.style.background=`var(--ts-chart-2, #f97316)`;let c=r.createElement(`input`);c.className=`ts-conformance-playback-range`,c.type=`range`,c.min=`0`,c.step=`1`,c.setAttribute(`aria-label`,`Timeline frame`),c.style.position=`absolute`,c.style.height=`44px`,c.style.pointerEvents=`auto`;let u=r.createElement(`div`);u.className=`ts-conformance-playback-handle`,u.dataset.conformancePlaybackHandle=``,u.style.position=`absolute`,u.style.boxSizing=`border-box`,u.style.width=`20px`,u.style.height=`20px`,u.style.border=`2px solid Canvas`,u.style.borderRadius=`999px`,u.style.background=`var(--ts-chart-2, #f97316)`,u.style.boxShadow=`0 1px 4px rgb(15 23 42 / 0.35)`;let d=r.createElement(`div`);d.className=`ts-conformance-playback-toolbar`,d.setAttribute(`role`,`group`),d.setAttribute(`aria-label`,`Timeline playback controls`),d.style.position=`absolute`,d.style.top=`4px`,d.style.left=`56px`,d.style.right=`20px`,d.style.display=`flex`,d.style.alignItems=`center`,d.style.justifyContent=`flex-end`,d.style.gap=`8px`,d.style.pointerEvents=`none`;let f=r.createElement(`div`);f.className=`ts-conformance-playback-current`,f.style.boxSizing=`border-box`,f.style.minWidth=`0`,f.style.minHeight=`32px`,f.style.padding=`7px 9px`,f.style.borderRadius=`999px`,f.style.overflow=`hidden`,f.style.textOverflow=`ellipsis`,f.style.whiteSpace=`nowrap`,f.style.font=`600 12px/1.2 system-ui, sans-serif`;let p=r.createElement(`button`);p.className=`ts-conformance-playback-button`,p.type=`button`,p.setAttribute(`aria-label`,`Play timeline`),p.title=`Play timeline`,p.style.flex=`0 0 auto`,p.style.width=`44px`,p.style.height=`44px`,p.style.borderRadius=`10px`,p.style.cursor=`pointer`,p.style.font=`700 16px/1 system-ui, sans-serif`,p.style.pointerEvents=`auto`;let m=r.createElement(`output`);m.className=`ts-conformance-playback-announcement`,m.setAttribute(`role`,`status`),m.setAttribute(`aria-live`,`polite`),m.setAttribute(`aria-atomic`,`true`),m.style.position=`absolute`,m.style.width=`1px`,m.style.height=`1px`,m.style.padding=`0`,m.style.margin=`-1px`,m.style.overflow=`hidden`,m.style.clipPath=`inset(50%)`,m.style.whiteSpace=`nowrap`;let h=()=>{t(Number(c.value))};return c.addEventListener(`input`,h),p.addEventListener(`click`,n),d.append(f,p),a.append(o,s,c,u,d,m),e.append(i,a),{range:c,playButton:p,announce(e){m.value=e,m.textContent=e},ruleGeometry(){return[l(o),l(s)]},paint(e,t){o.style.left=`${e.left}px`,o.style.top=`${e.trackY-2}px`,o.style.width=`${Math.max(0,e.right-e.left)}px`,s.style.left=`${e.playheadX-1}px`,s.style.top=`${e.top}px`,s.style.height=`${Math.max(0,e.trackY-e.top)}px`,c.max=String(t.max),c.value=String(t.index),c.setAttribute(`aria-valuetext`,t.valueText),c.style.left=`${e.left-10}px`,c.style.top=`${e.trackY-22}px`,c.style.width=`${Math.max(0,e.right-e.left+20)}px`,u.style.left=`${e.playheadX-10}px`,u.style.top=`${e.trackY-10}px`,f.textContent=t.valueText,p.textContent=t.playing?`❚❚`:`▶`,p.setAttribute(`aria-pressed`,String(t.playing)),p.setAttribute(`aria-label`,t.playing?`Pause timeline`:`Play timeline`),p.title=t.playing?`Pause timeline`:`Play timeline`},destroy(){c.removeEventListener(`input`,h),p.removeEventListener(`click`,n),i.remove(),a.remove()}}}function l(e){let t=e.getBoundingClientRect();return{x:t.left,y:t.top,width:t.width,height:t.height,paint:getComputedStyle(e).backgroundColor}}export{s as a,i,a as n,o as r,c as t};