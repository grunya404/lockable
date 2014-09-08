/**
 * Created by John on 3/08/2014.
 */
exports.schema = {
    username: String,
    password: String,
    name:{
        first: String,
        last: String
    },
    signupData: {type: Date, default: Date.now}
};

exports.virtuals = {
    'name.full': {
        get: function(req, res) {
            return this.name.first + ' ' + this.name.last;
        }
    }
};
