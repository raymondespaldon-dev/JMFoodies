// Custom dropdown (listbox) enhancement for native <select> elements.
// STUB — the select worker replaces this file; keep the exported signatures.
// Contract: .orca/specs/ui-contract.md §3

export function enhanceSelects(root = document) {
  const nodes = root.matches?.('select') ? [root] : [...(root.querySelectorAll?.('select:not([data-cs-ready])') || [])];
  nodes.forEach(enhance);
  return root;
}

export function refreshSelect(nativeSelect) {
  if (!nativeSelect?.__csRefresh) return nativeSelect;
  nativeSelect.__csRefresh();
  return nativeSelect;
}

function enhance(native) {
  if (!native || native.dataset.csReady === '1') return;
  native.dataset.csReady = '1';
  const wrap = document.createElement('div'); wrap.className = 'cs';
  native.classList.add('cs-native');
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'cs-trigger'; trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
  const value = document.createElement('span'); value.className = 'cs-value';
  const caret = document.createElement('span'); caret.className = 'cs-caret'; caret.setAttribute('aria-hidden', 'true'); caret.textContent = '⌄';
  trigger.append(value, caret);
  const menu = document.createElement('div'); menu.className = 'cs-menu'; menu.setAttribute('role', 'listbox'); menu.hidden = true;
  native.parentNode.insertBefore(wrap, native); wrap.append(native, trigger, menu);
  let active = native.selectedIndex;
  const options = () => [...native.options];
  const sync = () => { const opts=options(); value.textContent=opts[native.selectedIndex]?.textContent || '—'; trigger.disabled=native.disabled; active=Math.max(0,native.selectedIndex); menu.replaceChildren(...opts.map((opt,i)=>{const row=document.createElement('div');row.className='cs-option';row.textContent=opt.textContent;row.dataset.index=i;row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===native.selectedIndex));row.setAttribute('aria-disabled',String(opt.disabled));row.tabIndex=-1;row.addEventListener('mouseenter',()=>setActive(i));row.addEventListener('click',()=>{if(!opt.disabled) choose(i);});return row;})); setActive(active); wrap.classList.toggle('is-invalid', native.required && !native.value); };
  const setActive = i => { const rows=[...menu.children]; active=Math.max(0,Math.min(i,rows.length-1)); rows.forEach((row,n)=>row.classList.toggle('is-active',n===active)); rows[active]?.scrollIntoView({block:'nearest'}); };
  const close = focus => { menu.hidden=true; trigger.setAttribute('aria-expanded','false'); if(focus) trigger.focus(); };
  const open = () => { if(native.disabled)return; menu.hidden=false; trigger.setAttribute('aria-expanded','true'); setActive(native.selectedIndex); };
  const choose = i => { const opt=options()[i]; if(!opt || opt.disabled)return; native.selectedIndex=i; native.dispatchEvent(new Event('input',{bubbles:true})); native.dispatchEvent(new Event('change',{bubbles:true})); sync(); close(true); };
  trigger.addEventListener('click',()=>menu.hidden?open():close(false));
  trigger.addEventListener('keydown',e=>{const key=e.key;if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape','Tab'].includes(key))e.preventDefault();if(key==='ArrowDown')menu.hidden?open():setActive(active+1);else if(key==='ArrowUp')menu.hidden?open():setActive(active-1);else if(key==='Home')setActive(0);else if(key==='End')setActive(options().length-1);else if(key==='Enter'||key===' ')menu.hidden?open():choose(active);else if(key==='Escape')close(true);else if(key==='Tab')close(false);else if(key.length===1){const q=key.toLowerCase();const found=options().findIndex(o=>o.textContent.trim().toLowerCase().startsWith(q));if(found>=0)setActive(found);}});
  native.addEventListener('change',sync); native.addEventListener('invalid',e=>{e.preventDefault();wrap.classList.add('is-invalid');trigger.focus();},{capture:true});
  const observer = new MutationObserver(sync); observer.observe(native,{childList:true,subtree:true,attributes:true,attributeFilter:['selected','disabled']});
  native.__csRefresh=sync; sync();
}
