const programs=[['01','Tahsin & Tahfidz','Perjalanan memperbaiki bacaan dan menguatkan hafalan bersama pembimbing.','12 pertemuan'],['02','Kelas Qur\'an Anak','Belajar Al-Qur\'an dengan metode yang menyenangkan, bertahap, dan dekat dengan anak.','8 pertemuan'],['03','Kajian Qur\'ani','Ruang belajar untuk memahami nilai Al-Qur\'an dan membawanya ke kehidupan sehari-hari.','Pekan ke-2 & 4']];
const grid=document.querySelector('#program-grid');
if(grid)grid.innerHTML=programs.map(([n,t,d,m])=>`<article class="program-card"><div class="program-icon">✦</div><h3>${t}</h3><p>${d}</p><footer><span>${m}</span><span>Jelajahi →</span></footer></article>`).join('');
const modal=document.querySelector('#unit-modal'),label=document.querySelector('#unit-label'),hero=document.querySelector('#hero-unit'),switcher=document.querySelector('#unit-switcher');
const units={rq:{label:'RQ Blumbang',hero:"Rumah Qur'an Blumbang"},qima:{label:'QIMA Platform',hero:'QIMA Platform'}};
switcher?.addEventListener('click',()=>{modal.hidden=false});
document.querySelector('#unit-close')?.addEventListener('click',()=>modal.hidden=true);
modal?.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
document.querySelectorAll('.unit-option').forEach(b=>b.addEventListener('click',()=>{const u=units[b.dataset.unit];if(!u)return;label.textContent=u.label;hero.textContent=u.hero;document.querySelectorAll('.unit-option').forEach(x=>x.classList.remove('active'));b.classList.add('active');modal.hidden=true;toast('Unit context berubah: '+u.label)}));
const toastEl=document.querySelector('#toast');let toastTimer;
function toast(message){if(!toastEl)return;toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2400)}
document.querySelectorAll('[data-toast]').forEach(b=>b.addEventListener('click',()=>toast(b.dataset.toast)));
document.querySelector('#register-button')?.addEventListener('click',()=>toast('Registration demo siap — pilih program untuk melanjutkan.'));
document.querySelector('#menu-button')?.addEventListener('click',()=>toast('Menu mobile demo aktif pada prototype ini.'));
