var xhr={}, active={};

var chart_config = {};

$('.glyphicon-star').hide();

function showError(type) {
  $('#progress-'+type).hide();
  if (type=="detail") $('#table-detail').hide();
  else if (type=='feeds') $('#content-feeds').hide();
  else $('#chart-'+type).hide();
  $('#error-'+type).show();
}

function showContent(type) {
  $('#error-'+type).hide();
  $('#progress-'+type).hide();
  if (type=="detail") $('#table-detail').show();
  else if (type=='feeds') $('#content-feeds').show();
  else $('#chart-'+type).show();
}

function showProgress(type) {
  if (type=="detail") $('#table-detail').hide();
  else if (type=='feeds') $('#content-feeds').hide();
  else $('#chart-'+type).hide();
  $('#error-'+type).hide();
  $('#progress-'+type).show();
}

function disableFavBtn() {
  $("#fav-btn").prop('disabled', true);
  $(".glyphicon-star").hide();
  $(".glyphicon-star-empty").show();
}

function fbBtn() {
  var ind=$("#nav2 li.active").attr("id").substring(4);
  var flag = $("#chart-" + ind).css('display')!='none';
  if (flag) $("#fb-btn").prop('disabled', false);
  else $("#fb-btn").prop('disabled', true);
}

function enableFavBtn(symbol) {
  if (localStorage.getItem(symbol) != undefined) {
    $(".glyphicon-star-empty").hide();
    $(".glyphicon-star").show();
  }
  $("#fav-btn").prop('disabled', false);
  $("#fb-btn").prop('disabled', false);
}

function showValid() {
  $('#symbol').removeClass('invalid-input').addClass('valid-input');
  $('.invalid-feedback').css('visibility', 'hidden');
  $('.btn-primary').prop('disabled', false);
}

function showInvalid() {
  if (!$('#symbol').is(':focus')) return;
  $('#symbol').removeClass('valid-input').addClass('invalid-input');
  // $('#symbol').css('border-color', '#a94442').css('-webkit-box-shadow', 'inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(169, 68, 66,.6)').css('box-shadow', 'inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(169, 68, 66,.6)');
  //
  $('#search-group').addClass('has-error').addClass('has-feedback');
  $('.invalid-feedback').css('visibility', 'visible');
  $('.btn-primary').prop('disabled', true);
}

function submitStock(symbol) {
  var promise = new Promise((resolve, reject)=> {
    $.ajax({
      dataType: "json",
      url: '/api-stock',
      data: {'symbol':symbol},
      success: function(res) {
        if (!("Meta Data" in res)) {
          // alert("Received an Error from Alphavantage");
          return;
        }
        var meta = res["Meta Data"];
        var time_series = res["Time Series (Daily)"];
        for (var key in time_series) {
          var timestamp = key;
          break;
        }
        var symbol = meta["2. Symbol"].toUpperCase();
        var close = time_series[timestamp]["4. close"];
        var open = time_series[timestamp]["1. open"];
        var ct = 0;
        for (var key in time_series) {
          ct++;
          if (ct==2) {
            var tmp = time_series[key];
            break;
          }
        }
        var previous_close = tmp["4. close"];
        var change = close - previous_close;
        var change_percent = (close - previous_close) / previous_close;
        var days_range_low = time_series[timestamp]["3. low"];
        var days_range_high = time_series[timestamp]["2. high"];
        var volume = time_series[timestamp]["5. volume"];

        if (change>0) {
          var arrow = "<img src='img/Up.png' style='max-width: 17px;max-height: 17px;'></img>"
          var change_html = "<span style='color:green'>" + parseFloat(change).toFixed(2) + " (" + (parseFloat(change_percent)*100).toFixed(2) + "%) </span>"+arrow;
        } else if (change<0) {
          var arrow = "<img src='img/Down.png' style='max-width: 17px;max-height: 17px;'></img>"
          var change_html = "<span style='color:red'>" + parseFloat(change).toFixed(2) + " (" + (parseFloat(change_percent)*100).toFixed(2) + "%) </span>"+arrow;
        } else {
          var change_html = "<span>" + parseFloat(change).toFixed(2) + " (" + (parseFloat(change_percent)*100).toFixed(2) + "%)</span>"
        }

        var ret = {
          "Symbol": symbol,
          "Price": parseFloat(close).toFixed(2),
          "Change": change_html,
          "Volume": volume,
        }
        //console.log(ret);
        resolve(ret);
      }
    })

  });

  return promise;
}

