const axios = require('axios')
const cheerio = require('cheerio')
const express = require('express')
const cors = require('cors')
const uuidv4 = require("uuid/v4")
const fs = require('fs')
const { match } = require('assert')

const PORT = process.env.PORT || 80

const app = express()
app.use(cors())
app.use(express.static('client'))

const searchUrl = '/products/search?q='
const shops = {
        'Le Valet d\'Coeur':'https://www.carte.levalet.com', 
        //'Chez Geeks':'https://www.chezgeeks.com',
        'Alt F4' : 'https://altf4online.crystalcommerce.com',
        'L\'Expédition' : 'https://www.expeditionjeux.com',
        'Face to Face' : 'https://www.facetofacegames.com',
        'Topdeck Hero' : 'https://www.topdeckhero.com',
        'Le Secret des Korrigans' : 'https://lesecretdeskorrigans.crystalcommerce.com',
    };

var cards = [];
var output = {}

app.get('/:dynamic', async(req, res) => {
    cards = []
    output = {}
    options = createF2Foptions(req.params.dynamic);
    axios.all(createAxiosReq(req.params.dynamic)).then(axios.spread((...responses) => {
        axios.request(options).then(function (F2Fresponse) {
            res.json(extractData(responses, F2Fresponse))
        }).catch(function (error) {
            console.error(error);
        });
    })).catch(errors => {
    })
})

function createAxiosReq(cardsUrl){
    cards.push(cardsUrl)
    url_list = []
    for (let shop in shops) {
        if (shop !== 'Face to Face'){
            let full_url = ""
            full_url = shops[shop] + searchUrl + textAsQuery(cardsUrl)
            let promise_url = axios.get(full_url)
            url_list.push(promise_url)
        }
    }
    return url_list    
}

function extractData(responses, F2Fresponse){
    for (let cardId in cards){
        var card = cards[cardId]
        var cardElem = createCardElem()
        output[card] = cardElem
        extractCCData(responses, card)
        extractF2FData(F2Fresponse, card)
    }
    sortData(output)
    return(output)
}

function extractCCData(responses, card){
    for (let id in responses){
        const response = responses[id]
        const html = response.data
        const $ = cheerio.load(html)
        $('.inner', html).each(function() {
            var shop = $('title').text().trim()
            var qty = $(this).find('.variants').find('.variant-qty').first().text().trim().match(/\d+/g);
            var fullname = $(this).find('.name').text()
            var name_separated = fullname.split(" - ")
            var name = name_separated[0]
            var foil = false
            var finish = undefined
            switch (name_separated.length){
                case 2:
                    if (name_separated[1].includes('Foil')){
                        foil = true
                    }
                    else if (name_separated[1].includes('List')){
                    }
                    else {
                        finish = name_separated[1]
                    }
                    break;
                case 3:
                    foil = true
                    finish = name_separated[2]
                    break;
            }

            var set = $(this).find('.category').text()
            var price = parseFloat($(this).find('.variants').find('.regular.price').first().text().replaceAll("CAD$", '').trim())
            var cardUrl = shops[shop] + $(this).find('.image-meta').find('.image').find('a').first().attr('href')
            
            if (!price) {
                price = "No price listed"
            }
            
            if ((name.toUpperCase() === card.toUpperCase())) { // Looking for cards with the same name and not foil
                output[card].exists = true

                if (!qty) {
                    qty = 0
                }
                else{
                    output[card].oos = false
                    qty = parseInt(qty)
                }
                output[card][shop].push({
                    foil,
                    finish,
                    set,
                    qty,
                    price,
                    cardUrl,
                })
            }
        })
    }
}

function extractF2FData(response, card){
    response.data.Results.forEach(element => {
        if (element.Document['product type'][0] === 'Singles') {
            cardname = element.Document['card name'][0];
            if(cardname.toLowerCase() === response.data.Keyword.toLowerCase()){
                set = element.Document["true set"][0]
                cardUrl = element.Document["url_detail"][0]
                var matches = element.Document["title"][0].match(/\[(.*?)\]/g);
                matches.shift()
                matches.pop()
                if(matches.length === 0){
                    finish = undefined
                }
                else {
                    finish = ""
                    for (f in matches){
                        if(finish !== ""){
                            finish += ' - '
                        }
                        finish += matches[f].replace("[", "").replace("]", "")
                    }
                }

                element.Document["hawk_child_attributes"].forEach(e => {
                    foil = !(e.option_finish[0] === "Non-Foil")
                    qty = parseInt(e.child_inventory_level[0])
                    price = parseFloat(e.child_price_retail[0])
                    if(e.option_condition[0] === 'NM'){
                        output[card]['Face to Face'].push({
                            foil,
                            finish,
                            set,
                            qty,
                            price,
                            cardUrl,
                        })
                    }
                });
            }
        }
    });
}

function createF2Foptions(cardname){
    return({
        method: 'POST',
        url: 'https://essearchapi-na.hawksearch.com/api/v2/search',
        headers: {
          cookie: 'AWSALB=Ig%2BLrpudDT1AUkDwb0Ff1ef4Dl3yPbFuyW8DEZgLMJSfGfmg2TcDMjDr3l8aZ0nbE2ZN6BDKuhEtohDeQX2N0Oivpc6z%2Bv3u0xz1Cp%2FkJ1yfQr9ufxRjFGM%2FY7IO; AWSALBCORS=Ig%2BLrpudDT1AUkDwb0Ff1ef4Dl3yPbFuyW8DEZgLMJSfGfmg2TcDMjDr3l8aZ0nbE2ZN6BDKuhEtohDeQX2N0Oivpc6z%2Bv3u0xz1Cp%2FkJ1yfQr9ufxRjFGM%2FY7IO',
          authority: 'essearchapi-na.hawksearch.com',
          accept: 'application/json, text/plain, */*',
          'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'content-type': 'application/json;charset=UTF-8',
          origin: 'https://www.facetofacegames.com',
          referer: 'https://www.facetofacegames.com/',
          'sec-ch-ua': '"Not=A?Brand";v="8", "Chromium";v="110", "Opera GX";v="96"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'cross-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 OPR/96.0.0.0'
        },
        data: {
          Keyword: cardname,
          FacetSelections: {},
          PageNo: '1',
          ClientGuid: '30c874915d164f71bf6f84f594bf623f',
          IndexName: '',
          ClientData: {VisitorId: uuidv4()}
        }
      })
}

function createCardElem(){
    var cardElem = {exists : false, oos : true}
    for(var shop in shops){
        cardElem[shop] = []
    }
    return(cardElem)
}

function sortData(data){
    for(let id in cards){
        var cardName = cards[id]
        for(let shop in shops){
            data[cardName][shop].sort((a, b) => comparePrice(a.price, b.price))
        }
    }
}

function comparePrice(a, b){
    var output = 0
    if((typeof(a) === 'number') && (typeof(b) === 'number')){
        output = ((a > b) ? 1 : -1)
    }
    else if(!(typeof(a) === 'number')){
        output = 1
    }
    else{
        output = -1
    }
    return(output)
}

function textAsQuery(s){
    return(s.replaceAll(' ', '+').replaceAll('\'', '%27')) 
}

app.listen(PORT, () => console.log(`server ok on PORT ${PORT}`))