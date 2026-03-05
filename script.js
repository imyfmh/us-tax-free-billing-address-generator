const taxFreeStates = {
  AK: {
    name: "Alaska",
    cities: ["Anchorage", "Fairbanks", "Juneau", "Wasilla"],
    zips: ["99501", "99701", "99801", "99654"],
  },
  DE: {
    name: "Delaware",
    cities: ["Wilmington", "Dover", "Newark", "Middletown"],
    zips: ["19801", "19901", "19711", "19709"],
  },
  MT: {
    name: "Montana",
    cities: ["Billings", "Missoula", "Bozeman", "Great Falls"],
    zips: ["59101", "59801", "59715", "59401"],
  },
  NH: {
    name: "New Hampshire",
    cities: ["Manchester", "Nashua", "Concord", "Dover"],
    zips: ["03101", "03060", "03301", "03820"],
  },
  OR: {
    name: "Oregon",
    cities: ["Portland", "Salem", "Eugene", "Bend"],
    zips: ["97201", "97301", "97401", "97701"],
  },
};

const firstNames = [
  "James",
  "Mary",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Michael",
  "Linda",
  "David",
  "Elizabeth",
];
const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Martinez",
  "Wilson",
];
const streets = [
  "Main St",
  "Oak Ave",
  "Maple Dr",
  "Pine Ln",
  "Cedar Ct",
  "Park Blvd",
  "Lakeview Rd",
  "River St",
];

const stateSelect = document.getElementById("state");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const message = document.getElementById("message");

const outputIds = {
  name: document.getElementById("name"),
  phone: document.getElementById("phone"),
  street: document.getElementById("street"),
  city: document.getElementById("city"),
  stateCode: document.getElementById("stateCode"),
  zip: document.getElementById("zip"),
  email: document.getElementById("email"),
};

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makePhone() {
  return `(${randomInt(201, 989)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function createAddress(stateCode) {
  const profile = taxFreeStates[stateCode];
  const firstName = pickRandom(firstNames);
  const lastName = pickRandom(lastNames);
  const streetNumber = randomInt(100, 9999);
  const street = `${streetNumber} ${pickRandom(streets)}`;
  const city = pickRandom(profile.cities);
  const zip = pickRandom(profile.zips);
  const phone = makePhone();
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(10, 99)}@mail.com`;

  return {
    name: `${firstName} ${lastName}`,
    phone,
    street,
    city,
    stateCode,
    zip,
    email,
  };
}

function renderAddress(data) {
  Object.entries(data).forEach(([key, value]) => {
    outputIds[key].textContent = value;
  });
}

function getOutputText() {
  return [
    `Name: ${outputIds.name.textContent}`,
    `Phone: ${outputIds.phone.textContent}`,
    `Street: ${outputIds.street.textContent}`,
    `City: ${outputIds.city.textContent}`,
    `State: ${outputIds.stateCode.textContent}`,
    `ZIP: ${outputIds.zip.textContent}`,
    `Email: ${outputIds.email.textContent}`,
  ].join("\n");
}

Object.entries(taxFreeStates).forEach(([code, { name }]) => {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = `${code} - ${name}`;
  stateSelect.appendChild(option);
});

generateBtn.addEventListener("click", () => {
  const stateCode = stateSelect.value;
  const result = createAddress(stateCode);
  renderAddress(result);
  message.textContent = "已生成新地址。";
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(getOutputText());
    message.textContent = "复制成功。";
  } catch {
    message.textContent = "复制失败，请手动复制。";
  }
});

generateBtn.click();
