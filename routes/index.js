const express = require('express');
const http = require('http');
const querystring = require('querystring'); 
const WebSocketServer = require('ws').Server;
const WebSocket = require('ws');

const router = express.Router();

const aimHost ="119.23.254.236";
// const localHost = "127.0.0.1";

let operator = '';
let wsInterval = '';
let wsPermit = false;
let wsTimer = 1;

let machine = {                                   //初始化machine实例
    machineNum: "",            //数据设置成功
    machineStatus: 0,          //数据设置成功

    taskNum: "",               //数据设置成功
    taskComplete: false,       //数据设置成功
    orderNum: "",              //数据设置成功
    workTime: 0,               //数据设置成功

    accuTime: 0,
    coordinate0: 0.0,
    coordinate1: 0.0,
    coordinate2: 0.0,
    coordinate3: 0.0,
    
    pulseWidth: 8,              //数据设置成功
    pulseInterval: 20,          //数据设置成功
    peakCurrent: 16,            //数据设置成功
    openCircuitVoltage: 80,     //数据设置成功
    wireSpeed: 1,               //数据设置成功
    followGap: 0.15,            //数据设置成功
    cutSpeed: 10,               //数据设置成功

    wireBreak: true,
    circuirShort: true,
    fluidFail: true,
    powerFail: true,

    dischargePermit: true,
    feedPermit: true,
    wirePermit: true,
    fluidPermit: true
};

router.get('/', (req, res) => {                   //渲染登录界面
    res.render('index', {});
});

router.post('/login', (req, res) => {             //发送验证登录信息，并重定向到任务界面
    let reqData = {
        name: req.body.username,
        pwd: req.body.password,
        type: 0
    }
    let content = querystring.stringify(reqData);
    let options = {
        host: aimHost,
        port: 3000,
        path: '/api/login',
        method: 'post',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
    }
    let login = http.request(options, (response) => {
        response.setEncoding('utf8'); 
        response.on('data', (data) => {
            // console.log("连接成功");
            let msg = JSON.parse(data);
            // console.log(msg.status);
            // res.send(msg);
            if(msg.status == 'success'){
                operator = msg.name;
                // res.render('task', {name: msg.name});
                res.redirect('/api/task');
            }else{
                res.send('登录失败,请返回重试');
            }
        });
    });
    login.on('error', function (err) {
        console.log('problem with request: ' + err.message);
        res.send("登录服务器连接失败"); 
    });  
    login.write(content);
    login.end();
});

router.get('/task', (req, res) => {               //发送请求机床和订单信息，渲染任务界面
    let options = {
        host: aimHost,
        port: 3000,
        path: '/api/getMachines',
        method: 'get'
    }
    let machines = http.request(options, (response) => {
        response.setEncoding('utf8');
        response.on('data', (data) => {
            let msg = JSON.parse(data);
            let machines = msg[0];
            let orders = msg[1];
            let machineNum = [];
            let machineName = [];
            let orderNum = [];
            for(let machine of machines){
                machineNum.push(machine.num);
                machineName.push(machine.name);
            }
            for(let order of orders){
                orderNum.push(order.num)
            }
            // res.send(machine);
            res.render('task', {machineNum: machineNum, machineName: machineName, orderNum: orderNum, operator: operator});
        });
    });
    machines.on('error', function (err) {
        console.log('problem with request: ' + err.message);
        res.send("机床/订单服务器连接失败"); 
    });
    machines.end();
});

router.post('/sendTask', (req, res) => {          //发送任务信息，重定向到参数界面
    let reqData = req.body;
    let content = querystring.stringify(reqData);
    let options = {
        host: aimHost,
        port: 3000,
        path: '/api/updateTask',
        method: 'post',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
    }
    let task = http.request(options, (response) => {
        response.setEncoding('utf8'); 
        response.on('data', (data) => {
            let msg = JSON.parse(data);
            // console.log(msg.status);
            // res.send(msg);
            if(msg.status == 'success'){
                // machine.machineNum = msg.machineNum;           
                machine.taskNum = msg.taskNum;              //实时数据从此开始更新
                machine.machineStatus = 2;
                wsPermit = true;
                machine.accuTime = 0;
                machine.taskComplete = false;
                // res.render('parameter', {taskName: reqData.taskName});
                res.redirect('/api/parameter');
                // res.send("任务发送成功");
            }else{
                res.send("任务发送失败，请返回重试");
            }
        });
    });
    task.write(content);
    console.log(reqData);
    machine.machineNum = reqData.machine;
    machine.orderNum = reqData.order;
    machine.workTime = reqData.time * 3600;
    task.on('error', function (err) {
        console.log('problem with request: ' + err.message);
        res.send("任务服务器连接失败"); 
    });  
    task.end();
});

