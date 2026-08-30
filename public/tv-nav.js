// ============================================================
//  iSKETCH - MOTOR DE NAVEGACIÓN Y CONTROL PARA ANDROID TV / SMART TV
//  Soporte para D-Pad, Control Remoto, Gamepad y Puntero Virtual
// ============================================================

(function () {
  let isTvMode = false;
  let virtualCursor = { x: 400, y: 250, visible: false, isDrawing: false, speed: 6 };
  let cursorEl = null;

  // Detección automática de entorno TV
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ua.includes('android tv') || ua.includes('smart-tv') || ua.includes('googletv') || ua.includes('leanback') || ua.includes('crkey')) {
    isTvMode = true;
    document.documentElement.classList.add('tv-screen-mode');
  }

  function initTvNav() {
    createVirtualCursorElement();
    setupSpatialNavigation();
    setupGamepadSupport();
  }

  function createVirtualCursorElement() {
    if (document.getElementById('tvVirtualCursor')) return;
    cursorEl = document.createElement('div');
    cursorEl.id = 'tvVirtualCursor';
    cursorEl.style.cssText = `
      position: absolute;
      width: 18px;
      height: 18px;
      border: 3px solid #ffcc00;
      border-radius: 50%;
      background: rgba(255, 204, 0, 0.4);
      box-shadow: 0 0 10px #ff9900, inset 0 0 4px #ffffff;
      pointer-events: none;
      transform: translate(-50%, -50%);
      display: none;
      z-index: 9999;
      transition: width 0.1s, height 0.1s;
    `;
    const boardFrame = document.getElementById('drawingBoardFrame');
    if (boardFrame) {
      boardFrame.style.position = 'relative';
      boardFrame.appendChild(cursorEl);
    } else {
      document.body.appendChild(cursorEl);
    }
  }

  function updateVirtualCursor() {
    if (!cursorEl) return;
    const canvas = document.getElementById('paintCanvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = (virtualCursor.x / 800) * rect.width;
    const clientY = (virtualCursor.y / 500) * rect.height;

    cursorEl.style.left = `${clientX}px`;
    cursorEl.style.top = `${clientY}px`;
    cursorEl.style.display = virtualCursor.visible ? 'block' : 'none';

    if (virtualCursor.isDrawing) {
      cursorEl.style.background = '#ff3300';
      cursorEl.style.transform = 'translate(-50%, -50%) scale(1.25)';
    } else {
      cursorEl.style.background = 'rgba(255, 204, 0, 0.4)';
      cursorEl.style.transform = 'translate(-50%, -50%) scale(1)';
    }
  }

  function getFocusableElements() {
    const selector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"], tr.room-row-item';
    const elements = Array.from(document.querySelectorAll(selector)).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    });
    return elements;
  }

  function findClosestElement(current, direction) {
    const focusables = getFocusableElements();
    if (!current || !focusables.includes(current)) {
      return focusables[0] || null;
    }

    const curRect = current.getBoundingClientRect();
    const curCenter = {
      x: curRect.left + curRect.width / 2,
      y: curRect.top + curRect.height / 2
    };

    let closest = null;
    let closestDist = Infinity;

    focusables.forEach(target => {
      if (target === current) return;
      const targetRect = target.getBoundingClientRect();
      const targetCenter = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2
      };

      const dx = targetCenter.x - curCenter.x;
      const dy = targetCenter.y - curCenter.y;

      let isValid = false;
      if (direction === 'up' && dy < -5 && Math.abs(dx) <= Math.abs(dy) * 2.5) isValid = true;
      if (direction === 'down' && dy > 5 && Math.abs(dx) <= Math.abs(dy) * 2.5) isValid = true;
      if (direction === 'left' && dx < -5 && Math.abs(dy) <= Math.abs(dx) * 2.5) isValid = true;
      if (direction === 'right' && dx > 5 && Math.abs(dy) <= Math.abs(dx) * 2.5) isValid = true;

      if (isValid) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = target;
        }
      }
    });

    return closest;
  }

  function setupSpatialNavigation() {
    window.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      const isDrawingScreen = (document.getElementById('gameScreen').style.display === 'flex');
      const isDrawer = (window.gameState && window.gameState.isDrawer);

      // Si el dibujante está en el lienzo de TV y usa el D-pad para dibujar
      if (isDrawingScreen && isDrawer && (active === document.body || active === document.getElementById('paintCanvas') || active === document.getElementById('drawingBoardFrame'))) {
        let moved = false;
        virtualCursor.visible = true;

        if (e.key === 'ArrowUp') { virtualCursor.y = Math.max(5, virtualCursor.y - virtualCursor.speed); moved = true; }
        if (e.key === 'ArrowDown') { virtualCursor.y = Math.min(495, virtualCursor.y + virtualCursor.speed); moved = true; }
        if (e.key === 'ArrowLeft') { virtualCursor.x = Math.max(5, virtualCursor.x - virtualCursor.speed); moved = true; }
        if (e.key === 'ArrowRight') { virtualCursor.x = Math.min(795, virtualCursor.x + virtualCursor.speed); moved = true; }

        if (moved) {
          e.preventDefault();
          updateVirtualCursor();

          if (virtualCursor.isDrawing) {
            // Simular evento de movimiento de trazo
            const canvas = document.getElementById('paintCanvas');
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const event = new MouseEvent('mousemove', {
                clientX: rect.left + (virtualCursor.x / 800) * rect.width,
                clientY: rect.top + (virtualCursor.y / 500) * rect.height
              });
              canvas.dispatchEvent(event);
            }
          }
          return;
        }

        if (e.key === 'Enter' || e.key === 'Select' || e.code === 'Space') {
          e.preventDefault();
          if (!virtualCursor.isDrawing) {
            virtualCursor.isDrawing = true;
            updateVirtualCursor();
            const canvas = document.getElementById('paintCanvas');
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const event = new MouseEvent('mousedown', {
                clientX: rect.left + (virtualCursor.x / 800) * rect.width,
                clientY: rect.top + (virtualCursor.y / 500) * rect.height
              });
              canvas.dispatchEvent(event);
            }
          }
          return;
        }
      }

      // Navegación D-pad estándar entre botones y elementos de UI
      let dir = null;
      if (e.key === 'ArrowUp') dir = 'up';
      if (e.key === 'ArrowDown') dir = 'down';
      if (e.key === 'ArrowLeft') dir = 'left';
      if (e.key === 'ArrowRight') dir = 'right';

      if (dir && (!active || active.tagName !== 'INPUT')) {
        const next = findClosestElement(active, dir);
        if (next) {
          e.preventDefault();
          next.focus();
          next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          if (window.soundEngine) window.soundEngine.playSfx('click');
        }
      }

      // Botón ATRÁS en control remoto de TV (Escape / Back)
      if (e.key === 'Escape' || e.key === 'Back' || e.key === 'BrowserBack') {
        const modal = document.querySelector('.modal-overlay-bg.show');
        if (modal) {
          modal.classList.remove('show');
          e.preventDefault();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.key === 'Select' || e.code === 'Space') {
        if (virtualCursor.isDrawing) {
          virtualCursor.isDrawing = false;
          updateVirtualCursor();
          const canvas = document.getElementById('paintCanvas');
          if (canvas) {
            const event = new MouseEvent('mouseup', {});
            window.dispatchEvent(event);
          }
        }
      }
    });
  }

  // Soporte de Gamepad para Smart TV / Android TV Consolas
  function setupGamepadSupport() {
    let lastPadTime = 0;

    function pollGamepad() {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];

      if (gp) {
        const now = Date.now();
        if (now - lastPadTime > 120) {
          // D-Pad del mando
          if (gp.buttons[12] && gp.buttons[12].pressed) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); lastPadTime = now; }
          if (gp.buttons[13] && gp.buttons[13].pressed) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })); lastPadTime = now; }
          if (gp.buttons[14] && gp.buttons[14].pressed) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })); lastPadTime = now; }
          if (gp.buttons[15] && gp.buttons[15].pressed) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); lastPadTime = now; }

          // Botón A / Cruz para Aceptar/Dibujar
          if (gp.buttons[0] && gp.buttons[0].pressed) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            lastPadTime = now;
          }
          // Botón B / Círculo para Cancelar/Atrás
          if (gp.buttons[1] && gp.buttons[1].pressed) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            lastPadTime = now;
          }
        }
      }
      requestAnimationFrame(pollGamepad);
    }
    requestAnimationFrame(pollGamepad);
  }

  window.addEventListener('DOMContentLoaded', initTvNav);
})();

