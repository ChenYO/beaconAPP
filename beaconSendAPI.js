var mysql = require("mysql");
var async = require("async");
var express = require('express');
var bodyParser = require('body-parser');
var async = require("async");
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var app = express()

var pool = mysql.createPool({
    host: "xxxxxx",
    user: "xxxxxx",
    password: "xxxxxx",
    database: "xxxxxx",
    waitForConnections: true,
    connectionLimit: 10
});

/*
    前端傳入UUID，先檢查ID是否存於BEACON_LIST中
    有: 檢查是否有其他ID狀態=Y，
        有: 回傳Result = False
        無: 回傳Result = True
    無: 新增一筆至Table中，並回傳Result = True
*/
app.post('/checkBeacon', urlencodedParser, function(req, res) {
    var uuid = req.body.uuid;
    var result = {};
    if(uuid){
        
        getBeaconList(uuid, function(err, rows){
            if(err){
                return next(err);
            }
            console.log(rows);
            result["result"] = "fill"
            res.send(result)
        })
     
    }else{
        result["result"] = "false"
        result["message"] = "請輸入UUID"
        res.send(result)
    }
    
    
})

//查詢UUID Table
function getBeaconList(uuid, callback) {
    var sql = "SELECT * FROM BEACON_LIST WHERE uuid = '" + uuid + "'"; 

    pool.query(sql, function(err, rows, fileds){
        if(err) throw err; 
        // log("1 record inserted", systemDate);
        callback(err, rows)
    })  
}

// 監聽
app.listen(10080, function () {
  console.log('success listen...10082');
});





//先查詢員工清單
// var sql = "SELECT * FROM account WHERE account like 'N%' and level<70 and companyID like '1%'" + 
// "and departName like '%B7%' and isResign='0'" 
// pool.query(sql, function(err, rows, fileds){
//   if(err) throw err;        
//   for(var row of rows) {
//     results.push(row)
//   }
//   var index = 0
//   //設定delay
//   //查到資料後每2秒查詢員工詳細資料並儲存
//   async.eachSeries(results, function(data, callback){
//     queryUserAndInsert(data.account, callback);
//   }, function(err){
//     log("Finish", systemDate);
//   })
// })

//查詢基本資料
function queryUserAndInsert(account, callback){
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

  var query = 'sAMAccountName=' + account;
  
  setTimeout(function(err){
    ad.findUsers(query, true, function(err, users) {
      if (err) {
        log("ERROR: Connection Fail.", systemDate);
        // console.log('ERROR: ' +JSON.stringify(err));
        return;
      }
    
      if ((! users) || (users.length == 0)) {
        log("No users found.", systemDate);
      } else {
        // console.log(users[0]);
        var timestamp = new Date(users[0].pwdLastSet/1e4 - 1.16444736e13).toISOString()
        var date = new Date(users[0].pwdLastSet/1e4 - 1.16444736e13).toISOString().substring(0, 10)
        var name = users[0].cn.substring(7, users[0].cn.length)
        //將資料新增至資料庫
        var sql = "INSERT INTO expiredPwdUser (cn, sAMAccountName, mail, pwdLastSet, userAccountControl, timestamp, dateTime) VALUES" +
          "('" + name + "', '" + users[0].sAMAccountName + "', '" + users[0].mail + "', '" + date + "', '" + users[0].userAccountControl + 
          "', '" + timestamp + "', '" + timestamp + "')" +
          " ON DUPLICATE KEY UPDATE cn='" + name + "', mail='" + users[0].mail + "', pwdLastSet='" + date + "'" +
          ", userAccountControl='" + users[0].userAccountControl + "', timestamp='" + timestamp + "', dateTime='" + timestamp + "'";
        pool.query(sql, function(err, rows, fileds){
          if(err) throw err; 
          // log("1 record inserted", systemDate);
          console.log("1 record inserted")
          callback();
        })  
      }
    });
  }, 1000)
}

//紀錄Log
function log(message, timestamp){
  var logSql = "INSERT INTO expiredPwdLog (message, createDate) VALUES" +
  "('" + message +"','" + timestamp + "')";
  pool.query(logSql, function(err, rows, fileds){
    if(err) throw err; 

    pool.end();
  }) 
}
