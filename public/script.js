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
let map, fromMarker, toMarker, segmentLine;
let tileLayer = null;
let currentUser = null;
let viasLayerGroup = null;
let ocorrenciaForm;
let ocorrenciasLayerGroup = null;
let ocorrenciaDraftMarker = null;
let mapMode = 'ocorrencia';
let ocorrenciasCache = [];
let ocorrenciasAdminList;
let ocorrenciaStatusFilter;
let viaPointLocation = null;
let confirmacoesCache = {};
let topOcorrenciasList;
let adminDashboardPanel;
let totalOcorrenciasPendentesEl;
let totalOcorrenciasConfirmadasEl;
let totalOcorrenciasResolvidasEl;
let totalInterdicoesAtivasEl;

document.addEventListener('DOMContentLoaded', () => {
  viaForm = document.getElementById('viaForm');
  viasList = document.getElementById('viasList');
  listState = document.getElementById('listState');
  submitBtn = document.getElementById('submitBtn');
  refreshBtn = document.getElementById('refreshBtn');
  toastStack = document.getElementById('toastStack');
  ocorrenciaForm = document.getElementById('ocorrenciaForm');
  ocorrenciasAdminList = document.getElementById('ocorrenciasAdminList');
  ocorrenciaStatusFilter = document.getElementById('ocorrenciaStatusFilter');
  topOcorrenciasList = document.getElementById('topOcorrenciasList');
  adminDashboardPanel = document.getElementById('adminDashboardPanel');
  totalOcorrenciasPendentesEl = document.getElementById('totalOcorrenciasPendentes');
  totalOcorrenciasConfirmadasEl = document.getElementById('totalOcorrenciasConfirmadas');
  totalOcorrenciasResolvidasEl = document.getElementById('totalOcorrenciasResolvidas');
  totalInterdicoesAtivasEl = document.getElementById('totalInterdicoesAtivas');

  totalViasEl = document.getElementById('totalVias');
  totalManutencaoEl = document.getElementById('totalManutencao');
  totalInterditadasEl = document.getElementById('totalInterditadas');

  if (!viaForm || !viasList) {
    console.error('Elementos principais do dashboard nao foram encontrados.');
    return;
  }

  initMap();

  console.debug('Dashboard inicializado:', {
    viaFormExists: !!viaForm,
    viasListExists: !!viasList,
    submitBtnExists: !!submitBtn,
    refreshBtnExists: !!refreshBtn,
  });

  viaForm.addEventListener('submit', handleSubmit);
  const clearSegmentBtn = document.getElementById('clearSegmentBtn');
  if (clearSegmentBtn) clearSegmentBtn.addEventListener('click', clearSegment);
  refreshBtn.addEventListener('click', () => {
    loadVias(true);
    loadOcorrencias(false);
  });

  if (ocorrenciaForm) ocorrenciaForm.addEventListener('submit', handleOcorrenciaSubmit);
  if (ocorrenciaStatusFilter) ocorrenciaStatusFilter.addEventListener('change', renderOcorrenciasAdmin);
  const clearOcorrenciaBtn = document.getElementById('clearOcorrenciaBtn');
  if (clearOcorrenciaBtn) clearOcorrenciaBtn.addEventListener('click', clearOcorrenciaDraft);
  const mapModeOcorrenciaBtn = document.getElementById('mapModeOcorrenciaBtn');
  const mapModeViaBtn = document.getElementById('mapModeViaBtn');
  if (mapModeOcorrenciaBtn) mapModeOcorrenciaBtn.addEventListener('click', () => setMapMode('ocorrencia'));
  if (mapModeViaBtn) mapModeViaBtn.addEventListener('click', () => setMapMode('via'));

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

  // Eventos de fechamento dos modais
  document.querySelectorAll('.js-close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal-overlay').classList.add('hidden');
    });
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', login);

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', register);

  // Checar sessao ativa antes de carregar dados
  checkAuth().then(() => {
    Promise.all([loadVias(false), loadOcorrencias(false), loadTopOcorrencias(), loadAdminDashboard()]);
  });
});

// ----------------------
// Autenticacao (JWT)
// ----------------------

function getToken() {
  return localStorage.getItem('jwt_token');
}

function getAuthHeaders(isJson = true) {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function checkAuth() {
  const token = getToken();
  if (!token) {
    currentUser = null;
    updateAuthUI();
    return;
  }
  try {
    const res = await fetch('/api/auth/me', { headers: getAuthHeaders(false) });
    if (res.ok) {
      const body = await res.json();
      currentUser = body.usuario || body;
    } else {
      localStorage.removeItem('jwt_token');
      currentUser = null;
    }
  } catch (err) {
    console.error('Erro ao checar auth', err);
    currentUser = null;
  }
  updateAuthUI();
}

async function login(e) {
  e.preventDefault();
  const form = e.target;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.value, senha: form.senha.value })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.erro || 'Erro no login');
    localStorage.setItem('jwt_token', body.token);
    currentUser = body.usuario;
    document.getElementById('loginModal').classList.add('hidden');
    form.reset();
    showToast('Login realizado com sucesso', 'success');
    updateAuthUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function register(e) {
  e.preventDefault();
  const form = e.target;
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome.value,
        email: form.email.value,
        senha: form.senha.value
      })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.erro || 'Erro no cadastro');
    localStorage.setItem('jwt_token', body.token);
    currentUser = body.usuario;
    document.getElementById('registerModal').classList.add('hidden');
    form.reset();
    showToast('Cadastro realizado com sucesso', 'success');
    updateAuthUI();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  localStorage.removeItem('jwt_token');
  currentUser = null;
  showToast('Logout realizado', 'info');
  updateAuthUI();
}

