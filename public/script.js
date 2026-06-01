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
let currentEditId = null;
let viasCache = [];
let searchInput, statusFilter, bairroFilter, sortSelect, resultCount;
let filtersToggle, filtersPanel;

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

  console.debug('Dashboard inicializado:', {
    viaFormExists: !!viaForm,
    viasListExists: !!viasList,
    submitBtnExists: !!submitBtn,
    refreshBtnExists: !!refreshBtn,
  });

  viaForm.addEventListener('submit', handleSubmit);
  refreshBtn.addEventListener('click', () => {
    loadVias(true);
  });

  searchInput = document.getElementById('searchInput');
  statusFilter = document.getElementById('statusFilter');
  bairroFilter = document.getElementById('bairroFilter');
  sortSelect = document.getElementById('sortSelect');
  resultCount = document.getElementById('resultCount');
  filtersToggle = document.getElementById('filtersToggle');
  filtersPanel = document.getElementById('filtersPanel');

  if (searchInput) searchInput.addEventListener('input', atualizarTabela);
  if (statusFilter) statusFilter.addEventListener('change', atualizarTabela);
  if (bairroFilter) bairroFilter.addEventListener('change', atualizarTabela);
  if (sortSelect) sortSelect.addEventListener('change', atualizarTabela);
  if (filtersToggle && filtersPanel) {
    filtersToggle.addEventListener('click', () => {
      const isOpen = !filtersPanel.hidden;
      filtersPanel.hidden = isOpen;
      filtersToggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  loadVias(false);
});

async function loadVias(showInfoToast) {
  setListState('Carregando dados...');

  try {
    const res = await fetch('/vias');
    const body = await safeJson(res);

    console.debug('loadVias: fetch /vias status', res.status, { length: Array.isArray(body) ? body.length : 'na' });

    if (!res.ok) {
      throw new Error(body && body.error ? body.error : 'Erro ao obter vias');
    }

    if (!Array.isArray(body)) {
      throw new Error('Formato inesperado retornado pela API');
    }

    // manter cache local para filtros/ordenacao
    viasCache = Array.isArray(body) ? body : [];
    popularFiltroBairros(viasCache);
    atualizarTabela();
    updateStats(viasCache);

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
// Funções globais para filtros/ordenacao/render
function atualizarTabela() {
  if (!Array.isArray(viasCache)) viasCache = [];
  console.debug('atualizarTabela: viasCache length', viasCache.length);
  let resultado = filtrarVias(viasCache);
  console.debug('após filtrarVias:', resultado.length);
  resultado = pesquisarVias(resultado);
  console.debug('após pesquisarVias:', resultado.length);
  resultado = ordenarVias(resultado);
  console.debug('após ordenarVias:', resultado.length);
  renderTabela(resultado);
}

function filtrarVias(items) {
  const statusVal = statusFilter ? statusFilter.value : 'Todas';
  const bairroVal = bairroFilter ? bairroFilter.value : '';

  return (items || []).filter((v) => {
    if (statusVal && statusVal !== 'Todas') {
      const norm = normalizeStatus(v.status);
      if (statusVal === 'Interditada' && norm !== 'interditada') return false;
      if (statusVal === 'Manutenção' && norm !== 'manutencao') return false;
      if (statusVal === 'Liberada' && norm !== 'liberada') return false;
    }

    if (bairroVal) {
      if (!v.bairro) return false;
      if (String(v.bairro).toLowerCase() !== String(bairroVal).toLowerCase()) return false;
    }

    return true;
  });
}

function pesquisarVias(items) {
  const q = searchInput ? String(searchInput.value || '').trim().toLowerCase() : '';
  if (!q) return items || [];
  return (items || []).filter((v) => {
    const rua = String(v.rua || '').toLowerCase();
    const bairro = String(v.bairro || '').toLowerCase();
    const motivo = String(v.motivo || '').toLowerCase();
    return rua.includes(q) || bairro.includes(q) || motivo.includes(q);
  });
}

function ordenarVias(items) {
  const mode = sortSelect ? sortSelect.value : 'recent';
  const copy = (items || []).slice();

  if (mode === 'recent') {
    copy.sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));
  } else if (mode === 'oldest') {
    copy.sort((a, b) => new Date(a.dataCadastro) - new Date(b.dataCadastro));
  } else if (mode === 'alpha') {
    copy.sort((a, b) => String(a.rua || '').localeCompare(String(b.rua || '')));
  } else if (mode === 'previsao') {
    copy.sort((a, b) => {
      const da = a.previsaoLiberacao ? new Date(a.previsaoLiberacao).getTime() : Infinity;
      const db = b.previsaoLiberacao ? new Date(b.previsaoLiberacao).getTime() : Infinity;
      return da - db;
    });
  }

  return copy;
}

function renderTabela(vias) {
  viasList.innerHTML = '';

  if (!vias || !vias.length) {
    setListState('Nenhuma via encontrada');
    if (resultCount) resultCount.textContent = '0 resultados';
    return;
  }

  setListState('');
  if (resultCount) resultCount.textContent = `${vias.length} resultado(s)`;

  const table = document.createElement('table');
  table.className = 'vias-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `
      <tr>
        <th>Rua</th>
        <th>Bairro</th>
        <th>Status</th>
        <th>Motivo</th>
        <th>Previsão</th>
        <th>Cadastro</th>
      </tr>
    `;

  const tbody = document.createElement('tbody');

  vias.forEach((via) => {
    const tr = document.createElement('tr');
    const statusClass = normalizeStatus(via.status);

    tr.innerHTML = `
        <td data-label="Rua">${escapeHtml(via.rua || '')}</td>
        <td data-label="Bairro">${escapeHtml(via.bairro || '')}</td>
        <td data-label="Status"><span class="badge ${statusClass}">${escapeHtml(via.status || '')}</span></td>
        <td data-label="Motivo">${escapeHtml(via.motivo || '')}</td>
        <td data-label="Previsão" class="td-previsao"><span class="previsao-text">${escapeHtml(formatDate(via.previsaoLiberacao) || 'Sem previsão')}</span></td>
        <td data-label="Cadastro">${formatDate(via.dataCadastro)}</td>
      `;

    const actionsRow = document.createElement('tr');
    actionsRow.className = 'row-actions-row';
    actionsRow.innerHTML = `
      <td colspan="6">
        <div class="row-actions">
          <button class="mini-btn success js-liberar" data-id="${escapeHtml(via._id || '')}">Liberar</button>
          <button class="mini-btn neutral js-edit" data-id="${escapeHtml(via._id || '')}">Editar</button>
          <button class="mini-btn danger js-delete" data-id="${escapeHtml(via._id || '')}">Excluir</button>
        </div>
      </td>
    `;

    const actionsLiberarBtn = actionsRow.querySelector('.js-liberar');
    const actionsEditBtn = actionsRow.querySelector('.js-edit');
    const actionsDeleteBtn = actionsRow.querySelector('.js-delete');

    if (actionsLiberarBtn) actionsLiberarBtn.addEventListener('click', async () => {
      await updateVia(via._id, { status: 'Liberada' }, 'Via marcada como liberada.');
    });

    if (actionsEditBtn) actionsEditBtn.addEventListener('click', () => {
      editarVia(via._id);
    });

    if (actionsDeleteBtn) actionsDeleteBtn.addEventListener('click', async () => {
      await excluirVia(via._id);
    });

    tbody.appendChild(tr);
    tbody.appendChild(actionsRow);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  viasList.appendChild(table);
}

function popularFiltroBairros(vias) {
  if (!bairroFilter) return;
  const set = new Set();
  (vias || []).forEach((v) => {
    if (v.bairro) set.add(String(v.bairro).trim());
  });

  const bairros = Array.from(set).sort((a, b) => a.localeCompare(b));

  // limpar exceto primeira opcao
  bairroFilter.innerHTML = '<option value="">Bairro</option>';
  bairros.forEach((b) => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    bairroFilter.appendChild(opt);
  });
}

function renderVias(vias) {
  viasList.innerHTML = '';

  if (!vias || !vias.length) {
    setListState('Nenhuma via cadastrada ate o momento.');
    return;
  }

  setListState('');
  renderTabela(vias);
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
    if (currentEditId) {
      // modo edição -> PUT
      const res = await fetch(`/vias/${encodeURIComponent(currentEditId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await safeJson(res);

      if (!res.ok) {
        throw new Error(getApiErrorMessage(body, 'Erro ao salvar alteracoes'));
      }

      showToast('Alteracoes salvas com sucesso.', 'success');
      resetFormulario();
      await loadVias(false);
    } else {
      // modo cadastro -> POST
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
    }
  } catch (err) {
    console.error('Erro ao cadastrar via:', err);
    showToast(err.message || 'Falha ao cadastrar via.', 'error');
  } finally {
    setButtonLoading(false);
  }
}

// Preenche o formulario com os dados da via para edicao
function carregarFormulario(via) {
  if (!via || !via._id) return;

  viaForm.rua.value = via.rua || '';
  viaForm.bairro.value = via.bairro || '';
  viaForm.status.value = via.status || 'Manutenção';
  viaForm.motivo.value = via.motivo || '';
  viaForm.previsaoLiberacao.value = toDateInputValue(via.previsaoLiberacao) || '';

  currentEditId = via._id;
  submitBtn.querySelector('.btn-text').textContent = 'Salvar Alterações';
  submitBtn.classList.add('editing');
}

function resetFormulario() {
  viaForm.reset();
  currentEditId = null;
  if (submitBtn && submitBtn.querySelector('.btn-text')) {
    submitBtn.querySelector('.btn-text').textContent = 'Cadastrar via';
  }
  submitBtn.classList.remove('editing');
}

// Inicia edicao: busca a via (já disponivel na listagem) e carrega no formulario
function editarVia(id) {
  if (!id) return showToast('ID invalido para edicao', 'error');

  // Encontrar dados no DOM (melhor reutilizar carregamento recente)
  // Simplesmente recarrega todas e preenche com o objeto correspondente
  (async () => {
    try {
      const res = await fetch('/vias');
      const body = await safeJson(res);
      if (!res.ok || !Array.isArray(body)) throw new Error('Erro ao obter via para edicao');
      const via = body.find((v) => String(v._id) === String(id));
      if (!via) throw new Error('Via nao encontrada para edicao');
      carregarFormulario(via);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Erro ao iniciar edicao:', err);
      showToast(err.message || 'Nao foi possivel iniciar edicao', 'error');
    }
  })();
}

// Excluir via com confirmacao
async function excluirVia(id) {
  if (!id) return showToast('ID invalido', 'error');

  const confirmed = window.confirm('Deseja realmente excluir esta via?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/vias/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await safeJson(res);
    if (!res.ok) throw new Error(getApiErrorMessage(body, 'Erro ao excluir via'));
    showToast('Via excluida com sucesso.', 'success');
    // Se estivermos editando essa via, resetar formulario
    if (currentEditId && String(currentEditId) === String(id)) resetFormulario();
    await loadVias(false);
  } catch (err) {
    console.error('Erro ao excluir via:', err);
    showToast(err.message || 'Falha ao excluir via.', 'error');
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

  // Se for formato YYYY-MM-DD (sem hora), formatar diretamente para evitar shift de fuso
  try {
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [y, m, d] = text.split('-');
      return `${d}/${m}/${y}`;
    }

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
