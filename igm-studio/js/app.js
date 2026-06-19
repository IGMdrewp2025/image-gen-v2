'use strict';

const FAL_BASE = 'https://fal.run';
const FAL_API  = 'https://api.fal.ai';

const PRESETS = [
  { label: 'Golf action', prompt: 'TRIGGER mid-swing golf shot, epic course backdrop, golden hour, motion blur on club, photorealistic 8K' },
  { label: 'Studio portrait', prompt: 'TRIGGER confident studio portrait, clean dark background, professional lighting, sharp focus' },
  { label: 'YT thumbnail', prompt: 'TRIGGER pointing at camera, shocked expression, bold lighting, YouTube thumbnail, high contrast' },
  { label: 'Celebration', prompt: 'TRIGGER fist pump celebration, crowd in background, stadium energy, dynamic angle' },
  { label: 'Candid', prompt: 'TRIGGER laughing naturally, outdoor lifestyle, soft natural light, relaxed candid' },
  { label: 'Cinematic', prompt: 'TRIGGER dramatic cinematic portrait, side rim lighting, dark moody background, film grain' },
  { label: 'Editorial', prompt: 'TRIGGER editorial fashion photo, urban environment, looking off-camera, shallow depth of field' },
  { label: 'Press conf.', prompt: 'TRIGGER at press conference, microphone in front, intense focused expression, arena background' },
];

// ── State ──────────────────────────────────────────────────────────────────
let state = {
  clients: [],
  models: [],
  library: [],
  selectedModelId: null,
  trainingPhotos: [],
};

function getKey() {
  return localStorage.getItem('igm_fal_key') || '';
}

function loadState() {
  try {
    const raw = localStorage.getItem('igm_studio_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      state.clients = parsed.clients || [];
      state.models = parsed.models || [];
      state.library = parsed.library || [];
      state.selectedModelId = parsed.selectedModelId || null;
    }
  } catch (e) { /* ignore */ }
  const key = getKey();
  if (key) document.getElementById('apiKey').value = key;
}

function saveState() {
  try {
    localStorage.setItem('igm_studio_v2', JSON.stringify({
      clients: state.clients,
      models: state.models,
      library: state.library.slice(0, 200),
      selectedModelId: state.selectedModelId,
    }));
  } catch (e) { /* ignore */ }
}

// ── Tab routing ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'train') renderTrainSelect();
    if (btn.dataset.tab === 'generate') { renderModelCards(); renderPresets(); }
    if (btn.dataset.tab === 'library') renderLibrary();
    if (btn.dataset.tab === 'setup') renderClientList();
  });
});

// ── Setup tab ──────────────────────────────────────────────────────────────
document.getElementById('saveKeyBtn').addEventListener('click', () => {
  const val = document.getElementById('apiKey').value.trim();
  localStorage.setItem('igm_fal_key', val);
  flash('saveKeyBtn', 'Saved');
});

document.getElementById('toggleKey').addEventListener('click', () => {
  const el = document.getElementById('apiKey');
  el.type = el.type === 'password' ? 'text' : 'password';
});

document.getElementById('addClientBtn').addEventListener('click', () => {
  const input = document.getElementById('newClientName');
  const name = input.value.trim();
  if (!name) return;
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  state.clients.push({ id: Date.now(), name, initials });
  input.value = '';
  saveState();
  renderClientList();
  renderTrainSelect();
});

document.getElementById('newClientName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addClientBtn').click();
});

function renderClientList() {
  const el = document.getElementById('clientList');
  if (!state.clients.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:8px 0">No clients yet. Add one below.</p>';
    return;
  }
  el.innerHTML = state.clients.map(c => `
    <div class="client-row">
      <div class="client-avatar">${c.initials}</div>
      <span class="client-name">${c.name}</span>
      <button class="btn-ghost" onclick="removeClient(${c.id})" title="Remove"><i class="ti ti-trash" style="font-size:14px"></i></button>
    </div>
  `).join('');
}

window.removeClient = function(id) {
  state.clients = state.clients.filter(c => c.id !== id);
  saveState();
  renderClientList();
  renderTrainSelect();
};

