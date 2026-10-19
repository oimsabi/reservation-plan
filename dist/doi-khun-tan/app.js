(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const money = n => Math.round(n).toLocaleString('th-TH');
  const zoneNames = {1:'ลานพักแรม 2',2:'ผากลีบบัว',3:'โค้งมะขามป้อม',4:'เอื้องเงิน',5:'ชมทิวทัศน์',7:'ลานสน ย.2'};
  const colors = {1:'#286b54',2:'#267596',3:'#8060ab',4:'#b77527',5:'#b55477',7:'#286b54'};
  const lookup = id => STAYS.find(h => h.id === id);
  const distance = h => h.distance ? (h.distance[0] === h.distance[1] ? h.distance[0].toFixed(1) : `${h.distance[0].toFixed(1)}–${h.distance[1].toFixed(1)}`) + ' กม.' : 'ยังไม่ยืนยัน';
  const state = { active:'502', filter:'all', selected:new Set(), people:8, nights:1, bag:true, mat:true, pillow:false, ground:true, useNetPrice:false, photo:0 };
  try {
    const saved=JSON.parse(localStorage.getItem('khuntan-trip-v1') || 'null');
    if(saved){state.people=TripMath.integer(saved.people,8,99);state.nights=TripMath.integer(saved.nights,1,30);state.selected=new Set((Array.isArray(saved.selected)?saved.selected:[]).filter(id=>lookup(id)?.type==='house'));['bag','mat','pillow','ground','useNetPrice'].forEach(k=>{if(typeof saved[k]==='boolean')state[k]=saved[k];});}
  } catch { /* Local planning works even when storage is unavailable. */ }
  const persist=()=>{try{localStorage.setItem('khuntan-trip-v1',JSON.stringify({people:state.people,nights:state.nights,selected:[...state.selected],bag:state.bag,mat:state.mat,pillow:state.pillow,ground:state.ground,useNetPrice:state.useNetPrice}));}catch{}};
  let toastTimer, returnFocus=null;
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2300);}
  function visible(h){return state.filter==='all'||(state.filter==='camp'?h.type==='camp':String(h.zone)===state.filter);}
  function renderMarkers(){
    $('markers').innerHTML=STAYS.map(h=>`<button class="marker ${h.type==='camp'?'camp':''} ${state.active===h.id?'active':''} ${state.selected.has(h.id)?'chosen':''}" style="left:${h.x*100}%;top:${h.y*100}%;--marker-color:${colors[h.zone]}" data-open="${h.id}" aria-label="${h.type==='house'?'บ้าน '+h.id+' ':''}${h.name} เปิดรายละเอียด" aria-pressed="${state.active===h.id}" ${visible(h)?'':'hidden'}>${h.type==='house'?h.id:h.id==='tent-y2'?'△ ย.2':'△ ลาน 2'}</button>`).join('');
  }
  function renderList(){
    const houses=STAYS.filter(visible);
    $('list-count').textContent=`${houses.length} รายการ · แตะเพื่อดูบนแผนที่`;
    $('stay-list-grid').innerHTML=houses.map(h=>`<button class="stay-list-item ${state.active===h.id?'active':''}" style="--marker-color:${colors[h.zone]}" data-open="${h.id}" data-center="true" aria-label="${h.type==='house'?'บ้าน '+h.id+' ':''}${h.name} ดูบนแผนที่"><span class="list-id">${h.type==='house'?h.id:'△'}</span><span class="list-info"><span class="list-name">${h.name}</span><span class="list-meta" style="display:block">${h.type==='house'?`${h.capacity} คน · ${money(h.price)} บ.*`:`โซน ${h.zone} · ลานเต็นท์`}</span></span>${state.selected.has(h.id)?'<span class="list-selected">✓</span>':''}</button>`).join('');
  }
  const houseSvg='<svg viewBox="0 0 180 130" aria-hidden="true"><path d="m25 60 65-40 65 40M40 52v58h100V52M78 110V75h24v35M53 72h14v14H53zM113 72h14v14h-14z"/></svg>';
  const tentSvg='<svg viewBox="0 0 180 130" aria-hidden="true"><path d="m24 106 58-85 54 85H24Z M82 21l37 3 48 82h-31M60 106l22-44 24 44M11 111h160M82 21v-9M118 24V14"/><path d="m13 74 12-25 12 25H13Zm2-12h20M25 74v28m116-29 13-28 13 28h-26Zm3-13h20m-10 14v28"/><circle cx="135" cy="19" r="6"/></svg>';
  function renderDetails(){
    const h=lookup(state.active);
    if(!h){$('detail-content').innerHTML='<div class="empty-detail"><span>⌖</span><h3>บ้านหลังไหนเหมาะกับคุณ?</h3><p>เลือกเลขบ้านหรือจุดเต็นท์บนแผนที่<br>เพื่อดูรูปและรายละเอียดทั้งหมด</p></div>';return;}
    const isHouse=h.type==='house';
    let photoHtml;
    if(h.photos.length){
      state.photo=Math.min(state.photo,h.photos.length-1);
      const p=h.photos[state.photo];
      photoHtml=`<div class="photo-wrap"><img id="detail-photo" class="photo-main" src="${p.src}" alt="${h.name} ภาพจากหน้า DNP" data-enlarge="true"><span class="photo-badge">ภาพจากกรมอุทยานฯ</span><button class="photo-expand" data-enlarge="true" aria-label="ขยายรูปบ้าน ${h.id}">⤢</button></div><div class="gallery-nav" role="group" aria-label="รูปภาพบ้าน ${h.id}">${h.photos.map((p,i)=>`<button data-photo="${i}" class="${state.photo===i?'active':''}" aria-label="ดูรูปที่ ${i+1}" aria-pressed="${state.photo===i}"><img src="${p.src}" alt="" loading="lazy"></button>`).join('')}</div><p class="photo-credit">${p.caption} · ไม่ยืนยันสภาพปัจจุบัน</p>`;
    }else photoHtml=`<div class="photo-wrap camp-drawing">${isHouse?houseSvg:tentSvg}</div><p class="photo-credit">ภาพสัญลักษณ์ · ยังไม่มีรูปสถานที่ที่ยืนยันได้</p>`;
    const metricHtml=`<div class="detail-metrics"><div><small>ระยะถึง ย.4 · เที่ยวเดียว</small><strong>${distance(h)}</strong></div><div><small>ความสบาย · ประเมิน</small><strong>${h.comfort===null?'ยังไม่ประเมิน':`${h.comfort}<small style="display:inline"> / 5</small>`}</strong>${h.comfort?'<span class="stars"> ★★★★★</span>':''}</div></div>`;
    const houseBody=`<div class="price-line"><strong>฿${money(h.price)} <small>/ หลัง / คืน</small></strong><span class="price-label">ราคาปกติในไฟล์</span></div><p class="reference-note">ลด ${money(h.discount)} บาท · สุทธิ ${money(h.netPrice)} บาท/หลัง/คืน</p><p class="reference-note">${h.priceStatus}</p><div class="stats"><div><strong>${h.capacity}</strong><small>ผู้เข้าพัก</small></div><div><strong>${h.bedrooms}</strong><small>ห้องนอน</small></div><div><strong>${h.bathrooms}</strong><small>ห้องน้ำ</small></div></div><div class="detail-label">สิ่งอำนวยความสะดวก</div><div class="amenities">${h.amenities.map(a=>`<span>✓ ${a}</span>`).join('')}</div><p class="detail-note">ประเภทห้อง: ${h.bedType}</p>`;
    const campBody=h.id==='tent-y2'?`<div class="price-line"><strong>฿30 <small>/ คน / คืน*</small></strong><span class="price-label">นำเต็นท์มาเอง</span></div><p class="reference-note">ค่าพื้นที่อ้างอิงจากแชตเดิม · ยังไม่ยืนยันปัจจุบัน</p><div class="camp-breakdown"><div><span>เต็นท์เช่า / หลัง / คืน</span><b>160–225 บ.*</b></div><div><span>ถุงนอน / คน / คืน</span><b>30 บ.*</b></div><div><span>แผ่นรอง / คน / คืน</span><b>20 บ.*</b></div><div><span>หมอน / คน / คืน</span><b>10 บ.*</b></div></div><p class="detail-note">* ค่าเช่าเต็นท์อาจเป็นคนละบริการหรือต่างลาน ต้องยืนยันว่าให้เช่านำไปใช้ที่ ย.2 ได้หรือไม่</p><div class="amenities">${h.amenities.map(a=>`<span>${a}</span>`).join('')}</div>`:'<div class="detail-label">ยังไม่มีข้อมูลยืนยันราคาและสิ่งอำนวยความสะดวก</div><p class="detail-note">ลานพักแรม 2 อยู่ในผังบ้านพักโซน 1 ส่วนลานสน ย.2 อยู่บนเส้นทางเดินป่าโซน 7</p>';
    $('detail-content').innerHTML=`<div style="--marker-color:${colors[h.zone]}"><div class="detail-top"><div><p class="detail-zone">${isHouse?'บ้านพัก':'พื้นที่กางเต็นท์'} · โซน ${h.zone} / ${zoneNames[h.zone]}</p><h3 class="detail-title" id="detail-title">${isHouse?`<span>${h.id}</span> `:''}${h.name}</h3></div><button id="close-detail" aria-label="ปิดรายละเอียด">×</button></div>${photoHtml}<div class="detail-body">${isHouse?houseBody:campBody}<p class="detail-desc">${h.description}</p>${metricHtml}<p class="detail-note">${h.distance?(isHouse?'ระยะประมาณจากแชตเดิม ใช้เทียบตัวเลือก ไม่ใช่ระยะ GPS รายหลัง':'ระยะจากผัง ย.2 → ย.3 3 กม. + ย.3 → ย.4 1 กม.'):'ยังไม่มีข้อมูลยืนยันระยะจากจุดนี้ถึง ย.4'}</p><p class="detail-note"><b>ก่อนเข้าพัก:</b> ${h.limitation}</p>${isHouse?`<button class="primary-button ${state.selected.has(h.id)?'added':''}" id="add-selected" data-toggle="${h.id}">${state.selected.has(h.id)?'✓ อยู่ในรายการแล้ว · กดเพื่อนำออก':'+ เพิ่มในรายการที่พักของฉัน'}</button>`:`<button class="primary-button" id="camp-compare">${h.id==='tent-y2'?'เทียบค่าเต็นท์กับบ้านพัก ↓':'ดูตัวเลือกที่มีข้อมูลราคา ↓'}</button>`}<div class="detail-links"><a href="${h.source}" target="_blank" rel="noopener noreferrer">${isHouse&&!h.photos.length?'หน้าข้อมูลอุทยานฯ':'รายละเอียดจาก DNP'} ↗</a><a href="https://booking.dnp.go.th/reservation.php?option=${isHouse?'home':'area'}" target="_blank" rel="noopener noreferrer">ระบบจอง ↗</a></div><p class="detail-note" style="margin-bottom:0">${isHouse?'ข้อมูลจากไฟล์ 14 ต.ค. 2569':'ข้อมูลเต็นท์จากแหล่งเดิม'} · ไม่แสดงห้องว่างสด</p></div></div>`;
    $('detail-photo')?.addEventListener('error',event=>{event.target.parentElement.innerHTML='<div class="photo-fallback"><strong>⌂</strong><span>โหลดภาพไม่ได้<br>เปิดดูภาพจากลิงก์ DNP ด้านล่างได้</span></div>';});
  }
  function openStay(id,center=false,trigger=null){
    const h=lookup(id);if(!h)return;
    returnFocus=trigger||document.activeElement;
    state.active=id;state.photo=0;
    if(!visible(h)){state.filter='all';syncFilterButtons();}
    renderMarkers();renderList();renderDetails();$('details').scrollTop=0;
    if(center)centerOn(h.x,h.y,Math.max(view.scale,1700/mapWidth()));
    $('map-status-text').textContent=h.type==='house'?`บ้าน ${h.id} · ${h.name}`:h.name;
    if(matchMedia('(max-width:700px)').matches){$('details').classList.add('mobile-open');$('detail-backdrop').hidden=false;$('details').setAttribute('role','dialog');$('details').setAttribute('aria-modal','true');document.body.style.overflow='hidden';$('close-detail').focus({preventScroll:true});}
    else if(trigger){if(trigger.closest('#stay-list-grid'))$('map-section').scrollIntoView({behavior:'smooth',block:'start'});$('close-detail').focus({preventScroll:true});}
  }
  function closeDetail(){
    state.active=null;renderMarkers();renderList();renderDetails();closeMobile();$('map-status-text').textContent='ผังที่พัก · เลื่อนและซูมได้';
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});else $('map-viewport').focus({preventScroll:true});
  }
  function closeMobile(){ $('details').classList.remove('mobile-open');$('detail-backdrop').hidden=true;$('details').removeAttribute('role');$('details').removeAttribute('aria-modal');document.body.style.overflow=''; }
  function syncFilterButtons(){document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===state.filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function toggleSelected(id){if(!lookup(id)||lookup(id).type!=='house')return;const fromDetails=$('details').contains(document.activeElement),scroll=$('details').scrollTop;if(state.selected.has(id)){state.selected.delete(id);toast(`นำบ้าน ${id} ออกจากรายการแล้ว`);}else{state.selected.add(id);toast(`เพิ่มบ้าน ${id} ในรายการเปรียบเทียบแล้ว`);}renderMarkers();renderList();renderCompare();renderDetails();$('details').scrollTop=scroll;if(fromDetails)$('add-selected')?.focus({preventScroll:true});persist();}
  function setPreset(ids){state.selected=new Set(ids);renderMarkers();renderList();renderDetails();renderCompare();persist();toast('อัปเดตรายการที่พักแล้ว');}
  function renderCompare(){
    const {people,nights}=state;
    $('people').value=people;$('nights').value=nights;$('nav-count').textContent=state.selected.size;
    $('clear-selection').disabled=!state.selected.size;
    $('price-basis').textContent=state.useNetPrice?'งบบ้านพักใช้ราคาสุทธิหลังลด 30% ตามไฟล์':'งบบ้านพักใช้ราคาปกติในไฟล์';
    $('selected-chips').innerHTML=[...state.selected].map(id=>`<button data-toggle="${id}" aria-label="นำบ้าน ${id} ออกจากรายการ">${id} ${lookup(id).name} <span aria-hidden="true">×</span></button>`).join('');
    if(state.selected.size){const s=TripMath.houses(STAYS,state.selected,people,nights,state.useNetPrice);$('selection-summary').innerHTML=`<div class="selection-summary-grid"><div><small>รวม ${s.count} หลัง / ${nights} คืน*</small><strong>฿${money(s.total)}</strong></div><div><small>เฉลี่ยต่อคน / ทั้งทริป</small><strong>฿${money(s.perPerson)}</strong></div><div><small>รองรับผู้เข้าพัก</small><strong>${s.capacity} <span>/ ${people} คน</span></strong></div><div><small>สิ่งที่ได้</small><strong>${s.bathrooms} <span>ห้องน้ำ</span></strong><small>${s.bedrooms} ห้องนอน</small></div></div><p class="${s.enough?'capacity-good':'capacity-warning'}">${s.enough?'✓ ความจุเพียงพอสำหรับกลุ่มนี้':`ความจุยังขาด ${people-s.capacity} คน · เพิ่มบ้านพักในรายการ`}</p>`;}
    else $('selection-summary').innerHTML='<div class="empty-selection"><span>กด “เพิ่มในรายการ” จากรายละเอียดบ้าน เพื่อจัดชุดที่พักของคุณเอง</span><button data-preset="401,402,403,404">ลองบ้านเล็ก 4 หลัง ↗</button></div>';
    const smallCount=Math.min(8,Math.ceil(people/2));
    const smallIds=['401','402','403','404','405','301','303','304'].slice(0,smallCount);
    const options=[{title:'บ้านเล็กหลายหลัง',desc:`${smallCount} หลัง × 2 คน · ${[...new Set(smallIds.map(id=>lookup(id).zone))].sort().map(z=>'โซน '+z).join(' + ')}`,tag:'พื้นที่ส่วนตัวมากขึ้น',ids:smallIds,dist:smallCount<=5?'≈ 5.7–6.4 กม.':'บางหลังยังไม่ยืนยัน',comfort:'4.5',featured:true},{title:'502 ชมดอย',desc:'บ้านรวมกลุ่ม · โซน 5',tag:'อยู่ด้วยกันทั้งทริป',ids:['502'],dist:'≈ 5.2–5.8 กม.',comfort:'4'},{title:'410 ชมดง',desc:'บ้านรวมกลุ่ม · โซน 4',tag:'อีกตัวเลือกสำหรับกลุ่ม',ids:['410'],dist:'≈ 5.7–6.2 กม.',comfort:'4'}];
    const cards=options.map(o=>{const s=TripMath.houses(STAYS,o.ids,people,nights,state.useNetPrice);return `<article class="compare-card ${o.featured?'featured':''}"><p class="compare-eyebrow">⌂ ${o.tag}</p><h3>${o.title}</h3><p class="card-description">${o.desc}</p><div class="compare-price">฿${money(s.total)} <small>/ ${nights} คืน*</small></div><p class="per-person">${money(s.perPerson)} บาท/คน · ทั้งทริป</p><div class="compare-specs"><div><span>พักได้ / ห้องน้ำ</span><b>${s.capacity} คน / ${s.bathrooms} ห้อง</b></div><div><span>ระยะถึง ย.4</span><b>${o.dist}</b></div><div><span>ความสบาย</span><b>★ ${o.comfort}/5</b></div></div>${s.enough?'':`<p class="capacity-warning">รองรับไม่พอ · ขาด ${people-s.capacity} คน</p>`}<button class="pick-preset" data-preset="${o.ids.join(',')}">เลือกชุดนี้</button></article>`;});
    const own=TripMath.camping(people,nights,{rent:false});const rent=TripMath.camping(people,nights,{rent:true,bag:state.bag,mat:state.mat,pillow:state.pillow,ground:state.ground});
    cards.push(`<article class="compare-card"><p class="compare-eyebrow">△ ประหยัดเมื่อมีอุปกรณ์</p><h3>เต็นท์ส่วนตัว · ย.2</h3><p class="card-description">นำเต็นท์และเครื่องนอนมาเอง</p><div class="compare-price">฿${money(own.min)} <small>/ ${nights} คืน*</small></div><p class="per-person">${money(own.min/people)} บาท/คน · ทั้งทริป</p><div class="compare-specs"><div><span>ค่าพื้นที่ / คืน*</span><b>30 บ./คน</b></div><div><span>ระยะถึง ย.4</span><b>≈ 4.0 กม.</b></div><div><span>ความสบาย</span><b>★ 2.5/5 · ห้องน้ำรวม</b></div></div><button class="pick-preset" data-open="tent-y2">ดูจุดกางเต็นท์ ↗</button></article>`);
    cards.push(`<article class="compare-card"><p class="compare-eyebrow">△ ใกล้เส้นทางขึ้น ย.4</p><h3>เช่าเต็นท์ · ย.2*</h3><p class="card-description">สมมติ ${rent.tents} หลัง · 2 คน/หลัง</p><div class="compare-price range">฿${money(rent.min)}–${money(rent.max)}</div><p class="per-person">${money(rent.min/people)}–${money(rent.max/people)} บาท/คน · ${nights} คืน</p><div class="compare-specs"><div><span>เต็นท์ / คืน*</span><b>160–225 บ./หลัง</b></div><div><span>ระยะถึง ย.4</span><b>≈ 4.0 กม.</b></div><div><span>ความสบาย</span><b>★ 2.5/5 · ห้องน้ำรวม</b></div></div><button class="pick-preset" id="open-tent-settings">ปรับอุปกรณ์ที่เช่า ↓</button></article>`);
    $('comparison-grid').innerHTML=cards.join('');
    $('tent-formula').textContent=`${people} คน × ${nights} คืน: เต็นท์ ${rent.tents} หลัง = ${money(rent.tents*160*nights)}–${money(rent.tents*225*nights)} บ. + ค่าพื้นที่ ${money(rent.area)} บ. + เครื่องนอน ${money(rent.gear)} บ. = ${money(rent.min)}–${money(rent.max)} บ. ${state.ground?'(รวมค่าพื้นที่แยกหนึ่งครั้ง)':'(สมมติว่าค่าพื้นที่รวมอยู่ในค่าเช่าแล้ว)'}`;
  }
  // The bitmap and all pins live in one transformed coordinate space.
  const viewport=$('map-viewport'), world=$('map-world');
  const view={scale:1,x:0,y:0};
  const mapWidth=()=>viewport.clientWidth;
  function constrain(){const w=mapWidth()*view.scale,h=mapWidth()*.7*view.scale;view.x=w<viewport.clientWidth?(viewport.clientWidth-w)/2:Math.max(viewport.clientWidth-w,Math.min(0,view.x));view.y=h<viewport.clientHeight?(viewport.clientHeight-h)/2:Math.max(viewport.clientHeight-h,Math.min(0,view.y));}
  function draw(){constrain();world.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.scale})`;world.style.setProperty('--inverse-scale',1/view.scale);$('zoom-in').disabled=view.scale>=8;$('zoom-out').disabled=view.scale<=fitScale()+.001;}
  function fitScale(){return Math.min(1,viewport.clientHeight/(mapWidth()*.7));}
  function centerOn(x,y,scale){view.scale=Math.max(fitScale(),Math.min(8,scale));view.x=viewport.clientWidth/2-x*mapWidth()*view.scale;view.y=viewport.clientHeight/2-y*mapWidth()*.7*view.scale;draw();}
  function home(){centerOn(.399,.398,1700/mapWidth());}
  function fit(){centerOn(.5,.5,fitScale());}
  function zoomAt(factor,x=viewport.clientWidth/2,y=viewport.clientHeight/2){const old=view.scale;view.scale=Math.max(fitScale(),Math.min(8,old*factor));view.x=x-(x-view.x)*(view.scale/old);view.y=y-(y-view.y)*(view.scale/old);draw();}
  const pointers=new Map();let gesture=null,suppressClickUntil=0;
  function startGesture(){const ps=[...pointers.values()];if(ps.length>=2){gesture={type:'pinch',distance:Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y),cx:(ps[0].x+ps[1].x)/2,cy:(ps[0].y+ps[1].y)/2};}else if(ps.length===1)gesture={type:'pan',x:ps[0].x,y:ps[0].y,startX:ps[0].x,startY:ps[0].y};else gesture=null;}
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('.map-controls,.map-bottom button'))return;const r=viewport.getBoundingClientRect();pointers.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});startGesture();viewport.classList.add('dragging');});
  window.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const r=viewport.getBoundingClientRect();pointers.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});const ps=[...pointers.values()];if(ps.length>=2&&gesture?.type==='pinch'){const d=Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y),cx=(ps[0].x+ps[1].x)/2,cy=(ps[0].y+ps[1].y)/2;if(gesture.distance>0)zoomAt(d/gesture.distance,gesture.cx,gesture.cy);view.x+=cx-gesture.cx;view.y+=cy-gesture.cy;draw();gesture={type:'pinch',distance:d,cx,cy};suppressClickUntil=Date.now()+350;}else if(ps.length===1&&gesture?.type==='pan'){const p=ps[0];view.x+=p.x-gesture.x;view.y+=p.y-gesture.y;if(Math.hypot(p.x-gesture.startX,p.y-gesture.startY)>5)suppressClickUntil=Date.now()+350;gesture.x=p.x;gesture.y=p.y;draw();}});
  ['pointerup','pointercancel'].forEach(type=>window.addEventListener(type,e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);startGesture();if(!pointers.size)viewport.classList.remove('dragging');}));
  viewport.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const r=viewport.getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.005),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;const moves={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};if(moves[e.key]){e.preventDefault();view.x+=moves[e.key][0];view.y+=moves[e.key][1];draw();}else if(e.key==='+'||e.key==='='){e.preventDefault();zoomAt(1.3);}else if(e.key==='-'){e.preventDefault();zoomAt(1/1.3);}else if(e.key==='Home'){e.preventDefault();home();}});
  $('zoom-in').onclick=()=>zoomAt(1.35);$('zoom-out').onclick=()=>zoomAt(1/1.35);$('map-home').onclick=home;$('map-fit').onclick=fit;
  $('trail-view').onclick=()=>{if(state.filter!=='all'&&state.filter!=='camp'){state.filter='all';syncFilterButtons();renderMarkers();renderList();}centerOn(.843,.437,1500/mapWidth());$('map-status-text').textContent='เส้นทาง ย.1 → ย.4 · ลานสน ย.2';};
  $('park-map').onerror=()=>{$('map-error').hidden=false;};
  let lastWidth=0;new ResizeObserver(()=>{const w=mapWidth();if(w!==lastWidth){lastWidth=w;home();}if(!matchMedia('(max-width:700px)').matches)closeMobile();}).observe(viewport);
  document.addEventListener('click',e=>{
    const target=e.target.closest('button,[data-enlarge]');if(!target)return;
    if(target.dataset.open){if(target.closest('#map-viewport')&&Date.now()<suppressClickUntil)return;openStay(target.dataset.open,!!target.dataset.center,target);}
    if(target.dataset.filter){state.filter=target.dataset.filter;syncFilterButtons();renderMarkers();renderList();if(state.filter==='camp')fit();else home();}
    if(target.dataset.toggle)toggleSelected(target.dataset.toggle);
    if(target.dataset.preset)setPreset(target.dataset.preset.split(','));
    if(target.dataset.photo!==undefined){state.photo=Number(target.dataset.photo);const scroll=$('details').scrollTop;renderDetails();$('details').scrollTop=scroll;document.querySelector(`[data-photo="${state.photo}"]`)?.focus({preventScroll:true});}
    if(target.dataset.enlarge){const h=lookup(state.active),p=h?.photos[state.photo];if(p){$('large-photo').src=p.src;$('large-photo').alt=`บ้าน ${h.id} ${h.name}`;$('photo-caption').textContent=`บ้าน ${h.id} ${h.name} · ${p.caption}`;$('photo-dialog').showModal();}}
    if(target.dataset.step){const [key,amount]=target.dataset.step.split(':');state[key]=TripMath.integer(state[key]+Number(amount),key==='people'?8:1,key==='people'?99:30);renderCompare();persist();}
    if(target.id==='close-detail')closeDetail();
    if(target.id==='clear-selection'){state.selected.clear();renderCompare();renderMarkers();renderList();renderDetails();persist();}
    if(target.id==='show-list')$('stay-list').scrollIntoView({behavior:'smooth',block:'center'});
    if(target.id==='camp-compare'){closeMobile();$('compare-section').scrollIntoView({behavior:'smooth'});}
    if(target.id==='open-tent-settings'){document.querySelector('.tent-settings').open=true;document.querySelector('.tent-settings').scrollIntoView({behavior:'smooth',block:'center'});}
  });
  ['people','nights'].forEach(key=>$(key).addEventListener('change',()=>{state[key]=TripMath.integer($(key).value,key==='people'?8:1,key==='people'?99:30);renderCompare();persist();}));
  ['bag','mat','pillow','ground'].forEach(key=>{$('rent-'+key).checked=state[key];$('rent-'+key).addEventListener('change',()=>{state[key]=$('rent-'+key).checked;renderCompare();persist();});});
  $('use-net-price').checked=state.useNetPrice;
  $('use-net-price').addEventListener('change',()=>{state.useNetPrice=$('use-net-price').checked;renderCompare();persist();});
  $('detail-backdrop').onclick=closeDetail;
  $('close-photo').onclick=()=>$('photo-dialog').close();
  $('photo-dialog').addEventListener('click',e=>{if(e.target===$('photo-dialog'))$('photo-dialog').close();});
  $('large-photo').onerror=()=>{$('photo-caption').textContent='โหลดภาพไม่ได้ กรุณาเปิดภาพจากหน้า DNP ของบ้านนี้';};
  document.addEventListener('keydown',e=>{
    if($('photo-dialog').open)return;
    if(e.key==='Escape'&&state.active){e.preventDefault();closeDetail();}
    if(e.key==='Tab'&&$('details').classList.contains('mobile-open')){const focusable=[...$('details').querySelectorAll('button:not(:disabled),a[href]')].filter(el=>el.offsetParent!==null),first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&(document.activeElement===first||!$('details').contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!$('details').contains(document.activeElement))){e.preventDefault();first?.focus();}}
  });
  renderMarkers();renderList();renderDetails();renderCompare();home();
})();
