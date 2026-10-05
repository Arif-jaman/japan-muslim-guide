// Halal Restaurant Japan – map script
// Leaflet + MapLibre (OpenFreeMap base map) + Overpass API. No API key needed.
// Your location stays in the browser; it is never stored or sent to our servers.

const map = L.map('map').setView([35.6762, 139.6503], 12);

// Base map: OpenFreeMap (free, no key). Does not use tile.openstreetmap.org.
if (typeof L.maplibreGL === 'function') {
    L.maplibreGL({
        style: 'https://tiles.openfreemap.org/styles/liberty',
        attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);
} else {
    console.error('maplibre-gl-leaflet is not loaded. Check the <script> tags in index.html.');
}

// ---------- Categories ----------
const CAT = {
    mosque:     { icon: '🕌', color: '#2a9d8f', label: 'Mosque' },
    restaurant: { icon: '🍽️', color: '#e63946', label: 'Halal Restaurant' },
    prayer:     { icon: '🙏', color: '#7c3aed', label: 'Prayer Room' }
};
const pinIcon = c => L.divIcon({
    className: '', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28],
    html: `<div class="pin" style="background:${CAT[c].color}"><span>${CAT[c].icon}</span></div>`
});
const userIcon = L.divIcon({
    className: '', iconSize: [16, 16], iconAnchor: [8, 8],
    html: '<div style="width:16px;height:16px;border-radius:50%;background:#1d9bf0;border:3px solid white;box-shadow:0 0 0 6px rgba(29,155,240,0.3);"></div>'
});

// ---------- Your own listed places (shown until a search replaces them) ----------
const listed = [
    { name: 'Halal Ramen Asakusa',   lat: 35.7148, lng: 139.7967, cat: 'restaurant' },
    { name: 'Halal Sushi Tokyo',     lat: 35.6938, lng: 139.7034, cat: 'restaurant' },
    { name: 'Gyumon Halal Yakiniku', lat: 35.7295, lng: 139.7109, cat: 'restaurant' },
    { name: 'Tokyo Camii Mosque',    lat: 35.6553, lng: 139.6853, cat: 'mosque' }
].map((p, i) => ({ ...p, id: 'listed' + i, addr: '', tags: {} }));

// ---------- State ----------
let places = [...listed], me = null, filter = 'all', query = '', radiusKm = 5;
let userMarker = null, accuracyCircle = null, watchId = null, centered = false;
const cache = new Map();
const cluster = L.markerClusterGroup({ chunkedLoading: true }).addTo(map);
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function setStatus(text, isErr) {
    const el = $('location-status');
    el.textContent = text;
    el.className = isErr ? 'err' : '';
}

// ---------- Distance ----------
function dist(a, b, c, d) {
    const R = 6371000, r = x => x * Math.PI / 180;
    const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}
const fmt = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

