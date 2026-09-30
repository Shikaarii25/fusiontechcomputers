(() => {
  'use strict';
  const icon = v => String(v || '💻');
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function serviceCard(s, idx, wa) {
    const image = s.image_url ? `<img src="${esc(s.image_url)}" alt="${esc(s.name)}" loading="lazy">` : `<span class="service-icon">${esc(icon(s.icon))}</span>`;
    const link = window.FT?.public?.settings?.whatsapp_url || '#';
    const message = encodeURIComponent(`Hello Fusiontech, I need ${s.name}`);
    const href = wa ? wa.replace(/\?.*$/,'') + `?text=${message}` : `${link}&text=${message}`;
    return `<article class="service service-card magnetic-card scroll-in" style="--card-index:${idx};--reveal-delay:${Math.min(idx*55,440)}ms"><div class="service-visual">${image}<span class="service-scan" aria-hidden="true"></span><span class="service-depth" aria-hidden="true"></span><span class="service-glow" aria-hidden="true"></span></div><span class="service-no">${String(idx+1).padStart(2,'0')}</span><div class="service-copy"><span class="service-kicker">TECH / SERVICE</span><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><a class="service-link magnetic" href="${esc(href)}" target="_blank" rel="noopener">Ask about this service <span>↗</span></a></div></article>`;
  }
  function productCard(p, idx, wa) {
    const image = p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="product-art">FT</div>`;
    const message = encodeURIComponent(`I am interested in ${p.name}`);
    const base = wa || '#'; const href = base.replace(/\?.*$/,'') + `?text=${message}`;
    return `<article class="ad-card magnetic-card scroll-in" style="--ad-index:${idx};--reveal-delay:${Math.min(idx*60,480)}ms"><div class="ad-art">${image}<span class="ad-glass-tag">${esc(p.category||'PRODUCT')}</span></div><div class="ad-copy"><div class="ad-topline"><span class="ad-label">FUSIONTECH LISTING</span>${p.price?`<strong>${esc(p.price)}</strong>`:''}</div><h3>${esc(p.name)}</h3><p>${esc(p.description||'Contact Fusiontech for current availability and details.')}</p><a class="ad-cta magnetic" href="${esc(href)}" target="_blank" rel="noopener">Enquire on WhatsApp <span>↗</span></a></div></article>`;
  }
  const render = data => {
    const wa = data?.settings?.whatsapp_url || '#';
    if (window.FT_PAGE==='services') document.getElementById('servicesGrid').innerHTML=(data.services||[]).length ? data.services.map((s,i)=>serviceCard(s,i,wa)).join('') : `<article class="service service-card"><div class="service-visual"><span class="service-icon">FT</span></div><div class="service-copy"><span class="service-kicker">TECH / SERVICE</span><h3>Services are being updated.</h3><p>Please contact Fusiontech directly for current services.</p></div></article>`;
    if (window.FT_PAGE==='products') document.getElementById('productsGrid').innerHTML=(data.products||[]).length ? data.products.map((p,i)=>productCard(p,i,wa)).join('') : `<article class="ad-card ad-empty"><div class="ad-art"><span class="product-art">FT</span></div><div class="ad-copy"><div class="ad-topline"><span class="ad-label">CATALOGUE</span></div><h3>New listings will appear here.</h3><p>Products published by Fusiontech will appear here.</p><a class="btn primary magnetic" href="${esc(wa)}" target="_blank" rel="noopener">Ask what's in stock ↗</a></div></article>`;
    document.querySelectorAll('.magnetic,.magnetic-card').forEach(el=>el.classList.add('cloud-enhanced'));
  };
  document.addEventListener('fusiontech:data',e=>render(e.detail));
  if(window.FT?.public)render(window.FT.public);
  else setTimeout(()=>window.FT?.public&&render(window.FT.public),300);
})();
