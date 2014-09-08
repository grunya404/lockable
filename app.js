var express = require('express');
var stylus = require('stylus');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var simpledb = require('mongoose-simpledb');
var routes = require('./routes/index');
var ServerDataSimulator = require('./ServerDataSimulator.js');
var moment = require('moment');

var com = require("serialport");
var db = simpledb.db;

simpledb.init({ connectionString: 'mongodb://john:lockable21@ds033429.mongolab.com:33429/lockable' });

var app = express();

//var io = require('socket.io')(app);

//app.listen(80);

//app.get('/', function (req, res) {
//  res.sendfile(__dirname + '/index.html');
//});
/*
io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
*/

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname + '/public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set('port', process.env.PORT || 3000);

var debug = require('debug')('Lockable');

if(0) {
  var server = app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + server.address().port);
  });
} else {
  // Socket IO
  // pass the ExpressJS server to Socket.io.
  // http://code.tutsplus.com/tutorials/real-time-chat-with-nodejs-socketio-and-expressjs--net-31708
  var io = require('socket.io').listen(app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + app.get('port'));
  })
  );
 }



var User = require('./User');
var bob = new User('Bob');
var joe = new User('Joe');
console.log(bob.id);         // 0
console.log(joe.id);         // 1
console.log(bob.balance);    // 0
bob.addBalance(100);
console.log(bob.balance);    // 99.9
console.log(bob._paid);      // false (_paid is private; DON'T DO THIS!)
bob.togglePaid();
console.log(bob.userType()); // 'Paid User'
console.log(joe.userType()); // 'Free User'

/**
 * Influx time series Database
 *
 */
if(0) {
  var influx = require('influx');

  var username = 'johnnewto';
  var password = 'influxdb21';
  var database = 'lockable';

  var client = influx({host: 'oldmanpeabody-calvinklein-1.c.influxdb.com', username: username, password: password, database: database});
}
/*
var info = {
  server: {
    host: 'oldmanpeabody-calvinklein-1.c.influxdb.com',
    port: 8086,
    username: 'johnnewto',
    password: 'influxdb21'
  },
  db: {
    name: 'test_db',
    username: 'johnsmith',
    password: 'johnjohn'
  },
  series: {
    name: 'response_time'
  }
};
*/

//client.createDatabase('123', function(err) {
//  if(err) throw err;
//  console.log('Database Created');
//});

if(0) {
  // write data  all at once
  // start time of 24 hours ago
  var backMilliseconds = 24*3600 * 1000;
  var startTime = new Date() - backMilliseconds;
  var timeInterval = 60 * 1000;
  var  points =  [];

  var t = startTime;
  for (var d = 0; d < 360; d++) {
    t = t + timeInterval;
    points.push({time: t,  value: Math.sin(d * (Math.PI/180))});

  }
  client.writePoints('sin', points, function(err) {
    if(err) throw err;
    console.log('Sin Points Written');
  });
}
if(0) {
  // QUERY data
  var query = 'SELECT * FROM Series-A;'; // WHERE time > now() - 24h';
  client.query(query, function(err, res) {
    if(err) throw err;
    var count = res[0].points.length;
    console.log('Query length = ' + count);
  });
}


//var seriesData = new ServerDataSimulator();

if(0) {
  var series = seriesData.getData();
  var dataToSend = [];
  for (var i = 0; i < series.length; i++) {
    var dataStep = 5000;
    for (var j = 0; j < series[i].data.length; j += dataStep) {
      var dataEnd = Math.min(j + dataStep, series[i].data.length);
      var data = series[i].data.slice(j, dataEnd);
      dataToSend.push({seriesName: series[i].seriesName, data: data})
    }
  }
  if (dataToSend.length > 0) {
    for(var k = 0; k < series.length; k++) {
      sendToDB(k);
    }

    function sendToDB(k) {
      client.writePoints(dataToSend[k].seriesName, dataToSend[k].data, function (err) {
        if (err) throw err;
        console.log('Series Written: ');
        if (++k < dataToSend.length) {
          sendToDB(k)
        }
      });
    }
  }
}


var rangeDataLoadReq = {
  seriesName: "Series-A",
  reqType: "range",
  reqNum: 1,
  startDateTm: moment().utc().add('hour', -20),
  endDateTm: moment().utc().add('hour', -19),
  numIntervals: 570,
  includeMinMax: true
};

