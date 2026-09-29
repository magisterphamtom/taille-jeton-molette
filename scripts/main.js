/**
 * Taille des jetons à la molette
 * Alt + molette au-dessus d'un jeton : le grossit ou le réduit.
 * Foundry VTT v13 / v14.
 */

const ID = 'taille-jeton-molette';
const FLAG_ORIGINAL = 'original';

const LIMITS = {
  scale: { min: 0.2, max: 5 },   // échelle de l'image
  size:  { min: 0.5, max: 10 }   // taille en cases
};

const WHEEL_UNIT = 100;      // deltaY d'un cran de molette classique (en pixels)
const FLUSH_DELAY = 120;     // ms : regroupe les crans rapprochés en une seule mise à jour

const t = (key, data) => data ? game.i18n.format(`TJM.${key}`, data) : game.i18n.localize(`TJM.${key}`);
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const setting = (key) => game.settings.get(ID, key);

/* -------------------------------------------- */
/*  Réglages et raccourcis                      */
/* -------------------------------------------- */

Hooks.once('init', () => {
  game.settings.register(ID, 'mode', {
    name: 'TJM.Settings.Mode.Name',
    hint: 'TJM.Settings.Mode.Hint',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      scale: 'TJM.Settings.Mode.Scale',
      size: 'TJM.Settings.Mode.Size'
    },
    default: 'scale'
  });

  game.settings.register(ID, 'scaleStep', {
    name: 'TJM.Settings.ScaleStep.Name',
    hint: 'TJM.Settings.ScaleStep.Hint',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 0.01, max: 0.5, step: 0.01 },
    default: 0.05
  });

  game.settings.register(ID, 'sizeStep', {
    name: 'TJM.Settings.SizeStep.Name',
    hint: 'TJM.Settings.SizeStep.Hint',
    scope: 'world',
    config: true,
    type: Number,
    choices: { 0.5: '0,5', 1: '1' },
    default: 0.5
  });

  game.settings.register(ID, 'allowPlayers', {
    name: 'TJM.Settings.AllowPlayers.Name',
    hint: 'TJM.Settings.AllowPlayers.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(ID, 'modifier', {
    name: 'TJM.Settings.Modifier.Name',
    hint: 'TJM.Settings.Modifier.Hint',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      alt: 'TJM.Settings.Modifier.Alt',
      shiftAlt: 'TJM.Settings.Modifier.ShiftAlt'
    },
    default: 'alt'
  });

  game.settings.register(ID, 'invert', {
    name: 'TJM.Settings.Invert.Name',
    hint: 'TJM.Settings.Invert.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  game.keybindings.register(ID, 'reset', {
    name: 'TJM.Keys.Reset.Name',
    hint: 'TJM.Keys.Reset.Hint',
    editable: [{ key: 'Numpad0', modifiers: ['Alt'] }],
    onDown: () => { resetTokens(); return true; },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });

  // Capture sur window : on passe AVANT le gestionnaire de molette de Foundry
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
});

/* -------------------------------------------- */
/*  Molette                                     */
/* -------------------------------------------- */

let accumulated = 0;

function modifierMatches(event) {
  if (!event.altKey || event.ctrlKey || event.metaKey) return false;
  return setting('modifier') === 'shiftAlt' ? event.shiftKey : !event.shiftKey;
}

function canResize(token) {
  if (!token?.document) return false;
  if (game.user.isGM) return true;
  return setting('allowPlayers') && token.document.canUserModify(game.user, 'update');
}

/** Jetons visés : le jeton survolé ; s'il fait partie de la sélection, toute la sélection. */
function targetTokens() {
  const layer = canvas?.tokens;
  if (!canvas?.ready || !layer?.active) return [];
  const hovered = layer.hover;
  if (!hovered) return [];
  const list = hovered.controlled ? layer.controlled : [hovered];
  return list.filter(canResize);
}

function onWheel(event) {
  try {
    if (!modifierMatches(event)) return;
    // Uniquement sur le plateau de jeu, pas au-dessus d'une fenêtre ou de la barre latérale
    const board = canvas?.app?.view ?? document.getElementById('board');
    if (!board || event.target !== board) return;

    const tokens = targetTokens();
    if (!tokens.length) return;

    // On a la main : Foundry ne doit ni zoomer ni tourner le jeton
    event.preventDefault();
    event.stopImmediatePropagation();

    // Avec Maj enfoncé, certains navigateurs envoient la molette sur l'axe horizontal
    const delta = event.deltaY || event.deltaX;
    if (!delta) return;

    let steps;
    if (event.deltaMode === 1 || event.deltaMode === 2) steps = Math.sign(delta); // lignes / pages
    else {
      // pixels : un cran de souris ≈ 100 ; un pavé tactile envoie de petits deltas qu'on cumule
      accumulated += delta;
      steps = Math.trunc(accumulated / WHEEL_UNIT);
      accumulated -= steps * WHEEL_UNIT;
    }
    if (!steps) return;

    // Molette vers le haut (delta négatif) = grossir
    let direction = -steps;
    if (setting('invert')) direction = -direction;
    queueResize(tokens, direction);
  } catch (err) {
    console.error(`${ID} | Erreur pendant le redimensionnement à la molette`, err);
  }
}

/* -------------------------------------------- */
/*  Calcul et envoi des mises à jour             */
/* -------------------------------------------- */

const pending = new Map();  // tokenId -> { token, data }
let flushTimer = null;