// ── Train tab ──────────────────────────────────────────────────────────────
function renderTrainSelect() {
  const sel = document.getElementById('trainClient');
  const current = sel.value;
  sel.innerHTML = '<option value="">— select a client —</option>' +
    state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (current) sel.value = current;
}

document.getElementById('trainClient').addEventListener('change', function() {
  const client = state.clients.find(c => c.id == this.value);
  if (client) {
    document.getElementById('triggerWord').value = client.name.split(' ')[0].toUpperCase();
  }
});

document.getElementById('trainSteps').addEventListener('input', function() {
  document.getElementById('stepsReadout').textContent = this.value;
});

document.getElementById('photoInput').addEventListener('change', e => {
  addPhotos(Array.from(e.target.files));
});

const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  addPhotos(files);
});

document.getElementById('clearPhotosBtn').addEventListener('click', () => {
  state.trainingPhotos = [];
  renderThumbs();
});

function addPhotos(files) {
  const remaining = 50 - state.trainingPhotos.length;
  state.trainingPhotos = [...state.trainingPhotos, ...files.slice(0, remaining)];
  renderThumbs();
}

function renderThumbs() {
  document.getElementById('photoNum').textContent = state.trainingPhotos.length;
  const grid = document.getElementById('thumbGrid');
  grid.innerHTML = '';
  state.trainingPhotos.forEach((f, i) => {
    const url = URL.createObjectURL(f);
    const wrap = document.createElement('div');
    wrap.className = 'thumb-wrap';
    wrap.innerHTML = `
      <img class="thumb" src="${url}" alt="Photo ${i+1}" />
      <button class="thumb-rm" title="Remove">×</button>
    `;
    wrap.querySelector('.thumb-rm').addEventListener('click', () => {
      state.trainingPhotos.splice(i, 1);
      renderThumbs();
    });
    grid.appendChild(wrap);
  });
}

document.getElementById('trainBtn').addEventListener('click', startTraining);

// Poll fal.ai queue until job completes or fails
async function pollForResult(key, requestId, onProgress) {
  // Correct fal queue endpoints
  const ENDPOINT = 'fal-ai/flux-lora-fast-training';
  const statusUrl = 'https://queue.fal.run/' + ENDPOINT + '/requests/' + requestId + '/status';
  const resultUrl = 'https://queue.fal.run/' + ENDPOINT + '/requests/' + requestId;
  const start = Date.now();
  const maxMs = 35 * 60 * 1000; // 35 min timeout

  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 10000)); // poll every 10s

    const s = await safeFetch(statusUrl, { headers: { Authorization: 'Key ' + key } });
    console.log('Poll status response:', s.status, s.text.slice(0, 200));

    if (!s.ok || !s.data) {
      // transient — keep polling
      onProgress(Math.min(90, ((Date.now() - start) / (20 * 60 * 1000)) * 90));
      continue;
    }

    const st = (s.data.status || '').toUpperCase();

    if (st === 'COMPLETED') {
      onProgress(100);
      const r = await safeFetch(resultUrl, { headers: { Authorization: 'Key ' + key } });
      console.log('Training result response:', r.status, r.text.slice(0, 400));
      if (!r.ok) throw new Error('Training completed but result fetch failed (' + r.status + '): ' + r.text.slice(0, 200));
      return r.data;
    }

    if (st === 'FAILED' || st === 'CANCELLED') {
      // s.data.error may be string or object
      let errMsg = 'Training ' + st.toLowerCase();
      const e = s.data.error;
      if (e) errMsg += ': ' + (typeof e === 'string' ? e : JSON.stringify(e));
      throw new Error(errMsg);
    }

    // IN_QUEUE or IN_PROGRESS — estimate progress from time elapsed
    const elapsed = Date.now() - start;
    const steps = parseInt(document.getElementById('trainSteps').value);
    const estimatedMs = steps * 1000;
    const pct = Math.min(90, (elapsed / estimatedMs) * 90);
    onProgress(pct);
  }

  throw new Error('Training timed out after 35 minutes. Check your fal.ai dashboard.');
}

// Helper: safely extract a string error message from anything
function extractError(e, fallback) {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (typeof e === 'object') {
    return e.detail || e.error || e.message || e.msg || JSON.stringify(e);
  }
  return String(e);
}

