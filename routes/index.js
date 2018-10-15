var mongoose = require('mongoose');
const config = require('../config/config');
var express = require('express');
const Path = require('path');
var router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');


var fs = require('fs'),
  PDFParser = require('pdf2json');

mongoose.Promise = global.Promise;  
mongoose.connect(config.db.uri);

var Dish = require('../models/Dish');
var Restaurant = require('../models/Restaurant');


function masalaNumbering() {
  var numbering = [];
  for (var i = 0; i < 200; i++) {
    if (i === 21) numbering.push(i + " .")
    else numbering.push(i + ".");
  }

  return numbering;
}

function conradsNumbering() {

  var numbering = [];
  for (var i = 0; i <= 410; i++) {
    if (i < 10) {
      numbering.push("00" + i)
    }
    else if (i >= 10 && i < 100) { numbering.push("0" + i); }
    else {
      numbering.push(String(i));
      //  console.log(i);
    }
  }

  return numbering;
}


async function downloadPDFMenu(url, filename) {

  const path = 'files/' + filename + '.pdf';

  // axios image download with response type "stream"
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  })

  // pipe the result stream into a file on disc
  response.data.pipe(fs.createWriteStream(path))

  // return a promise and resolve when download finishes
  return new Promise((resolve, reject) => {
    response.data.on('end', () => {
      resolve()
    })

    response.data.on('error', () => {
      reject()
    })
  })

}



async function htmlPastaVia(savetojson) {
  return new Promise(async function (resolve, reject) {

    axios.get('http://www.pizzeriapastavia-chemnitz.de')
      .then(function (response) {
        //console.log(response.data);
        fs.writeFile("files/pastavia.html", response.data, (error) => { /* handle error */ });
        const $ = cheerio.load(response.data);

        const allDishes = [];

        $('div.menucat').not('#cat_popular').each(function (i, elem) {

          const dishCategory = { category: "", dishes: [] };
          dishCategory.category = $(this).children('h3').text();


          $(elem).children('ul').find('li').each(function (i, elem) {
            let dish = { title: [], price: "", ingredient: "" };

            dish.title.push($(this).find('b[itemprop="name"]').text());
            dish.title.push($(this).find('.price').text());
            dish.ingredient = $(this).find('span[itemprop="description"]').text();
            dishCategory.dishes.push(dish);
          });
          allDishes.push(dishCategory);

        });

        let menuObject = { menus: [{ dishes: [] }] };
        menuObject.menus[0].dishes = allDishes;

        if (savetojson) fs.writeFile("files/pastavia.json", JSON.stringify(menuObject), (error) => { /* handle error */ });
        // console.log(JSON.stringify(allDishes));

        resolve(menuObject);

      })
      .catch(function (error) {
        console.log(error);
        reject(error);
      });

  });
}


function pdfJsonDefault() {
  let pdfParser = new PDFParser(this, 1);

  pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
  pdfParser.on("pdfParser_dataReady", pdfData => {
    //  fs.writeFile("files/menu2.json", pdfData, (error) => { /* handle error */ });
    var pages = pdfData.formImage.Pages.map((page, idx) => {

      if (idx == 0) return;

      var processed = page.Texts.map((text, ind) => {

        return { text: decodeURIComponent(text.R[0].T) }

      });
      return { page: idx, items: processed }
    });
    fs.writeFile("files/masalaDef.json", JSON.stringify(pdfData), (error) => { /* handle error */ });
  });

  pdfParser.loadPDF("files/masala.pdf");
}

function ignore(text) {
  let ignoreList = [
    "Guten Morgen liebe Gäste! Zum Frühstück 1 bis 4 erhalten Sie 1 Tasse Kaffee oder Tee gratis!",
    "Wir wünschen Ihnen einen entspannten Start in den Tag!",
    "We wish our guests a good morning, You can enjoy one free coffee or tea for breakfast 1 to 4!",
    "Die angegebenen Zahlen definieren Zusatzstoffe, die auf Seite 19 erläutert sind. Bei Allergien fragen Sie bitte nach unserer Allergikerkarte.",
    "Numers refer to additives as listed on page 19. In the case of allergies, please ask for our separate Menu with a list of allergenic ingredients.",
    "*dazu Baguette und Butter / with bread and butter"
  ]

  return ignoreList.indexOf(text) >= 0 ? true : false;

}

function roundTo2(numbr) {
  return Math.round(numbr * 100) / 100;
}




