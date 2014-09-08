function random(name) {

	var value = 0,
	values = [],
	i = 0,
	last;
	return context.metric(function(start, stop, step, callback){	
		//d3.json("data/" + name + ".json", function(original_rows) {
		//	var len = stop-start;
		//	var count = len/step;
		//});
		start = +start; stop = +stop;
		var detailDataLoadReq = {
			seriesName: 'Series-A',
			reqType: "detail",
			reqNum: 1,
			startDateTm: moment(start).utc().toDate(),
			endDateTm: moment(stop).utc().toDate(),
			numIntervals: (stop-start)/step,
			includeMinMax: true
		};
		$.ajax({
					type: 'POST',
					data: JSON.stringify({'req': detailDataLoadReq}),
					contentType: 'application/json',
					url: 'http://localhost:3000/dygraph',
					success: function(data) {
						var values = [];
						var idx = 0;
						if(data.res.dataPoints.length > 0) {
							for(var t = start; t<stop; t+=step ) {
								if(data.res.dataPoints[idx][0] > t)   // [time,value] pairs
									values.push(data.res.dataPoints[idx][1]);
								while(data.res.dataPoints[idx][0] <= t) {
									values.push(data.res.dataPoints[idx][1]);		
									if(idx >= data.res.dataPoints.length-1)
										break;
									idx++;
								}
							}
							callback(null, values);
						}
					}
		 })
	}, name);
}

 
var context = cubism.context()
		.serverDelay(0)
		.clientDelay(0)
		.step(10e3)
		.size(960);
		//.stop();

var foo = random("foo"),
		bar = random("bar");

d3.select("#example1").call(function(div) {
	
	div.append("div")
		.attr("class", "axis")
		.call(context.axis().orient("top"));
	
	div.selectAll(".horizon")
		.data([foo, bar, foo.add(bar), foo.multiply(bar)])
		.enter().append("div")
		.attr("class", "horizon")
		.call(context.horizon().extent([000, 2800]));
	
	div.append("div")
		.attr("class", "rule")
		.call(context.rule());
	
}
													 );

d3.select("#example2a").call(function(div) {
	div.datum(foo);
	
	div.append("div")
		.attr("class", "horizon")
		.call(context.horizon()
					.height(120)
					.mode("mirror")
					.colors(["#bdd7e7","#bae4b3"])
					.title("Area (120px)")
					.extent([-10, 10]));
	
	div.append("div")
		.attr("class", "horizon")
		.call(context.horizon()
					.height(30)
					.mode("mirror")
					.colors(["#bdd7e7","#bae4b3"])
					.title("Area (30px)")
					.extent([-10, 10]));
}
														);

d3.select("#example2b").call(function(div) {
	div.datum(foo);
	
	div.append("div")
		.attr("class", "horizon")
		.call(context.horizon()
					.height(120)
					.colors(["#bdd7e7","#bae4b3"])
					.title("Horizon, 1-band (120px)")
					.extent([-10, 10]));
	
	div.append("div")
		.attr("class", "horizon")
		.call(context.horizon()
					.height(60)
					.colors(["#6baed6","#bdd7e7","#bae4b3","#74c476"])
					.title("Horizon, 2-band (60px)")
					.extent([-10, 10]));
	
	div.append("div")
		.attr("class", "horizon")
		.call(context.horizon()
					.height(40)
					.colors(["#3182bd","#6baed6","#bdd7e7","#bae4b3","#74c476","#31a354"])
					.title("Horizon, 3-band (40px)")
					.extent([-10, 10]));
	
	div.append("div")
		.attr("class", "horizon")
		.call(context.horizon()
					.height(30)
					.colors(["#08519c","#3182bd","#6baed6","#bdd7e7","#bae4b3","#74c476","#31a354","#006d2c"])
					.title("Horizon, 4-band (30px)")
					.extent([-10, 10]));
	
}
														);

// On mousemove, reposition the chart values to match the rule.
context.on("focus", function(i) {
	d3.selectAll(".value").style("right", i == null ? null : context.size() - i + "px");
});
