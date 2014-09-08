/**
 * Created by John on 5/08/2014.
 */
window.onload = function() {

  var messages = [];
  var socket = io.connect('http://localhost:3000');
  var field = document.getElementById("field");
  var sendButton =  document.getElementById("send");
  var name = document.getElementById("name");

  socket.on('message', function (data) {
    if(data.message) {
      messages.push(data);
      if(data.username === 'serialport') {
        var row = $("#" + data.message._id);
        if (row.length) {  // if > 0 then exists so update row
          var td_id = row.children("td:nth-child(1)");
          var td_name = row.children("td:nth-child(2)");
          var td_addr = row.children("td:nth-child(3)");
          var td_lock = row.children("td:nth-child(4)");
          var td_rssi = row.children("td:nth-child(5)");
          td_id.text(data.message._id);
          td_name.text(data.message.name);
          td_addr.text(data.message.addr);
          td_lock.text(data.message.lock);
          td_rssi.text(data.message.rssi);
        }
        else { // add row
          var table = $("#id_LockTable");
          $("#id_LockTable tbody")
            .append( "<tr id = \"" + data.message._id + "\">"
                + "<td>" + data.message._id + "</td>"
                + "<td>" + data.message.name + "</td>"
                + "<td>" + data.message.addr + "</td>"
                + "<td>" + data.message.lock + "</td>"
                + "<td>" + data.message.rssi + "</td>"
                + "<td>"
                + "<span data-id=\"" + data.message._id + "\""
                + "class=\"glyphicon glyphicon-remove-circle\"></span>" + "</td>"
                + "</tr>" );
        }


        // add to table2
        $("#time").text(data.message.time);
        $("#name").text(data.message.name);
        $("#rssi").text(data.message.rssi);
        $("#lock").text(data.message.lock);
        $("#addr").text(data.message.addr);
        // The typeof operator doesn't
        // throw a ReferenceError exception with an undeclared variable.
        if (typeof dough !== 'undefined') {
          dough.doughnutChart( "addData", { title: 'test', value : 100,
            state: 'state', color: "#F7E248" } ) ;
          dough.doughnutChart( "update" ) ;
        }
      }

      // add to text window
      var content = document.getElementById("content");
      if (content) {
        var html = '';
        for (var i = 0; i < messages.length; i++) {
          html += '<b>' + (messages[i].username ? messages[i].username : 'Server') + ': </b>';
          html += messages[i].message + '<br />';
        }
        content.innerHTML = html;
      }
    } else {
      console.log("There is a problem:", data);
    }
  });
  if(sendButton) {
    sendButton.onclick = function() {
      if (name.value == "") {
        alert("Please type your name!");
      } else {
        var text = field.value;
        socket.emit('send', { message: text, username: name.value });
      }
    }
  };

}
