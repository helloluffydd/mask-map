// Loading 效果
$.LoadingOverlay("show",{
  background  : "rgba(0, 0, 0, 0.5)"
});

// 建立 Leaflet 地圖，並設定中心經緯度座標（台北市），縮放程度為 10。
const map = L.map('map', {
  center: [25.040065, 121.523235],
  zoom: 10,
  zoomControl: false
})

// 設定地圖資料來源（OpenStreetMap）。
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
L.tileLayer(osmUrl, {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> | 資料來源：<a href="https://data.nhi.gov.tw/Datasets/DatasetResource.aspx?rId=A21030000I-D50001-001&fbclid=IwAR11LdkhQPr1nyASKg0bUCx6LnIGY7KECOeVQ2EHwc67f2iKocIMuXRIpFE">衛生福利部中央健康保險署</a> | Created by <a href="https://www.facebook.com/luffychen0715?ref=bookmarks" target="_blank">Luffy</a>',
  minZoom: 8,
  maxZoom: 18
}).addTo(map);

// 自訂縮放按鈕位置。
L.control.zoom({
  position: 'topright'
}).addTo(map);

// 自訂藥局座標 Icon。
function createLocationIcon(color) {
  return new L.Icon({
  iconUrl: `./Assets/flag-${color}.png`,
    // shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [41, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}
const greenIcon = createLocationIcon('green');
const orangeIcon = createLocationIcon('orange');
const redIcon = createLocationIcon('red');

// 區域藥局群集。
const storeCluster = new L.MarkerClusterGroup({
	spiderfyOnMaxZoom: true,
	showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  iconCreateFunction: function(cluster) {
		return L.divIcon({ html: `<div class="store-cluster">${cluster.getChildCount()}</div>` });
	}
}).addTo(map);

// 串接 API，（非同步）獲取遠端 API 或本地 JSON 資料（封裝成一個 function）。
function getXML(path) {
  // 利用 Promise 確保獲取資料完成。
  return new Promise((resolve, reject) => {
    const xhrReq = new XMLHttpRequest();
    xhrReq.onload = function() {
      if(xhrReq.status == 200) {        
        const data = JSON.parse(xhrReq.response);
        resolve(data);
      } else {
        console.log('抱歉，現在無法取的即時資訊！');
      }
    };
    xhrReq.open('GET', path);
    xhrReq.send();
  })
}

const getCityDatas = getXML('./CityCountyData.json');
const getStoreDatas = getXML('https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json?fbclid=IwAR0RC0E5_D-1vZVHJX_wvm7VUvdHYYcGw2Q0sSk4ppxu1zvqh7hAWN0oHdU');

// 當所有資料獲取完畢後，整理資料。
Promise.all([getCityDatas, getStoreDatas]).then(resultDatas => {
  const cityDatas = resultDatas[0];
  const storeDatas = resultDatas[1].features;

  // 建立搜尋選項（預設）。
  createCityOption(cityDatas);
  createAreaOption(cityDatas, '台北市');

  // 印出所有藥局口罩庫存資訊（預設）。
  showAllStore(storeDatas);

  $.LoadingOverlay("hide");

  // 在地圖上繪製所有藥局資訊。
  drawAllStore(storeDatas);

  // 取得今日時間與購買口罩者
  getToday();


  document.getElementById('city').addEventListener('change', function() {
    const citySelected = document.getElementById('city').value;
    document.getElementById('searchValue').value = '';
    createAreaOption(cityDatas, citySelected);
    findCityStore(storeDatas, citySelected);
  })

  document.getElementById('area').addEventListener('change', function() {
    const citySelected = document.getElementById('city').value;
    const areaSelected = document.getElementById('area').value;
    document.getElementById('searchValue').value = '';
    findAreaStore(storeDatas, citySelected, areaSelected);
  })

  document.getElementById('searchBtn').addEventListener('click', function() {
    const searchValue = document.getElementById('searchValue').value;
    let str = ``;
    let storeCount = 0;
    storeDatas.filter(store => {
      if(store.properties.address.includes(searchValue) || store.properties.name.includes(searchValue)) {
        [str, storeCount] = createHTML(store, str, storeCount);
      }
    })
    document.getElementById('store-total').innerHTML = `總共找到</u> ${storeCount} 家相符的藥局。`;
    document.getElementById('store-list').innerHTML = str;
  })

  // 監聽資訊面板開闔按鈕。
  document.getElementById('close-board-btn').addEventListener('click', function() {
    document.querySelector('.board').classList.add('hide');
  })

  document.getElementById('open-board-btn').addEventListener('click', function() {
    document.querySelector('.board').classList.remove('hide');
  })
})

// 取得今日日期
function getToday() {
  let today = new Date();
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  let todayStr = `今天是 <span class="font-weight-bold">${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日 ${days.find((day, index) => index === today.getDay())} </span><br> 
  <i id="detail-info" class="fas fa-info-circle h6" data-toggle="modal" data-target="#infoModal"></i> 身分證尾數為 <span class="text-primary font-weight-bold h5">${today.getDay() % 2 === 1 ? '單數' : '雙數'}</span> 者可以購買口罩`;
  document.getElementById('date').innerHTML = todayStr;
}

// 產生城市搜尋欄位裡的選項。
function createCityOption(cityDatas) {
  const citySelect = document.getElementById('city');
  const cityArray = cityDatas.map(item => item.CityName.replace(/臺/g,'台'));
  removeByValue(cityArray, '南海島');
  removeByValue(cityArray, '釣魚台');

  // 刪除陣列中重複的數值或字串。
  const noRepeatCityArray = cityArray.filter((item, index, arr) => {
    return arr.indexOf(item) === index;
  })

  let cityOptionHTML = `<option value="" selected disabled>請選擇縣市</option>`;
  noRepeatCityArray.forEach(item => {
    cityOptionHTML += `<option value="${item}">${item}</option>`;
  })
  citySelect.innerHTML = cityOptionHTML;
}

// 產生鄉鎮市區搜尋欄位裡的選項。
function createAreaOption(cityData, citySelected) {
  const areaSelect = document.getElementById('area');
  const citySelectedObj = cityData.find(item => item.CityName.replace(/臺/g, '台') === citySelected);
  const areaArray = citySelectedObj.AreaList;

  let areaOptionHTML = `<option value="all" selected>全部</option>`;
  areaArray.forEach(item => {
    areaOptionHTML += `<option value="${item.AreaName}">${item.AreaName}</option>`;
  })
  areaSelect.innerHTML = areaOptionHTML;
}

// 產生藥局資訊的 HTML 樣板。
function createHTML(store, html, count) {
  let [bgAdultColor, bgChildColor] = ['#bfffbf', '#bfffbf']; // 綠  
  if(store.properties.mask_adult <= 100) bgAdultColor = '#ffa470'; // 橙
  if(store.properties.mask_adult <= 30) bgAdultColor = '#ff9696'; // 紅
  if(store.properties.mask_child <= 100) bgChildColor = '#ffa470';
  if(store.properties.mask_child <= 30) bgChildColor = '#ff9696';
  html += `
    <div class="store-info">
      <h5 class="font-weight-bold mb-2">${store.properties.name}</h5>
      <p class="mb-1"><i class="fas fa-map-marker-alt"></i>  <a href="https://www.google.com.tw/maps/place/${store.properties.address}" target="_blank">${store.properties.address}</a></p>
      <p class="mb-2"><i class="fas fa-phone-alt"></i> ${store.properties.phone}</p>
      <div class="masks-info">
        <div class="mask-item" style="background-color: ${bgAdultColor}">成人口罩 <span>${store.properties.mask_adult}</span> 個</div>
        <div class="mask-item" style="background-color: ${bgChildColor}">兒童口罩 <span>${store.properties.mask_child}</span> 個</div>
      </div>
    </div>
    <hr>  
  `;
  count += 1;
  return [html, count];
}

// 印出所有藥局資訊。
function showAllStore(stores) {
  let str = ``;
  let storeCount = 0;
  stores.forEach(store => {
    [str, storeCount] = createHTML(store, str, storeCount);
  })
  document.getElementById('store-total').innerHTML = `全台總共有</u> ${storeCount} 家藥局。`;
  document.getElementById('store-list').innerHTML = str;
}

// 搜尋所選擇城市裡的藥局資訊。
function findCityStore(stores, citySelected) {
  let str = ``;
  let storeCount = 0;
  stores.forEach(store => {
    if(store.properties.address.includes(citySelected)) {
      [str, storeCount] = createHTML(store, str, storeCount);
    }
  })
  document.getElementById('store-total').innerHTML = `總共搜尋到 ${storeCount} 家藥局。`;
  document.getElementById('store-list').innerHTML = str;
}

// 搜尋所選擇鄉鎮市區裡的藥局資訊。
function findAreaStore(stores, citySelected, areaSelected) {
  let str = ``;
  let storeCount = 0;

  if(areaSelected === 'all') {
    findCityStore(stores, citySelected);
    return
  }

  stores.forEach(store => {
    if(store.properties.address.includes(citySelected + areaSelected)) {
      [str, storeCount] = createHTML(store, str, storeCount);
    }
  })
  document.getElementById('store-total').innerHTML = `總共搜尋到 ${storeCount} 家藥局。`;
  document.getElementById('store-list').innerHTML = str;
}

// 標出每家藥局的位置和口罩庫存。
function drawAllStore(datas) {
  datas.forEach(store => {
    let [cirColor, flagIcon] = ['#1cdb0f', greenIcon]; // 綠
    if(store.properties.mask_adult <= 100) [cirColor, flagIcon] = ['#ff9838', orangeIcon]; // 橘
    if(store.properties.mask_adult < 30) [cirColor, flagIcon] = ['#EB6875', redIcon]; // 紅

    L.circle([store.geometry.coordinates[1], store.geometry.coordinates[0]], {
      weight: 0,
      color: 'black',
      fillColor: cirColor,
      fillOpacity: 1,
      radius: 5
    }).addTo(map);

    const storeLocation = L.marker([store.geometry.coordinates[1], store.geometry.coordinates[0]], {icon: flagIcon});
    storeLocation.bindPopup(`
    <h5 style="font-weight: bold">${store.properties.name}</h5>
    <p><a href="https://www.google.com.tw/maps/place/${store.properties.address}" target="_blank">${store.properties.address}</a></p>
    <p>電話： ${store.properties.phone}</p>
    <p class="font-weight-bold"><span>成人：  ${store.properties.mask_adult} 個</span>／兒童：${store.properties.mask_child} 個</p>
    `);

    storeCluster.addLayer(storeLocation);
  })
  map.addLayer(storeCluster);
}

// 刪除陣列中的特定數值或字串。
function removeByValue(array, value) {
  return array.forEach((item, index) => {
    if(item === value) {
      array.splice(index, 1);
    }
  })
}
