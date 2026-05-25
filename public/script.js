// script.js - dashboard InfraSantAlert
// Mantem compatibilidade com as rotas atuais: GET /vias e POST /vias

let viaForm;
let viasList;
let listState;
let submitBtn;
let refreshBtn;
let toastStack;
let totalViasEl;
let totalManutencaoEl;
let totalInterditadasEl;

document.addEventListener('DOMContentLoaded', () => {
  viaForm = document.getElementById('viaForm');
  viasList = document.getElementById('viasList');
  listState = document.getElementById('listState');
  submitBtn = document.getElementById('submitBtn');
  refreshBtn = document.getElementById('refreshBtn');
  toastStack = document.getElementById('toastStack');

  totalViasEl = document.getElementById('totalVias');
  totalManutencaoEl = document.getElementById('totalManutencao');
  totalInterditadasEl = document.getElementById('totalInterditadas');

  if (!viaForm || !viasList) {
    console.error('Elementos principais do dashboard nao foram encontrados.');
    return;
  }

  viaForm.addEventListener('submit', handleSubmit);
  refreshBtn.addEventListener('click', () => {
    loadVias(true);
  });

  loadVias(false);
});

async function loadVias(showInfoToast) {
  setListState('Carregando dados...');

  try {
    const res = await fetch('/vias');
    const body = await safeJson(res);

    if (!res.ok) {
      throw new Error(body && body.error ? body.error : 'Erro ao obter vias');
    }

    if (!Array.isArray(body)) {
      throw new Error('Formato inesperado retornado pela API');
    }

    renderVias(body);
    updateStats(body);

    if (showInfoToast) {
      showToast('Lista atualizada com sucesso.', 'info');
    }
  } catch (err) {
    console.error('Erro ao carregar vias:', err);
    setListState('Nao foi possivel carregar as vias no momento.');
    renderVias([]);
    updateStats([]);
    showToast(err.message || 'Falha ao carregar vias.', 'error');
  }
}

function renderVias(vias) {
  viasList.innerHTML = '';

  if (!vias.length) {
    setListState('Nenhuma via cadastrada ate o momento.');
    return;
  }

  setListState('');

  vias.forEach((via, index) => {
    const statusClass = normalizeStatus(via.status);
    const card = document.createElement('article');
    card.className = `via-card status-${statusClass}`;
    card.style.animationDelay = `${index * 40}ms`;

    card.innerHTML = `
      <div class="via-top">
        <h3>${escapeHtml(via.rua || 'Via nao informada')}</h3>
        <span class="status-pill ${statusClass}">${escapeHtml(via.status || 'Sem status')}</span>
      </div>
      <p class="via-meta">Bairro: ${escapeHtml(via.bairro || '-')}</p>
      <p class="via-meta">Previsao: ${formatDate(via.previsaoLiberacao)}</p>
      <p class="via-date">Cadastro: ${formatDate(via.dataCadastro)}</p>
      <p class="via-desc">${escapeHtml(via.motivo || 'Sem observacoes informadas.')}</p>
      <div class="via-actions">
        <button class="mini-btn success js-liberar" data-id="${escapeHtml(via._id || '')}">Marcar liberada</button>
        <div class="date-update-wrap">
          <input class="mini-date js-previsao" type="date" value="${toDateInputValue(via.previsaoLiberacao)}" />
          <button class="mini-btn neutral js-salvar-previsao" data-id="${escapeHtml(via._id || '')}">Salvar previsao</button>
        </div>
      </div>
    `;

    const liberarBtn = card.querySelector('.js-liberar');
    const salvarPrevisaoBtn = card.querySelector('.js-salvar-previsao');
    const previsaoInput = card.querySelector('.js-previsao');

    liberarBtn.addEventListener('click', async () => {
      await updateVia(via._id, { status: 'Liberada' }, 'Via marcada como liberada.');
    });

    salvarPrevisaoBtn.addEventListener('click', async () => {
      const novaPrevisao = previsaoInput.value || null;
      await updateVia(via._id, { previsaoLiberacao: novaPrevisao }, 'Previsao atualizada com sucesso.');
    });

    viasList.appendChild(card);
  });
}

function updateStats(vias) {
  const total = vias.length;
  const manutencao = vias.filter((v) => {
    const s = normalizeStatus(v.status);
    return s === 'manutencao' || s === 'parcial';
  }).length;
  const interditadas = vias.filter((v) => normalizeStatus(v.status) === 'interditada').length;

  totalViasEl.textContent = String(total);
  totalManutencaoEl.textContent = String(manutencao);
  totalInterditadasEl.textContent = String(interditadas);
}

async function handleSubmit(event) {
  event.preventDefault();

  const payload = {
    rua: viaForm.rua.value.trim(),
    bairro: viaForm.bairro.value.trim(),
    status: viaForm.status.value,
    motivo: viaForm.motivo.value.trim(),
    previsaoLiberacao: viaForm.previsaoLiberacao.value || null,
  };

  setButtonLoading(true);

  try {
    const res = await fetch('/vias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await safeJson(res);

    if (!res.ok) {
      throw new Error(body && body.error ? body.error : 'Erro ao cadastrar via');
    }

    viaForm.reset();
    showToast('Via cadastrada com sucesso.', 'success');
    await loadVias(false);
  } catch (err) {
    console.error('Erro ao cadastrar via:', err);
    showToast(err.message || 'Falha ao cadastrar via.', 'error');
  } finally {
    setButtonLoading(false);
  }
}

async function updateVia(viaId, payload, successMessage) {
  if (!viaId) {
    showToast('Nao foi possivel identificar a via selecionada.', 'error');
    return;
  }

  try {
    const res = await fetch(`/vias/${encodeURIComponent(viaId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await safeJson(res);

    if (!res.ok) {
      throw new Error(getApiErrorMessage(body, 'Erro ao atualizar via'));
    }

    showToast(successMessage, 'success');
    await loadVias(false);
  } catch (err) {
    console.error('Erro ao atualizar via:', err);
    showToast(err.message || 'Falha ao atualizar via.', 'error');
  }
}

function normalizeStatus(status) {
  if (!status) return 'manutencao';

  const text = String(status)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (text.includes('interdit')) return 'interditada';
  if (text.includes('liberad')) return 'liberada';
  if (text.includes('parcial')) return 'parcial';
  return 'manutencao';
}

function setListState(message) {
  if (!listState) return;

  if (!message) {
    listState.textContent = '';
    listState.classList.add('hidden');
    return;
  }

  listState.textContent = message;
  listState.classList.remove('hidden');
}

function setButtonLoading(isLoading) {
  if (!submitBtn) return;

  submitBtn.classList.toggle('loading', isLoading);
  submitBtn.disabled = isLoading;
}

function showToast(message, type) {
  if (!toastStack) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type || 'info'}`;
  toast.textContent = message;
  toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

function escapeHtml(text) {
  if (!text) return '';

  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  if (!value) return 'Nao informada';

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('pt-BR');
  } catch (err) {
    return String(value);
  }
}

function toDateInputValue(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const maybeIso = String(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(maybeIso) ? maybeIso : '';
  }

  return date.toISOString().slice(0, 10);
}

function getApiErrorMessage(body, fallback) {
  if (!body || typeof body !== 'object') return fallback;
  return body.error || body.erro || fallback;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}
