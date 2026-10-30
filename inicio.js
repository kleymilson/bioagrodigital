
/* BioAgroDigital — Mapa da página inicial */

const mapaInicio = L.map("mapa-inicio", {
  scrollWheelZoom: false
});

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }
).addTo(mapaInicio);

fetch("dados/municipio.geojson")
  .then(resposta => {
    if (!resposta.ok) {
      throw new Error("Não foi possível carregar o GeoJSON");
    }
    return resposta.json();
  })
  .then(dados => {

    const municipio = L.geoJSON(dados, {
      style: {
        color: "#087b45",
        weight: 4,
        opacity: 1,
        fillColor: "#42b883",
        fillOpacity: 0.18
      }
    }).addTo(mapaInicio);

   
    mapaInicio.fitBounds(
    municipio.getBounds(),
    {
        padding: [15, 15],
        maxZoom: 10
    }
    );


    municipio.bindPopup(
      "<strong>Serra do Ramalho — BA</strong><br>" +
      "Limite municipal — IBGE"
    );


    const centroMunicipio = municipio.getBounds().getCenter();

    L.marker(centroMunicipio, {
    icon: L.divIcon({
        className: "rotulo-municipio",
        html: "<span>SERRA DO RAMALHO<br><small>BAHIA</small></span>",
        iconSize: [210, 55],
        iconAnchor: [105, 27]
    }),
    interactive: false
    }).addTo(mapaInicio);



  })
  .catch(erro => {
    console.error("Erro ao carregar o mapa:", erro);
    mapaInicio.setView([-13.5, -43.5], 9);
  });
