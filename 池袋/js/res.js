// Ikebukuro-এর halal restaurant গুলোর data.
// ⚠️ website ফিল্ডগুলো verify করে নিজের হাতে বসানো ভালো — restaurant বন্ধ হয়ে
// গেলে বা ওয়েবসাইট বদলালে এখানে আপডেট করে দিলেই card automatically ঠিক হয়ে যাবে।
const restaurants = [
  {
    nameJp: "池袋",
    nameEn: "Halal Wagyu Ramen Shinjuku-tei (Ikebukuro)",
    location: "Ikebukuro, Tokyo",
    tags: [
      { type: "halal", label: "Halal Certified Restaurant" },
      { type: "prayer", label: "Prayer Room" }
    ],
    website: "https://www.halal-shinjukutei.com/ikebukuro-store"
  },
  {
    nameJp: "池袋",
    nameEn: "Halal Wagyu Shabu Shabu Shoutaian",
    location: "Minami-Ikebukuro, Tokyo",
    tags: [
      { type: "halal", label: "Halal Certified Restaurant" }
    ],
    website: "https://www.groovyjapan.com/en/halal-wagyu-shabu-shoutaian-ikebukuro/"
  },
  {
    nameJp: "池袋",
    nameEn: "Malaychan Satu",
    location: "Ikebukuro West Side, Tokyo",
    tags: [
      { type: "halal", label: "Halal Certified Restaurant" }
    ],
    website: "#" // TODO: actual official website link বসাও
  },
  {
    nameJp: "池袋",
    nameEn: "Saffron Ikebukuro",
    location: "Ikebukuro East Side, Tokyo",
    tags: [
      { type: "halal", label: "Halal-Friendly Restaurant" }
    ],
    website: "#" // TODO: actual official website link বসাও
  }
];

const grid = document.getElementById("cardGrid");
const areaCount = document.getElementById("areaCount");

function tagIcon(type) {
  return type === "halal" ? "✓" : "🕌";
}

function createCard(restaurant) {
  const card = document.createElement("button");
  card.className = "restaurant-card";
  card.type = "button";
  card.setAttribute("aria-label", `${restaurant.nameEn} — visit website`);

  const tagsHtml = restaurant.tags
    .map(
      (tag) =>
        `<span class="tag ${tag.type}">${tagIcon(tag.type)} ${tag.label}</span>`
    )
    .join("");

  card.innerHTML = `
    <div class="card-content">
      <h3>${restaurant.nameJp}</h3>
      <span class="name-en">${restaurant.nameEn}</span>
      <div class="location">📍 ${restaurant.location}</div>
      <div class="tags">${tagsHtml}</div>
      <div class="visit-hint">Visit website →</div>
    </div>
  `;

  // card-এ click করলে সাথে সাথে restaurant-এর ওয়েবসাইট নতুন ট্যাবে খুলবে
  card.addEventListener("click", () => {
    if (!restaurant.website || restaurant.website === "#") {
      alert(`${restaurant.nameEn}-এর ওয়েবসাইট লিংক এখনো যোগ করা হয়নি।`);
      return;
    }
    window.open(restaurant.website, "_blank", "noopener,noreferrer");
  });

  return card;
}

function renderCards() {
  grid.innerHTML = "";
  restaurants.forEach((r) => grid.appendChild(createCard(r)));
  areaCount.textContent = `${restaurants.length} restaurants`;
}

renderCards();