/*
var dataPoints = seriesData.loadData(rangeDataLoadReq);
dataPoints = seriesData.loadDataDB(client, rangeDataLoadReq);

seriesData.on('data', function(req, res){
  var a = res;
});
*/
if(0) {
  io.sockets.on('connection', function (socket) {
    socket.emit('message', { message: 'welcome to the chat' });
    socket.on('send', function (data) {
      io.sockets.emit('message', data);
    });

    socket.on('dygraph', function (data) {
      if (data.req) {
        dataPoints = seriesData.loadDataDB(client, data.req);
        seriesData.loadDataDB(client, rangeDataLoadReq);
      }
    });
    /*
     seriesData.on('data', function (req, res) {
     var a = {};
     a.req = req;
     a.res = res;
     io.sockets.emit('dygraph', a);
     });
     */
    socket.on('dygraph', function (data) {
      dataPoints = seriesData.loadData(data.req);
      data.res = {};
      data.res.dataPoints = dataPoints;
      io.sockets.emit('dygraph', data);
    });


  });

}

/*
var a_newVal = 0, b_newVal = 0, c_newVal = 0;
var timeVal = 0;


setInterval(function () {
  function newVal(lastVal) {
    var inc = Math.round((Math.random() - 0.5) * 200);
    var _newVal = lastVal + inc;
    if (_newVal < 0 || _newVal > 1000) {
      _newVal = lastVal - inc;
    }
    return _newVal;
  }

  timeVal++;
  console.log('test');
  a_newVal = newVal(a_newVal);
  b_newVal = newVal(b_newVal);
  c_newVal = newVal(c_newVal);

  var msg = {time: timeVal, a: a_newVal, b: b_newVal, c: c_newVal };

  io.emit('message', { username: 'jqxchart', message: msg });
}, 1000);
*/

/*
try {
  var serialPort = new com.SerialPort("COM9", {
    baudrate: 57600,
    parser: com.parsers.readline('\r\n')
  });

  serialPort.on('open',function() {
    console.log('Port open');
  });

// Serialport

  serialPort.on('data', function(data) {
    console.log(data);
    var str = "Hello";
    var bytes = [];
    for (var i = 0; i < str.length; ++i)
    {
      bytes.push(str.charCodeAt(i));
    }

    try {
      var jdata = JSON.parse(data);
      db.Locks.update(
        {addr: jdata.addr },  // query
        jdata,                       // replacement
        {'upsert': true},            // options
        function onUpdate(err, number) {
          if(err) return console.error(err);
        }
      )
      db.Locks.findOne({addr: jdata.addr }, function(err, lock) {
        if (err) {
          console.error(err + app.FILE_LINE());
          return;
        }
        io.emit('message', { message: lock, username: 'serialport' } );
      });
    } catch (e) {
      console.log(e + app.FILE_LINE());
    }
  });
} catch (err) {
    console.log(e + app.FILE_LINE());
}


*/

////////////////////////////////////////////////////////////////////////////////////////

// Debugging: Get the current line number, file and function names
Object.defineProperty(global, '__stack', {
  get: function() {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack) {
      return stack;
    };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

Object.defineProperty(global, '__line', {
  get: function() {
    return __stack[1].getLineNumber();
  }
});

Object.defineProperty(global, '__file', {
  get: function() {
    var str = __stack[1].getFileName();
    str = str.substring(str.lastIndexOf("\\"));  // ??? / or other \
    return str;
  }
});

Object.defineProperty(global, '__function', {
  get: function() {
    return __stack[1].getFunctionName();
  }
});

var FILE_LINE = function() {
  var filename = __stack[1].getFileName();
  filename = filename.substring(filename.lastIndexOf("\\"));  // ??? / or other \
  return "File: " + filename + " Line: " + __stack[1].getLineNumber();
}
exports.FILE_LINE = FILE_LINE;

function doo() {
  console.log(FILE_LINE());
}

doo();

var http = require('http');

/*// Loop forever
setImmediate(function loop () {
  return; // don't run
  //climate.readTemperature('f', function (err, temp) {
  //  climate.readHumidity(function (err, humid) {
  var temp = Math.random()*100;
  var humid = Math.random()*100;
      http.get("http://tesseltemp.azurewebsites.net/io/gettemp/" + temp.toFixed(4) + "/" + humid.toFixed(4), function (res) {
        console.log('# statusCode', res.statusCode)

        var bufs = [];
        res.on('data', function (data) {
          bufs.push(new Buffer(data));
          console.log('# received', new Buffer(data).toString());
        })
        res.on('close', function () {
          console.log('done.');
          setImmediate(loop);
        })
      }).on('error', function (e) {
        console.log('not ok -', e.message, 'error event')
        setImmediate(loop);
      });
      console.log('Degrees:', temp.toFixed(4) + 'F', 'Humidity:', humid.toFixed(4) + '%RH');
      setTimeout(loop, 1000);
  //  });
 // });
});
*/
module.exports = app;
