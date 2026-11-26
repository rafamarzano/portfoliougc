(function () {
'use strict';
/* ============================================================================
   EDIÇÃO DE NATAL · base compartilhada
   - Liga sozinha até 06/01/2027 (Dia de Reis) e desliga depois disso.
   - Para desligar antes: apague as duas linhas "natal/" do index.html.
   - Para comparar com o site normal: abra a página com ?natal=0
   ============================================================================ */
const NATAL_FIM = new Date(2027, 0, 7);          // desliga a partir daqui
const ATIVO = new Date() < NATAL_FIM && !/[?&]natal=0/.test(location.search);
const REDUZIR = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function deco(cls, html) {
  const n = el('div', 'natal-deco ' + cls, html);
  n.setAttribute('aria-hidden', 'true');
  return n;
}
function aleatorio(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
const f1 = v => Math.round(v * 10) / 10;

/* ---------- faixa com contagem regressiva ---------- */
function textosFaixa(lang) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const natal = new Date(2026, 11, 25);
  const d = Math.round((natal - hoje) / 864e5);
  const en = lang === 'en';
  let contagem;
  if (d > 1) contagem = en ? `${d} days until Christmas` : `faltam ${d} dias pro Natal`;
  else if (d === 1) contagem = en ? '1 day until Christmas' : 'falta 1 dia pro Natal';
  else if (d === 0) contagem = en ? "it's Christmas!" : 'é Natal!';
  else contagem = en ? 'happy holidays!' : 'boas festas!';
  return {
    selo: en ? 'XMAS' : 'NATAL',
    contagem,
    detalhe: d >= 0
      ? (en ? 'UGC content for holiday campaigns' : 'conteúdo UGC pra campanha de fim de ano')
      : (en ? "let's plan your next campaigns" : 'bora planejar as próximas campanhas'),
    cta: d >= 0 ? (en ? 'book a spot' : 'reservar agenda') : (en ? 'get in touch' : 'fale comigo'),
  };
}
function pintarFaixa(faixa, lang) {
  const t = textosFaixa(lang);
  faixa.querySelector('.nf-selo').textContent = t.selo;
  faixa.querySelector('.nf-contagem').textContent = t.contagem;
  faixa.querySelector('.nf-detalhe').textContent = t.detalhe;
  faixa.querySelector('.nf-cta').textContent = t.cta + ' →';
}
function criarFaixa(destino) {
  const a = el('a', 'natal-faixa',
    '<span class="nf-selo"></span><strong class="nf-contagem"></strong>' +
    '<span class="nf-detalhe"></span><span class="nf-cta"></span>');
  a.href = destino;
  return a;
}

/* ---------- neve ---------- */
function neve({ cores, zIndex, contorno }) {
  if (REDUZIR) return;
  const c = el('canvas', 'natal-neve');
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${zIndex}`;
  document.body.appendChild(c);
  const g = c.getContext('2d');
  let W, H, flocos = [];
  function medir() {
    const r = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    c.width = W * r; c.height = H * r; g.setTransform(r, 0, 0, r, 0, 0);
    const n = W < 700 ? 22 : 48;
    flocos = Array.from({ length: n }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 1.6 + Math.random() * 2.8, v: .25 + Math.random() * .6,
      f: Math.random() * 6.28, cor: cores[i % cores.length], estrela: i % 7 === 0,
    }));
  }
  function quadro() {
    g.clearRect(0, 0, W, H);
    for (const p of flocos) {
      p.y += p.v; p.f += .012; p.x += Math.sin(p.f) * .35;
      if (p.y > H + 8) { p.y = -8; p.x = Math.random() * W; }
      g.beginPath();
      if (p.estrela) {
        const R = p.r * 2.2;
        g.strokeStyle = p.cor; g.lineWidth = 1.2;
        for (let k = 0; k < 3; k++) {
          const a = k * Math.PI / 3 + p.f * .4;
          g.moveTo(p.x - Math.cos(a) * R, p.y - Math.sin(a) * R);
          g.lineTo(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
        }
        g.stroke();
      } else {
        g.fillStyle = p.cor; g.arc(p.x, p.y, p.r, 0, 6.2832); g.fill();
        if (contorno) { g.strokeStyle = contorno; g.lineWidth = .6; g.stroke(); }
      }
    }
    requestAnimationFrame(quadro);
  }
  medir(); quadro();
  addEventListener('resize', medir);
}

/* redesenha enfeites que dependem da largura */
function aoRedimensionar(fn) {
  let t, w = -1;
  const rodar = () => { if (innerWidth !== w) { w = innerWidth; fn(); } };
  rodar();
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(rodar, 150); });
}

/* ---------- fotos em duas fileiras que correm em sentidos opostos ---------- */
function carrossel(grade, inserir) {
  if (!grade) return;
  const caixa = el('div', 'natal-fotos');
  const VELOCIDADE = 45;                        // pixels por segundo (igual nas duas fileiras)
  const montarFileiras = () => {
    const fotos = $$('img', grade).map(i => ({ src: i.getAttribute('src'), alt: i.alt, pos: i.style.objectPosition || 'center' }));
    if (!fotos.length) return;                  // sem fotos, a grade original continua
    if (!caixa.isConnected) inserir(caixa);
    grade.classList.add('natal-oculta');
    const vw = document.documentElement.clientWidth;
    const w = Math.round(Math.min(250, Math.max(150, vw * .135))), vao = vw < 640 ? 8 : 12;
    caixa.style.setProperty('--nf-w', w + 'px');
    caixa.style.setProperty('--nf-vao', vao + 'px');
    const meio = Math.ceil(fotos.length / 2);
    const fileiras = [fotos.slice(0, meio), fotos.slice(meio)].filter(f => f.length);
    // mesma quantidade de voltas e mesma duração nas duas fileiras: andam juntas, em sentidos opostos
    const voltas = Math.max(1, ...fileiras.map(l => Math.ceil(vw / (l.length * (w + vao)))));
    const largura = Math.max(...fileiras.map(l => l.length)) * voltas * (w + vao);
    const tempo = Math.round(largura / VELOCIDADE);
    caixa.innerHTML = fileiras.map((lista, n) => {
      const grupo = Array.from({ length: voltas }, () => lista).flat();
      const html = [...grupo, ...grupo].map((f, i) => {
        const copia = i >= lista.length;
        const img = el('img');
        img.setAttribute('src', f.src); img.alt = copia ? '' : f.alt; img.style.objectPosition = f.pos;
        if (copia) img.setAttribute('aria-hidden', 'true');
        return img.outerHTML;
      }).join('');
      return `<div class="nf-fileira${n % 2 ? ' nf-volta' : ''}"><div class="nf-trilho" style="animation-duration:${tempo}s">${html}</div></div>`;
    }).join('');
  };
  aoRedimensionar(montarFileiras);
  new MutationObserver(montarFileiras).observe(grade, { childList: true });
}

/* ============================================================================
   TEMA: Natal editorial (cereja, royal, creme, verde e dourado)
   ============================================================================ */
const CEREJA = '#8e1825', CEREJA2 = '#b02a38', CEREJA3 = '#651019', ROYAL = '#0049a4',
      CREME = '#f3eee9', OURO = '#b8934f', OURO2 = '#e3c98f',
      VERDES = ['#2f4a35', '#3d5c40', '#506f4a', '#6f7a3f', '#24392a'];

const svg = (vb, corpo, extra = '') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" ${extra}>${corpo}</svg>`;
const miolo = s => s.replace(/^<svg[^>]*>|<\/svg>$/g, '');
let uid = 0;

function laco(cor = CEREJA, sombra = CEREJA3) {
  return svg('0 0 120 130',
    `<path d="M55 44C46 70 34 96 20 116l18-6 8 16C54 100 62 70 66 48Z" fill="${cor}"/>
     <path d="M65 44c9 24 22 48 37 66l-19-3-6 17C70 100 58 70 54 48Z" fill="${sombra}"/>
     <path d="M58 40C42 12 10 6 5 24S24 60 58 48Z" fill="${cor}"/>
     <path d="M62 40c16-28 48-34 53-16S96 60 62 48Z" fill="${cor}"/>
     <path d="M55 42C40 30 24 26 16 32c8 12 24 16 39 12ZM65 42c15-12 31-16 39-10-8 12-24 16-39 12Z" fill="${sombra}"/>
     <path d="M12 22c8-8 24-5 34 6M108 22c-8-8-24-5-34 6" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/>
     <rect x="49" y="32" width="22" height="24" rx="8" fill="${cor}" stroke="${sombra}" stroke-width="2"/>`);
}

function bola(cor) {
  const id = 'nb' + (++uid);
  return svg('0 0 60 74',
    `<defs><radialGradient id="${id}" cx=".34" cy=".3" r=".8">
       <stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".28" stop-color="${cor}"/>
       <stop offset="1" stop-color="#14110d" stop-opacity=".9"/></radialGradient></defs>
     <circle cx="30" cy="10" r="4.5" fill="none" stroke="${OURO}" stroke-width="2"/>
     <rect x="22" y="12" width="16" height="9" rx="2" fill="${OURO}"/>
     <circle cx="30" cy="45" r="26" fill="${cor}"/><circle cx="30" cy="45" r="26" fill="url(#${id})" opacity=".85"/>
     <path d="M6 42q24 12 48 0" fill="none" stroke="${OURO2}" stroke-width="1.6" opacity=".9"/>
     <path d="M7 49q23 12 46 0" fill="none" stroke="${OURO2}" stroke-width=".8" opacity=".7"/>`);
}

/* um ramo de pinheiro ao longo de uma curva (traços finos em vários verdes) */
function ramagem(ponto, passos, comp, rnd) {
  const tracos = VERDES.map(() => '');
  for (let i = 0; i <= passos; i++) {
    const [x, y, a] = ponto(i / passos);
    for (let k = 0; k < 9; k++) {
      const lado = k % 2 ? 1 : -1;
      const ang = a + lado * (0.35 + rnd() * 1.0);
      const l = comp * (0.45 + rnd() * 0.7);
      const ox = x + (rnd() - .5) * 8, oy = y + (rnd() - .5) * 8;
      const c = Math.floor(rnd() * VERDES.length);
      tracos[c] += `M${f1(ox)} ${f1(oy)}q${f1(Math.cos(ang) * l * .55)} ${f1(Math.sin(ang) * l * .55 + 1)} ${f1(Math.cos(ang) * l)} ${f1(Math.sin(ang) * l + 3)}`;
    }
  }
  return tracos.map((d, c) => `<path d="${d}" fill="none" stroke="${VERDES[c]}" stroke-width="1.7" stroke-linecap="round"/>`).join('');
}
const frutos = (x, y) => `<g fill="${CEREJA}"><circle cx="${f1(x)}" cy="${f1(y)}" r="4.2"/><circle cx="${f1(x + 7)}" cy="${f1(y + 3)}" r="3.6"/><circle cx="${f1(x + 2)}" cy="${f1(y + 8)}" r="3.2"/></g>
  <circle cx="${f1(x - 1.4)}" cy="${f1(y - 1.4)}" r="1.1" fill="#fff" opacity=".7"/>`;

/* guirlanda com laços, frutos, luzes e bolas penduradas */
function guirlanda(largura, fina) {
  const celular = largura < 720;
  const n = Math.max(2, Math.round(largura / (fina ? 300 : 360))), vao = largura / n;
  const y0 = 14, cy = fina ? 40 : celular ? 52 : 78, comp = fina ? 13 : celular ? 15 : 21, H = fina ? 64 : celular ? 100 : 150;
  const rnd = aleatorio(2512);
  let verde = '', enfeites = '', pendurados = '', lacos = '';
  const cores = [CEREJA, OURO, ROYAL];
  for (let i = 0; i < n; i++) {
    const x0 = i * vao;
    const ponto = t => {
      const x = x0 + vao * t, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y0;
      return [x, y, Math.atan2(2 * (1 - 2 * t) * (cy - y0), vao)];
    };
    verde += ramagem(ponto, Math.round(vao / 7), comp, rnd);
    for (let j = 1; j <= 7; j++) {
      const [x, y] = ponto(j / 8);
      if (j % 2) enfeites += frutos(x + (rnd() - .5) * 8, y + (rnd() - .5) * 10);
      else enfeites += `<circle cx="${f1(x)}" cy="${f1(y + 2)}" r="${celular ? 5 : 7}" fill="${cores[(i + j / 2) % 3 | 0]}"/><circle cx="${f1(x - 2)}" cy="${f1(y)}" r="1.6" fill="#fff" opacity=".7"/>`;
      const [lx, ly] = ponto((j - .5) / 8);
      enfeites += `<circle class="n-luz" style="animation-delay:${((i * 7 + j) % 5) * .45}s" cx="${f1(lx)}" cy="${f1(ly + (rnd() - .5) * 14)}" r="2.2" fill="#ffe9ae"/>`;
    }
  }
  for (let i = 0; i <= n; i++) {
    const x = Math.min(Math.max(i * vao, 22), largura - 22), w = fina ? 36 : celular ? 36 : 54;
    const fio = (celular ? 22 : 44) + (i % 2) * (celular ? 10 : 24), bw = celular ? 18 : 27;
    if (!fina && (!celular || i === 0 || i === n))
      pendurados += `<g class="n-balanca" style="transform-origin:${f1(x)}px ${y0}px;animation-delay:-${i * 1.3}s">
        <path d="M${f1(x)} ${y0}V${y0 + fio}" stroke="${OURO}" stroke-width="1.2"/>
        <svg x="${f1(x - bw / 2)}" y="${y0 + fio - 4}" width="${bw}" height="${bw * 1.24}" viewBox="0 0 60 74">${miolo(bola(cores[(i + 1) % 3]))}</svg></g>`;
    lacos += `<svg x="${f1(x - w / 2)}" y="-4" width="${w}" height="${w * 1.08}" viewBox="0 0 120 130">${miolo(laco())}</svg>`;
  }
  return svg(`0 0 ${largura} ${H}`, pendurados + verde + enfeites + lacos, `width="${largura}" height="${H}"`);
}

/* raminho solto, para o canto da foto */
function raminho() {
  const rnd = aleatorio(77);
  const curva = (ax, ay, bx, by, cx, cy) => t => {
    const x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * bx + t * t * cx;
    const y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * by + t * t * cy;
    return [x, y, Math.atan2(2 * (1 - t) * (by - ay) + 2 * t * (cy - by), 2 * (1 - t) * (bx - ax) + 2 * t * (cx - bx))];
  };
  return svg('0 0 200 160',
    ramagem(curva(50, 112, 70, 40, 168, 22), 22, 26, rnd) + ramagem(curva(50, 112, 120, 150, 184, 118), 20, 24, rnd) +
    ramagem(curva(50, 112, 20, 90, 22, 40), 12, 22, rnd) + frutos(70, 80) + frutos(96, 112) + frutos(40, 92));
}

function caixa(x, y, w, h, c, f) {
  const m = x + w / 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}"/>
    <rect x="${x - 4}" y="${y}" width="${w + 8}" height="${h * .24}" rx="2" fill="${c}"/>
    <rect x="${x - 4}" y="${y + h * .24}" width="${w + 8}" height="3" fill="#14110d" opacity=".14"/>
    <rect x="${m - 5}" y="${y}" width="10" height="${h}" fill="${f}"/>
    <path d="M${m} ${y}c-8-18-28-16-22-5 4 6 14 6 22 5Zm0 0c8-18 28-16 22-5-4 6-14 6-22 5Z" fill="${f}"/>`;
}

function arvore() {
  const rnd = aleatorio(1225), topo = 40, base = 330, meio = 180;
  const tracos = VERDES.map(() => '');
  for (let y = topo; y <= base; y += 5) {
    const t = (y - topo) / (base - topo);
    const meiaL = 8 + 128 * t * (.82 + .18 * ((t * 6) % 1));
    for (let x = meio - meiaL; x <= meio + meiaL; x += 7) {
      const lado = (x - meio) / meiaL;
      for (let k = 0; k < 2; k++) {
        const ang = Math.PI / 2 - lado * 1.15 + (rnd() - .5) * .9, l = 9 + rnd() * 15;
        const c = Math.floor(rnd() * VERDES.length);
        tracos[c] += `M${f1(x + (rnd() - .5) * 6)} ${f1(y + (rnd() - .5) * 6)}l${f1(Math.cos(ang) * l)} ${f1(Math.sin(ang) * l)}`;
      }
    }
  }
  const verde = tracos.map((d, c) => `<path d="${d}" fill="none" stroke="${VERDES[c]}" stroke-width="2" stroke-linecap="round"/>`).join('');
  const fitas = [[130, 120, 200, 150, 218, 128], [105, 185, 195, 235, 255, 188], [75, 255, 190, 320, 290, 258]]
    .map(([a, b, c, d, e, f]) => `<path d="M${a} ${b}Q${c} ${d} ${e} ${f}" fill="none" stroke="${OURO2}" stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round"/>`).join('');
  const bolas = [[180,95,CEREJA,9],[158,136,OURO,8],[206,150,ROYAL,9],[135,182,CEREJA,10],[186,190,OURO,9],[232,208,CEREJA,9],[104,235,ROYAL,10],[160,240,OURO,9],[214,260,ROYAL,9],[262,276,OURO,9],[86,292,CEREJA,10],[148,296,CEREJA,8],[192,308,OURO,8]]
    .map(([x, y, c, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * .35}" cy="${y - r * .35}" r="${r * .22}" fill="#fff" opacity=".7"/>`).join('');
  const luzes = Array.from({ length: 30 }, (_, i) => {
    const y = topo + 30 + rnd() * (base - topo - 40), t = (y - topo) / (base - topo);
    return `<circle class="n-luz" style="animation-delay:${(i % 6) * .4}s" cx="${f1(meio + (rnd() - .5) * 220 * t)}" cy="${f1(y)}" r="2.4" fill="#ffe9ae"/>`;
  }).join('');
  return svg('0 0 360 420',
    `<ellipse cx="180" cy="396" rx="160" ry="12" fill="#14110d" opacity=".08"/>
     <rect x="166" y="318" width="28" height="60" fill="#5a3d28"/>
     ${verde}${fitas}${bolas}${luzes}
     <path d="M180 8l8 20 22 2-17 14 6 22-19-12-19 12 6-22-17-14 22-2Z" fill="${OURO}"/>
     <path d="M180 8v48l-19 10 6-22-17-14 22-2Z" fill="${OURO2}"/>
     ${caixa(48, 340, 76, 54, CEREJA, OURO2)}${caixa(228, 332, 62, 62, ROYAL, '#fffdfa')}${caixa(130, 358, 58, 38, '#eadfcd', CEREJA)}${caixa(298, 362, 42, 32, '#eadfcd', ROYAL)}`);
}

function meia(i) {
  const [c, d] = [[CEREJA, CREME], ['#fffdfa', CEREJA], [ROYAL, OURO2], ['#3d5c40', CREME]][i % 4];
  const trico = i % 2
    ? `<path d="M20 40h32M20 52h32" stroke="${d}" stroke-width="4"/><path d="M20 46l4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3" fill="none" stroke="${d}" stroke-width="1.5"/>`
    : `<g stroke="${d}" stroke-width="2" stroke-linecap="round"><path d="M36 38v20M26 48h20M29 41l14 14M43 41 29 55"/></g>`;
  return svg('0 0 70 104',
    `<path d="M20 22H52V58C52 66 50 70 46 74L28 94C16 106-2 88 9 76L20 63Z" fill="${c}" stroke="#14110d" stroke-opacity=".18"/>
     <path d="M9 76c9-3 21 7 19 18C16 106-2 88 9 76Z" fill="${d}"/><path d="M52 60c-9 0-14 6-14 14l8 0C50 70 52 66 52 60Z" fill="${d}"/>
     ${trico}
     <rect x="15" y="8" width="42" height="20" rx="6" fill="${i % 4 === 1 ? CEREJA : '#fffdfa'}" stroke="#14110d" stroke-opacity=".18"/>
     <path d="M22 11v14M29 11v14M36 11v14M43 11v14M50 11v14" stroke="#14110d" stroke-opacity=".1" stroke-width="2"/>
     <path d="M36 8V1" stroke="${OURO}" stroke-width="2"/>`);
}

function colarLaco(t) {
  $$('.n-ultima', t).forEach(s => s.replaceWith(document.createTextNode(s.textContent)));
  t.normalize();
  const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
  let ultimo = null, n;
  while ((n = w.nextNode())) if (n.nodeValue.trim()) ultimo = n;
  if (!ultimo) return;
  const txt = ultimo.nodeValue.trimEnd(), corte = txt.lastIndexOf(' ') + 1;
  const span = el('span', 'n-ultima', '');
  span.appendChild(document.createTextNode(txt.slice(corte)));
  span.appendChild(el('i', 'n-laco-fim'));
  ultimo.nodeValue = txt.slice(0, corte);
  ultimo.parentNode.insertBefore(span, ultimo.nextSibling);
}

function montar() {
  document.documentElement.classList.add('natal');
  const largura = () => document.documentElement.clientWidth;

  /* faixa dentro do cabeçalho */
  const cab = $('.cabecalho'), faixa = criarFaixa('#contato');
  cab.insertBefore(faixa, cab.firstChild);
  const lingua = () => (typeof idiomaAtual !== 'undefined' ? idiomaAtual : 'pt');
  pintarFaixa(faixa, lingua());
  document.addEventListener('click', e => { if (e.target.closest('.idioma-btn')) setTimeout(() => pintarFaixa(faixa, lingua()), 0); });
  const medirFaixa = () => {
    document.documentElement.style.setProperty('--natal-faixa', faixa.offsetHeight + 'px');
    document.documentElement.style.setProperty('--natal-cab', cab.offsetHeight + 'px');
  };
  medirFaixa(); addEventListener('resize', medirFaixa); document.fonts?.ready.then(medirFaixa);

  /* guirlanda no topo do hero */
  const hero = $('.hero');
  const g = deco('n-guirlanda'); hero.appendChild(g);
  aoRedimensionar(() => { g.innerHTML = guirlanda(largura()); });

  /* foto principal: moldura, laço e raminhos */
  const foto = $('.hero-foto');
  if (foto) {
    const caixaFoto = el('div', 'natal-foto');
    foto.parentNode.insertBefore(caixaFoto, foto);
    caixaFoto.appendChild(foto);
    foto.appendChild(deco('n-moldura'));
    caixaFoto.appendChild(deco('n-foto-laco', laco()));
    caixaFoto.appendChild(deco('n-foto-ramo', raminho()));
  }

  /* guirlanda fina presa na borda de cada título de seção (o varal já enfeita os serviços) */
  $$('.cabecalho-secao').forEach(c => {
    if (c.closest('#servicos')) return;
    const gt = deco('n-guirlanda-titulo'); c.appendChild(gt);
    aoRedimensionar(() => { gt.innerHTML = guirlanda(Math.max(c.clientWidth, 280), true); });
  });

  /* laço colado na última palavra de cada título: nunca fica sozinho na linha de baixo */
  $$('.titulo-secao').forEach(t => {
    const obs = new MutationObserver(() => { obs.disconnect(); colarLaco(t); obs.observe(t, { childList: true }); });
    colarLaco(t); obs.observe(t, { childList: true });
  });

  /* foto do "Sobre": mesma moldura de bengala doce da foto principal */
  const sobreFoto = $('.sobre-foto');
  if (sobreFoto) {
    const caixaSobre = el('div', 'natal-foto');
    sobreFoto.parentNode.insertBefore(caixaSobre, sobreFoto);
    caixaSobre.appendChild(sobreFoto);
    caixaSobre.appendChild(deco('n-moldura n-moldura-sobre'));
  }

  /* varal de meias antes dos serviços */
  const serv = $('#servicos');
  if (serv) {
    const varal = deco('n-varal');
    serv.insertBefore(varal, serv.firstChild);
    aoRedimensionar(() => {
      const w = largura(), n = w < 600 ? 4 : w < 1000 ? 6 : 9;
      let h = `<svg class="n-corda" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 4Q50 52 100 4" fill="none" stroke="${OURO}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, y = (4 + 96 * t * (1 - t)) * 46 / 40;
        h += `<span class="n-meia" style="left:${f1(t * 100)}%;top:${f1(y - 2)}px;--g:${f1((t - .5) * -14)}deg">${meia(i)}</span>`;
      }
      varal.innerHTML = h;
    });
  }

  /* fotos em carrossel, de ponta a ponta */
  const secFotos = $('#portfolio-fotos');
  carrossel($('#grade-fotos'), c => secFotos.after(c));

  /* árvore e presentes ao lado do formulário */
  $('.contato-coluna-info')?.appendChild(deco('n-arvore', arvore()));

  /* guirlanda no rodapé */
  const rodape = $('.rodape');
  if (rodape) {
    const gr = deco('n-guirlanda-rodape'); rodape.insertBefore(gr, rodape.firstChild);
    aoRedimensionar(() => { gr.innerHTML = guirlanda(largura()); });
  }

  neve({ cores: ['#ffffff', '#c9a45f', '#8fb0da'], zIndex: 900, contorno: 'rgba(0,73,164,.28)' });
}

if (ATIVO) montar();
})();
