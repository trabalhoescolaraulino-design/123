 // ===== Fundo animado =====
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_PARTICLES = 120; // limite: o loop de linhas é O(n²)
let particles = [];
let width, height;

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 3 + 1.2;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.7 + 0.3;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }
    draw() {
        ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initBackground() {
    particles = [];
    const n = Math.min(MAX_PARTICLES, Math.floor((width * height) / 10000));
    for (let i = 0; i < n; i++) particles.push(new Particle());
}

function drawBackground() {
    ctx.clearRect(0, 0, width, height);
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, Math.max(width, height));
    bgGrad.addColorStop(0, '#1c1510');
    bgGrad.addColorStop(0.5, '#0c0a09');
    bgGrad.addColorStop(1, '#040303');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                ctx.strokeStyle = `rgba(212, 175, 55, ${0.12 * (1 - dist / 120)})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    particles.forEach(p => { if (!reduceMotion) p.update(); p.draw(); });
}

function animateBackground() {
    drawBackground();
    if (!reduceMotion) requestAnimationFrame(animateBackground);
}

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resizeCanvas();
        initBackground();
        if (reduceMotion) drawBackground();
    }, 150);
});
resizeCanvas();
initBackground();
animateBackground();

// ===== Utilitários =====
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function formatBRL(n) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toDateString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateBR(dateStr) {
    return dateStr ? dateStr.split('-').reverse().join('/') : '';
}

// ===== Dados =====
const servicesData = [
    { id: 'srv-1', name: 'Corte Clássico / Tesoura', desc: 'Corte tradicional ou moderno com acabamento na navalha.', price: 50.00, duration: '30 min' },
    { id: 'srv-2', name: 'Barba Completa Imperial', desc: 'Modelagem de barba com toalha quente e óleos essenciais.', price: 40.00, duration: '30 min' },
    { id: 'srv-3', name: 'Combo Imperial (Corte + Barba)', desc: 'O pacote completo de cuidados com direito a bebida.', price: 85.00, duration: '50 min' },
    { id: 'srv-4', name: 'Combo Pai e Filho', desc: 'Atendimento especial simultâneo para pai e filho.', price: 95.00, duration: '1 hora' },
    { id: 'srv-5', name: 'Hidratação Capilar Profunda', desc: 'Tratamento de revitalização para fios e couro cabeludo.', price: 45.00, duration: '30 min' }
];

const paymentMethods = [
    { id: 'pix', name: 'PIX (Aprovação Instantânea)', icon: 'fa-qrcode', desc: '5% de desconto automático aplicado' },
    { id: 'card', name: 'Cartão de Crédito / Débito', icon: 'fa-credit-card', desc: 'Realizado diretamente na recepção' },
    { id: 'cash', name: 'Dinheiro', icon: 'fa-money-bill-wave', desc: 'Realizado diretamente na recepção' }
];

const PIX_DISCOUNT = 0.05;
const ALL_SLOTS = ['09:00', '09:40', '10:20', '11:00', '11:40', '13:30', '14:10', '14:50', '15:30', '16:10', '16:50', '17:30', '18:10', '19:00'];
const BARBER_WHATSAPP = '5531982750691';

let currentStep = 1;
let lastRenderedStep = 0;
const bookingState = {
    clientName: '',
    clientPhone: '',
    selectedServices: [],
    selectedDate: '',
    selectedTime: '',
    paymentMethod: 'pix'
};

function getTotals() {
    const subtotal = bookingState.selectedServices.reduce((sum, id) => {
        const s = servicesData.find(item => item.id === id);
        return sum + (s ? s.price : 0);
    }, 0);
    const discount = bookingState.paymentMethod === 'pix' ? subtotal * PIX_DISCOUNT : 0;
    return { subtotal, discount, total: subtotal - discount };
}

// Horários: remove os que já passaram quando o dia escolhido é hoje
function getAvailableSlots(dateStr) {
    if (dateStr !== toDateString(new Date())) return ALL_SLOTS;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes() + 15; // antecedência mínima de 15 min
    return ALL_SLOTS.filter(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m > nowMin;
    });
}

function ensureValidDate() {
    const today = new Date();
    const todayStr = toDateString(today);
    if (!bookingState.selectedDate || bookingState.selectedDate < todayStr) {
        // se hoje já não tem horários, começa por amanhã
        bookingState.selectedDate = getAvailableSlots(todayStr).length
            ? todayStr
            : toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    }
    if (!getAvailableSlots(bookingState.selectedDate).includes(bookingState.selectedTime)) {
        bookingState.selectedTime = '';
    }
}

// ===== Inicialização =====
renderStep();

document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    // Enter em botão/link já aciona o próprio clique; não avançar junto
    const tag = event.target.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'TEXTAREA') return;
    const btnNext = document.getElementById('btn-next');
    if (btnNext && !btnNext.disabled && btnNext.style.display !== 'none') {
        event.preventDefault();
        nextStep();
    }
});

// ===== Passo 1: identificação =====
function applyPhoneMask(input) {
    let digits = input.value.replace(/\D/g, '').slice(0, 11);
    let value = digits;

    if (digits.length > 10) {
        value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 6) {
        value = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`; // fixo: 4+4
    } else if (digits.length > 2) {
        value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 0) {
        value = `(${digits}`;
    }
    input.value = value;
    bookingState.clientPhone = value;
    validateStep1();
}

