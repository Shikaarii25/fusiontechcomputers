(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const THEME_KEY = 'fusiontech-theme';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  function applyTheme(theme) {
    const light = theme === 'light';
    root.classList.toggle('light', light);
    root.style.colorScheme = light ? 'light' : 'dark';
    const toggle = document.getElementById('themeToggle');
    const thumb = toggle?.querySelector('.theme-thumb');
    if (toggle) toggle.setAttribute('aria-pressed', light ? 'true' : 'false');
    if (thumb) thumb.textContent = light ? '☀' : '☾';
  }
  try {
    const stored = localStorage.getItem(THEME_KEY);
    const systemLight = matchMedia?.('(prefers-color-scheme: light)').matches;
    applyTheme(stored || (systemLight ? 'light' : 'dark'));
  } catch { applyTheme('dark'); }

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const next = root.classList.contains('light') ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  });

  const menuBtn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');
  if (menuBtn && nav) {
    const closeNav = () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false'); menuBtn.setAttribute('aria-label','Open navigation'); };
    menuBtn.addEventListener('click', () => { const open = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded',open?'true':'false'); menuBtn.setAttribute('aria-label',open?'Close navigation':'Open navigation'); });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeNav));
    document.addEventListener('click',e=>{if(!nav.contains(e.target)&&!menuBtn.contains(e.target))closeNav();});
  }

  const adminTrigger = document.getElementById('adminTrigger');
  if (adminTrigger) {
    let clicks=0, timer=0;
    const trigger=()=>{clicks++;clearTimeout(timer);if(clicks>=10){adminTrigger.classList.add('admin-unlocked');navigateWithTransition('admin.html');return;}timer=setTimeout(()=>clicks=0,4500);};
    adminTrigger.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();trigger();});
    adminTrigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();trigger();}});
  }

  const transition = document.getElementById('pageTransition');
  function navigateWithTransition(href) {
    if (!transition || reduced) { window.location.href=href; return; }
    body.classList.add('is-leaving'); transition.classList.add('is-leaving'); window.setTimeout(()=>window.location.href=href,390);
  }
  document.querySelectorAll('a.page-link').forEach(link=>link.addEventListener('click',e=>{
    if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const href=link.getAttribute('href');
    if(!href||href.startsWith('#')||href.startsWith('http')||href.startsWith('mailto:')||href.startsWith('tel:'))return;
    e.preventDefault(); navigateWithTransition(href);
  }));

  window.FT = window.FT || {};
  let csrfToken = null;
  async function getCsrf() {
    if (csrfToken) return csrfToken;
    const r = await fetch('/api/csrf',{credentials:'same-origin'});
    const data = await r.json();
    if(!r.ok||!data.ok) throw new Error(data.error||'Unable to initialize security token.');
    csrfToken=data.csrf; return csrfToken;
  }
  async function api(path, options={}) {
    const opts={...options,credentials:'same-origin',headers:{Accept:'application/json',...(options.headers||{})}};
    const method=(opts.method||'GET').toUpperCase();
    if(method!=='GET'&&method!=='HEAD') { opts.headers['Content-Type']='application/json'; opts.headers['X-CSRF-Token']=await getCsrf(); }
    const r=await fetch(path,opts);
    let data={}; try{data=await r.json();}catch{}
    if(!r.ok||data.ok===false) throw new Error(data.error||`Request failed (${r.status})`);
    return data;
  }
  window.FT.api=api; window.FT.getCsrf=getCsrf; window.FT.navigate=navigateWithTransition;

  function applySite(settings) {
    if(!settings) return;
    document.querySelectorAll('[data-setting]').forEach(el=>{
      const key=el.dataset.setting; if(settings[key]===undefined) return;
      el.textContent=settings[key];
    });
    document.querySelectorAll('[data-phone-href]').forEach(el=>el.setAttribute('href',settings.phone_href||`tel:${settings.phone||''}`));
    document.querySelectorAll('[data-wa-link]').forEach(el=>el.setAttribute('href',settings.whatsapp_url||'#'));
    document.querySelectorAll('[data-email-link]').forEach(el=>{const email=settings.email||'';if(email){el.hidden=false;el.setAttribute('href',`mailto:${email}`);const span=el.querySelector('[data-setting="email"]');if(span)span.textContent=email;}else el.hidden=true;});
    const img=document.getElementById('heroImage'); if(img&&settings.hero_image_url) img.src=settings.hero_image_url;
    const title=settings.business_name||'Fusiontech Computers'; document.title=document.title.replace(/Fusiontech Computers/g,title);
  }
  window.FT.applySite=applySite;

  async function loadPublic() {
    try { const data=await api('/api/public',{method:'GET'}); applySite(data.settings); window.FT.public=data; document.dispatchEvent(new CustomEvent('fusiontech:data',{detail:data})); }
    catch(err) { console.warn('Fusiontech cloud API unavailable:',err.message); }
  }
  if (location.pathname.endsWith('/') || /\/index\.html?$/.test(location.pathname) || window.FT_PAGE) loadPublic();

  const form=document.getElementById('enquiryForm');
  form?.addEventListener('submit',async e=>{
    e.preventDefault(); const status=document.getElementById('formStatus'); const submit=form.querySelector('button[type="submit"]');
    status.textContent='Sending…'; submit.disabled=true;
    try { const fd=new FormData(form); await api('/api/enquiries',{method:'POST',body:JSON.stringify(Object.fromEntries(fd.entries()))}); form.reset(); status.textContent='✓ Enquiry received. Fusiontech will contact you.'; }
    catch(err){ status.textContent=err.message; }
    finally{ submit.disabled=false; }
  });

  const revealTargets=document.querySelectorAll('.reveal,.scroll-reveal');
  if('IntersectionObserver' in window&&revealTargets.length){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.querySelectorAll('.service-card,.ad-card,.process-card,.proof-items>div,.faq details').forEach((child,i)=>{child.style.setProperty('--reveal-delay',`${Math.min(i*55,360)}ms`);child.classList.add('scroll-in');});entry.target.classList.add('in');observer.unobserve(entry.target);}),{threshold:.07,rootMargin:'0px 0px -60px 0px'});revealTargets.forEach(el=>observer.observe(el));}else revealTargets.forEach(el=>el.classList.add('in'));

  let scrollY=window.scrollY||0, raf=0, ticking=false;
  const heroArt=document.querySelector('.tech-art'), pageOrbit=document.querySelector('.page-orbit,.listing-orbit'), bands=document.querySelectorAll('.parallax-band');
  const updateParallax=()=>{ticking=false;if(!reduced&&heroArt)heroArt.style.transform=`translate3d(0,${Math.min(60,scrollY*.07)}px,0)`;if(!reduced&&pageOrbit)pageOrbit.style.transform=`translate3d(0,${Math.min(24,scrollY*.035)}px,0)`;if(!reduced)bands.forEach(b=>{const speed=parseFloat(b.dataset.speed||'0');const rect=b.getBoundingClientRect();const mid=rect.top+rect.height/2-innerHeight/2;b.style.setProperty('--parallax-y',`${mid*speed}px`);});};
  if(!reduced)window.addEventListener('scroll',()=>{scrollY=scrollY||0;scrollY=window.scrollY||0;if(!ticking){ticking=true;raf=requestAnimationFrame(updateParallax);}},{passive:true}); updateParallax();

  if(!coarse&&!reduced){
    document.querySelectorAll('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const dx=(e.clientX-(r.left+r.width/2))/r.width,dy=(e.clientY-(r.top+r.height/2))/r.height;el.style.transform=`translate3d(${dx*7}px,${dy*5}px,0) translateY(-2px)`;});el.addEventListener('pointerleave',()=>el.style.transform='');});
    document.querySelectorAll('.magnetic-card').forEach(card=>{card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const px=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),py=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));card.style.transform=`perspective(1000px) rotateX(${(0.5-py)*5.2}deg) rotateY(${(px-0.5)*6.4}deg) translateY(-4px)`;card.style.setProperty('--shine-x',`${px*100}%`);card.style.setProperty('--shine-y',`${py*100}%`);});card.addEventListener('pointerleave',()=>card.style.transform='');});
    document.querySelectorAll('.magnetic-float').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const dx=(e.clientX-(r.left+r.width/2))/r.width,dy=(e.clientY-(r.top+r.height/2))/r.height;el.style.setProperty('--mx',`${dx*5}px`);el.style.setProperty('--my',`${dy*5}px`);});el.addEventListener('pointerleave',()=>{el.style.setProperty('--mx','0px');el.style.setProperty('--my','0px');});});
  }

  const canvas=document.getElementById('starsCanvas');
  if(canvas&&!reduced){const ctx=canvas.getContext('2d',{alpha:true});if(ctx){let w=0,h=0,dpr=1,stars=[],starRaf=0,last=0;const getCount=()=>{if(innerWidth<560)return 150;if(innerWidth<900)return 300;const area=innerWidth*innerHeight;return area>2000000?620:480;};const makeStar=initial=>({x:Math.random()*w,y:initial?Math.random()*h:h+Math.random()*40,z:Math.random()*.82+.18,r:Math.random()*1.35+.25,speed:Math.random()*.32+.07,phase:Math.random()*Math.PI*2});const resize=()=>{dpr=Math.min(devicePixelRatio||1,1.6);w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;ctx.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:getCount()},()=>makeStar(true));};const draw=time=>{const dt=Math.min(32,time-(last||time));last=time;ctx.clearRect(0,0,w,h);const accent=getComputedStyle(root).getPropertyValue('--accent-cyan').trim()||'#6be6ff';stars.forEach(s=>{s.y-=s.speed*(.55+s.z)*(dt/16.7);s.phase+=.012*(.7+s.z)*(dt/16.7);if(s.y<-8)Object.assign(s,makeStar(false));ctx.globalAlpha=.10+(.33*(.5+Math.sin(s.phase)*.5)*s.z);ctx.fillStyle=accent;ctx.beginPath();ctx.arc(s.x,s.y,s.r*(.55+s.z),0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;starRaf=requestAnimationFrame(draw);};let resizeTimer=0;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,120);},{passive:true});resize();starRaf=requestAnimationFrame(draw);addEventListener('pagehide',()=>cancelAnimationFrame(starRaf),{once:true});}}
  document.getElementById('year')?.replaceChildren(String(new Date().getFullYear()));
})();
