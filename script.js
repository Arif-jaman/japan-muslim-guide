




// Initialize Map centered on Tokyo
const map = L.map('map').setView([35.6762, 139.6503], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Restaurant locations
const restaurants = [
    { name: "Halal Ramen Asakusa", lat: 35.7148, lng: 139.7967, type: "Ramen", halal: true, prayer: true },
    { name: "Halal Sushi Tokyo", lat: 35.6938, lng: 139.7034, type: "Sushi", halal: true, prayer: false },
    { name: "Gyumon Halal Yakiniku", lat: 35.7295, lng: 139.7109, type: "Yakiniku", halal: true, prayer: true },
    { name: "Tokyo Camii Mosque", lat: 35.6553, lng: 139.6853, type: "Mosque", halal: false, prayer: true }
];

// Custom pin icons (red = restaurant, teal = mosque)
const halalIcon = L.divIcon({
    className: '',
    html: '<div style="background:#e63946;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"><span style="transform:rotate(45deg);font-size:14px;">🍽️</span></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26]
});

const mosqueIcon = L.divIcon({
    className: '',
    html: '<div style="background:#2a9d8f;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"><span style="transform:rotate(45deg);font-size:14px;">🕌</span></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26]
});

// Plot all halal spots on the map
restaurants.forEach(r => {
    const icon = r.type === "Mosque" ? mosqueIcon : halalIcon;
    L.marker([r.lat, r.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${r.name}</b><br>${r.type}${r.prayer ? '<br>🕌 Prayer room available' : ''}`);
});

// Automatically detect and live-track the user's location — no button needed
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;

            if (!window.userMarker) {
                // First location fix — add marker and zoom to fit user + all restaurants
                window.userMarker = L.marker([latitude, longitude], {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="width:16px;height:16px;border-radius:50%;background:#1d9bf0;border:3px solid white;box-shadow:0 0 0 6px rgba(29,155,240,0.3);"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(map).bindPopup("You are here");

                const bounds = L.latLngBounds(restaurants.map(r => [r.lat, r.lng]));
                bounds.extend([latitude, longitude]);
                map.fitBounds(bounds, { padding: [40, 40] });
            } else {
                // Subsequent fixes — just move the marker as you move (live tracking)
                window.userMarker.setLatLng([latitude, longitude]);
            }
        },
        (err) => console.warn("Location access denied or unavailable:", err.message),
        { enableHighAccuracy: true, maximumAge: 5000 }
    );
} else {
    console.warn("Geolocation not supported by this browser.");
}




function showPopup() {
    const popup = document.getElementById("popup");
    popup.style.display = "block";

    setTimeout(() => {
        popup.style.display = "none";
    }, 4000);
}


// Initialize Map centered on Tokyo
const map = L.map('map').setView([35.6762, 139.6503], 11);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);


// Restaurant locations
const restaurants = [
    {
        name: "Halal Ramen Asakusa",
        lat: 35.7148,
        lng: 139.7967,
        type: "Ramen",
        halal: true,
        prayer: true
    },
    {
        name: "Halal Sushi Tokyo",
        lat: 35.6938,
        lng: 139.7034,
        type: "Sushi",
        halal: true,
        prayer: false
    },
    {
        name: "Gyumon Halal Yakiniku",
        lat: 35.7295,
        lng: 139.7109,
        type: "Yakiniku",
        halal: true,
        prayer: true
    },
    {
        name: "Tokyo Camii Mosque",
        lat: 35.6556,
    }
]



