// ----------------------------------------------------------------------------
// 仓库封装类
function SiloHouse(obj) {
    this.name = obj.name;
    this.obj = obj;
    obj.siloHouse = this;
    this.height = obj.size[1];

    this.roof = obj.findSubObjects('gaizi')[0]; 
    this.roof.initPos = this.roof.position; // 保存盖子的初始位置

    this.temper = this.humi = this.power = this.store = "";    
    this.info = null;

    this.heatMap = null;
    this.panel = null;
    this.ui = null;
    this.setupEvents();   
    this.simulateData();
}
// 几个粮仓的静态变量
SiloHouse.current = null;       // 正在选中的粮仓
SiloHouse.currentOpen = null;   // 正在打开的粮仓
SiloHouse.summeryPanel = null;  // 注意统计信息只有一个面板，是静态变量

// 选择
SiloHouse.prototype.select = function() {
    this.obj.style.outlineColor = 0x0000FF;
    this.showSummery(true);
}

SiloHouse.prototype.unselect = function() {
    this.obj.style.outlineColor = null;
    this.showSummery(false);
}

// 屋顶
SiloHouse.prototype.openRoof = function() {
    var pos = this.roof.position; 
    pos[1] += 80;
    this.roof.moveTo({'position': pos, 'time': 300}); 
}

SiloHouse.prototype.resetRoof = function() {
    var pos = this.roof.initPos;
    this.roof.moveTo({'position': pos, 'time': 300});
    this.destroyHeatmap(); // 关闭房顶要确认云图删除
}

// 事件
SiloHouse.prototype.setupEvents = function(obj) {
    var that = this;
    var obj = this.obj;

    // 单击
    obj.on('singleclick', function() {
        if (SiloHouse.current)
            SiloHouse.current.unselect();
        SiloHouse.current = that;
        SiloHouse.current.select();
    });

    // 双击
    obj.on('dblclick', function() {
        if (SiloHouse.currentOpen == that)
            return;
        
        // 取消选中的
        if (SiloHouse.current) {
            SiloHouse.current.unselect();
            SiloHouse.current = null;
        }
        
        // 取消上一次打开的
        if (SiloHouse.currentOpen)
            SiloHouse.currentOpen.resetRoof();
        SiloHouse.currentOpen = that;

        // 打开屋顶
        that.openRoof();
        
        // 摄影机跳转
        var pos = SiloHouse.currentOpen.obj.position;
        app.camera.flyTo({//飞到
            position: [pos[0], pos[1] + 70, pos[2] - 30],
            target: pos,
            time: 1000,	// 耗时毫秒
            complete: function () {
                if (toolBar.data.cloud == true)
                    SiloHouse.currentOpen.createHeatmap();
            }
        });
    });	        
}

// 模拟数据
SiloHouse.prototype.simulateData = function(obj) {
    var that = this;
    this.info = {
        "基本信息": {
            "品种": Math.ceil(Math.random() * 2) == 1 ? "小麦" : "玉米",
            "库存数量": Math.ceil(Math.random() * 9000) + "",
            "报关员": Math.ceil(Math.random() * 2) == 1 ? "张三" : "李四",
            "入库时间": Math.ceil(Math.random() * 2) == 1 ? "11:24" : "19:02",
            "用电量": Math.ceil(Math.random() * 100) + "",
            "单仓核算": "无"
        },
        "粮情信息": {
            "仓房温度": Math.ceil(Math.random() * 27 + 25) + "",
            "粮食温度": Math.ceil(Math.random() * 25 + 20) + "",
        },
        "报警信息": {
            "火灾": "无",
            "虫害": "无"
        }
    };

    // 模拟间隔刷新的数据
    var simuTime = Math.ceil(1000 + Math.random() * 1000);
    setInterval(function() {
        that.temper = Math.ceil(20 + Math.random() * 10) + "℃"; // 温度
        that.humi = Math.ceil(30 + Math.random() * 10) + "%"; // 湿度
        that.power = Math.ceil(Math.random() * 20) + "KW/h"; // 能耗
    }, simuTime);
    
}

// 头顶界面
SiloHouse.prototype.createUI = function(width) {
    width = width || 110;

    // 创建widget (动态绑定数据用)
    var panel = THING.widget.Panel({
        cornerType: 's2c3',
        width: width.toString() + "px",
        isClose: false,
        opacity: 0.8,
        media: true
    });
    this.panel = panel;

    // 创建obj ui (跟随物体用)
    var ui = app.create({
        type: 'UI',
        parent: this.obj,
        el: panel.domElement,
        offset: [0, this.height, 0],
        pivot: [0, 3]
    });
    this.ui = ui;
    return panel;
}

