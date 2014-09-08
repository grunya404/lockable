
  /**
   * This class simulates a backend time series data service.  It makes it possible to provide a live demo without
   * having any backend service dependencies.  The server-side downsampling can be done an infinite number of ways
   * and will depend on nature of project, data purpose, size, etc.  Relational databases can be used, but often not
   * ideal.  For those looking for time series specific databases,  I would recommend checking out OpenTSDB, KairoDB,
   * or my newest favorite, tempo-db.com.
   *
   * This class simulates a randomized loading delay, default from 100 - 1000ms.
   *
   *
   @class ServerDataSimulator
   @constructor
   */
  var moment = require('moment');
  var influx = require('influx');
  var events = require('events');
  var util   = require('util');

  // Private

  var serverData = [];

  // Constructor
  function ServerDataSimulator() {
    events.EventEmitter.call(this);
  };

  ServerDataSimulator.prototype = new events.EventEmitter;

  ServerDataSimulator.prototype.getData = function () {
    return serverData;
  }

  ServerDataSimulator.prototype.loadDataDB = function (client, dataLoadReq) {
      // QUERY data
    var self = this;

    var dataPoints = [];

    //    var _timePerInterval = dataLoadReq.endDateTm.diff(dataLoadReq.startDateTm, 'milliseconds') / dataLoadReq.numIntervals;;
    var startDateTm = moment(dataLoadReq.startDateTm).valueOf() * 1000000;
    var endDateTm = moment(dataLoadReq.endDateTm).valueOf() * 1000000;

    //  var timePerInterval = (endDateTm.valueOf() - startDateTm.valueOf()) / dataLoadReq.numIntervals;
    //  var currTime = startDateTm.valueOf();
    /*  var _serverData = {};
    //  for (var i = 0; i < serverData.length; i++) {
        if( dataLoadReq.seriesName === serverData[i].seriesName) {
          _serverData = serverData[i].data;
          break;
        }
      }
    */
      var query = 'SELECT * FROM Series-A where time > ' + startDateTm + ' and time < ' + endDateTm; // WHERE time > now() - 24h';
      client.query(query, function(err, res) {
        if(err) throw err;

        if (res.length > 0) {
          var count = res[0].points.length;
          console.log('Query length = ' + count);
          self.emit('data', dataLoadReq, res[0].points);
        }

      });

    }

  ServerDataSimulator.prototype.loadData = function (dataLoadReq) {
    //console.log("loadData", dataLoadReq);

    // Generate fake raw data set on first call
     if (serverData.length == 0 ) {
       var seriesConfigs = [
         {seriesName: 'Series-A'},
         {seriesName: 'Series-B'},
         {seriesName: 'Series-C'}
       ];
       var i;
       for (i = 0; i < seriesConfigs.length; i++) {
         _generateServerData(seriesConfigs[i].seriesName);
         var a = i;
       }
     }
    if(dataLoadReq ==null) return;
    //Do down sampling per the dataLoadReq
    var dataPoints = [];

//    var _timePerInterval = dataLoadReq.endDateTm.diff(dataLoadReq.startDateTm, 'milliseconds') / dataLoadReq.numIntervals;;
    var startDateTm = moment(dataLoadReq.startDateTm);
    var endDateTm = moment(dataLoadReq.endDateTm);

    var timePerInterval = (endDateTm.valueOf() - startDateTm.valueOf()) / dataLoadReq.numIntervals;
    var currTime = startDateTm.valueOf();
    var _serverData = {};
    for (var i = 0; i < serverData.length; i++) {
      if( dataLoadReq.seriesName === serverData[i].seriesName) {
        _serverData = serverData[i].data;
        break;
      }
    }
    if(i == serverData.length)
      console.log("ERROR Series not found " + FILE_LINE());


  //Find start of load request in the raw dataset
    var currIdx = 0;
    for (var i = 0; i < _serverData.length; i++) {

      if (_serverData[currIdx].time < (currTime - timePerInterval))
        currIdx++;
      else
        break;
    }

    // Calculate average/min/max while downsampling
    while (currIdx < _serverData.length && currTime <= endDateTm.valueOf()) {
      var numPoints = 0;
      var sum = 0;
      var min = 9007199254740992;
      var max = -9007199254740992;

      while (currIdx < _serverData.length && _serverData[currIdx].time < currTime) {
        sum += _serverData[currIdx].value;
        min = Math.min(min, _serverData[currIdx].value);
        max = Math.max(max, _serverData[currIdx].value);
        currIdx++;
        numPoints++;
      }

      var avg = sum / numPoints

      if (numPoints == 0) {
        if (dataLoadReq.includeMinMax) {
          dataPoints.push({
            time: currTime,
            avg: null,
            min: null,
            max: null
          });
        }
        else {
          dataPoints.push({time: currTime, avg: null});
        }
      }
      else {
        if (dataLoadReq.includeMinMax) {
          dataPoints.push({
            time: currTime,
            avg: Math.round(avg),
            min: Math.round(min),
            max: Math.round(max)
          });
        }
        else {
          dataPoints.push({time: currTime, avg: avg});
        }
      }

      currTime += timePerInterval;
      currTime = Math.round(currTime);
    }

   // var delay = (Math.random() * (this.maxDelay - this.minDelay)) + this.minDelay;
   return dataPoints;
   // console.log("dataPoints", dataLoadReq, dataPoints);

    //Random delay for "_onDataLoad" callback to simulate loading data from real server
  //  setTimeout($.proxy(this._onDataLoad, this, dataLoadReq, dataPoints), delay);

  };


  ServerDataSimulator.prototype._onDataLoad = function (dataLoadReq, dataPoints) {
    var dataLoadResp = {
      dataPoints: dataPoints
    };
    //this.onServerDataLoadCallbacks.fire(dataLoadReq, dataLoadResp);
  };


  /**
   Generates the simulated raw dataset. To make the demo compelling, we want obvious larger trends in the data over time, with
   more detail viewable only when zooming in. That's basically what this does. Date ranges and randomizing is hardcoded, but
   could be easily parameterized.

   NOTE:[2013-08-19 JGS]  This method is a bit of a mess. I just wanted something that generated semi-compelling
   data consistently and played around with a multitude of variations.

   @method _generateServerData
   @private
   */
  _generateServerData = function (seriesName) {
    "use strict";
    var startMom = {};
    var endMom = {};
    //var endMom = moment().utc();  // now
    //endMom.add('day', -5);

    var ymin = 500;
    var ymax = 1500;
    var majorInterval = {};
    var minorInterval = {};

    if(true) {
      //startMom = moment().utc().add(-1, 'hour');
      //endMom = moment().utc().add(+30, 'minute');
      startMom = moment().utc().add(-2, 'week');
      endMom = moment().utc().add(+1, 'week');


      if (seriesName == "Series-A") {
        majorInterval = moment.duration(11, 'hours');
        minorInterval = moment.duration(1, 'minute');
      }
      else if (seriesName == "Series-B") {
        majorInterval = moment.duration(5, 'hours');
        minorInterval = moment.duration(5, 'minute');
      }
      else {
        majorInterval = moment.duration(20, 'hours');
        minorInterval = moment.duration(10, 'minute');
      }
    }
    else {
      startMom = moment('2014-07-01').utc();
      endMom = moment('2014-09-01').utc();
      if (seriesName == "Series-A") {
        majorInterval = moment.duration(11, 'days');
        minorInterval = moment.duration(1, 'minute');
      }
      else if (seriesName == "Series-B") {
        majorInterval = moment.duration(5, 'days');
        minorInterval = moment.duration(5, 'minute');
      }
      else {
        majorInterval = moment.duration(20, 'days');
        minorInterval = moment.duration(10, 'minute');
      }
    }

    var data = [];

    var totalDur = endMom.valueOf() - startMom.valueOf();

    var currTime = startMom.valueOf();
    var numPoints = (endMom.valueOf() - startMom.valueOf()) / minorInterval.valueOf();


    var period = majorInterval.valueOf();
    var periodNum = currTime / period;

    // just need a number that can change as we iterate, but stays
    // the same for each reload of data set given same start/end dates. This makes the overall trend look the same every time
    // for a given series, and might avoid some confusion in the demo.
    var periodIncr;
    var detailFactor;

    if (seriesName == "Series-A") {
      periodIncr = startMom.date() / 31.0; //1-31
      detailFactor = 50 + (Math.random() * 450);
    }
    else if (seriesName == "Series-B") {
      periodIncr = ((endMom.date() - 5) / 31.0) * 2; //1-31
      detailFactor = 150 + (Math.random() * 650);
    }
    else {
      periodIncr = Math.random();
      detailFactor = 20 + (Math.random() * 250);
    }

    var lastY = ymin;
    for (var i = 0; i < numPoints; i++) {
      if (Math.floor(currTime / period) != periodNum) {
        periodNum = Math.floor(currTime / period);
        periodIncr = moment(currTime).date() / 31.0;
        periodIncr = periodIncr * ((0.09) - (0.09 / 2));
      }
      else {

        if (lastY > (ymax + ymin) / 2)
          periodIncr = periodIncr - (lastY / (ymax + ymin)) * .000002;
        else
          periodIncr = periodIncr + ((ymax + ymin - lastY) / (ymax + ymin)) * .000002;
      }

      if (Math.floor(currTime / (period / 4) != periodNum)) {
        detailFactor = 50 + (Math.random() * 450);
      }


      lastY += periodIncr;
      if (lastY > ymax) {
        periodIncr = periodIncr * -1;
      }
      else if (lastY < ymin) {
        periodIncr = periodIncr * -1;
      }


      var detailY = lastY + (Math.random() - 0.5) * detailFactor;
//      if (detailY > max)
//        detailY = max;
//      if (detailY < min)
//        detailY = min;

      data.push({ time: currTime, value: detailY});
      currTime += minorInterval.valueOf();
    }

    serverData.push({ seriesName: seriesName, data: data});
    //_serverData[seriesName] = data;

  }

  // Public
  module.exports = ServerDataSimulator;
