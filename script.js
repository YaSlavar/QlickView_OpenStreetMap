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


            // Стили точек
            let stylePoint = {
                pointRadius: 5,
                strokeColor: "red",
                strokeWidth: 1,
            };

            //Создаем слой для точек. В свойстве styleMap указываем как отображать в обычном случае. Свойство select будет применено после выбора элемента.
            var vector = new OpenLayers.Layer.Vector("Точки на карте", {
                eventListeners: {
                    'featureselected': function (evt) {
                        var feature = evt.feature;
                        var popup = new OpenLayers.Popup.FramedCloud("popup",
                            OpenLayers.LonLat.fromString(feature.geometry.toShortString()),
                            null,
                            "<div style='font-size:.8em'>" + feature.attributes.text + "</div>",
                            null,
                            true
                        );
                        feature.popup = popup;
                        map.addPopup(popup);
                    },
                    'featureunselected': function (evt) {
                        var feature = evt.feature;
                        map.removePopup(feature.popup);
                        feature.popup.destroy();
                        feature.popup = null;
                    }
                },
                style: stylePoint
            });

            map.addLayer(vector);

            for (let i = 0, k = _this.Data.Rows.length; i < k; i++) {
                let row = _this.Data.Rows[i];
                let latitude = parseFloat(row[0].text);
                let longitude = parseFloat(row[1].text);

                // alert(row[2].text);
                // break;

                if (!isNaN(latitude) && latitude !== '' && latitude <= 90 && latitude >= -90 && !isNaN(longitude) && longitude !== '' && longitude <= 180 && latitude >= -180) {
                    addPoint(longitude, latitude, row[2].text, i);
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


            function addPoint(lon, lat, title, ident) {

                let point = new OpenLayers.Geometry.Point(parseFloat(lon), parseFloat(lat));
                point.transform(new OpenLayers.Projection(DISPLAY_PROJECTION), new OpenLayers.Projection(PROJECTION));
                map.layers[1].addFeatures(new OpenLayers.Feature.Vector(point, {
                    label: title,
                    name: title,
                    text: title,
                    PointId: ident
                }));
            }
        }
    );
}
