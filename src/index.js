const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

require('./app/controllers/index')(app);

app.listen(process.env.PORT || 3000);