var indicators = ["Price", "SMA", "EMA", "STOCH", "RSI", "ADX", "CCI", "BBANDS", "MACD"];

var abbr = {'-0400':'EDT', '-0500':'EST', '-0600':'CST',
  '-0800':'PST', '-0700':'PDT', '-0900':'AKST', '-1000':'HST', '-1100':'SST', '+1000':'CHST'
};

function submitFeed(symbol) {
  showProgress('feeds');
  var url = "/api-feeds";
  if(active['feeds']) {
    //console.log("killing active");
    xhr['feeds'].abort();
  }
  active['feeds'] = true;
  xhr['feeds'] = $.ajax({
    url: url,
    type: 'GET',
    dataType: 'json',
    data: 'symbol='+symbol,
    success: function(res) {
      //console.log("Query feeds success");
      var ct = 0;
      var news = $("<div></div>");
      for (var i in res.rss.channel[0].item) {
        var item = res.rss.channel[0].item[i];
        if (item.link[0].includes("seekingalpha.com/article")) {
          ct ++;
          var length = item.pubDate[0].length;
          var pubDate = item.pubDate[0].substring(0, length-5) + abbr[item.pubDate[0].substring(length-5)];
          var tmp = $(`
            <div class="panel panel-default">
              <div class="container">
              <h4 style='line-height:130%;'>
              <a href='${item.link[0]}' target='_blank'>${item.title[0]}</a>
              </h4>
              <b>
              <br>
              <div>${item['sa:author_name'][0]}</div>
              <br>
              <div>${pubDate}</div>
              </b>
              </div>
            </div>
          `);
          news.append(tmp);
        }
        if (ct >= 5) break;
      }
      $("#content-feeds").html(news);
      showContent('feeds');
      active['feeds']=false;
    },
    error: function(xhr, status, error) {
      //console.log('Query for feeds error');
      showError('feeds');
      active['feeds']=false;
    }
  });
}

function submitDetail(symbol) {

  showProgress('detail');

  var url = '/api-stock';
  if(active['detail']) {
    //console.log("killing active");
    xhr['detail'].abort();
  }
  active['detail'] = true;
  xhr['detail'] = $.ajax({
    url: url,
    type: 'GET',
    dataType: 'json',
    data: 'symbol='+symbol,
    success: function(response) {
      if (!response || !("Meta Data" in response)) {
        //console.log("Received an Error from Alphavantage");
        active['detail']=false;
        showError('detail');
        return;
      }
      var meta = response["Meta Data"];
      var time_series = response["Time Series (Daily)"];
      var time_stamp = meta["3. Last Refreshed"];
      var isopen = true;
      if (!time_stamp.includes(':')) {
        time_stamp += " 16:00:00";
        isopen = false;
      }
      time_stamp += " " + moment(time_stamp).tz('America/New_York').format('z');
      for (var key in time_series) {
        var timestamp = key;
        break;
      }
      // var symbol = meta["2. Symbol"].toUpperCase();
      var close = time_series[timestamp]["4. close"];
      var open = time_series[timestamp]["1. open"];
      var ct = 0;
      for (var key in time_series) {
        ct++;
        if (ct==2) {
          var tmp = time_series[key];
          break;
        }
      }
      var previous_close = tmp["4. close"];
      var change = close - previous_close;
      var change_percent = (close - previous_close) / previous_close;
      var days_range_low = time_series[timestamp]["3. low"];
      var days_range_high = time_series[timestamp]["2. high"];
      var volume = time_series[timestamp]["5. volume"];

      if (change>0) {
        var arrow = "<img src='img/Up.png' style='max-width: 17px;max-height: 17px;'></img>"
        var change_html = "<span style='color:green'>" + parseFloat(change).toFixed(2) + " (" + (parseFloat(change_percent)*100).toFixed(2) + "%) </span>"+arrow;
      } else if (change<0) {
        var arrow = "<img src='img/Down.png' style='max-width: 17px;max-height: 17px;'></img>"
        var change_html = "<span style='color:red'>" + parseFloat(change).toFixed(2) + " (" + (parseFloat(change_percent)*100).toFixed(2) + "%) </span>"+arrow;
      } else {
        var change_html = "<span>" + parseFloat(change).toFixed(2) + " (" + (parseFloat(change_percent)*100).toFixed(2) + "%)</span>"
      }
      $("#detail-symbol").html(symbol.toUpperCase());
      $("#detail-last-price").html(Number(close).toFixed(2));
      $("#detail-change").html(change_html);
      $("#detail-timestamp").html(time_stamp);
      $("#detail-open").html(Number(open).toFixed(2));
      if (isopen) $("#detail-previous-close").html(Number(close).toFixed(2));
      else $("#detail-previous-close").html(Number(previous_close).toFixed(2));
      if (isopen) $('#detail-previous-close-th').html('Close');
      else $('#detail-previous-close-th').html('Previous Close');
      $("#detail-range").html(Number(days_range_low).toFixed(2) + ' - ' + Number(days_range_high).toFixed(2));
      $("#detail-volume").html(parseInt(volume).toLocaleString());

      showContent('detail');

      enableFavBtn(symbol);
      fbBtn();

      active['detail']=false;
    },
    error: function(xhr, status, error) {
      //console.log('Query for detail error');
      showError('detail');
      active['detail']=false;
    }
  });
}

