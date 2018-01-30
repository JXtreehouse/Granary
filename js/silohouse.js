var app,cameraPosition,cameraTarget;
window.onload = function() {
    app = new t3d.App({
        el: "div3d",
        skyBox: 'BlueSky',
        url: "https://uinnova-model.oss-cn-beijing.aliyuncs.com/scenes/silohouse",
        ak:"app_test_key",
        complete: function() {
            console.log("app scene loaded");
            appinit();
            guiinit();
            initsimdata();
            // 更新
            app.onupdate = function() {
                if (startFps) {
                    fpsControls.update(app.deltaTime);
                }
            }
        }
    });
}
var siloHouse = {};
function appinit() {
    app.debug.picker.enablePickMouseMove = false;//解决移动场景时候帧率低的问题
    //数据收集
    siloHouse.bound = app.query("[物体类型=粮仓]");
    siloHouse.door = app.query("[物体类型=粮仓门]");
    siloHouse.window = app.query("[物体类型=粮仓窗]");
    siloHouse.grain = app.query("[物体类型=粮食]");
    siloHouse.camera = app.query("[物体类型=摄像头]");
    //事件注册
    siloHouse.bound.on('singleclick', click_bound_callback);
    siloHouse.bound.on('dblclick', dblclick_bound_callback);    
    app.on('mouseup', click_all_callback);
    app.on('mousedown', click_all_callback_down);
    document.body.oncontextmenu = function(evt) {// 屏蔽鼠标右键系统菜单
        evt = evt || event;
        evt.returnValue = false;
        return false;
    };
}
var mousedownPos = new THREE.Vector2();
function click_all_callback_down(event) {
    mousedownPos.set(event.x,event.y);//鼠标点击的位置记录一下
}
function click_all_callback(event) {
    event.preventDefault();
    var np = new THREE.Vector2(event.x,event.y);    
    if (event.button == 2 && mousedownPos.distanceTo(np) < 4 && app.camera.flying == false && CameraRotateIng == false ) { // 鼠标如果和按下时候差 4个像素,就不执行右键了
        if(lastDblClickBund != null) {
            recover_anim(); //恢复上一次的粮仓           
            if (currentHeatMapMesh != null) // 删除云图
                destroyMeshHeatmap(currentHeatMapMesh);
            //解决一个神器的bug, tween 在执行时候 右键会弹出保存图片菜单..... 延迟10毫秒执行右键
            window.setTimeout(function(){
                app.camera.flyTo({
                    position: cameraPosition,
                    target: cameraTarget,
                    time: 1300	// 耗时毫秒
                });
            },10);
        }
        if (lastClickBund != null)//恢复单击变色
            lastClickBund.style.color = null;// 0xFFFFFF;
    }
}
// 点击变色
var lastClickBund = null;
var lastClickBundUI = null;
function click_bound_callback(event) {
    recover_click_bound();//先恢复上次点击的
    lastClickBund = event.pickedObj; // 记录点击的物体
    lastClickBund.style.color = 0x6495ED;
    if (lastClickBundUI != null) //已显示 ui 先干掉
        lastClickBundUI.destroy();  
    var uiData = {};
    if (lastClickBund.info == null) {// 生成模拟数据
        uiData =  {
            "基本信息": {
                "品种": Math.ceil(Math.random()*2) == 1 ? "小麦":"玉米",
                "库存数量": Math.ceil(Math.random()*9000) + "",
                "报关员":  Math.ceil(Math.random()*2) == 1 ? "张三":"李四",
                "入库时间": Math.ceil(Math.random()*2) == 1 ? "11:24":"19:02",
                "用电量": Math.ceil(Math.random()*100) + "",
                "单仓核算": "无"
            },
            "粮情信息": {
                "仓房温度": Math.ceil(Math.random()*27+25) + "",
                "粮食温度": Math.ceil(Math.random()*25+20) + "",
            },
            "报警信息": {
                "火灾": "无",
                "虫害": "无"
            }
        };
        lastClickBund.info = uiData;// 记录 到物体的 info 里
    } else{
        uiData = lastClickBund.info;
    }
    lastClickBundUI = new dat.gui.GUI({
        type:'signboard2',
        name: lastClickBund.name,
        isClose: true,
        isDrag: true,
        isRetract: true,
        hasTitle: true,
        domWidth:"450px"
    });
    lastClickBundUI.setZIndex(999999);//设置ui排序
    lastClickBundUI.addTab(uiData);
    lastClickBundUI.setPosition({left:300, top: 50});
    lastClickBundUI.bind('close',recover_click_bound);
}
function recover_click_bound() {
    if (lastClickBund != null)
        lastClickBund.style.color = null;//0xFFFFFF;
}
var lastDblClickBund = null;
function dblclick_bound_callback(event) {
    if( lastDblClickBund == event.pickedObj) //两次双击同一个物体,不响应
        return;    
    if (currentHeatMapMesh != null)// 如果有云图,立刻删除
        destroyMeshHeatmap(currentHeatMapMesh);
    if (lastClickBund == event.pickedObj) // 如果双击和单机是同一个物体,把单机还原了
        recover_click_bound();    
    //记录摄影机位置
    cameraPosition = app.camera.position;
    cameraTarget = app.camera.target;    
    recover_anim();//恢复上一次的粮仓 打开状态
    {
        var obj = event.pickedObj.findParts("gaizi")[0];
        obj.moveTo({
            'offset': [0, 80, 0],
            'time': 300
        }); 
    }
    app.camera.flyTo({//飞到
        position: [event.pickedObj.position[0],event.pickedObj.position[1]+70,event.pickedObj.position[2] -30],
        target: [event.pickedObj.position[0],event.pickedObj.position[1],event.pickedObj.position[2]],
        time: 1000,	// 耗时毫秒
        complete:function() {
            if (uiData.cloud == true) {
                var width =  400;
                var height = 300;
                var config = {
                    minValue : 15,
                    maxValue : 45,
                    above : 1,
                    scale : 1,
                    radius : 25,
                    blur : 50
                }
                // 生成数据
                var data = [];
                var segX = Math.ceil( width / config.radius );
                var segY = Math.ceil( height / config.radius );
                var w = width/segX;
	            var h = height/segY;
                for (var i = 0 ;i < segX; i++) {
                    var x = i*w + w*0.5;
                    for (var j =0; j < segY; j++) {
                        var y = j*h + h*0.5;
                        data.push( [x,y,RandomNoRepeat(config.minValue,config.maxValue)] );
                    }
                }
                currentHeatMapMesh = createMeshHeatmap(lastDblClickBund,width,height,data,config);
            }
        }
    });
    lastDblClickBund = event.pickedObj;
}
function recover_anim() {//恢复粮仓盖子
    if (lastDblClickBund !=null) {
        var obj = lastDblClickBund.findParts("gaizi")[0];
        obj.moveTo({
            'offset': [0, -obj.node.position.y, 0],
            'time': 300
        });
        lastDblClickBund = null;
    }
}
function initsimdata() {// 初始化模拟数据
    siloHouse.grain.forEach(function(obj) {// 模拟粮食
        var ram = Math.ceil(Math.random()*100+10);// 随机 百分比 显示 并设置给 物体的高            
        if (obj.attr("形状") == "圆") 
            obj.node.scale.y = 5.3 * (ram * 0.01);
        else
            obj.node.scale.y = 1.3 * (ram * 0.01);
        obj.attr("粮食储量", ram);  
    });
    // 定位模拟
    posinit();
}
var functionMenuGui;
var uiData = {
    warehouseCode: false,
    temperature: false,
    humidity: false,
    statistics: false,
    status: false,
    insect: false,
    cerealsReserve: false,
    video: false,
    cloud: false,
    orientation: false
}
function guiinit(){//ui 初始化
    function un_check(key) {
        for (var elem in uiData) {
            if (elem != "cloud" && elem != "orientation" && elem != key)//排除 云图 和 人车定位
                uiData[elem] = false;
        }
    }
    functionMenuGui = new dat.gui.GUI({type: 'icon1'});
    functionMenuGui.setPosition({"top":0,"left":50});
    var img0 = functionMenuGui.addImageBoolean(uiData, 'warehouseCode').name('仓库编号');
    var img1 = functionMenuGui.addImageBoolean(uiData, 'temperature').name('温度检测');
    var img2 = functionMenuGui.addImageBoolean(uiData, 'humidity').name('湿度检测');
    var img3 = functionMenuGui.addImageBoolean(uiData, 'statistics').name('能耗统计');
    var img4 = functionMenuGui.addImageBoolean(uiData, 'status').name('保粮状态');
    var img5 = functionMenuGui.addImageBoolean(uiData, 'insect').name('虫害');
    var img6 = functionMenuGui.addImageBoolean(uiData, 'cerealsReserve').name('粮食储量');
    var img7 = functionMenuGui.addImageBoolean(uiData, 'video').name('视屏监控');
    var img8 = functionMenuGui.addImageBoolean(uiData, 'cloud').name('温度云图');
    var img9 = functionMenuGui.addImageBoolean(uiData, 'orientation').name('人车定位');
    img0.imgUrl('http://47.93.162.148:8081/liangyw/images/button/warehouse_code.png');
    img1.imgUrl('http://47.93.162.148:8081/liangyw/images/button/temperature.png');
    img2.imgUrl('http://47.93.162.148:8081/liangyw/images/button/humidity.png');
    img3.imgUrl('http://47.93.162.148:8081/liangyw/images/button/statistics.png');
    img4.imgUrl('http://47.93.162.148:8081/liangyw/images/button/status.png');
    img5.imgUrl('http://47.93.162.148:8081/liangyw/images/button/insect.png');
    img6.imgUrl('http://47.93.162.148:8081/liangyw/images/button/cereals_reserves.png');
    img7.imgUrl('http://47.93.162.148:8081/liangyw/images/button/video.png');
    img8.imgUrl('http://47.93.162.148:8081/liangyw/images/button/cloud.png');
    img9.imgUrl('http://47.93.162.148:8081/liangyw/images/button/orientation.png');    
    img0.onChange(function(bool){//仓库编号
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                obj.uiDom.destroy();// 删除ui
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            un_check("warehouseCode");//互斥
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: obj.name
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"70px",
                    isClose: false,
                    t3d:app,
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                var that = obj;
                gui.bind('click', function() {
                    click_bound_callback({pickedObj:that});
                });
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    img1.onChange(function(bool) {//温度
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                obj.uiDom.destroy();// 删除ui
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {            
            un_check("temperature");//互斥
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: Math.ceil(Math.random()*30+20)+"℃"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"120px",
                    t3d:app,
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('温度');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    img2.onChange(function(bool) {//湿度检测
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            un_check("humidity");//互斥
            siloHouse.bound.forEach(function(obj) {                
                var data = {// 目前都是模拟数据
                    number: Math.ceil(Math.random()*30+20)+"%"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"120px",
                    t3d:app,
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('湿度');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    img3.onChange(function(bool) {//能耗统计
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                obj.uiDom.destroy();// 删除ui
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            un_check("statistics");//互斥
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: Math.ceil(Math.random()*20) + "KW/h"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"150px",
                    t3d:app,
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('能耗');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });    
    img4.onChange(function(bool) {//保粮状态
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                obj.uiDom.destroy();// 删除ui
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            un_check("status");//互斥
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: "正常"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"120px",
                    t3d:app,
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('保粮');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    img5.onChange(function(bool) {//虫害
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];                
                obj.uiDom.destroy();// 删除ui
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            un_check("insect");//互斥
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: Math.ceil(Math.random()*2) == 1 ? "2头/kg":"4头/kg"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"120px",
                    t3d:app,
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('虫害');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    img6.onChange(function(bool){//粮食储量
        if (bool == true) {
            un_check("cerealsReserve");//互斥
            // 隐藏 粮仓 门 窗
            siloHouse.bound.visible = false;
            siloHouse.door.visible = false;
            siloHouse.window.visible = false;
            siloHouse.grain.forEach(function(obj) {
                var data = {
                    number: obj.attr("粮食储量") +"%"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard1',
                    name: '粮食',
                    hasTitle: true,
                    domWidth:"120px",
                    isClose: false,//close属性配置是否有关闭按钮，默认没有，是为true，否为false
                    t3d:app,
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('储量');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,1]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                obj.data = data;
                obj.uiDom = gui;
            });
        } else {
            for (var i = 0 ; i < siloHouse.grain.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.grain[i];
                obj.uiDom.destroy();// 删除ui
                obj.removeUI();
                obj.uiDom = null;
                obj.data = null;
            }
            // 隐藏 粮仓 门 窗
            siloHouse.bound.visible = true;
            siloHouse.door.visible = true;
            siloHouse.window.visible = true;
        }
    });
    img7.onChange(function(bool) {//视屏监控
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.camera.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.camera[i];                
                obj.uiDom.destroy();// 删除ui
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            un_check("video");//互斥
            siloHouse.camera.forEach(function(obj) {
                var data = {
                    name: obj.name
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    isClose: false,
                    domWidth:"150px",
                    opacity: 0.8,
                });
                var thatObj = obj;
                gui.bind('click', function() { //注册ui的 点击事件, 点击出视频
                    if (cameraIframeUI != null) {
                        cameraIframeUI.destroy();
                    }
                    var ui2data = {
                        iframe: true
                    };
                    cameraIframeUI = new dat.gui.GUI({
                        type:'signboard2',
                        name:thatObj.name,
                        isClose: true,
                        isDrag: true,
                        hasTitle: true,
                        domWidth:"450px"
                    });
                    cameraIframeUI.addIframe(ui2data, 'iframe').name("　").iframeUrl("http://shuidi.huajiao.com/pc/player_autosize.html?sn=36061726627&channel=hide").setHeight('300px');
                    cameraIframeUI.setPosition({left:app.domElement.offsetWidth - cameraIframeUI.domElement.offsetWidth - 100, top: 100});// ui位置默认在 右上角   
                    cameraIframeUI.setZIndex(999999);
                    cameraIframeUI.bind('close',function() {//关闭时候把自己干掉 放置 直播的声音还在
                        if (cameraIframeUI != null) {
                            cameraIframeUI.destroy();
                        }
                    }); 
                });
                gui.add(data, 'name').name('视频');
                obj.addUI(gui.domElement,[0,obj.size[1],0],[0,3]);//ui左下角对齐物体
                obj.uiDom = gui;
            });
        }
    });
    img8.onChange(function(bool) {//云图
        if (!bool){ // 关闭状态 删除
            destroyMeshHeatmap(currentHeatMapMesh);
        } else {
            if ( lastDblClickBund != null && app.camera.flying == false) {// 飞行中不能创建
                var width =  400;
                var height = 300;
                var config = {
                    minValue : 15,
                    maxValue : 45,
                    above : 1,
                    scale : 1,
                    radius : 25,
                    blur : 50
                }
                var data = [];// 生成数据
                var segX = Math.ceil( width / config.radius );
                var segY = Math.ceil( height / config.radius );
                var w = width/segX;
	            var h = height/segY;
                for (var i = 0 ;i < segX; i++) {
                    var x = i*w + w*0.5;
                    for (var j =0; j < segY; j++) {
                        var y = j*h + h*0.5;
                        data.push( [x,y,RandomNoRepeat(config.minValue,config.maxValue)] );
                    }
                }
                currentHeatMapMesh = createMeshHeatmap(lastDblClickBund,width,height,data,config);
            }
        }
    });
    img9.onChange(function(bool){//人车定位 ui 显示隐藏
        if (bool) {
            positionList.forEach(function(posSys) {
                var obj = posSys._obj;
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: '车',
                    domWidth:"250px",
                    isClose: false,//close属性配置是否有关闭按钮，默认没有，是为true，否为false
                    t3d:app,
                    opacity: 0.8,
                });
                for (var key in posSys.info) {
                    gui.add(posSys.info,key);
                }
                obj.addUI(gui.domElement,[0,obj.size[1],0],[0,1.45]);
                obj.uiDom = gui;
            });
        } else {
            for (var i = 0 ; i < positionList.length; i++ ) {
                var obj = positionList[i]._obj;                
                obj.uiDom.destroy();// 删除ui
                obj.removeUI();
                obj.uiDom = null;
            }
        }

    });
}
var cameraIframeUI = null;
var currentHeatMapMesh = null;// 云图相关
function destroyMeshHeatmap(heatMapMesh) {
    if (heatMapMesh != null)
        app.debug.scene.remove(heatMapMesh);
}
function createMeshHeatmap(refObj,width, height,data,config) {
    if (config === undefined)
        config = {};
    if (config.minValue === undefined)
        config.minValue = 10;
    if (config.maxValue === undefined)
        config.maxValue = 50;
    if (config.above === undefined)
        config.above = 1;
    if (config.scale === undefined)
        config.scale = 1;
    if (config.radius === undefined)
        config.radius = 25;
    if (config.blur === undefined)
        config.blur = 50;
    var mapCanvas = document.createElement('canvas');
    mapCanvas.width = width;
    mapCanvas.height = height;
    mapCanvas.style.position = "absolute";
    mapCanvas.style.left = "0px";
    mapCanvas.style.top = "0px";
    var heat = simpleheat(mapCanvas).data(data).max(config.maxValue).min(config.minValue);
    heat.radius(config.radius,config.blur);
    heat.draw();//每次数值更新需要重新 draw 一下
    var texture = new THREE.Texture(mapCanvas);//document.querySelector('.heatmap-canvas')
    texture.needsUpdate = true;    
    var basicMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide
    }); 
    var heatMapMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(
            refObj.size[0],
            refObj.size[2]
        ),
        basicMat
    );
    app.debug.scene.add(heatMapMesh);
    heatMapMesh.position.set( refObj.position[0], refObj.size[1] + config.above, refObj.position[2] );
    heatMapMesh.scale.x = config.scale;
    heatMapMesh.scale.z = config.scale;
    // 旋转90度, 参数是 弧度
    heatMapMesh.rotateX(Math.PI / 2 );
    // 旋转180度
    heatMapMesh.rotateY(Math.PI);
    return heatMapMesh;
}
function RandomNoRepeat(min,max) { //随机生成不重复的
    var originalArray = new Array;
    for (var i=min;i<max;i++){
        originalArray[i]=i+1;
    }
    originalArray.sort(function(){ return 0.5 - Math.random(); }); 
    return originalArray[0];    
}
var positionList = [];// 人车定位相关
function posinit() {
    var ps = Object.create(positionSystem);// 目前就一个车
    ps.SetPath(["L109","L110","L104","L103","L102","L108","L109","L118","L119","L112","L111","L117","L118"]);
    ps.info = {"车牌":"京A12345","公司":"北京优锘科技有限公司","状态":"出库","仓房":"1号","状态":"过磅"};
    ps.loop = true;
    ps.start();
    positionList.push(ps);
}
var positionSystem = {// 人车定位  //app.query("#L118")  //Object.create(positionSystem);
    waypoints:[],
    time:5000,
    delay:0,
    speed:0,
    loop:false,
    OnComplete:null,
    info:{},
    _obj:null,
    _currentWaypoint:0,
    _tween:null,
    _loopStop:false,
    SetPath:function(list){
        var pathList = [];
        for (var i = 0 ; i < list.length; i++) {
            var objs = app.query(list[i]);
            if (objs.length != 0) {
                pathList.push(objs[0].position);
            }
        }
        this.waypoints = pathList;
    },
    DestroyMoveToPath:function() {
        that._tween.stop();
        that._loopStop = true;
    },
    MoveToPath:function() {
        var that = this;
        if (that._loopStop) {
            if ( that.OnComplete != null )
                that.OnComplete();
            return;
        }
        var from = {
			x: that._obj.position[0],
			y: that._obj.position[1],
			z: that._obj.position[2]
		};
		var to = {
			x: that.waypoints[that._currentWaypoint][0],
			y: that.waypoints[that._currentWaypoint][1],
			z: that.waypoints[that._currentWaypoint][2]
        };
        that._obj.node.lookAt(new THREE.Vector3(to.x,to.y,to.z));// 设置车头方向        
        that._obj.node.rotateY(Math.PI );// 目前车都是背对 目标点的, 只能沿Y轴旋转180度
        that._tween = new TWEEN.Tween(from)
        .to(to, that.time)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function () {
            that._obj.position = [this.x, this.y, this.z];
        })
        .onComplete(function () {
            if (that.delay == 0) //每次移动的间隔,默认0
                that.MoveToPath();
            else
                window.setTimeout(function(){that.MoveToPath();},that.delay);
        })
        .start();
        that._currentWaypoint++;
        if (that._currentWaypoint > that.waypoints.length-1) {
            that._currentWaypoint = 0;
            if ( that.loop == false )
                that._loopStop = true;
        }
    },
    start:function() {
        var that = this;
        that._obj = app.create({
            type: 'Thing',
            name: "truck",
            url: "https://speech.uinnova.com/static/models/truck",
            position: that.waypoints[0],
            angle: 0,
            complete: function(obj) {
                that._currentWaypoint = 1;
                that.MoveToPath();
            }
        });
    }
};
var CameraRotateIng = false;
function CameraRotateByAxis( angle, axis) {
    if ( cameraChange3DFlying == true || app.camera.flying == true || CameraRotateIng == true)
        return;
    CameraRotateIng = true;
    app.debug.picker.enabled = false;//防止ui 抖动 旋转时候 停止 
    var camera = app.debug.camera;
    var segs = Math.abs(angle / 2);//segs:分段，即圆弧对应的路径分为几段 angle：旋转角度
    var time = 10;//毫秒 动画执行的时间
    var x = camera.position.x;
    var y = camera.position.y;
    var z = camera.position.z;
    var n = null;  //相机向量（指向场景中心）
    if ( axis == null)
        axis = "y";
    else
        axis  = axis.toLocaleLowerCase();
    switch(axis) {
        case "x":
            n = (new THREE.Vector3(1, 0, 0)).normalize();
            break;
        case "y":
            n = (new THREE.Vector3(0, 1, 0)).normalize();
            break;
        case "z":
            n = (new THREE.Vector3(0, 0, 1)).normalize();
            break;
    }
    var endPosArray = new Array();
    var perAngle = angle / segs;
    for (var i = 1 ; i <= segs ; i++) {
        var sinDelta = Math.sin(THREE.Math.degToRad(i * perAngle));
        var cosDelta = Math.cos(THREE.Math.degToRad(i * perAngle));
        var tempX = x * (n.x * n.x * (1 - cosDelta) + cosDelta) + y * (n.x * n.y * (1 - cosDelta) - n.z * sinDelta) + z * (n.x * n.z * (1 - cosDelta) + n.y * sinDelta);
        var tempY = x * (n.x * n.y * (1 - cosDelta) + n.z * sinDelta) + y * (n.y * n.y * (1 - cosDelta) + cosDelta) + z * (n.y * n.z * (1 - cosDelta) - n.x * sinDelta);
        var tempZ = x * (n.x * n.z * (1 - cosDelta) - n.y * sinDelta) + y * (n.y * n.z * (1 - cosDelta) + n.x * sinDelta) + z * (n.z * n.z * (1 - cosDelta) + cosDelta);
        var endPos = [tempX,tempY,tempZ];
        endPosArray.push(endPos);
    }
    app.camera.orbit.enabled = false;
    var flag = 0;
    var id = setInterval(function () {
        if (flag == segs) {
            app.camera.orbit.enabled = true;
            CameraRotateIng = false;
            app.debug.picker.enabled = true;
            clearInterval(id);
        } else {
            var v3 = endPosArray[flag];
            camera.position.set( v3[0], v3[1], v3[2] );
            camera.updateMatrix();
            flag++;
        }
    }, time / segs);
}
var functionMenuGuiState = true;
var htmlElem2d3d = null;
var startFps = false;
var fpsControls = null;
// 处理左侧菜单
function MenuItemClick(elem,item) {
    if (item == "cam") {
        if( CameraRotateIng == false ) {     
            if (elem.children[1].innerText == "2D") {
                elem.children[0].className = 'img img-3d';
                elem.children[1].innerText = "3D"
                Change3D(false);
            } else {
                elem.children[0].className = 'img img-2d';
                elem.children[1].innerText = "2D"
                Change3D(true);
            }
        }
        htmlElem2d3d = elem;
    } else if (item == "rot") {
        if (cameraChange3D == true ) //2d不旋转
            CameraRotateByAxis(90);
    } else if (item == "reset") {
        if(CameraRotateIng == false && cameraChange3DFlying == false) {//摄影机旋转停止了和不飞了,才能恢复
            Change3D(true);
            if (htmlElem2d3d != null) {//恢复时候 还原 ui成 2d
                htmlElem2d3d.children[0].className = 'img img-2d';
                htmlElem2d3d.children[1].innerText = "2D"
            }
        }
    } else if (item == "fun") {
        functionMenuGuiState = !functionMenuGuiState;
        functionMenuGui.show(functionMenuGuiState);
    } else if (item == "fps") {
        startFps = !startFps;
        changeFPS();
        if (elem.children[1].innerText == "行走") {
            elem.children[1].innerText = "恢复"
        } else {
            elem.children[1].innerText = "行走"
        }
    }
}
function changeFPS() {
    app.camera.orbit.enabled  = !startFps;
    
    if (fpsControls == null) {
        fpsControls = new THREE.FirstPersonControls(app.camera.camera);
        //fpsControls.lookSpeed = 0.15;
        //fpsControls.movementSpeed = 10;
        fpsControls.originPos = [0,18,0];
        fpsControls.surfaceFloor = app.outdoors.floorNode;
    }
    fpsControls.enabled = startFps;
    fpsControls.resetToOrigin();
}
var perspective;
function switchCamera() {
    var camera = app.debug.camera;
    if (camera instanceof THREE.PerspectiveCamera) {
        camera = new THREE.OrthographicCamera(
        window.innerWidth / - 16, window.innerWidth / 16,window.innerHeight / 16, window.innerHeight / - 16, -200, 500 );
        camera.position.x = 2;
        camera.position.y = 1;
        camera.position.z = 3;
        camera.lookAt(app.debug.scene.position);
        perspective = "Orthographic";
    } else {
        camera = new THREE.PerspectiveCamera(45,
        window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.x = 120;
        camera.position.y = 60;
        camera.position.z = 180;
        camera.lookAt(app.debug.scene.position);
        perspective = "Perspective";
    }
    app.debug.camera = camera;
}; 
function _clamp ( v, minv, maxv ) {
    return ( v < minv ) ? minv : ( ( v > maxv ) ? maxv : v );    
}
var cameraChange3D = true;
var cameraChange3DFlying = false;
function Change3D ( bool ) {
    cameraChange3D = bool;
    app.camera.orbit.enabled = true;// 防止旋转时候中断的bug
    var box = new THREE.Box3().setFromObject(app.debug.scene); // 获取场景的大小
    var offsetFactor = [0,1,0];
    var radius = box.getSize().length();//lenght 返回的是对角线长    
    var center = box.getCenter();
    var eyePos = [];
    radius = _clamp(radius,4,1000);
    if (!bool) {
        eyePos = [center.x + radius * offsetFactor[0], center.y + radius * offsetFactor[1], center.z + radius * offsetFactor[2] ];        
        eyePos.y = _clamp(eyePos.y, 10, 1000);
        app.camera.orbit.enableRotate = false;//2d 时候关闭旋转
    } else {
        offsetFactor = [0.5,0.5,0.5];
        eyePos = [center.x + radius * offsetFactor[0], center.y + radius * offsetFactor[1], center.z + radius * offsetFactor[2] ];
        app.camera.orbit.enableRotate = true;
    }
    cameraChange3DFlying = true;
    app.camera.flyTo({
        position: eyePos,
        target: [center.x,center.y,center.z],
        time: 800, // 耗时毫秒
        complete:function() {
            cameraChange3DFlying = false;
        }
    });
}