// TODO change to take restaurant object
async function saveObjToDb(restaurant_Obj, menuObj) {
  var obj = menuObj;

  /*
  var restaurant = {
    name: restaurant_name
  }; */

  let restau = new Restaurant(restaurant_Obj);

  return new Promise(async function (resolve, reject) {


    //  JSON.parse(fs.readFileSync(file, 'utf8'));

    let pagesList = obj.menus;
    let dishesList = [];
    pagesList.forEach((page, p_index) => {
      let catList = page.dishes;

      catList.forEach((cat, indx) => {
        let dishList = cat.dishes;
        for (let i = 0; i < dishList.length; i++) {

          let item = {
            name: dishList[i].title[0],
            price: dishList[i].title[1],
            ingredients: dishList[i].ingredients,
            restaurant: restau._id,
            category: cat.category
          };

          var data = new Dish(item);
          dishesList.push(data);
        }
      });

    });


    try {

      //save restaurant
      restau.save();

      Dish.collection.insertMany(dishesList);
      dishesList = [];

      resolve({ result: "successful" });

    } catch (e) {
      print(e);
      reject({ result: "unsuccessful" });
    }

  });
}



async function saveToDb(restaurant_name, filename) {
  const file = 'files/' + filename + '.json';

  var restaurant = {
    name: restauran/t_name
  };

  let restau = new Restaurant(restaurant);
  //restau.dish_list.addToSet()
  /*
    let item = {
      name: req.body.name,
      price: req.body.price,
      ingredients: req.body.ingredients,
      res_id: restau._id
    };
  */
  //save restaurant
  restau.save();




  var obj = JSON.parse(fs.readFileSync(file, 'utf8'));

  let pagesList = obj.menus;
  let dishesList = [];
  pagesList.forEach((page, p_index) => {
    let catList = page.dishes;

    catList.forEach((cat, indx) => {
      let dishList = cat.dishes;
      for (let i = 0; i < dishList.length; i++) {

        let item = {
          name: dishList[i].title[0],
          price: dishList[i].title[1],
          ingredients: dishList[i].ingredients,
          restaurant: restau._id,
          category: cat.category
        };

        var data = new Dish(item);
        /* if(indx===0)
         {  data.save();
          console.log('New Dish Saved');
        }
         else  */
        dishesList.push(data);
        //restau.dish_list.addToSet(data);
      }
    });

  });


  try {
    Dish.collection.insertMany(dishesList);
    dishesList = [];

  } catch (e) {
    print(e);
  }



}