function updateAuthUI() {
  const headerAuth = document.getElementById('headerAuth');
  const viaFormPanel = document.getElementById('viaFormPanel');
  const ocorrenciaFormPanel = document.getElementById('ocorrenciaFormPanel');
  const ocorrenciasAdminPanel = document.getElementById('ocorrenciasAdminPanel');
  const topOcorrenciasPanelEl = document.getElementById('topOcorrenciasPanel');
  const adminDashboardPanelEl = document.getElementById('adminDashboardPanel');
  const mapLabel = document.getElementById('mapLabel');
  
  if (currentUser) {
    headerAuth.innerHTML = '';

    const userLabel = document.createElement('span');
    userLabel.style.marginRight = '15px';
    userLabel.style.fontSize = '14px';
    userLabel.style.fontWeight = '600';
    userLabel.textContent = `Olá, ${currentUser.nome} (${currentUser.perfil})`;

    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn-secondary';
    logoutBtn.style.padding = '6px 12px';
    logoutBtn.style.fontSize = '13px';
    logoutBtn.textContent = 'Sair';
    logoutBtn.addEventListener('click', logout);

    headerAuth.appendChild(userLabel);
    headerAuth.appendChild(logoutBtn);
    if (viaFormPanel) {
      viaFormPanel.style.display = currentUser.perfil === 'admin' ? 'block' : 'none';
    }
    if (ocorrenciaFormPanel) {
      ocorrenciaFormPanel.style.display = currentUser.perfil === 'usuario' ? 'block' : 'none';
    }
    if (ocorrenciasAdminPanel) {
      ocorrenciasAdminPanel.style.display = currentUser.perfil === 'admin' ? 'block' : 'none';
    }
    if (topOcorrenciasPanelEl) {
      topOcorrenciasPanelEl.style.display = currentUser.perfil === 'admin' ? 'block' : 'none';
    }
    if (adminDashboardPanelEl) {
      adminDashboardPanelEl.style.display = currentUser.perfil === 'admin' ? 'grid' : 'none';
    }
    if (mapLabel) {
      mapLabel.textContent = mapMode === 'via' ? 'Marcar trecho interditado (clique para definir início e fim)' : 'Clique no mapa para selecionar o local da ocorrência';
    }
  } else {
    headerAuth.innerHTML = `
      <button id="showLoginBtn" class="btn-primary" style="margin-right: 8px; padding: 6px 12px; font-size: 13px;">Login</button>
      <button id="showRegisterBtn" class="btn-secondary" style="padding: 6px 12px; font-size: 13px;">Cadastrar</button>
    `;
    document.getElementById('showLoginBtn').addEventListener('click', () => document.getElementById('loginModal').classList.remove('hidden'));
    document.getElementById('showRegisterBtn').addEventListener('click', () => document.getElementById('registerModal').classList.remove('hidden'));
    if (viaFormPanel) viaFormPanel.style.display = 'none';
    if (ocorrenciaFormPanel) ocorrenciaFormPanel.style.display = 'none';
    if (ocorrenciasAdminPanel) ocorrenciasAdminPanel.style.display = 'none';
    if (topOcorrenciasPanelEl) topOcorrenciasPanelEl.style.display = 'none';
    if (adminDashboardPanelEl) adminDashboardPanelEl.style.display = 'none';
    if (mapLabel) {
      mapLabel.textContent = 'Mapa de Monitoramento (Faça login para reportar ocorrências ou cadastrar trechos)';
    }
  }
  
  // Atualiza as acoes da tabela se for necessario
  atualizarTabela();
  renderOcorrenciasAdmin();
  renderOcorrenciasOnMap(ocorrenciasCache);
  loadTopOcorrencias();
  loadAdminDashboard();

  // Recalcular dimensoes do Leaflet apos mudancas de layout
  setTimeout(() => {
    if (map && typeof map.invalidateSize === 'function') {
      map.invalidateSize();
    }
  }, 150);
}

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
    renderViasOnMap(viasCache);
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

    let actionsHtml = '';
    if (currentUser && currentUser.perfil === 'admin') {
      actionsHtml += `<button class="mini-btn success js-liberar" data-id="${escapeHtml(via._id || '')}">Liberar</button>
                      <button class="mini-btn neutral js-edit" data-id="${escapeHtml(via._id || '')}">Editar</button>
                      <button class="mini-btn danger js-delete" data-id="${escapeHtml(via._id || '')}">Excluir</button>`;
    }

    tbody.appendChild(tr);

    if (actionsHtml) {
      const actionsRow = document.createElement('tr');
      actionsRow.className = 'row-actions-row';
      actionsRow.innerHTML = `
        <td colspan="6">
          <div class="row-actions">
            ${actionsHtml}
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

      tbody.appendChild(actionsRow);
    }
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  viasList.appendChild(table);
}

function initMap() {
  initLeafletMap();
}

function initLeafletMap() {
  // Verificação defensiva: se Leaflet (L) não estiver disponível, mostrar mensagem
  if (typeof L === 'undefined') {
    console.warn('Leaflet nao carregado: objeto L indefinido');
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.innerHTML = '<div class="map-error" style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;font-size:14px;">Mapa indisponível — verifique conexão ou extensões que bloqueiem recursos externos</div>';
    }
    return;
  }

  map = L.map('map').setView([-2.444, -54.708], 13);

  tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  tileLayer.on('tileerror', (err) => {
    console.warn('tileerror for OpenStreetMap', err);
    showToast('Erro ao carregar tiles do mapa.', 'error');
  });

  const reloadMapBtn = document.getElementById('reloadMapBtn');
  if (reloadMapBtn) reloadMapBtn.addEventListener('click', () => { try { map.invalidateSize(); showToast('Mapa recarregado.', 'info'); } catch (e) {} });

  map.on('click', (e) => {
    if (mapMode === 'via') {
      handleMapClick(e.latlng);
    } else {
      setOcorrenciaDraftLocation(e.latlng);
    }
  });

  setMapMode(mapMode);
}

function setMapMode(mode) {
  mapMode = mode === 'via' ? 'via' : 'ocorrencia';

  const mapLabel = document.getElementById('mapLabel');
  const ocorrenciaBtn = document.getElementById('mapModeOcorrenciaBtn');
  const viaBtn = document.getElementById('mapModeViaBtn');

  if (mapLabel) {
    mapLabel.textContent = mapMode === 'via'
      ? 'Marcar trecho interditado (clique para definir início e fim)'
      : 'Clique no mapa para selecionar o local da ocorrência';
  }

  if (ocorrenciaBtn && viaBtn) {
    ocorrenciaBtn.className = mapMode === 'ocorrencia' ? 'btn-primary' : 'btn-secondary';
    viaBtn.className = mapMode === 'via' ? 'btn-primary' : 'btn-secondary';
  }
}

function setOcorrenciaDraftLocation(latlng) {
  if (!currentUser) {
    showToast('Faça login para reportar uma ocorrência.', 'error');
    return;
  }
  if (currentUser.perfil !== 'usuario') {
    return;
  }

  const latInput = document.getElementById('ocorrenciaLat');
  const lngInput = document.getElementById('ocorrenciaLng');
  const coordsEl = document.getElementById('ocorrenciaCoords');

  if (!latInput || !lngInput || !coordsEl || !map || typeof L === 'undefined') return;

  latInput.value = latlng.lat;
  lngInput.value = latlng.lng;
  coordsEl.textContent = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;

  if (ocorrenciaDraftMarker) {
    ocorrenciaDraftMarker.setLatLng(latlng);
  } else {
    ocorrenciaDraftMarker = L.circleMarker(latlng, {
      radius: 7,
      fillColor: '#111827',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 0.9,
    }).addTo(map).bindPopup('Local da ocorrência');
  }
}

function clearOcorrenciaDraft() {
  const latInput = document.getElementById('ocorrenciaLat');
  const lngInput = document.getElementById('ocorrenciaLng');
  const coordsEl = document.getElementById('ocorrenciaCoords');

  if (latInput) latInput.value = '';
  if (lngInput) lngInput.value = '';
  if (coordsEl) coordsEl.textContent = 'Clique no mapa para selecionar o local';
  if (ocorrenciaDraftMarker) {
    ocorrenciaDraftMarker.remove();
    ocorrenciaDraftMarker = null;
  }
}

function handleMapClick(latlng) {
  if (!fromMarker) {
    fromMarker = L.marker(latlng, { draggable: true }).addTo(map).bindPopup('Início').openPopup();
    fromMarker.on('dragend', () => updateHiddenInputsFromMarkers());
  } else if (!toMarker) {
    toMarker = L.marker(latlng, { draggable: true }).addTo(map).bindPopup('Fim').openPopup();
    toMarker.on('dragend', () => updateHiddenInputsFromMarkers());
    drawSegment();
  } else {
    // se já existem ambos, substituir e reiniciar
    clearSegment();
    fromMarker = L.marker(latlng, { draggable: true }).addTo(map).bindPopup('Início').openPopup();
    fromMarker.on('dragend', () => updateHiddenInputsFromMarkers());
  }

  updateHiddenInputsFromMarkers();
}

function drawSegment() {
  if (segmentLine) {
    segmentLine.remove();
    segmentLine = null;
  }

  if (fromMarker && toMarker) {
    const latlngs = [fromMarker.getLatLng(), toMarker.getLatLng()];
    segmentLine = L.polyline(latlngs, { color: 'red' }).addTo(map);
    map.fitBounds(segmentLine.getBounds(), { padding: [40, 40] });
  }
}

function updateHiddenInputsFromMarkers() {
  const fromLat = document.getElementById('fromLat');
  const fromLng = document.getElementById('fromLng');
  const toLat = document.getElementById('toLat');
  const toLng = document.getElementById('toLng');

  if (fromMarker) {
    const p = fromMarker.getLatLng();
    fromLat.value = p.lat;
    fromLng.value = p.lng;
  } else {
    fromLat.value = '';
    fromLng.value = '';
  }

  if (toMarker) {
    const p = toMarker.getLatLng();
    toLat.value = p.lat;
    toLng.value = p.lng;
  } else {
    toLat.value = '';
    toLng.value = '';
  }

  drawSegment();
}

function clearSegment() {
  if (fromMarker) { fromMarker.remove(); fromMarker = null; }
  if (toMarker) { toMarker.remove(); toMarker = null; }
  if (segmentLine) { segmentLine.remove(); segmentLine = null; }
  viaPointLocation = null;
  updateHiddenInputsFromMarkers();
}

function renderViasOnMap(vias) {
  if (!map || typeof L === 'undefined') return;

  if (!viasLayerGroup) {
    viasLayerGroup = L.layerGroup().addTo(map);
  } else {
    viasLayerGroup.clearLayers();
  }

  (vias || []).forEach((v) => {
    const status = String(v.status || '').toLowerCase();
    if (status === 'liberada' || status === 'concluida') {
      return;
    }

    if (v.blockedSegment && v.blockedSegment.from && v.blockedSegment.to) {
      try {
        const a = v.blockedSegment.from;
        const b = v.blockedSegment.to;
        const line = L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: 'red', weight: 4, opacity: 0.6 }).addTo(viasLayerGroup);
        const mid = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
        const popup = `<strong>${escapeHtml(v.rua || '')}</strong><br/>${escapeHtml(v.bairro || '')}<br/>${escapeHtml(v.status || '')}`;
        L.marker(mid).addTo(viasLayerGroup).bindPopup(popup);
      } catch (err) {
        console.warn('Erro ao renderizar segmento da via', v._id, err);
      }
    } else if (v.location && v.location.coordinates && v.location.coordinates.length === 2) {
      try {
        const [lng, lat] = v.location.coordinates;
        
        // Ignora coordenadas inválidas ou o padrão [0,0] do MongoDB
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
          return;
        }
        
        L.marker([lat, lng]).addTo(viasLayerGroup).bindPopup(`<strong>${escapeHtml(v.rua || '')}</strong>`);
      } catch (err) {
        // ignore
      }
    }
  });
}

async function loadOcorrencias(showInfoToast) {
  try {
    const res = await fetch('/api/ocorrencias');
    const body = await safeJson(res);

    if (!res.ok) {
      throw new Error(getApiErrorMessage(body, 'Erro ao carregar ocorrências'));
    }

    if (!Array.isArray(body)) {
      throw new Error('Formato inesperado retornado pela API de ocorrências');
    }

    ocorrenciasCache = body;
    confirmacoesCache = await loadConfirmacoesCounts(ocorrenciasCache);
    renderOcorrenciasOnMap(ocorrenciasCache);
    renderOcorrenciasAdmin();
    if (showInfoToast) showToast('Ocorrências atualizadas com sucesso.', 'info');
  } catch (err) {
    console.error('Erro ao carregar ocorrências:', err);
    showToast(err.message || 'Falha ao carregar ocorrências.', 'error');
    ocorrenciasCache = [];
    confirmacoesCache = {};
    renderOcorrenciasOnMap([]);
    renderOcorrenciasAdmin();
  }
}

async function loadConfirmacoesCounts(ocorrencias) {
  const entries = await Promise.all((ocorrencias || []).map(async (ocorrencia) => {
    const id = ocorrencia && ocorrencia._id;
    if (!id) return null;

    try {
      const res = await fetch(`/api/confirmacoes?ocorrenciaId=${encodeURIComponent(id)}`);
      const body = await safeJson(res);

      if (!res.ok) {
        throw new Error(getApiErrorMessage(body, 'Erro ao carregar confirmações'));
      }

      return [String(id), Number(body && body.total) || 0];
    } catch (err) {
      console.error('Erro ao carregar confirmações da ocorrência:', id, err);
      return [String(id), 0];
    }
  }));

  return entries.reduce((acc, entry) => {
    if (entry) acc[entry[0]] = entry[1];
    return acc;
  }, {});
}

function renderOcorrenciasOnMap(ocorrencias) {
  if (!map || typeof L === 'undefined') return;

  if (!ocorrenciasLayerGroup) {
    ocorrenciasLayerGroup = L.layerGroup().addTo(map);
  } else {
    ocorrenciasLayerGroup.clearLayers();
  }

  (ocorrencias || []).forEach((ocorrencia) => {
    const status = normalizeOcorrenciaStatus(ocorrencia.status);
    if (status === 'resolvida' || status === 'rejeitada') return;

    const lat = Number(ocorrencia.latitude);
    const lng = Number(ocorrencia.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: getOcorrenciaMarkerColor(status),
      color: '#ffffff',
      weight: 2,
      fillOpacity: 0.9,
    });

    marker.bindPopup(createOcorrenciaPopupContent(ocorrencia, status));

    ocorrenciasLayerGroup.addLayer(marker);
  });
}

function createOcorrenciaPopupContent(ocorrencia, status) {
  const container = document.createElement('div');
  container.className = 'occurrence-popup';

  const title = document.createElement('strong');
  title.textContent = ocorrencia.categoria || 'Ocorrência';
  container.appendChild(title);

  const description = document.createElement('p');
  description.textContent = ocorrencia.descricao || '';
  container.appendChild(description);

  appendPopupLine(container, 'Status', formatOcorrenciaStatus(status));
  appendPopupLine(container, 'Confirmações', String(getConfirmacoesCount(ocorrencia._id)));
  appendPopupLine(container, 'Cadastro', formatDate(ocorrencia.dataCriacao));

  if (canConfirmarOcorrencia(ocorrencia)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn neutral occurrence-confirm-btn';
    button.textContent = 'Confirmar ocorrência';
    button.addEventListener('click', () => confirmarOcorrencia(ocorrencia._id));
    container.appendChild(button);
  }

  return container;
}

function appendPopupLine(container, label, value) {
  const line = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  line.appendChild(strong);
  line.appendChild(document.createTextNode(value));
  container.appendChild(line);
}

async function loadTopOcorrencias() {
  if (!topOcorrenciasList) return;

  if (!currentUser || currentUser.perfil !== 'admin') {
    renderTopOcorrencias([]);
    return;
  }

  try {
    const res = await fetch('/api/dashboard/top-ocorrencias', {
      headers: getAuthHeaders(false),
    });
    const body = await safeJson(res);

    if (!res.ok) {
      throw new Error(getApiErrorMessage(body, 'Erro ao carregar top ocorrências'));
    }

    if (!Array.isArray(body)) {
      throw new Error('Formato inesperado retornado pelo top de ocorrências');
    }

    renderTopOcorrencias(body);
  } catch (err) {
    console.error('Erro ao carregar top ocorrências:', err);
    renderTopOcorrencias([]);
  }
}

async function loadAdminDashboard() {
  if (!adminDashboardPanel) return;

  if (!currentUser || currentUser.perfil !== 'admin') {
    updateAdminDashboardStats({});
    return;
  }

  try {
    const res = await fetch('/api/dashboard/admin', {
      headers: getAuthHeaders(false),
    });
    const body = await safeJson(res);

    if (!res.ok) {
      throw new Error(getApiErrorMessage(body, 'Erro ao carregar dashboard administrativo'));
    }

    updateAdminDashboardStats(body && body.totais ? body.totais : {});
  } catch (err) {
    console.error('Erro ao carregar dashboard administrativo:', err);
    updateAdminDashboardStats({});
  }
}

function updateAdminDashboardStats(totais) {
  if (totalOcorrenciasPendentesEl) totalOcorrenciasPendentesEl.textContent = String(totais.ocorrenciasPendentes || 0);
  if (totalOcorrenciasConfirmadasEl) totalOcorrenciasConfirmadasEl.textContent = String(totais.ocorrenciasConfirmadas || 0);
  if (totalOcorrenciasResolvidasEl) totalOcorrenciasResolvidasEl.textContent = String(totais.ocorrenciasResolvidas || 0);
  if (totalInterdicoesAtivasEl) totalInterdicoesAtivasEl.textContent = String(totais.interdiccoesAtivas || 0);
}

function renderTopOcorrencias(items) {
  if (!topOcorrenciasList) return;

  topOcorrenciasList.innerHTML = '';

  if (!items || !items.length) {
    const empty = document.createElement('p');
    empty.className = 'list-state';
    empty.textContent = 'Nenhuma ocorrência pendente ou confirmada com confirmações.';
    topOcorrenciasList.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    topOcorrenciasList.appendChild(createTopOcorrenciaItem(item, index));
  });
}

function createTopOcorrenciaItem(item, index) {
  const row = document.createElement('div');
  row.className = 'top-occurrence-item';

  const rank = document.createElement('div');
  rank.className = 'top-occurrence-rank';
  rank.textContent = `${index + 1}º`;

  const body = document.createElement('div');
  body.className = 'top-occurrence-body';

  const title = document.createElement('strong');
  title.textContent = item.tipo || 'Ocorrência';

  const meta = document.createElement('span');
  const total = Number(item.confirmacoes) || 0;
  meta.textContent = `${total} ${total === 1 ? 'confirmação' : 'confirmações'}`;

  const status = document.createElement('small');
  status.textContent = `Status: ${formatOcorrenciaStatus(normalizeOcorrenciaStatus(item.status))}`;

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(status);

  row.appendChild(rank);
  row.appendChild(body);

  return row;
}

function getOcorrenciaMarkerColor(status) {
  if (status === 'confirmada') return '#eab308';
  return '#6b7280';
}

function normalizeOcorrenciaStatus(status) {
  const text = String(status || 'pendente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (text.includes('resol')) return 'resolvida';
  if (text.includes('rejeit')) return 'rejeitada';
  if (text.includes('confirm')) return 'confirmada';
  return 'pendente';
}

function formatOcorrenciaStatus(status) {
  const map = {
    pendente: 'pendente',
    confirmada: 'confirmada',
    resolvida: 'resolvida',
    rejeitada: 'rejeitada',
  };
  return map[status] || status || 'pendente';
}

function renderOcorrenciasAdmin() {
  if (!ocorrenciasAdminList) return;

  const isAdmin = currentUser && currentUser.perfil === 'admin';
  if (!isAdmin) {
    ocorrenciasAdminList.innerHTML = '';
    return;
  }

  const filtro = ocorrenciaStatusFilter ? ocorrenciaStatusFilter.value : 'todas';
  const ocorrencias = (ocorrenciasCache || []).filter((ocorrencia) => {
    if (!filtro || filtro === 'todas') return true;
    return normalizeOcorrenciaStatus(ocorrencia.status) === filtro;
  });

  ocorrenciasAdminList.innerHTML = '';

  if (!ocorrencias.length) {
    const empty = document.createElement('p');
    empty.className = 'list-state';
    empty.textContent = 'Nenhuma ocorrencia encontrada para o filtro selecionado.';
    ocorrenciasAdminList.appendChild(empty);
    return;
  }

  ocorrencias.forEach((ocorrencia) => {
    ocorrenciasAdminList.appendChild(createOcorrenciaAdminItem(ocorrencia));
  });
}

function createOcorrenciaAdminItem(ocorrencia) {
  const status = normalizeOcorrenciaStatus(ocorrencia.status);
  const item = document.createElement('div');
  item.className = 'occurrence-admin-item';

  const top = document.createElement('div');
  top.className = 'occurrence-admin-top';

  const title = document.createElement('h3');
  title.textContent = ocorrencia.categoria || ocorrencia.titulo || 'Ocorrencia';

  const statusPill = document.createElement('span');
  statusPill.className = `occurrence-status ${status}`;
  statusPill.textContent = formatOcorrenciaStatus(status);

  top.appendChild(title);
  top.appendChild(statusPill);

  const description = document.createElement('p');
  description.className = 'occurrence-admin-description';
  description.textContent = ocorrencia.descricao || 'Sem descricao informada.';

  const details = document.createElement('div');
  details.className = 'occurrence-admin-details';

  appendOccurrenceDetail(details, 'Data', formatDate(ocorrencia.dataCriacao));
  appendOccurrenceDetail(details, 'Coordenadas', formatCoordinates(ocorrencia.latitude, ocorrencia.longitude));
  appendOccurrenceDetail(details, 'Usuario', formatOccurrenceUser(ocorrencia.usuarioId));
  appendOccurrenceDetail(details, 'Confirmações', String(getConfirmacoesCount(ocorrencia._id)));

  const actions = document.createElement('div');
  actions.className = 'occurrence-admin-actions';

  [
    { status: 'confirmada', label: 'Confirmar', className: 'mini-btn neutral' },
    { status: 'resolvida', label: 'Resolver', className: 'mini-btn success' },
    { status: 'rejeitada', label: 'Rejeitar', className: 'mini-btn danger' },
  ].forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action.className;
    button.textContent = action.label;
    button.disabled = status === action.status;
    button.addEventListener('click', () => updateOcorrenciaStatus(ocorrencia._id, action.status));
    actions.appendChild(button);
  });

  if (currentUser && currentUser.perfil === 'admin' && status === 'confirmada') {
    const transformButton = document.createElement('button');
    transformButton.type = 'button';
    transformButton.className = 'mini-btn neutral';
    transformButton.textContent = 'Transformar em Interdição';
    transformButton.addEventListener('click', () => transformarOcorrenciaEmVia(ocorrencia._id));
    actions.appendChild(transformButton);
  }

  item.appendChild(top);
  item.appendChild(description);
  item.appendChild(details);
  item.appendChild(actions);

  return item;
}

function appendOccurrenceDetail(container, label, value) {
  const detail = document.createElement('span');
  detail.textContent = `${label}: ${value}`;
  container.appendChild(detail);
}

function formatCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Nao informadas';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function formatOccurrenceUser(usuario) {
  if (!usuario) return 'Nao informado';
  if (typeof usuario === 'string') return usuario;

  const nome = usuario.nome || 'Sem nome';
  const email = usuario.email ? ` (${usuario.email})` : '';
  return `${nome}${email}`;
}

function getConfirmacoesCount(ocorrenciaId) {
  return confirmacoesCache[String(ocorrenciaId || '')] || 0;
}

function getCurrentUserId() {
  return currentUser && String(currentUser.id || currentUser._id || '');
}

function getOcorrenciaUserId(ocorrencia) {
  if (!ocorrencia) return '';

  const autorId = ocorrencia.usuarioId?._id
    || ocorrencia.usuarioId?.id
    || ocorrencia.usuarioId
    || ocorrencia.usuario?._id
    || ocorrencia.usuario?.id
    || null;

  return autorId ? String(autorId) : '';
}

function isOwnOcorrencia(ocorrencia) {
  const currentUserId = getCurrentUserId();
  const ocorrenciaUserId = getOcorrenciaUserId(ocorrencia);
  return Boolean(currentUserId && ocorrenciaUserId && currentUserId === ocorrenciaUserId);
}

function canConfirmarOcorrencia(ocorrencia) {
  const currentUserId = getCurrentUserId();
  const autorId = getOcorrenciaUserId(ocorrencia);
  const podeConfirmar = Boolean(
    currentUser
      && currentUser.perfil === 'usuario'
      && (!autorId || String(autorId) !== String(currentUserId))
  );

  return podeConfirmar;
}

async function confirmarOcorrencia(ocorrenciaId) {
  if (!currentUser || currentUser.perfil !== 'usuario') {
    showToast('Apenas usuários comuns podem confirmar ocorrências.', 'error');
    return;
  }

  const ocorrencia = (ocorrenciasCache || []).find((item) => String(item._id) === String(ocorrenciaId));
  if (ocorrencia && isOwnOcorrencia(ocorrencia)) {
    showToast('Você não pode confirmar a própria ocorrência.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/confirmacoes', {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ ocorrenciaId }),
    });

    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(getApiErrorMessage(body, 'Erro ao confirmar ocorrência'));
    }

    showToast(body && body.mensagem ? body.mensagem : 'Ocorrência confirmada com sucesso.', 'success');
    await loadOcorrencias(false);
    await loadTopOcorrencias();
    await loadAdminDashboard();
  } catch (err) {
    console.error('Erro ao confirmar ocorrência:', err);
    showToast(err.message || 'Falha ao confirmar ocorrência.', 'error');
  }
}

async function updateOcorrenciaStatus(ocorrenciaId, status) {
  if (!ocorrenciaId) {
    showToast('Nao foi possivel identificar a ocorrencia.', 'error');
    return;
  }

  if (!currentUser || currentUser.perfil !== 'admin') {
    showToast('Apenas administradores podem alterar ocorrencias.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/ocorrencias/${encodeURIComponent(ocorrenciaId)}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status }),
    });

    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(getApiErrorMessage(body, 'Erro ao atualizar ocorrencia'));
    }

    showToast(`Ocorrencia atualizada para ${formatOcorrenciaStatus(status)}.`, 'success');
    await loadOcorrencias(false);
    await loadTopOcorrencias();
    await loadAdminDashboard();
  } catch (err) {
    console.error('Erro ao atualizar ocorrencia:', err);
    showToast(err.message || 'Falha ao atualizar ocorrencia.', 'error');
  }
}

function transformarOcorrenciaEmVia(ocorrenciaId) {
  if (!currentUser || currentUser.perfil !== 'admin') {
    showToast('Apenas administradores podem transformar ocorrências em interdições.', 'error');
    return;
  }

  const ocorrencia = (ocorrenciasCache || []).find((item) => String(item._id) === String(ocorrenciaId));
  if (!ocorrencia) {
    showToast('Ocorrência não encontrada no cache.', 'error');
    return;
  }

  const status = normalizeOcorrenciaStatus(ocorrencia.status);
  if (status !== 'confirmada') {
    showToast('Apenas ocorrências confirmadas podem virar interdição.', 'error');
    return;
  }

  const latitude = Number(ocorrencia.latitude);
  const longitude = Number(ocorrencia.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    showToast('Ocorrência sem coordenadas válidas.', 'error');
    return;
  }

  const viaFormPanel = document.getElementById('viaFormPanel');
  if (viaFormPanel) {
    viaFormPanel.style.display = 'block';
  }

  resetFormulario();

  viaForm.rua.value = ocorrencia.rua || 'Via reportada por ocorrência';
  viaForm.bairro.value = ocorrencia.bairro || '';
  viaForm.status.value = 'Interditada';
  viaForm.motivo.value = [
    ocorrencia.categoria || ocorrencia.titulo || 'Ocorrência confirmada',
    ocorrencia.descricao || '',
  ].filter(Boolean).join(' - ');
  viaForm.previsaoLiberacao.value = '';

  viaPointLocation = { type: 'Point', coordinates: [longitude, latitude] };
  setMapMode('via');
  setSegmentFromVia({ location: viaPointLocation });

  const target = viaFormPanel || viaForm;
  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (map && typeof map.setView === 'function') {
    setTimeout(() => {
      try {
        map.invalidateSize();
        map.setView([latitude, longitude], 16);
      } catch (err) {
        console.warn('Erro ao centralizar mapa na ocorrência:', err);
      }
    }, 150);
  }

  showToast('Ocorrência carregada no formulário de Via. Revise e salve a interdição.', 'info');
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
    blockedSegment: null,
    location: null,
  };

  // ler coordenadas do mapa (se houver)
  const fromLat = document.getElementById('fromLat') ? document.getElementById('fromLat').value : '';
  const fromLng = document.getElementById('fromLng') ? document.getElementById('fromLng').value : '';
  const toLat = document.getElementById('toLat') ? document.getElementById('toLat').value : '';
  const toLng = document.getElementById('toLng') ? document.getElementById('toLng').value : '';

  if (fromLat && fromLng && toLat && toLng) {
    payload.blockedSegment = {
      from: { lat: parseFloat(fromLat), lng: parseFloat(fromLng) },
      to: { lat: parseFloat(toLat), lng: parseFloat(toLng) },
    };
    // definir location como ponto médio
    const midLat = (parseFloat(fromLat) + parseFloat(toLat)) / 2;
    const midLng = (parseFloat(fromLng) + parseFloat(toLng)) / 2;
    payload.location = { type: 'Point', coordinates: [midLng, midLat] };
  } else if (viaPointLocation) {
    payload.location = viaPointLocation;
  }

  setButtonLoading(true);

  try {
    if (currentEditId) {
      // modo edição -> PUT
      const res = await fetch(`/vias/${encodeURIComponent(currentEditId)}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
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
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });

      const body = await safeJson(res);

      if (!res.ok) {
        throw new Error(body && body.error ? body.error : 'Erro ao cadastrar via');
      }

      viaForm.reset();
      clearSegment();
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

