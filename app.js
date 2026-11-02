// WebGIS Terintegrasi Data Lokal GISHUB Kemenhub (24 Dataset Lengkap)
function initWebGIS() {
    function resolveDataUrl(path) {
        if (window.location.protocol === "file:" || !window.location.origin || window.location.origin === "null") {
            return "https://rendy1c3-a11y.github.io/WebGISHub1/" + path;
        }
        return path;
    }

    // 1. Inisialisasi Peta Leaflet
    const map = L.map("map", {
        center: [-2.0, 118.0],
        zoom: 5,
        zoomControl: false,
        attributionControl: false
    });

    L.control.zoom({ position: "topleft" }).addTo(map);

    // Custom panes agar poligon, garis, dan titik tersusun bertingkat dengan benar
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

    // 2. State & In-Memory Cache
    const activeLayers = {}; // id -> L.GeoJSON
    const layerMetadata = {};
    const layerOpacities = {};
    const geojsonCache = {}; // id -> GeoJSON Object (cache lokal)
    let catalogData = [];

    // Helper untuk mengambil GeoJSON lokal
    async function getLocalGeoJSON(layerId) {
        if (geojsonCache[layerId]) {
            return geojsonCache[layerId];
        }
        let url = resolveDataUrl(`data/${layerId}.geojson`);
        let res;
        try {
            res = await fetch(url);
        } catch (e) {
            res = await fetch(`https://rendy1c3-a11y.github.io/WebGISHub1/data/${layerId}.geojson`);
        }
        if (!res || !res.ok) {
            res = await fetch(`https://rendy1c3-a11y.github.io/WebGISHub1/data/${layerId}.geojson`);
        }
        if (!res.ok) {
            throw new Error(`Gagal membaca data/${layerId}.geojson (HTTP ${res.status})`);
        }
        const data = await res.json();
        geojsonCache[layerId] = data;
        return data;
    }

    // 3. Load Katalog Lengkap 24 Dataset
    async function loadCatalog() {
        try {
            if (typeof EMBEDDED_CATALOG !== "undefined" && Array.isArray(EMBEDDED_CATALOG) && EMBEDDED_CATALOG.length) {
                catalogData = EMBEDDED_CATALOG;
            } else {
                let url = resolveDataUrl("catalog.json");
                let res;
                try {
                    res = await fetch(url);
                } catch(e) {
                    res = await fetch("https://rendy1c3-a11y.github.io/WebGISHub1/catalog.json");
                }
                catalogData = await res.json();
            }

            renderCatalogList(catalogData);
            populateSpatialPortDropdown();

            // Aktifkan default layers secara lokal
            for (const item of catalogData) {
                if (item.active) {
                    await toggleLayer(item.id, true);
                }
            }
            updateActiveBadge();
            renderLegend();
        } catch (e) {
            console.error("Gagal muat katalog:", e);
        }
    }

    function renderCatalogList(items) {
        const container = document.getElementById("catalog-layers-container");
        container.innerHTML = "";

        items.forEach(item => {
            layerMetadata[item.id] = item;
            layerOpacities[item.id] = layerOpacities[item.id] || (item.type === "Polygon" ? 0.35 : 0.85);

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
                if (activeLayers[item.id] && activeLayers[item.id].setStyle) {
                    if (item.type === "Polygon") {
                        activeLayers[item.id].setStyle({ fillOpacity: val, opacity: Math.min(val + 0.3, 1) });
                    } else {
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
                setTimeout(() => focusLayer(item.id), 300);
            });
        });
    }

    // 4. Toggle Layer (100% Akses Data Lokal GeoJSON, Titik Bulat, Bebas Kotak Fokus)
    async function toggleLayer(layerId, enable) {
        const meta = layerMetadata[layerId];
        if (!meta) return;

        if (!enable) {
            if (activeLayers[layerId]) {
                map.removeLayer(activeLayers[layerId]);
                delete activeLayers[layerId];
            }
        } else {
            try {
                const geojson = await getLocalGeoJSON(layerId);

                if (meta.type === "Point") {
                    // TITIK (POINT): Render bulat sempurna L.circleMarker, warna solid, outline putih
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

                } else if (meta.type === "Polygon") {
                    // POLIGON (AR): Batas Provinsi, Kawasan Pelabuhan, Stasiun, Bandara
                    activeLayers[layerId] = L.geoJSON(geojson, {
                        pane: 'polygonPane',
                        style: (feat) => {
                            return {
                                color: meta.color,
                                weight: layerId === "penunjang_adm_prov_ar" ? 1.8 : 2.2,
                                fillColor: meta.color,
                                fillOpacity: layerOpacities[layerId] || 0.35,
                                dashArray: layerId === "penunjang_adm_prov_ar" ? "3" : null
                            };
                        },
                        onEachFeature: (feat, layer) => {
                            const p = feat.properties || {};
                            const title = p.nama || p.nama_prov || p.name || p.NAMOBJ || p.nama_stasi || meta.title;
                            layer.bindTooltip(title, { sticky: true });

                            layer.on("mouseover", () => {
                                layer.setStyle({ weight: 3.5, fillOpacity: 0.6 });
                            });
                            layer.on("mouseout", () => {
                                if (activeLayers[layerId]) activeLayers[layerId].resetStyle(layer);
                            });

                            layer.on("click", (e) => {
                                L.DomEvent.stopPropagation(e);
                                if (e.originalEvent && e.originalEvent.target && typeof e.originalEvent.target.blur === "function") {
                                    e.originalEvent.target.blur();
                                }
                                openDetailDrawer(feat, layer, meta);
                            });
                        }
                    }).addTo(map);

                } else {
                    // LINESTRING (LN): Alur Pelayaran, Rel KA Barang, Rute Penerbangan
                    activeLayers[layerId] = L.geoJSON(geojson, {
                        pane: 'linePane',
                        style: {
                            color: meta.color || '#38bdf8',
                            weight: 2.5,
                            opacity: layerOpacities[layerId] || 0.85
                        },
                        onEachFeature: (feat, layer) => {
                            const p = feat.properties || {};
                            const title = p.nama || p.rute || p.nama_jalur || p.trayek || p.NAMOBJ || meta.title;
                            layer.bindTooltip(title, { sticky: true });

                            layer.on("mouseover", () => {
                                layer.setStyle({ weight: 4.5, opacity: 1 });
                            });
                            layer.on("mouseout", () => {
                                if (activeLayers[layerId]) activeLayers[layerId].resetStyle(layer);
                            });

                            layer.on("click", (e) => {
                                L.DomEvent.stopPropagation(e);
                                if (e.originalEvent && e.originalEvent.target && typeof e.originalEvent.target.blur === "function") {
                                    e.originalEvent.target.blur();
                                }
                                openDetailDrawer(feat, layer, meta);
                            });
                        }
                    }).addTo(map);
                }

            } catch (e) {
                console.error(`Gagal render layer lokal ${layerId}:`, e);
            }
        }

        updateActiveBadge();
        renderLegend();
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

    // 6. Dynamic Legend Widget - SIMBOL TITIK BULAT SEMPURNA
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
        const p = feat.properties || {};
        const titleEl = document.getElementById("detail-title");
        const badgeEl = document.getElementById("detail-badge");
        const contentEl = document.getElementById("detail-content");

        titleEl.textContent = p.nama || p.nama_prov || p.nama_kapal || p.name || p.nama_stasi || meta.title;
        badgeEl.textContent = meta.category;
        badgeEl.style.backgroundColor = `${meta.color}25`;
        badgeEl.style.color = meta.color;
        badgeEl.style.borderColor = `${meta.color}50`;

        let html = '<div class="space-y-2">';
        for (const [k, v] of Object.entries(p)) {
            if (k === "geom" || k === "shape" || k === "layer_type") continue;
            html += `
                <div class="p-2 bg-slate-950/70 rounded-lg border border-slate-800">
                    <span class="text-[10px] text-slate-400 block uppercase font-mono">${k}</span>
                    <span class="text-xs font-semibold text-slate-200 break-words">${v !== null && v !== undefined ? v : "-"}</span>
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

    // 8. Bottom Attribute Table Drawer (Akses 100% Data Lokal)
    const tableMapping = {
        pelabuhan: "laut_pelabuhan_pt_new",
        bandara: "udara_airport_pt",
        stasiun: "kereta_stasiunka_ar",
        kecelakaan: "laut_kecelakaanpelayaran_pt",
        sekolah: "bpsdmp_sekolah_pt"
    };

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
        container.innerHTML = `<div class="p-4 text-xs text-slate-400">Memuat data dari file GeoJSON lokal...</div>`;

        const targetId = tableMapping[tableName] || tableName;

        try {
            const data = await getLocalGeoJSON(targetId);
            const allFeats = data.features || [];
            const feats = allFeats.slice(0, 100);
            countEl.textContent = `${feats.length} Baris Data (dari total ${allFeats.length})`;

            if (feats.length === 0) {
                container.innerHTML = `<div class="p-4 text-xs text-slate-400 italic">Tidak ada data.</div>`;
                return;
            }

            const keys = Object.keys(feats[0].properties || {}).filter(k => k !== "geom" && k !== "shape" && k !== "layer_type").slice(0, 7);
            let tableHtml = '<table class="gishub-table"><thead><tr>';
            keys.forEach(k => tableHtml += `<th>${k.toUpperCase()}</th>`);
            tableHtml += '<th>AKSI</th></tr></thead><tbody>';

            feats.forEach(f => {
                tableHtml += '<tr>';
                keys.forEach(k => {
                    const val = f.properties[k];
                    tableHtml += `<td>${val !== null && val !== undefined ? val : "-"}</td>`;
                });
                if (f.geometry && f.geometry.type === "Point") {
                    tableHtml += `<td><button class="px-2 py-0.5 rounded bg-sky-600/30 text-sky-300 border border-sky-500/40 hover:bg-sky-600 hover:text-white transition" onclick="zoomToCoord(${f.geometry.coordinates[1]}, ${f.geometry.coordinates[0]})">Zoom</button></td>`;
                } else {
                    tableHtml += `<td><span class="text-slate-500 text-[10px]">${f.geometry ? f.geometry.type : 'Fitur'}</span></td>`;
                }
                tableHtml += '</tr>';
            });

            tableHtml += '</tbody></table>';
            container.innerHTML = tableHtml;

        } catch (e) {
            container.innerHTML = `<div class="p-4 text-xs text-rose-400">Gagal memuat tabel lokal: ${e.message}</div>`;
        }
    }

    window.zoomToCoord = (lat, lng) => {
        map.setView([lat, lng], 12);
    };

    // 9. Analisis Spasial Buffer (100% Client-Side Geodesic Haversine Formula)
    let bufferCircleLayer = null;
    let incidentHighlightLayer = null;
    let portsCache = null;
    let accidentsCache = null;

    // Haversine formula (km)
    function calcDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async function populateSpatialPortDropdown() {
        try {
            portsCache = await getLocalGeoJSON("laut_pelabuhan_pt_new");
            const select = document.getElementById("select-port-spatial");
            select.innerHTML = '<option value="">-- Pilih Pelabuhan Acuan --</option>';

            const sortedFeats = [...(portsCache.features || [])].sort((a, b) => {
                const nameA = (a.properties.nama || "").toLowerCase();
                const nameB = (b.properties.nama || "").toLowerCase();
                return nameA.localeCompare(nameB);
            });

            sortedFeats.forEach(f => {
                const opt = document.createElement("option");
                const p = f.properties || {};
                const coord = f.geometry ? f.geometry.coordinates : [0, 0];
                opt.value = p.objectid || p.id || p.kode || p.nama;
                opt.dataset.lat = coord[1];
                opt.dataset.lon = coord[0];
                opt.textContent = `${p.nama || "Pelabuhan"} (${p.provinsi || p.kode || "-"})`;
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

    // Reset Analisis Spasial
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

        const floatingBadge = document.getElementById("floating-analysis-badge");
        if (floatingBadge) floatingBadge.remove();

        map.setView([-2.0, 118.0], 5);
    }

    const btnResetSpatial = document.getElementById("btn-reset-spatial");
    if (btnResetSpatial) {
        btnResetSpatial.addEventListener("click", clearSpatialAnalysis);
    }

    // Eksekusi Analisis Spasial
    document.getElementById("btn-run-spatial-buffer").addEventListener("click", async () => {
        const select = document.getElementById("select-port-spatial");
        const portVal = select.value;
        const radiusKm = parseFloat(radiusSlider.value);

        if (!portVal) {
            alert("Silakan pilih pelabuhan acuan terlebih dahulu.");
            return;
        }

        const selectedOpt = select.options[select.selectedIndex];
        const portLat = parseFloat(selectedOpt.dataset.lat);
        const portLon = parseFloat(selectedOpt.dataset.lon);

        if (isNaN(portLat) || isNaN(portLon)) {
            alert("Koordinat pelabuhan tidak ditemukan.");
            return;
        }

        try {
            accidentsCache = await getLocalGeoJSON("laut_kecelakaanpelayaran_pt");
            const nearbyAccidents = [];

            (accidentsCache.features || []).forEach(f => {
                if (!f.geometry || !f.geometry.coordinates) return;
                const aLon = f.geometry.coordinates[0];
                const aLat = f.geometry.coordinates[1];
                const dist = calcDistanceKm(portLat, portLon, aLat, aLon);
                if (dist <= radiusKm) {
                    const p = f.properties || {};
                    nearbyAccidents.push({
                        nama_kapal: p.nama_kapal || "Kapal",
                        lokasi: p.lokasi || "-",
                        tahun: p.tahun || "-",
                        jarak_km: parseFloat(dist.toFixed(1)),
                        kategori: p.kategori || "Insiden",
                        lat: aLat,
                        lon: aLon
                    });
                }
            });

            nearbyAccidents.sort((a, b) => a.jarak_km - b.jarak_km);

            // Tampilkan hasil di sidebar
            const box = document.getElementById("spatial-results-box");
            const countEl = document.getElementById("spatial-results-count");
            const listEl = document.getElementById("spatial-results-items");

            box.classList.remove("hidden");
            countEl.textContent = `${nearbyAccidents.length} Insiden`;
            listEl.innerHTML = "";

            if (nearbyAccidents.length === 0) {
                listEl.innerHTML = `<div class="p-2 text-slate-400 italic">Tidak ada catatan kecelakaan kapal dalam radius ${radiusKm} km dari pelabuhan ini.</div>`;
            } else {
                nearbyAccidents.forEach(item => {
                    const el = document.createElement("div");
                    el.className = "p-2 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between";
                    el.innerHTML = `
                        <div>
                            <div class="font-bold text-slate-100">${item.nama_kapal}</div>
                            <div class="text-[10px] text-slate-400">${item.lokasi} (${item.tahun})</div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-mono font-bold text-amber-400">${item.jarak_km} km</span>
                            <span class="block text-[9px] text-rose-300 font-semibold uppercase">${item.kategori}</span>
                        </div>
                    `;
                    listEl.appendChild(el);
                });
            }

            // Gambarkan buffer spasial di peta
            if (bufferCircleLayer) map.removeLayer(bufferCircleLayer);
            if (incidentHighlightLayer) map.removeLayer(incidentHighlightLayer);

            const portCoord = [portLat, portLon];
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
            nearbyAccidents.forEach(item => {
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

            // Floating Clear Button di pojok peta
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

    // 10. Dashboard Stats & Charts (Chart.js) dengan Fitur Checklist Mandiri
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
            let res;
            try {
                res = await fetch(resolveDataUrl("data/stats.json"));
            } catch(e) {
                res = await fetch("https://rendy1c3-a11y.github.io/WebGISHub1/data/stats.json");
            }
            if (!res || !res.ok) {
                res = await fetch("https://rendy1c3-a11y.github.io/WebGISHub1/data/stats.json");
            }
            const data = await res.json();

            // Set KPI
            if (document.getElementById("kpi-pelabuhan")) document.getElementById("kpi-pelabuhan").textContent = data.totals.total_pelabuhan || 500;
            if (document.getElementById("kpi-bandara")) document.getElementById("kpi-bandara").textContent = data.totals.total_bandara || 257;
            if (document.getElementById("kpi-stasiun")) document.getElementById("kpi-stasiun").textContent = data.totals.total_stasiun || 471;
            if (document.getElementById("kpi-kecelakaan")) document.getElementById("kpi-kecelakaan").textContent = data.totals.total_kecelakaan || 215;
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
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWebGIS);
} else {
    initWebGIS();
}