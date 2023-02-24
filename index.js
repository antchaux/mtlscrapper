const axios = require('axios')
const cheerio = require('cheerio')
const express = require('express')
const cors = require('cors')

const fs = require('fs')

const PORT = process.env.PORT || 80

const app = express()
app.use(cors())
app.use(express.static('client'))

var cards = [];
const searchUrl = '/products/search?q='
const f2fsearchUrl = '/search/?keyword='
const shops = {
            'Le Valet d\'Coeur':'https://www.carte.levalet.com', 
            'Chez Geeks':'https://www.chezgeeks.com',
            'Alt F4' : 'https://altf4online.crystalcommerce.com',
            'L\'Expédition' : 'https://www.expeditionjeux.com',
            'TopDeckHero' : 'https://www.topdeckhero.com',
            // 'FacetoFace' : 'https://www.facetofacegames.com'
            };

app.get('/:dynamic', async(req, res) => {
    axios.all(createAxiosReq(shops, [req.params.dynamic])).then(axios.spread((...responses) => {
        res.json(extractData(responses))
    })).catch(errors => {
    })
})

function createAxiosReq(shops, cardsUrl){
    url_list = []
    for (let cardId in cardsUrl){
        var card = cardsUrl[cardId]
        cards = [card];
        for (let shop in shops) {
            let full_url = ""
            if(shop === 'FacetoFace'){
                full_url = shops[shop] + f2fsearchUrl + textAsQuery(card)
            }
            else{
                full_url = shops[shop] + searchUrl + card
            }
            let promise_url = axios.get(full_url)
            url_list.push(promise_url)
        }
    }
    return url_list
}

function extractData(responses){
    const output = {}
    for (let cardId in cards){
        var card = cards[cardId]
        var cardElem = createCardElem()
        output[card] = cardElem

        for (let id in responses){
            const response = responses[id]
            const html = response.data
            const $ = cheerio.load(html)
            if (response.config.url.includes('facetofacegames')){
                //toDo
            }
            else{
                $('.inner', html).each(function() {
                    var shop = $('title').text().trim()
                    var qty = $(this).find('.variants').find('.variant-qty').first().text().trim().match(/\d/g);

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
    }
    sortData(output)
    return(output)
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

function charIndexes(string, char) {
    var i, j, indexes = []; for(i=0,j=string.length;i<j;++i) {
        if(string.charAt(i) === char) {
            indexes.push(i);
        }
    }
    return indexes;
}

app.listen(PORT, () => console.log(`server ok on PORT ${PORT}`))
