(() => {
  const ISSUER = 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM';
  const ASSET_CODE = 'USDM';
  const ASSET_ID = `${ASSET_CODE}-${ISSUER}`;
  const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
  const API = 'https://api.stellar.expert/explorer/public';
  const HORIZON = 'https://horizon.stellar.org';
  const THEME_KEY = 'usdm-theme';
  const fallback = {supply:'259,976',trustlines:'2,552 / 360',payments:'80,692',trades:'1,141,184',rating:'7.3',first:'2023-05-20 16:31 UTC',price:'0.97 USD',updated:'StellarExpert snapshot: 2026-06-06'};
  const uiText = {
    ru: {copied:'Скопировано',copyFailed:'Не удалось скопировать',liveOk:'Данные обновлены из публичных API StellarExpert / Horizon',liveFail:'Публичные API не ответили; показана сохранённая сводка и прямые ссылки на источники',checking:'Проверяю Stellar-аккаунт…',enterAddress:'Введите публичный Stellar-адрес, начинающийся с G.',invalidAddress:'Это не похоже на публичный Stellar-адрес.',notFound:'Аккаунт не найден в Horizon или ещё не активирован.',trustlineYes:b=>`Trustline к USDM открыт. Баланс: ${b} USDM.`,trustlineNo:'На этом аккаунте нет trustline к USDM. Откройте его через проверенную страницу с QR.',networkError:'Не удалось получить данные из Horizon. Используйте прямую ссылку на StellarExpert или повторите позже.'},
    en: {copied:'Copied',copyFailed:'Could not copy',liveOk:'Data updated from public StellarExpert / Horizon APIs',liveFail:'Public APIs did not respond; showing saved summary and direct source links',checking:'Checking the Stellar account…',enterAddress:'Enter a public Stellar address starting with G.',invalidAddress:'This does not look like a public Stellar address.',notFound:'Account not found in Horizon or not activated yet.',trustlineYes:b=>`USDM trustline is open. Balance: ${b} USDM.`,trustlineNo:'This account has no USDM trustline. Open it through the verified QR page.',networkError:'Could not fetch Horizon data. Use the direct StellarExpert link or try again later.'},
    es: {copied:'Copiado',copyFailed:'No se pudo copiar',liveOk:'Datos actualizados desde las API públicas de StellarExpert / Horizon',liveFail:'Las API públicas no respondieron; se muestra el resumen guardado y enlaces directos a fuentes',checking:'Comprobando la cuenta Stellar…',enterAddress:'Introduce una dirección pública de Stellar que empiece por G.',invalidAddress:'Esto no parece una dirección pública de Stellar.',notFound:'Cuenta no encontrada en Horizon o todavía no activada.',trustlineYes:b=>`La trustline de USDM está abierta. Saldo: ${b} USDM.`,trustlineNo:'Esta cuenta no tiene trustline de USDM. Ábrela desde la página verificada con QR.',networkError:'No se pudieron obtener datos de Horizon. Usa el enlace directo a StellarExpert o inténtalo más tarde.'}
  };
  const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function systemTheme(){return typeof matchMedia==='function' && matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  function currentTheme(){const saved=localStorage.getItem(THEME_KEY); return ['light','dark'].includes(saved)?saved:systemTheme();}
  function applyTheme(theme,{persist=false}={}){const value=theme==='dark'?'dark':'light'; const root=document.documentElement; if(root?.dataset) root.dataset.theme=value; else root?.setAttribute?.('data-theme',value); if(root?.style) root.style.colorScheme=value; if(persist) localStorage.setItem(THEME_KEY,value); $$('[data-theme-toggle]').forEach(btn=>{btn.setAttribute('aria-pressed',String(value==='dark')); const icon=$('[data-theme-toggle-icon]',btn); if(icon) icon.textContent=value==='dark'?'☀':'☾';}); return value;}
  function currentLang(){const h=(location.hash||'').replace('#','').toLowerCase(); if(['ru','en','es'].includes(h)) return h; const saved=localStorage.getItem('usdm-lang'); if(['ru','en','es'].includes(saved)) return saved; const nav=(navigator.language||'ru').toLowerCase(); return nav.startsWith('es')?'es':nav.startsWith('en')?'en':'ru';}
  function setLang(lang){localStorage.setItem('usdm-lang',lang); document.documentElement.lang=lang; $$('.page').forEach(p=>p.classList.toggle('active',p.dataset.lang===lang)); $$('.lang-switch button').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang)); if(location.hash!==`#${lang}`) history.replaceState(null,'',`#${lang}`);}
  function toast(text){const el=$('#toast'); if(!el) return; el.textContent=text; el.classList.add('show'); clearTimeout(toast._timer); toast._timer=setTimeout(()=>el.classList.remove('show'),1800);}
  function formatNumber(n,decimals=0){const num=Number(n); if(!Number.isFinite(num)) return '—'; return new Intl.NumberFormat(undefined,{maximumFractionDigits:decimals}).format(num);}
  function formatTokenAmount(raw,decimals=0){const num=Number(raw); if(!Number.isFinite(num)) return '—'; const scaled=num>1000000000?num/1e7:num; return formatNumber(scaled,decimals);}
  function formatUtcDate(date){return date.toISOString().replace('T',' ').slice(0,16)+' UTC';}
  function formatTrustlines(trustlines){
    if(Array.isArray(trustlines)){
      const total=Number(trustlines[0]);
      const funded=Number(trustlines[2] ?? trustlines[1]);
      if(Number.isFinite(total) && Number.isFinite(funded)) return `${formatNumber(total)} / ${formatNumber(funded)}`;
    }
    if(trustlines && typeof trustlines==='object'){
      const total=Number(trustlines.total);
      const funded=Number(trustlines.funded);
      if(Number.isFinite(total) && Number.isFinite(funded)) return `${formatNumber(total)} / ${formatNumber(funded)}`;
    }
    const total=Number(trustlines);
    return Number.isFinite(total)?formatNumber(total):'—';
  }
  function buildMetrics({record,supply,horizonAsset,rating,orderBook,now=new Date()}){
    const metrics={...fallback};
    const liveSupply=Number(supply);
    const horizonRecord=horizonAsset?._embedded?.records?.[0];
    if(Number.isFinite(liveSupply)) metrics.supply=formatNumber(liveSupply,2);
    else if(horizonRecord?.amount) metrics.supply=formatNumber(Number(horizonRecord.amount),2);
    else if(record?.supply) metrics.supply=formatTokenAmount(record.supply,2);
    if(record?.trustlines) metrics.trustlines=formatTrustlines(record.trustlines);
    if(record?.payments!==undefined) metrics.payments=formatNumber(record.payments);
    if(record?.trades!==undefined) metrics.trades=formatNumber(record.trades);
    const ratingAverage=rating?.rating?.average ?? record?.rating?.average;
    if(ratingAverage!==undefined) metrics.rating=Number(ratingAverage).toFixed(1);
    if(record?.created) metrics.first=formatUtcDate(new Date(record.created*1000));
    const bestAsk=orderBook?.asks?.[0]?.price;
    if(bestAsk) metrics.price=`${Number(bestAsk).toFixed(4)} USDC`;
    metrics.updated=formatUtcDate(now);
    return metrics;
  }
  function setAllMetric(key,value,hint){$$(`[data-metric="${key}"]`).forEach(el=>{el.textContent=value||'—'}); if(hint) $$(`[data-hint="${key}"]`).forEach(el=>{el.textContent=hint});}
  function applyMetrics(metrics){Object.entries(metrics).forEach(([k,v])=>setAllMetric(k,v)); setAllMetric('trustlines',metrics.trustlines,'total / funded');}
  function setStatus(ok,msg){$$('.api-status').forEach(el=>{const dot=$('.status-dot',el); const text=$('.status-text',el); if(dot){dot.classList.toggle('ok',ok===true); dot.classList.toggle('bad',ok===false);} if(text) text.textContent=msg;});}
  async function fetchJson(url){const res=await fetch(url,{headers:{Accept:'application/json'}}); if(!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json();}
  async function updateMetrics(){
    const lang=currentLang();
    const results=await Promise.allSettled([
        fetchJson(`${API}/asset?search=${encodeURIComponent(ISSUER)}&limit=200`),
        fetch(`${API}/asset/${ASSET_ID}/supply`).then(r=>r.ok?r.text():Promise.reject(new Error('supply'))),
        fetchJson(`${HORIZON}/assets?asset_code=${ASSET_CODE}&asset_issuer=${ISSUER}`),
        fetchJson(`${API}/asset/${ASSET_ID}/rating`),
        fetchJson(`${HORIZON}/order_book?selling_asset_type=credit_alphanum4&selling_asset_code=${ASSET_CODE}&selling_asset_issuer=${ISSUER}&buying_asset_type=credit_alphanum4&buying_asset_code=USDC&buying_asset_issuer=${USDC_ISSUER}&limit=1`)
      ]);
    const [assetList,supplyText,horizonAsset,rating,orderBook]=results;
    try{
      let record=null;
      if(assetList.status==='fulfilled'){const records=assetList.value?._embedded?.records||[]; record=records.find(item=>String(item.asset||'').startsWith(`${ASSET_CODE}-${ISSUER}`));}
      applyMetrics(buildMetrics({
        record,
        supply: supplyText.status==='fulfilled'?Number(supplyText.value.trim()):undefined,
        horizonAsset: horizonAsset.status==='fulfilled'?horizonAsset.value:undefined,
        rating: rating.status==='fulfilled'?rating.value:undefined,
        orderBook: orderBook.status==='fulfilled'?orderBook.value:undefined,
      }));
      setStatus(results.some(result=>result.status==='fulfilled'),uiText[lang].liveOk);
    } catch(e){ setStatus(false,uiText[lang].liveFail); }
  }
  function shortAccount(account){return `${account.slice(0,8)}…${account.slice(-6)}`;}
  function formatMonth(month){const [year,monthNumber]=month.split('-'); return `${year}-${monthNumber}`;}
  function renderMonitoringRows(table,rows){table.innerHTML=rows.length?rows.map(row=>`<tr><td>${formatMonth(row.month)}</td><td>${formatNumber(row.payments)}</td><td>${formatNumber(row.amount,4)}</td><td>${formatNumber(row.annualPercentOf1000,2)}%</td></tr>`).join(''):`<tr><td colspan="4">${table.dataset.empty||'No data'}</td></tr>`;}
  function renderMonitoring(data){
    $$('[data-monitoring]').forEach(section=>{
      const account=$('[data-monitoring-account]',section);
      const balance=$('[data-monitoring-balance]',section);
      const total=$('[data-monitoring-total]',section);
      const period=$('[data-monitoring-period]',section);
      const table=$('[data-monitoring-table]',section);
      const toggle=$('[data-monitoring-toggle]',section);
      if(account){account.href=data.accountUrl; account.textContent=shortAccount(data.account);}
      if(balance) balance.textContent=data.currentBalance===null?'—':`${formatNumber(data.currentBalance,2)} USDM`;
      if(total) total.textContent=`${formatNumber(data.totals.amount,2)} USDM`;
      if(period){const first=data.monthly[0]?.month; const last=data.monthly[data.monthly.length-1]?.month; period.textContent=first&&last?`${formatMonth(first)} — ${formatMonth(last)}`:'—';}
      if(table){
        const rows=[...data.monthly].reverse();
        let expanded=false;
        const paint=()=>renderMonitoringRows(table,expanded?rows:rows.slice(0,10));
        paint();
        if(toggle){
          toggle.hidden=rows.length<=10;
          const showAll=toggle.dataset?.showAll||'Show all';
          const showLatest=toggle.dataset?.showLatest||'Show latest 10';
          toggle.textContent=showAll;
          toggle.addEventListener('click',()=>{
            expanded=!expanded;
            paint();
            toggle.textContent=expanded?showLatest:showAll;
          });
        }
      }
    });
  }
  function shortPool(id){return `${id.slice(0,4)}…${id.slice(-4)}`;}
  function poolUrl(id){return `https://stellar.expert/explorer/public/liquidity-pool/${id}`;}
  function renderPoolRows(table,rows){
    table.innerHTML=rows.length?rows.map(pool=>{
      const reserves=(pool.reserves||[]).map(reserve=>`${formatNumber(reserve.amount,7)} ${reserve.code}`).join('<br>');
      return `<tr><td><a class="mono" href="${poolUrl(pool.id)}" target="_blank" rel="noopener noreferrer">${shortPool(pool.id)}</a></td><td>${pool.pair}</td><td class="mono">${reserves}</td><td>${formatNumber(pool.usdmReserve,2)} USDM</td><td>$${formatNumber(pool.estimatedUsd,2)}</td><td>${formatNumber(pool.shares,2)}</td></tr>`;
    }).join(''):`<tr><td colspan="6">${table.dataset.empty||'No pools'}</td></tr>`;
  }
  function renderPools(data){
    const pools=[...(data.pools||[])].sort((a,b)=>Number(b.estimatedUsd)-Number(a.estimatedUsd));
    const total=pools.reduce((sum,pool)=>sum+Number(pool.estimatedUsd||0),0);
    $$('[data-pools]').forEach(section=>{
      const count=$('[data-pools-count]',section);
      const totalEl=$('[data-pools-total]',section);
      const updated=$('[data-pools-updated]',section);
      const table=$('[data-pools-table]',section);
      if(count) count.textContent=formatNumber(pools.length);
      if(totalEl) totalEl.textContent=`$${formatNumber(total,2)}`;
      if(updated) updated.textContent=data.generatedAt?formatUtcDate(new Date(data.generatedAt)):'—';
      if(table) renderPoolRows(table,pools);
    });
  }
  globalThis.__USDM_APP__={formatTrustlines,buildMetrics,renderMonitoring,renderPools,applyTheme};
  async function loadMonitoring(){
    try{renderMonitoring(await fetchJson('data/monitoring-account.json'));}
    catch(e){$$('[data-monitoring-table]').forEach(table=>{table.innerHTML=`<tr><td colspan="4">${table.dataset.empty||'No data'}</td></tr>`;});}
  }
  async function loadPools(){
    try{renderPools(await fetchJson('data/usdm-pools.json'));}
    catch(e){$$('[data-pools-table]').forEach(table=>{table.innerHTML=`<tr><td colspan="6">${table.dataset.empty||'No pools'}</td></tr>`;});}
  }
  async function checkTrustline(form){const lang=currentLang(),t=uiText[lang],input=$('input',form),result=$('.result',form.parentElement),address=input.value.trim().toUpperCase(); result.className='result show'; if(!address){result.textContent=t.enterAddress; return;} if(!/^G[A-Z2-7]{55}$/.test(address)){result.textContent=t.invalidAddress; result.classList.add('bad'); return;} result.textContent=t.checking; try{const account=await fetchJson(`${HORIZON}/accounts/${address}`); const balance=(account.balances||[]).find(b=>b.asset_code===ASSET_CODE && b.asset_issuer===ISSUER); if(balance){result.textContent=t.trustlineYes(balance.balance); result.className='result show good';} else {result.textContent=t.trustlineNo; result.className='result show bad';}} catch(err){result.textContent=String(err.message).includes('404')?t.notFound:t.networkError; result.className='result show bad';}}
  document.addEventListener('DOMContentLoaded',()=>{applyTheme(currentTheme()); setLang(currentLang()); updateMetrics(); loadMonitoring(); loadPools(); $$('[data-theme-toggle]').forEach(btn=>btn.addEventListener('click',()=>applyTheme(currentTheme()==='dark'?'light':'dark',{persist:true}))); $$('.lang-switch button').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang))); window.addEventListener('hashchange',()=>setLang(currentLang())); $$('[data-scroll]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault(); const section=$(`.page.active [data-section="${link.dataset.scroll}"]`); if(section) section.scrollIntoView({behavior:'smooth',block:'start'});})); $$('[data-copy]').forEach(btn=>btn.addEventListener('click',async()=>{const lang=currentLang(); try{await navigator.clipboard.writeText(btn.dataset.copy); toast(uiText[lang].copied);}catch(_){toast(uiText[lang].copyFailed);}})); $$('[data-refresh]').forEach(btn=>btn.addEventListener('click',updateMetrics)); $$('.trustline-form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault(); checkTrustline(form);}));});
})();
