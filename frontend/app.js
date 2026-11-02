// WebGIS Terintegrasi GISHUB Kemenhub & PostGIS (24 Dataset Lengkap)
document.addEventListener("DOMContentLoaded", () => {
    // 1. Inisialisasi Peta Leaflet
    const map = L.map("map", {
        center: [-2.0, 118.0],
        zoom: 5,
        zoomControl: false,
        attributionControl: false
    });

    L.control.zoom({ position: "topleft" }).addTo(map);

    // BIKIN CUSTOM PANES AGAR POLIGON TIDAK TERTUTUP BASEMAP ATAU SALING TERTUMPUK
    map.createPane('polygonPane');
    map.getPane('polygonPane').style.zIndex = 350;

    map.createPane('linePane');
    map.getPane('linePane').style.zIndex = 450;

    map.createPane('pointPane');
    map.getPane('pointPane').style.zIndex = 550;

    // Basemaps
    const basemaps = {
        "carto-dark": L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }),
        "esri-sat": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }),
        "osm": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
    };

    let activeBasemap = basemaps["carto-dark"].addTo(map);

    // Switcher Basemap
    document.querySelectorAll(".basemap-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.basemap;
            if (basemaps[key] && activeBasemap !== basemaps[key]) {
                map.removeLayer(activeBasemap);
                activeBasemap = basemaps[key].addTo(map);
                document.querySelectorAll(".basemap-btn").forEach(b => {
                    b.classList.remove("active", "bg-sky-600", "text-white");
                    b.classList.add("bg-slate-800", "text-slate-300");
                });
                btn.classList.add("active", "bg-sky-600", "text-white");
                btn.classList.remove("bg-slate-800", "text-slate-300");
            }
        });
    });

    // Koordinat Tracker
    map.on("mousemove", (e) => {
        document.getElementById("mouse-coords").textContent = `Lat: ${e.latlng.lat.toFixed(5)} | Lng: ${e.latlng.lng.toFixed(5)}`;
    });

    // Reset Map View
    document.getElementById("btn-reset-view").addEventListener("click", () => {
        map.setView([-2.0, 118.0], 5);
    });

    // Toggle Sidebar
    const sidebar = document.getElementById("sidebar-panel");
    document.getElementById("btn-toggle-sidebar").addEventListener("click", () => {
        sidebar.classList.toggle("-ml-[420px]");
    });

    // Tab Navigation
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => {
                b.classList.remove("active", "border-sky-400", "text-sky-400");
                b.classList.add("border-transparent");
            });
            btn.classList.add("active", "border-sky-400", "text-sky-400");
            btn.classList.remove("border-transparent");

            const targetTab = btn.dataset.tab;
            document.querySelectorAll(".tab-content").forEach(content => {
                content.classList.add("hidden");
            });
            document.getElementById(targetTab).classList.remove("hidden");

            if (targetTab === "tab-stats") {
                loadStatsCharts();
            }
        });
    });

    // 2. State & Layer Storage
    const activeLayers = {}; // id -> L.tileLayer.wms or L.geoJSON
    const layerMetadata = {};
    const layerOpacities = {};
    let catalogData = [];

    const GISHUB_OWS = "https://gishub.kemenhub.go.id/geoserver/ows";

    // 3. Load Katalog Lengkap 24 Dataset GISHUB
    async function loadCatalog() {
        try {
            const res = await fetch("/api/gishub/catalog");
            catalogData = await res.json();
            renderCatalogList(catalogData);
            populateSpatialPortDropdown();

            // Aktifkan default layers
            for (const item of catalogData) {
                if (item.active) {
                    await toggleLayer(item.id, true);
                }
            }
            updateActiveBadge();
            renderLegend();
        } catch (e) {
            console.error("Gagal muat katalog GISHUB:", e);
        }
    }

    function renderCatalogList(items) {
        const container = document.getElementById("catalog-layers-container");
        container.innerHTML = "";

        items.forEach(item => {
            layerMetadata[item.id] = item;
            layerOpacities[item.id] = layerOpacities[item.id] || (item.type === "Polygon" ? 0.4 : 0.85);

            const isChecked = !!activeLayers[item.id] || (item.active && activeLayers[item.id] === undefined);

            const card = document.createElement("div");
            card.className = "layer-card p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition";
            card.dataset.category = item.category;
            card.dataset.id = item.id;

            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <label class="flex items-center gap-2 cursor-pointer flex-1">
                        <input type="checkbox" id="toggle-${item.id}" ${isChecked ? "checked" : ""} class="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 mt-0.5">
                        <div>
                            <div class="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                <span>${item.title}</span>
                                ${item.type === "Polygon" ? '<span class="px-1.5 py-0.2 text-[9px] rounded font-bold bg-sky-950 text-sky-300 border border-sky-800">AR</span>' : ''}
                            </div>
                            <div class="text-[10px] font-mono text-sky-400/80">${item.layer_name}</div>
                        </div>
                    </label>
                    <span class="w-3 h-3 rounded-full mt-1 flex-shrink-0" style="background-color: ${item.color}"></span>
                </div>
                <p class="text-[11px] text-slate-400 leading-tight">${item.description}</p>
                <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] text-slate-500 uppercase font-mono">${item.type}</span>
                        <button class="btn-focus-layer text-[10px] text-sky-400 hover:text-sky-300 transition flex items-center gap-1" data-id="${item.id}">
                            <i class="fa-solid fa-crosshairs"></i> Fokus
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px]">Transparansi:</span>
                        <input type="range" id="opacity-${item.id}" min="0.1" max="1" step="0.05" value="${layerOpacities[item.id]}" class="w-16 accent-sky-500 cursor-pointer">
                    </div>
                </div>
            `;
            container.appendChild(card);

            // Toggle Event
            const toggle = card.querySelector(`#toggle-${item.id}`);
            toggle.addEventListener("change", () => {
                toggleLayer(item.id, toggle.checked);
            });

            // Opacity Event
            const opacityInput = card.querySelector(`#opacity-${item.id}`);
            opacityInput.addEventListener("input", (e) => {
                const val = parseFloat(e.target.value);
                layerOpacities[item.id] = val;
                if (activeLayers[item.id]) {
                    if (activeLayers[item.id].setOpacity) {
                        activeLayers[item.id].setOpacity(val);
                    } else if (activeLayers[item.id].setStyle) {
                        activeLayers[item.id].setStyle({ fillOpacity: val, opacity: val });
                    }
                }
            });

            // Fokus ke Layer Event
            card.querySelector(".btn-focus-layer").addEventListener("click", () => {
                if (!activeLayers[item.id]) {
                    toggle.checked = true;
                    toggleLayer(item.id, true);
                }
                setTimeout(() => focusLayer(item.id), 400);
            });
        });
    }

    // 4. Toggle Layer (Semua Titik Point Dibuat BULAT, Poligon & Garis Bebas Kotak Fokus)
    async function toggleLayer(layerId, enable) {
        const meta = layerMetadata[layerId];
        if (!meta) return;

        if (!enable) {
            if (activeLayers[layerId]) {
                map.removeLayer(activeLayers[layerId]);
                delete activeLayers[layerId];
            }
        } else {
            // A. TITIK (POINT): SEMUA TITIK DIRENDER BULAT (L.circleMarker), BUKAN KOTAK WMS
            if (meta.type === "Point") {
                try {
                    let geojsonUrl = meta.postgis_table
                        ? `/api/gishub/geojson/${meta.postgis_table}`
                        : `/api/gishub/wfs-proxy?typename=${encodeURIComponent(meta.layer_name)}&max_features=500`;

                    const res = await fetch(geojsonUrl);
                    const geojson = await res.json();

                    activeLayers[layerId] = L.geoJSON(geojson, {
                        pane: 'pointPane',
                        pointToLayer: (feat, latlng) => {
                            let fillColor = meta.color;
                            let radius = 6;
                            if (layerId === "laut_kecelakaanpelayaran_pt") radius = 5;

                            return L.circleMarker(latlng, {
                                radius: radius,
                                fillColor: fillColor,
                                color: "#ffffff",
                                weight: 1.5,
                                opacity: 1,
                                fillOpacity: layerOpacities[layerId] || 0.85
                            });
                        },
                        onEachFeature: (feat, layer) => {
                            const p = feat.properties || {};
                            const title = p.nama || p.nama_prov || p.nama_kapal || p.name || p.nama_stasi || p.NAMOBJ || meta.title;
                            layer.bindTooltip(title, { sticky: true });

                            layer.on("click", (e) => {
                                L.DomEvent.stopPropagation(e);
                                if (e.originalEvent && e.originalEvent.target && typeof e.originalEvent.target.blur === "function") {
                                    e.originalEvent.target.blur();
                                }
                                openDetailDrawer(feat, layer, meta);
                            });
                        }
                    }).addTo(map);

                } catch (e) {
                    console.warn(`Gagal load GeoJSON point untuk ${meta.layer_name}, fallback ke WMS:`, e);
                    loadWmsFallback(layerId, meta);
                }
            } else if (meta.type === "Polygon") {
                // B. POLIGON (AR): BATAS PROVINSI & KAWASAN
                if (meta.postgis_table) {
                    try {
                        const res = await fetch(`/api/gishub/geojson/${meta.postgis_table}`);
                        const geojson = await res.json();

                        activeLayers[layerId] = L.geoJSON(geojson, {
                            pane: 'polygonPane',
                            style: (feat) => {
                                return {
                                    color: meta.color,
                                    weight: meta.id === "penunjang_adm_prov_ar" ? 2 : 2.5,
                                    fillColor: meta.color,
                                    fillOpacity: layerOpacities[layerId] || 0.35,
                                    dashArray: meta.id === "penunjang_adm_prov_ar" ? "3" : null
                                };
                            },
                            onEachFeature: (feat, layer) => {
                                const p = feat.properties || {};
                                const title = p.nama || p.nama_prov || p.name || p.NAMOBJ || p.nama_stasi || meta.title;
                                layer.bindTooltip(title, { sticky: true });

                                layer.on("mouseover", () => {
                                    layer.setStyle({ weight: 4, fillOpacity: 0.6 });
                                });
                                layer.on("mouseout", () => {
                                    if (activeLayers[layerId]) activeLayers[layerId].resetStyle(layer);
                                });

                                layer.on("click", (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    // Hilangkan fokus bounding box kotak hitam bawaan browser
                                    if (e.originalEvent && e.originalEvent.target && typeof e.originalEvent.target.blur === "function") {
                                        e.originalEvent.target.blur();
                                    }
                                    openDetailDrawer(feat, layer, meta);
                                });
                            }
                        }).addTo(map);

                    } catch (e) {
                        console.warn(`Gagal load GeoJSON polygon untuk ${meta.layer_name}:`, e);
                        loadWmsFallback(layerId, meta);
                    }
                } else {
                    loadWmsFallback(layerId, meta);
                }
            } else {
                // C. LINESTRING (ALUR, REL, RUTE)
                loadWmsFallback(layerId, meta);
            }
        }

        updateActiveBadge();
        renderLegend();
    }

    function loadWmsFallback(layerId, meta) {
        let paneName = 'pointPane';
        if (meta.type === "Polygon") paneName = 'polygonPane';
        else if (meta.type === "LineString") paneName = 'linePane';

        activeLayers[layerId] = L.tileLayer.wms(GISHUB_OWS, {
            layers: meta.layer_name,
            styles: meta.layer_name, // Mengirim style eksplisit workspace:layer
            format: "image/png",
            transparent: true,
            opacity: layerOpacities[layerId] || 0.85,
            pane: paneName
        }).addTo(map);
    }

    function focusLayer(layerId) {
        const layer = activeLayers[layerId];
        if (!layer) return;

        if (layer.getBounds && typeof layer.getBounds === "function") {
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
                return;
            }
        }
        // Fallback default center
        map.setView([-2.0, 118.0], 5);
    }

    // 5. Filter Kategori dan Search Layer
    document.querySelectorAll(".category-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");

            const cat = pill.dataset.cat;
            document.querySelectorAll(".layer-card").forEach(card => {
                if (cat === "all" || card.dataset.category === cat) {
                    card.classList.remove("hidden");
                } else {
                    card.classList.add("hidden");
                }
            });
        });
    });

    document.getElementById("input-search-layer").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll(".layer-card").forEach(card => {
            const text = card.textContent.toLowerCase();
            if (text.includes(q)) {
                card.classList.remove("hidden");
            } else {
                card.classList.add("hidden");
            }
        });
    });

    function updateActiveBadge() {
        const count = Object.keys(activeLayers).length;
        document.getElementById("active-layers-badge").textContent = `${count} Aktif`;
    }

    // 6. Dynamic Legend Widget - SEMUA SIMBOL TITIK DIBUAT BULAT SEMPURNA
    function renderLegend() {
        const container = document.getElementById("legend-items");
        container.innerHTML = "";

        const activeKeys = Object.keys(activeLayers);
        if (activeKeys.length === 0) {
            container.innerHTML = `<div class="text-[11px] text-slate-500 italic">Tidak ada layer aktif.</div>`;
            return;
        }

        activeKeys.forEach(key => {
            const meta = layerMetadata[key];
            if (!meta) return;

            let symbolPreview = '';
            if (meta.type === "Point") {
                symbolPreview = `<span class="legend-symbol-round" style="background-color: ${meta.color}"></span>`;
            } else if (meta.type === "LineString") {
                symbolPreview = `<span class="legend-symbol-line" style="background-color: ${meta.color}"></span>`;
            } else if (meta.type === "Polygon") {
                symbolPreview = `<span class="legend-symbol-polygon" style="background-color: ${meta.color}40; border-color: ${meta.color}"></span>`;
            }

            const itemEl = document.createElement("div");
            itemEl.className = "flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0";
            itemEl.innerHTML = `
                <div class="flex items-center gap-2 font-medium text-slate-200">
                    ${symbolPreview}
                    <span class="truncate max-w-[190px]" title="${meta.title}">${meta.title}</span>
                </div>
                <span class="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 flex-shrink-0">${meta.type === "Point" ? "Bulat" : meta.type}</span>
            `;
            container.appendChild(itemEl);
        });
    }

    // 7. Drawer Detail Fitur
    let currentSelectedLayer = null;
    const detailDrawer = document.getElementById("detail-drawer");
    document.getElementById("btn-close-drawer").addEventListener("click", () => {
        detailDrawer.classList.add("translate-x-[110%]");
    });

    function openDetailDrawer(feat, layer, meta) {
        currentSelectedLayer = layer;
        const p = feat.properties;
        const titleEl = document.getElementById("detail-title");
        const badgeEl = document.getElementById("detail-badge");
        const contentEl = document.getElementById("detail-content");

        titleEl.textContent = p.nama || p.nama_prov || p.nama_kapal || p.name || p.nama_stasi || "Detail Fitur";
        badgeEl.textContent = meta.category;
        badgeEl.style.backgroundColor = `${meta.color}25`;
        badgeEl.style.color = meta.color;
        badgeEl.style.borderColor = `${meta.color}50`;

        let html = '<div class="space-y-2">';
        for (const [k, v] of Object.entries(p)) {
            if (k === "geom" || k === "layer_type") continue;
            html += `
                <div class="p-2 bg-slate-950/70 rounded-lg border border-slate-800">
                    <span class="text-[10px] text-slate-400 block uppercase font-mono">${k}</span>
                    <span class="text-xs font-semibold text-slate-200 break-words">${v !== null ? v : "-"}</span>
                </div>
            `;
        }
        html += '</div>';

        contentEl.innerHTML = html;
        detailDrawer.classList.remove("translate-x-[110%]");
    }

    document.getElementById("btn-zoom-to-feature").addEventListener("click", () => {
        if (currentSelectedLayer) {
            if (currentSelectedLayer.getBounds) {
                map.fitBounds(currentSelectedLayer.getBounds(), { padding: [50, 50] });
            } else if (currentSelectedLayer.getLatLng) {
                map.setView(currentSelectedLayer.getLatLng(), 12);
            }
        }
    });

    // 8. Bottom Attribute Table Drawer
    const tableDrawer = document.getElementById("table-drawer");
    document.getElementById("btn-toggle-table").addEventListener("click", () => {
        tableDrawer.classList.toggle("translate-y-full");
        if (!tableDrawer.classList.contains("translate-y-full")) {
            loadTableData(document.getElementById("table-layer-select").value);
        }
    });
    document.getElementById("btn-close-table").addEventListener("click", () => {
        tableDrawer.classList.add("translate-y-full");
    });
    document.getElementById("table-layer-select").addEventListener("change", (e) => {
        loadTableData(e.target.value);
    });

    async function loadTableData(tableName) {
        const countEl = document.getElementById("table-record-count");
        const container = document.getElementById("table-content-container");
        countEl.textContent = "Mengambil data...";
        container.innerHTML = `<div class="p-4 text-xs text-slate-400">Memuat data dari database PostGIS...</div>`;

        try {
            const res = await fetch(`/api/gishub/geojson/${tableName}?limit=100`);
            const data = await res.json();
            const feats = data.features || [];
            countEl.textContent = `${feats.length} Baris Data`;

            if (feats.length === 0) {
                container.innerHTML = `<div class="p-4 text-xs text-slate-400 italic">Tidak ada data.</div>`;
                return;
            }

            const keys = Object.keys(feats[0].properties).filter(k => k !== "layer_type");
            let tableHtml = '<table class="gishub-table"><thead><tr>';
            keys.forEach(k => tableHtml += `<th>${k.toUpperCase()}</th>`);
            tableHtml += '<th>AKSI</th></tr></thead><tbody>';

            feats.forEach(f => {
                tableHtml += '<tr>';
                keys.forEach(k => {
                    tableHtml += `<td>${f.properties[k] !== null ? f.properties[k] : "-"}</td>`;
                });
                if (f.geometry.type === "Point") {
                    tableHtml += `<td><button class="px-2 py-0.5 rounded bg-sky-600/30 text-sky-300 border border-sky-500/40 hover:bg-sky-600 hover:text-white transition" onclick="zoomToCoord(${f.geometry.coordinates[1]}, ${f.geometry.coordinates[0]})">Zoom</button></td>`;
                } else {
                    tableHtml += `<td><span class="text-slate-500 text-[10px]">Poligon</span></td>`;
                }
                tableHtml += '</tr>';
            });

            tableHtml += '</tbody></table>';
            container.innerHTML = tableHtml;

        } catch (e) {
            container.innerHTML = `<div class="p-4 text-xs text-rose-400">Gagal memuat tabel: ${e.message}</div>`;
        }
    }

    window.zoomToCoord = (lat, lng) => {
        map.setView([lat, lng], 12);
    };

    // 9. PostGIS Spatial Analysis (ST_DWithin & ST_Distance) DENGAN FITUR RESET LENGKAP
    let bufferCircleLayer = null;
    let incidentHighlightLayer = null;

    async function populateSpatialPortDropdown() {
        try {
            const res = await fetch("/api/gishub/geojson/pelabuhan?limit=250");
            const data = await res.json();
            const select = document.getElementById("select-port-spatial");
            select.innerHTML = '<option value="">-- Pilih Pelabuhan Acuan --</option>';

            data.features.forEach(f => {
                const opt = document.createElement("option");
                opt.value = f.id;
                opt.textContent = `${f.properties.nama || "Pelabuhan"} (${f.properties.kode || "-"})`;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error("Gagal populate dropdown pelabuhan:", e);
        }
    }

    const radiusSlider = document.getElementById("input-radius-km");
    radiusSlider.addEventListener("input", (e) => {
        document.getElementById("radius-val").textContent = `${e.target.value} km`;
    });

    // FUNGSI BERSIHKAN / RESET ANALISIS SPASIAL
    function clearSpatialAnalysis() {
        if (bufferCircleLayer) {
            map.removeLayer(bufferCircleLayer);
            bufferCircleLayer = null;
        }
        if (incidentHighlightLayer) {
            map.removeLayer(incidentHighlightLayer);
            incidentHighlightLayer = null;
        }

        const box = document.getElementById("spatial-results-box");
        box.classList.add("hidden");
        document.getElementById("spatial-results-items").innerHTML = "";
        document.getElementById("spatial-results-count").textContent = "0 Insiden";
        document.getElementById("select-port-spatial").value = "";

        // Sembunyikan floating clear badge jika ada
        const floatingBadge = document.getElementById("floating-analysis-badge");
        if (floatingBadge) floatingBadge.remove();

        map.setView([-2.0, 118.0], 5);
    }

    // Tombol Reset Analisis di Sidebar
    const btnResetSpatial = document.getElementById("btn-reset-spatial");
    if (btnResetSpatial) {
        btnResetSpatial.addEventListener("click", clearSpatialAnalysis);
    }

    // Tombol Eksekusi Analisis Spasial
    document.getElementById("btn-run-spatial-buffer").addEventListener("click", async () => {
        const portId = document.getElementById("select-port-spatial").value;
        const radiusKm = radiusSlider.value;

        if (!portId) {
            alert("Silakan pilih pelabuhan acuan terlebih dahulu.");
            return;
        }

        try {
            const res = await fetch(`/api/spatial/accidents-near-port?port_id=${portId}&radius_km=${radiusKm}`);
            const data = await res.json();

            // Tampilkan hasil di sidebar
            const box = document.getElementById("spatial-results-box");
            const countEl = document.getElementById("spatial-results-count");
            const listEl = document.getElementById("spatial-results-items");

            box.classList.remove("hidden");
            countEl.textContent = `${data.accidents_list.length} Insiden`;
            listEl.innerHTML = "";

            if (data.accidents_list.length === 0) {
                listEl.innerHTML = `<div class="p-2 text-slate-400 italic">Tidak ada catatan kecelakaan kapal dalam radius ${radiusKm} km dari pelabuhan ini.</div>`;
            } else {
                data.accidents_list.forEach(item => {
                    const el = document.createElement("div");
                    el.className = "p-2 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between";
                    el.innerHTML = `
                        <div>
                            <div class="font-bold text-slate-100">${item.nama_kapal || "Kapal"}</div>
                            <div class="text-[10px] text-slate-400">${item.lokasi || "-"} (${item.tahun || "-"})</div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-mono font-bold text-amber-400">${item.jarak_km} km</span>
                            <span class="block text-[9px] text-rose-300 font-semibold uppercase">${item.kategori || "Insiden"}</span>
                        </div>
                    `;
                    listEl.appendChild(el);
                });
            }

            // Gambarkan buffer spasial di peta
            if (bufferCircleLayer) map.removeLayer(bufferCircleLayer);
            if (incidentHighlightLayer) map.removeLayer(incidentHighlightLayer);

            const portCoord = [data.port_lat, data.port_lon];
            bufferCircleLayer = L.circle(portCoord, {
                radius: radiusKm * 1000,
                color: "#f59e0b",
                fillColor: "#fbbf24",
                fillOpacity: 0.15,
                weight: 2,
                dashArray: "4",
                pane: 'polygonPane'
            }).addTo(map);

            // Highlight insiden
            incidentHighlightLayer = L.layerGroup();
            data.accidents_list.forEach(item => {
                const marker = L.circleMarker([item.lat, item.lon], {
                    radius: 7,
                    fillColor: "#ef4444",
                    color: "#ffffff",
                    weight: 2,
                    fillOpacity: 1,
                    pane: 'pointPane'
                }).bindPopup(`<b>${item.nama_kapal}</b><br>Kategori: ${item.kategori}<br>Jarak ke pelabuhan: ${item.jarak_km} km`);
                incidentHighlightLayer.addLayer(marker);
            });
            incidentHighlightLayer.addTo(map);

            // Tambahkan Floating Clear Button di pojok peta
            let floatingBadge = document.getElementById("floating-analysis-badge");
            if (!floatingBadge) {
                floatingBadge = document.createElement("div");
                floatingBadge.id = "floating-analysis-badge";
                floatingBadge.className = "absolute top-4 left-16 z-20 bg-amber-950/90 text-amber-300 border border-amber-500/40 text-xs px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 backdrop-blur";
                document.querySelector("main").appendChild(floatingBadge);
            }
            floatingBadge.innerHTML = `
                <span><i class="fa-solid fa-radar mr-1"></i> Analisis Aktif: Radius ${radiusKm} km</span>
                <button class="bg-rose-600 hover:bg-rose-500 text-white rounded px-2 py-0.5 text-[10px] font-bold transition" id="btn-floating-clear-analysis">
                    Hapus
                </button>
            `;
            document.getElementById("btn-floating-clear-analysis").addEventListener("click", clearSpatialAnalysis);

            map.fitBounds(bufferCircleLayer.getBounds(), { padding: [50, 50] });

        } catch (e) {
            console.error("Gagal analisis spasial buffer:", e);
        }
    });

    // 10. Dashboard Stats & Charts (Chart.js) dengan Fitur Cek List Sendiri-Sendiri
    let chartKecelakaan = null;
    let chartBandara = null;
    let statChecklistInitialized = false;

    function initStatChecklist() {
        if (statChecklistInitialized) return;
        statChecklistInitialized = true;

        const statConfig = [
            { chk: "chk-stat-kapal", sec: "section-stat-kapal" },
            { chk: "chk-stat-bandara", sec: "section-stat-bandara" },
            { chk: "chk-stat-kereta", sec: "section-stat-kereta" },
            { chk: "chk-stat-sdm", sec: "section-stat-sdm" }
        ];

        statConfig.forEach(item => {
            const elChk = document.getElementById(item.chk);
            const elSec = document.getElementById(item.sec);
            if (elChk && elSec) {
                elChk.addEventListener("change", () => {
                    if (elChk.checked) {
                        elSec.classList.remove("hidden");
                    } else {
                        elSec.classList.add("hidden");
                    }
                });
            }
        });

        const btnAll = document.getElementById("btn-stat-check-all");
        if (btnAll) {
            btnAll.addEventListener("click", () => {
                statConfig.forEach(item => {
                    const elChk = document.getElementById(item.chk);
                    const elSec = document.getElementById(item.sec);
                    if (elChk && elSec) {
                        elChk.checked = true;
                        elSec.classList.remove("hidden");
                    }
                });
            });
        }

        const btnReset = document.getElementById("btn-stat-uncheck-all");
        if (btnReset) {
            btnReset.addEventListener("click", () => {
                statConfig.forEach((item, idx) => {
                    const elChk = document.getElementById(item.chk);
                    const elSec = document.getElementById(item.sec);
                    if (elChk && elSec) {
                        // Sisakan kapal aktif saat reset
                        elChk.checked = (idx === 0);
                        if (idx === 0) elSec.classList.remove("hidden");
                        else elSec.classList.add("hidden");
                    }
                });
            });
        }
    }

    async function loadStatsCharts() {
        initStatChecklist();

        try {
            const res = await fetch("/api/gishub/stats");
            const data = await res.json();

            // Set KPI
            if (document.getElementById("kpi-pelabuhan")) document.getElementById("kpi-pelabuhan").textContent = data.totals.total_pelabuhan || 300;
            if (document.getElementById("kpi-bandara")) document.getElementById("kpi-bandara").textContent = data.totals.total_bandara || 254;
            if (document.getElementById("kpi-stasiun")) document.getElementById("kpi-stasiun").textContent = data.totals.total_stasiun || 288;
            if (document.getElementById("kpi-kecelakaan")) document.getElementById("kpi-kecelakaan").textContent = data.totals.total_kecelakaan || 214;
            if (document.getElementById("kpi-sekolah")) document.getElementById("kpi-sekolah").textContent = data.totals.total_sekolah || 37;

            // Chart 1: Kategori Kecelakaan Laut
            const elChart1 = document.getElementById("chart-kecelakaan");
            if (elChart1) {
                const ctx1 = elChart1.getContext("2d");
                if (chartKecelakaan) chartKecelakaan.destroy();

                chartKecelakaan = new Chart(ctx1, {
                    type: "doughnut",
                    data: {
                        labels: data.accident_categories.map(x => x.kategori),
                        datasets: [{
                            data: data.accident_categories.map(x => x.count),
                            backgroundColor: ["#ef4444", "#f97316", "#eab308", "#06b6d4", "#8b5cf6", "#64748b"],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: "right", labels: { color: "#cbd5e1", font: { size: 10 } } }
                        }
                    }
                });
            }

            // Chart 2: Bandara per Provinsi
            const elChart2 = document.getElementById("chart-bandara-prov");
            if (elChart2) {
                const ctx2 = elChart2.getContext("2d");
                if (chartBandara) chartBandara.destroy();

                chartBandara = new Chart(ctx2, {
                    type: "bar",
                    data: {
                        labels: data.airports_by_prov.map(x => x.provinsi.replace("Provinsi ", "")),
                        datasets: [{
                            label: "Bandara",
                            data: data.airports_by_prov.map(x => x.count),
                            backgroundColor: "rgba(139, 92, 246, 0.7)",
                            borderColor: "#8b5cf6",
                            borderWidth: 1,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { display: false } },
                            y: { ticks: { color: "#94a3b8", font: { size: 9 } }, grid: { color: "rgba(51, 65, 85, 0.4)" } }
                        }
                    }
                });
            }

        } catch (e) {
            console.error("Gagal load charts:", e);
        }
    }

    // Inisialisasi awal
    loadCatalog();
});
