/*!
 * jquery.drawDoughnutChart.js
 * Version: 0.4(Beta)
 * Inspired by Chart.js(http://www.chartjs.org/)
 *
 * Copyright 2014 hiro
 * https://github.com/githiro/drawDoughnutChart
 * Released under the MIT license.
 *
 */

(function($) {  //  Immediately Invoked Function,pass the function jQuery with parameter $:
var data =  [];
var $paths = [];	
var settings = {
        value: 0,
        segmentShowStroke : true,
        segmentStrokeColor : "#0C1013",
        segmentStrokeWidth : 1,
        baseColor: "rgba(0,0,0,0.5)",
        baseOffset: 4,
        edgeOffset : 10,//offset from edge of $this
        percentageInnerCutout : 70,
        animation : false,
        animationSteps : 10,
        animationEasing : "easeInOutExpo",
        animateRotate : false,
        tipOffsetX: -8,
        tipOffsetY: -45,
        showTip: true,
        showLabel: true,
        ratioFont: 1.5,
        shortInt: false,
        tipClass: "doughnutTip",
        summaryClass: "doughnutSummary",
        summaryTitle: "TOTAL:",
        summaryLocked: "Locked or Not",
        summaryTitleClass: "doughnutSummaryTitle",
        summaryNumberClass: "doughnutSummaryNumber",
        summaryLockedClass: "doughnutSummaryLocked",
		
        beforeDraw: function() {  },
        afterDrawed : function() {  },
        onPathEnter : function(e,data) {  },
        onPathLeave : function(e,data) {  }
    };
	
var stateColor = {
		open:  		"#2C3E50" ,
		locked:  	"#FC4349" ,
		calibrate:  "#F7E248" 
	};

var doughnutRadius;
var cutoutRadius;

var $pathGroup;
var $svg ;
var $tip;
var $summaryTitle;
var $summaryNumber;
var segmentTotal = 0;
var W, H ;
var $this;

$.widget( "nmk.doughnutChart", {

    _create: function() {
		this.element.addClass("progressbar");
		$this = this.element;
		W = $this.width();
		H = $this.height();
			
		centerX = W/2;
		centerY = H/2;
		
		var	cos = Math.cos,
			sin = Math.sin,
			PI = Math.PI,
		animationOptions = {
			linear : function (t) {
			return t;
        	},
        	easeInOutExpo: function (t) {
				var v = t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t;
				return (v>1) ? 1 : v;
        	}
      	},
       requestAnimFrame = function() {
        return window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame ||
          function(callback) {
            window.setTimeout(callback, 1000 / 60);
          };
       }();
		 
		//settings.beforeDraw.call($this);
		
		//data =  [{ title: "Auckland",     value : 100,  color: "#F7E248" }];
		//data[data.length] =  { title: "Wellington",   value : 100,  color: "#6DBCDB" };
		//data.splice(data.length-1,1);  // remove one
				
		// SVG Elements		
		$svg = $('<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' '
		       + H + '" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>')
			   .appendTo($this);

		doughnutRadius = Min([H / 2,W / 2]) - settings.edgeOffset;
		cutoutRadius = doughnutRadius * (settings.percentageInnerCutout / 100);
			
		//Draw base doughnut
		var baseDoughnutRadius = doughnutRadius + settings.baseOffset,
			baseCutoutRadius = cutoutRadius - settings.baseOffset;
			
		$(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
		  .attr({
			"d": getHollowCirclePath(baseDoughnutRadius, baseCutoutRadius),
			"fill": settings.baseColor
		  })
		  .appendTo($svg);
		  
		//Set up pie segments wrapper
		$pathGroup = $(document.createElementNS('http://www.w3.org/2000/svg', 'g'));
		$pathGroup.attr({opacity: 0}).appendTo($svg);

		//Set up tooltip
		if (settings.showTip) {
		  $tip = $('<div class="' + settings.tipClass + '" />').appendTo('body').hide();
		}

		//Set up center text area
		var summarySize = (cutoutRadius - (doughnutRadius - cutoutRadius)) * 2,
			$summary = $('<div class="' + settings.summaryClass + '" />')
					   .appendTo($this)
					   .css({
						 width: summarySize + "px",
						 height: summarySize + "px",
						 "margin-left": -(summarySize / 2) + "px",
						 "margin-top": -(summarySize / 2) + "px"
					   });
		$summaryTitle = $('<p class="' + settings.summaryTitleClass + '">' + settings.summaryTitle + '</p>').appendTo($summary);
		$summaryTitle.css('font-size',  getScaleFontSize( $summaryTitle, settings.summaryTitle )); // In most of case useless
		$summaryNumber = $('<p class="' + settings.summaryNumberClass + '"></p>').appendTo($summary).css({opacity: 1});
		$summaryLocked = $('<p class="' + settings.summaryLockedClass + '"></p>').appendTo($summary).css({opacity: 1});
					
    },   // End _create()

    // Create a public method.
    value: function( value ) { 
        if ( value === undefined ) { // No value passed, act as a getter. 
            return settings.value;
         } else {   // Value passed, act as a setter.
             settings.value = this._constrain( value );
            var progress = settings.value + "%";
         }
     },
 
    // Add a segment
    addData: function( value ) { 
        if ( value === undefined ) { // No value passed, act as a getter. 
            return data.length;
         } else {   // Value passed, act as a setter.
		 		data[data.length] =  value;
         }
     },

    // Remove a segment.
    removeData: function( index ) { 
        if ( index === undefined ) { // No value passed, act as a getter. 
            return data.length;
         } else {   // Value passed, act as a setter.
		 	if(index < data.length && index > -1) {
    			data.splice(index, 1);
		 	}
         }
     },

    // SetState of a segment.
    setState: function( index ) { 
		//col = $("svg").find("path:nth-child(2)").attr( "fill", "Red");
        if ( index === undefined ) { // No value passed, act as a getter. 
            return data.length;
         } else {   // Value passed, act as a setter.
		 	if(index < data.length && index > -1) {
				if(data[index].state == "Open") {
					data[index].state = "Locked"
		 		} else {
					data[index].state = "Open"	
		 		}
				drawPieSegments(1);
		 	}
         }
     },

	
    _setOption: function( key, value ) {
        settings[ key ] = value;
        this._update();
    },
 
    update: function() {
		drawPieSegments(1);
    },
	
	
    destroy: function() {
        this.element
            .removeClass( "progressbar" )
            .text( "" );
 
        // Call the base destroy function.
        $.Widget.prototype.destroy.call( this );
    },
	

  });        // <-- End call to $.widget().
  
  
  	// Local functions   
  	function pathMouseEnter(e) {
      var order = $(this).data().order;
      if (settings.showTip) {
        $tip.text(data[order].title + ": " + data[order].state)
            .fadeIn(200);
      }
      if(settings.showLabel) {
					$summaryTitle.text(data[order].title).css('font-size', getScaleFontSize( $summaryTitle, data[order].title));
          var tmpNumber = settings.shortInt ? shortKInt(data[order].value) : data[order].value;
					$summaryNumber.html(tmpNumber).css('font-size', getScaleFontSize( $summaryNumber, tmpNumber));
					$summaryLocked.text(data[order].state).css('font-size', getScaleFontSize( $summaryLocked, data[order].state));
	  }
      settings.onPathEnter.apply($(this),[e,data]);
   	};
 
   	function pathMouseLeave (e) {
      if (settings.showTip) $tip.hide();
      if(settings.showLabel) {
		  $summaryTitle.text(settings.summaryTitle).css('font-size', getScaleFontSize( $summaryTitle, settings.summaryTitle));
          var tmpNumber = settings.shortInt ? shortKInt(segmentTotal) : segmentTotal;
		  $summaryNumber.html(tmpNumber).css('font-size', getScaleFontSize( $summaryNumber, tmpNumber));
		  $summaryLocked.text(settings.summaryLocked).css('font-size', getScaleFontSize( $summaryLocked, settings.summaryLocked));
	  }
      settings.onPathLeave.apply($(this),[e,data]);
   	};
	
   	function pathMouseMove (e) {
      if (settings.showTip) {
        $tip.css({
          top: e.pageY + settings.tipOffsetY,
          left: e.pageX - $tip.width() / 2 + settings.tipOffsetX
        });
      }
   	};
	
	function pathClick (e){
		var order = $(this).data().order;
	  	if (typeof data[order].action != "undefined")
		  data[order].action();
	};
  
    function drawPieSegments(animationDecimal) {
		segmentTotal = 0;
		
		//var len = $("svg").find("path").length;
		$("svg").find("path").remove();
		$paths = [];
		
		for (var i = 0, len = data.length; i < len; i++) {
		  segmentTotal += data[i].value;
		  if(data[i].state == "open" || data[i].state == "Open") {
					data[i].color = "Red"
		  } else {
					data[i].color = "Green"
		  }

		  $paths[i] = $(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
			.attr({
			  "stroke-width": settings.segmentStrokeWidth,
			  "stroke": settings.segmentStrokeColor,
			  "fill": data[i].color,
			  "data-order": i
			})
			.appendTo($pathGroup)
			.on("mouseenter", pathMouseEnter)
			.on("mouseleave", pathMouseLeave)
			.on("mousemove", pathMouseMove)
			.on("click", pathClick);
		}
		
		// var startRadius = -PI / 2,//-90 degree
		var startRadius = 3 * Math.PI / 4,//+135 degree
		// var startRadius = 0,//-90 degree
          rotateAnimation = 1;
      if (settings.animation && settings.animateRotate) rotateAnimation = animationDecimal;//count up between0~1

      drawDoughnutText(animationDecimal, segmentTotal);

      $pathGroup.attr("opacity", animationDecimal);

      for (var i = 0, len = data.length; i < len; i++) {
        var segmentAngle = rotateAnimation * ((data[i].value / segmentTotal) * (Math.PI * 1.5)),
            endRadius = startRadius + segmentAngle,
            largeArc = ((endRadius - startRadius) % (Math.PI * 2)) > Math.PI ? 1 : 0,
            startX = centerX + Math.cos(startRadius) * doughnutRadius,
            startY = centerY + Math.sin(startRadius) * doughnutRadius,
            endX2 = centerX + Math.cos(startRadius) * cutoutRadius,
            endY2 = centerY + Math.sin(startRadius) * cutoutRadius,
            endX = centerX + Math.cos(endRadius) * doughnutRadius,
            endY = centerY + Math.sin(endRadius) * doughnutRadius,
            startX2 = centerX + Math.cos(endRadius) * cutoutRadius,
            startY2 = centerY + Math.sin(endRadius) * cutoutRadius;
        var cmd = [
          'M', startX, startY,//Move pointer
          'A', doughnutRadius, doughnutRadius, 0, largeArc, 1, endX, endY,//Draw outer arc path
          'L', startX2, startY2,//Draw line path(this line connects outer and innner arc paths)
          'A', cutoutRadius, cutoutRadius, 0, largeArc, 0, endX2, endY2,//Draw inner arc path
          'Z'//Cloth path
        ];
        $paths[i].attr("d", cmd.join(' '));
        startRadius += segmentAngle;
      }
    };

	function getHollowCirclePath(doughnutRadius, cutoutRadius) {
		//Calculate values for the path.
		//We needn't calculate startRadius, segmentAngle and endRadius, because base doughnut doesn't animate.
		var startRadius = -1.570,// -Math.PI/2
			segmentAngle = 6.2831,// 1 * ((99.9999/100) * (PI*2)),
			endRadius = 4.7131,// startRadius + segmentAngle
			startX = centerX + Math.cos(startRadius) * doughnutRadius,
			startY = centerY + Math.sin(startRadius) * doughnutRadius,
			endX2 = centerX + Math.cos(startRadius) * cutoutRadius,
			endY2 = centerY + Math.sin(startRadius) * cutoutRadius,
			endX = centerX + Math.cos(endRadius) * doughnutRadius,
			endY = centerY + Math.sin(endRadius) * doughnutRadius,
			startX2 = centerX + Math.cos(endRadius) * cutoutRadius,
			startY2 = centerY + Math.sin(endRadius) * cutoutRadius;
		var cmd = [
		  'M', startX, startY,
		  'A', doughnutRadius, doughnutRadius, 0, 1, 1, endX, endY,//Draw outer circle
		  'Z',//Close path
		  'M', startX2, startY2,//Move pointer
		  'A', cutoutRadius, cutoutRadius, 0, 1, 0, endX2, endY2,//Draw inner circle
		  'Z'
		];
		cmd = cmd.join(' ');
		return cmd;
	};
	
    function drawDoughnutText(animationDecimal, segTotal) {
      $summaryNumber
        .css({opacity: animationDecimal})
        .text((segTotal * animationDecimal).toFixed(1));
	  var tmpNumber = settings.shortInt ? shortKInt(segTotal) : segTotal;
	  $summaryNumber.html(tmpNumber).css('font-size', getScaleFontSize( $summaryNumber, tmpNumber));
    };
    
 	function getScaleFontSize (block, newText) {
		block.css('font-size', '');
        newText = newText.toString().replace(/(<([^>]+)>)/ig,"");
		var newFontSize = block.width() / newText.length * settings.ratioFont;
		// Not very good : http://stephensite.net/WordPressSS/2008/02/19/how-to-calculate-the-character-width-accross-fonts-and-points/
		// But best quick way the 1.5 number is to affinate in function of the police
		var maxCharForDefaultFont = block.width() - newText.length * block.css('font-size').replace(/px/, '') / settings.ratioFont;
		if(maxCharForDefaultFont<0)
			return newFontSize+'px';
		else
			return '';
	};
	
    function Max(arr) {
      return Math.max.apply(null, arr);
    };
	
     function Min(arr) {
      return Math.min.apply(null, arr);
    };
	
     function isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    };
	
    function  CapValue(valueToCap, maxValue, minValue) {
      if (isNumber(maxValue) && valueToCap > maxValue) return maxValue;
      if (isNumber(minValue) && valueToCap < minValue) return minValue;
      return valueToCap;
    };
	
     function shortKInt(int) {
		int = int.toString();
		var strlen = int.length;
		if(strlen<5)
			return int;
		if(strlen<8)
			return '<span title="' +  int +  '">' + int.substring(0, strlen-3) + 'K</span>';
		return '<span title="' + int  + '">' + int.substring( 0, strlen-6) + 'M</span>';
	};
  

})(jQuery);  // <-- End anonymous function and call it with the jQuery object.

// cool stuff
//col = $("svg").find("path:nth-child(2)").attr( "fill", "Red");
