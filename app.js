const API_URL = 'https://script.google.com/macros/s/AKfycbw19nBjnqtdmuaRPCkdZTBRQ4ItCxnfXQ-fRvS1V9JdCQWsf8JkQ_s2H-yy9XA2Kg753w/exec';

let AUTH = {
  usuario: '',
  senha: ''
};

const searchForm = document.getElementById('searchForm');
const queryInput = document.getElementById('queryInput');
const feedback = document.getElementById('feedback');
const multipleSection = document.getElementById('multipleSection');
const multipleList = document.getElementById('multipleList');
const detailSection = document.getElementById('detailSection');

function entrarPortal() {
  const usuario = document.getElementById('loginUsuario').value.trim().toUpperCase();
  const senha = document.getElementById('loginSenha').value.trim();
  const msg = document.getElementById('loginMsg');

  if (!usuario || !senha) {
    msg.innerText = 'Informe usuário e senha.';
    return;
  }

  AUTH.usuario = usuario;
  AUTH.senha = senha;

  document.getElementById('loginScreen').style.display = 'none';
  msg.innerText = '';
}

function trocarCliente() {
  AUTH = { usuario: '', senha: '' };

  document.getElementById('loginUsuario').value = '';
  document.getElementById('loginSenha').value = '';
  document.getElementById('loginMsg').innerText = '';
  document.getElementById('loginScreen').style.display = 'flex';

  hideResults();
  setFeedback('');
}

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
    setFeedback('Erro ao consultar rastreio. Verifique o login e tente novamente.');
  }
});

async function requestSearch(query) {
  if (!AUTH.usuario || !AUTH.senha) {
    document.getElementById('loginScreen').style.display = 'flex';
    throw new Error('Login necessário.');
  }

  const url = `${API_URL}?usuario=${encodeURIComponent(AUTH.usuario)}&senha=${encodeURIComponent(AUTH.senha)}&query=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    method: 'GET'
  });

  if (!res.ok) throw new Error('Falha na API');

  const payload = await res.json();

  if (payload && payload.type === 'error') {
    trocarCliente();
    document.getElementById('loginMsg').innerText = payload.message || 'Acesso não autorizado.';
    throw new Error(payload.message || 'Acesso não autorizado.');
  }

  return payload;
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

      try {
        const payload = await requestSearch(item.NF || item.id);
        const tipo = payload.type || payload.tipo || '';
        const resultadoUnico = payload.result || payload.resultado || null;

        if (tipo === 'single' || tipo === 'único' || tipo === 'unico') {
          renderDetail(resultadoUnico);
          detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (err) {
        setFeedback('Erro ao carregar detalhes.');
      }
    });

    multipleList.appendChild(card);
  });
}

function renderDetail(result) {
  if (!result) {
    setFeedback('Resultado inválido.');
    return;
  }

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
