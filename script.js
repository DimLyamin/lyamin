(() => {
  'use strict';

  const config = window.PORTFOLIO_CONFIG || {};
  const clock = document.querySelector('#izhevsk-clock');
  // Ижевск — UTC+4; IANA Europe/Samara включает Удмуртию.
  // timeZone задан явно, поэтому часовой пояс посетителя не влияет на часы.
  const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Samara', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23',
  });
  const yearFormatter = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Samara', year: 'numeric' });
  const updateClock = () => {
    const now = new Date();
    clock.textContent = timeFormatter.format(now);
    clock.dateTime = now.toISOString();
    document.querySelector('#copyright-year').textContent = yearFormatter.format(now);
  };
  updateClock();
  setInterval(updateClock, 1000);
  document.addEventListener('visibilitychange', updateClock);

  const seconds = Number(config.cycleSeconds);
  const defaultCycleMilliseconds = (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000;
  document.documentElement.style.setProperty('--cycle', `${defaultCycleMilliseconds / 1000}s`);

  document.querySelectorAll('[data-contact]').forEach(link => {
    const key = link.dataset.contact;
    const value = typeof config[key] === 'string' ? config[key].trim() : '';
    if (!value) {
      link.title = 'Ссылка пока не указана';
      return;
    }
    if (key === 'email') {
      const address = value.replace(/^mailto:/i, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return;
      link.href = `mailto:${address}`;
    } else if (key === 'cv') {
      if (!value.startsWith('assets/') || value.includes('..')) return;
      link.href = value;
      link.download = value.split('/').pop();
    } else {
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return;
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } catch { return; }
    }
    link.removeAttribute('aria-disabled');
  });

  const translations = {
    en: {
      city: 'Izhevsk', name: 'Dmitry Lyamin', cv: 'Download CV', pause: 'Pause', play: 'Play', previous: 'Previous project', next: 'Next project',
      bio: 'Interface and communication designer, leading project designers. I design complex interfaces — CRM, ERP and customer portals — build design systems and improve processes.',
      manufakturaTitle: 'Manufaktura', manufakturaPeriod: 'Feb 2021 – present',
      manufakturaDescription: 'I lead key GovTech and B2B projects, overseeing the design system, product hypotheses and the growth of our design team. I launched and continue developing the design system for the Moscow Government’s unified digital platform. I create animated designs for a monitoring dashboard to demonstrate its functionality.',
      scadaTitle: 'Scada', scadaPeriod: 'Aug 2022 – Apr 2023',
      scadaDescription: 'Contract work: customer portals for financial products, responsive layouts, website concepts, UI components and microanimations. Projects under NDA.',
      taptaxiTitle: 'TapTaxi', taptaxiPeriod: 'Jan 2017 – Feb 2021',
      taptaxiDescription: 'A platform for creating and dispatching taxi orders. Qualitative research: in-depth interviews, observation and card sorting. I designed animated prototypes and final UI for the CRM, passenger apps (iOS/Android) and driver terminals (Android), along with communication design for billboards and vehicle branding.',
      galamentTitle: 'Galament', galamentPeriod: 'Jun 2015 – Jan 2017',
      galamentDescription: 'CRM and customer portal UI design for trading exchanges in B2B and B2C markets. Clients: BKS Forex, Alfa-Forex, GMT, Rodeler, Goodwood and Smart tel.',
      selfTitle: 'Self-promotion', selfPeriod: 'Since Sep 2007',
      selfDescription: 'As an independent designer, I create digital products, websites, mobile apps and customer portals, develop visual identities and brand systems, and design UI microanimations.',
    },
    ru: {},
  };
  const textNodes = [...document.querySelectorAll('[data-i18n]')];
  textNodes.forEach(node => { translations.ru[node.dataset.i18n] = node.textContent; });
  translations.ru.play = 'Продолжить';
  translations.ru.previous = 'Предыдущая работа';
  translations.ru.next = 'Следующая работа';
  let language = 'ru';

  const projectRegistry = new Map();
  const projectMetadata = window.PORTFOLIO_PROJECTS || {};
  const projectKey = src => decodeURIComponent(src.split('/').pop()).replace(/\.[^.]+$/, '').replace(/-\d{1,2}$/, '');
  const projectName = key => projectMetadata[key]?.title || key.split('-').map(word => {
    if (word === 'taptaxi') return 'TapTaxi';
    if (word === 'crm' || word === 'lnp') return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
  document.querySelectorAll('.project-card, .graphic-card').forEach(card => {
    const images = [...card.querySelectorAll('img')];
    const key = projectKey(images[0].getAttribute('src'));
    const section = card.closest('section');
    if (!projectRegistry.has(key)) projectRegistry.set(key, { key, title: projectName(key), section, images: [] });
    const project = projectRegistry.get(key);
    images.forEach(image => {
      const src = image.getAttribute('src');
      if (!project.images.some(item => item.src === src)) project.images.push({ src });
    });
    card.dataset.project = key;
    card.dataset.projectImage = images[0].getAttribute('src');
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', project.title);
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'project-open';
    open.setAttribute('aria-haspopup', 'dialog');
    card.append(open);
  });
  projectRegistry.forEach(project => project.images.sort((a, b) => a.src.localeCompare(b.src, undefined, { numeric: true })));

  const modal = document.querySelector('#project-modal');
  const modalImage = document.querySelector('#project-image');
  const modalTitle = document.querySelector('#project-title');
  const modalDescription = document.querySelector('#project-description');
  const modalCounter = document.querySelector('#project-counter');
  const thumbnails = modal.querySelector('.project-modal-thumbnails');
  const modalNavigation = modal.querySelector('.project-modal-navigation');
  const modalClose = modal.querySelector('.project-modal-close');
  const imageToggle = modal.querySelector('.project-image-toggle');
  const resetZoom = () => {
    imageToggle.setAttribute('aria-pressed', 'false');
    imageToggle.setAttribute('aria-label', language === 'ru' ? 'Увеличить изображение' : 'Enlarge image');
    imageToggle.querySelector('span').textContent = language === 'ru' ? 'Увеличить' : 'Enlarge';
  };
  let currentProject = null;
  let currentImage = 0;
  let modalOpener = null;
  const renderProject = () => {
    if (!currentProject) return;
    resetZoom();
    const project = currentProject;
    modalTitle.textContent = project.title;
    modalDescription.textContent = projectMetadata[project.key]?.[language] || (language === 'ru'
      ? `Работа «${project.title}» из подборки самостоятельных проектов: цифровой и графический дизайн.`
      : `“${project.title}” from the independent project collection: digital and graphic design.`);
    document.querySelector('#project-company').textContent = project.section.querySelector('h2').textContent;
    modalImage.src = project.images[currentImage].src;
    modalImage.alt = `${project.title} — ${language === 'ru' ? 'кадр' : 'image'} ${currentImage + 1}`;
    modalCounter.textContent = `${currentImage + 1} / ${project.images.length}`;
    modalNavigation.hidden = project.images.length < 2;
    modalClose.setAttribute('aria-label', language === 'ru' ? 'Закрыть проект' : 'Close project');
    modal.querySelector('[data-project-step="-1"]').setAttribute('aria-label', language === 'ru' ? 'Предыдущий кадр' : 'Previous image');
    modal.querySelector('[data-project-step="1"]').setAttribute('aria-label', language === 'ru' ? 'Следующий кадр' : 'Next image');
    thumbnails.setAttribute('aria-label', language === 'ru' ? 'Изображения проекта' : 'Project images');
    thumbnails.replaceChildren(...project.images.map((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-thumbnail';
      button.dataset.imageIndex = index;
      button.setAttribute('aria-label', `${language === 'ru' ? 'Кадр' : 'Image'} ${index + 1}`);
      button.setAttribute('aria-pressed', String(index === currentImage));
      const image = document.createElement('img');
      image.src = item.src;
      image.alt = '';
      image.loading = 'lazy';
      button.append(image);
      return button;
    }));
  };
  const showProject = card => {
    currentProject = projectRegistry.get(card.dataset.project);
    if (!currentProject) return;
    currentImage = Math.max(0, currentProject.images.findIndex(image => image.src === card.dataset.projectImage));
    modalOpener = card.closest('[aria-hidden="true"]') ? card.closest('.gallery') : card.querySelector('.project-open');
    renderProject();
    document.body.classList.add('project-is-open');
    modal.showModal();
    modal.scrollTop = 0;
    modalClose.focus({ preventScroll: true });
    const selected = thumbnails.querySelector('[aria-pressed="true"]');
    if (selected) thumbnails.scrollLeft = Math.max(0, selected.offsetLeft - (thumbnails.clientWidth - selected.offsetWidth) / 2);
  };
  const changeImage = index => {
    if (!currentProject) return;
    const count = currentProject.images.length;
    currentImage = (index + count) % count;
    // Keep the clicked navigation control focused when thumbnails are refreshed.
    const focusedIndex = document.activeElement?.dataset.imageIndex;
    renderProject();
    if (focusedIndex !== undefined) thumbnails.querySelector(`[data-image-index="${currentImage}"]`).focus({ preventScroll: true });
    const selected = thumbnails.querySelector('[aria-pressed="true"]');
    if (selected) thumbnails.scrollLeft = Math.max(0, selected.offsetLeft - (thumbnails.clientWidth - selected.offsetWidth) / 2);
  };
  modalClose.addEventListener('click', () => modal.close());
  imageToggle.addEventListener('click', () => {
    const enlarged = imageToggle.getAttribute('aria-pressed') !== 'true';
    imageToggle.setAttribute('aria-pressed', String(enlarged));
    imageToggle.setAttribute('aria-label', enlarged ? (language === 'ru' ? 'По размеру окна' : 'Fit to window') : (language === 'ru' ? 'Увеличить изображение' : 'Enlarge image'));
    imageToggle.querySelector('span').textContent = enlarged ? (language === 'ru' ? 'По размеру окна' : 'Fit to window') : (language === 'ru' ? 'Увеличить' : 'Enlarge');
  });
  let backdropPointer = false;
  modal.addEventListener('pointerdown', event => { backdropPointer = event.target === modal; });
  modal.addEventListener('click', event => { if (backdropPointer && event.target === modal) modal.close(); });
  modal.addEventListener('close', () => {
    document.body.classList.remove('project-is-open');
    modalOpener?.focus({ preventScroll: true });
  });
  modal.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    changeImage(currentImage + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  modal.querySelectorAll('[data-project-step]').forEach(button => button.addEventListener('click', () => changeImage(currentImage + Number(button.dataset.projectStep))));
  thumbnails.addEventListener('click', event => {
    const button = event.target.closest('[data-image-index]');
    if (button) changeImage(Number(button.dataset.imageIndex));
  });
  document.querySelector('.art-grid').addEventListener('click', event => {
    const open = event.target.closest('.project-open');
    if (open) showProject(open.closest('.graphic-card'));
  });

  const galleries = [...document.querySelectorAll('.gallery')];
  galleries.forEach(gallery => {
    const gallerySeconds = Number(gallery.dataset.cycleSeconds);
    const cycleMilliseconds = Number.isFinite(gallerySeconds) && gallerySeconds > 0
      ? gallerySeconds * 1000 : defaultCycleMilliseconds;
    gallery.style.setProperty('--cycle', `${cycleMilliseconds / 1000}s`);
    const group = gallery.querySelector('.gallery-group');
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    // The repeating half remains clickable, but does not duplicate keyboard stops.
    clone.querySelectorAll('.project-open').forEach(button => { button.tabIndex = -1; });
    gallery.querySelector('.gallery-track').append(clone);
    const toggle = gallery.querySelector('.gallery-toggle');
    const controls = document.createElement('div');
    controls.className = 'gallery-controls';
    const previous = document.createElement('button');
    const next = document.createElement('button');
    previous.type = next.type = 'button';
    previous.className = next.className = 'gallery-arrow';
    previous.dataset.direction = '-1';
    next.dataset.direction = '1';
    previous.textContent = '←';
    next.textContent = '→';
    controls.append(previous, toggle, next);
    gallery.append(controls);

    const track = gallery.querySelector('.gallery-track');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let seekFrame = 0;
    let pointer = null;
    let suppressClick = false;
    const animation = () => track.getAnimations()[0];
    const normalize = time => ((time % cycleMilliseconds) + cycleMilliseconds) % cycleMilliseconds;
    const stopSeek = () => {
      cancelAnimationFrame(seekFrame);
      seekFrame = 0;
      gallery.dataset.seeking = 'false';
    };
    const moveBy = pixels => {
      stopSeek();
      const active = animation();
      if (!active) {
        gallery.scrollLeft += pixels;
        return;
      }
      const width = group.getBoundingClientRect().width;
      if (width) active.currentTime = normalize((active.currentTime || 0) + pixels / width * cycleMilliseconds);
    };
    const step = direction => {
      stopSeek();
      const card = group.querySelector('.project-card');
      const pixels = direction * (card.getBoundingClientRect().width + parseFloat(getComputedStyle(group).columnGap));
      const active = animation();
      if (!active) {
        gallery.scrollBy({ left: pixels, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        return;
      }
      gallery.dataset.seeking = 'true';
      const startTime = active.currentTime || 0;
      const travelTime = pixels / group.getBoundingClientRect().width * cycleMilliseconds;
      const started = performance.now();
      const tick = now => {
        const progress = Math.min(1, (now - started) / 350);
        const eased = 1 - (1 - progress) ** 3;
        active.currentTime = normalize(startTime + travelTime * eased);
        if (progress < 1) seekFrame = requestAnimationFrame(tick);
        else stopSeek();
      };
      seekFrame = requestAnimationFrame(tick);
    };
    previous.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    gallery.addEventListener('scroll', () => { controls.style.transform = `translateX(${gallery.scrollLeft}px)`; }, { passive: true });
    gallery.addEventListener('wheel', event => {
      if (event.ctrlKey) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      // Вертикальное колесо прокручивает страницу, даже когда лента на паузе.
      // Перехватываем только горизонтальный жест или Shift + колесо.
      if (!horizontal && !event.shiftKey) return;
      const delta = horizontal ? event.deltaX : (event.deltaY || event.deltaX);
      if (!delta) return;
      event.preventDefault();
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? gallery.clientWidth : 1;
      moveBy(delta * units);
    }, { passive: false });
    gallery.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary || event.target.closest('.gallery-controls, a')) return;
      stopSeek();
      suppressClick = false;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, horizontal: false };
      gallery.dataset.dragging = 'true';
    });
    gallery.addEventListener('pointermove', event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      if (!pointer.horizontal) {
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
        pointer.horizontal = true;
        suppressClick = true;
        gallery.setPointerCapture(event.pointerId);
      }
      moveBy(pointer.lastX - event.clientX);
      pointer.lastX = event.clientX;
    });
    const endDrag = event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      pointer = null;
      gallery.dataset.dragging = 'false';
    };
    gallery.addEventListener('pointerup', endDrag);
    gallery.addEventListener('pointercancel', endDrag);
    gallery.addEventListener('lostpointercapture', endDrag);
    gallery.addEventListener('click', event => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      const open = event.target.closest('.project-open');
      if (open) showProject(open.closest('.project-card'));
    });
    gallery.addEventListener('dragstart', event => event.preventDefault());
    reducedMotion.addEventListener('change', () => { stopSeek(); gallery.scrollLeft = 0; });
    toggle.addEventListener('click', () => {
      const paused = gallery.dataset.paused !== 'true';
      gallery.dataset.paused = String(paused);
      gallery.dataset.focusPlay = String(!paused);
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.dataset.i18n = paused ? 'play' : 'pause';
      toggle.textContent = translations[language][toggle.dataset.i18n];
    });
    gallery.addEventListener('keydown', event => {
      if (event.target === gallery && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        step(event.key === 'ArrowLeft' ? -1 : 1);
      }
      if (event.target === gallery && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        toggle.click();
      }
    });
    gallery.classList.add('is-ready');
  });

  const setLanguage = next => {
    if (!translations[next]) return;
    language = next;
    document.documentElement.lang = next;
    document.title = next === 'ru' ? 'Дмитрий Лямин — дизайнер' : 'Dmitry Lyamin — designer';
    textNodes.forEach(node => { node.textContent = translations[next][node.dataset.i18n] ?? translations.ru[node.dataset.i18n]; });
    document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === next)));
    clock.setAttribute('aria-label', next === 'ru' ? 'Текущее время в Ижевске' : 'Current time in Izhevsk');
    document.querySelector('.language-switch').setAttribute('aria-label', next === 'ru' ? 'Язык сайта' : 'Website language');
    document.querySelector('.contacts').setAttribute('aria-label', next === 'ru' ? 'Контакты' : 'Contacts');
    document.querySelector('.portrait').alt = translations[next].name;
    galleries.forEach(gallery => {
      const title = gallery.closest('section').querySelector('h2').textContent;
      gallery.setAttribute('aria-label', `${next === 'ru' ? 'Проекты' : 'Projects'} — ${title}`);
      gallery.querySelector('[data-direction="-1"]').setAttribute('aria-label', translations[next].previous);
      gallery.querySelector('[data-direction="1"]').setAttribute('aria-label', translations[next].next);
    });
    document.querySelectorAll('.project-open').forEach(button => button.setAttribute('aria-label', `${next === 'ru' ? 'Открыть проект' : 'Open project'} ${button.closest('[data-project]').getAttribute('aria-label')}`));
    if (modal.open) renderProject();
    try { localStorage.setItem('portfolio-language', next); } catch { /* Storage can be unavailable in private browsing. */ }
  };
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  try { setLanguage(localStorage.getItem('portfolio-language') || 'ru'); } catch { setLanguage('ru'); }
})();
