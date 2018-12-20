var mysql = require("mysql");
var express = require('express');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var app = express();

var pool = mysql.createPool({
    host: "x",
    user: "x",
    password: "x",
    database: "x",
    waitForConnections: true,
    connectionLimit: 10
});

var result = {
    "message": "",
    "insertId": "",
    "beaconId": ""
};

/*
    提供前端查詢Beacon清單使用
*/
app.get('/getBeaconList', function(req, res) {
    clearResult();
    queryBeaconList(function(queryErr, results) {
        if(queryErr){
            throw queryErr;
        }
        res.send(results);
    })
})

/*
    提供前端不斷傳入Beacon訊號
    所需參數: 
        deviceId
        password
        status: 
            ON: 依照deviceId新增第一筆Start_Time，若已有記錄則更新Update_Time
            OFF: 需輸入密碼後，關閉Beacon使用，更新Finish_Time
    
 */
app.post('/receiveBeacon', urlencodedParser, function(req, res) {
    clearResult();
    var uuid = req.body.uuid;
    var deviceId = req.body.deviceId;
    var password = req.body.password;
    var status = req.body.status;

    if(status == "ON"){
        queryReceiveDB(deviceId, function(queryErr, results){
            if(queryErr){
                throw queryErr;
            }
            if(results.length > 0){
                //必然只會有一筆裝置開啟
                var aid = results[0].AID;
                updateReceiveDB(deviceId, aid, function(updateErr, results){
                    if(updateErr){
                        throw updateErr;
                    }
                    getBeaconData(uuid, function(queryErr, rows){
                        if(queryErr){
                            throw queryErr;
                        }
                        
                        if(rows.length > 0){
                            var beaconId = rows[0].AID;
                            result["beaconId"] = beaconId;
                        }
                        result["message"] = "OPEN";
                        res.send(result);
                    })
                    
                });
            }else{
                insertReceiveDB(uuid, deviceId, function(insertErr, results){
                    if(insertErr){
                        throw insertErr;
                    }
                    getBeaconData(uuid, function(queryErr, rows){
                        if(queryErr){
                            throw queryErr;
                        }
                        
                        if(rows.length > 0){
                            var beaconId = rows[0].AID;
                            result["beaconId"] = beaconId;
                        }
                        result["message"] = "OPEN";
                        res.send(result);
                    })
                });
            }
        })
    }else if(status == "OFF"){
        checkBeaconPW(password, function(queryErr, results) {
            if(queryErr){
                throw queryErr;
            }
            if(results.length > 0) {
                finishReceiveDB(deviceId, function(updateErr, results) {
                    if(updateErr){
                        throw updateErr;
                    }
                    result["message"] = "CLOSE";
                    res.send(result);
                })
            }else {
                result["message"] = "非權限者，不可關閉Beacon";
                res.send(result);
            }
        })
    }else {
        result["message"] = "請輸入狀態參數";
        res.send(result);
    }  
})

/*
    前端傳入UUID
    status = ON:
        先檢查是否有其他ID狀態=Y
        無: 檢查ID是否存於BEACON_LIST中
            有: 回傳Result = True
            無: 新增一筆至Table中，並回傳Result = True
        有: 回傳已有發射狀態錯誤
    status = OFF:
        關閉beacon使用，查詢輸入的密碼是否正確
*/
app.post('/checkBeacon', urlencodedParser, function(req, res) {
    var uuid = req.body.uuid;
    var password = req.body.password;
    var status = req.body.status;
    clearResult();

    if(uuid){
        if(status == "ON"){
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
                                result["message"] = "OPEN";
                                res.send(result);
                            })
                        }else {
                            //若不存在則新增Beacon並設定為開啟
                            insertBeacon(uuid, function(insertErr, results){
                                if(insertErr){
                                    throw insertErr;
                                }
                                result["message"] = "OPEN";
                                result["insertId"] = results.insertId;
                                res.send(result);
                            })
                        }          
                    })
                }
            })    
        }else if(status == "OFF"){
            checkBeaconPW(password, function(queryErr, results) {
                if(queryErr){
                    throw queryErr;
                }
                if(results.length > 0) {
                    updateBeacon(uuid, "N", function(updateErr, results) {
                        if(updateErr){
                            throw updateErr;
                        }
                        result["message"] = "CLOSE";
                        res.send(result);
                    })
                }else {
                    result["message"] = "非權限者，不可關閉Beacon";
                    res.send(result);
                }
            })
        }else {
            result["message"] = "請輸入狀態參數";
            res.send(result);
        }   
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
 
        callback(err, rows);
    })  
}

