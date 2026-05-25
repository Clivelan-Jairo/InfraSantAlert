// script.js — lógica frontend para InfraSantAlert
// Usa fetch() para comunicar com a API Express

// Variáveis que serão inicializadas após o DOM carregar
let viaForm;
let viasList;

// Carrega vias e inicializa listeners ao abrir a página
document.addEventListener('DOMContentLoaded', () => {
  // Seleciona elementos do DOM agora que estão disponíveis
  viaForm = document.getElementById('viaForm');
  viasList = document.getElementById('viasList');

  if (!viaForm) {
    console.error('Formulário `viaForm` não encontrado no DOM');
    return;
  }

  // Adiciona listener de submit no formulário
  viaForm.addEventListener('submit', handleSubmit);

  // Carrega vias iniciais
  loadVias();
});

// Função para buscar vias da API
async function loadVias() {
  try {
    const res = await fetch('/vias');
    const vias = await res.json();
    // Se a API retornou um objeto de erro em vez de um array, log e mostra mensagem
    if (!Array.isArray(vias)) {
      console.error('Resposta inesperada de /vias:', vias);
      viasList.innerHTML = `<p class="error">Erro ao carregar vias: ${escapeHtml(vias && vias.error ? vias.error : JSON.stringify(vias))}</p>`;
      return;
    }
    renderVias(vias);
  } catch (err) {
    console.error('Erro ao carregar vias', err);
  }
}

// Renderiza lista de vias
function renderVias(vias) {
  viasList.innerHTML = '';
  if (!vias || vias.length === 0) {
    viasList.innerHTML = '<p>Nenhuma via cadastrada.</p>';
    return;
  }

  vias.forEach(v => {
    const card = document.createElement('div');
    card.className = 'via-card';
    const previsao = v.previsaoLiberacao ? `• Previsão: ${formatDate(v.previsaoLiberacao)}` : '';
    card.innerHTML = `
      <h3>${escapeHtml(v.rua)}</h3>
      <div class="via-meta">${escapeHtml(v.bairro)} • ${escapeHtml(v.status)} ${previsao}</div>
      <div class="via-desc">${escapeHtml(v.motivo || '')}</div>
    `;
    viasList.appendChild(card);
  });
}

// Handler do submit separado para facilitar debug
async function handleSubmit(e) {
  e.preventDefault();
  if (!viaForm) return;

  const data = {
    rua: viaForm.rua.value.trim(),
    bairro: viaForm.bairro.value.trim(),
    status: viaForm.status.value,
    motivo: viaForm.motivo.value.trim(),
    previsaoLiberacao: viaForm.previsaoLiberacao.value || null,
  };

  try {
    console.log('Enviando dados:', data);
    const res = await fetch('/vias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      // tentar extrair mensagem de erro do corpo
      let errMsg = 'Falha ao cadastrar via';
      try {
        const body = await res.json();
        errMsg = body && body.error ? body.error : JSON.stringify(body);
      } catch (e) {
        // não há JSON
      }
      throw new Error(errMsg);
    }

    // Limpa formulário e atualiza lista
    viaForm.reset();
    await loadVias();
  } catch (err) {
    console.error(err);
    alert('Erro ao cadastrar via. Verifique o console.');
  }
}

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(value) {
  try {
    const d = new Date(value);
    return d.toLocaleDateString();
  } catch (e) {
    return value;
  }
}
