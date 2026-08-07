import{t as e}from"./jsx-runtime-By8HlURe.js";var t={consumption:`#8b8d90`,household:`#1685ff`,heatPump:`#e82285`,hotWater:`#ee4c91`,evCharging:`#5cbd68`,generationMuted:`#f4c675`,generation:`#f2a900`,exported:`#f8d99a`},n={generation:3509,consumption:17847},r=[`jan`,`feb`,`mar`,`apr`,`may`,`jun`,`jul`,`aug`,`sep`,`oct`,`nov`,`dec`],i=[[`jan`,`January`,`Jan`,783,637,468,688,188,180,8],[`feb`,`February`,`Feb`,672,531,400,563,219,217,2],[`mar`,`March`,`Mar`,668,466,397,614,262,257,5],[`apr`,`April`,`Apr`,570,342,352,524,375,322,53],[`may`,`May`,`May`,376,191,232,352,427,219,208],[`jun`,`June`,`Jun`,241,122,150,225,482,169,313],[`jul`,`July`,`Jul`,246,91,155,233,367,150,217],[`aug`,`August`,`Aug`,241,96,155,233,354,138,216],[`sep`,`September`,`Sep`,242,135,147,223,304,142,162],[`oct`,`October`,`Oct`,362,239,218,335,258,185,73],[`nov`,`November`,`Nov`,577,449,345,524,174,171,3],[`dec`,`December`,`Dec`,607,495,365,570,100,99,1]];function a(e=0){return i.map(([t,n,r,i,a,o,s,c,l,u])=>{let d=t===`dec`&&e%2==1?s+18:s,f=i,p=f,m=p+a,h=m,g=h+o,_=g,v=_+d;return{id:t,month:n,monthShort:r,household:i,heatPump:a,hotWater:o,evCharging:d,consumption:v,generation:c,usedOnSite:l,exported:u,householdStart:0,householdEnd:f,heatPumpStart:p,heatPumpEnd:m,hotWaterStart:h,hotWaterEnd:g,evChargingStart:_,evChargingEnd:v}})}function o(e){return r.some(t=>t===e)}function s(e){if(e.view!==void 0&&e.view!==`main`)return null;let[t,n]=e.anchor.split(`:`);return t===`month`&&o(n)?n:null}function c(e){return[{id:`household`,label:`Household`,value:e.household,start:e.householdStart,end:e.householdEnd,color:t.household},{id:`heat-pump`,label:`Heat pump`,value:e.heatPump,start:e.heatPumpStart,end:e.heatPumpEnd,color:t.heatPump},{id:`hot-water`,label:`Hot water`,value:e.hotWater,start:e.hotWaterStart,end:e.hotWaterEnd,color:t.hotWater},{id:`ev-charging`,label:`EV charging`,value:e.evCharging,start:e.evChargingStart,end:e.evChargingEnd,color:t.evCharging}]}function l(e,t){let n=e[0]?.datum;return n?{title:n.month,rows:[{label:`Consumption`,value:u(n.consumption)},{label:`Generation`,value:u(n.generation)}]}:{rows:[]}}function u(e){return`${e.toLocaleString(`en-US`)} kWh`}function d(e){return`${Math.round(e*100)}%`}var f=e();function p({month:e,pinned:n,dismiss:r,consumptionChart:i}){let a=e.usedOnSite/e.consumption,o=e.usedOnSite/e.generation,s=e.exported/e.generation;return(0,f.jsxs)(`div`,{className:`energy-tooltip`,"data-expanded":String(n),children:[(0,f.jsxs)(`div`,{className:`energy-tooltip__summary`,children:[(0,f.jsx)(`div`,{className:`ts-chart-tooltip__title`,children:e.month}),n?(0,f.jsx)(`button`,{className:`energy-tooltip__close`,type:`button`,"data-energy-tooltip-close":!0,"aria-label":`Close energy details`,onPointerDown:e=>e.stopPropagation(),onClick:r,children:(0,f.jsx)(m,{expanded:!0})}):(0,f.jsx)(`span`,{className:`energy-tooltip__toggle`,"aria-hidden":`true`,children:(0,f.jsx)(m,{expanded:!1})})]}),(0,f.jsx)(h,{label:`Consumption`,value:u(e.consumption)}),(0,f.jsx)(`div`,{className:`energy-tooltip__compact-generation`,children:(0,f.jsx)(`div`,{className:`energy-tooltip__compact-generation-inner`,children:(0,f.jsx)(h,{label:`Generation`,value:u(e.generation)})})}),(0,f.jsx)(`div`,{className:`energy-tooltip__reveal`,"aria-hidden":!n,children:(0,f.jsx)(`div`,{className:`energy-tooltip__reveal-inner`,children:(0,f.jsxs)(`div`,{className:`energy-tooltip__details`,children:[(0,f.jsxs)(`section`,{"aria-label":`Consumption mix`,children:[(0,f.jsx)(`div`,{className:`energy-tooltip__mini-chart`,children:i}),c(e).map(e=>(0,f.jsx)(g,{color:e.color,label:e.label,value:u(e.value)},e.id))]}),(0,f.jsxs)(`section`,{"aria-label":`Generation use`,children:[(0,f.jsx)(h,{className:`energy-tooltip__generation-heading`,label:`Generation`,summary:!1,value:u(e.generation)}),(0,f.jsxs)(`div`,{className:`energy-tooltip__generation-bar`,"aria-hidden":`true`,children:[(0,f.jsx)(`span`,{style:{flex:e.usedOnSite,background:t.generation}}),(0,f.jsx)(`span`,{style:{flex:e.exported,background:t.exported}})]}),(0,f.jsx)(g,{color:t.generation,label:`Used on site`,value:d(o)}),(0,f.jsx)(g,{color:t.exported,label:`Exported`,value:d(s)})]})]})})}),(0,f.jsxs)(`p`,{className:`energy-tooltip__footer`,children:[`Solar covered `,d(a),` of this month's consumption, with the rest coming from the grid.`]})]})}function m({expanded:e}){return(0,f.jsx)(`svg`,{className:`energy-tooltip__chevron`,viewBox:`0 0 12 12`,"aria-hidden":`true`,children:(0,f.jsx)(`path`,{d:e?`M3 2.5 6 5 9 2.5M3 9.5 6 7 9 9.5`:`m3 4 3-3 3 3M3 8l3 3 3-3`})})}function h({className:e,label:t,summary:n=!0,value:r}){return(0,f.jsxs)(`div`,{className:[`energy-tooltip__metric-row`,n?`ts-chart-tooltip__row`:null,e].filter(Boolean).join(` `),children:[(0,f.jsx)(`span`,{children:t}),(0,f.jsx)(`span`,{children:r})]})}function g({color:e,label:t,value:n}){return(0,f.jsxs)(`div`,{className:`energy-tooltip__detail-row`,"data-energy-detail-row":!0,children:[(0,f.jsx)(`span`,{className:`energy-tooltip__swatch`,style:{background:e},"aria-hidden":`true`}),(0,f.jsx)(`span`,{children:t}),(0,f.jsx)(`span`,{children:n})]})}var _=`
  .energy-overview-card .ts-chart:focus,
  .energy-overview-card [role='listbox']:focus {
    outline: none;
  }

  .ts-chart-tooltip.energy-tooltip-surface,
  .energy-reference-tooltip {
    box-sizing: border-box;
    width: 292px;
    max-width: calc(100vw - 24px) !important;
    padding: 0 !important;
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 0.1) !important;
    border-radius: 10px !important;
    background: #2b2b2e !important;
    color: #f4f4f5 !important;
    box-shadow: 0 14px 34px rgb(0 0 0 / 0.3) !important;
    font: 500 12px/1.35 system-ui, sans-serif !important;
  }

  .energy-reference-tooltip {
    position: absolute;
    z-index: 2;
  }

  .energy-tooltip {
    padding: 12px;
  }

  .energy-tooltip__summary {
    position: relative;
    min-width: 0;
    padding-right: 28px;
  }

  .energy-tooltip .ts-chart-tooltip__title {
    display: flex;
    align-items: center;
    min-height: 18px;
    margin: 0 0 6px;
    color: #f4f4f5;
    font-size: 12px;
    font-weight: 650;
  }

  .energy-tooltip__metric-row {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    column-gap: 12px !important;
    font-variant-numeric: tabular-nums;
  }

  .energy-tooltip__metric-row > :last-child {
    color: #fafafa;
    font-weight: 620;
    text-align: right;
    white-space: nowrap;
  }

  .energy-tooltip__detail-row {
    display: grid;
    grid-template-columns: 3px minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 8px;
    min-height: 17px;
    color: #d4d4d8;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .energy-tooltip__detail-row > :last-child {
    color: #f4f4f5;
    font-weight: 600;
    text-align: right;
    white-space: nowrap;
  }

  .energy-tooltip__swatch {
    display: block;
    width: 3px;
    height: 10px;
    border-radius: 999px;
  }

  .energy-tooltip__close,
  .energy-tooltip__toggle {
    position: absolute;
    top: -9px;
    right: -9px;
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    color: #a1a1aa;
  }

  .energy-tooltip__close {
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #a1a1aa;
    cursor: pointer;
    pointer-events: auto;
  }

  .energy-tooltip__chevron {
    width: 12px;
    height: 12px;
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.5;
  }

  .energy-tooltip__close:hover,
  .energy-tooltip__close:focus-visible {
    background: rgb(255 255 255 / 0.08);
    color: #fafafa;
    outline: none;
  }

  .energy-tooltip__close:focus-visible {
    box-shadow: inset 0 0 0 2px #f5b942;
  }

  .energy-tooltip__reveal {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition:
      grid-template-rows 260ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 160ms ease;
  }

  .energy-tooltip[data-expanded='true'] .energy-tooltip__reveal {
    grid-template-rows: 1fr;
    opacity: 1;
  }

  .energy-tooltip__reveal-inner {
    min-height: 0;
    overflow: hidden;
  }

  .energy-tooltip__details {
    display: grid;
    gap: 12px;
    margin-top: 5px;
    transform: translateY(-4px);
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .energy-tooltip[data-expanded='true'] .energy-tooltip__details {
    transform: translateY(0);
  }

  .energy-tooltip__details section {
    display: grid;
    gap: 5px;
  }

  .energy-tooltip__compact-generation {
    display: grid;
    grid-template-rows: 1fr;
    opacity: 1;
    transition:
      grid-template-rows 260ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 120ms ease;
  }

  .energy-tooltip[data-expanded='true'] .energy-tooltip__compact-generation {
    grid-template-rows: 0fr;
    opacity: 0;
  }

  .energy-tooltip__compact-generation-inner {
    min-height: 0;
    overflow: hidden;
  }

  .energy-tooltip__generation-heading {
    margin-top: 2px;
    padding-top: 8px;
    border-top: 1px solid rgb(255 255 255 / 0.09);
  }

  .energy-tooltip__mini-chart,
  .energy-tooltip__generation-bar {
    width: 100%;
    height: 8px;
    overflow: hidden;
    border-radius: 3px;
    background: rgb(255 255 255 / 0.08);
  }

  .energy-tooltip__mini-chart svg {
    display: block;
    width: 100%;
    height: 8px;
  }

  .energy-tooltip__generation-bar {
    display: flex;
  }

  .energy-tooltip__footer {
    margin: 10px -12px -12px;
    padding: 10px 12px 11px;
    border-top: 1px solid rgb(255 255 255 / 0.07);
    background: #222225;
    color: #a8a8af;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
  }

  @media (prefers-reduced-motion: reduce) {
    .energy-tooltip__compact-generation,
    .energy-tooltip__reveal,
    .energy-tooltip__details {
      transition: none;
    }
  }
`;export{t as a,u as c,s as d,n as i,d as l,_ as n,a as o,c as r,l as s,p as t,o as u};