async function handleOcorrenciaSubmit(event) {
  event.preventDefault();

  if (!currentUser) {
    showToast('Faça login para reportar uma ocorrência.', 'error');
    return;
  }
  if (currentUser.perfil !== 'usuario') {
    showToast('Apenas usuários comuns podem reportar ocorrências.', 'error');
    return;
  }

  const categoria = ocorrenciaForm.categoria.value.trim();
  const descricao = ocorrenciaForm.descricao.value.trim();
  const latitude = Number(document.getElementById('ocorrenciaLat') ? document.getElementById('ocorrenciaLat').value : '');
  const longitude = Number(document.getElementById('ocorrenciaLng') ? document.getElementById('ocorrenciaLng').value : '');

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !categoria || !descricao) {
    showToast('Informe tipo, descrição e selecione o local no mapa.', 'error');
    return;
  }

  const submitOcorrenciaBtn = document.getElementById('submitOcorrenciaBtn');
  if (submitOcorrenciaBtn) submitOcorrenciaBtn.disabled = true;

  try {
    const res = await fetch('/api/ocorrencias', {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        categoria,
        descricao,
        latitude,
        longitude,
      }),
    });

    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(getApiErrorMessage(body, 'Erro ao cadastrar ocorrência'));
    }

    ocorrenciaForm.reset();
    clearOcorrenciaDraft();
    showToast('Ocorrência enviada com sucesso.', 'success');
    await loadOcorrencias(false);
  } catch (err) {
    console.error('Erro ao cadastrar ocorrência:', err);
    showToast(err.message || 'Falha ao cadastrar ocorrência.', 'error');
  } finally {
    if (submitOcorrenciaBtn) submitOcorrenciaBtn.disabled = false;
  }
}