// Helper: fetch and return { ok, status, data, text } without ever throwing
async function safeFetch(url, opts) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (_) {}
    return { ok: res.ok, status: res.status, data, text };
  } catch (networkErr) {
    return { ok: false, status: 0, data: null, text: String(networkErr) };
  }
}

async function startTraining() {
  const key = getKey();
  const clientId = document.getElementById('trainClient').value;
  const trigger = document.getElementById('triggerWord').value.trim().toUpperCase();
  const client = state.clients.find(c => c.id == clientId);

  if (!key) return setStatus('train', 'error', 'Add your fal.ai API key in Setup first.');
  if (!client) return setStatus('train', 'error', 'Select a client.');
  if (!trigger) return setStatus('train', 'error', 'Enter a trigger word.');
  if (state.trainingPhotos.length < 5) return setStatus('train', 'error', 'Upload at least 5 photos (20–50 recommended).');

  const btn = document.getElementById('trainBtn');
  btn.disabled = true;
  setProgress('train', 5);
  setStatus('train', '', 'Packaging photos into zip...');

  try {
    if (!window.JSZip) throw new Error('JSZip not loaded — wait a moment and try again.');

    const zip = new JSZip();
    for (const f of state.trainingPhotos) {
      const ab = await f.arrayBuffer();
      zip.file(f.name || `photo_${Date.now()}.jpg`, ab);
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

    setProgress('train', 20);
    setStatus('train', '', `Uploading ${state.trainingPhotos.length} photos to fal.ai...`);

    // Step 1: upload zip to fal.ai storage
    // fal.run/files/upload accepts multipart and returns { url }
    setStatus('train', '', 'Uploading photos (' + Math.round(blob.size / 1024) + ' KB) to fal.ai...');
    const filename = 'igm_training_' + Date.now() + '.zip';
    const formData = new FormData();
    formData.append('file', new File([blob], filename, { type: 'application/zip' }));

    const upRes = await safeFetch('https://fal.run/files/upload', {
      method: 'POST',
      headers: { Authorization: 'Key ' + key },
      body: formData,
    });

    console.log('Upload response:', upRes.status, upRes.text.slice(0, 300));

    if (!upRes.ok) {
      throw new Error('Upload failed (HTTP ' + upRes.status + '): ' + upRes.text.slice(0, 300));
    }

    const zipUrl = upRes.data && (upRes.data.url || upRes.data.file_url || upRes.data.cdn_url);
    if (!zipUrl) {
      throw new Error('Upload OK but no URL returned: ' + upRes.text.slice(0, 300));
    }
    console.log('Zip uploaded to:', zipUrl);

    setProgress('train', 40);
    setStatus('train', '', 'Submitting training job...');

    // Step 2: submit training job via queue
    const trainPayload = {
      images_data_url: zipUrl,
      trigger_word: trigger,
      steps: parseInt(document.getElementById('trainSteps').value),
      learning_rate: parseFloat(document.getElementById('lrSelect').value),
      create_masks: true,
      is_style: false,
    };

    // Try queue endpoint first, then fall back to direct
    const queueSubmit = await safeFetch(`${FAL_BASE}/fal-ai/flux-lora-fast-training`, {
      method: 'POST',
      headers: { Authorization: 'Key ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(trainPayload),
    });

    console.log('Training submit response:', queueSubmit.status, queueSubmit.text.slice(0, 400));

    if (!queueSubmit.ok) {
      throw new Error('Training submit failed (HTTP ' + queueSubmit.status + '): ' + queueSubmit.text.slice(0, 300));
    }

    let trainData = queueSubmit.data;

    // If we got a request_id back, it's queued — poll for result
    const reqId = trainData && (trainData.request_id || trainData.requestId);
    if (reqId) {
      setStatus('train', '', 'Training queued (' + reqId.slice(0,8) + '...) — takes 10–20 min, keep tab open');
      trainData = await pollForResult(key, reqId, pct => {
        setProgress('train', 40 + Math.round(pct * 0.55));
        setStatus('train', '', 'Training... ~' + Math.round(pct) + '% done');
      });
    } else {
      // Synchronous result (unlikely for training but handle it)
      console.log('Got synchronous training result:', JSON.stringify(trainData).slice(0, 300));
    }

    const loraUrl = trainData?.diffusers_lora_file?.url
      || trainData?.lora_file_url
      || trainData?.lora_url
      || trainData?.weights_url;

    if (!loraUrl) {
      throw new Error(`Training finished but no LoRA URL found. Raw: ${JSON.stringify(trainData).slice(0, 300)}`);
    }

    setProgress('train', 100);

    const model = {
      id: Date.now(),
      clientId: client.id,
      clientName: client.name,
      initials: client.initials,
      trigger,
      loraUrl,
      photoCount: state.trainingPhotos.length,
      steps: parseInt(document.getElementById('trainSteps').value),
      createdAt: new Date().toLocaleDateString(),
    };

    state.models.push(model);
    state.trainingPhotos = [];
    renderThumbs();
    saveState();

    setStatus('train', 'success', `Model ready! Trigger word: "${trigger}" — go to Generate to use it.`);
  } catch (err) {
    setStatus('train', 'error', err.message);
    setProgress('train', 0);
  } finally {
    btn.disabled = false;
  }
}

// ── Generate tab ────────────────────────────────────────────────────────────
function renderModelCards() {
  const el = document.getElementById('modelList');
  if (!state.models.length) {
    el.innerHTML = '<div class="empty-state" style="padding:24px 0"><i class="ti ti-brain"></i><p>No trained models yet — go to Train model first.</p></div>';
    return;
  }
  el.innerHTML = state.models.map(m => `
    <div class="model-card ${state.selectedModelId === m.id ? 'selected' : ''}" data-model-id="${m.id}">
      <div class="model-avatar">${m.initials}</div>
      <div class="model-info">
        <p class="model-name">${m.clientName}</p>
        <p class="model-sub">Trigger: <strong>${m.trigger}</strong> &nbsp;·&nbsp; ${m.photoCount} photos &nbsp;·&nbsp; ${m.steps} steps &nbsp;·&nbsp; ${m.createdAt}</p>
      </div>
      <span class="badge badge-ready">Ready</span>
    </div>
  `).join('');

  el.querySelectorAll('.model-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedModelId = parseInt(card.dataset.modelId);
      saveState();
      renderModelCards();
      const model = state.models.find(m => m.id === state.selectedModelId);
      if (model) {
        const ta = document.getElementById('genPrompt');
        if (!ta.value) ta.placeholder = `${model.trigger} celebrating on course, golden hour, photorealistic...`;
      }
    });
  });
}

