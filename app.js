const STORAGE_KEY = 'contadores_app_state_v1';
const THEME_KEY = 'contadores_app_theme_v1';

const defaultCounters = [
  { id: 'c-1', name: 'Contador 1', initialValue: 0, value: 0 },
  { id: 'c-2', name: 'Contador 2', initialValue: 0, value: 0 },
];

let counters = loadCounters();
let draggedId = null;

function loadCounters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultCounters);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error cargando contadores:', err);
  }
  return structuredClone(defaultCounters);
}

function saveCounters() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
  } catch (err) {
    console.error('Error guardando contadores:', err);
  }
}

/* Tema (Modo Oscuro / Claro) */
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const label = document.getElementById('theme-label');
  if (label) {
    label.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }
  const metaTheme = document.getElementById('meta-theme-color');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#141b2d' : '#ffffff');
  }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

function getSignState(val) {
  if (val > 0) return 'positive';
  if (val < 0) return 'negative';
  return 'zero';
}

function getSizeTier(val) {
  const len = String(val).length;
  if (len <= 3) return 'lg';
  if (len <= 5) return 'md';
  if (len <= 7) return 'sm';
  return 'xs';
}

/* Acciones de Contadores */
function createCounter(name, initialValue) {
  const cleanName = name.trim() || `Contador ${counters.length + 1}`;
  const numInitial = Number.isFinite(Number(initialValue)) ? Number(initialValue) : 0;

  counters.push({
    id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: cleanName,
    initialValue: numInitial,
    value: numInitial,
  });

  saveCounters();
  renderCounters();
}

function updateValue(id, delta) {
  const counter = counters.find((c) => c.id === id);
  if (!counter) return;
  counter.value += delta;
  saveCounters();
  updateCounterDOM(counter, delta > 0 ? 'anim-up' : 'anim-down');
}

function resetToZero(id) {
  const counter = counters.find((c) => c.id === id);
  if (!counter) return;
  counter.value = 0;
  saveCounters();
  updateCounterDOM(counter, 'anim-reset');
}

function setAndApplyInitialValue(id, newInitial) {
  const counter = counters.find((c) => c.id === id);
  if (!counter) return;
  const parsed = Number.isFinite(Number(newInitial)) ? Number(newInitial) : 0;
  counter.initialValue = parsed;
  counter.value = parsed;
  saveCounters();
  updateCounterDOM(counter, 'anim-reset');
}

function renameCounter(id, newName) {
  const counter = counters.find((c) => c.id === id);
  if (!counter) return;
  counter.name = newName.trim() || 'Contador';
  saveCounters();
}

function deleteCounter(id) {
  counters = counters.filter((c) => c.id !== id);
  saveCounters();
  renderCounters();
}

