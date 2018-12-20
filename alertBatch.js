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
        alertErrorBeacon(data.DEVICE_ID, data.UPDATE_TIME, callback);
    }, function(err){
        pool.end();
    })
})

//計算是否超過5分鐘再開啟狀態下未更新
function alertErrorBeacon(deviceId, updateTime, callback){
    
    setTimeout(function(err){
        //計算時間差: 差幾分
        var systemTime = new Date();
        var receiveTime = new Date(updateTime);
        var diff = (systemTime.getTime() - receiveTime.getTime()) / 1000;
        diff /= 60;
        var diffMins = Math.round(diff);
        
        if(diffMins >= 5) {
            console.log(deviceId + " Exceed time");
            // var systemTime = new Date();
            // systemTime.setHours(systemTime.getHours() + 8);
            // var sql = "UPDATE BEACON_RECEIVE_LOG SET FINISH_TIME='" + systemTime.toISOString() + "' WHERE DEVICE_ID='" + deviceId + "'";
            // pool.query(sql, function(err, rows, fileds){
            //     if(err) {
            //         throw err; 
            //     }
            // })  
        }
        callback();
    }, 1000);
  }