function submitChart(symbol) {

  var id1=$("#nav2 li.active").attr("id");
  $('#pn-'+id1.substring(4)).show();

  for (var i in indicators) {
    let ind = indicators[i];

    showProgress(ind);
    if (ind=='Price') showProgress('his');

    fbBtn();

    if(active[ind]) {
      //console.log("killing active");
      xhr[ind].abort();
    }
    active[ind] = true;
    xhr[ind] = $.ajax({
      url: '/api-chart/' + ind,
      type: 'GET',
      dataType: 'json',
      data: 'symbol='+symbol,
      success: function(response) {
        if (!response || !("Meta Data" in response)) {
          //console.log("Received an Error from Alphavantage");
          active[ind]=false;
          showError(ind);
          if (ind=='Price') showError('his');
          return;
        }

        var type = ind;
        for (var key in response) {
          if (key != "Meta Data") {
            var g = response[key];
          }
        }
        var ct = 0, categories = [], data = [];
        for (var date in g) {
          ct++;
          var tmp=new Date(date);
          categories.push((('0' + (tmp.getMonth()+1)).slice(-2))+'/'+(('0' + (tmp.getDate()+1)).slice(-2)));
          if (type=="Price") {
            if (data["Price"] === undefined) {
              data["Price"] = [];
              data["Volume"] = [];
            }
            data["Price"].push(parseFloat(g[date]["4. close"]));
            data["Volume"].push(parseFloat(g[date]["5. volume"]));
          }
          else {
            for (var series in g[date]) {
              if (data[series] === undefined) data[series] = [];
              data[series].push(parseFloat(g[date][series]));
            }
          }
          if (ct==25*5+1) break;
        }
        categories.reverse();
        var series = [];
        if (type!="Price") {
          for (var name in data) {
            data[name].reverse();
            series.push({
              "name":type in {"STOCH":1, "BBANDS":1, "MACD":1, "Price":1}?symbol+" "+name: symbol,
              "data":data[name],
            });
          }
        }
        else {
          data["Price"].reverse();
          data["Volume"].reverse();
          series.push({
            "tooltip": {"valueDecimals":2},
            "name":"Price",
            "type":"area",
            "data":data["Price"],
            "yAxis":0
          });
          series.push({
            "name":"Volume",
            "type":"column",
            "data":data["Volume"],
            "yAxis":1
          });
        }

        var ind_full_name = {
          "Price":symbol.toUpperCase() +" Stock Price and Volume",
          "SMA":"Simple Moving Average (SMA)",
          "EMA":"Exponential Moving Average (EMA)",
          "STOCH":"Stochastic Oscillator (STOCH)",
          "RSI":"Relative Strength Index (RSI)",
          "ADX":"Average Directional movement indeX (ADX)",
          "CCI":"Commodity Channel Index (CCI)",
          "BBANDS":"Bollinger Bands (BBANDS)",
          "MACD":"Moving Average Convergence/Divergence (MACD)"
        }

        var tmp =
        {
            title: {
                text: ind_full_name[type],
            },
            chart: {
              zoomType: 'x'
            },
            subtitle: {
                text: '<a href="https://www.alphavantage.co/" target="_blank"><div id="chart_subtitle">Source: Alpha Vantage</div></a>',
                useHTML: true
            },
            xAxis: {
                categories: categories,
            },
            yAxis:
            type=="Price"? [
              {title: {text: "Stock Price"}},
              {title: {text: "Volume"}, opposite:true}
            ]:
            {
                title: {
                    text: type,
                },

            },
            series: series
        };

        Highcharts.chart('chart-' + ind, tmp);
        chart_config['chart-' + ind] = tmp;

        showContent(ind);

        fbBtn();

        if (ind=='Price') {
          setTimeout(function(){
            for (var key in response) {
              if (key != "Meta Data") {
                var g = response[key];
              }
            }
            var data = [];
            var ct = 0;
            for (var date in g) {
              ct++;
              var date_number=(new Date(date)).getTime();
              data.push([date_number, parseFloat(g[date]["4. close"])]);
              if(ct>=1000) break;
            }

            data.reverse();

            var his =
            {
              xAxis: {
                type: "datetime"
              },
              yAxis: {
                title: {text: 'Stock Value'}
              },
              chart: {
                type: 'area'
              },
              rangeSelector: {
                allButtonsEnabled: false,
                selected: 0,
                buttons: screen.width<768?[ {
                    type: 'month',
                    count: 1,
                    text: '1m'
                }, {
                    type: 'month',
                    count: 3,
                    text: '3m'
                }, {
                    type: 'month',
                    count: 6,
                    text: '6m'
                }, {
                    type: 'year',
                    count: 1,
                    text: '1y'
                }, {
                    type: 'all',
                    text: 'All'
                }] :
                [ {
                		type: 'week',
                    count: 1,
                    text: '1w'
                },{
                    type: 'month',
                    count: 1,
                    text: '1m'
                }, {
                    type: 'month',
                    count: 3,
                    text: '3m'
                }, {
                    type: 'month',
                    count: 6,
                    text: '6m'
                }, {
                    type: 'ytd',
                    text: 'YTD'
                }, {
                    type: 'year',
                    count: 1,
                    text: '1y'
                }, {
                    type: 'all',
                    text: 'All'
                }]
              },
              title: {
                  text: symbol.toUpperCase()+" Stock Value"
              },
              tooltip: {valueDecimals:2},
              subtitle: {
                  text: '<a href="https://www.alphavantage.co/" target="_blank"><div id="chart_subtitle">Source: Alpha Vantage</div></a>',
                  useHTML: true
              },
              series: [{
                  name: symbol.toUpperCase(),
                  data: data
              }]
            }

            // //console.log(JSON.stringify(his));
            Highcharts.stockChart('chart-his', his);
            showContent('his');
          }, 0);
        }

        active[ind] = false;
      },
      error: function(xhr, status, error) {
        //console.log('Query for chart error');
        showError(ind);
        if (ind=='Price') showError('his');
        active[ind]=false;
      }
    });
  }
}

