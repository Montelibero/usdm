(() => {
  const ISSUER = 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM';
  const ASSET_CODE = 'USDM';
  const ASSET_ID = `${ASSET_CODE}-${ISSUER}`;
  const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
  const EURMTL_ISSUER = 'GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V';
  const API = 'https://api.stellar.expert/explorer/public';
  const HORIZON = 'https://horizon.stellar.org';
  const THEME_KEY = 'usdm-theme';
  const POOLS_CACHE_KEY = 'usdm-pools-cache';
  const POOL_CACHE_TTL_MS = 60*60*1000;
  const SWAP_AMOUNTS = [1,10,100,1000];
  const POOL_IDS = ['3f82380ac929dfb12081d0e04ec099823e296d83c34e473fd2f7aa59111e8728','49a48dd6aa8b247a553a07acd2957efa85fc0233a40af5bb75cf5d27624d42d9','a9a81f0eea80cfd8e5026e2c777f7a851822750aa544ae2ae7145d1cbfd08f0e','ed01a8172b515a12ebe6f969e82a9f481d6e30bb379b3b3d4b41e0ef2a3d2ae0','a71b735d4243dacf8749061a035c6f3d8db7eaa83f513f4c54acc24d0ae0496b','37bfcae59fc8c2df3ce8fd1b0fe9742f024aea6a12486961678d31d7a81d7b32','af9aa1db45df267bd6207fc273a9cb04eb1d480cbc8fd191bec58ff09793afbd','cc8e282251f0f027c12ac5b599b2155e3381df1961ddde815c88abf2ff9e86da','6731f57d13b48a9c7cbb65b55c9646b7265265491eb602960407b398c2c2a84b','857e0bf39c6e8aa775df78af7c861b205d7a43701093e129b7fa91b44325f3c7','cb94e169a644b1eedc7c7c2af8194632f6be9d4c2a8042678512b9bf8459eb2c','a9d2e09fce4db02024f867a71640eea49eb2c86d1b0fb089efcddd4b99e0d381','3d83ee426407a574cee6448af33e1334292e4f45519b61405a615af405ace826'];
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
  function parsePoolAsset(asset){if(asset==='native') return {code:'XLM',issuer:''}; const [code,issuer='']=String(asset).split(':'); return {code,issuer};}
  function buildPoolsSnapshot({horizonPools,generatedAt=new Date().toISOString(),thresholdUsd=1000}){
    const pools=horizonPools.map(pool=>{
      const reserves=pool.reserves.map(reserve=>({...parsePoolAsset(reserve.asset),amount:Number(reserve.amount)}));
      const usdm=reserves.find(reserve=>reserve.code==='USDM' && reserve.issuer===ISSUER);
      const usdmReserve=usdm?.amount||0;
      return {id:pool.id,pair:reserves.map(reserve=>reserve.code).join('/'),reserves:reserves.map(({code,amount})=>({code,amount})),usdmReserve,estimatedUsd:usdmReserve*2,shares:Number(pool.total_shares)};
    }).filter(pool=>pool.estimatedUsd>=thresholdUsd).sort((a,b)=>b.estimatedUsd-a.estimatedUsd);
    return {generatedAt,thresholdUsd,pools};
  }
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
  function assetParams(params,asset,prefix){params.set(`${prefix}_asset_type`,asset.type); if(asset.type!=='native'){params.set(`${prefix}_asset_code`,asset.code); params.set(`${prefix}_asset_issuer`,asset.issuer);}}
  function assetIdentifier(asset){return asset.type==='native'?'native':`${asset.code}:${asset.issuer}`;}
  const usdmAsset={code:'USDM',issuer:ISSUER,type:'credit_alphanum4'};
  const eurmtlAsset={code:'EURMTL',issuer:EURMTL_ISSUER,type:'credit_alphanum12'};
  async function fetchStrictSendQuote(sourceAsset,destinationAsset,amount){
    const params=new URLSearchParams();
    assetParams(params,sourceAsset,'source');
    params.set('source_amount',String(amount));
    params.set('destination_assets',assetIdentifier(destinationAsset));
    params.set('limit','1');
    const data=await fetchJson(`${HORIZON}/paths/strict-send?${params.toString()}`);
    const record=data?._embedded?.records?.[0];
    return record?Number(record.destination_amount):null;
  }
  function buildSwapSnapshot({orderBook,sellQuotes,buyQuotes,generatedAt=new Date().toISOString()}){
    const sellRows=sellQuotes.map(quote=>({amount:quote.amount,received:quote.received,price:quote.received===null?null:quote.received/quote.amount}));
    const buyRows=buyQuotes.map(quote=>({amount:quote.amount,received:quote.received,price:quote.received===null?null:quote.amount/quote.received}));
    const firstSell=sellRows.find(row=>row.price!==null);
    const firstBuy=buyRows.find(row=>row.price!==null);
    const bestBid=Number(orderBook?.bids?.[0]?.price);
    const bestAsk=Number(orderBook?.asks?.[0]?.price);
    const avgSwapPrice=firstSell&&firstBuy?(firstSell.price+firstBuy.price)/2:firstSell?.price??firstBuy?.price??null;
    const avgBookPrice=Number.isFinite(bestBid)&&Number.isFinite(bestAsk)?(bestBid+bestAsk)/2:Number.isFinite(bestBid)?bestBid:Number.isFinite(bestAsk)?bestAsk:null;
    return {generatedAt,base:'USDM',counter:'EURMTL',avgSwapPrice,avgBookPrice,sellRows,buyRows};
  }
  function renderSwapRows(table,rows){
    table.innerHTML=rows.length?rows.map(row=>`<tr><td>${formatNumber(row.amount,7)}</td><td>${row.received===null?'—':formatNumber(row.received,7)}</td><td>${row.price===null?'—':formatNumber(row.price,7)}</td></tr>`).join(''):`<tr><td colspan="3">${table.dataset.empty||'No quotes'}</td></tr>`;
  }
  function renderSwap(snapshot){
    $$('[data-swap]').forEach(section=>{
      const avg=$('[data-swap-avg]',section);
      const book=$('[data-swap-book]',section);
      const updated=$('[data-swap-updated]',section);
      const sellTable=$('[data-swap-sell-table]',section);
      const buyTable=$('[data-swap-buy-table]',section);
      if(avg) avg.textContent=snapshot.avgSwapPrice===null?'—':formatNumber(snapshot.avgSwapPrice,7);
      if(book) book.textContent=snapshot.avgBookPrice===null?'—':formatNumber(snapshot.avgBookPrice,7);
      if(updated) updated.textContent=snapshot.generatedAt?formatUtcDate(new Date(snapshot.generatedAt)):'—';
      if(sellTable) renderSwapRows(sellTable,snapshot.sellRows||[]);
      if(buyTable) renderSwapRows(buyTable,snapshot.buyRows||[]);
    });
  }
  globalThis.__USDM_APP__={formatTrustlines,buildMetrics,renderMonitoring,renderPools,buildPoolsSnapshot,buildSwapSnapshot,renderSwap,applyTheme};
  async function loadMonitoring(){
    try{renderMonitoring(await fetchJson('data/monitoring-account.json'));}
    catch(e){$$('[data-monitoring-table]').forEach(table=>{table.innerHTML=`<tr><td colspan="4">${table.dataset.empty||'No data'}</td></tr>`;});}
  }
  async function loadPools(){
    try{
      const fallbackSnapshot=await fetchJson('data/usdm-pools.json');
      renderPools(fallbackSnapshot);
      const cached=JSON.parse(localStorage.getItem(POOLS_CACHE_KEY)||'null');
      if(cached?.snapshot && Date.now()-Number(cached.cachedAt)<POOL_CACHE_TTL_MS){renderPools(cached.snapshot); return;}
      const results=await Promise.allSettled(POOL_IDS.map(id=>fetchJson(`${HORIZON}/liquidity_pools/${id}`)));
      const horizonPools=results.filter(result=>result.status==='fulfilled').map(result=>result.value);
      if(horizonPools.length){
        const liveSnapshot=buildPoolsSnapshot({horizonPools});
        renderPools(liveSnapshot);
        localStorage.setItem(POOLS_CACHE_KEY,JSON.stringify({cachedAt:Date.now(),snapshot:liveSnapshot}));
      }
    }
    catch(e){$$('[data-pools-table]').forEach(table=>{table.innerHTML=`<tr><td colspan="6">${table.dataset.empty||'No pools'}</td></tr>`;});}
  }
  async function loadSwap(){
    try{
      const orderParams=new URLSearchParams();
      assetParams(orderParams,usdmAsset,'selling');
      assetParams(orderParams,eurmtlAsset,'buying');
      orderParams.set('limit','20');
      const orderBook=await fetchJson(`${HORIZON}/order_book?${orderParams.toString()}`);
      const sellQuotes=await Promise.all(SWAP_AMOUNTS.map(async amount=>({amount,received:await fetchStrictSendQuote(usdmAsset,eurmtlAsset,amount)})));
      const buyQuotes=await Promise.all(SWAP_AMOUNTS.map(async amount=>({amount,received:await fetchStrictSendQuote(eurmtlAsset,usdmAsset,amount)})));
      renderSwap(buildSwapSnapshot({orderBook,sellQuotes,buyQuotes}));
    }catch(e){$$('[data-swap-sell-table],[data-swap-buy-table]').forEach(table=>{table.innerHTML=`<tr><td colspan="3">${table.dataset.empty||'No quotes'}</td></tr>`;});}
  }
  async function checkTrustline(form){const lang=currentLang(),t=uiText[lang],input=$('input',form),result=$('.result',form.parentElement),address=input.value.trim().toUpperCase(); result.className='result show'; if(!address){result.textContent=t.enterAddress; return;} if(!/^G[A-Z2-7]{55}$/.test(address)){result.textContent=t.invalidAddress; result.classList.add('bad'); return;} result.textContent=t.checking; try{const account=await fetchJson(`${HORIZON}/accounts/${address}`); const balance=(account.balances||[]).find(b=>b.asset_code===ASSET_CODE && b.asset_issuer===ISSUER); if(balance){result.textContent=t.trustlineYes(balance.balance); result.className='result show good';} else {result.textContent=t.trustlineNo; result.className='result show bad';}} catch(err){result.textContent=String(err.message).includes('404')?t.notFound:t.networkError; result.className='result show bad';}}
  document.addEventListener('DOMContentLoaded',()=>{applyTheme(currentTheme()); setLang(currentLang()); updateMetrics(); loadMonitoring(); loadPools(); loadSwap(); $$('[data-theme-toggle]').forEach(btn=>btn.addEventListener('click',()=>applyTheme(currentTheme()==='dark'?'light':'dark',{persist:true}))); $$('.lang-switch button').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang))); window.addEventListener('hashchange',()=>setLang(currentLang())); $$('[data-scroll]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault(); const section=$(`.page.active [data-section="${link.dataset.scroll}"]`); if(section) section.scrollIntoView({behavior:'smooth',block:'start'});})); $$('[data-copy]').forEach(btn=>btn.addEventListener('click',async()=>{const lang=currentLang(); try{await navigator.clipboard.writeText(btn.dataset.copy); toast(uiText[lang].copied);}catch(_){toast(uiText[lang].copyFailed);}})); $$('[data-refresh]').forEach(btn=>btn.addEventListener('click',updateMetrics)); $$('.trustline-form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault(); checkTrustline(form);}));});
})();
