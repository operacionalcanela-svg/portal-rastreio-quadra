const API_URL = 'https://script.google.com/macros/s/AKfycbw19nBjnqtdmuaRPCkdZTBRQ4ItCxnfXQ-fRvS1V9JdCQWsf8JkQ_s2H-yy9XA2Kg753w/exec';

const CLIENTES_VALIDOS = ['QUADRA', 'ITAPOAN'];
function obterClientePortal() {
  let cliente = localStorage.getItem('clientePortal');

  if (cliente && CLIENTES_VALIDOS.includes(cliente)) {
    return cliente;
  }

  cliente = prompt('Informe o código de acesso do cliente: QUADRA ou ITAPOAN');

  cliente = String(cliente || '').trim().toUpperCase();

  if (!CLIENTES_VALIDOS.includes(cliente)) {
    alert('Código de cliente inválido.');
    localStorage.removeItem('clientePortal');
    return '';
  }

  localStorage.setItem('clientePortal', cliente);
  return cliente;
}
function trocarCliente() {
  localStorage.removeItem('clientePortal');
  obterClientePortal();
}
const searchForm = document.getElementById('searchForm');
const queryInput = document.getElementById('queryInput');
const feedback = document.getElementById('feedback');
const multipleSection = document.getElementById('multipleSection');
const multipleList = document.getElementById('multipleList');
const detailSection = document.getElementById('detailSection');

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;

  setFeedback('Consultando...');
  hideResults();

  try {
    const payload = await requestSearch(query);
    renderPayload(payload, query);
  } catch (err) {
    setFeedback('Erro ao consultar rastreio. Tente novamente em instantes.');
  }
});

async function requestSearch(query) {
  const clientePortal = obterClientePortal();

  if (!clientePortal) {
    throw new Error('Cliente não informado.');
  }

  const url = `${API_URL}?cliente=${encodeURIComponent(clientePortal)}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    method: 'GET'
  });

  if (!res.ok) throw new Error('Falha na API');
  return await res.json();
}

function renderPayload(payload, query) {
  if (!payload) {
    setFeedback(`Nenhum resultado para "${query}".`);
    return;
  }

  const tipo = payload.type || payload.tipo || '';
  const resultadoUnico = payload.result || payload.resultado || null;
  const resultadosMultiplos = payload.results || payload.resultados || [];

  if (tipo === 'empty' || tipo === 'vazio') {
    setFeedback(payload.message || payload.mensagem || `Nenhum resultado para "${query}".`);
    return;
  }

  if (tipo === 'multiple' || tipo === 'múltiplo' || tipo === 'multiplo') {
    setFeedback(`Foram encontradas ${resultadosMultiplos.length} notas.`);
    renderMultiple(resultadosMultiplos);
    return;
  }

  if (tipo === 'single' || tipo === 'único' || tipo === 'unico') {
    setFeedback('Nota encontrada.');
    renderDetail(resultadoUnico);
    return;
  }

  setFeedback(payload.message || payload.mensagem || 'Resposta inesperada da API.');
}

function renderMultiple(results) {
  multipleSection.classList.remove('hidden');
  multipleList.innerHTML = '';

  results.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'result-item';
    card.innerHTML = `
      <div><small>NF</small><div>${fmt(item.NF)}</div></div>
      <div><small>Destinatário</small><div>${fmt(item.Destinatario)}</div></div>
      <div><small>Status</small><div>${fmt(item.statusFriendly)}</div></div>
      <div><small>Onde está</small><div>${fmt(item.whereNowFriendly)}</div></div>
      <div><small>Previsão</small><div>${fmt(item.Previsao)}</div></div>
      <button type="button">Ver detalhes</button>
    `;

    card.querySelector('button').addEventListener('click', async () => {
      setFeedback('Carregando detalhes...');
      const payload = await requestSearch(item.NF || item.id);

      const tipo = payload.type || payload.tipo || '';
      const resultadoUnico = payload.result || payload.resultado || null;

      if (tipo === 'single' || tipo === 'único' || tipo === 'unico') {
        renderDetail(resultadoUnico);
        detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    multipleList.appendChild(card);
  });
}

function renderDetail(result) {
  detailSection.classList.remove('hidden');

  setText('dNF', result.NF);
  setText('dWhere', result.whereNowFriendly);
  setText('dPrev', result.Previsao);
  setText('dEntrega', result.Entrega);
  setText('dRomaneio', result.Romaneio);
  setText('dVolumes', result.Volumes);
  setText('dRemetente', result.Remetente);
  setText('dCidadeRem', result.CidadeRemetente);
  setText('dDest', result.Destinatario);
  setText('dCidadeDest', result.CidadeDestinatario);
  setText('dChave', result.Chave);
  setText('dObs', result.Observacoes);

  const statusEl = document.getElementById('dStatus');
  statusEl.textContent = fmt(result.statusFriendly);
  statusEl.className = `pill ${getStatusClass(result.statusFriendly)}`;

  renderTimeline(result.timeline || []);
}

function getStatusClass(status) {
  const s = String(status || '').toLowerCase();

  if (s.includes('emitida')) return 'status-emitida';
  if (s.includes('coletada')) return 'status-coletada';
  if (s.includes('trânsito') || s.includes('transito')) return 'status-transito';
  if (s.includes('base')) return 'status-base';
  if (s.includes('saiu para entrega')) return 'status-saiu';
  if (s.includes('entregue parcialmente')) return 'status-fracionado';
  if (s.includes('entregue')) return 'status-entregue';
  if (s.includes('recusada')) return 'status-recusa';
  if (s.includes('não entregue') || s.includes('nao entregue')) return 'status-nao-entregue';

  return 'status-default';
}

function renderTimeline(steps) {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';

  const etapasPadrao = [
    { key: 'emissao', label: 'Emissão' },
    { key: 'coleta', label: 'Coleta' },
    { key: 'transito', label: 'Em trânsito / Base' },
    { key: 'saida', label: 'Saída para entrega' },
    { key: 'entrega', label: 'Entrega' }
  ];

  const mapa = {};
  steps.forEach(step => {
    mapa[step.key] = step;
  });

  etapasPadrao.forEach((etapa) => {
    const step = mapa[etapa.key];
    const row = document.createElement('div');

    let classe = 'timeline-item future';
    let textoData = '—';

    if (step) {
      textoData = fmt(step.date);
      if (step.isCurrent) {
        classe = 'timeline-item current';
      } else if (step.done) {
        classe = 'timeline-item done';
      } else {
        classe = 'timeline-item';
      }
    }

    row.className = classe;
    row.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <strong>${etapa.label}</strong>
        <span>${textoData}</span>
      </div>
    `;

    timeline.appendChild(row);
  });
}

function hideResults() {
  multipleSection.classList.add('hidden');
  detailSection.classList.add('hidden');
  multipleList.innerHTML = '';
}

function setText(id, value) {
  document.getElementById(id).textContent = fmt(value);
}

function fmt(v) {
  return (v === null || v === undefined || String(v).trim() === '') ? '—' : String(v);
}

function setFeedback(msg) {
  feedback.textContent = msg;
}

