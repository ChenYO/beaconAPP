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

var result = {
    "message": ""
};

/*
    提供前端查詢Beacon清單使用
*/
app.get('/getBeaconList', function(req, res) {
    queryBeaconList(function(queryErr, results) {
        if(queryErr){
            throw queryErr;
        }
        res.send(results);
    })
})

//查詢BeaconList Table取得所有的資料
function queryBeaconList(callback) {
    var sql = "SELECT * FROM BEACON_LIST "; 

    pool.query(sql, function(err, rows, fileds){
        if(err){
            throw err; 
        } 
        callback(err, rows)
    })  
}

/*
    提供前端傳入UUID後，關閉Beacon使用
 */
app.post('/closeBeacon', urlencodedParser, function(req, res) {
    var uuid = req.body.uuid;
    updateBeacon(uuid, "N", function(updateErr, results) {
        if(updateErr){
            throw updateErr;
        }
        res.send(result);
    })
})

/*
    前端傳入UUID，先檢查是否有其他ID狀態=Y
    無: 檢查ID是否存於BEACON_LIST中
        有: 回傳Result = True
        無: 新增一筆至Table中，並回傳Result = True
    無: 回傳已有發射狀態錯誤
*/
app.post('/checkBeacon', urlencodedParser, function(req, res) {
    var uuid = req.body.uuid;
    
    if(uuid){
        
        //先檢查是否有正開啟的beacon: STATUS = Y
        checkStatus(uuid, function(checkStatusError, openList) {
            if(checkStatusError){
                throw checkStatusError;
            }

            
            if(openList.length > 0) {
                result["message"] = "已有Beacon開啟，請再次確認";
                res.send(result);
            }else {
                //檢查此UUID是否存於Table
                getBeaconData(uuid, function(queryErr, rows){
                    if(queryErr){
                        throw queryErr;
                    }
                                    
                    if(rows.length > 0){
                        //若已存在則開啟Beacon
                        updateBeacon(uuid, "Y", function(updateErr, results) {
                            if(updateErr){
                                throw updateErr;
                            }
                            res.send(result);
                        })
                    }else {
                        //若不存在則新增Beacon並設定為開啟
                        insertBeacon(uuid, function(insertErr, results){
                            if(insertErr){
                                throw insertErr;
                            }
                            result["insertId"] = results.insertId
                            res.send(result);
                        })
                    }          
                })
            }
        })    
    }else{
        result["message"] = "請輸入UUID";
        res.send(result);
    }
})

//檢查是否有此uuid以外的Beacon開啟
function checkStatus(uuid, callback) {
    var sql = "SELECT * FROM BEACON_LIST WHERE STATUS = 'Y' and uuid <> '" + uuid + "'"; 
    pool.query(sql, function(err, rows, fileds){
        if(err){
            throw err; 
        } 
 
        callback(err, rows)
    })  
}

//查詢UUID是否存於Table中
function getBeaconData(uuid, callback) {
    var sql = "SELECT * FROM BEACON_LIST WHERE uuid = '" + uuid + "'"; 

    pool.query(sql, function(err, rows, fileds){
        if(err){
            throw err; 
        } 
 
        callback(err, rows)
    })  
}

//新增Beacon資料
function insertBeacon(uuid, callback) {
    var sql = "INSERT INTO BEACON_LIST (UUID, STATUS) VALUES" +
          "('" + uuid + "', 'Y')";
    pool.query(sql, function(err, rows, fileds){
        if(err) {
            throw err; 
        }
        callback(err, rows);
    })  
}

//開啟Beacon: STATUS = Y
function updateBeacon(uuid, status, callback) {
    var sql = "UPDATE BEACON_LIST SET STATUS='" + status + "' WHERE UUID='" + uuid + "'";
    pool.query(sql, function(err, rows, fileds){
    if(err) {
        throw err; 
    }
    callback(err, rows);
    })  
}

// 監聽
app.listen(10080, function () {
  console.log('success listen...10080');
});
