const map = L.map('map').setView([-13.56, -43.58], 9); // Vista inicial aproximada; não representa dados coletados.
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
const status = document.getElementById('status');
const categoria = document.getElementById('categoria');
const localidade = document.getElementById('localidade');
const info = document.getElementById('info');
let pointsLayer = L.layerGroup().addTo(map);
let points = [];
const getName = p => String(p.NM_LOCALIDADE ?? p.nome ?? p.name ?? 'Localidade sem nome');
const getCategory = p => String(p.Categorias_IBGE ?? p.categoria ?? 'Sem categoria');


const coresCategorias = [
  "#8E44AD", // Roxo
  "#E67E22", // Laranja
  "#27AE60", // Verde
  "#E84393", // Rosa
  "#2980B9", // Azul
  "#16A085", // Verde-azulado
  "#F1C40F", // Amarelo
  "#C0392B", // Vermelho
  "#7F8C8D"  // Cinza
];

function corDaCategoria(categoria) {
  const categorias = [...new Set(
    points.map(f => getCategory(f.properties))
  )].sort();

  const indice = categorias.indexOf(categoria);

  return coresCategorias[
    indice >= 0 ? indice % coresCategorias.length : 0
  ];
}


function criarLegenda() {
  const legenda = document.getElementById("legenda-categorias");
  if (!legenda) return;

  legenda.innerHTML = "";

  const categorias = [...new Set(
    points.map(f => getCategory(f.properties))
  )].sort();

  for (const nome of categorias) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "legenda-item";

    const cor = document.createElement("span");
    cor.className = "legenda-cor";
    cor.style.backgroundColor = corDaCategoria(nome);

    const texto = document.createElement("span");
  
    
    const quantidade = points.filter(
      f => getCategory(f.properties) === nome
    ).length;

    texto.textContent = `${nome} (${quantidade})`;


    botao.append(cor, texto);

    botao.addEventListener("click", () => {
      categoria.value = categoria.value === nome ? "" : nome;
      localidade.value = "";
      render();
    });

    legenda.appendChild(botao);
  }
}


let graficoCategorias = null;


const pluginValores = {
    id: "valoresBarras",

    afterDatasetsDraw(chart) {
        const { ctx } = chart;

        ctx.save();
        ctx.font = "bold 12px Arial";
        ctx.fillStyle = "#244536";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        chart.getDatasetMeta(0).data.forEach((barra, indice) => {
            const valor = chart.data.datasets[0].data[indice];

            ctx.fillText(
                String(valor),
                barra.x + 8,
                barra.y
            );
        });

        ctx.restore();
    }
};



