import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{Rr as t,Ur as n,Wr as r,_r as i,gn as a,kr as o,pr as s,wr as c,yn as l}from"./client-CQxwd6_g.js";var u=e(r()),d,f,p,m,h,g,_;function v(){return v=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)({}).hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},v.apply(null,arguments)}function y(e,t){return t||=e.slice(0),Object.freeze(Object.defineProperties(e,{raw:{value:Object.freeze(t)}}))}var b=(e,t)=>c(t-e)*Math.min(Math.abs(t-e),359.999),x=e=>{var t=e.cx,n=e.cy,r=e.radius,i=e.angle,o=e.sign,s=e.isExternal,c=e.cornerRadius,u=e.cornerIsExternal,d=c*(s?1:-1)+r,f=Math.asin(c/d)/a,p=u?i:i+o*f,m=l(t,n,d,p),h=l(t,n,r,p),g=u?i-o*f:i;return{center:m,circleTangency:h,lineTangency:l(t,n,d*Math.cos(f*a),g),theta:f}},S=e=>{var t=e.cx,n=e.cy,r=e.innerRadius,i=e.outerRadius,a=e.startAngle,s=e.endAngle,c=b(a,s),u=a+c,m=l(t,n,i,a),h=l(t,n,i,u),g=o(d||=y([`M `,`,`,`
    A `,`,`,`,0,
    `,`,`,`,
    `,`,`,`
  `]),m.x,m.y,i,i,+(Math.abs(c)>180),+(a>u),h.x,h.y);if(r>0){var _=l(t,n,r,a),v=l(t,n,r,u);g+=o(f||=y([`L `,`,`,`
            A `,`,`,`,0,
            `,`,`,`,
            `,`,`,` Z`]),v.x,v.y,r,r,+(Math.abs(c)>180),+(a<=u),_.x,_.y)}else g+=o(p||=y([`L `,`,`,` Z`]),t,n);return g},C=e=>{var t=e.cx,n=e.cy,r=e.innerRadius,i=e.outerRadius,a=e.cornerRadius,s=e.forceCornerRadius,l=e.cornerIsExternal,u=e.startAngle,d=e.endAngle,f=c(d-u),p=x({cx:t,cy:n,radius:i,angle:u,sign:f,cornerRadius:a,cornerIsExternal:l}),v=p.circleTangency,b=p.lineTangency,C=p.theta,w=x({cx:t,cy:n,radius:i,angle:d,sign:-f,cornerRadius:a,cornerIsExternal:l}),T=w.circleTangency,E=w.lineTangency,D=w.theta,O=l?Math.abs(u-d):Math.abs(u-d)-C-D;if(O<0)return s?o(m||=y([`M `,`,`,`
        a`,`,`,`,0,0,1,`,`,0
        a`,`,`,`,0,0,1,`,`,0
      `]),b.x,b.y,a,a,a*2,a,a,-a*2):S({cx:t,cy:n,innerRadius:r,outerRadius:i,startAngle:u,endAngle:d});var k=o(h||=y([`M `,`,`,`
    A`,`,`,`,0,0,`,`,`,`,`,`
    A`,`,`,`,0,`,`,`,`,`,`,`,`
    A`,`,`,`,0,0,`,`,`,`,`,`
  `]),b.x,b.y,a,a,+(f<0),v.x,v.y,i,i,+(O>180),+(f<0),T.x,T.y,a,a,+(f<0),E.x,E.y);if(r>0){var A=x({cx:t,cy:n,radius:r,angle:u,sign:f,isExternal:!0,cornerRadius:a,cornerIsExternal:l}),j=A.circleTangency,M=A.lineTangency,N=A.theta,P=x({cx:t,cy:n,radius:r,angle:d,sign:-f,isExternal:!0,cornerRadius:a,cornerIsExternal:l}),F=P.circleTangency,I=P.lineTangency,L=P.theta,R=l?Math.abs(u-d):Math.abs(u-d)-N-L;if(R<0&&a===0)return`${k}L${t},${n}Z`;k+=o(g||=y([`L`,`,`,`
      A`,`,`,`,0,0,`,`,`,`,`,`
      A`,`,`,`,0,`,`,`,`,`,`,`,`
      A`,`,`,`,0,0,`,`,`,`,`,`Z`]),I.x,I.y,a,a,+(f<0),F.x,F.y,r,r,+(R>180),+(f>0),j.x,j.y,a,a,+(f<0),M.x,M.y)}else k+=o(_||=y([`L`,`,`,`Z`]),t,n);return k},w={cx:0,cy:0,innerRadius:0,outerRadius:0,startAngle:0,endAngle:0,cornerRadius:0,forceCornerRadius:!1,cornerIsExternal:!1},T=e=>{var r=s(e,w),a=r.cx,o=r.cy,c=r.innerRadius,l=r.outerRadius,d=r.cornerRadius,f=r.forceCornerRadius,p=r.cornerIsExternal,m=r.startAngle,h=r.endAngle,g=r.className;if(l<c||m===h)return null;var _=n(`recharts-sector`,g),y=l-c,b=i(d,y,0,!0),x=b>0&&Math.abs(m-h)<360?C({cx:a,cy:o,innerRadius:c,outerRadius:l,cornerRadius:Math.min(b,y/2),forceCornerRadius:f,cornerIsExternal:p,startAngle:m,endAngle:h}):S({cx:a,cy:o,innerRadius:c,outerRadius:l,startAngle:m,endAngle:h});return u.createElement(`path`,v({},t(r),{className:_,d:x}))};export{T as t};