function renderPresets() {
  const row = document.getElementById('presetRow');
  row.innerHTML = PRESETS.map(p => `
    <button class="preset-btn" data-prompt="${p.prompt}">${p.label}</button>
  `).join('');
  row.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const model = state.models.find(m => m.id === state.selectedModelId);
      if (!model) { setStatus('gen', 'error', 'Select a trained model first.'); return; }
      document.getElementById('genPrompt').value = btn.dataset.prompt.replace('TRIGGER', model.trigger);
    });
  });
}

[
  { id: 'numImages', out: 'numImagesReadout', fmt: v => v },
  { id: 'guidance', out: 'guidanceReadout', fmt: v => parseFloat(v).toFixed(1) },
  { id: 'inferSteps', out: 'inferStepsReadout', fmt: v => v },
].forEach(({ id, out, fmt }) => {
  document.getElementById(id).addEventListener('input', function() {
    document.getElementById(out).textContent = fmt(this.value);
  });
});

document.getElementById('genBtn').addEventListener('click', generateImages);

async function generateImages() {
  const key = getKey();
  const model = state.models.find(m => m.id === state.selectedModelId);
  const prompt = document.getElementById('genPrompt').value.trim();

  if (!key) return setStatus('gen', 'error', 'Add your fal.ai API key in Setup first.');
  if (!model) return setStatus('gen', 'error', 'Select a trained model above.');
  if (!prompt) return setStatus('gen', 'error', 'Enter a prompt.');

  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  document.getElementById('resultGrid').innerHTML = '';
  setProgress('gen', 10);
  setStatus('gen', '', 'Generating images...');

  const n = parseInt(document.getElementById('numImages').value);
  const imageSize = document.getElementById('aspectRatio').value;
  const inferenceSteps = parseInt(document.getElementById('inferSteps').value);
  const guidanceScale = parseFloat(document.getElementById('guidance').value);

  try {
    const jobs = Array.from({ length: n }, () =>
      fetch(`${FAL_BASE}/fal-ai/flux-lora`, {
        method: 'POST',
        headers: { Authorization: 'Key ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          loras: [{ path: model.loraUrl, scale: 1.0 }],
          image_size: imageSize,
          num_inference_steps: inferenceSteps,
          guidance_scale: guidanceScale,
          num_images: 1,
          enable_safety_checker: true,
        }),
      })
    );

    setProgress('gen', 40);
    const responses = await Promise.all(jobs);
    setProgress('gen', 70);

    const results = await Promise.all(responses.map(r => {
      if (!r.ok) return r.json().then(e => { throw new Error(e.detail || e.error || `Generation failed (${r.status})`); });
      return r.json();
    }));

    const images = results.flatMap(r => r.images || []);
    if (!images.length) throw new Error('No images returned. Check your prompt and try again.');

    setProgress('gen', 100);
    setStatus('gen', 'success', `${images.length} image${images.length > 1 ? 's' : ''} generated.`);

    const grid = document.getElementById('resultGrid');
    images.forEach(img => {
      const wrap = document.createElement('div');
      wrap.className = 'result-wrap';
      wrap.innerHTML = `
        <img class="result-img" src="${img.url}" alt="Generated image" loading="lazy" />
        <div class="result-overlay">
          <a class="result-action" href="${img.url}" target="_blank" rel="noopener">
            <i class="ti ti-external-link"></i> Open full size
          </a>
          <a class="result-action" href="${img.url}" download="igm-${Date.now()}.jpg" target="_blank" rel="noopener">
            <i class="ti ti-download"></i> Download
          </a>
        </div>
      `;
      grid.appendChild(wrap);

      state.library.unshift({
        url: img.url,
        prompt,
        clientName: model.clientName,
        trigger: model.trigger,
        createdAt: new Date().toLocaleDateString(),
        ts: Date.now(),
      });
    });

    if (state.library.length > 200) state.library = state.library.slice(0, 200);
    saveState();

  } catch (err) {
    setStatus('gen', 'error', err.message);
    setProgress('gen', 0);
  } finally {
    btn.disabled = false;
  }
}