SiloHouse.prototype.showUI = function(uiName, boolValue) {
    if (this.panel || this.ui)
        this.hideUI();

    if (boolValue) {
        if (uiName == 'number') {
            this.createUI(70).add(this.obj, 'name').name('');
        } else if (uiName == 'temper') {
            this.createUI().add(this, uiName).name('温度');
        } else if (uiName == 'humi') {
            this.createUI().add(this, uiName).name('湿度');
        } else if (uiName == 'power') {
            this.createUI(150).add(this, uiName).name('能耗');
        }
    }
}

SiloHouse.prototype.hideUI = function() {
    if (this.panel) {
        this.panel.destroy();
        this.panel = null;
    }
    if (this.ui) {
        this.ui.destroy();
        this.ui = null;
    }
}

// 云图相关
SiloHouse.prototype.createHeatmap = function() {
    this.heatMap = app.create({
        type: "Heatmap",
        width: this.obj.size[0],
        height: this.obj.size[2],
        canvasWidth: 400,
        canvasHeight: 300,
        minValue: 15,
        maxValue: 45,
        scale: 1,
        radius: 25,
        blur: 50,
    });   
    this.heatMap.randomData();

    this.heatMap.position = this.obj.position;
    this.heatMap.moveY(this.obj.size[1] + 1);
}

SiloHouse.prototype.destroyHeatmap = function() {
    if (!this.heatMap)
        return;
    this.heatMap.destroy();
    this.heatMap = null;
}

// 统计信息 (处理全局唯一一个面板)
SiloHouse.prototype.showSummery = function(boolValue) {
    if (SiloHouse.summeryPanel) {
        SiloHouse.summeryPanel.destroy();
        SiloHouse.summeryPanel = null;
    }

    if (boolValue) {
        SiloHouse.summeryPanel = THING.widget.Panel({
            name: this.name,
            isClose: true,
            isDrag: true,
            isRetract: true,
            hasTitle: true,
            width: "300px",
            media: true
        });
        SiloHouse.summeryPanel.setZIndex(999999);//设置ui排序
        SiloHouse.summeryPanel.addTab(this.info);
        SiloHouse.summeryPanel.setPosition({ left: 300, top: 50 });
    }
}

// ----------------------------------------------------------------------------
// 摄像头封装类
function VideoCamera(obj) {
    this.obj = obj;
    this.videoFrame = null;
    var that = this;

    this.marker = app.create({
        type: "Marker",
        position: [0, 3.5, 0],
        size: 8,
        url: "./images/videocamera.png",
        parent: obj
    });
    this.marker.visible = false;
    this.marker.on('click', function() {
        that.showVideoFrame();
    });
}

VideoCamera.prototype.showUI = function(boolValue) {
    this.marker.visible = boolValue;
}

VideoCamera.prototype.showVideoFrame = function() {
    if (this.videoFrame) {
        this.videoFrame.destroy();
        this.videoFrame = null;
    }

    this.videoFrame = THING.widget.Panel({
        name: this.obj.name,
        isClose: true,
        isDrag: true,
        hasTitle: true,
        width: "538px",
        media: true
    });
    var ui2data = { iframe: true };
    this.videoFrame.addIframe(ui2data, 'iframe').name("　").iframeUrl("video.html").setHeight('321px');
    this.videoFrame.setPosition({ left: app.domElement.offsetWidth - this.videoFrame.domElement.offsetWidth - 100, top: 100 });// ui位置默认在 右上角   
    this.videoFrame.setZIndex(999999);

    var that = this;
    this.videoFrame.bind('close', function () {
        if (that.videoFrame) {
            that.videoFrame.destroy();
            that.videoFrame = null;
        }
    });        
}

// ----------------------------------------------------------------------------
// 卡车封装类
function Truck(obj) {
    this.obj = obj;
    this.info = { "车牌": "京A12345", "公司": "北京优锘科技有限公司", "状态": "出库", "仓房": "1号", "状态": "过磅" };
}

Truck.prototype.createUI = function(width) {
    // 创建widget (动态绑定数据用)
    var panel = THING.widget.Panel({
        cornerType: 's2c3',
        width: "350px",
        isClose: false,
        opacity: 0.8,
        media: true
    });
    for (var key in this.info)
        panel.add(this.info, key);
    this.panel = panel;

    // 创建obj ui (跟随物体用)
    var ui = app.create({
        type: 'UI',
        parent: this.obj,
        el: panel.domElement,
        offset: [0, this.height, 0],
        pivot: [0, 1.45]
    });
    this.ui = ui;
    return panel;
}