async function pdfJsonConrads(savetojson) {

  return new Promise(async function (resolve, reject) {
    const filename = 'conrad';
    await downloadPDFMenu('http://www.conrads-restaurant.de/speisekarte-conrads-restaurant.pdf', filename);
    // Used to hold the numbering of the pdf menus
    let conradNumbered = conradsNumbering();

    let pdfParser = new PDFParser(this);


    pdfParser.on("pdfParser_dataError", errData => {
      console.error(errData.parserError);
      reject(errData.parserError);
    });
    pdfParser.on("pdfParser_dataReady", pdfData => {

      var pages = [];
      pdfData.formImage.Pages.forEach((page, p_index) => {

        let currentPage = [];
        let txtContainer;
        let dishCategory;

        let itemStarted = false;

        let yPosTitle; // y position of dish 
        let yPrevIngredient = 0;

        if (p_index === 1 || p_index === 2) {
          dishCategory = { category: "Frühstuck - Breakfast", dishes: [] }
        }
        else if (p_index === 3) {
          dishCategory = { category: "Vorspeisen -  Appetizers", dishes: [] }
        }
        else if (p_index === 4) {
          dishCategory = { category: "Suppen - Soups", dishes: [] }
        }
        else if (p_index === 5) {
          dishCategory = { category: "Salate - Salads", dishes: [] }
        }
        else if (p_index === 6) {
          dishCategory = { category: "Conrad's Spezialitäten - Conrad's specialities", dishes: [] }
        }
        else if (p_index === 7) {
          dishCategory = { category: "Deutsche Platten - German plates", dishes: [] }
        }
        else if (p_index === 8) {
          dishCategory = { category: "Deutsche Gerichte - German dishes", dishes: [] }
        }



        // Use foreach
        page.Texts.forEach((element, e_index) => {

          if (p_index == 2 && element.y > 25.0 && !itemStarted) return;

          // if it is superscript, don't continue
          if (itemStarted && roundTo2(element.y) < roundTo2(yPosTitle)) return;

          var newStr = decodeURIComponent(element.R[0].T);
          var textNode = newStr.trim();

          if (ignore(textNode)) return;

          if (conradNumbered.indexOf(textNode) >= 0) {

            if (textNode === "109" || textNode === "110") {
              dishCategory.category = "Vorspeisen - Starters";
            }

            if (txtContainer) {
              dishCategory.dishes.push(txtContainer);

              txtContainer = null;
            }

            // save y position of title for comparisons
            yPosTitle = element.y;
            itemStarted = true;
            txtContainer = { num: "", title: [], ingredients: "", y: yPosTitle };

            txtContainer.num = textNode

            return;

          }
          else { }

          if (itemStarted) {
            // check if it is on same line as the item number
            if (roundTo2(yPosTitle) === roundTo2(element.y)) {
              if (element.R[0].TS[2] === 1 || element.x > 30.0) {
                if (txtContainer.title.length <= 1)
                  txtContainer.title.push(textNode);
                else txtContainer.title[1] += textNode;
              }
              else {
                txtContainer.ingredients += textNode;
              }
            }
            // not title
            else {
              // if it is not bold, then ingredient
              if (element.R[0].TS[2] === 0) {
                // eliminate supperscripts
                if (element.y > yPosTitle && yPrevIngredient < element.y) {
                  txtContainer.ingredients += txtContainer.ingredients === "" ? textNode : "<br> " + textNode;
                  yPrevIngredient = element.y;
                  /*
                  filter page 1
                  */
                  if ((p_index === 2 && element.y > 25.0) || (p_index === 4 && element.y > 42) || (p_index === 8 && element.y > 46)) {
                    dishCategory.dishes.push(txtContainer);
                    currentPage.push(dishCategory);
                    txtContainer = null;
                    itemStarted = false;
                  }
                }

                return;
              }
            }
          }
          // dish item not started
          else {
            if (element.R[0].TS[2] === 1) {

            }
          }

        });

        currentPage.push(dishCategory);

        if (p_index > 0 && p_index < 9) pages.push({ page: p_index, dishes: currentPage });

      });

      let menuObject = { menus: [] };
      menuObject.menus = pages;
      if (savetojson) fs.writeFile('files/' + filename + '.json', JSON.stringify(menuObject), (error) => { /* handle error */ });

      resolve(menuObject);
    });

    pdfParser.loadPDF('files/' + filename + '.pdf');
  });
}


//TODO
/**
     * 1. Remember to add new line characters
     * 2. Split title into an array and separate price
     */


async function pdfJsonMasala(savetojson) {

  return new Promise(async function (resolve, reject) {
    const filename = 'masala';
    await downloadPDFMenu('http://www.masala-restaurant.de/upfile/Speisekarte.pdf', filename);

    const masalaNumbered = masalaNumbering();

    let pdfParser = new PDFParser(this);


    pdfParser.on("pdfParser_dataError", errData => {
      reject(errData.parserError);
      console.error(errData.parserError)
    });
    pdfParser.on("pdfParser_dataReady", async pdfData => {

      var pages = [];

      pdfData.formImage.Pages.forEach(async (page, p_index) => {

        // console.log(p_index + 1);

        var currentPage = [];
        var txtContainer;
        var dishCategory;

        var itemStarted = false;
        var yPosTitle;

        // Use foreach
        page.Texts.forEach((element, e_index) => {

          // if it is superscript, don't continue
          if (itemStarted && element.y < yPosTitle) return;

          var textNode = decodeURIComponent(element.R[0].T);

          if (masalaNumbered.indexOf(textNode) >= 1) {

            if (txtContainer) {
              dishCategory.dishes.push(txtContainer);

              txtContainer = null;
            }

            // save y position of title for comparisons
            yPosTitle = element.y;
            itemStarted = true;

            txtContainer = { num: "", title: [], ingredients: "", y: yPosTitle };

            txtContainer.num = textNode
            return;

          }
          else { }


          if (itemStarted) {
            // check if it is on same line as the item number


            //    if(element.x === 31.775)  console.log(yPosTitle === element.y)

            if (parseFloat(yPosTitle) === parseFloat(element.y)) {

              // some ingredients are on the same line as the dish name so we need to check if it is bold
              // if it isn't then make it dish ingredient
              if (element.R[0].TS[2] === 1) {
                if (txtContainer.title.length <= 1){
                  if (textNode.trim() == "ersonen)")  // fix for item 22
                  {
                    txtContainer.title[0] += textNode.trim(); 
                  }  
                else
                    txtContainer.title.push(textNode.trim());
                }
                
                else{
                 txtContainer.title[1] += textNode;
                 } 
              }
              else {
                txtContainer.ingredients += textNode;
              }

            }
            // not title
            else {
              // if it is not bold, then ingredient
              if (element.R[0].TS[2] === 0) {

                // eliminate supperscripts
                if (element.y > yPosTitle) {
                  txtContainer.ingredients += textNode;
                }

                return;
              }
              else {
                //new category ?

                dishCategory.dishes.push(txtContainer);
                currentPage.push(dishCategory);

                // close current item and start new one
                dishCategory = { category: "", dishes: [] }
                dishCategory.category = textNode;
                txtContainer = null;
                itemStarted = false;
                //      return;
                /*  */
              }

            }
          }
          // dish item not started
          else {
            if (element.R[0].TS[2] === 1) {
              //  // add text to page
              dishCategory = { category: "", dishes: [] }
              dishCategory.category = textNode;
            }
          }

        });



        currentPage.push(dishCategory);

        if (p_index > 1) pages.push({ page: p_index, dishes: currentPage });

      });

      let menuObject = { menus: [] };
      menuObject.menus = pages;


      if (savetojson) fs.writeFile('files/' + filename + '.json', JSON.stringify(menuObject), (error) => { /* handle error */ });

      resolve(menuObject);

    });

    pdfParser.loadPDF('files/' + filename + '.pdf');

  });



}



