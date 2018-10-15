const mongoose = require("mongoose");
const Schema = mongoose.Schema;


var Dishes = require('./Dish').schema;

const RestaurantSchema = new Schema({
    created:  {type: Date, default: Date.now},
    name:{
        type: String,
        required: true
    },
    address: {
        type: String
    },
    phone: {
        type: String
    },
    url: {
        type: String,
    },
    email: {
        type: String,
    },
    logo: {
        type: String,
    }
//    dish_list: [Dishes]

});


module.exports = mongoose.model("Restaurant", RestaurantSchema);