// ── Library tab ─────────────────────────────────────────────────────────────
function renderLibrary() {
  const grid = document.getElementById('libraryGrid');
  const empty = document.getElementById('libraryEmpty');
  if (!state.library.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = state.library.map(item => `
    <div class="result-wrap">
      <img class="result-img" src="${item.url}" alt="${item.clientName}" loading="lazy" />
      <span class="result-client-tag">${item.clientName}</span>
      <div class="result-overlay">
        <a class="result-action" href="${item.url}" target="_blank" rel="noopener">
          <i class="ti ti-external-link"></i> Open
        </a>
        <a class="result-action" href="${item.url}" download target="_blank" rel="noopener">
          <i class="ti ti-download"></i> Save
        </a>
      </div>
    </div>
  `).join('');
}

// ── Utilities ─────────────────────────────────────────────────────────────
function setStatus(ctx, type, msg) {
  const el = document.getElementById(ctx === 'train' ? 'trainStatus' : 'genStatus');
  el.textContent = msg;
  el.className = 'status-msg' + (type ? ' ' + type : '');
}

function setProgress(ctx, pct) {
  const wrap = document.getElementById(ctx === 'train' ? 'trainProgressWrap' : 'genProgressWrap');
  const bar = document.getElementById(ctx === 'train' ? 'trainProgressBar' : 'genProgressBar');
  wrap.classList.toggle('visible', pct > 0);
  bar.style.width = pct + '%';
  if (pct === 0 || pct === 100) {
    setTimeout(() => { if (pct === 0 || pct === 100) wrap.classList.remove('visible'); }, 1200);
  }
}

function flash(btnId, label) {
  const btn = document.getElementById(btnId);
  const original = btn.textContent;
  btn.textContent = label;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1500);
}

// ── Init ──────────────────────────────────────────────────────────────────
loadState();
renderClientList();
renderTrainSelect();
