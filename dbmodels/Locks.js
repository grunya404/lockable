/**
 * Created by John on 4/08/2014.
 */
exports.schema = {
  name:  String,
  addr:  String,
  lock:  String,
  rssi:  Number,
  time:  Number,
  creationDate: {type: Date, default: Date.now}
};