//查詢UUID是否存於Table中
function getBeaconData(uuid, callback) {
    var sql = "SELECT * FROM BEACON_LIST WHERE uuid = '" + uuid + "'"; 

    pool.query(sql, function(err, rows, fileds){
        if(err){
            throw err; 
        } 
 
        callback(err, rows);
    })  
}

//查詢BeaconList Table取得所有的資料
function queryBeaconList(callback) {
    var sql = "SELECT * FROM BEACON_LIST "; 

    pool.query(sql, function(err, rows, fileds){
        if(err){
            throw err; 
        } 
        callback(err, rows);
    })  
}

//要關閉Beacon時，需要輸入密碼: 查詢Beacon密碼
function checkBeaconPW(password, callback) {
    var sql = "SELECT * FROM BEACON_PASSWORD WHERE PASSWORD = '" + password + "'"; 
    pool.query(sql, function(err, rows, fileds){
        if(err){
            throw err; 
        } 
 
        callback(err, rows);
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

//以裝置代號查詢receiveDB，查詢是否此裝置正開啟
function queryReceiveDB(deviceId, callback) {
    var sql = "SELECT * FROM BEACON_RECEIVE_LOG WHERE DEVICE_ID = '" + deviceId + "' AND FINISH_TIME = ''"
    pool.query(sql, function(err, rows, fileds){
        if(err) {
            throw err; 
        }
        callback(err, rows);
    })  
}

//接收beacon訊號，第一次開啟更新start_time，之後更新update_time
function insertReceiveDB(uuid, deviceId, callback) {
    //使用ISOString國際時間會與台灣相差8小時，須補加回來
    var systemTime = new Date();
    systemTime.setHours(systemTime.getHours() + 8);
    var sql = "INSERT INTO BEACON_RECEIVE_LOG (UUID, DEVICE_ID, START_TIME, UPDATE_TIME, FINISH_TIME) VALUES" +
    "('" + uuid + "', '" + deviceId + "', '" + systemTime.toISOString() + "', '', '')";
    pool.query(sql, function(insertErr, rows, fileds){
        if(insertErr){
           throw insertErr; 
        }
        callback(insertErr, rows);
    })  
}

//更新receiveDB update_time
function updateReceiveDB(deviceId, aid, callback) {
    var systemTime = new Date();
    systemTime.setHours(systemTime.getHours() + 8);
    var sql = "UPDATE BEACON_RECEIVE_LOG SET UPDATE_TIME='" + systemTime.toISOString() + 
        "' WHERE DEVICE_ID='" + deviceId + "' AND AID='" + aid + "'";
    pool.query(sql, function(err, rows, fileds){
        if(err) {
            throw err; 
        }
        callback(err, rows);
    })  
}

//關閉接收: 更新receiveDB finish_time
function finishReceiveDB(deviceId, callback) {
    var systemTime = new Date();
    systemTime.setHours(systemTime.getHours() + 8);
    var sql = "UPDATE BEACON_RECEIVE_LOG SET FINISH_TIME='" + systemTime.toISOString() + "' WHERE DEVICE_ID='" + deviceId + "'";
    pool.query(sql, function(err, rows, fileds){
    if(err) {
        throw err; 
    }
    callback(err, rows);
    })  
}

//清除結果資料
function clearResult(){
    result["message"] = "";
    result["insertId"] = "";
    result["beaconId"] = "";
}

// 監聽
app.listen(10080, function () {
  console.log('success listen...10080');
});