function currentValues(token) {
  const doc = token.document;
  return pending.get(token.id)?.data ?? {
    scaleX: doc.texture.scaleX,
    scaleY: doc.texture.scaleY,
    width: doc.width,
    height: doc.height
  };
}

function queueResize(tokens, direction) {
  const mode = setting('mode');
  for (const token of tokens) {
    const cur = currentValues(token);
    const next = { ...cur };

    if (mode === 'size') {
      const step = Number(setting('sizeStep')) || 0.5;
      const { min, max } = LIMITS.size;
      // on garde les proportions : la plus petite dimension avance d'un pas
      const ratio = cur.height / cur.width;
      next.width = round(clamp(cur.width + direction * step, min, max));
      next.height = round(clamp(next.width * ratio, min, max));
      if (next.width === cur.width) continue;
    } else {
      const step = Number(setting('scaleStep')) || 0.05;
      const { min, max } = LIMITS.scale;
      const absX = Math.abs(cur.scaleX), absY = Math.abs(cur.scaleY);
      const newX = round(clamp(absX + direction * step, min, max));
      if (newX === round(absX)) continue;
      const newY = round(clamp(absY * (newX / absX), min, max));
      // le signe conserve l'effet miroir éventuel
      next.scaleX = Math.sign(cur.scaleX || 1) * newX;
      next.scaleY = Math.sign(cur.scaleY || 1) * newY;
    }

    pending.set(token.id, { token, data: next });
    showFeedback(token, next, mode);
  }

  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_DELAY);
}

function showFeedback(token, values, mode) {
  try {
    const text = mode === 'size'
      ? `${values.width} × ${values.height}`
      : `× ${Math.abs(values.scaleX).toFixed(2)}`;
    canvas.interface?.createScrollingText?.(token.center, text, {
      anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
      direction: CONST.TEXT_ANCHOR_POINTS.TOP,
      distance: token.h / 2,
      fontSize: 28,
      stroke: 0x000000,
      strokeThickness: 4,
      duration: 700
    });
  } catch (err) { /* purement cosmétique */ }
}

async function flush() {
  flushTimer = null;
  if (!pending.size) return;
  const batch = [...pending.values()];
  pending.clear();

  // Regroupe par scène (une seule requête par scène)
  const byScene = new Map();
  for (const { token, data } of batch) {
    const doc = token.document;
    if (!doc?.parent) continue;
    const update = { _id: doc.id };

    // Mémorise la taille d'origine au premier changement, pour pouvoir revenir en arrière
    if (!doc.getFlag(ID, FLAG_ORIGINAL)) {
      update[`flags.${ID}.${FLAG_ORIGINAL}`] = {
        scaleX: doc.texture.scaleX, scaleY: doc.texture.scaleY,
        width: doc.width, height: doc.height
      };
    }

    if (data.width !== doc.width || data.height !== doc.height) {
      // garde le centre du jeton au même endroit
      const gx = canvas.grid.sizeX ?? canvas.grid.size;
      const gy = canvas.grid.sizeY ?? canvas.grid.size;
      update.width = data.width;
      update.height = data.height;
      update.x = Math.round(doc.x - ((data.width - doc.width) * gx) / 2);
      update.y = Math.round(doc.y - ((data.height - doc.height) * gy) / 2);
    }
    if (data.scaleX !== doc.texture.scaleX || data.scaleY !== doc.texture.scaleY) {
      update['texture.scaleX'] = data.scaleX;
      update['texture.scaleY'] = data.scaleY;
    }

    if (!byScene.has(doc.parent)) byScene.set(doc.parent, []);
    byScene.get(doc.parent).push(update);
  }

  for (const [scene, updates] of byScene) {
    try {
      await scene.updateEmbeddedDocuments('Token', updates, { animate: false });
    } catch (err) {
      console.error(`${ID} | Échec de la mise à jour des jetons`, err, updates);
      ui.notifications.error(t('Errors.Update'));
    }
  }
}

/* -------------------------------------------- */
/*  Réinitialisation                            */
/* -------------------------------------------- */

async function resetTokens() {
  try {
    const layer = canvas?.tokens;
    if (!canvas?.ready || !layer) return;
    const hovered = layer.hover;
    const tokens = (hovered && !hovered.controlled ? [hovered] : layer.controlled).filter(canResize);
    const updates = [];
    for (const token of tokens) {
      const doc = token.document;
      const orig = doc.getFlag(ID, FLAG_ORIGINAL);
      if (!orig) continue;
      const gx = canvas.grid.sizeX ?? canvas.grid.size;
      const gy = canvas.grid.sizeY ?? canvas.grid.size;
      updates.push({
        _id: doc.id,
        'texture.scaleX': orig.scaleX,
        'texture.scaleY': orig.scaleY,
        width: orig.width,
        height: orig.height,
        x: Math.round(doc.x - ((orig.width - doc.width) * gx) / 2),
        y: Math.round(doc.y - ((orig.height - doc.height) * gy) / 2),
        [`flags.${ID}.${FLAG_ORIGINAL}`]: null
      });
    }
    if (!updates.length) {
      ui.notifications.info(t('Notifications.NothingToReset'));
      return;
    }
    await canvas.scene.updateEmbeddedDocuments('Token', updates, { animate: false });
  } catch (err) {
    console.error(`${ID} | Échec de la réinitialisation`, err);
    ui.notifications.error(t('Errors.Reset'));
  }
}