Truck.prototype.showUI = function(boolValue) {
    if (this.ui || this.panel)
        this.hideUI();
    if (boolValue)
        this.createUI();
}

Truck.prototype.hideUI = function(width) {
    this.panel.destroy();
    this.panel = null;
    this.ui.destroy();
    this.ui = null;
}

//-----------------------------------------------------------------------------
// 应用入口
var app;
var toolBarState = true;
var startFps = false;
var fpsControl = null;
window.onload = function () {
    // new App
    app = new THING.App({
        container: "div3d",
        skyBox: 'BlueSky',
        url: "https://uinnova-model.oss-cn-beijing.aliyuncs.com/scenes/silohouse",
        ak: "app_test_key"
    });

    // 加载完成
    app.on('load', function () {
        init();
        init_gui();
    });
}

// ----------------------------------------------------------------------------
// 初始化
var siloHouseList = [];
var videoCameraList = [];
var truckList = [];
function init() {
    
    // 粮仓
    app.query("[物体类型=粮仓]").forEach(function(obj) {
        var siloHouse = new SiloHouse(obj);
        siloHouseList.push(siloHouse);
    });

    // 摄像头
    app.query("[物体类型=摄像头]").forEach(function(obj) {
        videoCameraList.push(new VideoCamera(obj));
    });

    // 卡车 
    create_truck();
    app.query("[物体类型=卡车]").forEach(function(obj) {
        truckList.push(new Truck(obj));
    });

    // ----------------------------------------------------------------------------------
    // 单击 如果没拾取到，则取消上次选择的粮仓
    app.on('singleclick', function(event) {
        if (event.pickedObj == null || event.pickedObj.attr('物体类型') != '粮仓') {
            if (SiloHouse.current) {
                SiloHouse.current.unselect();
                SiloHouse.current = null;
            }
        }
    });

    // 双击 如果没pick到，则取消上次打开的粮仓 
    app.on('dblclick', function(event) {
        if (event.pickedObj == null || event.pickedObj.attr('物体类型') != '粮仓') {
            if (SiloHouse.currentOpen) {
                SiloHouse.currentOpen.resetRoof();
                SiloHouse.currentOpen = null;
            }
        }
    });       

    // 右键 则取消上次打开的粮仓 
    var mouseDownPos = null;
    app.on('mousedown', function(event) {
        if (event.button == 2)
            mouseDownPos = [event.x, event.y];
    });
    app.on('click', function(event) {
        if (event.button == 2 && Math.getDistance(mouseDownPos, [event.x, event.y]) < 4) { // 小于4像素执行click事件
            if (SiloHouse.currentOpen) {
                SiloHouse.currentOpen.resetRoof();
                SiloHouse.currentOpen = null;
            }
        }
    });

    // 屏蔽鼠标右键系统菜单
    document.body.oncontextmenu = function (evt) {
        evt = evt || event;
        evt.returnValue = false;
        return false;
    };

    // 第一人称
    fpsControl = new THING.FPSControl({
        startPos: [0, 18, 0]
    });
}

// ----------------------------------------------------------------------------------
// 定位相关，演示只创建一个卡车
var positionList = [];// 人车定位相关
var truckInfo = { "车牌": "京A12345", "公司": "北京优锘科技有限公司", "状态": "出库", "仓房": "1号", "状态": "过磅" };
var wayPointList = ["L109", "L110", "L104", "L103", "L102", "L108", "L109", "L118", "L119", "L112", "L111", "L117", "L118"];
function create_truck() {
    // 生成path，从场景中物体取得位置
    var path = [];
    for (var i = 0; i < wayPointList.length; i++) {
        var pObj = app.query(wayPointList[i])[0];
        if (!pObj)
            continue;
        path.push(pObj.position);
    }
    
    // 创建卡车并行走路径
    truck = app.create({
        type: 'Thing',
        name: "truck",
        url: "https://speech.uinnova.com/static/models/truck",
        complete: function () {
            this.movePath({
                'orientToPath' : true,
                'orientToPathDegree': 180, 
                'path': path,
//                'time': 40000,
                'speed': 20,
                'delayTime': 500,
                'lerp': false,
                'loop': true
            });
        }
    });
    truck.attr('物体类型','卡车');
}