function validateStep1() {
    const name = bookingState.clientName.trim();
    const phone = bookingState.clientPhone.replace(/\D/g, '');

    const isValidName = name.length >= 2;
    const ddd = parseInt(phone.slice(0, 2), 10);
    const isValidPhone = (phone.length === 10 || (phone.length === 11 && phone[2] === '9')) && ddd >= 11;

    if (isValidName && isValidPhone) enableNextButton();
    else disableNextButton();
}

// ===== Passo 3: calendário =====
function generateCustomCalendar() {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    let daysHtml = '';

    for (let i = 0; i < 14; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        const dateString = toDateString(d);
        const dayName = i === 0 ? 'Hoje' : diasSemana[d.getDay()];
        const isSelected = bookingState.selectedDate === dateString;
        const disabled = i === 0 && getAvailableSlots(dateString).length === 0;

        daysHtml += `
            <button type="button" ${disabled ? 'disabled' : `onclick="selectDate('${dateString}')"`}
                aria-pressed="${isSelected}" aria-label="${d.getDate()} de ${meses[d.getMonth()]}"
                class="glass-card p-3 rounded-xl text-center flex flex-col items-center justify-center flex-shrink-0 w-[82px] ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? '!border-barber-gold !bg-barber-gold/25 shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-105' : ''}">
                <span class="text-[10px] uppercase text-stone-400 font-semibold">${dayName}</span>
                <span class="text-lg font-bold text-white my-0.5">${d.getDate()}</span>
                <span class="text-[10px] text-stone-400">${meses[d.getMonth()]}</span>
            </button>
        `;
    }
    return daysHtml;
}

function selectDate(dateStr) {
    if (window.isDraggingCalendar) return;

    bookingState.selectedDate = dateStr;
    if (!getAvailableSlots(dateStr).includes(bookingState.selectedTime)) {
        bookingState.selectedTime = '';
    }

    const container = document.getElementById('custom-calendar-grid');
    if (container) {
        const scroll = container.scrollLeft; // evita o "pulo" para o início
        container.innerHTML = generateCustomCalendar();
        container.scrollLeft = scroll;
    }
    renderTimeSlots();
    validateStep3();
}

function setupCalendarDrag(slider) {
    if (!slider) return;
    let isDown = false;
    let startX;
    let scrollLeft;
    window.isDraggingCalendar = false;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        window.isDraggingCalendar = false;
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        window.isDraggingCalendar = false;
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        setTimeout(() => { window.isDraggingCalendar = false; }, 50);
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const walk = (e.pageX - slider.offsetLeft - startX) * 1.5;
        if (Math.abs(walk) > 5) window.isDraggingCalendar = true;
        slider.scrollLeft = scrollLeft - walk;
    });
}