$(document).ready(function() {

  // alert($(".nav li.active").attr("id"));
  $("#symbol").focus(function(){
    $(this).addClass('focused-input');
  });

  $("#symbol").focusout(function(){
    // $('#symbol').attr('style', '');
    $(this).removeClass('focused-input');
  });

  $("#input-0").addClass("form-control");

  $("#nav2 li").click(function(){
    var id1=$("#nav2 li.active").attr("id");
    var id2=$(this).attr("id");
    $('#pn-'+id1.substring(4)).hide();
    $('#pn-'+id2.substring(4)).fadeIn();

    $("#nav2 li").removeClass('active');
    $(this).addClass("active");
    fbBtn();
  });

  $("#nav1 li").click(function(){
    var id1=$("#nav1 li.active").attr("id");
    var id2=$(this).attr("id");
    $('#'+id1.substring(4)).hide();
    $('#'+id2.substring(4)).fadeIn();
    $("#nav1 li").removeClass('active');
    $(this).addClass("active");
  })

  disableFavBtn();
  fbBtn();

  for (var i in indicators) {
    var tmp=$("<div></div>").attr('id', 'chart-' + indicators[i]).css('width', '100%').css('height', '100%');
    var tmp2 = `<div class="progress" id="progress-` + indicators[i] + `" style="display:none"><div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0", style="width: 50%"></div></div><div class="alert alert-danger" id="error-` + indicators[i] + `"><strong>Error! Failed to get ` + indicators[i] +` data.</strong></div>`;
    var tmp3=$("<div></div>").attr('id', 'pn-' + indicators[i]).css('display','none').append(tmp, tmp2);
    $('#chart-set').append(tmp3);
    // var tmp=$("<div></div>").text("aa");
    // $('#char-set').append(tmp);
  }
});