/* GET home page. */
router.get('/', async function (req, res, next) {
 // pdfJsonDefault();
  //pdfJsonMasala(true);

/*
  let pg = req.query.p;


  let pagecnt = 5,
   perPage = 10
  , page = pg ? pg : 1
  , skipN = pg ?   Math.max(0, pg) : 0;
  //pdfJsonDefault();
  //dfJsonConrads();

 // htmlPastaVia();
 
*/
   res.render('index');
});


async function dropCollections() {
  for (let model of [Dish, Restaurant]) {
    try {
      await model.remove({}, function (err) {
        if (err) console.log(err);
      });
    } catch (e) {
      if (e.code === 26) {
        console.log('namespace %s not found', model.collection.name)
      } else {
        throw e;
      }
    }
  }
}

async function batchSaveToDB() {

  await dropCollections();
  await saveToDb('masala', 'masala');
  await saveToDb('conrads', 'conrad');
  await saveToDb('pastavia', 'pastavia');

}

router.get('/insert', async function (req, res,next) {


  await dropCollections();
  //TODO change restaurant name parameters to object

  await pdfJsonMasala()
    .then((resp) => {
      var restau = {};
      restau.name = "Masala";
      restau.phone ="08024-4745257";
      restau.logo = "http://masala-restaurant.de/logos/logo-300.png";
      restau.address = "83607 Holzkirchen Münchener Str. 38";
      restau.url = "http://masala-restaurant.de";
      restau.email = "miah.sohel28@yahoo.de";

      saveObjToDb(restau, resp);
    });

  await pdfJsonConrads()
    .then((resp) => {
      var restau = {};
      restau.name = "Conrads";
      restau.phone ="069/285338";
      restau.logo = "http://www.conrads-restaurant.de/images/conrads-logo.png";
      restau.address = "Große Eschenheimer Str.3 60313 Frankfurt am Main";
      restau.url = "http://www.conrads-restaurant.de/";
      restau.email = "service@conrads-restaurant.de";

      saveObjToDb(restau, resp);
    });

  await htmlPastaVia()
    .then((resp) => {
      
      var restau = {};
      restau.name = "Pizzeria Pasta Via";
      restau.phone ="037156045345";
      restau.logo = "";
      restau.address = "Zschopauer Str. 142 09126 Chemnitz";
      restau.url = "https://www.pizzeriapastavia-chemnitz.de";
      restau.email = "";

      saveObjToDb(restau, resp); 
      
      res.send("success");
    });

});