function renderTimeSlots() {
    const container = document.getElementById('time-slots-grid');
    if (!container) return;
    const slots = getAvailableSlots(bookingState.selectedDate);

    if (slots.length === 0) {
        container.innerHTML = '<p class="col-span-full text-xs text-stone-400">Sem horários para este dia. Escolha outra data.</p>';
        return;
    }

    container.innerHTML = slots.map(time => {
        const isSelected = bookingState.selectedTime === time;
        return `
            <button type="button" onclick="selectTime('${time}')" aria-pressed="${isSelected}" class="py-2.5 rounded-xl border text-xs font-medium transition-all ${isSelected ? 'bg-barber-gold border-barber-gold text-stone-900 font-bold shadow-[0_0_12px_#d4af37] scale-105' : 'glass-card text-stone-300'}">
                ${time}
            </button>
        `;
    }).join('');
}

function selectTime(time) {
    bookingState.selectedTime = time;
    renderTimeSlots();
    validateStep3();
}

function validateStep3() {
    if (bookingState.selectedDate && bookingState.selectedTime) enableNextButton();
    else disableNextButton();
}

// ===== Renderização dos passos =====
function renderStep() {
    const body = document.getElementById('wizard-body');
    const indicator = document.getElementById('wizard-step-indicator');
    const title = document.getElementById('wizard-step-title');
    const progressBar = document.getElementById('wizard-progress-bar');
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    const stepDots = document.getElementById('step-dots');

    // anima só quando muda de passo (antes piscava a cada clique) e preserva a rolagem da lista
    const stepChanged = lastRenderedStep !== currentStep;
    const prevList = body.querySelector('.overflow-y-auto');
    const prevScroll = !stepChanged && prevList ? prevList.scrollTop : 0;
    lastRenderedStep = currentStep;

    if (stepChanged) {
        body.classList.remove('animate-fadeIn');
        void body.offsetWidth;
        body.classList.add('animate-fadeIn');
    }

    progressBar.style.width = `${(currentStep / 5) * 100}%`;
    indicator.textContent = `Passo ${currentStep} de 5`;
    btnBack.classList.toggle('hidden', currentStep === 1);

    let dotsHtml = '';
    for (let i = 1; i <= 5; i++) {
        let dotClass = 'w-2 h-2 rounded-full bg-stone-700/60';
        if (i === currentStep) dotClass = 'w-6 h-2 rounded-full bg-barber-gold shadow-[0_0_10px_#d4af37]';
        else if (i < currentStep) dotClass = 'w-2 h-2 rounded-full bg-barber-gold/60';
        dotsHtml += `<div class="${dotClass} transition-all duration-300"></div>`;
    }
    stepDots.innerHTML = dotsHtml;

    btnNext.style.display = currentStep < 5 ? 'flex' : 'none';

    if (currentStep === 1) {
        title.textContent = 'Identificação do Cliente';
        body.innerHTML = `
            <div class="space-y-4">
                <p class="text-stone-300 text-xs">Insira seu nome e WhatsApp com DDD para continuar:</p>
                <div class="space-y-3">
                    <div>
                        <label for="input-name" class="text-[11px] uppercase text-stone-400 tracking-wider font-semibold block mb-1">Seu Nome *</label>
                        <input type="text" id="input-name" autocomplete="name" placeholder="Ex: Roberto Carlos" value="${escapeHtml(bookingState.clientName)}" oninput="bookingState.clientName = this.value; validateStep1()" class="w-full glass-input rounded-xl px-4 py-3 text-stone-100 text-sm focus:outline-none">
                    </div>
                    <div>
                        <label for="input-phone" class="text-[11px] uppercase text-stone-400 tracking-wider font-semibold block mb-1">WhatsApp com DDD *</label>
                        <input type="tel" id="input-phone" autocomplete="tel-national" inputmode="numeric" placeholder="(31) 98765-4321" value="${escapeHtml(bookingState.clientPhone)}" oninput="applyPhoneMask(this)" class="w-full glass-input rounded-xl px-4 py-3 text-stone-100 text-sm focus:outline-none">
                    </div>
                </div>
            </div>
        `;
        validateStep1();
    } else if (currentStep === 2) {
        title.textContent = 'Escolha dos Serviços';
        body.innerHTML = `
            <div class="space-y-3">
                <p class="text-stone-300 text-xs">Selecione um ou mais serviços desejados:</p>
                <div class="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    ${servicesData.map(s => {
                        const isSelected = bookingState.selectedServices.includes(s.id);
                        return `
                            <button type="button" onclick="toggleService('${s.id}')" aria-pressed="${isSelected}" class="w-full text-left glass-card p-3.5 rounded-xl cursor-pointer flex items-center justify-between ${isSelected ? '!border-barber-gold !bg-barber-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.25)]' : ''}">
                                <div class="flex-1 pr-3">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-bold text-sm text-white">${s.name}</h4>
                                        <span class="text-barber-gold font-bold text-sm">${formatBRL(s.price)}</span>
                                    </div>
                                    <p class="text-xs text-stone-400 mt-0.5">${s.desc} • <span class="text-stone-300 font-medium">${s.duration}</span></p>
                                </div>
                                <div class="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-barber-gold bg-barber-gold text-stone-900 text-xs font-bold' : 'border-stone-600'}">
                                    ${isSelected ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
                                </div>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        validateStep2();
    } else if (currentStep === 3) {
        title.textContent = 'Data e Horários';
        ensureValidDate();
        body.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="text-[11px] uppercase text-stone-400 tracking-wider font-semibold block mb-2">Escolha o Dia (Arraste para ver mais) *</label>
                    <div class="flex gap-2.5 py-3 px-1 calendar-scroll" id="custom-calendar-grid">
                        ${generateCustomCalendar()}
                    </div>
                </div>
                <div>
                    <label class="text-[11px] uppercase text-stone-400 tracking-wider font-semibold block mb-1.5">Horários Disponíveis *</label>
                    <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[150px] overflow-y-auto p-1" id="time-slots-grid"></div>
                </div>
            </div>
        `;
        renderTimeSlots();
        setupCalendarDrag(document.getElementById('custom-calendar-grid'));
        validateStep3();
    } else if (currentStep === 4) {
        title.textContent = 'Forma de Pagamento';
        body.innerHTML = `
            <div class="space-y-3">
                <p class="text-stone-300 text-xs">Como você prefere realizar o pagamento?</p>
                <div class="space-y-2.5">
                    ${paymentMethods.map(p => {
                        const isSelected = bookingState.paymentMethod === p.id;
                        return `
                            <button type="button" onclick="selectPayment('${p.id}')" aria-pressed="${isSelected}" class="w-full text-left glass-card p-4 rounded-xl cursor-pointer flex items-center space-x-3 ${isSelected ? '!border-barber-gold !bg-barber-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.25)]' : ''}">
                                <div class="w-10 h-10 rounded-xl bg-stone-950/60 border border-stone-700/60 flex items-center justify-center text-barber-gold text-base">
                                    <i class="fa-solid ${p.icon}"></i>
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-sm text-white">${p.name}</h4>
                                    <p class="text-xs text-stone-400">${p.desc}</p>
                                </div>
                                <div class="w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-barber-gold bg-barber-gold text-stone-900 text-xs font-bold' : 'border-stone-600'}">
                                    ${isSelected ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
                                </div>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        validateStep4();
    } else if (currentStep === 5) {
        title.textContent = 'Revisão do Agendamento';

        const { discount, total } = getTotals();
        const servicesListText = bookingState.selectedServices.map(srvId => {
            const s = servicesData.find(item => item.id === srvId);
            return s ? `• ${escapeHtml(s.name)} (${formatBRL(s.price)})` : '';
        }).join('\n');
        const paymentObj = paymentMethods.find(p => p.id === bookingState.paymentMethod);

        body.innerHTML = `
            <div class="space-y-4">
                <div class="text-center space-y-1">
                    <div class="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <h3 class="font-bold font-heading text-lg text-white">Tudo Pronto para Enviar!</h3>
                    <p class="text-stone-300 text-xs">Revise os detalhes e envie o pedido pelo WhatsApp. O horário só é garantido após a confirmação da barbearia.</p>
                </div>

                <div class="glass-card rounded-2xl p-4 space-y-3 text-xs">
                    <div class="border-b border-stone-800/60 pb-2">
                        <span class="text-stone-400 block">Cliente:</span>
                        <strong class="text-white text-sm">${escapeHtml(bookingState.clientName.trim())} (${escapeHtml(bookingState.clientPhone)})</strong>
                    </div>
                    <div class="border-b border-stone-800/60 pb-2">
                        <span class="text-stone-400 block">Serviços Escolhidos:</span>
                        <div class="text-stone-200 font-medium whitespace-pre-line mt-0.5">${servicesListText}</div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 border-b border-stone-800/60 pb-2">
                        <div>
                            <span class="text-stone-400 block">Data e Hora:</span>
                            <strong class="text-barber-gold">${formatDateBR(bookingState.selectedDate)} às ${escapeHtml(bookingState.selectedTime)}</strong>
                        </div>
                        <div>
                            <span class="text-stone-400 block">Pagamento:</span>
                            <strong class="text-white">${paymentObj ? paymentObj.name.split(' ')[0] : ''}</strong>
                        </div>
                    </div>
                    ${discount > 0 ? `
                    <div class="flex justify-between items-center text-emerald-400">
                        <span>Desconto PIX (5%):</span>
                        <span>- ${formatBRL(discount)}</span>
                    </div>` : ''}
                    <div class="flex justify-between items-center pt-1 font-bold text-sm">
                        <span class="text-stone-300">Valor Total:</span>
                        <span class="text-barber-gold text-base">${formatBRL(total)}</span>
                    </div>
                </div>

                <button type="button" onclick="sendToWhatsApp()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 text-sm hover:scale-[1.01]">
                    <i class="fa-brands fa-whatsapp text-lg"></i> Enviar Agendamento para o WhatsApp
                </button>
            </div>
        `;
    }

    const newList = body.querySelector('.overflow-y-auto');
    if (newList && prevScroll) newList.scrollTop = prevScroll;
}

// ===== Ações =====
function toggleService(id) {
    const index = bookingState.selectedServices.indexOf(id);
    if (index > -1) bookingState.selectedServices.splice(index, 1);
    else bookingState.selectedServices.push(id);
    renderStep();
}

function validateStep2() {
    if (bookingState.selectedServices.length > 0) enableNextButton();
    else disableNextButton();
}

function selectPayment(id) {
    bookingState.paymentMethod = id;
    renderStep();
}

function validateStep4() {
    if (bookingState.paymentMethod) enableNextButton();
    else disableNextButton();
}

function enableNextButton() {
    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
        btnNext.disabled = false;
        btnNext.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-stone-800/60', 'text-stone-500');
        btnNext.classList.add('bg-barber-gold', 'text-stone-900', 'hover:bg-barber-goldDark', 'font-bold', 'shadow-[0_0_15px_rgba(212,175,55,0.4)]');
    }
}

function disableNextButton() {
    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
        btnNext.disabled = true;
        btnNext.classList.add('opacity-50', 'cursor-not-allowed', 'bg-stone-800/60', 'text-stone-500');
        btnNext.classList.remove('bg-barber-gold', 'text-stone-900', 'hover:bg-barber-goldDark', 'font-bold', 'shadow-[0_0_15px_rgba(212,175,55,0.4)]');
    }
}

function nextStep() {
    if (currentStep < 5) {
        currentStep++;
        renderStep();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        renderStep();
    }
}

function sendToWhatsApp() {
    const srvNames = bookingState.selectedServices.map(id => {
        const s = servicesData.find(item => item.id === id);
        return s ? s.name : '';
    }).filter(Boolean).join(', ');

    const paymentObj = paymentMethods.find(p => p.id === bookingState.paymentMethod);
    const { discount, total } = getTotals();

    const rawMessage = `*NOVO AGENDAMENTO - BARBEARIA IMPERIAL*\n\n` +
        `*Cliente:* ${bookingState.clientName.trim()}\n` +
        `*WhatsApp:* ${bookingState.clientPhone}\n` +
        `*Serviço(s):* ${srvNames}\n` +
        `*Data:* ${formatDateBR(bookingState.selectedDate)}\n` +
        `*Horário:* ${bookingState.selectedTime}\n` +
        `*Pagamento:* ${paymentObj ? paymentObj.name : ''}\n` +
        `*Total:* ${formatBRL(total)}${discount > 0 ? ' (com 5% de desconto PIX)' : ''}\n\n` +
        `_Aguardando confirmação do horário!_`;

    const url = `https://api.whatsapp.com/send?phone=${BARBER_WHATSAPP}&text=${encodeURIComponent(rawMessage)}`;
    window.open(url, '_blank', 'noopener');
}
// ===== Horário de funcionamento (usa o mesmo expediente da agenda) =====
const WEEK_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const BUSINESS_HOURS = { 0: null, 1: [9, 20], 2: [9, 20], 3: [9, 20], 4: [9, 20], 5: [9, 20], 6: [9, 18] };

function renderHours() {
    const list = document.getElementById('hours-list');
    const badge = document.getElementById('open-status');
    if (!list || !badge) return;
    const now = new Date();
    const today = now.getDay();

    list.innerHTML = WEEK_LABELS.map((label, i) => {
        const h = BUSINESS_HOURS[i];
        const text = h ? `${String(h[0]).padStart(2, '0')}:00 – ${String(h[1]).padStart(2, '0')}:00` : '<span class="closed">Fechado</span>';
        return `<li class="${i === today ? 'is-today' : ''}"><span>${label}</span><span>${text}</span></li>`;
    }).join('');

    const hours = BUSINESS_HOURS[today];
    const minutes = now.getHours() * 60 + now.getMinutes();
    const open = !!hours && minutes >= hours[0] * 60 && minutes < hours[1] * 60;
    badge.textContent = open ? 'Aberto agora' : 'Fechado agora';
    badge.className = `status-badge ${open ? 'status-open' : 'status-closed'}`;
}
renderHours();
setInterval(renderHours, 60000);

// ===== Aviso (toast) =====
let toastTimer;
function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ===== Rascunho salvo no navegador (retoma de onde parou) =====
const DRAFT_KEY = 'imperial-draft-v1';
const DRAFT_TTL = 24 * 60 * 60 * 1000;

function saveDraft() {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), currentStep, state: bookingState }));
    } catch (e) { /* armazenamento indisponível: segue sem salvar */ }
}

