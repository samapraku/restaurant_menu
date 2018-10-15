const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DishSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: String
    },
    ingredients: {
        type: String
    }, 
    restaurant: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant',
        required: true
    },
    category: {
        type: String
    }

});


module.exports = mongoose.model("Dish", DishSchema);