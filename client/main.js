const feedDisplay = document.querySelector('#feed')
const oosCheckbox = document.querySelector('#oos')
const foilCheckbox = document.querySelector('#foil')

const shopsID = {'valet':'Le Valet d\'Coeur', 
                'geeks':'Chez Geeks',
                'altf4':'Alt F4',
                'expedition':'L\'Expédition',
                // 'facetoface':'FacetoFace'
            };

// var baseUrl = 'http://localhost:80/'
var baseUrl = '/'
var form = document.querySelector('form');
var resultsList = [];

form.addEventListener('submit', async function(e) {
  document.getElementById('loadingGif').style.display = "block";
  clearResults();
  e.preventDefault();
  var input = document.querySelector('#message');
  var cardList = input.value.trim().split("\n")
  getPrice(cardList);
});

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function clearResults(){
  var div = document.getElementById('feed');
  while(div.firstChild){
      div.removeChild(div.firstChild);
  }
  resultsList = [];
}

async function getPrice(cardList){
  var cardListForUrl = []
  for (card in cardList) {
    cardListForUrl.push(baseUrl + encodeURIComponent(cardList[card]))
  }
  fetchNextJson(0, cardListForUrl).then(dataList => {
    printPriceList(dataList)
  })
};

async function fetchNextJson(id, urlList) {
  return fetch(urlList[id])
      .then(function(response) {
        return response.json();
      })
      .then(data => {
        resultsList.push(data);
        return (id+1 < urlList.length) 
                ? fetchNextJson(id+1, urlList)
                : resultsList
      })
      .catch(function(err) {
          console.log('error: ' + err);
      });
}

function printPriceList (dataList){
  createArboSite(dataList)
  for(id in dataList){
    var data = dataList[id]
    var cardName = Object.keys(data)[0]
    if (!data[cardName].exists){
      document.getElementById('loadingGif').style.display = "none";
      feedDisplay.insertAdjacentHTML("beforeend", `<div><h3>` + cardName.toUpperCase() + `</h3><h4> This card does not exist </h4></div>`)
      document.getElementById(getcardNameID(cardName)).style.display = "none"
    }
    else{
      printPrices(data);
    }
  }
}

function createArboSite(dataList){
  var priceListDiv = document.createElement("div");
  priceListDiv.id = "priceList"
  document.getElementById("feed").append(priceListDiv)

  for (id in dataList){
    var cardName = Object.keys(dataList[id])[0]
    var cardNameID = getcardNameID(cardName)
    var cardDetail = document.createElement("details");
    cardDetail.id = cardNameID

    var cardSummary = document.createElement("summary");
    cardSummary.textContent = cardName.toUpperCase()
    cardDetail.appendChild(cardSummary)

    var cardUl = document.createElement("ul");
    cardUl.classList.add('shopList');

    for (id in shopsID){
      var shopLi = document.createElement("li")
      shopLi.classList.add(id)
      
      var shopDetails = document.createElement("details");

      var shopSummary = document.createElement("summary");
      shopSummary.textContent = shopsID[id]
      shopDetails.appendChild(shopSummary)

      var priceUl = document.createElement("ul");
      shopDetails.appendChild(priceUl)
      shopLi.appendChild(shopDetails)

      cardUl.appendChild(shopLi)
    }
    
    cardDetail.appendChild(cardUl)
    document.getElementById("priceList").append(cardDetail)
  }
}

function getcardNameID(cardName){
  return cardName.replaceAll(/\W/g, '')
}

function printPrices (data){
  const card = Object.keys(data)[0]
  const cardHTML = document.querySelector('#'+getcardNameID(card))
  var cheappestPrice = -1

  if (data[card].oos){
    feedDisplay.insertAdjacentHTML("beforeend", `<div><h3>` + card.toUpperCase() + `</h3><h4> This card is Out Of Stock in every store </h4></div>`)
    document.getElementById(getcardNameID(card)).style.display = "none"
  }
  else {
    for(shop in shopsID){
      storeCheappest = -1;
      shopEntries = data[card][shopsID[shop]]
      var shopHTMLUl = cardHTML.querySelector('.'+shop).querySelector('ul')

      shopEntries.forEach(entry => {
        if((entry.qty > 0) && ((entry.price < storeCheappest) || (storeCheappest < 0))){
          storeCheappest = entry.price
          if(((storeCheappest < cheappestPrice) || (cheappestPrice < 0))){
            cheappestPrice = storeCheappest
          }
        }

        var entryLi = document.createElement("li")
        var entryLink = document.createElement("a")
        var entryText = ""

        entryLi.classList.add('priceEntry')

        if (entry.foil){
          entryLi.classList.add('foil')
          entryText += `Foil | `
        }
        if(entry.finish){
          entryLi.classList.add('finish')
          entryText += entry.finish + ` | `
        }
        entryText += entry.set + ` | ` 
                  + entry.qty + ` | ` 
                  + entry.price
        if (typeof entry.price === 'number'){
          entryText += `$` 
        }
        entryLink.setAttribute("href", entry.cardUrl)
        entryLink.setAttribute("target", "_blank")
        entryLink.textContent = entryText
        entryLi.appendChild(entryLink)
        shopHTMLUl.appendChild(entryLi)
      })
      storeCheappest = ((storeCheappest < 0) ? 'Out of stock' : (storeCheappest += '$'))
      cardHTML.querySelector('.'+shop).querySelector('summary').textContent += (' - ' + storeCheappest)
    }
    cardHTML.querySelector('summary').textContent += (' - ' + cheappestPrice + '$')
  }
  document.getElementById('loadingGif').style.display = "none";
};