function loadDraft() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return false;
        const draft = JSON.parse(raw);
        if (!draft || Date.now() - draft.savedAt > DRAFT_TTL) {
            localStorage.removeItem(DRAFT_KEY);
            return false;
        }
        const s = draft.state || {};
        bookingState.clientName = String(s.clientName || '');
        bookingState.clientPhone = String(s.clientPhone || '');
        bookingState.selectedServices = (s.selectedServices || []).filter(id => servicesData.some(x => x.id === id));
        bookingState.selectedDate = String(s.selectedDate || '');
        bookingState.selectedTime = String(s.selectedTime || '');
        bookingState.paymentMethod = paymentMethods.some(p => p.id === s.paymentMethod) ? s.paymentMethod : 'pix';
        currentStep = Math.min(5, Math.max(1, parseInt(draft.currentStep, 10) || 1));
        return bookingState.clientName.trim().length > 0 || bookingState.selectedServices.length > 0;
    } catch (e) {
        return false;
    }
}

function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignora */ }
}

// salva a cada renderização e a cada digitação
const _renderStepOriginal = renderStep;
renderStep = function () {
    _renderStepOriginal();
    saveDraft();
};
document.addEventListener('input', saveDraft);

// limpa o rascunho depois de enviar o pedido
const _sendToWhatsAppOriginal = sendToWhatsApp;
sendToWhatsApp = function () {
    _sendToWhatsAppOriginal();
    clearDraft();
    showToast('Pedido enviado! Aguarde a confirmação no WhatsApp.');
};

if (loadDraft()) {
    // passos 3+ precisam de dados válidos; se faltar algo, volta ao passo seguro
    if (currentStep >= 2 && bookingState.selectedServices.length === 0) currentStep = 2;
    renderStep();
    showToast('Retomamos o seu agendamento de onde você parou.');
}