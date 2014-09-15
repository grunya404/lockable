var express = require('express');
var moment = require('moment');
var app = require('../app');
var ServerDataSimulator = require('../ServerDataSimulator.js');

var router = express.Router();
var db = require('mongoose-simpledb').db;

var seriesData = new ServerDataSimulator();

var influx = require('influx');

/*var host = 'oldmanpeabody-calvinklein-1.c.influxdb.com';
var username = 'johnnewto';
var password = 'influxdb21';
var database = 'lockable';
*/

var host = '54.183.211.177';
var port = '8086';
var username = 'root';
var password = 'root';
var database = 'test1';
var series = 'sensor';

var client = influx({host : host, port : port, username : username, password : password, database : database});
client.setRequestTimeout(20000);

router.post('/endpoint1', function(req, res){
  var query = 'SELECT * FROM Series-A limit 1000;'; // WHERE time > now() - 24h';
  client.query(query, function(dberr, dbres) {
    if(dberr) throw dberr;
    var count = dbres[0].points.length;
    console.log('Query length = ' + count);
    res.send({message: 'Query length = ' + count});
  });
});

router.post('/testQuery', function(req, res){
  client.query(query, function(dberr, dbres) {
    if(dberr) throw dberr;
    var count = dbres[0].points.length;
    console.log('Query length = ' + count);
    res.send({message: 'Query length = ' + count});
  });

});

router.post('/old_dygraph', function(req, res){
  dataPoints = seriesData.loadData(req.body.req);
  var data = {};
  data.req = req.body.req;
  data.res = {};
  data.res.dataPoints = dataPoints;
  res.send(data);
});

/*
  detailDataLoadReq: Object
  endDateTm: Thu Aug 28 2014 11:45:38 GMT+1200 (New Zealand Standard Time)
  includeMinMax: true
  numIntervals: 912.5
  reqNum: 40
  reqType: "detail"
  seriesName: "Series-A"
  startDateTm: Wed Aug 27 2014 11:45:38 GMT+1200 (New Zealand Standard Time)
*/
router.post('/dygraph', function(req, res){
  var data = {};
  data.req = req.body.req;
  data.res = {};
  data.res.dataPoints = [];

  var startDateTm = moment(data.req.startDateTm).valueOf();
  var endDateTm   = moment(data.req.endDateTm).valueOf();
  var timePerInterval = (endDateTm - startDateTm) / (data.req.numIntervals*1000);

  //var query = 'SELECT mean(value) FROM ' + data.req.seriesName + ' where time > '
  //    + startDateTm + '000000 and  time < ' + endDateTm + '000000 '
  //    + ' group by time('+ timePerInterval +'s) limit 5000;';

  var query = 'SELECT mean(' + data.req.seriesName + '), '
    + 'max(' + data.req.seriesName + '), '
    + 'min(' + data.req.seriesName + ') '
    + 'FROM ' + series + ' where time > '
    + startDateTm + '000000 and  time < ' + endDateTm + '000000 '
    + ' group by time('+ timePerInterval +'s) limit 5000;';

  client.query(query, function(dberr, dbres) {
    if (dberr) throw dberr;
    if (dbres.length > 0) {
      console.log('Query Success: points = ' + dbres[0].points.length + ' : ' + query);
      data.res.dataPoints = dbres[0].points.reverse(); // reverse the order to be compatable
    } else {
      console.log('Query Error: no data returned: ' + query);
    }
    res.send(data);
  });
});


// about page route (http://localhost:3000/about)
router.get('/writeDB', function(req, res) {
  var seriesData = new ServerDataSimulator();
  seriesData.loadData(null);

  var series = seriesData.getData();
  var dataToSend = [];
  for (var i = 0; i < series.length; i++) {
    var dataStep = 1000;
    for (var j = 0; j < series[i].data.length; j += dataStep) {
      var dataEnd = Math.min(j + dataStep, series[i].data.length);
      var data = series[i].data.slice(j, dataEnd);
      dataToSend.push({seriesName: series[i].seriesName, data: data})
    }
  }
  if (dataToSend.length > 0) {
    for (var k = 0; k < series.length; k++) {
      _sendToDB(k);
    }
  }
  res.send('Send data to influxdB!');

  function _sendToDB(k) {
    client.writePoints(dataToSend[k].seriesName, dataToSend[k].data, function (err) {
      if (err) throw err;
      console.log('Series Written: ');
      if (++k < dataToSend.length) {
        _sendToDB(k)
      }
    });
  }
});



