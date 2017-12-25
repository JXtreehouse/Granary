var app;
var cameraPosition;
var cameraTarget;
window.onload = function() {
    app = new t3d.App({
        el: "div3d",
        skyBox: 'BlueSky',
        url: "https://speech.uinnova.com/static/models/silohouse",
        ak:"app_test_key",
        complete: function() {
            console.log("app scene loaded");
            appinit();
            guiinit();
            posinit();
        }
    });    
    // update
    // app.onupdate = function() {
    //     //console.log("Update");
    // }
}
var siloHouse = {};
function appinit() {
    //数据收集
    siloHouse.bound = app.query("[物体类型=粮仓]");
    siloHouse.door = app.query("[物体类型=粮仓门]");
    siloHouse.window = app.query("[物体类型=粮仓窗]");
    siloHouse.grain = app.query("[物体类型=粮食]");
    siloHouse.camera = app.query("[物体类型=摄像头]");
    //资源 ui
    //事件注册
    siloHouse.bound.on('singleclick', click_bound_callback);
    siloHouse.bound.on('dblclick', dblclick_bound_callback);
    // 绑定click事件,目前主要处理右键
    app.on('mouseup', click_all_callback);
}
function click_all_callback(event) {
    event.preventDefault();
    if (event.button == 2) {//判断是右键点击       
    
        //console.log("右键了,返回视角");
        if(lastDblClickBund != null) {
            //恢复上一次的粮仓
            recover_anim();            
            // 删除云图
            if (lastHeatMapMesh != null)
                destroyMeshHeatmap();
            //解决一个神器的bug, tween 在执行时候 右键会弹出保存图片菜单..... 延迟10毫秒执行右键
            window.setTimeout(function(){
                app.camera.flyTo({
                    position: cameraPosition,
                    target: cameraTarget,
                    time: 1300	// 耗时毫秒
                });
            },10);
        }        
        //恢复单击变色
        if (lastClickBund != null)
            lastClickBund.style.color = null;// 0xFFFFFF;
    }
}
// 点击变色
var lastClickBund = null;
var lastClickBundUI = null;
function click_bound_callback(event) {
    //先恢复上次点击的
    recover_click_bound();
    // 记录点击的物体
    lastClickBund = event.pickedObj;
    lastClickBund.style.color = 0x6495ED;
    //已显示 ui 先干掉
    if (lastClickBundUI != null) {
        lastClickBundUI.destroy();
    }
    // 生成模拟数据 并记录 到物体的 info 里
    var uiData = {};
    // 记录模拟信息,没有生成新的模拟数据
    if (lastClickBund.info == null) {
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
        lastClickBund.info = uiData;
    } else {
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
    //先用测试方法
    lastClickBundUI.addTab(uiData);
    lastClickBundUI.setPosition({left:300, top: 50});
}
function recover_click_bound() {
    if (lastClickBund != null)
    lastClickBund.style.color = null;//0xFFFFFF;
    //如果ui显示 隐藏
}
var lastDblClickBund = null;
function dblclick_bound_callback(event) {
    // 如果有云图,立刻删除
    if (lastHeatMapMesh != null)
        destroyMeshHeatmap();
    // 如果双击和单机是同一个物体,把单机还原了
    if (lastClickBund == event.pickedObj) {
        recover_click_bound();
    }
    //记录摄影机位置
    cameraPosition = app.camera.position;
    cameraTarget = app.camera.target;
    //恢复上一次的粮仓
    recover_anim();
    {
        var obj = event.pickedObj.findParts("gaizi")[0];
        obj.move({
            'offset': [0, 80, 0],
            'time': 300
        }); 
    }
    //飞到
    app.camera.flyTo({
        position: [event.pickedObj.position[0],event.pickedObj.position[1]+70,event.pickedObj.position[2] -30],
        target: [event.pickedObj.position[0],event.pickedObj.position[1],event.pickedObj.position[2]],
        time: 1000,	// 耗时毫秒
        complete:function() {
            if (uiData.cloud == true) {
                createMeshHeatmap();
            }
        }
    });
    lastDblClickBund = event.pickedObj;
}
//恢复粮仓盖子
function recover_anim() {
    if (lastDblClickBund !=null) {
        var obj = lastDblClickBund.findParts("gaizi")[0];
        obj.move({
            'offset': [0, -obj.node.position.y, 0],
            'time': 300
        });
        lastDblClickBund = null;
    }
}
var gui;
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
function guiinit(){
    
    function un_check(key) {
        for (var elem in uiData) {
            //排除 云图 和 人车定位
            if (elem != "cloud" && elem != "orientation") {
                if(elem != key) {
                    uiData[elem] = false;
                }
            }
        }
    }
    var gui = new dat.gui.GUI({
        type: 'icon1'
    });
    gui.setPosition({"top":0,"left":50})
    var img0 = gui.addImageBoolean(uiData, 'warehouseCode').name('仓库编号');
    var img1 = gui.addImageBoolean(uiData, 'temperature').name('温度检测');
    var img2 = gui.addImageBoolean(uiData, 'humidity').name('湿度检测');
    var img3 = gui.addImageBoolean(uiData, 'statistics').name('能耗统计');
    var img4 = gui.addImageBoolean(uiData, 'status').name('保粮状态');
    var img5 = gui.addImageBoolean(uiData, 'insect').name('虫害');
    var img6 = gui.addImageBoolean(uiData, 'cerealsReserve').name('粮食储量');
    var img7 = gui.addImageBoolean(uiData, 'video').name('视屏监控');
    var img8 = gui.addImageBoolean(uiData, 'cloud').name('温度云图');
    var img9 = gui.addImageBoolean(uiData, 'orientation').name('人车定位');

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
    //仓库编号
    img0.onChange(function(bool){
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            //互斥
            un_check("warehouseCode");
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
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                var that = obj;
                gui.bind('click', function() {
                    click_bound_callback(that);
                });
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    //温度
    img1.onChange(function(bool) {
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            //互斥
            un_check("temperature");
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: Math.ceil(Math.random()*30+20)+"℃"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"120px",
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('温度');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    //湿度检测
    img2.onChange(function(bool) {
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            //互斥
            un_check("humidity");
            siloHouse.bound.forEach(function(obj) {
                // 目前都是模拟数据
                var data = {
                    number: Math.ceil(Math.random()*30+20)+"%"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"120px",
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('湿度');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    //能耗统计
    img3.onChange(function(bool) {
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            //互斥
            un_check("statistics");
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: Math.ceil(Math.random()*20) + "KW/h"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"150px",
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('能耗');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    //保粮状态
    img4.onChange(function(bool) {
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            //互斥
            un_check("status");
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: "正常"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"120px",
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('保粮');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    //虫害
    img5.onChange(function(bool) {
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.bound.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.bound[i];
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            //互斥
            un_check("insect");
            siloHouse.bound.forEach(function(obj) {
                var data = {
                    number: Math.ceil(Math.random()*2) == 1 ? "2头/kg":"4头/kg"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: obj.name,
                    domWidth:"120px",
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('虫害');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,3]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                
                obj.data = data;
                obj.uiDom = gui;
            });
        }
    });
    //粮食储量
    img6.onChange(function(bool){
        if (bool == true) {
            //互斥
            un_check("cerealsReserve");
            // 隐藏 粮仓 门 窗
            siloHouse.bound.visible = false;
            siloHouse.door.visible = false;
            siloHouse.window.visible = false;

            siloHouse.grain.forEach(function(obj) {
                // 随机 百分比 显示 并设置给 物体的高
                var ram = parseInt(100*Math.random());
                var data = {
                    number: ram +"%"
                };
                var gui = new dat.gui.GUI({
                    type: 'signboard1',
                    name: '粮食',
                    hasTitle: true,
                    domWidth:"120px",
                    isClose: false,//close属性配置是否有关闭按钮，默认没有，是为true，否为false
                    opacity: 0.8,
                });
                gui.add(data, 'number').name('储量');
                obj.addUI(gui.domElement, [0, obj.size[1] , 0 ],[0,1]); // 参数1 ui dom元素 参数2 相对于物体的偏移值 x y z(3D空间坐标) 参数3 ui 的轴心点 x y 百分比 0-1
                
                obj.data = data;
                obj.node.scale.y = 1 * (ram * 0.01);
                obj.uiDom = gui;
            });
        } else {
            for (var i = 0 ; i < siloHouse.grain.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.grain[i];
                // 删除ui
                obj.uiDom.destroy();
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
    //视屏监控
    img7.onChange(function(bool) {
        if (!bool){ // 关闭状态 删除
            for (var i = 0 ; i < siloHouse.camera.length; i++ ) {// 目前的层级,为了删除需要向上找两级
                var obj = siloHouse.camera[i];
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        } else {
            //互斥
            un_check("video");
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
                //注册ui的 点击事件, 点击出视频
                gui.bind('click', function() {
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
                    // 设置url
                    cameraIframeUI.addIframe(ui2data, 'iframe').name("　").iframeUrl("http://shuidi.huajiao.com/pc/player_autosize.html?sn=36061726627&channel=hide").setHeight('300px');
                    // ui位置默认在 右上角                  
                    cameraIframeUI.setPosition({left:app.domElement.offsetWidth - cameraIframeUI.domElement.offsetWidth - 100, top: 100});
                });
                gui.add(data, 'name').name('视频');
                // 取物体的size 顶在物体的头顶
                obj.addUI(gui.domElement,[0,obj.size[1],0],[0,3]);//ui左下角对齐物体
                obj.uiDom = gui;
            });
        }
    });
    //云图
    img8.onChange(function(bool) {
        if (!bool){ // 关闭状态 删除
            destroyMeshHeatmap();
        } else {
            if ( lastDblClickBund != null) { 
                createMeshHeatmap();
            }
        }
    });
    //人车定位 ui 显示隐藏
    img9.onChange(function(bool){
        if (bool) {
            positionList.forEach(function(posSys) {
                var obj = posSys._obj;
                var gui = new dat.gui.GUI({
                    //type: 'signboard0',
                    type: 'signboard2',
                    cornerType: 's2c3',
                    name: '车',
                    domWidth:"250px",
                    isClose: false,//close属性配置是否有关闭按钮，默认没有，是为true，否为false
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
                // 删除ui
                obj.uiDom.destroy();
                obj.removeUI();
                obj.uiDom = null;
            }
        }

    });
}
var cameraIframeUI = null;
// 云图相关
var mapCanvas = null;
var lastHeatMapMesh = null;
function destroyMeshHeatmap() {
    if (lastHeatMapMesh != null)
        app.debug.scene.remove(lastHeatMapMesh);
    if (mapCanvas != null)  {
        delete mapCanvas;
        mapCanvas = null;
    }
}
function createMeshHeatmap() {
    mapCanvas = document.createElement('canvas');
    var w = 20;
    var h = 10;
    mapCanvas.width = w;//app.debug.domElement.style.width;
    mapCanvas.height = h;//app.debug.domElement.style.height;
    heatmap = createWebGLHeatmap({width: lastDblClickBund.size[0], height: lastDblClickBund.size[2],canvas: mapCanvas });

    //heatmap.clear();

    //模拟三个点
    // heatmap.addPoint(1, 1, 30,1);
    // heatmap.addPoint(14, 5, 30,1);
    // heatmap.addPoint(37, 10, 30, 1);//37
    //
    for (var i = 0 ; i < 40; i++) {
        var x = Random(1 , 37 );
        var y = Random(1 ,25 );
        var v = Random(1 ,10 );
        //console.log(x+"_" + y + "_" + v);
        heatmap.addPoint( x, y, v, 1);
    }
    // heatmap.adjustSize();
    heatmap.update(); // adds the buffered points
    heatmap.display(); // adds the buffered points
    heatmap.clamp(0.0, 1.0);// 取值范围
    heatmap.multiply(0.995)
    heatmap.blur(); //模糊
    //app.camera.update(); 

    var texture = new THREE.Texture(mapCanvas);
    texture.needsUpdate = true;

    lastHeatMapMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(
            lastDblClickBund.size[0],
            lastDblClickBund.size[2]
        ),
        new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        })
    );
    app.debug.scene.add(lastHeatMapMesh);
    lastHeatMapMesh.position.set( lastDblClickBund.position[0], lastDblClickBund.size[1]+1, lastDblClickBund.position[2] );
    ///lastHeatMapMesh.rotation = lastDblClickBund.node.rotation;
    // 旋转90度, 参数是 弧度
    lastHeatMapMesh.rotateX(Math.PI / 2 );
    //lastHeatMapMesh.rotateY(Math.PI / 2 );
}

function Random (min,max) {
    var originalArray = new Array;
    for (var i=min;i<max;i++){ 
        originalArray[i]=i+1; 
    } 
    originalArray.sort(function(){ return 0.5 - Math.random(); }); 
    return originalArray[0];    
}
var positionList = [];
// 人车定位相关
function posinit() {
    // 目前就一个车
    var ps = Object.create(positionSystem);
    //rrrr.waypoints = [[0,0,0],[12,0,12],[100,0,12]];
    //create_location_car("TestCar01",["L107","L108","L109","L110","L104","L103","L102","L108","L109","L118","L119","L112","L111","L117","L118"],5,["车牌:京A12345","北京优锘科技有限公司","出入库种别:出库","仓房：1号","状态：过磅"]);
    ps.SetPath(["L109","L110","L104","L103","L102","L108","L109","L118","L119","L112","L111","L117","L118"]);
    ps.info = {"车牌":"京A12345","公司":"北京优锘科技有限公司","状态":"出库","仓房":"1号","状态":"过磅"};
    ps.loop = true;
    ps.start();
    positionList.push(ps);
}
// 人车定位  //app.query("#L118")  //Object.create(positionSystem);
var positionSystem = {
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
        // 设置车头方向
        that._obj.node.lookAt(new THREE.Vector3(to.x,to.y,to.z));
        // 目前车都是背对 目标点的, 只能沿Y轴旋转180度
        that._obj.node.rotateY(Math.PI );

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
            url: "truck",
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
    if (CameraRotateIng == true)
        return;
    CameraRotateIng = true;
    /*
    *camera:相机
    *angle：旋转角度
    *segs:分段，即圆弧对应的路径分为几段
    *time：动画执行的时间
    */
    
    var camera = app.camera.realCamera;
    var segs = Math.abs(angle / 2);
    var time = 10;//毫秒

    var x = camera.position.x;
    var y = camera.position.y;
    var z = camera.position.z;

    //相机向量（指向场景中心）
    var n = null;
    if ( axis == null)  {
        axis = "y";
    } else {
        axis  = axis.toLocaleLowerCase();
    }    
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
    // 关闭orbit ,记录原有状态
    var savedEnabled = true;// app.camera.orbit.enabled;
    app.camera.orbit.enabled = false;
    var flag = 0;
    var id = setInterval(function () {
        if (flag == segs) {
            app.camera.orbit.enabled = savedEnabled;
            CameraRotateIng = false;
            clearInterval(id);
        } else {
            var v3 = endPosArray[flag];
            camera.position.set( v3[0], v3[1], v3[2] );
            camera.updateMatrix();
            flag++;
        }
    }, time / segs);
}

// 处理左侧菜单
function MenuItemClick(elem,item) {
    if (item == "cam") {       
        if (elem.children[1].innerText == "2D") {
            elem.children[0].className = 'img img-3d';
            elem.children[1].innerText = "3D"
            Change3D(false);
        } else {
            elem.children[0].className = 'img img-2d';
            elem.children[1].innerText = "2D"
            Change3D(true);
        }
    } else if (item == "rot") {
        if (cameraChange3D == true) //2d不旋转
            CameraRotateByAxis(90);
    } else if (item == "reset") {
        Change3D(true);
    }
}

var perspective;
function switchCamera() {
    var camera = app.camera.realCamera;
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
    app.camera.realCamera = camera;
};
 
function _clamp ( v, minv, maxv ) {
    return ( v < minv ) ? minv : ( ( v > maxv ) ? maxv : v );    
}
var cameraChange3D = true;
function Change3D ( bool ) {
    cameraChange3D = bool;
    // 防止旋转时候中断的bug
    app.camera.orbit.enabled = true;    
    // 获取场景的大小
    var box = new THREE.Box3().setFromObject(app.debug.scene);
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
    app.camera.flyTo({
        position: eyePos,
        target: [center.x,center.y,center.z],
        time: 800 // 耗时毫秒
    });
}
// document.oncontextmenu = function (e) {
//     e.preventDefault();
//     //return false;
// };

function initFps() {
    // var clock = new THREE.Clock();

    // var camControls = new THREE.FirstPersonControls(app.camera.realCamera);
    // camControls.lookSpeed = 0.4;
    // camControls.movementSpeed = 20;
    // camControls.noFly = true;
    // camControls.lookVertical = true;
    // camControls.constrainVertical = true;
    // camControls.verticalMin = 1.0;
    // camControls.verticalMax = 2.0;
    // camControls.lon = -150;
    // camControls.lat = 120;

    // function render() {
    //     var delta = clock.getDelta();
    //     camControls.update(delta);
    //     // render using requestAnimationFrame
    //     requestAnimationFrame(render);
    // }
    // render();



    var controls = new THREE.FirstPersonControls( app.camera.realCamera );
    controls.lookSpeed = 0.1;
    controls.movementSpeed = 100;
    
    var clock = new THREE.Clock( true );
    
    var render = function() {
      requestAnimationFrame( render );
    
      controls.update( clock.getDelta() );
    };
    
    render();
}

function ccc () {
        //var prevCamera = camera;
        camera = app.camera.realCamera;
        //camera = new THREE.PerspectiveCamera(...);
        //camera.position.copy( prevCamera.position );
        //camera.rotation.copy( prevCamera.rotation );
    
        var MODE = { TRACKBALL: 0, FLY: 1 };
    
        switch( mode ) {
    
            case MODE.FLY:
    
                controls = new THREE.TrackballControls( camera );
    
                mode = MODE.TRACKBALL;
    
                break;
    
            case MODE.TRACKBALL:
    
                controls = new THREE.OrbitControls( camera );
    
                mode = MODE.FLY;
    
                break;
    
        }
}