(function (JGS, $, undefined) {
  "use strict";
  /**
   This class is more generic version of JGS.GraphDataProvider and is able to handle multiple series.

   This class is used to acquire, aggregate, splice, and convert data to be fed to dygraphs.  The handling
   of data will be different for each project and is heavily dependent on the downsampling methods, backend service API,
   etc.  Generally though, the expectation is that JavaScript clients are able to make one or more calls to get the following
   data sets:

   - range-data-avg
   - range-data-min
   - range-data-max

   - detail-data-avg
   - detail-data-min
   - detail-data-max

   Depending on backend API, this could mean six distinct HTTP calls, or just one.  In this example, the API is
   structured such that a single API call with start date, end date, & downsampling level, provides a dataset
   that includes avg/min/min values in a single response.  As a result, the example  initially has to make two calls
   to get data; one for the range datasets, and one for the detail datasets.  It has to make these calls for each series
   to be displayed.  This class is responsible for waiting until all datasets of all series are available before
   continuing.

   After the initial loads, only detailed datasets need to be loaded if the graph range does not change. Data loads are
   often delayed. Users might be initiating or changing zoom extents even before responses have been received.  Because
   of that, this class is also responsible for making sure only the most recent request/response gets used. All others
   are discarded. That is the purpose of "reqNum" parameter in the requests.

   Once data is available, this class splices the range and detail to generate a single spliced data set per series. It
   then combines all series in to a single dataset with a common time base (x-axis) that is useable by dygraphs.

   @class GraphDataProviderMultiSeries
   @constructor
   */
  JGS.GraphDataProviderMultiSeries = function () {
    this.runLocal = false;  // set true to get data from browser serverDataSimulator
    this.serverDataSims = {};
    this.newGraphDataCallbacks = $.Callbacks();

    this.lastRangeReqNum = 0;
    this.lastDetailReqNum = 0;

    // This is used to track that all series have been loaded. In a production system, this might not be robust
    // enough as-is because the system should also watch for errors, handle timeouts, etc. But for demo purposes...
    this.seriesNames = [];
    this.seriesDataHolders = {};
    this.numSeriesRequested = 0;
    this.numSeriesLoaded = 0;
    // socket io callback
   //if(!this.runLocal) {
     //this.socket = io.connect('http://localhost:3000');
     //this.socket.on('dygraph', $.proxy(this.__onServerDataLoad, this));
   //}
    /*
    this.socket = io.connect('http://localhost:3000');

    this.socket.on('dygraph', function (data) {
      if(data.message) {
        console.log("Success", data);
      } else {
        console.log("There is a problem:", data);
      }
    });
    */

  };


  /**
   Initiates data load requests for 1 or more series. The rangeStartDateTm and rangeEndDateTm parameters are optional. If null, then only
   new detail data will be loaded, and the result spliced with most recent existing range data.  Callbacks are not initiated
   until all series have been loaded.

   @method loadData
   */
  JGS.GraphDataProviderMultiSeries.prototype.loadData = function
      (seriesConfigs, rangeStartDateTm, rangeEndDateTm, detailStartDateTm,
       detailEndDateTm, pixelWidth) {
    var self = this;
    var prevSeriesDataHolders = this.seriesDataHolders;

    // Each loadData request will effectively cancel out any previous requests, even if they
    // have not yet returned.
    this.seriesNames.length = 0;
    this.seriesDataHolders = {};
    this.numSeriesRequested = seriesConfigs.length;
    this.numSeriesLoaded = 0;

    var i;
    for (i = 0; i < seriesConfigs.length; i++) {
      var seriesConfig = seriesConfigs[i];
      var seriesName = seriesConfig.seriesName;
      var seriesDataHolder = {};
      this.seriesNames.push(seriesName);
      this.seriesDataHolders[seriesConfig.seriesName] = seriesDataHolder;


      //Construct server data provider/simulator if needed for the requested series
      var serverDataSim = this.serverDataSims[seriesName];
      if (!serverDataSim) {
        serverDataSim = new JGS.ServerDataSimulator(seriesName);
        serverDataSim.onServerDataLoadCallbacks.add($.proxy(this._onServerDataLoad, this));
        this.serverDataSims[seriesName] = serverDataSim;
      }

      // loading range data is optional, and it not reloaded when changing only the detail
      if (!rangeStartDateTm || !rangeEndDateTm) {
        seriesDataHolder.rangeDataLoadComplete = true;
        if (prevSeriesDataHolders[seriesName]) {
          seriesDataHolder.lastRangeDataLoadResp = prevSeriesDataHolders[seriesName].lastRangeDataLoadResp;
        }
      }
      else { //if (rangeStartDateTm && rangeEndDateTm) {

        seriesDataHolder.rangeDataLoadComplete = false;
        //This determines how many points we load (and so how much downsampling is being asked for).
        //This might be specific to each project and require some knowledge of the underlying data purpose.
        var numRangeIntervals = pixelWidth / 2; // ...so at most, downsample to one point every two pixels in the range selector

        var rangeDataLoadReq = {
          seriesName: seriesName,
          reqType: "range",
          reqNum: ++this.lastRangeReqNum,
          startDateTm: rangeStartDateTm,
          endDateTm: rangeEndDateTm,
          numIntervals: numRangeIntervals,
          includeMinMax: true
        };
        seriesDataHolder.lastRangeDataLoadReq = rangeDataLoadReq;

        if (this.runLocal)
          serverDataSim.loadData(rangeDataLoadReq);
        else {
          var data = {};
          data.title = "title";
          data.message = "message";
          //this.socket.emit('dygraph', {"req": rangeDataLoadReq});
          $.ajax({
            type: 'POST',
            data: JSON.stringify({'req': rangeDataLoadReq}),
            contentType: 'application/json',
            url: 'http://localhost:3000/dygraph',
            success: $.proxy(self.__onServerDataLoad, self)
          })
        }
      }

      // load detail data ...also coded optional, but never used as optional because we don't range extents without changing detail extents
      var detailDataLoadReq = {};
      seriesDataHolder.detailDataLoadComplete = false;

      if (!detailStartDateTm || !detailEndDateTm) {
        var rangeEndMom, rangeStartMom;
        rangeEndMom = moment().utc();
        rangeEndMom.milliseconds(0);
        rangeStartMom = moment.utc(rangeEndMom).add('seconds', -30);

        detailDataLoadReq = {
          seriesName: seriesName,
          reqType: "detail",
          reqNum: ++this.lastDetailReqNum,
          startDateTm: rangeStartMom.toDate(),
          endDateTm: rangeEndMom.toDate(),
          numIntervals: pixelWidth / 2, // ...so at most, downsample to one point every two pixels in the graph,
          includeMinMax: true
        };
        if (prevSeriesDataHolders[seriesName]) {
          seriesDataHolder.lastDetailDataLoadReq = prevSeriesDataHolders[seriesName].lastDetailDataLoadReq;
          seriesDataHolder.lastDetailDataLoadReq.reqNum = detailDataLoadReq.reqNum;
        }

      } else { // if (detailStartDateTm && detailEndDateTm) {
        //This determines how many points we load (and so how much downsampling is being asked for).
        //This might be specific to each project and require some knowledge of the underlying data purpose.
        detailDataLoadReq = {
          seriesName: seriesName,
          reqType: "detail",
          reqNum: ++this.lastDetailReqNum,
          startDateTm: detailStartDateTm,
          endDateTm: detailEndDateTm,
          numIntervals: pixelWidth / 2, // ...so at most, downsample to one point every two pixels in the graph,
          includeMinMax: true
        };
        seriesDataHolder.lastDetailDataLoadReq = detailDataLoadReq;

      }
      if (this.runLocal)
        serverDataSim.loadData(detailDataLoadReq);
      else {
        var data = {};
        data.title = "title";
        data.message = "message";
        //this.socket.emit('dygraph', {"req": detailDataLoadReq});
        $.ajax({
          type: 'POST',
          data: JSON.stringify({'req': detailDataLoadReq}),
          contentType: 'application/json',
          url: 'http://localhost:3000/dygraph',
          success: $.proxy(self.__onServerDataLoad, self)
        })
      }
    }
  }

  /**
   Callback handler for server data load response. Will discard responses if newer requests were made in the meantime.
   Responsible for making sure all data (detail & range for all series) has been received before triggering callbacks.

   @method _onServerDataLoad
   @private
   */
  JGS.GraphDataProviderMultiSeries.prototype.__onServerDataLoad = function (data) {
    if(data.req) {
      console.log("Success", data.req);
      var dbRes = {};
      dbRes.dataPoints = [];
      if(data.res.dataPoints.length > 0) {
        if(data.res.dataPoints[0].length == 3) {
          for(var i=0; i<data.res.dataPoints.length;i++ ) {
            dbRes.dataPoints.push({ time: data.res.dataPoints[i][0], avg: data.res.dataPoints[i][2], max: data.res.dataPoints[i][2]+100, min:data.res.dataPoints[i][2]-100 });    
          }
        } else if (data.res.dataPoints[0].length == 2) {
         for(var i=0; i<data.res.dataPoints.length;i++ ) {
            dbRes.dataPoints.push({ time: data.res.dataPoints[i][0], avg: data.res.dataPoints[i][1], max: data.res.dataPoints[i][1]+100, min:data.res.dataPoints[i][1]-100 });    
          }

        } // else alert("Data return error in Multiseries.js");
      }
      this._onServerDataLoad(data.req, dbRes);
    } else {
      console.log("There is a problem @ GraphDataProviderMultiSeries.prototype.__onServerDataLoad: ", data);
    }
        
  }

  JGS.GraphDataProviderMultiSeries.prototype._onServerDataLoad = function (dataLoadReq, dataLoadResp) {
    //console.log("_onServerDataLoad", dataLoadReq, dataLoadResp);
    //console.log("_onServerDataLoad", this);

    var seriesDataHolder = this.seriesDataHolders[dataLoadReq.seriesName];
    if (!seriesDataHolder)
      return;

    if (dataLoadReq.reqType == 'detail') {
      if (seriesDataHolder.lastDetailDataLoadReq.reqNum != dataLoadReq.reqNum) {
        return;  //discard because newer request was sent
      }
      else {
        seriesDataHolder.lastDetailDataLoadResp = dataLoadResp;
        seriesDataHolder.detailDataLoadComplete = true;
      }
    }
    else { //range
      if (seriesDataHolder.lastRangeDataLoadReq.reqNum != dataLoadReq.reqNum) {
        return;  //discard because newer request was sent
      }
      else {
        seriesDataHolder.lastRangeDataLoadResp = dataLoadResp;
        seriesDataHolder.rangeDataLoadComplete = true;
      }
    }
    if (seriesDataHolder.rangeDataLoadComplete && seriesDataHolder.detailDataLoadComplete) {

      this.numSeriesLoaded++;

      // Do not continue until we have range and detail for all series
      if (this.numSeriesLoaded != this.numSeriesRequested) {
        return;
      }

      //Splice the range and detail datasets for each series
      //var seriesDps = [];
      for (var seriesIdx = 0; seriesIdx < this.numSeriesLoaded; seriesIdx++) {
        var seriesDataHolder = this.seriesDataHolders[this.seriesNames[seriesIdx]];
        seriesDataHolder.splicedData = this._spliceRangeAndDetail(seriesDataHolder.lastRangeDataLoadResp.dataPoints, seriesDataHolder.lastDetailDataLoadResp.dataPoints);
        //seriesDps.push(seriesDataHolder.splicedData);
      }

      // Combine all of the series splices in to a single dataset useable by dygraphs.
     // var combinedSeriesData = this._combineSeries(seriesDps, this.seriesDataHolders);
      var combinedSeriesData = this._combineSeries(this.seriesDataHolders);

      // Trigger the callbacks
      var graphData = {
        dyData: combinedSeriesData,
        detailStartDateTm: seriesDataHolder.lastDetailDataLoadReq.startDateTm,
        detailEndDateTm: seriesDataHolder.lastDetailDataLoadReq.endDateTm
      };

      this.newGraphDataCallbacks.fire(graphData);
    }

  };

  /**
   Splices the range data set, with detail data set, to come-up with a single spliced dataset. See documentation
   for explanation.  There might be more efficient ways to code it.

   @method _spliceRangeAndDetail
   @private
   */
  JGS.GraphDataProviderMultiSeries.prototype._spliceRangeAndDetail = function (rangeDps, detailDps) {

    var splicedDps = [];

    if (rangeDps.length == 0 && detailDps.length == 0) {
      // do nothing, no data
    } else if (detailDps.length == 0) {
      for (var i = 0; i < rangeDps.length; i++) {
        splicedDps.push(rangeDps[i]);
      }
    } else if (rangeDps.length == 0) { //should never happen?
      for (var i = 0; i < detailDps.length; i++) {
        splicedDps.push(detailDps[i]);
      }
    } else {
      var detailStartX = detailDps[0].time;
      var detailEndX = detailDps[detailDps.length - 1].time;

      // Find last data point index in range where-after detail data will be inserted
      var lastRangeIdx = this._findLastRangeIdxBeforeDetailStart(rangeDps, detailStartX);

      //Insert 1st part of range
      if (lastRangeIdx >= 0) {
        splicedDps.push.apply(splicedDps, rangeDps.slice(0, lastRangeIdx + 1));
      }

      //Insert detail
      splicedDps.push.apply(splicedDps, detailDps.slice(0));

      //Insert last part of range
      var startEndRangeIdx = rangeDps.length;
      for (var i = startEndRangeIdx; i >= lastRangeIdx; i--) {
        if (i <= 1 || rangeDps[i - 1].time <= detailEndX) {
          break;
        } else {
          startEndRangeIdx--;
        }
      }

      if (startEndRangeIdx < rangeDps.length) {
        splicedDps.push.apply(splicedDps, rangeDps.slice(startEndRangeIdx, rangeDps.length));
      }

    }

    return splicedDps;
  };

  /**
   Finds last index in the range data set before the first detail data value.  Uses binary search per suggestion
   by Benoit Person (https://github.com/ddr2) in Dygraphs mailing list.

   @method _findLastRangeIdxBeforeDetailStart
   @private
   */
  JGS.GraphDataProviderMultiSeries.prototype._findLastRangeIdxBeforeDetailStart = function (rangeDps, firstDetailTime) {

    var minIndex = 0;
    var maxIndex = rangeDps.length - 1;
    var currentIndex;
    var currentElement;

    // Handle out of range cases
    if (rangeDps.length == 0 || firstDetailTime <= rangeDps[0].time)
      return -1;
    else if (rangeDps[rangeDps.length - 1].time < firstDetailTime)
      return rangeDps.length - 1;

    // Use binary search to find index of data point in range data that occurs immediately before firstDetailTime
    while (minIndex <= maxIndex) {
      currentIndex = Math.floor((minIndex + maxIndex) / 2);
      currentElement = rangeDps[currentIndex];

      if (currentElement.time < firstDetailTime) {
        minIndex = currentIndex + 1;

        //we want previous point, and will not often have an exact match due to different sampling intervals
        if (rangeDps[minIndex].time > firstDetailTime) {
          return currentIndex;
        }
      }
      else if (currentElement.time > firstDetailTime) {
        maxIndex = currentIndex - 1;

        //we want previous point, and will not often have an exact match due to different sampling intervals
        if (rangeDps[maxIndex].time < firstDetailTime) {
          return currentIndex - 1;
        }

      }
      else {
        return currentIndex - 1; //if exact match, we use previous range data point
      }

    }

    return -1;

  };

  /**
   Combines (aka merges) multiple datasets of {x,[min,avg,max]} values into a single dataset with a common x axis. The
   input series do not have to have matching x (time) values. This method will insert nulls where needed to provide a
   format useable by dygraphs even if the time axis does not align between series as it goes through and merges the
   series.

   To better understand things: If there are 3 series, they all have the same number of points, and they all have the same
   x value for each point, then the combined dataset returned by this method will have exactly the same number of points
   as any one of the datasets. However, if one of the series has x values that are never the same as x values in the other
   two series, then combined dataset is going to have a total length  of (EitherOfTheSamesSeries.length +
   DifferentSeries.length) ...the set of all unique x values.


   @method _combineSeries
   @private
   */
   
  JGS.GraphDataProviderMultiSeries.prototype._combineSeries = function (seriesDataHolder) {
    var s = [];
    var unique = [];

    var seriesNames = Object.keys(seriesDataHolder);
    for (var i = 0; i < seriesNames.length; i++) {
      s.push(0);
    }

    while(1) {

      var testrow = [];
      for(var i=0; i < seriesNames.length; i++) {
        if(s[i] < seriesDataHolder[seriesNames[i]].splicedData.length) {
          testrow.push(seriesDataHolder[seriesNames[i]].splicedData[s[i]].time);
        }
      }
      if(testrow.length == 0)
        break;
      var min = Math.min.apply(Math, testrow);
      unique.push(min);

      for(var i=0; i < seriesNames.length; i++) {
        if(s[i] < seriesDataHolder[seriesNames[i]].splicedData.length) {
          if(seriesDataHolder[seriesNames[i]].splicedData[s[i]].time == min) {
            s[i]++
          }
        }
      }
    }

    // make combined dygraph array
    var a = 1;
    var dyDataRows = [];

    for(var i=0; i < s.length; i++) s[i] = 0;

    for(var k=0; k<unique.length; k++){
      // row contains time, min, avg and max
      var row = [unique[k]];
      for(var i=0; i < seriesNames.length; i++) {
        row.push([null,null,null]);
      }

      for(var j=0; j < seriesNames.length; j++) {
        if(s[j] < seriesDataHolder[seriesNames[j]].splicedData.length) {
          if(seriesDataHolder[seriesNames[j]].splicedData[s[j]].time == row[0]) {
            var data = seriesDataHolder[seriesNames[j]].splicedData[s[j]];
            row[j+1] = [data.min, data.avg, data.max];
            s[j]++
          }
        }
      }
      row[0] = moment(row[0]).utc().toDate(); // convert seconds to date string
      dyDataRows.push(row);
    }
    return dyDataRows;
  }


}(window.JGS = window.JGS || {}, jQuery));