// home page route i.e. (http://localhost:3000)
router.get('/', function(req, res) {
  res.render('index',{title: 'Express'});
});

// route i.e. (http://localhost:3000/addUser)
router.get('/addLock', function(req, res) {
  res.render('add-lock',{title: 'Express'});
});

// route i.e. (http://localhost:3000/lockChart)
router.get('/lockChart', function(req, res) {
  db.Locks.find(function(err, locks) {
    res.render('lock-chart', {
      title: 'Locks',
      locks: locks
    });
  });
 // res.render('lock-chart',{title: 'Express'});
});

// route i.e. (http://localhost:3000/lockTable)
router.get('/lockTable', function renderLockTable(req, res) {
  db.Locks.find(function(err, locks) {
    res.render('lock-table', {
      title: 'Locks',
      locks: locks
    });
  });
});

router.post('/createLock', function updateDB(req, res) {
  // find if already exists
  var newlock = {
    name: req.body.name,
    addr: req.body.address,
    lock: req.body.state
  };
  db.Locks.update(
    {address: req.body.address },  // query
    newlock,                       // replacement
    {'upsert': true},              // options
    function redirectToLockTable(err, lock) {
      if(err) return console.error(err);
      res.redirect('/lockTable');
  })
});

router.post('/removeLock/:id', function removeLock(req, res) {
  db.Locks.findById(req.param('id'), function (err, lock) {
    if(err) return console.error(err);
    try {
      lock.remove(function (err) {
        if (err) return console.error(err);
        res.send({status: 'success'});
      });
    }
    catch(err) {
      console.error(err + app.FILE_LINE());
//      console.log(__file + " " + __function + " " + __line);
    }

  });
});

// route i.e. (http://localhost:3000/addUser)
router.get('/addUser', function addUser(req, res) {
  res.render('add-user',{title: 'Express'});
});

// route i.e. (http://localhost:3000/users)
router.get('/users', function (req, res) {
  db.User.find(function(err, users) {
    res.render('users', {
      title: 'Users',
      users: users
    });
  });
});

/*router.get('/string', function (req, res) {
  var strings = ["rad", "bla", "ska"]
  var n = Math.floor(Math.random() * strings.length)
  res.send(strings[n])
})*/


router.get('/endpoint', function(req, res){
  var obj = {};
  //obj.dataField = : 'a' = 'title';
  //obj.data = 'data';
  obj = [
    { dataField: 'a', displayText: 'a', opacity: 1, lineWidth: 1, symbolType: 'circle', fillColorSymbolSelected: 'white', radius: 15 },
    { dataField: 'b', displayText: 'b', opacity: 1, lineWidth: 1, symbolType: 'circle', fillColorSymbolSelected: 'white', radius: 15 },
    { dataField: 'c', displayText: 'c', opacity: 1, lineWidth: 1, symbolType: 'circle', fillColorSymbolSelected: 'white', radius: 15 }
  ];

  console.log('params: ' + JSON.stringify(req.params));
  console.log('body: ' + JSON.stringify(req.body));
  console.log('query: ' + JSON.stringify(req.query));

  res.header('Content-type','application/json');
  res.header('Charset','utf8');
  res.send(req.query.callback + '('+ JSON.stringify(obj) + ');');
});


router.post('/createUser', function(req, res) {
  var user = new db.User({
    username: req.body.username,
    password: req.body.password,
    name: {
      first: req.body.firstname,
      last: req.body.lastname
    }
  });
  user.save(function(err, user) {
    if(err) return console.error(err);
    res.redirect('/users');
  })
})



router.post('/CreateMarkers/', function(req, res) {
  res.send({status: 'success'});
});

router.post('/query/', function(req, res) {
  console.log(request.body);      // your JSON
  response.send(request.body);    // echo the result back
});

router.post('/removeUser/:id', function(req, res) {
  db.User.findById(req.param('id'), function (err, user) {
    if(err) return console.error(err);
    user.remove(function(err) {
      if(err) return console.error(err);
      res.send({status: 'success'});
    });
  });
});

// about page route (http://localhost:3000/about)
router.get('/about', function(req, res) {
  res.send('im the about page!');
});


module.exports = router;
