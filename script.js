load_libs();

function load_libs() {
    /* Метод загрузки JS библиотек из CDN */

    function loadScriptByURL(id, type, url, callback) {
        /* Метод загрузки JS API */
        const isScriptExist = document.getElementById(id);

        if (!isScriptExist) {
            if (type === 'js') {
                let script = document.createElement("script");
                script.type = "text/javascript";
                script.src = url;
                script.id = id;
                script.onload = function () {
                    if (callback) callback();
                };
                document.head.appendChild(script);

            } else if (type === 'css') {
                let script = document.createElement("link");
                script.rel = "stylesheet";
                script.href = url;
                script.id = id;
                script.onload = function () {
                    if (callback) callback();
                };
                document.head.appendChild(script);
            }
        }
        if (isScriptExist && callback) callback();
    }

    // Загрузка API OpenLayers
    loadScriptByURL("OpenStreetMapAPI", "js", "http://www.openlayers.org/api/OpenLayers.js", function () {
        loadScriptByURL("StyleCSS", "css", qva.Remote + "?public=only&name=Extensions/OpenStreetMap/style.css");
        // Запуск инициализации карты
        init_map();
    });

}

function init_map() {
    /* Метод инициализации карты OpenStreetMap */

    Qva.AddExtension('OpenStreetMap', function () {

            let _this = this;
            let MAP_CONTAINER = _this.Layout.ObjectId.replace("\\", "_");
            let PROJECTION = "EPSG:3857";
            let DISPLAY_PROJECTION = "EPSG:4326";

            // let popupLabels = _this.Layout.Text0.text;
            // let gSize = _this.Layout.Text1.text;
            // let mZoom = _this.Layout.Text2.text;
            // let disableStyles = _this.Layout.Text3.text;

            // Создание контейнера для отображения карты
            if (this.Element.children.length === 0) {

                let ui = document.createElement("div");
                ui.setAttribute("id", MAP_CONTAINER);
                ui.setAttribute("class", MAP_CONTAINER);
                this.Element.appendChild(ui);

                let map_box = $("#" + MAP_CONTAINER);
                map_box.css("height", _this.GetHeight() + "px").css("width", _this.GetWidth() + "px");
                map_box.empty();
            } else {
                let map_box = $("#" + MAP_CONTAINER);
                map_box.css("height", _this.GetHeight() + "px").css("width", _this.GetWidth() + "px");
                map_box.empty();
            }

            // Границы карты и разрешение
            let maxExtent = new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508);
            let restrictedExtent = maxExtent.clone();
            let maxResolution = 156543.0339;

            // Отображаться карта будет в проекции EPSG:4326.
            let options = {
                projection: new OpenLayers.Projection(PROJECTION),
                displayProjection: new OpenLayers.Projection(DISPLAY_PROJECTION),
                numZoomLevels: 18,
                maxResolution: maxResolution,
                maxExtent: maxExtent,
                restrictedExtent: restrictedExtent
            };

            // Создание карты
            map = new OpenLayers.Map(MAP_CONTAINER, options);

            // Слой-карты OpenStreet
            let mapnik = new OpenLayers.Layer.OSM();

            // Включение инструментов подсказки масштаба карты и позици курсора
            map.addControl(new OpenLayers.Control.ScaleLine());
            map.addControl(new OpenLayers.Control.MousePosition());

            // Добавление слоя на карту
            map.addLayers([mapnik]);

            //Добавляем панель управления слоями
            map.addControl(new OpenLayers.Control.LayerSwitcher());

            //Создаем точку на которую будет центрироваться карта при старте (г. Москва)
            let point0 = new OpenLayers.Geometry.Point(37.61132, 55.75013);

            // Трансформация координат между проекциями.
            point0.transform(new OpenLayers.Projection(DISPLAY_PROJECTION), new OpenLayers.Projection(PROJECTION));

            //Выполняем центрирование карты на точку с масштабом 9. По умолчанию их 15.
            map.setCenter(new OpenLayers.LonLat(point0.x, point0.y), 9);

            // Событие нажатия на элемент карты
            window.oncvlrowclick = function(rowlx) {
                _this.Data.SelectRow(rowlx)
            }

            // Добавление точек на карту
            for (let i = 0, k = _this.Data.Rows.length; i < k; i++) {

                let row = _this.Data.Rows[i];

                let if_added_layer = false;

                $(map.layers).each(function (index){
                    if ( map.layers[index]['name'] === row[3].text) {
                        if_added_layer = true;
                    }
                });

                console.log(if_added_layer);

                // Если слой не создан, создаем, применяем стили
                if (if_added_layer ===  false) {

                    // Стили точек
                    // Если цвет не задан, генерируем случайный
                    let point_color = getRandomColor();
                    console.log(point_color);
                    if (row[4].text.charAt(0) == '#') {
                        point_color = row[4].text;
                    }

                    console.log(point_color);

                    let stylePoint= {
                        pointRadius: 5,
                        strokeColor: "black",
                        strokeWidth: 1,
                        fillColor: point_color
                    };

                    // Создаем слой для точек
                    let layer = new OpenLayers.Layer.Vector(row[3].text, {
                        eventListeners: {
                            'featureselected': function (evt) {
                                let feature = evt.feature;
                                let popup = new OpenLayers.Popup.FramedCloud("popup",
                                    OpenLayers.LonLat.fromString(feature.geometry.toShortString()),
                                    null,
                                    "<div style='font-size:.8em' onclick='oncvlrowclick(" + i + ")'>" + feature.attributes.text + "</div>",
                                    null,
                                    true
                                );
                                feature.popup = popup;
                                map.addPopup(popup);
                            },
                            'featureunselected': function (evt) {
                                let feature = evt.feature;
                                map.removePopup(feature.popup);
                                feature.popup.destroy();
                                feature.popup = null;
                            }
                        },
                        style: stylePoint
                    });

                    map.addLayer(layer);
                }

                let latitude = parseFloat(row[0].text);
                let longitude = parseFloat(row[1].text);

                if (!isNaN(latitude) && latitude !== '' && latitude <= 90 && latitude >= -90 && !isNaN(longitude) && longitude !== '' && longitude <= 180 && latitude >= -180) {

                    let layer_index = 0;

                    $(map.layers).each(function (index){
                        if ( map.layers[index]['name'] === row[3].text) {
                           layer_index = index;
                        }
                    });

                    addPoint(longitude, latitude, row[2].text, i, layer_index);
                }
            }

            let selectControl = new OpenLayers.Control.SelectFeature([map.layers[1]]);
            map.addControls([selectControl],
                {
                    clickout: true, toggle: false,
                    multiple: false, hover: true,
                    toggleKey: "ctrlKey",
                    multipleKey: "shiftKey"
                });

            selectControl.activate();




            function addPoint(lon, lat, title, ident, layer_index) {
                /* Метод добавления точки на карту */
                let point = new OpenLayers.Geometry.Point(parseFloat(lon), parseFloat(lat));
                point.transform(new OpenLayers.Projection(DISPLAY_PROJECTION), new OpenLayers.Projection(PROJECTION));
                map.layers[layer_index].addFeatures(new OpenLayers.Feature.Vector(point, {
                    label: title,
                    name: title,
                    text: title,
                    PointId: ident,
                }));
            }

            function getRandomColor(){
                /* Метод получения случайного цвета */
                let letters = '0123456789ABCDEF';
                let color = '#';
                for ( let i = 0; i < 6; i++){
                    color += letters[Math.floor(Math.random() * 16)];
                }
                return color;
            }
        }
    );
}
