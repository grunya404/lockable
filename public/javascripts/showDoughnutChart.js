/**
 * Created by John on 4/08/2014.
 */
//src="/drawDoughnutChart.js";
//src="/socket.io/socket.io.js"
var dough = $( "#doughnutChart" );
dough.doughnutChart({ value: 20 });   // create
dough.doughnutChart( "addData", { title: "London", value : 100, state: "Open", color: "#F7E248" } ) ;
//dough.doughnutChart( "addData", { title: "Sydney", value : 100, state: "Open", color:"#D7DADB" } ) ;
//dough.doughnutChart( "addData", { title: "Berlin", value : 100, state: "Open", color:"#FFF" } ) ;
//dough.doughnutChart( "addData", { title: "London", value : 100, state: "Open", color:"#F7E248" } ) ;
//dough.doughnutChart( "update" ) ;

vc = centerX;

function addData() {
  dough.doughnutChart( "addData", { title: "London", value : 100, color: "#F7E248" } ) ;
  dough.doughnutChart( "update" ) ;
};
function removeData() {
  dough.doughnutChart( "removeData", 2) ;
  dough.doughnutChart( "update" ) ;
};

function toggleState() {
  dough.doughnutChart( "setState", idx) ;
  //dough.doughnutChart( "update" ) ;
};



/*
var socket = io('http://localhost');
//			var socket = io('192.168.1.5');
socket.on('news', function (data) {
  console.log(data);
  socket.emit('my other event', { my: 'data' });
});

*/