// ----------------------------------------------------------------------------
// 界面相关
var toolBar = null;
function init_gui() {//ui 初始化
    // 添加指南针
    var compass = app.addControl(new THING.CompassControl('images/compass.png'));

    // 工具面板界面
    var baseURL = "http://47.93.162.148:8081/liangyw/images/button/";
    toolBar = THING.widget.ToolBar({
        media: true
    });
    toolBar.data = { number: false, temper: false, humi: false, power: false, store: false, video: false, cloud: false, location: false };
    var img0 = toolBar.addImageBoolean(toolBar.data, 'number').name('仓库编号').imgUrl(baseURL + 'warehouse_code.png');
    var img1 = toolBar.addImageBoolean(toolBar.data, 'temper').name('温度检测').imgUrl(baseURL + 'temperature.png');
    var img2 = toolBar.addImageBoolean(toolBar.data, 'humi').name('湿度检测').imgUrl(baseURL + 'humidity.png');
    var img3 = toolBar.addImageBoolean(toolBar.data, 'power').name('能耗统计').imgUrl(baseURL + 'statistics.png');
    var img4 = toolBar.addImageBoolean(toolBar.data, 'store').name('粮食储量').imgUrl(baseURL + 'cereals_reserves.png');
    var img5 = toolBar.addImageBoolean(toolBar.data, 'video').name('视屏监控').imgUrl(baseURL + 'video.png');
    var img6 = toolBar.addImageBoolean(toolBar.data, 'cloud').name('温度云图').imgUrl(baseURL + 'cloud.png');
    var img7 = toolBar.addImageBoolean(toolBar.data, 'location').name('人车定位').imgUrl(baseURL + 'orientation.png');
    img0.onChange(function(boolValue) { onChangeImageButton('number', boolValue); });
    img1.onChange(function(boolValue) { onChangeImageButton('temper', boolValue); });
    img2.onChange(function(boolValue) { onChangeImageButton('humi', boolValue); });
    img3.onChange(function(boolValue) { onChangeImageButton('power', boolValue); });
    img4.onChange(function(boolValue) { onChangeImageButton('store', boolValue); });
    img5.onChange(function(boolValue) { onChangeImageButton('video', boolValue); });
    img6.onChange(function(boolValue) { onChangeImageButton('cloud', boolValue); });
    img7.onChange(function(boolValue) { onChangeImageButton('location', boolValue); });
    toolBar.setPosition({ "top": 0, "left": 50 });
}

// 处理工具条按钮
function onChangeImageButton(key, boolValue) {
    // 更新界面绑定对象，其中排除 云图 和 人车定位
    if (boolValue) {
        for (var elem in toolBar.data) {
            if (elem == "cloud" || elem == "location" || elem == key)
                continue;
            toolBar.data[elem] = false;
        }
    }    

    // 分类别处理
    if (key == "cloud") { // 云图
        if (!boolValue) {
            if (SiloHouse.currentOpen)
                SiloHouse.currentOpen.destroyHeatmap();
        } else {
            if (SiloHouse.currentOpen && app.camera.flying == false)
                SiloHouse.currentOpen.createHeatmap();
        }
    } else if (key == "location") { // 人车定位
        truckList.forEach(function (tr) { 
            tr.showUI(boolValue); 
        });
    } else if (key == "video") { // 视频监控
        videoCameraList.forEach(function (vc) { 
            vc.showUI(boolValue); 
        });
    } else if (key == "store") { // 储量
        siloHouseList.forEach(function (siloHouse) { 
            siloHouse.hideUI();
            siloHouse.obj.visible = !boolValue;
        });
    } else { // 其他粮仓UI显示
        siloHouseList.forEach(function (siloHouse) { 
            siloHouse.showUI(key, boolValue); 
        });
    }
}

// 处理左侧菜单
function onClickMenuItem(elem, item) {
    if (item == "cam") {
        if (app.camera.rotating == false && startFps == false) {
            if (elem.children[1].innerText == "2D") {
                elem.children[0].className = 'img img-3d';
                elem.children[1].innerText = "3D"
                app.camera.toggle3D = false;
            } else {
                elem.children[0].className = 'img img-2d';
                elem.children[1].innerText = "2D"
                app.camera.toggle3D = true;
            }
        }
    } else if (item == "rot") {
        if (app.camera.toggle3D == true && startFps == false) //2d不旋转
            app.camera.rotateAround({ time: 2, angle: -90 });
    } else if (item == "fun") {
        toolBarState = !toolBarState;
        toolBar.show(toolBarState);
    } else if (item == "fps") {
        if (app.camera.toggle3D == true) { //2d 时候不能进入
            startFps = !startFps;
            changeFPS(startFps);
            if (elem.children[1].innerText == "行走") {
                elem.children[1].innerText = "恢复"
            } else {
                elem.children[1].innerText = "行走"
            }
        }
    }
}

function changeFPS(start) {
    if (start) {
        app.addControl(fpsControl);
    } else {
        app.removeControl(fpsControl);   
    }
}