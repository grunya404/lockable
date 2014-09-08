$.holdReady(true); $.getScript("http://dygraphs.com/dygraph-combined.js", function() {$.holdReady(false);});
$.holdReady(true); $.getScript("https://dl.dropboxusercontent.com/u/32441521/jqxWidgets/jqwidgets/socket.io.js" , function() {$.holdReady(false);});

$(function () {
      var data = [];
      var getData = function(numSeries, numRows, isStacked) {
        var _data = [];
        var g = {};

        for (var j = 0; j < numRows; ++j) {
          _data[j] = [j];
        }
        for (var i = 0; i < numSeries; ++i) {
          var val = 0;
          for (var k = 0; k < numRows; ++k) {
            if (isStacked) {
              val = Math.random();
            } else {
              val += Math.random() - 0.5;
            }
            _data[k][i + 1] = val;
          }
        }
        return _data;
      };

      var makeGraph = function(className, numSeries, numRows, isStacked) {
        var demo = document.getElementById('demo');
        var div = document.createElement('div');
        div.className = className;
        div.style.display = 'inline-block';
        div.style.margin = '4px';
        demo.appendChild(div);

        var labels = ['x'];
        for (var i = 0; i < numSeries; ++i) {
          var label = '' + i;
          label = 's' + '000'.substr(label.length) + label;
          labels[i + 1] = label;
        }
        g = new Dygraph(
            div,
            data = getData(numSeries, numRows, isStacked),
            {
              width: 480,
              height: 320,
              labels: labels.slice(),
              stackedGraph: isStacked,
              showRangeSelector: true,

              highlightCircleSize: 2,
              strokeWidth: 1,
              strokeBorderWidth: isStacked ? null : 1,

              highlightSeriesOpts: {
                strokeWidth: 3,
                strokeBorderWidth: 1,
                highlightCircleSize: 5
              }

            });
        var onclick = function(ev) {
          if (g.isSeriesLocked()) {
            g.clearSelection();
          } else {
            g.setSelection(g.getSelection(), g.getHighlightSeries(), true);
          }
        };
        g.updateOptions({clickCallback: onclick}, true);
        g.setSelection(false, 's005');
        console.log(g);
      };
      //debugger;
      makeGraph("many", 20, 20, false);
      //makeGraph("few", 20, 20, true);
      //makeGraph("many", 20, 20, false);
      //makeGraph("many", 20, 20, true);

      var count = 20;
      window.intervalId = setInterval(function() {
        count++;  // current time
        var row = [];
        row[0] = count;
        for (var i = 0; i < 20; ++i) {
          var val = 0;
          // if (isStacked) {
          val = Math.random();
          // } else {
          //       val += Math.random() - 0.5;
          // }
          row[i + 1] = val;
        }
        data.push(row);
        g.updateOptions( { 'file': data } );
      }, 1000);



      var messages = [];
      var socket = io.connect('http://localhost:3000');
      // var count = 1;
      var _data = [];
      socket.on('message', function (msg) {
        if(msg.message) {
          var inc = msg.message.a;
          var value;
          count++;
          if(count % 5 === 0) {
            // msg.message = {time: msg.message.time, a: msg.message.a, b: {}};
          }

          _data.push( msg.message);  // put value on end of queue
          if(_data.length > 10)
            _data.shift(); // Take first value from queue
          //$('#chartContainer').jqxChart('update');
          //$('#chartContainer1').jqxChart('update');
        }
      });
    }
);