// ---------- Live location ----------
function startTracking() {
    if (!('geolocation' in navigator)) return setStatus('This browser does not support location.', true);
    if (watchId !== null) return;
    setStatus('Finding your location...');
    watchId = navigator.geolocation.watchPosition(onPos, onGeoError,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
function onPos(pos) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    if (!isFinite(lat) || !isFinite(lng)) return setStatus('Invalid location data received.', true);
    me = { lat, lng };
    if (!userMarker) {
        userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        accuracyCircle = L.circle([lat, lng], { radius: accuracy, color: '#1d9bf0', weight: 1, fillOpacity: 0.1, interactive: false }).addTo(map);
    } else {
        glide(userMarker, [lat, lng]);
        accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
    }
    userMarker.bindPopup(`<b>📍 My Location</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}<br>Accuracy: ${Math.round(accuracy)} m`);
    setStatus(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)} (accuracy ±${Math.round(accuracy)} m)`);
    if (!centered) { centered = true; map.setView([lat, lng], 15); }
    render();
}
function onGeoError(err) {
    const msg = {
        1: 'Location permission denied. Allow it in your browser settings, then tap My Location.',
        2: 'Location unavailable. Check that GPS is on.',
        3: 'Location request timed out. Please try again.'
    }[err.code] || 'Could not get your location.';
    setStatus(msg, true);
    if (err.code === 1 && watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
}
function glide(marker, to) { // smooth movement
    const from = marker.getLatLng(), t0 = performance.now();
    (function step(now) {
        const k = Math.min((now - t0) / 600, 1);
        marker.setLatLng([from.lat + (to[0] - from.lat) * k, from.lng + (to[1] - from.lng) * k]);
        if (k < 1) requestAnimationFrame(step);
    })(t0);
}

// ---------- Nearby search (Overpass) ----------
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
async function searchNearby() {
    if (!me) { startTracking(); return setStatus('Share your location first, then tap Search Near Me.', true); }
    if (!navigator.onLine) return setStatus('No internet connection.', true);
    // Rounded to ~1 km so your exact position is never sent
    const la = (Math.round(me.lat * 100) / 100).toFixed(2), lo = (Math.round(me.lng * 100) / 100).toFixed(2);
    const key = `${la},${lo},${radiusKm}`, hit = cache.get(key);
    if (hit && Date.now() - hit.t < 600000) { places = hit.d; render(); return reportCount(); }

    setStatus('Searching nearby places...');
    const a = `(around:${radiusKm * 1000 + 1000},${la},${lo})`;
    const ql = `[out:json][timeout:25];(
        nwr["amenity"="place_of_worship"]["religion"="muslim"]${a};
        nwr["amenity"~"restaurant|fast_food"]["diet:halal"]${a};
        nwr["amenity"="prayer_room"]${a};
        nwr["room"="prayer"]${a};
    );out center tags 400;`;
    let json = null;
    for (const url of ENDPOINTS) {
        try {
            const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(ql) });
            if (res.ok) { json = await res.json(); break; }
        } catch (e) { /* try next server */ }
    }
    if (!json) return setStatus('The place search service is busy or unavailable. Please try again shortly.', true);
    places = (json.elements || []).map(parse).filter(Boolean);
    cache.set(key, { t: Date.now(), d: places });
    render();
    reportCount();
}
function parse(el) {
    const tg = el.tags || {}, lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
    if (!isFinite(lat) || !isFinite(lng)) return null;
    let cat = null;
    if (tg.amenity === 'prayer_room' || tg.room === 'prayer') cat = 'prayer';
    else if (tg.amenity === 'place_of_worship' && tg.religion === 'muslim') cat = 'mosque';
    else if (tg['diet:halal']) cat = 'restaurant';
    if (!cat) return null;
    return {
        id: el.type + el.id, cat, lat, lng, tags: tg,
        name: tg['name:en'] || tg.name || '(Unnamed)',
        addr: [tg['addr:postcode'], tg['addr:city'], tg['addr:suburb'], tg['addr:street'], tg['addr:housenumber']].filter(Boolean).join(' ')
    };
}
function reportCount() {
    const v = visible();
    if (!v.length) return setStatus('No places found. Try a larger distance.', true);
    const notes = [];
    if (!v.some(p => p.cat === 'mosque')) notes.push('No mosques found nearby.');
    if (!v.some(p => p.cat === 'restaurant')) notes.push('No halal restaurants found nearby.');
    setStatus(`${v.length} places found within ${radiusKm} km. ${notes.join(' ')}`);
}

// ---------- Render ----------
function visible() {
    const q = query.trim().toLowerCase();
    return places
        .filter(p => (filter === 'all' || p.cat === filter) && (!q || p.name.toLowerCase().includes(q)))
        .map(p => ({ ...p, d: me ? dist(me.lat, me.lng, p.lat, p.lng) : null }))
        .filter(p => p.d === null || p.d <= radiusKm * 1000)
        .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
}
function render() {
    cluster.clearLayers();
    cluster.addLayers(visible().map(p => {
        const m = L.marker([p.lat, p.lng], { icon: pinIcon(p.cat), title: p.name });
        m.on('click', () => showSheet(p));
        return m;
    }));
}

// ---------- Detail card ----------
function showSheet(p) {
    const t = p.tags, dest = `${p.lat},${p.lng}`;
    const row = (l, v) => v ? `<p class="meta"><b>${l}:</b> ${v}</p>` : '';
    const url = t.website || t['contact:website'], tel = t.phone || t['contact:phone'];
    let halal = '';
    if (p.cat === 'restaurant') {
        const h = t['diet:halal'];
        halal = h === 'only' ? '<p class="meta">✅ Tagged as fully halal on OpenStreetMap (not an official certificate)</p>'
              : h === 'yes' ? '<p class="meta">☑️ Tagged as having halal options (not certified)</p>'
              : h === 'no' ? '<p class="meta warn">⚠️ Not halal</p>'
              : '<p class="meta warn">⚠️ Halal information not verified</p>';
    }
    $('sheet-body').innerHTML = `
        <h3>${CAT[p.cat].icon} ${esc(p.name)}</h3>
        <p class="meta">${CAT[p.cat].label}${p.d != null ? ' · ' + fmt(p.d) : ''}</p>
        ${row('Address', esc(p.addr || 'Not available'))}
        ${row('Phone', tel ? `<a href="tel:${esc(tel)}">${esc(tel)}</a>` : '')}
        ${row('Opening hours', t.opening_hours ? esc(t.opening_hours) : '')}
        ${row('Website', url ? `<a href="${esc(/^https?:/i.test(url) ? url : 'https://' + url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>` : '')}
        ${halal}
        <div class="acts">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" rel="noopener noreferrer">Get Directions</a>
            ${p.cat === 'restaurant' ? `<a class="alt" href="https://www.google.com/maps/search/?api=1&query=${dest}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` : ''}
        </div>`;
    $('sheet').hidden = false;
}

// ---------- Events ----------
const debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };
$('location-btn').onclick = () => {
    if (me) map.flyTo([me.lat, me.lng], 16); else startTracking();
};
$('near-btn').onclick = searchNearby;
$('radius').onchange = e => { radiusKm = +e.target.value; me ? searchNearby() : render(); };
$('filters').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.f;
    document.querySelectorAll('#filters .filter-btn').forEach(x => x.classList.toggle('active', x === b));
    render();
};
$('place-search').oninput = debounce(e => { query = e.target.value; render(); }, 250);
$('search-btn').onclick = () => { query = $('place-search').value; render(); };
$('sheet-close').onclick = () => $('sheet').hidden = true;
map.on('click', () => $('sheet').hidden = true);
window.addEventListener('offline', () => setStatus('No internet connection.', true));

render();

// ---------- Welcome popup (kept from original) ----------
function showPopup() {
    const popup = document.getElementById('popup');
    if (!popup) return;
    popup.style.display = 'block';
    setTimeout(() => { popup.style.display = 'none'; }, 4000);
}