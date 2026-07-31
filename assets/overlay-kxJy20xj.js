function e(e){let t=Date.UTC(2018,0,2),n=Date.UTC(2018,0,11);return e.filter(e=>{let r=e.Date.getTime();return r>=t&&r<=n})}function t(e){let t=e[0],n=e.at(-1);if(!t||!n)throw Error(`Playback requires observed AAPL rows.`);return[t.Date,n.Date]}function n(e){return e.toISOString().slice(0,10)}function r(e,t){let r=t.startsWith(`frame:`)?t.slice(6):``,i=e.findIndex(e=>n(e.Date)===r);return i<0?null:i}function i(e,t,n){let r=e.ownerDocument,i=r.createElement(`style`);i.textContent=`
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
  `;let o=r.createElement(`div`);o.style.position=`absolute`,o.style.inset=`0`,o.style.zIndex=`3`,o.style.pointerEvents=`none`;let s=r.createElement(`div`);s.className=`ts-conformance-playback-track`,s.dataset.conformancePlaybackRule=`track`,s.style.position=`absolute`,s.style.height=`4px`,s.style.borderRadius=`999px`,s.style.background=`color-mix(in srgb, currentColor 52%, transparent)`;let c=r.createElement(`div`);c.className=`ts-conformance-playback-playhead`,c.dataset.conformancePlaybackRule=`playhead`,c.style.position=`absolute`,c.style.width=`2px`,c.style.borderRadius=`999px`,c.style.background=`var(--ts-chart-2, #f97316)`;let l=r.createElement(`input`);l.className=`ts-conformance-playback-range`,l.type=`range`,l.min=`0`,l.step=`1`,l.setAttribute(`aria-label`,`Timeline frame`),l.style.position=`absolute`,l.style.height=`44px`,l.style.pointerEvents=`auto`;let u=r.createElement(`div`);u.className=`ts-conformance-playback-handle`,u.dataset.conformancePlaybackHandle=``,u.style.position=`absolute`,u.style.boxSizing=`border-box`,u.style.width=`20px`,u.style.height=`20px`,u.style.border=`2px solid Canvas`,u.style.borderRadius=`999px`,u.style.background=`var(--ts-chart-2, #f97316)`,u.style.boxShadow=`0 1px 4px rgb(15 23 42 / 0.35)`;let d=r.createElement(`div`);d.className=`ts-conformance-playback-toolbar`,d.setAttribute(`role`,`group`),d.setAttribute(`aria-label`,`Timeline playback controls`),d.style.position=`absolute`,d.style.top=`4px`,d.style.left=`56px`,d.style.right=`20px`,d.style.display=`flex`,d.style.alignItems=`center`,d.style.justifyContent=`flex-end`,d.style.gap=`8px`,d.style.pointerEvents=`none`;let f=r.createElement(`div`);f.className=`ts-conformance-playback-current`,f.style.boxSizing=`border-box`,f.style.minWidth=`0`,f.style.minHeight=`32px`,f.style.padding=`7px 9px`,f.style.borderRadius=`999px`,f.style.overflow=`hidden`,f.style.textOverflow=`ellipsis`,f.style.whiteSpace=`nowrap`,f.style.font=`600 12px/1.2 system-ui, sans-serif`;let p=r.createElement(`button`);p.className=`ts-conformance-playback-button`,p.type=`button`,p.setAttribute(`aria-label`,`Play timeline`),p.title=`Play timeline`,p.style.flex=`0 0 auto`,p.style.width=`44px`,p.style.height=`44px`,p.style.borderRadius=`10px`,p.style.cursor=`pointer`,p.style.font=`700 16px/1 system-ui, sans-serif`,p.style.pointerEvents=`auto`;let m=r.createElement(`output`);m.className=`ts-conformance-playback-announcement`,m.setAttribute(`role`,`status`),m.setAttribute(`aria-live`,`polite`),m.setAttribute(`aria-atomic`,`true`),m.style.position=`absolute`,m.style.width=`1px`,m.style.height=`1px`,m.style.padding=`0`,m.style.margin=`-1px`,m.style.overflow=`hidden`,m.style.clipPath=`inset(50%)`,m.style.whiteSpace=`nowrap`;let h=()=>{t(Number(l.value))};return l.addEventListener(`input`,h),p.addEventListener(`click`,n),d.append(f,p),o.append(s,c,l,u,d,m),e.append(i,o),{range:l,playButton:p,announce(e){m.value=e,m.textContent=e},ruleGeometry(){return[a(s),a(c)]},paint(e,t){s.style.left=`${e.left}px`,s.style.top=`${e.trackY-2}px`,s.style.width=`${Math.max(0,e.right-e.left)}px`,c.style.left=`${e.playheadX-1}px`,c.style.top=`${e.top}px`,c.style.height=`${Math.max(0,e.trackY-e.top)}px`,l.max=String(t.max),l.value=String(t.index),l.setAttribute(`aria-valuetext`,t.valueText),l.style.left=`${e.left-10}px`,l.style.top=`${e.trackY-22}px`,l.style.width=`${Math.max(0,e.right-e.left+20)}px`,u.style.left=`${e.playheadX-10}px`,u.style.top=`${e.trackY-10}px`,f.textContent=t.valueText,p.textContent=t.playing?`❚❚`:`▶`,p.setAttribute(`aria-pressed`,String(t.playing)),p.setAttribute(`aria-label`,t.playing?`Pause timeline`:`Play timeline`),p.title=t.playing?`Pause timeline`:`Play timeline`},destroy(){l.removeEventListener(`input`,h),p.removeEventListener(`click`,n),i.remove(),o.remove()}}}function a(e){let t=e.getBoundingClientRect();return{x:t.left,y:t.top,width:t.width,height:t.height,paint:getComputedStyle(e).backgroundColor}}export{e as a,r as i,n,t as r,i as t};