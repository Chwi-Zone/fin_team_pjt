const express = require('express');
const router = express.Router();
const request = require("request");
const axios = require("axios");
const cheerio = require("cheerio");

let mysql = require("mysql");
let config = require("../db/db_info").local;
let dbconfig = require("../db/db_con")();
let pool = mysql.createPool(config);

router.get("/", function(req,res){
  res.render("company.ejs");
});

router.get("/info", function (req, res) {
    //email 필요?  book mark stocks_id 
    let stocks_id = req.query.stocks_id;
    let email_address = req.query.email_address;
    //let stocks_id = "4970";
    //let email_address = "1";
    console.log(stocks_id);
  
    //우선 email_address ="1"로 test
    pool.getConnection(function (err, connection) {
      //category list - > sector_id select
      let get_company_query = `SELECT sector_name ,stocks_name FROM stock_code WHERE stocks_id =${stocks_id};`;
      let get_bookmark = `select count(*) as value from bookmark where email_address="${email_address}" and stocks_id=${stocks_id}`
      connection.query(get_company_query+get_bookmark, function (err, rows) {
        if (err) {
          connection.release();
          throw err;
        } else {
          if (rows.length == 0) {
          } else {
                   console.log(rows);
                   ret = JSON.stringify(rows);
                   result = JSON.parse(ret);
                   console.log(result);
                   res.json(result);
                 }
        }
        connection.release();
      });
    });
});

  //회사가격,차트 router
let priceChart = new Array();
let stocks_id;
router.get('/price', function (req, res) {
  stocks_id = req.query.stocks_id;
  //네이버증권 주식코드: 6자리(DB에서 가져온 코드 6자리이하면 앞에 0추가)
  while(stocks_id.length != 6){
      stocks_id = "0"+stocks_id;
  }
  console.log(stocks_id);
  //stocks_id = '097950';
  getData(function () {
    console.log(priceChart);
    res.json(priceChart);
  });
  priceChart = new Array();
});

function getData(callback) {
  var companyPrice;
  var companyChart;
  scrapingResult = {
    'price': ''
  }
  
  request(`https://finance.naver.com/item/main.nhn?code=${stocks_id}`, function (err, res, body) {
    const $ = cheerio.load(body);
    const bodyList = $(".today").map(function (i, element) {
      scrapingResult['price'] = String($(element).find('p:nth-of-type(1)').text());
      //숫자 뺀 모든 기호를 pattern 변수에 넣기
      var pattern = /[^(0-9)]/gi;
      if (pattern.test(scrapingResult['price'])) {
        companyPrice = scrapingResult['price'].replace(pattern, "");
      }
      companyPrice = companyPrice.substring(0, (companyPrice.length / 2));
      //console.log(companyPrice); 
      priceChart.push(companyPrice);
    });
    companyChart = $("#img_chart_area").attr('src'); //차트 이미지
    //console.log(companyChart);
    priceChart.push(companyChart);
  });
  setTimeout(callback, 1000);
}

router.get('/news', function(req, res) {
  let companyName = req.query.company_name;
  let newsNum = 6; //뉴스 갯수
  let news = Array.from(Array(newsNum), () => new Array()); //2차원배열([뉴스갯수][]) 선언 => 제목,링크 2개는 밑에서 초기화
  console.log("------" +companyName);
  let option = {
    method: "GET",
    url: "https://openapi.naver.com/v1/search/news.json",
    headers: {
      "X-Naver-Client-Id": "ySqRfeHBGnhjTRtd96pZ",
      "X-Naver-Client-Secret": "JDq_RtRsKb",
    },
    //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
    qs: {
      query: companyName,
      sort: "sim",
      display: newsNum,
    },
  };
  request(option, function (error, response, body) {
    let resultJson = JSON.parse(body);
    console.log(resultJson);
    for(var i = 0 ; i < newsNum ; i++){
      var bTag = /[<b>;/]/gi;
      var newsTopic = (resultJson.items[i].title).replace(bTag,"");
      newsTopic = newsTopic.replace("&amp",'&');
      newsTopic = newsTopic.replace("&quot",'"');
      var newsLink = resultJson.items[i].link;
      news[i].push(newsTopic);
      news[i].push(newsLink);
    }
    console.log(news);
    res.json(news);
  });
});




module.exports = router;