router.get('/parameter', (req, res) => {          //渲染参数页面
    res.render('parameter', {});
});

router.post('/sendStatus', (req, res) => {        //发送状态信息
    let reqData = req.body;
    // console.log(reqData);
    machine.machineStatus = reqData.status;
    if(reqData.complete == "true"){
        machine.taskComplete = true;
    }else{
        machine.taskComplete = false;
    }
    if (reqData.status == 4) {
        if (reqData.wireBreak == "false") {
            machine.wireBreak = false;
        } else {
            machine.wireBreak = true;
        }
        if (reqData.circuirShort == "false") {
            machine.circuirShort = false;
        } else {
            machine.circuirShort = true;
        }
        if (reqData.fluidFail == "false") {
            machine.fluidFail = false;
        } else {
            machine.fluidFail = true;
        }
        if (reqData.powerFail == "false") {
            machine.powerFail = false;
        } else {
            machine.powerFail = true;
        }
    }else{
        machine.wireBreak = true;
        machine.circuirShort = true;
        machine.fluidFail = true;
        machine.powerFail = true;
    }
    // console.log(reqData.fluidFail);
    // console.log(machine.fluidFail);
    if(machine.taskComplete){
        res.redirect('/api/task');
    }else{
        res.send("状态更新成功，请返回");
    }
});

router.post('/sendParameter', (req, res) => {     //实时更新本地参数信息
    let reqData = req.body;
    console.log(reqData);
    machine.pulseWidth = reqData.pulseWidth;
    machine.pulseInterval = reqData.pulseInterval;
    machine.peakCurrent = reqData.peakCurrent;
    machine.openCircuitVoltage = reqData.openCircuitVoltage;
    machine.wireSpeed = reqData.wireSpeed;
    machine.followGap = reqData.followGap;
    machine.cutSpeed = reqData.cutSpeed;
    if(reqData.dischargePermit == "true"){
        machine.dischargePermit = true;
    }else{
        machine.dischargePermit = false;
    }
    if(reqData.feedPermit == "true"){
        machine.feedPermit = true;
    }else{
        machine.feedPermit = false;
    }
    if(reqData.wirePermit == "true"){
        machine.wirePermit = true;
    }else{
        machine.wirePermit = false;
    }
    if(reqData.fluidPermit == "true"){
        machine.fluidPermit = true;
    }else{
        machine.fluidPermit = false;
    }
    res.send("参数更新成功，请返回"); 
});

const ws = new WebSocket(`ws://${aimHost}:4000`);   //将本地参数信息，定时发送
ws.onopen = () => {
    console.log('update-serve connected');
    wsInterval = setInterval(() => {
        if(machine.taskComplete){
            machine.machineStatus = 1;
            machine.workTime = machine.workTime;
            ws.send(JSON.stringify(machine));
            wsPermit= false;
        }
        if(wsPermit){
            if(machine.accuTime < machine.workTime){
                machine.accuTime = machine.accuTime + wsTimer;
                machine.coordinate0 = (50 * Math.cos(machine.accuTime * Math.PI / 300)).toFixed(2);
                machine.coordinate1 = (50 * Math.sin(machine.accuTime * Math.PI / 300)).toFixed(2);
                machine.coordinate2 = (50 * Math.cos(machine.accuTime * Math.PI / 300)).toFixed(2);
                machine.coordinate3 = (50 * Math.sin(machine.accuTime * Math.PI / 300)).toFixed(2);
            }else{
                machine.taskComplete = true;
            }
            ws.send(JSON.stringify(machine));
        }
        if(machine.machineStatus == 1 || machine.machineStatus == 3 || machine.machineStatus ==4){
            wsTimer = 0;
        }else{
            wsTimer = 1;
        }
        if(machine.machineStatus == 0){
            wsPermit = false;
        }
    },1000);
}

module.exports = router;