function atualizarGrafico() {
  const canvas = document.getElementById("graficoCategorias");

  if (!canvas || typeof Chart === "undefined") return;

  const categorias = [...new Set(
    points.map(f => getCategory(f.properties))
  )].sort();

  const quantidades = categorias.map(nome =>
    points.filter(f => getCategory(f.properties) === nome).length
  );

  
  const cores = categorias.map(nome => {
      const cor = corDaCategoria(nome);

      if (!categoria.value || categoria.value === nome) {
          return cor;
      }

      return cor + "40";
  });


  if (graficoCategorias) {
    graficoCategorias.destroy();
  }

  graficoCategorias = new Chart(canvas, {
    type: "bar",
    plugins: [pluginValores],
    data: {
      labels: categorias,
      datasets: [{
        label: "Número de localidades",
        data: quantidades,
        backgroundColor: cores,
        borderRadius: 5
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,

      onClick: (evento, elementos) => {
          if (elementos.length === 0) return;

          const indice = elementos[0].index;
          const nome = categorias[indice];

          categoria.value = categoria.value === nome ? "" : nome;
          localidade.value = "";

          render();
          atualizarGrafico();
      },


      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}



function atualizarTabela(localidades) {
    const corpo = document.getElementById("corpoTabela");
    if (!corpo) return;

    
    const pesquisa = document.getElementById("pesquisaLocalidade");

    const termo = (pesquisa?.value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    localidades = localidades.filter(f => {
        const nome = getName(f.properties)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        return nome.includes(termo);
    });


    corpo.innerHTML = "";

    localidades.forEach((f, indice) => {
        const p = f.properties;
        const nome = getName(p);
        const tipo = getCategory(p);

        const linha = document.createElement("tr");

        const numero = document.createElement("td");
        numero.textContent = indice + 1;

        const nomeCelula = document.createElement("td");
        nomeCelula.textContent = nome;

        const categoriaCelula = document.createElement("td");
        categoriaCelula.textContent = tipo;

        const acao = document.createElement("td");
        const botao = document.createElement("button");
        botao.className = "btn-localizar";
        botao.textContent = "Ver no mapa";

        botao.addEventListener("click", () => {
            const [longitude, latitude] = f.geometry.coordinates;

            map.setView([latitude, longitude], 13);
            mostrarFicha(f);

            const marcador = window.marcadoresLocalidades?.get(getName(f.properties));

           if (marcador) {
                // Restaurar todos os marcadores
                window.marcadoresLocalidades.forEach(m => {
                    m.setRadius(7);
                    m.setStyle({ weight: 1 });
                });

                // Destacar somente o selecionado
                marcador.setRadius(11);
                marcador.setStyle({ weight: 3 });

                // Abrir informações
                marcador.openPopup();
            }

            const painelMapa = document.getElementById("map");
            if (painelMapa) {
                painelMapa.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }
        });

        acao.appendChild(botao);
        linha.append(numero, nomeCelula, categoriaCelula, acao);
        corpo.appendChild(linha);
    });
}


function mostrarFicha(f) {
    const p = f.properties;
    const [longitude, latitude] = f.geometry.coordinates;

    const ficha = document.getElementById("ficha-conteudo");

    if (!ficha) return;

    ficha.innerHTML = `
        <h3>${escapeHtml(getName(p))}</h3>

        <p><strong>Categoria IBGE:</strong>
        ${escapeHtml(getCategory(p))}</p>

        <p><strong>Município:</strong>
        Serra do Ramalho – BA</p>

        <p><strong>Latitude:</strong>
        ${latitude.toFixed(6)}</p>

        <p><strong>Longitude:</strong>
        ${longitude.toFixed(6)}</p>

        <hr>

        <h4>Indicadores agropecuários</h4>

        <p>Produção diária de leite: aguardando dados</p>
        <p>Número de produtores: aguardando dados</p>
        <p>Rebanho bovino: aguardando dados</p>
    `;
}


function render() {
  pointsLayer.clearLayers();
  const filtered = points.filter(f => (!categoria.value || getCategory(f.properties) === categoria.value) && (!localidade.value || getName(f.properties) === localidade.value));
  
  atualizarTabela(filtered);
  
  window.marcadoresLocalidades = new Map();
  
  for (const f of filtered) {
    const p = f.properties;
    const marcador = L.circleMarker(
  [f.geometry.coordinates[1], f.geometry.coordinates[0]],
  {
    radius: 7,
    color: "#34495E",
    weight: 1,
    fillColor: corDaCategoria(getCategory(p)),
    fillOpacity: 0.85
  }
)
.bindPopup(`<strong>${escapeHtml(getName(p))}</strong><br>${escapeHtml(getCategory(p))}`)

.on('click', () => {
    info.textContent = `${getName(p)} — ${getCategory(p)}`;
    mostrarFicha(f);
})

.addTo(pointsLayer);
window.marcadoresLocalidades.set(getName(p), marcador);
  }
  document.getElementById('total').textContent = filtered.length.toLocaleString('pt-BR');
  status.textContent = `${filtered.length} localidade(s) exibida(s)`;

  
  const categoriasVisiveis = new Set(
      filtered.map(f => getCategory(f.properties))
  );

  document.getElementById("totalCategorias").textContent =
      categoriasVisiveis.size.toLocaleString("pt-BR");

  const percentual = points.length > 0
      ? (filtered.length / points.length) * 100
      : 0;

  document.getElementById("percentualLocalidades").textContent =
      percentual.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
      }) + "%";



}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function loadGeoJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}
(async function init(){
  try {
    const boundary = await loadGeoJSON('dados/municipio.geojson');
    const outline = L.geoJSON(boundary,{style:{color:'#e48b26',weight:3,fillColor:'#f5c16b',fillOpacity:.07}}).addTo(map);
    if(outline.getBounds().isValid()) map.fitBounds(outline.getBounds(),{padding:[18,18]});
  } catch(e){console.warn('Contorno ainda não disponível:',e.message);}
  try {
    const data = await loadGeoJSON('dados/localidades.geojson');
    points = (data.features || []).filter(f=>f.geometry?.type==='Point' && f.geometry.coordinates?.length>=2 && f.geometry.coordinates.every(Number.isFinite));
    const categories = [...new Set(points.map(f=>getCategory(f.properties)))].sort();
    const names = [...new Set(points.map(f=>getName(f.properties)))].sort();
    for(const c of categories) categoria.add(new Option(c,c));
    for(const n of names) localidade.add(new Option(n,n));
    categoria.addEventListener('change',render);localidade.addEventListener('change',render);
    criarLegenda();
    render();
    atualizarGrafico();
    if(points.length){const bounds=L.latLngBounds(points.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]]));map.fitBounds(bounds.pad(.15));}
  }catch(e){status.textContent='Aguardando dados reais';console.warn('Localidades ainda não disponíveis:',e.message);}
})();


document.getElementById("pesquisaLocalidade")
    ?.addEventListener("input", () => {
        const filtradas = points.filter(f =>
            (!categoria.value ||
                getCategory(f.properties) === categoria.value) &&
            (!localidade.value ||
                getName(f.properties) === localidade.value)
        );

        atualizarTabela(filtradas);
    });


    
document.getElementById("btnExportarCSV")
    ?.addEventListener("click", () => {

        const linhas = [
            ["Nº", "Localidade", "Categoria IBGE"]
        ];

        document.querySelectorAll("#corpoTabela tr")
            .forEach((tr, indice) => {
                const celulas = tr.querySelectorAll("td");

                if (celulas.length >= 3) {
                    linhas.push([
                        indice + 1,
                        celulas[1].textContent.trim(),
                        celulas[2].textContent.trim()
                    ]);
                }
            });

        const csv = linhas.map(linha =>
            linha.map(valor =>
                `"${String(valor).replace(/"/g, '""')}"`
            ).join(";")
        ).join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "BioAgroDigital_Localidades.csv";
        link.click();

        URL.revokeObjectURL(url);
    });


    