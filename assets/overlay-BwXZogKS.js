import{r as e}from"./day-D80NwD9k.js";function t(e){return e===`release`?`#f97316`:`#2563eb`}var n=[`Product`,`Design`,`Marketing`,`Engineering`],r=[s(2025,0,1),s(2025,2,1)],i=s(2025,1,3),a=s(2025,1,12);function o(e=0,t=a){let n=e%2==1;return[{id:`discovery`,label:`Discovery`,lane:`Product`,start:s(2025,0,4),end:s(2025,0,13)},{id:`design`,label:`Design system`,lane:`Design`,start:s(2025,0,10),end:s(2025,0,n?26:24)},{id:`campaign`,label:`Campaign`,lane:`Marketing`,start:s(2025,0,n?19:20),end:s(2025,1,7)},{id:`release`,label:`Release window`,lane:`Engineering`,start:i,end:t}]}function s(e,t,n){return new Date(Date.UTC(e,t,n))}var c=864e5;function l(e){return e.toISOString().slice(0,10)}function u(e){let t=e.startsWith(`date:`)?e.slice(5):``;if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return null;let n=new Date(`${t}T00:00:00.000Z`);return!Number.isFinite(n.getTime())||l(n)!==t||n<r[0]||n>r[1]?null:n}function d(t){let n=i.getTime()+c,a=Math.min(r[1].getTime(),Math.max(n,e.round(t).getTime()));return new Date(a)}function f(e,t){return(t.getTime()-e.getTime())/c}function p(e,t,n){let r=e.ownerDocument,i=r.createElement(`style`);i.textContent=`
    .ts-conformance-event-range {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      color-scheme: light dark;
      cursor: ew-resize;
      margin: 0;
      padding: 0;
    }
    .ts-conformance-event-range::-webkit-slider-runnable-track {
      height: 2px;
      background: transparent;
    }
    .ts-conformance-event-range::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      margin-top: -9px;
      border: 0;
      background: transparent;
    }
    .ts-conformance-event-range::-moz-range-track {
      height: 2px;
      background: transparent;
    }
    .ts-conformance-event-range::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border: 0;
      background: transparent;
    }
    .ts-conformance-event-range:focus-visible {
      outline: none;
    }
    .ts-conformance-event-range:focus-visible
      + .ts-conformance-event-handle {
      outline: 3px solid var(--ts-chart-1, #2563eb);
      outline-offset: 3px;
    }
    .ts-conformance-event-date:focus-visible {
      outline: 3px solid var(--ts-chart-1, #2563eb);
      outline-offset: 2px;
    }
    .ts-conformance-event-summary,
    .ts-conformance-event-date {
      border: 1px solid color-mix(in srgb, currentColor 32%, transparent);
      background: color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas);
      color: inherit;
    }
    .ts-conformance-event-date {
      color-scheme: light dark;
    }
    .ts-conformance-event-date[aria-invalid="true"] {
      border-color: #dc2626;
    }
  `;let a=r.createElement(`div`);a.style.position=`absolute`,a.style.inset=`0`,a.style.zIndex=`3`,a.style.pointerEvents=`none`;let o=r.createElement(`div`);o.className=`ts-conformance-event-track`,o.style.position=`absolute`,o.style.height=`4px`,o.style.borderRadius=`999px`,o.style.background=`color-mix(in srgb, var(--ts-chart-2, #f97316) 58%, transparent)`;let s=r.createElement(`input`);s.className=`ts-conformance-event-range`,s.type=`range`,s.step=`1`,s.setAttribute(`aria-label`,`Release end handle`),s.style.position=`absolute`,s.style.height=`44px`,s.style.pointerEvents=`auto`;let c=r.createElement(`div`);c.className=`ts-conformance-event-handle`,c.style.position=`absolute`,c.style.boxSizing=`border-box`,c.style.width=`20px`,c.style.height=`20px`,c.style.border=`2px solid Canvas`,c.style.borderRadius=`999px`,c.style.background=`var(--ts-chart-2, #f97316)`,c.style.boxShadow=`0 1px 4px rgb(15 23 42 / 0.35)`;let l=r.createElement(`div`);l.className=`ts-conformance-event-toolbar`,l.setAttribute(`role`,`group`),l.setAttribute(`aria-label`,`Release event editor`),l.style.position=`absolute`,l.style.top=`4px`,l.style.left=`12px`,l.style.right=`12px`,l.style.display=`flex`,l.style.flexWrap=`wrap`,l.style.alignItems=`flex-end`,l.style.justifyContent=`flex-end`,l.style.gap=`8px`,l.style.color=`inherit`,l.style.pointerEvents=`none`;let u=r.createElement(`output`);u.className=`ts-conformance-event-summary`,u.setAttribute(`role`,`status`),u.setAttribute(`aria-live`,`polite`),u.setAttribute(`aria-atomic`,`true`),u.style.boxSizing=`border-box`,u.style.flex=`1 1 120px`,u.style.minWidth=`120px`,u.style.minHeight=`44px`,u.style.padding=`8px 10px`,u.style.borderRadius=`10px`,u.style.display=`flex`,u.style.alignItems=`center`,u.style.font=`600 12px/1.25 system-ui, sans-serif`;let d=r.createElement(`label`);d.style.boxSizing=`border-box`,d.style.flex=`0 1 140px`,d.style.minWidth=`128px`,d.style.display=`grid`,d.style.gap=`2px`,d.style.color=`inherit`,d.style.font=`600 11px/1.15 system-ui, sans-serif`,d.style.pointerEvents=`auto`,d.append(`Release end`);let f=r.createElement(`input`);f.className=`ts-conformance-event-date`,f.type=`date`,f.required=!0,f.setAttribute(`aria-label`,`Release end date input`),f.setAttribute(`aria-invalid`,`false`),f.style.boxSizing=`border-box`,f.style.width=`100%`,f.style.height=`44px`,f.style.padding=`6px 8px`,f.style.borderRadius=`8px`,f.style.font=`600 12px/1 system-ui, sans-serif`,d.append(f);let p=r.createElement(`span`);p.className=`ts-conformance-event-validation`,p.setAttribute(`aria-live`,`polite`),p.hidden=!0,p.style.flex=`1 0 100%`,p.style.color=`#dc2626`,p.style.font=`600 11px/1.2 system-ui, sans-serif`;let h=r.createElement(`ul`);h.className=`ts-conformance-event-identities`,h.style.position=`absolute`,h.style.width=`1px`,h.style.height=`1px`,h.style.padding=`0`,h.style.margin=`-1px`,h.style.overflow=`hidden`,h.style.clipPath=`inset(50%)`,h.style.whiteSpace=`nowrap`;let g=e=>{let t=e?``:`Choose a release end date within the range.`;f.setAttribute(`aria-invalid`,String(!e)),f.setCustomValidity(t),p.hidden=e,p.textContent=t},_=()=>{g(!0),t(Number(s.value))},v=()=>{g(n(f.value))};return s.addEventListener(`input`,_),f.addEventListener(`input`,v),l.append(u,d,p),a.append(o,s,c,l,h),e.append(i,a),{range:s,dateInput:f,handleGeometry(){return m(c)},trackGeometry(){return m(o)},paint(e,t){o.style.left=`${e.minX}px`,o.style.top=`${e.y-2}px`,o.style.width=`${Math.max(0,e.maxX-e.minX)}px`,s.min=String(t.min),s.max=String(t.max),s.value=String(t.value),s.setAttribute(`aria-valuetext`,t.valueText),s.style.left=`${e.minX-10}px`,s.style.top=`${e.y-22}px`,s.style.width=`${Math.max(0,e.maxX-e.minX+20)}px`,c.style.left=`${e.x-10}px`,c.style.top=`${e.y-10}px`,f.min=t.minDate,f.max=t.maxDate,(r.activeElement!==f||f.getAttribute(`aria-invalid`)!==`true`)&&(f.value=t.date,g(!0)),u.value=t.summaryText,u.textContent=t.summaryText,h.replaceChildren(...t.eventDescriptions.map(e=>{let t=r.createElement(`li`);return t.textContent=e,t}))},destroy(){s.removeEventListener(`input`,_),f.removeEventListener(`input`,v),i.remove(),a.remove()}}}function m(e){let t=e.getBoundingClientRect();return{x:t.left,y:t.top,width:t.width,height:t.height,paint:getComputedStyle(e).backgroundColor}}export{f as a,o as c,t as d,l as i,n as l,d as n,r as o,u as r,i as s,p as t,a as u};