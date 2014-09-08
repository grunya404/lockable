/**
 * Created by John on 4/08/2014.
 */

//$('.glyphicon-remove-circle').click(function() {
// use on or delegate for dynamically created HTML
$("#id_LockTable").on("click", ".glyphicon-remove-circle",(function() {
  var $removeButton = $(this);
  var id = $removeButton.data('id');
  $.ajax({
    url: '/removeLock/' + id,
    type: 'POST',
    success: function (response) {
      $removeButton.parent().parent().fadeOut(300, function(){
        $(this).remove();
      });
    }
  });
})
)

//$( "#id_LockTable tbody tr" ).on( "click", function() {
// alert( $( this ).text() );
//});