var express = require("express");
var bodyParser = require("body-parser");
var request = require('request');
var http = require('http');
var https = require('https');
var fs = require("fs");
var path = require("path");
var xml2js = require('xml2js');

var alphav = "https://www.alphavantage.co";
// var alphav = "http://test-stock-api-server-env.m2mspae52w.us-west-1.elasticbeanstalk.com";
var apikey = "56MPKIQ85GAJBRLV";

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(function(req, res, next) {

  console.log(`${req.method} request for '${req.url}' - ${JSON.stringify(req.query)} - ${JSON.stringify(req.body)}`);

  next();

});

app.use(express.static("./public"));

function getJSON(url, func, step=0) {
  https.get(url, function(res) {
    var body = '';

    res.on('data', function(chunk){
        body += chunk;
    });

    res.on('end', function(){
      try {
        var response = JSON.parse(body);
      } catch(e) {console.log(e);}
      if (!response || !("Meta Data" in response)) {
        console.log("Received an Error from Alphavantage");
        if (step < 0) setTimeout(
          function(){getJSON(url, func, step + 1);},
          400);
        else func({"Error Message":"Cannot get JSON"});
      }
      else {
        func(response);
      }
    });

  }).on('error', function(e){
    console.log("Got an error: ", e);
  });
}

function httpGetJSON(url, func, step=0) {
  return http.get(url, function(res) {
    var body = '';

    res.on('data', function(chunk){
        body += chunk;
    });

    res.on('end', function(){
      try {
        var response = JSON.parse(body);
      } catch (e) {
        console.log(e);

        if (step < 1) {
          setTimeout(function(){httpGetJSON(url, func, step + 1);},300);
        }
        else {
          func(null);
          // var waitTill = new Date(new Date().getTime() + 0.5 * 1000);
          // while(waitTill > new Date()){}
        }
      }
      func(response);
    });

  }).on('error', function(e){
    console.log("Got an error: ", e);
  });
}

var complete_xhr, complete_active=false;

app.get("/api-complete/:query", function(req, res) {
  var query = req.params.query;
  var url = "http://dev.markitondemand.com/MODApis/Api/v2/Lookup/json?input=" + query;
  // if (complete_active) complete_xhr.abort();
  complete_active=true;
  complete_xhr = httpGetJSON(url, function(response) {
    if (response) res.json(response);
    complete_active=false;
  });
});

var stock_xhr, stock_active=false;

app.get("/api-stock", function(req, res) {
  var symbol = req.query.symbol;
  var url = "/query?function=" + "TIME_SERIES_DAILY&symbol=" + symbol + "&outputsize=compact" + "&apikey=" + apikey;

  // if (stock_active) stock_xhr.abort();
  stock_active=true;
  stock_xhr = getJSON(alphav + url, function(response) {
    if (response) res.json(response);
    stock_active=false;
  });
});

var chart_xhr={}, chart_active={};

app.get("/api-chart/:type", function(req, res) {
  var symbol = req.query.symbol;
  var type = req.params.type;

  var url = alphav + "/query?function=" + type + "&symbol=" + symbol + "&interval=daily&time_period=10&series_type=close&apikey=" + apikey;
  if (type=="Price") url = alphav + "/query?function=" + "TIME_SERIES_DAILY&symbol=" + symbol + "&outputsize=full" + "&apikey=" + apikey;
  if (type=="STOCH") url = alphav + "/query?function=" + type + "&symbol=" + symbol + "&interval=daily&time_period=10&series_type=close&slowkmatype=1&slowdmatype=1&apikey=" + apikey;
  if (type=="BBANDS") url = alphav + "/query?function=" + type + "&symbol=" + symbol + "&interval=daily&time_period=5&series_type=close&nbdevup=3&nbdevdn=3&apikey=" + apikey;

  // if (chart_active[type]) chart_xhr[type].abort();
  chart_active[type]=true;
  chart_xhr[type] = getJSON(url, function(response){
    if (!response || !("Meta Data" in response)) {
      console.log("Received an Error from Alphavantage");
      chart_active[type]=false;
      res.json(response);
      return;
    }

    res.json(response);
    chart_active[type]=false;
  });

  // res.json({"1":"2","a":req.params.type});
  // res.json(charts);
});

app.get("/api-feeds", function(req, res) {
  var symbol = req.query.symbol;
  var url = "https://seekingalpha.com/api/sa/combined/" + symbol.toUpperCase() + ".xml";

  var r = https.get(url, function(response) {
    // save the data
    var xml = '';
    response.on('data', function(chunk) {
      xml += chunk;
    });

    response.on('end', function() {
      // res.send(xml);
      xml2js.parseString(xml, function(err, result) {
        res.json(result);
      });
    });

  });

  r.on('error', function(err) {

  });

});

var myport=3000;

app.listen(process.env.PORT || myport);

console.log("App running on port "+(process.env.PORT || myport));

module.exports = app;
