var mysql = require("mysql");
var async = require("async");

var pool = mysql.createPool({
    host: "x",
    user: "x",
    password: "x",
    database: "x",
    waitForConnections: true,
    connectionLimit: 10
});

var sql = "SELECT * FROM BEACON_RECEIVE_LOG WHERE FINISH_TIME = ''";
pool.query(sql, function(err, rows, fileds){
    if(err) {
        throw err; 
    }
    async.eachSeries(rows, function(data, callback){
        console.log(data)
        alertErrorBeacon(data.UPDATE_TIME, callback);
    }, function(err){
        pool.end();
    })
})

function alertErrorBeacon(updateTime, callback){
    var systemTime = new Date().toISOString();

    setTimeout(function(err){
        callback();
    }, 1000);
  }