// Preenche o formulario com os dados da via para edicao
function carregarFormulario(via) {
  if (!via || !via._id) return;

  console.debug('carregarFormulario chamado para via:', via && via._id);

  viaForm.rua.value = via.rua || '';
  viaForm.bairro.value = via.bairro || '';
  viaForm.status.value = via.status || 'Manutenção';
  viaForm.motivo.value = via.motivo || '';
  viaForm.previsaoLiberacao.value = toDateInputValue(via.previsaoLiberacao) || '';

  currentEditId = via._id;
  submitBtn.querySelector('.btn-text').textContent = 'Salvar Alterações';
  submitBtn.classList.add('editing');
  setSegmentFromVia(via);
}

function setSegmentFromVia(via) {
  console.debug('setSegmentFromVia chamado, mapa disponível?', !!map, 'via.blockedSegment=', !!(via && via.blockedSegment));
  if (!map || typeof L === 'undefined') return;
  clearSegment();

  try {
    if (via.blockedSegment && via.blockedSegment.from && via.blockedSegment.to) {
      const a = via.blockedSegment.from;
      const b = via.blockedSegment.to;
      fromMarker = L.marker([a.lat, a.lng], { draggable: true }).addTo(map).bindPopup('Início');
      fromMarker.on('dragend', () => updateHiddenInputsFromMarkers());
      toMarker = L.marker([b.lat, b.lng], { draggable: true }).addTo(map).bindPopup('Fim');
      toMarker.on('dragend', () => updateHiddenInputsFromMarkers());
      drawSegment();
      updateHiddenInputsFromMarkers();
      // Garantir que o mapa tenha tamanho correto antes de ajustar view
      try { map.invalidateSize(); } catch (e) {}
      const bounds = L.polyline([[a.lat, a.lng], [b.lat, b.lng]]).getBounds();
      // chamar fitBounds após breve atraso para garantir que o container esteja visível
      setTimeout(() => {
        try { map.fitBounds(bounds, { padding: [40, 40] }); map.invalidateSize(); } catch (e) {}
      }, 150);
      return;
    }

    if (via.location && via.location.coordinates && via.location.coordinates.length === 2) {
      const [lng, lat] = via.location.coordinates;
      
      // Ignora coordenadas inválidas ou o padrão [0,0] do MongoDB
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        clearSegment();
        return;
      }
      
      viaPointLocation = { type: 'Point', coordinates: [lng, lat] };
      fromMarker = L.marker([lat, lng], { draggable: true }).addTo(map).bindPopup('Local').openPopup();
      fromMarker.on('dragend', () => {
        const point = fromMarker.getLatLng();
        viaPointLocation = { type: 'Point', coordinates: [point.lng, point.lat] };
        updateHiddenInputsFromMarkers();
      });
      updateHiddenInputsFromMarkers();
      try { map.invalidateSize(); } catch (e) {}
      setTimeout(() => { try { map.setView([lat, lng], 15); map.invalidateSize(); } catch (e) {} }, 150);
      return;
    }
  } catch (err) {
    console.warn('Erro ao setar segmento no mapa a partir da via:', err);
  }

  // se nao tiver dados, apenas limpar
  clearSegment();
}

function resetFormulario() {
  viaForm.reset();
  clearSegment();
  currentEditId = null;
  if (submitBtn && submitBtn.querySelector('.btn-text')) {
    submitBtn.querySelector('.btn-text').textContent = 'Cadastrar via';
  }
  submitBtn.classList.remove('editing');
}

// Inicia edicao: busca a via (já disponivel na listagem) e carrega no formulario
function editarVia(id) {
  if (!id) return showToast('ID invalido para edicao', 'error');

  const via = viasCache.find((v) => String(v._id) === String(id));
  
  if (!via) {
    showToast('Via não encontrada no cache.', 'error');
    return;
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => carregarFormulario(via), 150);
}

// Excluir via com confirmacao
async function excluirVia(id) {
  if (!id) return showToast('ID invalido', 'error');

  const confirmed = window.confirm('Deseja realmente excluir esta via?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/vias/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders(false) });
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
      headers: getAuthHeaders(true),
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
