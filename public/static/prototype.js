const programs=[
  {id:'01',title:'Tahsin & Tahfidz',desc:'Perjalanan memperbaiki bacaan dan menguatkan hafalan bersama pembimbing.',meta:'12 pertemuan',schedule:'Senin & Kamis · 16.00 WIB',capacity:'20 peserta',level:'Pemula — Menengah'},
  {id:'02',title:'Kelas Qur\'an Anak',desc:'Belajar Al-Qur\'an dengan metode yang menyenangkan, bertahap, dan dekat dengan anak.',meta:'8 pertemuan',schedule:'Sabtu · 09.00 WIB',capacity:'15 peserta',level:'Anak 6–12 tahun'},
  {id:'03',title:'Kajian Qur\'ani',desc:'Ruang belajar untuk memahami nilai Al-Qur\'an dan membawanya ke kehidupan sehari-hari.',meta:'Pekan ke-2 & 4',schedule:'Jumat · 19.30 WIB',capacity:'Terbuka',level:'Umum'}
];
const grid=document.querySelector('#program-grid');
const flow=document.querySelector('#demo-flow'),flowContent=document.querySelector('#flow-content');
if(grid)grid.innerHTML=programs.map(p=>`<article class="program-card program-card-action" data-program="${p.id}"><div class="program-icon">✦</div><h3>${p.title}</h3><p>${p.desc}</p><footer><span>${p.meta}</span><span>Jelajahi →</span></footer></article>`).join('');
const modal=document.querySelector('#unit-modal'),label=document.querySelector('#unit-label'),hero=document.querySelector('#hero-unit'),switcher=document.querySelector('#unit-switcher');
const units={rq:{label:'RQ Blumbang',hero:"Rumah Qur'an Blumbang"},qima:{label:'QIMA Platform',hero:'QIMA Platform'}};
switcher?.addEventListener('click',()=>{modal.hidden=false});
document.querySelector('#unit-close')?.addEventListener('click',()=>modal.hidden=true);
modal?.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
document.querySelectorAll('.unit-option').forEach(b=>b.addEventListener('click',()=>{const u=units[b.dataset.unit];if(!u)return;label.textContent=u.label;hero.textContent=u.hero;document.querySelectorAll('.unit-option').forEach(x=>x.classList.remove('active'));b.classList.add('active');modal.hidden=true;toast('Unit context berubah: '+u.label)}));
const toastEl=document.querySelector('#toast');let toastTimer;
function toast(message){if(!toastEl)return;toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2400)}
document.querySelectorAll('[data-toast]').forEach(b=>b.addEventListener('click',()=>toast(b.dataset.toast)));
function openFlow(){if(flow)flow.hidden=false;document.body.classList.add('flow-open')}
function closeFlow(){if(flow)flow.hidden=true;document.body.classList.remove('flow-open')}
function renderDetail(p){openFlow();flowContent.innerHTML=`<span class="eyebrow">PROGRAM RQ BLUMBANG</span><h2>${p.title}</h2><p class="flow-lead">${p.desc}</p><div class="flow-meta"><div><small>Jadwal</small><strong>${p.schedule}</strong></div><div><small>Kapasitas</small><strong>${p.capacity}</strong></div><div><small>Level</small><strong>${p.level}</strong></div></div><div class="flow-actions"><button class="btn btn-primary" id="flow-register">Daftar ke program ini →</button><button class="text-link" id="flow-back">← Pilih program lain</button></div>`;
  document.querySelector('#flow-register')?.addEventListener('click',()=>renderRegistration(p));
  document.querySelector('#flow-back')?.addEventListener('click',()=>closeFlow());
}
function renderRegistration(p){
  flowContent.innerHTML=`<span class="eyebrow">REGISTRATION DEMO</span><h2>Daftar ke ${p.title}</h2><p class="flow-lead">Lengkapi data sederhana berikut. Data ini hanya simulasi untuk demo meeting.</p><form class="demo-form" id="demo-registration-form"><label>Nama lengkap<input name="name" placeholder="Contoh: Ahmad Rizky" required></label><label>WhatsApp / Email<input name="contact" placeholder="08xx atau email" required></label><label>Catatan (opsional)<textarea name="note" rows="3" placeholder="Pesan untuk pengelola unit"></textarea></label><div class="selected-program"><small>PROGRAM DIPILIH</small><strong>${p.title}</strong></div><button class="btn btn-primary" type="submit">Kirim Pendaftaran Demo →</button></form>`;
  document.querySelector('#demo-registration-form')?.addEventListener('submit',e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name')||'Peserta';renderSuccess(p,String(name))});
}
function renderSuccess(p,name){
  flowContent.innerHTML=`<div class="success-mark">✓</div><span class="eyebrow">PENDAFTARAN BERHASIL</span><h2>Terima kasih, ${name}.</h2><p class="flow-lead">Pendaftaran demo untuk <strong>${p.title}</strong> sudah tercatat. Dalam sistem production, data ini akan masuk ke dashboard unit untuk ditinjau admin.</p><div class="success-summary"><span>Status</span><strong>Menunggu ditinjau</strong><span>Unit</span><strong>Rumah Qur'an Blumbang</strong></div><div class="flow-actions"><a class="btn btn-primary" href="/demo/admin/login">Lanjut ke Admin Demo →</a><button class="text-link" id="flow-done">Kembali ke Public</button></div>`;
  document.querySelector('#flow-done')?.addEventListener('click',closeFlow);
}
document.querySelectorAll('.program-card-action').forEach(card=>card.addEventListener('click',()=>{const p=programs.find(x=>x.id===card.dataset.program);if(p)renderDetail(p)}));
document.querySelector('#register-button')?.addEventListener('click',()=>renderDetail(programs[0]));
document.querySelector('#flow-close')?.addEventListener('click',closeFlow);
flow?.addEventListener('click',e=>{if(e.target===flow)closeFlow()});
document.querySelector('.header-actions .btn')?.addEventListener('click',e=>{e.preventDefault();document.querySelector('#register')?.scrollIntoView({behavior:'smooth'});setTimeout(()=>renderDetail(programs[0]),350)});
document.querySelector('#menu-button')?.addEventListener('click',()=>toast('Menu mobile demo aktif pada prototype ini.'));