/**
 *  returns a list of dishes.
 * Takes as query parameters:  // 
 * if you want to limit restaurants, use the POST variant
 * p: page number
 *  per_page: number of dishes per page
 * query_string: string to search (could be dish name, ingredient or meal category )
*/
router.get('/dishes', async function (req, res,next) {

  // ToDO Sanitize the queries
  let pg = req.query.p ? req.query.p : 1 ;
  let perPage = req.query.per_page ? parseInt(req.query.per_page) : 10;
  let qstring = req.query.q


let q_string =  qstring ? {$or:[{category:{'$regex': qstring,'$options': 'i'}},{name:{'$regex': qstring,'$options': 'i'}},{ingredients:{'$regex': qstring,'$options': 'i'}}] }
   : {} ;


  let skipN = pg > 0 ?  perPage * (pg - 1) : 0;

  findDishes(res,q_string,perPage, skipN);


  /*
 Dish.count(q_string, function( err, count){
   totalrecords = count;
})


Dish.find(q_string)
    .populate({ path: 'restaurant' })
    .limit(perPage)
    .skip(skipN)
    .exec()
    .then(function (doc) {
     // console.log(doc);
      res.send(JSON.stringify({total:totalrecords,dishes:doc}));
    });
    */
});

function findDishes(res,filter,per_page,skipN){

  let totalrecords =0;
 Dish.count(filter, function( err, count){
   totalrecords = count;
})


Dish.find(filter)
    .populate({ path: 'restaurant' })
    .limit(per_page)
    .skip(skipN)
    .exec()
    .then(function (doc) {
     // console.log(doc);
      res.send(JSON.stringify({total:totalrecords,dishes:doc}));
    });

}

/**
 * POST Request
 * Returns list of dishes 
 * Request body parameters: array of restaurant id's eg. [5b2ed1edf5fce54880deec2b,5b2ed1ecf5fce54880deebae]
 * optional page, per_page
 */
router.post('/dishes', async function (req, res,next) {

  // ToDO Sanitize the queries
// EASY SEND ALL TOGETHER AS JSON//
 //console.log(req.body);
  let respBody =req.body;
  //let respBody = resp.data

 // console.log(respBody);
  let pg = respBody.p ? respBody.p : 1 ;
  let perPage = respBody.per_page ? parseInt(respBody.per_page) : 10;
  let qstring = respBody.q // array of restaurant id's
  let restau_ids = respBody.res_ids; // array
  //console.log(restau_ids);
  let q_cond =  { $and: [ ]} ;

  if(restau_ids && restau_ids.length >0) q_cond.$and.push({restaurant: {$in:restau_ids} });
  

let q_string =  qstring ? {$or:[{category:{'$regex': qstring,'$options': 'i'}},{name:{'$regex': qstring,'$options': 'i'}},{ingredients:{'$regex': qstring,'$options': 'i'}}] }
   : {} ;

   q_cond.$and.push(q_string);

  let skipN = pg > 0 ?  perPage * (pg - 1) : 0;

findDishes(res,q_cond,perPage, skipN);

});


/**
 *  returns a list of dishes.
 * Takes as query parameters: 
 * p: page number
 *  per_page: number of dishes per page
 * query_string: string to search (could be dish name, ingredient or meal category )
*/
router.get('/dishes/:id', async function (req, res,next) {

  let res_id = mongoose.Types.ObjectId(req.params.id); 
  Dish.findById(res_id)
  .populate({ path: 'restaurant' })
  .exec()
    .then(function (doc) {
     // console.log(doc);
     if(doc) res.json(doc);
     else res.sendStatus(404).json({error : "dish doesn't exist" });

    });
});


/**
 * returns a list of all restaurants in json
 */
router.get('/restaurants', async function (req, res,next) {
  Restaurant.find({})
    .then(function (docs) {
    //  console.log(docs);
      res.json(docs);
    });

});


/**
 * returns a restaurant object
 * Type: json
 */
router.get('/restaurants/:id', async function (req, res,next) {
  let res_id = mongoose.Types.ObjectId(req.params.id); 
  Restaurant.findById(res_id)
    .then(function (doc) {
      //console.log(doc);
      if(doc) res.json(doc);
      else  res.sendStatus(404);
    });

});

//TODO
/**
 * returns all dishes by a restaurant
 * Type: json
 
router.get('/restaurants/:id/dishes', async function (req, res,next) {
  let res_id = mongoose.Types.ObjectId(req.params.id); 
  Dish.find({restaurant:res_id})
    .then(function (doc) {
      //console.log(doc);
      res.json(doc);
    });

});
*/
module.exports = router;
