/* movimento.js — movimento DESTE site (specs/design.md §10). Só transform e opacity; rolagem por window.aoRolar
   (main.js), nunca addEventListener('scroll'); medidas fora do handler (carga e resize). main.js e base.css não se editam.
   1. Assinatura 1 (herói): foto 1.06 → 1, fio da moldura se desenha, texto escalonado (classe .pronto no <html>);
      parallax leve (≤ 6% da foto) só no computador.
   2. Assinatura 2 (Como é a sua sessão): passos entram um a um (120 ms) e, ≥ 900px, a imagem troca por crossfade
      conforme o passo mais próximo do centro da tela.
   3. ?heroi=1|2|3 no index: troca a imagem do herói (escolha do gerente de revisão).
   4. FAQ: um item aberto por vez. 5. Hub: filtro por objetivo (chips).
   6. Separador "·": some quando quebra a linha (mede na carga, nas fontes e no resize; nunca na rolagem). */
(function () {
  'use strict';
  var raiz = document.documentElement;
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var computador = window.matchMedia('(min-width: 900px)');

  /* 3. Opções de herói para a revisão (antes da entrada, para a foto certa entrar animada) */
  var arcoHeroi = document.querySelector('[data-heroi-opcoes]');
  var escolha = new URLSearchParams(location.search).get('heroi');
  if (arcoHeroi && escolha && escolha !== '1') {
    try {
      var op = JSON.parse(arcoHeroi.getAttribute('data-heroi-opcoes'))[escolha];
      if (op) {
        var fontes = arcoHeroi.querySelectorAll('source');
        fontes[0].srcset = op.cel; fontes[1].srcset = op.pc;
        var img = arcoHeroi.querySelector('img');
        img.src = op.src;
        arcoHeroi.classList.remove('arco--teto-416');
        if (op.cls) arcoHeroi.classList.add(op.cls);
        arcoHeroi.setAttribute('data-opcao', escolha);
      }
    } catch (e) { /* opção inválida: fica a 1 */ }
  }

  /* 1a. Fio da moldura: com vector-effect non-scaling-stroke o tracejado é medido em pixels de tela, então o
     comprimento do contorno é calculado na escala real da moldura (uma vez, na carga) e vira --len. */
  if (!reduzir) document.querySelectorAll('[data-heroi] .arco__moldura').forEach(function (svg) {
    var path = svg.querySelector('path');
    var w = svg.clientWidth || svg.getBoundingClientRect().width, h = svg.clientHeight || svg.getBoundingClientRect().height;
    if (!path || !w) return;
    var total = path.getTotalLength(), len = 0, ant = null;
    for (var i = 0; i <= 200; i++) {
      var pt = path.getPointAtLength(total * i / 200), x = pt.x * w / 100, y = pt.y * h / 100;
      if (ant) len += Math.hypot(x - ant[0], y - ant[1]);
      ant = [x, y];
    }
    path.style.setProperty('--len', Math.ceil(len + 2) + 'px');
    setTimeout(function () { path.style.strokeDasharray = 'none'; }, 1600);
  });

  /* 1. Entrada do herói: dois quadros depois do primeiro desenho, para a transição partir do estado inicial */
  if (reduzir) raiz.classList.add('pronto');
  else requestAnimationFrame(function () { requestAnimationFrame(function () { raiz.classList.add('pronto'); }); });

  /* 1b. Parallax leve da foto do herói (só computador, ≤ 6% da altura da foto) */
  var heroiArco = document.querySelector('.heroi--split .heroi__arco');
  if (heroiArco && !reduzir) {
    var alturaArco = 0, fimHeroi = 1;
    var medirHeroi = function () {
      alturaArco = heroiArco.offsetHeight;
      var s = heroiArco.closest('section');
      fimHeroi = s ? s.offsetTop + s.offsetHeight : window.innerHeight;
      if (!computador.matches) heroiArco.style.transform = '';
    };
    medirHeroi();
    window.addEventListener('resize', medirHeroi);
    window.aoRolar(function (d) {
      if (!computador.matches || d.scroll > fimHeroi) return;
      var p = Math.min(1, d.scroll / fimHeroi);
      heroiArco.style.transform = 'translate3d(0,' + (-p * alturaArco * 0.06).toFixed(1) + 'px,0)';
    });
  }

  /* 2. Assinatura 2: entrada dos passos (120 ms entre eles) */
  var listas = document.querySelectorAll('.passos--seq');
  if (reduzir || !('IntersectionObserver' in window)) {
    listas.forEach(function (l) { l.classList.add('visto'); });
  } else {
    var obsPassos = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('visto');
        obsPassos.unobserve(en.target);
        /* depois da entrada, o atraso sai (senão a troca do passo ativo herda os 120 ms por passo) */
        setTimeout(function () { en.target.querySelectorAll('.passo').forEach(function (p) { p.style.setProperty('--i', '0'); }); }, 1200);
      });
    }, { threshold: 0.2 });
    listas.forEach(function (l) { obsPassos.observe(l); });
  }

  /* 2b. Crossfade da imagem pelo passo ativo (≥ 900px). Mede na carga e no resize; o handler só troca classe. */
  document.querySelectorAll('[data-sessao]').forEach(function (secao) {
    var midias = secao.querySelectorAll('.sessao__midia');
    var passos = secao.querySelectorAll('.passo');
    if (midias.length < 2 || !passos.length) return;
    var centros = [], ativo = -1;
    var medir = function () {
      centros = Array.prototype.map.call(passos, function (p) {
        var r = p.getBoundingClientRect();
        return r.top + (window.__lenis ? window.__lenis.scroll : window.scrollY) + r.height / 2;
      });
    };
    var marcar = function (i) {
      if (i === ativo) return;
      ativo = i;
      passos.forEach(function (p, k) { p.classList.toggle('ativo', k === i); });
      midias.forEach(function (m, k) { m.classList.toggle('ativo', k === Math.min(i, midias.length - 1)); });
    };
    window.addEventListener('load', medir);
    window.addEventListener('resize', medir);
    medir();
    window.aoRolar(function (d) {
      if (!computador.matches) { if (ativo !== 0) marcar(0); return; }
      var meio = d.scroll + window.innerHeight / 2, melhor = 0, dist = Infinity;
      for (var k = 0; k < centros.length; k++) {
        var x = Math.abs(centros[k] - meio);
        if (x < dist) { dist = x; melhor = k; }
      }
      marcar(melhor);
    });
  });

  /* 4. FAQ: um item aberto por vez */
  document.querySelectorAll('.faq').forEach(function (faq) {
    var itens = faq.querySelectorAll('details');
    itens.forEach(function (alvo) {
      alvo.addEventListener('toggle', function () {
        if (!alvo.open) return;
        itens.forEach(function (d) { if (d !== alvo && d.open) d.open = false; });
      });
    });
  });

  /* 5. Hub: filtro por objetivo */
  var chips = document.querySelectorAll('.chip[data-filtro]');
  var gradeHub = document.querySelector('.grade--hub');
  if (chips.length && gradeHub) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filtro');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
        gradeHub.classList.toggle('filtrada', f !== 'todos');
        gradeHub.querySelectorAll(':scope > li').forEach(function (li) {
          var card = li.querySelector('[data-grupos]');
          var mostra = f === 'todos' || (card && card.getAttribute('data-grupos').split(' ').indexOf(f) >= 0);
          li.hidden = !mostra;
          if (mostra) li.classList.add('visivel');
        });
      });
    });
  }

  /* 6. Separador "·" (helper sep() do build): se o bloco antes e o bloco depois ficam em linhas diferentes, o "·"
     sai e o bloco seguinte abre a linha. Em ordem, porque cada troca muda a linha dos seguintes. */
  var seps = document.querySelectorAll('.sep');
  if (seps.length) {
    var separar = function () {
      seps.forEach(function (s) { s.classList.remove('sep--linha'); });
      seps.forEach(function (s) {
        var a = s.previousElementSibling, b = s.nextElementSibling;
        if (!a || !b || getComputedStyle(s).display === 'none') return;
        var ra = a.getClientRects(), rb = b.getClientRects();
        if (!ra.length || !rb.length) return;
        if (Math.abs(rb[0].top - ra[ra.length - 1].top) > 2) s.classList.add('sep--linha');
      });
    };
    var pedido = 0;
    var agendar = function () { cancelAnimationFrame(pedido); pedido = requestAnimationFrame(separar); };
    separar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(separar);
    window.addEventListener('load', separar);
    window.addEventListener('resize', agendar);
  }
})();
