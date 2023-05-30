var app=function(){"use strict";function t(){}function e(t){return t()}function n(){return Object.create(null)}function r(t){t.forEach(e)}function i(t){return"function"==typeof t}function o(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function a(t){t.parentNode.removeChild(t)}let l;function s(t){l=t}const c=[],u=[],f=[],p=[],d=Promise.resolve();let m=!1;function h(t){f.push(t)}const b=new Set;let g=0;function $(){const t=l;do{for(;g<c.length;){const t=c[g];g++,s(t),y(t.$$)}for(s(null),c.length=0,g=0;u.length;)u.pop()();for(let t=0;t<f.length;t+=1){const e=f[t];b.has(e)||(b.add(e),e())}f.length=0}while(c.length);for(;p.length;)p.pop()();m=!1,b.clear(),s(t)}function y(t){if(null!==t.fragment){t.update(),r(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(h)}}const w=new Set;function v(t,e){-1===t.$$.dirty[0]&&(c.push(t),m||(m=!0,d.then($)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function x(o,c,u,f,p,d,m,b=[-1]){const g=l;s(o);const y=o.$$={fragment:null,ctx:null,props:d,update:t,not_equal:p,bound:n(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(c.context||(g?g.$$.context:[])),callbacks:n(),dirty:b,skip_bound:!1,root:c.target||g.$$.root};m&&m(y.root);let x=!1;if(y.ctx=u?u(o,c.props||{},((t,e,...n)=>{const r=n.length?n[0]:e;return y.ctx&&p(y.ctx[t],y.ctx[t]=r)&&(!y.skip_bound&&y.bound[t]&&y.bound[t](r),x&&v(o,t)),e})):[],y.update(),x=!0,r(y.before_update),y.fragment=!!f&&f(y.ctx),c.target){if(c.hydrate){const t=function(t){return Array.from(t.childNodes)}(c.target);y.fragment&&y.fragment.l(t),t.forEach(a)}else y.fragment&&y.fragment.c();c.intro&&((_=o.$$.fragment)&&_.i&&(w.delete(_),_.i(k))),function(t,n,o,a){const{fragment:l,on_mount:s,on_destroy:c,after_update:u}=t.$$;l&&l.m(n,o),a||h((()=>{const n=s.map(e).filter(i);c?c.push(...n):r(n),t.$$.on_mount=[]})),u.forEach(h)}(o,c.target,c.anchor,c.customElement),$()}var _,k;s(g)}function _(e){let n;return{c(){var t,e,r,i;t="main",n=document.createElement(t),n.innerHTML='<div class="maxw28em cmb1 p1 mb2"><header class="cmb2"><div><h1><span class="abs invisible">Liberated Interfaces, Gilbert Sinnott, Autr</span> \n\t\t\t\t\t<img style="filter: invert()" class="libinter w100pc" src="/liberatedinterfaces.png"/></h1></div></header> \n\n\t\t<article class="cmb1 plr0-5"><p><span style="font-size:2em;line-height:0.5em;margin-right:0.03em">L</span>iberated Interfaces is a human-computer agency for the experimental research &amp; development of mixed Open Source hardware &amp; software tools by artist / designer <a href="https://autr.tv">Autr</a>.</p> \n\t\t\t<h2>News</h2> \n\n\t\t\t<ul class="cmb0-5"><li>❂ \n\t\t\t\t\t<a href="https://re-publica.com/de/session/video-feedback-still-life">Video Feedback Still Life at re:publica 2023</a></li> \n\t\t\t\t<li>❂ \n\t\t\t\t\t<a href="https://betterfactory.eu/better-factory-partners-and-mentors-visit-the-new-round-of-kte-teams-across-europe/">StarIOT, Better Factory KTE 2023</a></li></ul> \n\n\t\t\t<h2>Timeline</h2> \n\n\t\t\t<ul class="cmb0-2"><li>⦿  R&amp;D (2018 ~)</li> \n\t\t\t\t<li>⦿  MX1 Video Synth (2023/24)</li> \n\t\t\t\t<li>⦿  PC Kintsugi (2024)</li> \n\t\t\t\t<li>⦿  Open Source Toolkits (2024)</li></ul> \n\n\t\t\t<h2>Mailing List</h2> \n\n\t\t\t<form action="https://tinyletter.com/libinter" method="post" class="flex row-flex-start-center wrap cmb0-5" target="popupwindow" onsubmit="window.open(&#39;https://tinyletter.com/libinter&#39;, &#39;popupwindow&#39;, &#39;scrollbars=yes,width=800,height=600&#39;);return true"><input type="text" placeholder="Enter your email address" class="minw12em mr0-5" name="email" id="tlemail"/> \n\t\t\t\t<input type="hidden" value="1" name="embed"/> \n\t\t\t\t<label class="hyperlink pointer rel flex row-center-center pointer"><a>Subscribe</a> \n\t\t\t\t\t<input class="fill invisible pointer" type="submit" value="Subscribe"/></label></form> \n\n\t\t\t<h2>Contact</h2> \n\n        \n\t\t\t<ul class="cmb0-5"><li><a href="mailto:libinter.dev@gmail.com">libinter.dev@gmail.com</a></li></ul> \n\n\t\t\t<h2>Links</h2> \n\t\t\t<ul><li>@\n\t\t\t\t\t<a href="https://instagram.com/liberatedinterfaces">liberatedinterfaces</a></li></ul></article></div>',e=n,r="class",null==(i="sassis flex row-center-center bright minh100vh f2 serif")?e.removeAttribute(r):e.getAttribute(r)!==i&&e.setAttribute(r,i)},m(t,e){!function(t,e,n){t.insertBefore(e,n||null)}(t,n,e)},p:t,i:t,o:t,d(t){t&&a(n)}}}return new class extends class{$destroy(){!function(t,e){const n=t.$$;null!==n.fragment&&(r(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}{constructor(t){super(),x(this,t,null,_,o,{})}}({target:document.body,props:{name:"world"}})}();
//# sourceMappingURL=bundle.js.map
