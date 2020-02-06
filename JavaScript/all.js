// 建立 Leaflet 地圖，並設定經緯度座標，縮放程度為 6。
const map = L.map('map').setView(new L.LatLng(23.628008, 121.097567), 8);

// 設定地圖資料來源（OpenStreetMap）。
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
L.tileLayer(osmUrl, {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
  minZoom: 8,
  maxZoom: 17
}).addTo(map);


// 獲取口罩庫存資料。
let maskDatas = [];
const maskDatasURL = 'https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json?fbclid=IwAR0RC0E5_D-1vZVHJX_wvm7VUvdHYYcGw2Q0sSk4ppxu1zvqh7hAWN0oHdU';
const xhr_mask = new XMLHttpRequest();
xhr_mask.open('GET', maskDatasURL, true);
xhr_mask.responseType = 'json';
xhr_mask.send();

xhr_mask.onload = function() {
  if(xhr_mask.status === 200) {
    console.log(xhr_mask);
    maskDatas = xhr_mask.response.features;
    cleanDatas(maskDatas);
  } else {
    console.log('抱歉，現在無法取的即時資訊！');
  }
}

// 整理資料。
function cleanDatas(datas) {
  datas.forEach(store => {    
    store.properties.phone = store.properties.phone.split(' ').join('');
    store.properties.address = store.properties.address.replace(/臺/g, '台');
  })
  console.log(datas);
  drawPharmacy(datas);
}

// 標出每家藥局的位置和口罩庫存。
function drawPharmacy(datas) {
  datas.forEach(store => {
    let color = '#1cdb0f'; // 綠
    if(store.properties.mask_adult <= 100) color = '#ff9838'; // 橘
    if(store.properties.mask_adult < 30) color = '#EB6875'; // 紅

    let pharLocation = L.circle([store.geometry.coordinates[1], store.geometry.coordinates[0]], {
      weight: 0.1,
      color: 'black',
      fillColor: color,
      fillOpacity: 1,
      radius: 30
    }).addTo(map);

    pharLocation.bindPopup(`
    <h6 style="font-weight: bold">${store.properties.name}</h6>
    <p style="margin: 0"><a href="https://www.google.com.tw/maps/place/${store.properties.address}" target="_blank">${store.properties.address}</a></p>
    成人： ${store.properties.mask_adult} 個<br>
    兒童： ${store.properties.mask_child} 個<br>
    電話： ${store.properties.phone}<br>
    `);
  })
}