angular
  .module('MyApp',['ngMaterial'])
  .controller('FavCtrl', ['$timeout', '$q', '$log', '$scope', '$sce', FavCtrl]);

var qxhr, active = false;

function FavCtrl ($timeout, $q, $log, $scope, $sce) {

  var self = this;

  self.simulateQuery = false;
  self.isDisabled    = false;
  // self.noCache = true;

  // list of `state` value/display objects
  // self.states        = loadAll();
  self.querySearch   = querySearch;
  // self.data = [];
  // self.selectedItemChange = selectedItemChange;
  self.searchTextChange   = searchTextChange;

  if (screen.width<768) {
    self.selectedItemChange = selectedItemChange;
  }
  else self.selectedItemChange = (item)=>{if (item)showValid()};

  // self.newState = newState;
  //
  // function newState(state) {
  //   alert("Sorry! You'll need to create a Constitution for " + state + " first!");
  // }

  var timer = null;

  function selectedItemChange(item) {
    $log.info('Item changed to ' + JSON.stringify(item));
    if (item) {
      showValid();
      $scope.submitMyForm();
    }
  }

  function querySearch (query) {
    //console.log('querySearch first: ' + query);
    if (!query || query.match(/^[\s]*$/)) {
      showInvalid();
      return [];
    }
    if (query) {
      query = query.trim();
      if (!/^[A-Za-z0-9\.]+$/.test(query)) {
        showInvalid();
        query = query.match(/[A-Za-z0-9\.]+/);
        if (query) query=query[0];
      }
      else showValid();
      if (!query || /^[\s]*$/.test(query)) {
        return [];
      }
      //console.log('querySearch ' + query);
      deferred = $q.defer();
      if (timer) {
        clearTimeout(timer);
        timer=null;
      }
      timer = setTimeout(function () {
        var url = "/api-complete/" + query;
        var result = [];

        if (active['complete']) {
          xhr['complete'].abort();
        }
        active['complete']=true;
        xhr['complete'] = $.ajax({
          url: url,
          type: 'GET',
          dataType: 'json',
          success: function(res) {
            var ct=0;
            for (var i in res) {
              var x = res[i].Symbol + " - " + res[i].Name + " (" + res[i].Exchange + ")";
              result.push({value:res[i].Symbol, display:x});
              ct++;
              if(ct==5)break;
            }

            var el = angular.element(document.querySelector('.md-virtual-repeat-container'));
            el.show();
            deferred.resolve(result);
            active['complete']=false;
          },
          error: function(xhr, status, error) {
            //console.log('Query for autocomplete error');
            deferred.reject(new Error("Fail"));
            active['complete']=false;
          }
        });
      }, 370);
      return deferred.promise;
    } else {
      return Error("Blank");
    }
  }

  function searchTextChange(text) {
    // $log.info('Text changed to ' + text);
    //console.log('Text changed to ' + text);
    var el = angular.element(document.querySelector('.md-virtual-repeat-container'));
    el.hide();
  }

  // part 2!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  $scope.SortByChange = "default";
  $scope.OrderChange = "default";
  // $scope.AutoRefreshCheck = false;
  $scope.timer = null;

  $scope.retrieveLocal = retrieveLocal;
  $scope.remove = remove;
  $scope.add = add;
  $scope.sortBy = sortBy;
  $scope.toggleStock = toggleStock;
  $scope.shareFB = shareFB;
  $scope.selectChange = selectChange;
  $scope.getIndChart = getIndChart;
  $scope.refresh = refresh;
  $scope.autoRefresh = autoRefresh;
  $scope.autoRefreshChange = autoRefreshChange;

  // $scope.fav_height = 1000;
  $scope.fav_show = true;
  $scope.stock_show = false;

  $scope.simSubmit = function (symbol) {
    disableFavBtn();
    fbBtn();
    $('#btn-right').attr('disabled', false);
    $scope.showStock();
    // sc.$apply();

    setTimeout(function(){
      submitDetail(symbol);
    }, 0);
    setTimeout(function(){
      submitFeed(symbol);
    }, 0);
    setTimeout(function(){
      submitChart(symbol);
    }, 10);
  }

  $scope.submitMyForm = function () {
    //console.log('submit');
    $('#myform input:focus').blur();
    $scope.simSubmit($('#myform input').val().trim().toUpperCase());
  }

  $scope.clearDetail = function() {
    $('#btn-right').attr('disabled', true);
    $scope.showFav();
    var el = angular.element(document.querySelector('.md-virtual-repeat-container'));
    el.hide();
    self.searchText = '';
    // $scope.myform.$setPristine();
    // $('#myform input').val('');
    $('#myform input:focus').blur()
    $('#symbol').removeClass('invalid-input')
    .removeClass('valid-input').removeClass('focused-input');
    $('.invalid-feedback').css('visibility', 'hidden');
    $('.btn-primary').prop('disabled', true);
  }

  $scope.showStock = function () {
    $scope.fav_show = false;
    $scope.stock_show = true;
    // $scope.setFavHeight();
  }
  $scope.showFav = function () {
    $scope.stock_show = false;
    $scope.fav_show = true;
    // $scope.setFavHeight();
  }

  $scope.render = render;

  retrieveLocal();

  function render(e) {
    // //console.log(e);
    return $sce.trustAsHtml(e);
  }

  function shareFB() {
    //console.log('shareFB');
    var ind=$("#nav2 li.active").attr("id").substring(4);
    var toshare = 'chart-'+ind;
    var caption = $("#chart-" + ind + " .highcharts-title").html();
    var data = {
      options: JSON.stringify(chart_config[toshare]),
      filename: 'chart-Price',
      type: 'image/png',
      async: true,
    };
    var exportUrl = 'http://export.highcharts.com/';
    var url;
    $.ajax({
      url: exportUrl,
      data: data,
      async: false,
      type: 'POST',
      // contentType: "application/x-www-form-urlencoded; charset=ISO-8859-1",
      success: function(data) {
        url = exportUrl + data;
      },
      error: function(xhr, status, error) {
        //console.log('Export chart image error');
      }
    });
    console.log(url);
    FB.ui({
      // link: 'https://developers.facebook.com/docs/dialogs/',
      name: 'Post to Facebook',
      method: 'feed',
      link: url,
      picture: url,
      caption: caption,
    }, (response) => {
      if (response && !response.error_message) {
        alert("Posted Successfully");
      } else {
        alert("Not Posted");
      }
    });
  }

  function getIndChart(symbol) {
    $scope.simSubmit(symbol);
  }

  function autoRefreshChange(checked) {
    //console.log("Auto refresh: " + checked);
    if (checked) {
      if ($scope.timer == null) autoRefresh();
    } else {
      if ($scope.timer != null) {
        clearInterval($scope.timer);
        $scope.timer = null;
      }
    }
  }

  function autoRefresh() {
    $scope.timer = setInterval(refresh, Math.max(500, Math.min(500*$scope.favlist.length, 2000)));
  }

  function refresh() {
    //console.log('refresh');
    var tmp = [], promises = [];
    for (let i in $scope.favlist) {
      let sym = $scope.favlist[i].Symbol
      promises.push(submitStock(sym));
    }
    Promise.all(promises).then(values=>{
      //console.log('refresh finished');
      for (let i in $scope.favlist) {
        //console.log(values[i]);
        if (values[i] && values[i].Symbol) {
          $scope.favlist[i] = values[i];
          localStorage.setItem($scope.favlist[i].Symbol, JSON.stringify($scope.favlist[i]));
        }
      }
      $scope.$apply();
    });
  }

  function selectChange() {
    //console.log("Favorite List Select Change");
    var sort_by = $('#sort-by option:selected').text();
    if (sort_by!="Default") $('#order').prop('disabled', false);
    else $('#order').prop('disabled', true);
    var order = $('#order option:selected').text();
    sortBy(sort_by, order);
  }

  function retrieveLocal() {
    $scope.favlist = [];
    // localStorage.clear();

    for (var i = 0; i < localStorage.length; i++){
      $scope.favlist.push(JSON.parse(localStorage.getItem(localStorage.key(i))));
    }
    // for (var i in localStorage) {
    //   if (localStorage.
    //   console.log(i);
    //   $scope.favlist.push(JSON.parse(localStorage.getItem(i)));
    // }
  }

  function remove(symbol) {
    //console.log("remove " + symbol);
    localStorage.removeItem(symbol);
    for (var i in $scope.favlist)
      if ($scope.favlist[i].Symbol == symbol) {
        $scope.favlist.splice(i, 1);
        break;
      }
  }

  function add(stock) {
    //console.log("add " + stock.Symbol);
    localStorage.setItem(stock.Symbol, JSON.stringify(stock));
    $scope.favlist.push(stock);
  }

  function toggleStock() {
    var stock = {};
    stock.Symbol = $('#detail-symbol').html();

    if (localStorage.getItem(stock.Symbol) != undefined) {
      $('.glyphicon-star').hide();
      $('.glyphicon-star-empty').show();
      remove(stock.Symbol);
    }
    else {
      $('.glyphicon-star-empty').hide();
      $('.glyphicon-star').show();
      stock.Price = $('#detail-last-price').html();
      stock.Change = $('#detail-change').html();
      stock.Volume = $('#detail-volume').html();
      add(stock);
    }
  }

  function sortBy(sort_by, order) {
    var cmp = order == "Ascending"? 1: -1;
    if (sort_by=="Default") retrieveLocal();
    else if (sort_by=="Symbol") {
      $scope.favlist.sort(function(a, b) {
        return a.Symbol < b.Symbol? -cmp: cmp;
      })
    } else if (sort_by=="Price") {
      $scope.favlist.sort(function(a, b) {
        return Number(a.Price) < Number(b.Price)? -cmp: cmp;
      })
    } else if (sort_by=="Change") {
      $scope.favlist.sort(function(a, b) {
        return parseFloat($(a.Change).text().replace('/<.*>/g','').replace(/\(.*\)/g, '')) < parseInt($(b.Change).text().replace('/<.*>/g','').replace(/\(.*\)/g, ''))? -cmp: cmp;
      });
    } else if (sort_by=="Change Percent") {
      $scope.favlist.sort(function(a, b) {
        return parseFloat($(a.Change).text().replace(/(.*\()|(\%\))/g, '')) < parseInt($(b.Change).text().replace(/\(.*\)/g, ''))? -cmp: cmp;
      });
    } else if (sort_by=="Volume") {
      $scope.favlist.sort(function(a, b) {
        return parseInt(a.Volume.replace(/,/g, '')) < parseInt(b.Volume.replace(/,/g, ''))? -cmp: cmp;
      });
    }
  }
}

function changeNg(checked) {
  angular.element(document.getElementById('fav-controller')).scope().autoRefreshChange(checked);
}
