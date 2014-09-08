/**
 * Created by John on 4/08/2014.
 */

$('.glyphicon-remove-circle').click(function() {
  var $removeButton = $(this);
  var id = $removeButton.data('id');
  $.ajax({
    url: '/removeUser/' + id,
    type: 'POST',
    success: function (response) {
      $removeButton.parent().parent().fadeOut();
    }
  })
});