function reorderCounters(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const fromIndex = counters.findIndex((c) => c.id === fromId);
  const toIndex = counters.findIndex((c) => c.id === toId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = counters.splice(fromIndex, 1);
  counters.splice(toIndex, 0, moved);
  saveCounters();
}

function swapCardElements(grid, draggedEl, targetCard, targetId) {
  if (!draggedEl || !targetCard || draggedEl === targetCard) return;
  const allCards = [...grid.querySelectorAll('.counter-card')];
  const draggedIdx = allCards.indexOf(draggedEl);
  const targetIdx = allCards.indexOf(targetCard);

  if (draggedIdx < targetIdx) {
    grid.insertBefore(draggedEl, targetCard.nextSibling);
  } else {
    grid.insertBefore(draggedEl, targetCard);
  }
  reorderCounters(draggedId, targetId);
}

function updateCounterDOM(counter, animClass) {
  const card = document.querySelector(`.counter-card[data-id="${counter.id}"]`);
  if (!card) return;
  const valEl = card.querySelector('.counter-value');
  if (valEl) {
    valEl.textContent = counter.value;
    valEl.dataset.sign = getSignState(counter.value);
    valEl.dataset.size = getSizeTier(counter.value);
    if (animClass) {
      valEl.classList.remove('anim-up', 'anim-down', 'anim-reset');
      void valEl.offsetWidth;
      valEl.classList.add(animClass);
    }
  }
  const initInput = card.querySelector('.initial-value-input');
  if (initInput && document.activeElement !== initInput) {
    initInput.value = counter.initialValue;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderCounters() {
  const grid = document.getElementById('counters-grid');
  grid.innerHTML = '';

  counters.forEach((counter) => {
    const card = document.createElement('article');
    card.className = 'counter-card';
    card.dataset.id = counter.id;

    card.innerHTML = `
      <div class="card-top">
        <span class="drag-handle" title="Arrastrar para reubicar" aria-label="Arrastrar para reubicar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <circle cx="9" cy="6" r="1.8"></circle>
            <circle cx="15" cy="6" r="1.8"></circle>
            <circle cx="9" cy="12" r="1.8"></circle>
            <circle cx="15" cy="12" r="1.8"></circle>
            <circle cx="9" cy="18" r="1.8"></circle>
            <circle cx="15" cy="18" r="1.8"></circle>
          </svg>
        </span>
        <input
          type="text"
          class="counter-name-input"
          value="${escapeHtml(counter.name)}"
          aria-label="Nombre del contador"
          maxlength="50"
        />
        <button type="button" class="btn-delete" title="Eliminar contador" aria-label="Eliminar contador">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
          </svg>
        </button>
      </div>

      <div class="counter-display">
        <button type="button" class="btn-step btn-decrement" aria-label="Disminuir">−</button>
        <div class="counter-value-wrap">
          <span
            class="counter-value"
            data-sign="${getSignState(counter.value)}"
            data-size="${getSizeTier(counter.value)}"
            aria-live="polite"
          >${counter.value}</span>
        </div>
        <button type="button" class="btn-step btn-increment" aria-label="Aumentar">+</button>
      </div>

      <div class="card-controls">
        <div class="initial-config">
          <label>Valor inicial:</label>
          <div class="initial-input-group">
            <input
              type="number"
              class="initial-value-input"
              value="${counter.initialValue}"
              step="1"
              aria-label="Valor inicial"
            />
            <button type="button" class="btn btn-apply-initial" title="Fijar y aplicar valor inicial">
              Aplicar
            </button>
          </div>
        </div>

        <div class="reset-actions">
          <button type="button" class="btn btn-reset-zero">
            Reset a 0
          </button>
          <button type="button" class="btn btn-reset-initial" title="Volver al valor inicial">
            Al inicial
          </button>
        </div>
      </div>
    `;

    // Drag & Drop (Mouse + Pantalla Táctil) para reubicar la tarjeta
    const dragHandle = card.querySelector('.drag-handle');
    dragHandle.addEventListener('mousedown', () => {
      card.setAttribute('draggable', 'true');
    });
    dragHandle.addEventListener('mouseup', () => {
      card.removeAttribute('draggable');
    });

    card.addEventListener('dragstart', (e) => {
      draggedId = counter.id;
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', counter.id);
    });

    card.addEventListener('dragend', () => {
      card.removeAttribute('draggable');
      card.classList.remove('is-dragging');
      draggedId = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!draggedId || draggedId === counter.id) return;
      const draggedEl = document.querySelector(`.counter-card[data-id="${draggedId}"]`);
      swapCardElements(grid, draggedEl, card, counter.id);
    });

    // Soporte táctil en móviles desde el icono .drag-handle
    dragHandle.addEventListener(
      'touchstart',
      () => {
        draggedId = counter.id;
        card.classList.add('is-dragging');
      },
      { passive: true }
    );

    dragHandle.addEventListener(
      'touchmove',
      (e) => {
        if (!draggedId) return;
        e.preventDefault();
        const touch = e.touches[0];
        const elUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!elUnderFinger) return;
        const targetCard = elUnderFinger.closest('.counter-card');
        if (!targetCard || targetCard.dataset.id === draggedId) return;
        const draggedEl = document.querySelector(`.counter-card[data-id="${draggedId}"]`);
        swapCardElements(grid, draggedEl, targetCard, targetCard.dataset.id);
      },
      { passive: false }
    );

    dragHandle.addEventListener('touchend', () => {
      card.classList.remove('is-dragging');
      draggedId = null;
    });

    const nameInput = card.querySelector('.counter-name-input');
    nameInput.addEventListener('change', (e) => renameCounter(counter.id, e.target.value));
    nameInput.addEventListener('blur', (e) => renameCounter(counter.id, e.target.value));

    card.querySelector('.btn-decrement').addEventListener('click', () => updateValue(counter.id, -1));
    card.querySelector('.btn-increment').addEventListener('click', () => updateValue(counter.id, 1));

    const initInput = card.querySelector('.initial-value-input');
    card.querySelector('.btn-apply-initial').addEventListener('click', () => {
      setAndApplyInitialValue(counter.id, initInput.value);
    });
    initInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setAndApplyInitialValue(counter.id, initInput.value);
      }
    });

    card.querySelector('.btn-reset-zero').addEventListener('click', () => resetToZero(counter.id));
    card.querySelector('.btn-reset-initial').addEventListener('click', () => {
      setAndApplyInitialValue(counter.id, counter.initialValue);
    });

    card.querySelector('.btn-delete').addEventListener('click', () => deleteCounter(counter.id));

    grid.appendChild(card);
  });
}

/* Formulario para nuevo contador */
document.getElementById('create-counter-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const nameEl = document.getElementById('new-counter-name');
  const initEl = document.getElementById('new-counter-initial');

  createCounter(nameEl.value, initEl.value);

  nameEl.value = '';
  initEl.value = '0';
  nameEl.focus();
});

/* PWA: Service Worker & Botón Instalar */
let deferredInstallPrompt = null;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installBtn) installBtn.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker no registrado:', err);
    });
  });
}

initTheme();
renderCounters();
